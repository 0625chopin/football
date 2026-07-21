/**
 * `src/lib/sim/season/prize.ts` — Task 028(50일차) "시즌 종료 순위 포인트 — 지수 1.8
 * 곡선(L1 1500+1500 / L2 850+950 / L3 400+600) 원장 지급".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 50일차 행. 근거: FR-EC-002(원본 미정 해소 /
 * D-02 반영), 공통코드 그룹 `LEAGUE_FINISH_POINT`.
 *
 * ## 공식
 * `P(r) = round(Base + Range × ((N − r) / (N − 1))^Exp)`, `Exp = 1.8` — `r`은 순위
 * (1=우승), `N`은 리그 팀 수. 1위가 `Base + Range`, 최하위가 `Base`, 그 사이는 `Exp`
 * 지수로 휘는 볼록 감쇠 곡선이다(FR-EC-002 근거 — "상위권 보상은 뚜렷하게, 중하위권
 * 격차는 완만하게 유지해 재정 붕괴를 막는다"). `teamCount ≤ 1`이면 분모가 0이 되므로
 * `Math.max(1, teamCount - 1)`로 방어하고, `rank`가 1~teamCount 범위를 벗어나도 진행도
 * (`progress`)를 0~1로 clamp해 결과가 `Base`~`Base + Range` 밖으로 새지 않는다
 * (`season/rebuild.ts`의 방어적 clamp와 동일한 성격).
 *
 * ## 이 파일이 하는 것 / 하지 않는 것
 * 리그 최종 순위 → 팀별 상금(`amount`)·원장 사유 코드(`reasonCode: 'LEAGUE_FINISH'`,
 * E-30) **계산만** 한다(`knockout/prize.ts`와 동일 원칙). 실제 원장 기록
 * (`PointTransaction` 생성)은 3팀 소유 `src/lib/economy/ledger.ts`의
 * `postPointTransaction()` 단일 진입점이 맡는다. `PrizeAward` 타입은 `knockout/prize.ts`
 * 에서 재사용한다(같은 팀 소유 경로 안의 파일 간 재사용이므로 배럴을 거치지 않고 직접
 * import — 이 프로젝트의 "타 팀 경로 직접 import 금지"는 팀 경계 규칙이지 팀 내부
 * 파일 간 재사용까지 막지 않는다).
 *
 * ⚠️ **알려진 중복 (팀장 보고 대상)**: `src/lib/economy/salary.ts`(3팀, 22일차, Task
 * 029)에 이미 동일 공식(`calculateLeagueFinishPoints`/`postLeagueFinishPayout`,
 * reasonCode `LEAGUE_FINISH`)이 구현되어 있고 원장 연동까지 끝나 있다. 이 파일은 그
 * 구현을 대체하거나 참조하지 않는다 — 엔진(`src/lib/sim/**`)은 economy 경로를 import할
 * 수 없고(소유 경로 분리), economy 쪽 구현은 엔진 산출물 없이 이미 자족적으로 동작한다.
 * 두 구현은 같은 FR-EC-002 공식을 각자 독립적으로 코드화했을 뿐이며(산출값은 동일해야
 * 하므로 이 파일의 테스트도 FR-EC-002 원문 표와 직접 대조한다), 어느 한쪽이 다른 쪽을
 * 호출하는 관계가 아니다. 이 중복이 의도된 배정인지(예: 엔진이 시즌 정산 도중 별도로
 * 필요) 통합이 필요한지는 이 파일이 판단할 사안이 아니라 팀장 조율 대상이다.
 *
 * ## 전 팀 완전성 — "원장 기록 누락 0"은 어떻게 성립하는가
 * `resolveLeagueFinishPrizes()`는 `entry.standings` 전체(승격/강등/리빌드 대상 구분 없이
 * 전 순위)에 대해 결과를 반환한다 — 일부만 추리지 않는다(`promotion.ts`/`rebuild.ts`가
 * 슬롯만 잘라내는 것과 다르다, FR-EC-002가 "전 순위"에 적용되는 표이기 때문이다).
 * `standings` 개수가 `league.teamCount`와 다르거나 순위가 1~teamCount를 연속으로 채우지
 * 않으면 예외를 던져 "일부 팀 누락"이 조용히 통과하지 못하게 한다(`promotion.ts`
 * `assertCompleteFinalStandings`·`rebuild.ts` `assertRebuildPrecondition`과 동일
 * 불변식, 이 파일 안에서 독립 구현 — export되지 않는 private 구현에 의존하지 않는다는
 * 팀 내 관례를 따른다).
 *
 * ## 공통코드 주입 (I-83 패턴)
 * `L{tier}_BASE`/`L{tier}_RANGE`/`EXP` 값은 이 엔진이 `loadConstants()`를 직접 호출하지
 * 않는다(팀 소유 경로 규칙 — `knockout/prize.ts` `PLAYOFF_PRIZE_DEFAULT`와 동일 패턴).
 * 오케스트레이션 계층이 `SimConstantSnapshot`의 `LEAGUE_FINISH_POINT` 그룹에서 꺼내
 * 넘기기 전까지는 `LEAGUE_FINISH_POINT_DEFAULT` 안전 기본값(`src/lib/config/fallback.ts`
 * 카탈로그 등록값과 동일 — 그 파일은 3팀 소유이므로 값만 대조하고 import하지 않는다)을
 * 쓴다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 정렬은
 * `rng/sort.ts`의 `stableSortBy()`만 경유한다(NFR-DT-008). 지수 계산은 확률 비교가
 * 아니라 결정론적 거듭제곱·반올림 1회뿐이므로 `rng/precision.ts` 대상이 아니다
 * (`rebuild.ts`의 금액 계산과 동일 사유). 타입은 `@/types` 배럴로만 import.
 */

