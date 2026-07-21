/**
 * `src/lib/sim/knockout/knockout-resolution.test.ts` — Task 027 / 46일차 산출물.
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 46일차 행 "무승부 시 연장·승부차기 연결
 * 검증 — 통합 — 무승부 발생 시 반드시 승자 확정".
 *
 * ## 왜 이 파일이 새로 필요한가 — 지금까지는 세 조각이 각자만 검증됐다
 * `match/penalty.ts`(13일차)는 `simulatePenaltyShootout()` 단독으로 "반드시 승자 확정"을
 * 증명했고(`penalty.test.ts`), `knockout/playoff.ts`(40일차)는 `resolveKnockoutWinnerTeamId()`를
 * **손으로 채운** `KnockoutFixtureScore`(예: `pkHome: 5, pkAway: 4`)로만 검증했다
 * (`playoff.test.ts`). 두 파일이 실제로 이어 붙는 지점 — "승부차기 시뮬레이션의 실제
 * `pkHome`/`pkAway` 산출값을 넉아웃 승자 판정에 그대로 흘렸을 때도 무승부 없이 항상
 * 승자가 나오는가" — 는 어느 테스트도 값으로 증명한 적이 없었다. 컵 대회 쪽도 마찬가지로
 * `cup.ts` 헤더가 "완료된 경기의 승자 판정은 `playoff.ts`의 `resolveKnockoutWinnerTeamId`를
 * 그대로 재사용한다"고 명시하지만, `cup.test.ts`는 `resolveCupWinnerSeed()`를 항상
 * "홈이 이겼다"고 가정한 `winnerTeamId`만 넘겨 호출했을 뿐 실제 승부차기 결과와 이어
 * 붙인 적이 없다. 이 파일이 그 연결 지점 3개를 실제 함수 호출 체인으로 값 검증한다.
 *
 * ## 검증 대상 연결 체인
 * 1. `match/penalty.ts`의 `simulatePenaltyShootout()` → `knockout/playoff.ts`의
 *    `resolveKnockoutWinnerTeamId()` — 정규+연장 동률 상황에서 실제 PK 시뮬레이션
 *    결과(`pkHome`/`pkAway`)를 그대로 넣었을 때 예외 없이, 그리고 두 함수가 말하는
 *    승자가 서로 일치하게 항상 승자가 나오는가.
 * 2. 위 체인 → `knockout/cup.ts`의 `resolveCupWinnerSeed()` — 실제 컵 대진 초안
 *    (`generateCupRound1()` 산출물)에 대해 실제 PK 결과로 승자 팀을 정하고, 그 팀을
 *    전역 시드로 되돌려 매핑해도 원래 대진의 홈/원정 시드 중 정확히 이긴 쪽과 일치하는가.
 * 3. 확률 스윕 — 대칭(0.5/0.5, 서든데스 유발 확률 높음)부터 비대칭까지 다양한 프로필과
 *    다수의 `matchSeed`로 반복해도 위 두 체인이 한 번도 무승부로 남거나 예외를 던지지
 *    않는가(FR-MT-013 수용기준① "반드시 승자 확정"의 통합 층위 재확인).
 *
 * ## 결정론 — `Math.random()` 대신 인덱스 기반 결정론적 프로필
 * NFR-DT-001에 따라 시드·확률 프로필 모두 루프 인덱스에서 산술적으로 파생한다
 * (`SEED_SWEEP`/`PROBABILITY_PROFILES` 참조) — 매 테스트 실행마다 같은 조합을 순회한다.
 */

import { describe, expect, it } from 'vitest';
import type { MatchSeed, SeasonId, TeamId } from '@/types';
import { simulatePenaltyShootout, type PenaltyKickContext } from '../match/penalty';
import { resolveKnockoutWinnerTeamId, type KnockoutFixtureScore } from './playoff';
import { generateCupRound1, resolveCupWinnerSeed, type CupSeedPools } from './cup';

const HOME_TEAM = 'team-home' as TeamId;
const AWAY_TEAM = 'team-away' as TeamId;

/** 46일차 전용 결정론적 시드 스윕 — `Math.random()` 금지(NFR-DT-001)이므로 인덱스에서 파생. */
const SEED_SWEEP = Array.from({ length: 40 }, (_, i) => 20260922_000 + i);

/** 대칭·비대칭·극단 확률 프로필. 대칭(0.5/0.5)은 서든데스 진입 빈도가 높은 스트레스 케이스. */
const PROBABILITY_PROFILES: readonly { readonly label: string; readonly home: number; readonly away: number }[] = [
  { label: '대칭(서든데스 유발)', home: 0.5, away: 0.5 },
  { label: '약우세 홈', home: 0.6, away: 0.45 },
  { label: '약우세 원정', home: 0.45, away: 0.6 },
  { label: '극단 홈 우세', home: 0.95, away: 0.05 },
  { label: '극단 원정 우세', home: 0.05, away: 0.95 },
];

function fixedProbability(home: number, away: number) {
  return (ctx: PenaltyKickContext): number => (ctx.side === 'HOME' ? home : away);
}

