/**
 * `src/lib/sim/standing/aggregate.ts`
 *
 * Task 026(37일차) — "사전 집계 `standing` 테이블 갱신(라운드별 스냅샷)".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 37일차 행. 완료 판정 "순위표 조회가
 * 실시간 계산 불필요"는 이 파일이 라운드가 끝날 때마다 그 라운드의 `Standing[]` 스냅샷을
 * **미리 계산해 저장 가능한 값으로** 만들어 준다는 사실로 성립한다 — 조회 시점에는 저장된
 * 스냅샷을 `round = 조회 라운드`로 읽기만 하면 되고, 매번 시즌 전체 경기를 다시 순회할
 * 필요가 없다.
 *
 * ## 이 파일의 책임 — "누적"과 "타이브레이크"의 분리
 * 35~36일차 `tiebreak.ts`/`playoff-tiebreak.ts`는 "이미 시즌 누계로 집계된 `StandingBasis`"를
 * **입력**으로 받아 순위만 매긴다(그 파일 헤더가 명시 — `standing/aggregate.ts`가 아직
 * 없다고 예고했던 바로 그 소비자). 이 파일은 그 입력을 만드는 쪽이다 — 라운드별로 종료된
 * 경기 결과를 순서대로 누적해 `StandingBasis`를 갱신하고, 매 라운드 끝에
 * `resolveStandings()`를 호출해 `Standing[]` 스냅샷을 만든다. 두 파일이 각자 한 가지만
 * 책임지므로(누적 vs 타이브레이크), 팀 통계 누적 로직을 바꿀 때 7단계 재귀를 건드릴 필요가
 * 없고 그 반대도 마찬가지다.
 *
 * ## 페어플레이 점수는 이 파일이 계산하지 않는다
 * `Standing.fairPlayScore`(6단계 타이브레이커 입력)는 카드(옐로/레드) → 점수 변환 산식이다.
 * 요구사항 문서 어디에도 그 산식이 없다(05:336 `fair_play_score int`만 있고 계산 규칙 없음
 * — Mock 데이터도 임의 난수로 채운다, `mock/fixtures/schedule.ts` 참조). 값을 지어내면
 * I-34가 이미 기각한 "0 자리표시자"·임의 배분과 같은 문제가 된다. 그래서 이 파일은
 * 라운드별 페어플레이 **증분**을 호출자에게 맡긴다(`StandingRoundFixtureInput.
 * homeFairPlayDelta`/`awayFairPlayDelta`, 미지정 시 0) — 카드→점수 산식이 확정되면 그
 * 계산기가 이 필드를 채워 넣기만 하면 되고, 이 파일의 누적 로직은 바뀌지 않는다.
 *
 * ## 다자 동률 대진(I-189)은 여기서도 새로 만들지 않는다
 * 36일차 `playoff-tiebreak.ts`가 "요구사항에 없는 규칙은 추측 대신 명시적 오류로 막는다"는
 * 원칙을 세웠다(I-189, OPEN). 이 파일은 그 판단을 그대로 물려받는다 — `resolveStandings()`를
 * 그대로 호출할 뿐 새로운 동률 처리 로직을 만들지 않는다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 정렬·동률 처리는
 * `tiebreak.ts`(`resolveStandings`)에 전부 위임한다. 타입은 `@/types` 배럴로만 import.
 */

import type { FixtureStatus, LeagueId, SeasonId, Standing, TeamId } from '@/types';
import {
  MATCH_POINTS_DEFAULT,
  resolveStandings,
  type HeadToHeadFixtureInput,
  type StandingBasis,
  type TiebreakMatchPoints,
} from './tiebreak';

/** 한 라운드에 벌어진 경기 하나 — 누적 입력. `FINISHED`가 아니거나 스코어가 없으면 건너뛴다. */
export interface StandingRoundFixtureInput {
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly status: FixtureStatus;
  /** 카드→페어플레이 변환 산식 미확정(파일 헤더 참조) — 호출자가 계산해 주입. 미지정 시 0. */
  readonly homeFairPlayDelta?: number;
  readonly awayFairPlayDelta?: number;
}

const FORM_WINDOW = 5;

