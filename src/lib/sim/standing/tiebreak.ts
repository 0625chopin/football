/**
 * `src/lib/sim/standing/tiebreak.ts`
 *
 * Task 026(35일차) — "7단계 타이브레이커 — 승점 → 골득실 → 다득점 → 승자승 미니리그 →
 * 다승 → 페어플레이 → 시드 추첨". `docs/team-schedule/02-시뮬레이션엔진팀.md` 35일차 행.
 * 근거: `docs/require/03-functional-requirements.md` FR-LG-005 표 —
 * "1.승점 → 2.골득실(GD) → 3.다득점(GF) → 4.승자승(동률 팀들만의 미니리그: 상호 승점 →
 * 상호 골득실 → 상호 원정 다득점) → 5.다승(총 승수) → 6.페어플레이 점수(낮을수록 상위) →
 * 7.월드 시드 기반 결정론적 추첨". 완료 판정 "7단계 각각이 단독으로 순위를 가름"은 이 파일의
 * `resolveStandings()`가 각 단계에서 "이번 단계 비교값이 갈리면 여기서 멈추고, 갈리지 않으면
 * 다음 단계로만 넘어간다"는 재귀 구조로 성립한다(`tiebreak.test.ts`가 단계별 단독 결정
 * 케이스로 증명).
 *
 * ## 입력 — 이미 집계된 팀 통계 + 팀 간 개별 경기 결과
 * `points`/`gd`/`gf`/`won`/`fairPlayScore`는 이미 시즌 누계로 집계돼 있다고 가정한다(그
 * 집계 자체는 `standing/aggregate.ts` 소관 — `postmatch/pipeline.ts` 헤더가 예고했듯 아직
 * 없다. 이 파일은 그 산출물의 **소비자**이지 집계기가 아니다). 유일한 예외가 4단계
 * 승자승인데, 이건 "동률 팀들끼리의 경기만" 걸러 재계산해야 해서 팀 단위 누계로는 표현할 수
 * 없다 — 그래서 `headToHeadFixtures`로 개별 경기(홈/원정 스코어)를 별도로 받는다.
 *
 * ## 4단계 승자승 미니리그 — "동률 팀 전원의 부분 리그" 해석
 * 이 단계에 걸리는 건 "직전 단계까지 전부 동률인 팀 집합"(2팀 이상, 3팀 이상도 가능) 전체다.
 * 그 집합 안에서 서로 치른 경기만 걸러 승점(→ `matchPoints` 주입값)·골득실·원정 다득점을
 * 다시 계산한다(요구사항 문서가 "상호 원정 다득점"이라고 못박아 3단계 `gf`(전체 다득점)와는
 * 다른 값이다 — 원정 경기에서 넣은 골만 센다). **판단 근거(팀장 요청 사항)**: 이 부분 리그
 * 재계산 자체가 다시 동률이면(승점·골득실·원정다득점 전부 같음), 또는 애초에 이 집합 안의
 * 경기 데이터가 하나도 없으면(예: 시즌 초반이라 아직 서로 안 붙었거나, 3팀 이상 동률인데
 * 일부 조합만 대전했거나) — **이 단계는 "동률"로 판정하고 그대로 5단계(다승)로 넘긴다.**
 * 안 갈리는 부분 리그를 억지로 갈라내려 하지 않는다(예: 임의 폴백값을 지어내지 않는다 —
 * `discipline/suspension.ts` 22일차의 "값 taxonomy가 없으면 호출자에게 미룬다" 원칙과 같은
 * 판단). 다만 이 처리는 "일부 조합만 대전한 홀수 동률"처럼 완전 라운드로빈이 아닌 입력에서
 * 형평에 어긋날 여지가 있다(UEFA도 이 경우 규정이 갈린다) — 요구사항 문서에 이 세부 규칙이
 * 없으므로 이슈 후보로만 남긴다(팀장 등재용, 이 파일이 직접 등재하지 않는다).
 *
 * ## 7단계 시드 추첨 — 왜 새 계층 태그를 추가했는가
 * `rng/sort.ts` 헤더가 이미 "정렬까지는 sort.ts, 정렬 이후 동률 그룹의 시드 추첨은
 * 026(`standing/tiebreak.ts`)"이라고 역할을 갈라 뒀다. 이 파일은 `rng/derive.ts`에 새로
 * 추가한 `deriveStandingDrawSeed(seasonSeed, round, tiedGroupKey)`(35일차, `LAYER_TAG.STANDING`
 * 신설)로 동률 그룹 전용 독립 스트림을 얻은 뒤, `nextIntBelow` 기반 Fisher–Yates로 그 그룹
 * 안에서 완전한 순서를 뽑는다. 셔플 대상은 항상 `teamId` 오름차순으로 먼저 정규화한
 * 배열이다 — 그래야 "직전 단계까지 완전 동률"이라는 같은 입력 조건이면 상위 단계가 그
 * 동률 그룹을 어떤 배열 순서로 넘기든 항상 같은 셔플 결과가 나온다(안정 정렬이 보장하는
 * "입력 순서 유지"에 결과가 우연히 의존하지 않게 하기 위함).
 *
 * ## 승격/강등 경계 플레이오프 예외는 범위 밖
 * `docs/require/03-functional-requirements.md`는 "승격 경계(3위/4위) 또는 강등 경계에서
 * 6단계까지 동률이면 → 중립지 단판 플레이오프로 결정"한다고 명시한다. 이건 7단계(시드 추첨)
 * **대신** 별도 넉아웃 경기를 편성하는 로직이라, 이 파일(팀 단위 스칼라 비교)의 책임이 아니라
 * 시즌 진행 계층(승강 경계 판정 + 플레이오프 편성, `knockout/`·`season/` 소관)의 몫이다. 이
 * 파일은 "7단계 전부가 일반적으로 적용될 때"의 계산만 제공하고, 그 호출자가 승강 경계
 * 여부를 판단해 7단계 호출 대신 플레이오프 편성으로 분기할지 결정한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 난수는 전부
 * `rng/prng.ts`·`rng/derive.ts`를 경유한다. 정렬은 `rng/sort.ts`의 `stableSortBy()`만 쓴다
 * (명시적 tiebreak 키 강제, NFR-DT-008). 타입은 `@/types` 배럴로만 import.
 *
 * ## 공통코드 주입 (I-83 패턴)
 * `matchPoints`(승/무/패 승점, `MATCH_POINTS` 그룹 — 기본 WIN=3/DRAW=1/LOSS=0)는 이 엔진이
 * `loadConstants('MATCH_POINTS')`를 직접 호출하지 않는다(팀 소유 경로 규칙 — 엔진은 공통코드
 * 값을 파라미터로만 주입받는다). 오케스트레이션 계층이 `SimConstantSnapshot`에서 꺼내
 * 넘기기 전까지는 `MATCH_POINTS_DEFAULT` 안전 기본값을 쓴다.
 */

