/**
 * `src/lib/sim/knockout/bracket-penalty-snapshot.test.ts` — Task 027 / 47일차 산출물.
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 47일차 행 "Vitest — 브래킷 구조 불변식,
 * 연장·승부차기 시드 스냅샷"의 후반부.
 *
 * ## 46일차와 다른 지점 — 값 스윕이 아니라 회귀 스냅샷, 합성이 아니라 실제 대진
 * `knockout-resolution.test.ts`(46일차)는 `team-home`/`team-away` 합성 2팀과 손으로 만든
 * `CupSeedPools` 대표 3경기로 "penalty.ts → playoff.ts/cup.ts 연결이 항상 승자를 낸다"를
 * **인라인 단언**으로 증명했다. 이 파일은 그 결론을 재검증하지 않고, 대신 실제
 * `generateLeague1QuarterfinalRound`/`generateCupRound1`/`generateCupFinalRound`가 만든
 * 대진 전량(8강 4경기 + 컵 표본 3경기)에 대해 정규+연장 동률(D-19: 연장 득점 포함, 2:2)을
 * 가정하고 실제 승부차기를 실행한 결과값 — `pkHome`/`pkAway`/소진 킥 수/최종 승자 시드 —
 * 를 `toMatchSnapshot()`으로 **고정**한다. 목적은 "항상 승자가 나오는가"(46일차가 이미
 * 증명)가 아니라 "이 시드 체인이 다음에 코드가 바뀌어도 바이트 단위로 재현되는가"
 * (`rng/derive.ts`/`rng/prng.ts`/`match/penalty.ts` 어느 한 곳이라도 의도치 않게 바뀌면
 * 이 스냅샷이 diff로 드러난다).
 *
 * ## 다이제스트가 아니라 원본 값을 스냅샷하는 이유
 * `match/match-snapshot.test.ts`(15일차)는 100경기 × 최대 120틱의 원본 이벤트가 리뷰
 * 불가능한 규모라 SHA-256 다이제스트만 남겼다(그 파일 헤더 "다이제스트 기반 스냅샷을
 * 택한 이유" 절). 이 파일의 페이로드는 대진 7건 × 프로필 3종 = 21행, 필드도 숫자 몇
 * 개뿐이라 원본 그대로 스냅샷해도 코드 리뷰에서 diff를 사람이 바로 읽을 수 있다 —
 * 다이제스트로 가릴 이유가 없다(오히려 해시로 가리면 "무엇이 달라졌는지" 리뷰어가
 * 알 수 없게 된다).
 *
 * ## matchSeed 파생 — 리터럴 대신 계층 파생(`derive.ts`) 경유
 * `deriveSeasonSeed(worldSeed, seasonNumber)` → `deriveMatchSeed(seasonSeed, fixtureIndex,
 * profileIndex)`로 각 (대진, 확률 프로필) 조합마다 독립된 `matchSeed`를 만든다 —
 * `fixtureIndex`/`profileIndex`는 밸런싱 값이 아니라 순전히 이 테스트 안에서의 위치
 * 식별자이므로 NFR-CFG-001(리터럴 밸런싱 상수 금지) 대상이 아니다(`penalty.ts` 자신의
 * "리터럴 상수 허용 근거" 절과 동일 판단 — 구조 식별자 vs 밸런싱 값 구분).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()` 미사용. 킥 성공 확률은 이 테스트가 직접 주입하는 고정
 * 프로필(`PROFILES`)이며, `penalty.ts` 자신은 확률을 만들지 않는다(파일 헤더 "이 파일의
 * 책임 범위" 절과 동일 경계).
 */

import { describe, expect, it } from 'vitest';
import type { LeagueId, MatchSeed, SeasonId, TeamId } from '@/types';
import { deriveMatchSeed, deriveSeasonSeed } from '../rng/derive';
import { simulatePenaltyShootout, type PenaltyKickContext } from '../match/penalty';
import {
  generateLeague1QuarterfinalRound,
  resolveKnockoutWinnerTeamId,
  type KnockoutFixtureScore,
} from './playoff';
import { generateCupFinalRound, generateCupRound1, type CupSeedPools } from './cup';

const SEASON_ID = 'season-47' as SeasonId;
const LEAGUE_ID = 'league-47' as LeagueId;
const WORLD_SEED = 20260923;
const SEASON_NUMBER = 47;