/** `form`(최근 5경기 "WWDLW")에 이번 결과를 이어붙이고 앞쪽을 잘라낸다. */
function appendForm(form: string, result: 'W' | 'D' | 'L'): string {
  const next = form + result;
  return next.length > FORM_WINDOW ? next.slice(next.length - FORM_WINDOW) : next;
}

interface TeamAccumulator {
  teamId: TeamId;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  fairPlayScore: number;
  form: string;
}

function zeroAccumulator(teamId: TeamId): TeamAccumulator {
  return { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, fairPlayScore: 0, form: '' };
}

export interface AdvanceStandingRoundInput {
  /** 7단계 시드 추첨(동률 최종 처리)용 — `deriveSeasonSeed()` 결과를 그대로 전달한다. */
  readonly seasonSeed: number;
  readonly seasonId: SeasonId;
  readonly leagueId: LeagueId;
  readonly round: number;
  /** 직전 라운드까지의 누적 스냅샷. 시즌 첫 라운드는 빈 배열. */
  readonly previousStandings: readonly Standing[];
  /** 스냅샷에 아직 없는 신규 참가팀(전형적으로 시즌 최초 라운드) — 0경기 상태로 초기화한다. */
  readonly newTeamIds?: readonly TeamId[];
  /** 이번 라운드에 벌어진 경기 전부(미종료 경기는 이 함수가 걸러낸다). */
  readonly roundFixtures: readonly StandingRoundFixtureInput[];
  /** 4단계 승자승 계산용 — 시즌 누적 종료 경기 전체(이번 라운드 포함). */
  readonly allFinishedFixtures: readonly HeadToHeadFixtureInput[];
  /** 미지정 시 `MATCH_POINTS_DEFAULT`. */
  readonly matchPoints?: TiebreakMatchPoints;
}

/**
 * 직전 라운드 스냅샷에 이번 라운드 종료 경기를 반영해 새 `Standing[]` 스냅샷을 만든다.
 * 순위·동률 해소는 전부 `resolveStandings()`(`tiebreak.ts`)에 위임하고, 이 함수는 그
 * 입력(`StandingBasis`)을 누적하는 것만 책임진다.
 *
 * @throws `roundFixtures`에 `previousStandings`/`newTeamIds` 어디에도 없는 `teamId`가
 *   있으면(등록되지 않은 팀의 경기) `RangeError`.
 */
export function advanceStandingRound(input: AdvanceStandingRoundInput): readonly Standing[] {
  const matchPoints = input.matchPoints ?? MATCH_POINTS_DEFAULT;
  const accumulators = new Map<TeamId, TeamAccumulator>();

  for (const prev of input.previousStandings) {
    if (accumulators.has(prev.teamId)) {
      throw new RangeError(`advanceStandingRound: previousStandings에 teamId 중복 (${prev.teamId})`);
    }
    accumulators.set(prev.teamId, {
      teamId: prev.teamId,
      played: prev.played,
      won: prev.won,
      drawn: prev.drawn,
      lost: prev.lost,
      gf: prev.gf,
      ga: prev.ga,
      points: prev.points,
      fairPlayScore: prev.fairPlayScore,
      form: prev.form,
    });
  }

  for (const teamId of input.newTeamIds ?? []) {
    if (!accumulators.has(teamId)) {
      accumulators.set(teamId, zeroAccumulator(teamId));
    }
  }

  const ensure = (teamId: TeamId): TeamAccumulator => {
    const existing = accumulators.get(teamId);
    if (!existing) {
      throw new RangeError(
        `advanceStandingRound: teamId=${teamId}가 previousStandings/newTeamIds 어디에도 없습니다.`,
      );
    }
    return existing;
  };

  for (const fixture of input.roundFixtures) {
    if (fixture.status !== 'FINISHED') continue;
    if (fixture.homeScore === null || fixture.awayScore === null) continue;

    const home = ensure(fixture.homeTeamId);
    const away = ensure(fixture.awayTeamId);
    const diff = fixture.homeScore - fixture.awayScore;

    home.played += 1;
    away.played += 1;
    home.gf += fixture.homeScore;
    home.ga += fixture.awayScore;
    away.gf += fixture.awayScore;
    away.ga += fixture.homeScore;
    home.fairPlayScore += fixture.homeFairPlayDelta ?? 0;
    away.fairPlayScore += fixture.awayFairPlayDelta ?? 0;

    if (diff > 0) {
      home.won += 1;
      home.points += matchPoints.WIN;
      home.form = appendForm(home.form, 'W');
      away.lost += 1;
      away.points += matchPoints.LOSS;
      away.form = appendForm(away.form, 'L');
    } else if (diff < 0) {
      home.lost += 1;
      home.points += matchPoints.LOSS;
      home.form = appendForm(home.form, 'L');
      away.won += 1;
      away.points += matchPoints.WIN;
      away.form = appendForm(away.form, 'W');
    } else {
      home.drawn += 1;
      home.points += matchPoints.DRAW;
      home.form = appendForm(home.form, 'D');
      away.drawn += 1;
      away.points += matchPoints.DRAW;
      away.form = appendForm(away.form, 'D');
    }
  }

  const teams: StandingBasis[] = Array.from(accumulators.values()).map((acc) => ({
    seasonId: input.seasonId,
    leagueId: input.leagueId,
    round: input.round,
    teamId: acc.teamId,
    played: acc.played,
    won: acc.won,
    drawn: acc.drawn,
    lost: acc.lost,
    gf: acc.gf,
    ga: acc.ga,
    gd: acc.gf - acc.ga,
    points: acc.points,
    form: acc.form,
    fairPlayScore: acc.fairPlayScore,
  }));

  return resolveStandings({
    seasonSeed: input.seasonSeed,
    teams,
    headToHeadFixtures: input.allFinishedFixtures,
    matchPoints,
  });
}

