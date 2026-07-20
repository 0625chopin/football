/**
 * Mock 풀 시즌 일정 생성기 — **17일차(2026-08-12), Task 007 계속분**
 *
 * 근거: `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 17일차
 * ("4상태 시나리오 Mock — 정상/로딩/빈/에러 각 픽스처 세트", 산출물
 * `src/lib/mock/fixtures/`). 소유: 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/mock/**`).
 *
 * ## I-106 해소 — "순위표 라운드 가정" 재평가
 * 16일차 `progress.ts`의 `generateStandings`는 "전 팀이 `STANDINGS_ROUND`(10)를 동일하게
 * 소화했다"고 **가정**하고 팀별로 독립적인 승/무/패 표본을 굴렸다(실제 대진 이력과 무관,
 * 파일 헤더에 명시적으로 스코프 축소 기록됨 — I-106).
 *
 * 이 파일은 FR-UI-004(`/leagues/[leagueId]/fixtures` 일정/결과 화면)가 필요로 하는
 * **실제 라운드로빈 전체 일정**을 원 서클법(circle method)으로 생성하고, 순위표를 그
 * 일정에 포함된 `FINISHED` 경기 결과를 **집계(역산)**해서 산출한다 — "전 팀 동일 라운드
 * 가정 표본"이 아니라 "실제 대진 이력에서 파생된 값"이 된다. 즉 I-106이 지적한 스코프
 * 축소는 **이 파일 결과물에 한해 해소**됐다. `progress.ts`의 `generateStandings`는
 * "진행 중 스냅샷 1건"만 값싸게 만들기 위한 독립적인 표본 생성기로 남겨 두며(자체 헤더가
 * "그 전체 일정을 역산한 결과가 아니라 독립적인 진행 중 스냅샷 표본"이라고 이미 스스로
 * 경계를 그어 뒀다), 오늘 이 파일을 수정하지 않는다 — 18일차 `MockDataSource` 구현 시
 * `getStandings`가 어느 산출물을 슬라이스할지 결정하면 된다(권고: 이 파일의 파생값).
 *
 * ## 알고리즘 — 서클법(circle method), 팀 수는 전부 짝수(24/20/16)라 예외 처리 불필요
 * `N-1`라운드짜리 단일 라운드로빈 대진을 만들고, 2차전은 홈/원정을 뒤집어 그대로 이어
 * 붙인다(`2*(N-1)`라운드 더블 라운드로빈). 페어링 순서 자체는 결정론적 고정 알고리즘이라
 * 난수를 쓰지 않는다 — 경기 **결과**(스코어)만 팀 명성(`Team.reputation`) 기반 승률
 * 모델로 PRNG를 스레딩해 굴린다(`progress.ts`의 승률 모델과 동일한 관례, 홈 어드밴티지
 * 소폭 추가).
 *
 * ## 순수 함수 계약 (world.ts/progress.ts와 동일 관례)
 * `Math.random()`/`Date.now()`/인자 없는 `new Date()`를 쓰지 않는다. 자기완결 파일 유지
 * 관례에 따라 헬퍼(`clamp`/`nextId`/`minutesBefore`/`minutesAfter`)를 이 파일에 다시 둔다.
 */

import { installHardcodedFallback } from '@/lib/config/fallback';
import { loadConstants } from '@/lib/config/loader';
import { nextIntBelow, nextIntBetween } from '@/lib/sim/rng/prng';
import type { PrngResult, PrngState } from '@/lib/sim/rng/prng';
import type {
  Fixture,
  FixtureId,
  FixtureStatus,
  LeagueId,
  MatchSeed,
  SeasonId,
  SnapshotId,
  Standing,
  Team,
  TeamId,
} from '@/types';

/* ────────────────────────────────────────────────────────────────────────
 * 산출물 타입
 * ──────────────────────────────────────────────────────────────────────── */