import type { LeagueId, TeamId } from '@/types';
import { stableSortBy } from '../rng/sort';
import type { PrizeAward } from '../knockout/prize';
import type { LeagueFinalStandings } from './promotion';

/** 리그 티어 — `League.tier`(E-02)와 동일한 1/2/3 원시 숫자. */
export type LeagueTier = 1 | 2 | 3;

/** `LEAGUE_FINISH_POINT` 공통코드 그룹과 동일한 키 구성(FR-EC-002). */
export interface LeagueFinishPointTable {
  readonly L1_BASE: number;
  readonly L1_RANGE: number;
  readonly L2_BASE: number;
  readonly L2_RANGE: number;
  readonly L3_BASE: number;
  readonly L3_RANGE: number;
  /** 진행도 지수 — FR-EC-002 확정값 1.8 */
  readonly EXP: number;
}

/** FR-EC-002 요구사항 원문 표와 동일한 안전 기본값(I-83 주입 패턴). */
export const LEAGUE_FINISH_POINT_DEFAULT: LeagueFinishPointTable = {
  L1_BASE: 1500,
  L1_RANGE: 1500,
  L2_BASE: 850,
  L2_RANGE: 950,
  L3_BASE: 400,
  L3_RANGE: 600,
  EXP: 1.8,
};

/** 팀 1건의 시즌 종료 순위 포인트 계산 결과. */
export interface LeagueFinishPrizeOutcome {
  readonly teamId: TeamId;
  readonly leagueId: LeagueId;
  /** 근거가 된 이번 시즌 최종 순위(1=우승) */
  readonly finalRank: number;
  readonly award: PrizeAward;
}

function assertLeagueTier(tier: number): asserts tier is LeagueTier {
  if (tier !== 1 && tier !== 2 && tier !== 3) {
    throw new RangeError(`resolveLeagueFinishPrizes: tier=${tier}는 1|2|3이어야 합니다.`);
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * `entry.standings`가 `entry.league`의 완전한 최종 순위표인지 검증한다
 * (`promotion.ts`의 `assertCompleteFinalStandings`와 동일 불변식 — 팀 수 일치 +
 * 순위 1~teamCount 연속·중복 없음).
 */
function assertCompleteLeagueStandings(entry: LeagueFinalStandings): void {
  const { league, standings } = entry;

  if (standings.length !== league.teamCount) {
    throw new Error(
      `resolveLeagueFinishPrizes: 리그 ${league.id}의 최종 순위 ${standings.length}건이 ` +
        `팀 수(${league.teamCount})와 일치하지 않습니다.`,
    );
  }

  const ranked = stableSortBy(standings, [{ get: (s) => s.rank }]);
  ranked.forEach((standing, index) => {
    const expectedRank = index + 1;
    if (standing.rank !== expectedRank) {
      throw new Error(
        `resolveLeagueFinishPrizes: 리그 ${league.id}의 최종 순위가 1~${league.teamCount}를 ` +
          `연속으로 채우지 않습니다 (${expectedRank}번째로 정렬된 항목의 rank=${standing.rank}, ` +
          `teamId=${standing.teamId}).`,
      );
    }
  });
}

/**
 * 순위 1건의 FR-EC-002 상금을 계산한다. `rank`/`teamCount`가 유효 범위(1~teamCount)를
 * 벗어나도 진행도를 0~1로 clamp해 `{tier}_BASE`~`{tier}_BASE + {tier}_RANGE` 밖으로
 * 새지 않는다.
 */
export function calculateLeagueFinishPrize(
  rank: number,
  teamCount: number,
  tier: LeagueTier,
  table: LeagueFinishPointTable = LEAGUE_FINISH_POINT_DEFAULT,
): PrizeAward {
  const prefix = `L${tier}` as const;
  const base = table[`${prefix}_BASE`];
  const range = table[`${prefix}_RANGE`];

  const denominator = Math.max(1, teamCount - 1);
  const progress = clamp01((teamCount - rank) / denominator);
  const amount = Math.round(base + range * progress ** table.EXP);

  return { amount, reasonCode: 'LEAGUE_FINISH' };
}

/**
 * 리그 전 팀의 시즌 종료 순위 포인트를 계산한다(FR-EC-002, 승격/강등/리빌드 대상
 * 구분 없이 전 순위). 반환 배열은 항상 `entry.league.teamCount`와 같은 길이이며
 * (전제가 검증을 통과했다면 순위 결측·중복이 없으므로), 이것이 "원장 기록 누락 0"의
 * 근거다 — 오케스트레이션 계층은 이 배열을 그대로 순회하며 팀마다 정확히 한 건씩
 * `postPointTransaction()`을 호출하면 된다.
 */
export function resolveLeagueFinishPrizes(
  entry: LeagueFinalStandings,
  table: LeagueFinishPointTable = LEAGUE_FINISH_POINT_DEFAULT,
): readonly LeagueFinishPrizeOutcome[] {
  const tier = entry.league.tier;
  assertLeagueTier(tier);
  assertCompleteLeagueStandings(entry);

  const { league, standings } = entry;
  const ranked = stableSortBy(standings, [{ get: (s) => s.rank }]);

  return ranked.map(
    (standing): LeagueFinishPrizeOutcome => ({
      teamId: standing.teamId,
      leagueId: league.id,
      finalRank: standing.rank,
      award: calculateLeagueFinishPrize(standing.rank, league.teamCount, tier, table),
    }),
  );
}
