/**
 * `src/lib/sim/knockout/seeding.ts` — Task 027(42일차) "컵 시딩".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 42일차 행. 근거:
 * `docs/require/03-functional-requirements.md` FR-LG-015(컵대회 포맷, [확정])·
 * `docs/require/06-prioritization-and-risks.md` D-24(시딩 폴백).
 *
 * ## 41일차 인계 — 이 파일은 "새로 설계"가 아니라 "분리·일반화"다
 * D-24 우선순위(① 리그1↔리그3 → ② 리그1↔리그2 → ③ 리그2↔리그3 → ④ 동일 티어 시드 순
 * 상하위 교차)와 그것을 60/20/16 특정 숫자에 하드코딩하지 않는 `crossPair()` 일반화는
 * **어제(41일차) `cup.ts`가 이미 구현**했다(`cup.ts` 옛 버전 "1라운드 시딩" 절 참조).
 * 오늘 이 파일이 하는 일은 그 로직을 `cup.ts`(브래킷 초안·`Fixture` 형태 생성 전담)에서
 * **떼어내 재사용 가능한 순수 시딩 모듈로 옮기는 것**뿐이다 — 규칙을 다시 설계하거나
 * 중복 구현하지 않는다. `cup.ts`는 이제 이 파일의 `seedCupRound1()`을 호출해 시드 쌍만
 * 받고, `Fixture` 초안(팀 ID·라운드 라벨 등)으로 감싸는 일만 한다.
 *
 * 분리 이유: 시딩 규칙(전역 시드 배정·D-24 우선순위)과 브래킷 초안 생성(팀 ID 매핑·
 * `Fixture` 필드 조립)은 서로 다른 관심사이고, 전자만 필요한 소비자(예: 대진표 미리보기,
 * 향후 다른 컵 포맷)가 `cup.ts` 전체를 끌어오지 않고도 쓸 수 있어야 한다.
 *
 * ## 전역 시드 번호(1~60) — 3개 리그를 하나의 시드 공간으로
 * 컵은 3개 리그 통합 대회라 `playoff.ts`처럼 리그 하나의 순위 배열만으로는 시드를 표현할
 * 수 없다. `CupSeedPools`(리그1 24 + 리그2 20 + 리그3 16, 각 리그 내부는 정규시즌 최종
 * 순위 1위→꼴찌 순)를 **이어붙인 전역 시드 1~60**으로 다룬다 — 시드 1~24 = 리그1,
 * 25~44 = 리그2, 45~60 = 리그3.
 *
 * ## 1라운드 시딩 — D-24 우선순위를 일반화한 `crossPair()`
 * D-24 규칙(① 리그1↔리그3 우선, ② 리그1↔리그2, ③ 리그2↔리그3, ④ 그래도 남으면 동일
 * 티어 시드 순 상하위 교차)을 60/20/16 특정 숫자에 하드코딩하지 않고, "두 시드 풀을
 * 인덱스 순으로 최대한 맞짝짓고 남는 쪽을 다음 단계로 넘긴다"는 `crossPair()` 한 함수를
 * 세 번 적용해 구현한다. 실제 참가 규모(리그1 잔여 20·리그2 20·리그3 16)에서는 ①이
 * 리그1·리그3를 모두 소진하고, ②가 리그1 잔여 4를 리그2로 흡수하고, ③은 리그3가 이미
 * 0이라 공집합이며, 최종적으로 리그2 잔여 16팀만 남아 동일 티어 교차(④)로 8경기가
 * 나온다 — "동일 리그 대진 허용"(42일차 행 요구)은 이 ④ 단계에서 자연히 성립한다(같은
 * 리그 팀끼리도 교차 배정될 수 있음. 실제로는 리그2끼리만 남으므로 매 시즌 발생한다).
 *
 * ## `seasonId` 결정론 — 이 파일이 직접 다루지 않는 이유
 * 1라운드 시딩(`seedCupRound1`)은 `pools`(리그 최종 순위)만의 순수 함수라 `seasonId`
 * 자체는 입력으로 받지 않는다 — 같은 `pools`를 넣으면 항상 같은 대진이 나오고, `pools`는
 * 오케스트레이션 계층이 그 시즌의 최종 순위표에서 결정론적으로 구성한다(순위표 생성 자체의
 * 결정론은 `standing/**`·`rng/**` 소관). 2라운드 이후 추첨은 `seasonSeed`(=
 * `deriveSeasonSeed(worldSeed, seasonNumber)`, `rng/derive.ts` 소유)에서 파생되므로,
 * "같은 시즌 재실행 시 대진 동일" 수락 기준은 두 층 모두에서 값으로 증명된다
 * (`seeding.test.ts`가 전자를, `cup.test.ts`가 후자를 이미 증명 — 42일차는 전자를
 * `cup.ts`에서 이 파일로 옮기고 나서 그 자리에서 다시 값으로 증명한다).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 이 파일은 라운드 1
 * 시딩만 다루므로 난수를 쓰지 않는다(2라운드 이후 추첨은 `cup.ts`가 `rng/derive.ts`·
 * `rng/prng.ts`를 그대로 경유 — 변경 없음). 타입은 `@/types` 배럴로만 import. 정수 시드
 * 비교만 하므로 `rng/precision.ts`(확률 소수 비교용) 대상이 아니다.
 */