export interface MockSeasonSchedule {
  readonly leagueId: LeagueId;
  /** 더블 라운드로빈 총 라운드 수(`2 * (팀수 - 1)`) */
  readonly totalRounds: number;
  /** "현재" 라운드 — 이보다 작은 라운드는 전부 `FINISHED`, 이 라운드는 진행 중 표본, 이후는 `SCHEDULED` */
  readonly currentRound: number;
  /** 전 라운드 전체 경기(더블 라운드로빈 풀 일정) */
  readonly fixtures: readonly Fixture[];
  /** `fixtures` 중 `FINISHED` 건을 집계해서 역산한 순위표(I-106 해소) */
  readonly standings: readonly Standing[];
}

/** 순위표가 참조하는 "현재 라운드" 고정값 — `progress.ts`의 `STANDINGS_ROUND`(10)와 동일 값으로
 *  맞춰 두 산출물이 같은 시점을 가리키게 한다(비교·교차검증 용이). */
export const CURRENT_ROUND = 10;

/* ────────────────────────────────────────────────────────────────────────
 * 범용 헬퍼 (world.ts/progress.ts와 동일 관례 — 자기완결 파일 유지)
 * ──────────────────────────────────────────────────────────────────────── */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextId(state: PrngState): PrngResult<string> {
  let cursor = state;
  const words: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const step = nextIntBelow(cursor, 0x100000000);
    cursor = step.state;
    words.push(step.value);
  }
  const hex = words.map((w) => w.toString(16).padStart(8, '0')).join('');
  const value =
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-` +
    `${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return { state: cursor, value };
}

function minutesBefore(anchorIso: string, minutes: number): string {
  return new Date(new Date(anchorIso).getTime() - minutes * 60_000).toISOString();
}

function minutesAfter(anchorIso: string, minutes: number): string {
  return new Date(new Date(anchorIso).getTime() + minutes * 60_000).toISOString();
}

/* ────────────────────────────────────────────────────────────────────────
 * 서클법 페어링 — 팀 인덱스[0, teamCount) 기준, 난수 없는 고정 알고리즘
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 단일 라운드로빈(`teamCount - 1`라운드) 페어링을 서클법으로 만든다. `teamCount`는
 * 전부 짝수(24/20/16)라 바이(bye) 처리가 필요 없다.
 */
function circleMethodSingleLeg(teamCount: number): readonly (readonly [number, number])[][] {
  const rotating = Array.from({ length: teamCount }, (_, i) => i);
  const rounds: (readonly [number, number])[][] = [];

  for (let r = 0; r < teamCount - 1; r += 1) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < teamCount / 2; i += 1) {
      const a = rotating[i];
      const b = rotating[teamCount - 1 - i];
      // 라운드 홀/짝에 따라 홈/원정을 번갈아 — 첫 라운드부터 팀0이 매번 홈이 되는 편향 방지
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);

    // 팀 0은 고정, 나머지를 한 칸씩 회전
    const last = rotating[teamCount - 1];
    for (let i = teamCount - 1; i > 1; i -= 1) {
      rotating[i] = rotating[i - 1];
    }
    rotating[1] = last;
  }

  return rounds;
}

/** 더블 라운드로빈 — 2차전은 1차전 각 라운드의 홈/원정을 뒤집어 그대로 이어 붙인다. */
function circleMethodDoubleLeg(teamCount: number): readonly (readonly [number, number])[][] {
  const leg1 = circleMethodSingleLeg(teamCount);
  const leg2 = leg1.map((round) => round.map(([home, away]) => [away, home] as const));
  return [...leg1, ...leg2];
}

/* ────────────────────────────────────────────────────────────────────────
 * 경기 결과 시뮬레이션 — 팀 명성 기반 승률 모델(progress.ts와 동일 관례 + 홈 어드밴티지)
 * ──────────────────────────────────────────────────────────────────────── */

const HOME_ADVANTAGE = 0.06;
const DRAW_PROBABILITY = 0.24;