import type { Fixture, Standing, TeamId } from '@/types';
import { deriveStandingDrawSeed, hashKey, stateForSeed } from '../rng/derive';
import { nextIntBelow } from '../rng/prng';
import { stableSortBy } from '../rng/sort';

/** 순위표 계산 입력 — `Standing`에서 이 함수가 채우는 `rank`/`tiebreakApplied`만 제외한다. */
export type StandingBasis = Omit<Standing, 'rank' | 'tiebreakApplied'>;

/** 4단계 승자승 계산에 필요한 개별 경기 결과 부분집합. */
export type HeadToHeadFixtureInput = Pick<
  Fixture,
  'homeTeamId' | 'awayTeamId' | 'homeScore' | 'awayScore' | 'status'
>;

/** `MATCH_POINTS` 공통코드 그룹과 동일한 키 구성(승/무/패 승점). */
export interface TiebreakMatchPoints {
  readonly WIN: number;
  readonly DRAW: number;
  readonly LOSS: number;
}

/** `MATCH_POINTS` 그룹 카탈로그 예시값과 동일한 안전 기본값(I-83 주입 패턴). */
export const MATCH_POINTS_DEFAULT: TiebreakMatchPoints = { WIN: 3, DRAW: 1, LOSS: 0 };

export interface ResolveStandingsInput {
  /** 이번 순위표가 속한 `deriveSeasonSeed()` 결과 — 7단계 시드 추첨 전용. */
  readonly seasonSeed: number;
  /** 순위를 매길 팀 전체(같은 `seasonId`·`leagueId`·`round`여야 한다). */
  readonly teams: readonly StandingBasis[];
  /** 4단계 승자승 계산에 쓸 경기 목록. `FINISHED`·스코어 non-null만 실제 반영되고
   *  나머지는 이 함수가 걸러낸다 — 호출자가 사전 필터링할 필요가 없다. */
  readonly headToHeadFixtures: readonly HeadToHeadFixtureInput[];
  /** 미지정 시 `MATCH_POINTS_DEFAULT`. */
  readonly matchPoints?: TiebreakMatchPoints;
}

const STAGE_COUNT = 7;