function seedTeams(prefix: string, count: number): readonly TeamId[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}` as TeamId);
}

/** 대진마다 다른 킥 성공확률로 스윕한다 — 46일차 `PROBABILITY_PROFILES`와 동일 취지(테스트 전용 고정값). */
const PROFILES: readonly { readonly label: string; readonly home: number; readonly away: number }[] = [
  { label: '대칭(서든데스 유발)', home: 0.5, away: 0.5 },
  { label: '홈 우세', home: 0.65, away: 0.4 },
  { label: '원정 우세', home: 0.4, away: 0.65 },
];

function fixedProbability(home: number, away: number) {
  return (ctx: PenaltyKickContext): number => (ctx.side === 'HOME' ? home : away);
}

interface KnockoutFixtureLike {
  readonly round: number;
  readonly stage: string;
  readonly homeSeed: number;
  readonly awaySeed: number;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
}

interface PenaltySnapshotRow {
  readonly source: string;
  readonly round: number;
  readonly stage: string;
  readonly profile: string;
  readonly homeSeed: number;
  readonly awaySeed: number;
  readonly pkHome: number;
  readonly pkAway: number;
  readonly kicksTaken: number;
  readonly winnerSeed: number;
}

function snapshotRow(
  source: string,
  fixture: KnockoutFixtureLike,
  matchSeed: MatchSeed,
  profile: (typeof PROFILES)[number],
): PenaltySnapshotRow {
  const shootout = simulatePenaltyShootout(
    {
      matchSeed,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      resolveScoreProbability: fixedProbability(profile.home, profile.away),
    },
    1,
  );

  // 정규 1:1 + 연장 1:1 = 2:2 동률(D-19: 연장 득점 포함)을 가정해 승부차기로 넘긴다.
  const fixtureScore: KnockoutFixtureScore = {
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeScore: 1,
    awayScore: 1,
    etHomeScore: 1,
    etAwayScore: 1,
    pkHome: shootout.pkHome,
    pkAway: shootout.pkAway,
  };
  const winnerTeamId = resolveKnockoutWinnerTeamId(fixtureScore);
  const winnerSeed = winnerTeamId === fixture.homeTeamId ? fixture.homeSeed : fixture.awaySeed;

  return {
    source,
    round: fixture.round,
    stage: fixture.stage,
    profile: profile.label,
    homeSeed: fixture.homeSeed,
    awaySeed: fixture.awaySeed,
    pkHome: shootout.pkHome,
    pkAway: shootout.pkAway,
    kicksTaken: shootout.kicks.length,
    winnerSeed,
  };
}

describe('연장·승부차기 시드 스냅샷 — 실제 브래킷 대진 × 결정론적 matchSeed', () => {
  it('리그1 8강 4경기 + 컵 1라운드/결승 표본 3경기 — 정규+연장 동률 승부차기 결과가 회귀 없이 재현된다', () => {
    const seasonSeed = deriveSeasonSeed(WORLD_SEED, SEASON_NUMBER);

    const playoffSeeds = seedTeams('l1', 10);
    const qf = generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, playoffSeeds, [
      { winnerSeed: 7 },
      { winnerSeed: 8 },
    ]);

    const cupPools: CupSeedPools = {
      league1: seedTeams('c-l1', 24),
      league2: seedTeams('c-l2', 20),
      league3: seedTeams('c-l3', 16),
    };
    const cupRound1 = generateCupRound1(SEASON_ID, cupPools);
    const cupFinal = generateCupFinalRound(SEASON_ID, cupPools, [1, 45], 555111);

    const fixtures: readonly { readonly source: string; readonly fixture: KnockoutFixtureLike }[] = [
      { source: 'playoff-l1-qf-0', fixture: qf[0] },
      { source: 'playoff-l1-qf-1', fixture: qf[1] },
      { source: 'playoff-l1-qf-2', fixture: qf[2] },
      { source: 'playoff-l1-qf-3', fixture: qf[3] },
      { source: 'cup-round1-first', fixture: cupRound1.fixtures[0] },
      { source: 'cup-round1-last', fixture: cupRound1.fixtures[cupRound1.fixtures.length - 1] },
      { source: 'cup-final', fixture: cupFinal[0] },
    ];

    const rows: PenaltySnapshotRow[] = [];
    fixtures.forEach(({ source, fixture }, fixtureIndex) => {
      PROFILES.forEach((profile, profileIndex) => {
        const matchSeed = deriveMatchSeed(seasonSeed, fixtureIndex, profileIndex) as MatchSeed;
        rows.push(snapshotRow(source, fixture, matchSeed, profile));
      });
    });

    expect(rows).toHaveLength(fixtures.length * PROFILES.length);
    expect(rows).toMatchSnapshot();
  });

  it('동일 입력으로 2회 실행하면 스냅샷 행 전체가 바이트 단위로 동일하다(재현성 자체 검증)', () => {
    const seasonSeed = deriveSeasonSeed(WORLD_SEED, SEASON_NUMBER);
    const playoffSeeds = seedTeams('l1', 10);
    const qf = generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, playoffSeeds, [
      { winnerSeed: 7 },
      { winnerSeed: 8 },
    ]);
    const matchSeed = deriveMatchSeed(seasonSeed, 0, 0) as MatchSeed;

    const first = snapshotRow('repro', qf[0], matchSeed, PROFILES[0]);
    const second = snapshotRow('repro', qf[0], matchSeed, PROFILES[0]);

    expect(second).toEqual(first);
  });
});