function simulateScore(
  state: PrngState,
  home: Team,
  away: Team,
): PrngResult<{ readonly homeScore: number; readonly awayScore: number }> {
  let cursor = state;

  const homeWinP = clamp(
    0.36 + (home.reputation - away.reputation) / 300 + HOME_ADVANTAGE,
    0.1,
    0.82,
  );

  const rollStep = nextIntBetween(cursor, 0, 999);
  cursor = rollStep.state;
  const roll = rollStep.value / 1000;

  const outcome: 'HOME' | 'DRAW' | 'AWAY' =
    roll < homeWinP ? 'HOME' : roll < homeWinP + DRAW_PROBABILITY ? 'DRAW' : 'AWAY';

  const rollGoals = (lo: number, hi: number): number => {
    const step = nextIntBetween(cursor, lo, hi);
    cursor = step.state;
    return step.value;
  };

  let homeScore: number;
  let awayScore: number;
  if (outcome === 'DRAW') {
    homeScore = rollGoals(0, 2);
    awayScore = homeScore;
  } else if (outcome === 'HOME') {
    homeScore = rollGoals(1, 3);
    awayScore = rollGoals(0, 1);
  } else {
    homeScore = rollGoals(0, 1);
    awayScore = rollGoals(1, 3);
  }

  return { state: cursor, value: { homeScore, awayScore } };
}

/* ────────────────────────────────────────────────────────────────────────
 * 순위표 역산 — FINISHED 경기만 집계(I-106 해소 지점)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `FINISHED` 경기만 집계해 순위표를 역산한다 — `round`는 결과 라벨링용일 뿐 필터링하지
 * 않으므로(내부에서는 상태만 본다), 특정 라운드 시점 스냅샷이 필요한 호출자는 `fixtures`를
 * `round` 이하로 미리 필터링해서 넘겨야 한다. **18일차 `MockDataSource.getStandings`가
 * 임의 라운드 질의를 지원하려고 이 함수를 그대로 재사용한다**(export, I-106 후속) — 별도
 * 재구현 없이 이 파일이 "순위표 역산"의 단일 소스로 남는다.
 */
export function deriveStandingsFromFixtures(
  state: PrngState,
  leagueId: LeagueId,
  teams: readonly Team[],
  fixtures: readonly Fixture[],
  seasonId: SeasonId,
  round: number,
  matchPoints: Readonly<Record<string, number>>,
): PrngResult<readonly Standing[]> {
  let cursor = state;

  interface Row {
    teamId: TeamId;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    results: ('W' | 'D' | 'L')[];
  }

  const rows = new Map<TeamId, Row>();
  for (const team of teams) {
    rows.set(team.id, {
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      results: [],
    });
  }

  const finished = fixtures
    .filter((f) => f.status === 'FINISHED')
    .sort((a, b) => a.round - b.round);

  for (const fixture of finished) {
    const homeRow = rows.get(fixture.homeTeamId);
    const awayRow = rows.get(fixture.awayTeamId);
    if (homeRow === undefined || awayRow === undefined) {
      continue;
    }
    const hs = fixture.homeScore ?? 0;
    const as = fixture.awayScore ?? 0;

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.gf += hs;
    homeRow.ga += as;
    awayRow.gf += as;
    awayRow.ga += hs;

    if (hs > as) {
      homeRow.won += 1;
      awayRow.lost += 1;
      homeRow.results.push('W');
      awayRow.results.push('L');
    } else if (hs < as) {
      awayRow.won += 1;
      homeRow.lost += 1;
      homeRow.results.push('L');
      awayRow.results.push('W');
    } else {
      homeRow.won += 0;
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.results.push('D');
      awayRow.results.push('D');
    }
  }

  const standings: Standing[] = [];
  const built: (Omit<Standing, 'rank'>)[] = [];

  for (const team of teams) {
    const row = rows.get(team.id);
    if (row === undefined) {
      continue;
    }
    const form = row.results.slice(-5).join('');

    const fairPlayStep = nextIntBetween(cursor, 55, 98);
    cursor = fairPlayStep.state;

    built.push({
      seasonId,
      leagueId,
      round,
      teamId: team.id,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      gf: row.gf,
      ga: row.ga,
      gd: row.gf - row.ga,
      points: row.won * matchPoints.WIN + row.drawn * matchPoints.DRAW + row.lost * matchPoints.LOSS,
      form,
      fairPlayScore: fairPlayStep.value,
      tiebreakApplied: null,
    });
  }

  built.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  built.forEach((row, i) => standings.push({ ...row, rank: i + 1 }));

  return { state: cursor, value: standings };
}