/** stageIndex(0~6, 방금 적용한 단계)를 `Standing.tiebreakApplied`로 변환한다. 0(승점)은 null. */
function stageLabel(stageIndex: number): number | null {
  return stageIndex === 0 ? null : stageIndex + 1;
}

/**
 * `group`을 `getValue` 기준(오름/내림차순)으로 정렬한 뒤, 값이 같은 인접 원소끼리
 * 부분배열로 묶어 반환한다. 각 부분배열은 여전히 "이 기준으로는 동률"인 팀들이다.
 */
function splitByScalar<T>(
  group: readonly T[],
  getValue: (item: T) => number,
  dir: 'asc' | 'desc',
): T[][] {
  const sorted = stableSortBy(group, [{ get: getValue, dir }]);
  const groups: T[][] = [];
  let current: T[] = [];
  let currentValue = Number.NaN;

  for (const item of sorted) {
    const value = getValue(item);
    if (current.length > 0 && value === currentValue) {
      current.push(item);
    } else {
      if (current.length > 0) groups.push(current);
      current = [item];
      currentValue = value;
    }
  }
  if (current.length > 0) groups.push(current);

  return groups;
}

interface MiniStat {
  readonly points: number;
  readonly gd: number;
  readonly awayGoals: number;
}

/** `group` 구성원끼리 치른 경기만으로 상호 승점/골득실/원정다득점을 계산한다. */
function computeMiniStats(
  group: readonly StandingBasis[],
  fixtures: readonly HeadToHeadFixtureInput[],
  matchPoints: TiebreakMatchPoints,
): ReadonlyMap<TeamId, MiniStat> {
  const memberIds = new Set(group.map((team) => team.teamId));
  const stats = new Map<TeamId, { points: number; gd: number; awayGoals: number }>(
    group.map((team) => [team.teamId, { points: 0, gd: 0, awayGoals: 0 }]),
  );

  for (const fixture of fixtures) {
    if (fixture.status !== 'FINISHED') continue;
    if (fixture.homeScore === null || fixture.awayScore === null) continue;
    if (!memberIds.has(fixture.homeTeamId) || !memberIds.has(fixture.awayTeamId)) continue;

    const home = stats.get(fixture.homeTeamId);
    const away = stats.get(fixture.awayTeamId);
    if (!home || !away) continue;

    const diff = fixture.homeScore - fixture.awayScore;
    home.gd += diff;
    away.gd -= diff;
    away.awayGoals += fixture.awayScore;

    if (diff > 0) {
      home.points += matchPoints.WIN;
      away.points += matchPoints.LOSS;
    } else if (diff < 0) {
      home.points += matchPoints.LOSS;
      away.points += matchPoints.WIN;
    } else {
      home.points += matchPoints.DRAW;
      away.points += matchPoints.DRAW;
    }
  }

  return stats;
}

/** 4단계 — 승자승 미니리그. 상호 승점 → 상호 골득실 → 상호 원정 다득점 순으로 갈라본다. */
function resolveHeadToHeadStage(
  group: readonly StandingBasis[],
  fixtures: readonly HeadToHeadFixtureInput[],
  matchPoints: TiebreakMatchPoints,
): StandingBasis[][] {
  const miniStats = computeMiniStats(group, fixtures, matchPoints);
  const miniOf = (team: StandingBasis): MiniStat => {
    const stat = miniStats.get(team.teamId);
    if (!stat) throw new Error(`resolveHeadToHeadStage: teamId=${team.teamId} 미니 통계 누락`);
    return stat;
  };

  let groups = splitByScalar(group, (team) => miniOf(team).points, 'desc');
  groups = groups.flatMap((sub) =>
    sub.length <= 1 ? [sub] : splitByScalar(sub, (team) => miniOf(team).gd, 'desc'),
  );
  groups = groups.flatMap((sub) =>
    sub.length <= 1 ? [sub] : splitByScalar(sub, (team) => miniOf(team).awayGoals, 'desc'),
  );
  return groups;
}

/** 7단계 — 시드 추첨. 항상 완전히 갈린 순서(부분배열 전부 길이 1)를 반환한다. */
function resolveSeedDrawStage(
  group: readonly StandingBasis[],
  seasonSeed: number,
  round: number,
): StandingBasis[][] {
  // teamId 오름차순으로 먼저 정규화 — 입력 배열이 어떤 순서로 들어오든 같은 동률
  // 그룹이면 항상 같은 순서로 셔플을 시작한다(안정 정렬의 "입력 순서 유지"에 결과가
  // 우연히 의존하지 않게 하기 위함, 파일 헤더 "7단계 시드 추첨" 절 참조).
  const canonical = stableSortBy(group, [{ get: (team) => String(team.teamId) }]);
  const tiedGroupKey = hashKey(canonical.map((team) => String(team.teamId)).join('|'));
  const seed = deriveStandingDrawSeed(seasonSeed, round, tiedGroupKey);

  const shuffled = [...canonical];
  let state = stateForSeed(seed);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const step = nextIntBelow(state, i + 1);
    state = step.state;
    const j = step.value;
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  return shuffled.map((team) => [team]);
}