/** 라운드 번호가 붙은 경기 — `buildStandingHistory()` 배치 입력용. */
export interface StandingHistoryFixtureInput extends StandingRoundFixtureInput {
  readonly round: number;
}

export interface BuildStandingHistoryInput {
  readonly seasonSeed: number;
  readonly seasonId: SeasonId;
  readonly leagueId: LeagueId;
  /** 리그 소속 팀 전체 — 라운드 1의 `newTeamIds`로 쓰인다(부전승 등으로 1라운드 경기가 없는
   *  팀도 0경기 상태로 스냅샷에 포함되도록). */
  readonly teamIds: readonly TeamId[];
  /** 시즌 전체 경기(라운드 무관 순서 상관없음 — 이 함수가 라운드별로 정렬·그룹핑한다). */
  readonly fixtures: readonly StandingHistoryFixtureInput[];
  readonly matchPoints?: TiebreakMatchPoints;
}

/**
 * 시즌 전체 경기를 라운드 오름차순으로 재생하며 `advanceStandingRound()`를 반복 호출해,
 * 라운드마다의 `Standing[]` 스냅샷 전체 이력을 한 번에 만든다(백필·재계산용 — 6팀 크론이
 * 캐치업(누락 라운드 재처리)할 때, 또는 시즌 재시뮬레이션 후 이력을 다시 쌓을 때 쓰는
 * 배치 경로). 평상시 라운드별 갱신은 이 함수를 거치지 않고 `advanceStandingRound()`를
 * 직접 호출한다(오늘 막 끝난 라운드 하나만 반영하면 되므로 전체 재생이 불필요).
 */
export function buildStandingHistory(
  input: BuildStandingHistoryInput,
): ReadonlyMap<number, readonly Standing[]> {
  const rounds = Array.from(new Set(input.fixtures.map((fixture) => fixture.round))).sort(
    (a, b) => a - b,
  );

  const history = new Map<number, readonly Standing[]>();
  let previousStandings: readonly Standing[] = [];
  const finishedSoFar: HeadToHeadFixtureInput[] = [];

  for (const [index, round] of rounds.entries()) {
    const roundFixtures = input.fixtures.filter((fixture) => fixture.round === round);
    for (const fixture of roundFixtures) {
      if (fixture.status === 'FINISHED' && fixture.homeScore !== null && fixture.awayScore !== null) {
        finishedSoFar.push({
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          status: fixture.status,
        });
      }
    }

    const standings = advanceStandingRound({
      seasonSeed: input.seasonSeed,
      seasonId: input.seasonId,
      leagueId: input.leagueId,
      round,
      previousStandings,
      newTeamIds: index === 0 ? input.teamIds : undefined,
      roundFixtures,
      allFinishedFixtures: finishedSoFar,
      matchPoints: input.matchPoints,
    });

    history.set(round, standings);
    previousStandings = standings;
  }

  return history;
}