/* ────────────────────────────────────────────────────────────────────────
 * 진입점
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 리그 하나의 더블 라운드로빈 풀 일정 + 그 일정에서 역산한 순위표를 생성한다.
 * `nowIso`를 앵커로 `currentRound`보다 작은 라운드는 `FINISHED`, 같은 라운드는 각
 * 경기를 `FINISHED`/`LIVE`/`SCHEDULED` 중 하나로 섞어 "오늘 진행 중"인 라운드를
 * 표현하고, 이후 라운드는 전부 `SCHEDULED`다(스코어는 `null`).
 */
export function generateSeasonSchedule(
  state: PrngState,
  league: { readonly id: LeagueId; readonly teamCount: number; readonly roundIntervalMin: number },
  teams: readonly Team[],
  seasonId: SeasonId,
  snapshotId: SnapshotId,
  nowIso: string,
  currentRound: number,
  nextMatchSeed: () => MatchSeed,
): PrngResult<MockSeasonSchedule> {
  installHardcodedFallback();
  let cursor = state;
  const matchPoints = loadConstants('MATCH_POINTS');

  const pairingRounds = circleMethodDoubleLeg(league.teamCount);
  const totalRounds = pairingRounds.length;

  const fixtures: Fixture[] = [];

  pairingRounds.forEach((pairs, roundIdx) => {
    const round = roundIdx + 1;
    const roundOffsetMin = (round - currentRound) * league.roundIntervalMin;

    pairs.forEach(([homeIdx, awayIdx], matchIdx) => {
      const home = teams[homeIdx];
      const away = teams[awayIdx];

      const idStep = nextId(cursor);
      cursor = idStep.state;

      let status: FixtureStatus;
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let simulatedAt: string | null = null;

      if (round < currentRound) {
        status = 'FINISHED';
      } else if (round === currentRound) {
        // 오늘 라운드 — 경기 순서상 앞쪽은 이미 끝났고, 하나는 진행 중(LIVE), 나머지는 오늘 예정(SCHEDULED)
        if (matchIdx === 0) {
          status = 'LIVE';
        } else if (matchIdx % 2 === 1) {
          status = 'FINISHED';
        } else {
          status = 'SCHEDULED';
        }
      } else {
        status = 'SCHEDULED';
      }

      if (status === 'FINISHED') {
        const scoreStep = simulateScore(cursor, home, away);
        cursor = scoreStep.state;
        homeScore = scoreStep.value.homeScore;
        awayScore = scoreStep.value.awayScore;
        simulatedAt = round <= currentRound ? nowIso : null;
      }

      const kickoffAt =
        roundOffsetMin <= 0 ? minutesBefore(nowIso, -roundOffsetMin) : minutesAfter(nowIso, roundOffsetMin);

      const attendanceStep = nextIntBetween(
        cursor,
        Math.round(home.stadiumCapacity * 0.4),
        home.stadiumCapacity,
      );
      cursor = attendanceStep.state;

      fixtures.push({
        id: idStep.value as FixtureId,
        seasonId,
        competitionType: 'LEAGUE',
        leagueId: league.id,
        round,
        roundLabel: `${round}라운드`,
        homeTeamId: home.id,
        awayTeamId: away.id,
        isNeutral: false,
        kickoffAt,
        status,
        homeScore,
        awayScore,
        htHomeScore: null,
        htAwayScore: null,
        etHomeScore: null,
        etAwayScore: null,
        pkHome: null,
        pkAway: null,
        attendance: status === 'SCHEDULED' ? null : attendanceStep.value,
        matchSeed: nextMatchSeed(),
        snapshotId,
        simulatedAt,
      });
    });
  });

  const standingsStep = deriveStandingsFromFixtures(
    cursor,
    league.id,
    teams,
    fixtures,
    seasonId,
    currentRound - 1,
    matchPoints,
  );
  cursor = standingsStep.state;

  return {
    state: cursor,
    value: {
      leagueId: league.id,
      totalRounds,
      currentRound,
      fixtures,
      standings: standingsStep.value,
    },
  };
}