import type { TeamId } from '@/types';

/**
 * 전역 시드 1~60을 구성하는 3개 리그 팀 배열. 각 배열은 그 리그의 정규시즌 최종 순위
 * 1위→꼴찌 순으로 정렬돼 있어야 한다(리그1 1~4위가 곧 부전승 4팀, FR-LG-015).
 */
export interface CupSeedPools {
  /** 24팀, 1~24위 순. 시드 1~24. */
  readonly league1: readonly TeamId[];
  /** 20팀, 1~20위 순. 시드 25~44. */
  readonly league2: readonly TeamId[];
  /** 16팀, 1~16위 순. 시드 45~60. */
  readonly league3: readonly TeamId[];
}

export const CUP_SEED_POOL_SIZE = {
  LEAGUE1: 24,
  LEAGUE2: 20,
  LEAGUE3: 16,
  TOTAL: 60,
  /** FR-LG-015: 전 시즌 리그1 1~4위 4팀 부전승. */
  BYE: 4,
  ROUND1_MATCH_COUNT: 28,
} as const;

/** `pools` 크기·중복 여부를 검증한다. `cup.ts`·이 파일 양쪽에서 공유하는 단일 소스. */
export function assertCupSeedPools(pools: CupSeedPools, fnName: string): void {
  if (pools.league1.length !== CUP_SEED_POOL_SIZE.LEAGUE1) {
    throw new RangeError(
      `${fnName}: pools.league1.length는 ${CUP_SEED_POOL_SIZE.LEAGUE1}이어야 합니다 (받은 값: ${pools.league1.length}).`,
    );
  }
  if (pools.league2.length !== CUP_SEED_POOL_SIZE.LEAGUE2) {
    throw new RangeError(
      `${fnName}: pools.league2.length는 ${CUP_SEED_POOL_SIZE.LEAGUE2}이어야 합니다 (받은 값: ${pools.league2.length}).`,
    );
  }
  if (pools.league3.length !== CUP_SEED_POOL_SIZE.LEAGUE3) {
    throw new RangeError(
      `${fnName}: pools.league3.length는 ${CUP_SEED_POOL_SIZE.LEAGUE3}이어야 합니다 (받은 값: ${pools.league3.length}).`,
    );
  }
  const all = [...pools.league1, ...pools.league2, ...pools.league3];
  if (new Set(all).size !== all.length) {
    throw new RangeError(`${fnName}: pools에 중복된 teamId가 있습니다.`);
  }
}

/** 전역 시드 번호(1~60) → 팀 ID. */
export function teamOfGlobalSeed(pools: CupSeedPools, seed: number, fnName: string): TeamId {
  const { LEAGUE1, LEAGUE2, TOTAL } = CUP_SEED_POOL_SIZE;
  if (seed >= 1 && seed <= LEAGUE1) {
    return pools.league1[seed - 1];
  }
  if (seed > LEAGUE1 && seed <= LEAGUE1 + LEAGUE2) {
    return pools.league2[seed - LEAGUE1 - 1];
  }
  if (seed > LEAGUE1 + LEAGUE2 && seed <= TOTAL) {
    return pools.league3[seed - LEAGUE1 - LEAGUE2 - 1];
  }
  throw new RangeError(`${fnName}: seed=${seed}는 유효 범위(1~${TOTAL}) 밖입니다.`);
}