describe('통합 46일차 — penalty.ts 실제 승부차기 → playoff.ts 넉아웃 승자 판정 연결', () => {
  for (const profile of PROBABILITY_PROFILES) {
    it(`확률 프로필 "${profile.label}" × 시드 ${SEED_SWEEP.length}개 — 항상 예외 없이 승자가 확정되고 두 함수의 승자가 일치한다`, () => {
      for (const seedValue of SEED_SWEEP) {
        const matchSeed = seedValue as MatchSeed;
        const shootout = simulatePenaltyShootout(
          {
            matchSeed,
            homeTeamId: HOME_TEAM,
            awayTeamId: AWAY_TEAM,
            resolveScoreProbability: fixedProbability(profile.home, profile.away),
          },
          1,
        );

        // penalty.ts 자체 불변식 재확인(FR-MT-013①) — 이 값이 깨지면 아래 연결 검증이 무의미하다.
        expect(shootout.pkHome).not.toBe(shootout.pkAway);

        // 정규+연장 동률(0:0) 상황을 가정하고 실제 PK 결과를 그대로 흘린다.
        const fixtureScore: KnockoutFixtureScore = {
          homeTeamId: HOME_TEAM,
          awayTeamId: AWAY_TEAM,
          homeScore: 1,
          awayScore: 1,
          etHomeScore: 0,
          etAwayScore: 0,
          pkHome: shootout.pkHome,
          pkAway: shootout.pkAway,
        };

        let winner: TeamId | undefined;
        expect(() => {
          winner = resolveKnockoutWinnerTeamId(fixtureScore);
        }).not.toThrow();

        expect(winner === HOME_TEAM || winner === AWAY_TEAM).toBe(true);
        expect(winner).toBe(shootout.winnerTeamId);
      }
    });
  }
});

describe('통합 46일차 — 컵 대진(cup.ts) 실제 대진 × 실제 PK 결과 → 공통 승자 판정 → 시드 환산 연결', () => {
  const SEASON_ID = 'season-46' as SeasonId;

  function seedTeams(prefix: string, count: number): readonly TeamId[] {
    return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}` as TeamId);
  }

  const pools: CupSeedPools = {
    league1: seedTeams('l1', 24),
    league2: seedTeams('l2', 20),
    league3: seedTeams('l3', 16),
  };

  const { fixtures } = generateCupRound1(SEASON_ID, pools);
  // 1라운드 28경기 중 임의 3경기(양끝 + 중간)를 대표로 스윕한다 — 28 × 5프로필 × 40시드 전건은
  // 과도하고, 대진 규칙(홈=더 큰 시드) 자체는 `cup.test.ts`가 이미 값으로 증명했으므로 여기서는
  // "실제 대진 → 실제 PK → 승자 판정 → 시드 환산" 연결 자체만 대표 표본으로 확인하면 충분하다.
  const sampleFixtures = [fixtures[0], fixtures[Math.floor(fixtures.length / 2)], fixtures[fixtures.length - 1]];

  for (const fixture of sampleFixtures) {
    for (const profile of PROBABILITY_PROFILES) {
      it(`대진 (홈시드${fixture.homeSeed} vs 원정시드${fixture.awaySeed}) × 프로필 "${profile.label}" — 실제 PK 승자가 올바른 시드로 환산된다`, () => {
        for (const seedValue of SEED_SWEEP.slice(0, 10)) {
          const matchSeed = seedValue as MatchSeed;
          const shootout = simulatePenaltyShootout(
            {
              matchSeed,
              homeTeamId: fixture.homeTeamId,
              awayTeamId: fixture.awayTeamId,
              resolveScoreProbability: fixedProbability(profile.home, profile.away),
            },
            1,
          );

          const fixtureScore: KnockoutFixtureScore = {
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            homeScore: 0,
            awayScore: 0,
            etHomeScore: 0,
            etAwayScore: 0,
            pkHome: shootout.pkHome,
            pkAway: shootout.pkAway,
          };

          const winnerTeamId = resolveKnockoutWinnerTeamId(fixtureScore);
          expect(winnerTeamId).toBe(shootout.winnerTeamId);

          const advancement = resolveCupWinnerSeed(fixture, winnerTeamId);
          const expectedSeed = winnerTeamId === fixture.homeTeamId ? fixture.homeSeed : fixture.awaySeed;
          expect(advancement.winnerSeed).toBe(expectedSeed);
        }
      });
    }
  }
});

describe('통합 46일차 — 무승부 발생 시 반드시 승자 확정 (넓은 스윕에서 예외·동률 0건)', () => {
  it(`${PROBABILITY_PROFILES.length}개 확률 프로필 × ${SEED_SWEEP.length}개 시드 전건에서 pkHome === pkAway가 단 한 번도 발생하지 않는다`, () => {
    let checked = 0;
    for (const profile of PROBABILITY_PROFILES) {
      for (const seedValue of SEED_SWEEP) {
        const matchSeed = seedValue as MatchSeed;
        const shootout = simulatePenaltyShootout(
          {
            matchSeed,
            homeTeamId: HOME_TEAM,
            awayTeamId: AWAY_TEAM,
            resolveScoreProbability: fixedProbability(profile.home, profile.away),
          },
          1,
        );
        expect(shootout.pkHome).not.toBe(shootout.pkAway);
        checked += 1;
      }
    }
    expect(checked).toBe(PROBABILITY_PROFILES.length * SEED_SWEEP.length);
  });
});