interface ResolveContext {
  readonly headToHeadFixtures: readonly HeadToHeadFixtureInput[];
  readonly matchPoints: TiebreakMatchPoints;
  readonly seasonSeed: number;
  readonly round: number;
}

const STAGE_RESOLVERS: ReadonlyArray<
  (group: readonly StandingBasis[], ctx: ResolveContext) => StandingBasis[][]
> = [
  (group) => splitByScalar(group, (team) => team.points, 'desc'),
  (group) => splitByScalar(group, (team) => team.gd, 'desc'),
  (group) => splitByScalar(group, (team) => team.gf, 'desc'),
  (group, ctx) => resolveHeadToHeadStage(group, ctx.headToHeadFixtures, ctx.matchPoints),
  (group) => splitByScalar(group, (team) => team.won, 'desc'),
  (group) => splitByScalar(group, (team) => team.fairPlayScore, 'asc'),
  (group, ctx) => resolveSeedDrawStage(group, ctx.seasonSeed, ctx.round),
];

interface RankedEntry {
  readonly team: StandingBasis;
  readonly tiebreakApplied: number | null;
}

function resolveGroup(
  group: readonly StandingBasis[],
  stageIndex: number,
  ctx: ResolveContext,
  out: RankedEntry[],
): void {
  if (group.length === 1) {
    out.push({ team: group[0], tiebreakApplied: stageLabel(stageIndex) });
    return;
  }
  if (stageIndex >= STAGE_COUNT) {
    // 도달 불가능해야 정상이다 — 7단계(시드 추첨) 리졸버는 항상 완전히 갈린 순서를
    // 반환하므로, 그 결과로 다시 여기까지 재귀할 일이 없다. 도달하면 리졸버 구현 결함이다.
    throw new Error('resolveGroup: 7단계를 모두 거쳤는데도 동률이 남았습니다(시드 추첨 리졸버 결함 의심).');
  }

  const subgroups = STAGE_RESOLVERS[stageIndex](group, ctx);
  for (const sub of subgroups) {
    if (sub.length === 1) {
      out.push({ team: sub[0], tiebreakApplied: stageLabel(stageIndex) });
    } else {
      resolveGroup(sub, stageIndex + 1, ctx, out);
    }
  }
}

function assertConsistentScope(teams: readonly StandingBasis[]): void {
  const [first, ...rest] = teams;
  if (!first) return;

  for (const team of rest) {
    if (
      team.seasonId !== first.seasonId ||
      team.leagueId !== first.leagueId ||
      team.round !== first.round
    ) {
      throw new RangeError(
        'resolveStandings: teams는 모두 같은 seasonId·leagueId·round여야 합니다.',
      );
    }
  }

  const seen = new Set<TeamId>();
  for (const team of teams) {
    if (seen.has(team.teamId)) {
      throw new RangeError(`resolveStandings: teamId 중복 (${team.teamId})`);
    }
    seen.add(team.teamId);
  }
}

/**
 * 7단계 타이브레이커를 적용해 최종 순위(`rank`)와 각 팀이 어느 단계에서 갈렸는지
 * (`tiebreakApplied`)를 계산한다. 승점만으로 이미 갈린 팀은 `tiebreakApplied: null`이다
 * (파일 헤더 참조 — 1단계는 "동률을 깬" 것이 아니라 애초에 동률이 없었다는 뜻).
 */
export function resolveStandings(input: ResolveStandingsInput): Standing[] {
  const { teams, headToHeadFixtures } = input;
  const matchPoints = input.matchPoints ?? MATCH_POINTS_DEFAULT;
  if (teams.length === 0) return [];

  assertConsistentScope(teams);

  const ctx: ResolveContext = {
    headToHeadFixtures,
    matchPoints,
    seasonSeed: input.seasonSeed,
    round: teams[0].round,
  };

  const out: RankedEntry[] = [];
  resolveGroup(teams, 0, ctx, out);

  return out.map((entry, index) => ({
    ...entry.team,
    rank: index + 1,
    tiebreakApplied: entry.tiebreakApplied,
  }));
}