/**
 * 두 시드 풀을 인덱스 순으로 최대한 맞짝짓는다(D-24 우선순위 단계 적용용, 파일 헤더
 * "1라운드 시딩" 절 참조). 짧은 쪽이 소진되면 긴 쪽의 남는 뒷부분을 `leftoverA`/
 * `leftoverB`로 돌려줘 다음 우선순위 단계로 넘길 수 있게 한다. 60/20/16 같은 특정 규모에
 * 의존하지 않는 순수 함수라 참가 규모가 바뀌어도 그대로 재사용된다.
 */
export function crossPair(
  a: readonly number[],
  b: readonly number[],
): {
  readonly pairs: ReadonlyArray<readonly [number, number]>;
  readonly leftoverA: readonly number[];
  readonly leftoverB: readonly number[];
} {
  const n = Math.min(a.length, b.length);
  const pairs: Array<readonly [number, number]> = [];
  for (let i = 0; i < n; i += 1) {
    pairs.push([a[i], b[i]]);
  }
  return { pairs, leftoverA: a.slice(n), leftoverB: b.slice(n) };
}

/** `seedCupRound1()` 결과 — bye 4팀의 시드와 28쌍의 시드 매치업(팀 ID·`Fixture` 필드 없음). */
export interface CupRound1Seeding {
  /** 부전승 4팀의 전역 시드(항상 1~4 — 리그1 1~4위). */
  readonly byeSeeds: readonly [number, number, number, number];
  /** `[시드A, 시드B]` 28쌍. 홈/원정 판정은 소비자(`cup.ts`)가 "더 큰 시드가 홈" 규칙으로 한다. */
  readonly pairs: ReadonlyArray<readonly [number, number]>;
}

/**
 * 1라운드 시딩 — 리그1 1~4위 bye, 나머지 56팀 28쌍. D-24 우선순위(① 리그1↔리그3 →
 * ② 리그1↔리그2 → ③ 리그2↔리그3 → ④ 동일 티어 시드 순 상하위 교차)를 그대로 적용한다.
 * 팀 ID 매핑·`Fixture` 필드 조립은 하지 않는 순수 시드 계산이다(소비자가 `teamOfGlobalSeed()`
 * 등으로 필요한 형태로 감싼다).
 */
export function seedCupRound1(pools: CupSeedPools): CupRound1Seeding {
  assertCupSeedPools(pools, 'seedCupRound1');

  const { LEAGUE1, LEAGUE2, LEAGUE3, BYE, ROUND1_MATCH_COUNT } = CUP_SEED_POOL_SIZE;
  const byeSeeds: readonly [number, number, number, number] = [1, 2, 3, 4];

  let l1 = Array.from({ length: LEAGUE1 - BYE }, (_, i) => BYE + 1 + i); // 5~24
  let l2 = Array.from({ length: LEAGUE2 }, (_, i) => LEAGUE1 + 1 + i); // 25~44
  let l3 = Array.from({ length: LEAGUE3 }, (_, i) => LEAGUE1 + LEAGUE2 + 1 + i); // 45~60

  const pairs: Array<readonly [number, number]> = [];

  const step1 = crossPair(l1, l3); // ① 리그1 ↔ 리그3 우선
  pairs.push(...step1.pairs);
  l1 = [...step1.leftoverA];
  l3 = [...step1.leftoverB];

  const step2 = crossPair(l1, l2); // ② 리그1 ↔ 리그2
  pairs.push(...step2.pairs);
  l1 = [...step2.leftoverA];
  l2 = [...step2.leftoverB];

  const step3 = crossPair(l2, l3); // ③ 리그2 ↔ 리그3
  pairs.push(...step3.pairs);
  l2 = [...step3.leftoverA];
  l3 = [...step3.leftoverB];

  const sameTierRemaining = [...l1, ...l2, ...l3]; // ④ 잔여는 항상 동일 티어만 남는다(동일 리그 대진 허용)
  if (sameTierRemaining.length % 2 !== 0) {
    throw new RangeError(
      `seedCupRound1: 동일 티어 잔여 인원이 홀수입니다(${sameTierRemaining.length}) — 시드 풀 구성을 확인하세요.`,
    );
  }
  const half = sameTierRemaining.length / 2;
  for (let i = 0; i < half; i += 1) {
    pairs.push([sameTierRemaining[i], sameTierRemaining[sameTierRemaining.length - 1 - i]]);
  }

  if (pairs.length !== ROUND1_MATCH_COUNT) {
    throw new RangeError(
      `seedCupRound1: 대진이 ${ROUND1_MATCH_COUNT}경기여야 하는데 ${pairs.length}경기가 만들어졌습니다.`,
    );
  }

  return { byeSeeds, pairs };
}
