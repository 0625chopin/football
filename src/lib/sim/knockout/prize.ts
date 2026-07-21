/**
 * `src/lib/sim/knockout/prize.ts` — Task 027(45일차) "상금 지급(공통코드 `PLAYOFF_PRIZE`·
 * `CUP_PRIZE`·자이언트킬링 보너스) → 원장 기록". `docs/team-schedule/02-시뮬레이션엔진팀.md`
 * 45일차 행. 근거: `docs/require/03-functional-requirements.md` FR-EC-003(플레이오프
 * 상금표)·FR-EC-004(컵 상금표 + 자이언트킬링) / `src/types/enums.ts`
 * `PointTransactionReasonCode`(E-30).
 *
 * ## 이 파일이 하는 것 / 하지 않는 것
 * 순위/탈락 라운드 → 상금(`amount`)·원장 사유 코드(`reasonCode`) **계산만** 한다. 실제
 * 원장 기록(`PointTransaction` 생성)은 3팀 소유 `src/lib/economy/ledger.ts`의
 * `postPointTransaction()` 단일 진입점이 맡는다(그 파일 헤더 "담지 않는 것" 절 —
 * ID/시각 생성은 호출자가 이미 브랜드된 값을 넘긴다는 원칙과 동일하게, 이 파일도
 * `Points`/`PointTransactionId` 등 브랜드 값을 직접 만들지 않는다 — `brand.ts` "생성은
 * 이 파일 밖에서 하지 않는다" 원칙, 지정된 단일 지점이 아니므로). 오케스트레이션 계층이
 * 이 파일의 반환값(`amount: number`)에 `ownerId`·`refType`/`refId`·`id`·`createdAt`을
 * 얹어 `postPointTransaction()`을 호출한다.
 *
 * **⚠️ FR-LG-014(플레이오프 우승은 별도 트로피, 승격 권한 없음)**: 이 파일은 승격/강등을
 * 전혀 계산하지 않는다 — 승격 슬롯은 정규시즌 순위(Task 026, `standing/`)로만 결정되며,
 * 플레이오프 결과는 상금·명예에만 영향을 준다. 이 파일에 승격 로직을 추가하지 말 것
 * (완료 판정 "승격 팀 수 불변"의 근거).
 *
 * ## 공통코드 주입 (I-83 패턴)
 * `PLAYOFF_PRIZE`/`CUP_PRIZE` 값은 이 엔진이 `loadConstants()`를 직접 호출하지 않는다
 * (팀 소유 경로 규칙 — 엔진은 공통코드 값을 파라미터로만 주입받는다, `standing/tiebreak.ts`
 * `MATCH_POINTS_DEFAULT`와 동일 패턴). 오케스트레이션 계층이 `SimConstantSnapshot`에서
 * 꺼내 넘기기 전까지는 `PLAYOFF_PRIZE_DEFAULT`/`CUP_PRIZE_DEFAULT` 안전 기본값을 쓴다.
 *
 * **⚠️ I-190 (밸런싱 근거 없는 잠정값 이슈, 3팀 — 031b 이전)**: 실제 공통코드 카탈로그
 * (`src/lib/config/fallback.ts` `PLAYOFF_PRIZE`)는 05문서의 중간 조합 생략 표기 때문에
 * 현재 `L1_WIN`·`L3_RUNNERUP` 2코드만 등록돼 있다. `PLAYOFF_PRIZE_DEFAULT`는 FR-EC-003
 * 요구사항 원문 표 10개 조합 전체를 채워 둔 안전 기본값이며(등록된 2코드와 값이 일치),
 * 카탈로그의 나머지 8코드 등록 자체는 이 파일의 소관이 아니다(`src/lib/config/**`는 3팀
 * 소유 경로).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 확률이 아니라
 * 정수 상금 룩업·비교만 하므로 `rng/precision.ts` 대상이 아니다. 타입은 `@/types`
 * 배럴로만 import.
 */

import type { PointTransactionReasonCode } from '@/types';

/** 리그 티어 — `League.tier`(E-02)와 동일한 1/2/3 원시 숫자. */
export type LeagueTier = 1 | 2 | 3;

/** FR-EC-003 표의 "성적" 행 5종. 리그마다 유효한 부분집합만 쓴다(아래 검증 참조). */
export type PlayoffPlacement =
  | 'WIN'
  | 'RUNNERUP'
  | 'SEMIFINAL_OUT'
  | 'QUARTERFINAL_OUT'
  | 'WILDCARD_OUT';

/** FR-EC-004 표의 "성적" 행 7종(컵은 리그 구분 없이 단일 표). */
export type CupPlacement =
  | 'WIN'
  | 'RUNNERUP'
  | 'SEMIFINAL_OUT'
  | 'QUARTERFINAL_OUT'
  | 'ROUND_OF_16_OUT'
  | 'ROUND_OF_32_OUT'
  | 'ROUND_1_OUT';

/** `PLAYOFF_PRIZE` 공통코드 그룹과 동일한 키 구성(리그×성적 10조합, FR-EC-003). */
export interface PlayoffPrizeTable {
  readonly L1_WIN: number;
  readonly L1_RUNNERUP: number;
  readonly L1_SF: number;
  readonly L1_QF: number;
  readonly L1_WC: number;
  readonly L2_WIN: number;
  readonly L2_RUNNERUP: number;
  readonly L2_SF: number;
  readonly L3_WIN: number;
  readonly L3_RUNNERUP: number;
}

/** `CUP_PRIZE` 공통코드 그룹과 동일한 키 구성(성적 7종 + 자이언트킬링, FR-EC-004). */
export interface CupPrizeTable {
  readonly WIN: number;
  readonly RUNNERUP: number;
  readonly SF: number;
  readonly QF: number;
  readonly R16: number;
  readonly R32: number;
  readonly R1: number;
  /** 하위 티어 팀이 상위 티어 팀을 이겼을 때 티어 차 1당 지급되는 보너스 단가. */
  readonly GIANT_KILLING: number;
}

/** FR-EC-003 요구사항 원문 표와 동일한 안전 기본값(I-83 주입 패턴, I-190 참조). */
export const PLAYOFF_PRIZE_DEFAULT: PlayoffPrizeTable = {
  L1_WIN: 1500,
  L1_RUNNERUP: 800,
  L1_SF: 400,
  L1_QF: 200,
  L1_WC: 100,
  L2_WIN: 800,
  L2_RUNNERUP: 400,
  L2_SF: 200,
  L3_WIN: 400,
  L3_RUNNERUP: 200,
};

/** FR-EC-004 요구사항 원문 표와 동일한 안전 기본값(카탈로그에 이미 8코드 전량 등록됨). */
export const CUP_PRIZE_DEFAULT: CupPrizeTable = {
  WIN: 2000,
  RUNNERUP: 1000,
  SF: 500,
  QF: 250,
  R16: 120,
  R32: 60,
  R1: 30,
  GIANT_KILLING: 100,
};

/** 상금 계산 결과 — 원장 기록에 필요한 나머지 필드는 오케스트레이션 계층이 채운다. */
export interface PrizeAward {
  /** 부호 없는 지급액(원장 `amount`는 이 값을 그대로 넣거나, 차감이면 호출자가 부호를 뒤집는다). */
  readonly amount: number;
  readonly reasonCode: PointTransactionReasonCode;
}

/** 리그별로 유효한 `PlayoffPlacement` 집합(FR-EC-003 표에 값이 있는 셀만). */
const VALID_PLAYOFF_PLACEMENTS: Readonly<Record<LeagueTier, readonly PlayoffPlacement[]>> = {
  1: ['WIN', 'RUNNERUP', 'SEMIFINAL_OUT', 'QUARTERFINAL_OUT', 'WILDCARD_OUT'],
  2: ['WIN', 'RUNNERUP', 'SEMIFINAL_OUT'],
  3: ['WIN', 'RUNNERUP'],
};

/** `PlayoffPrizeTable` 키의 `L{tier}_` 접두어 뒤에 오는 부분(성적 → 접미어). */
const PLAYOFF_PLACEMENT_SUFFIX: Readonly<Record<PlayoffPlacement, string>> = {
  WIN: 'WIN',
  RUNNERUP: 'RUNNERUP',
  SEMIFINAL_OUT: 'SF',
  QUARTERFINAL_OUT: 'QF',
  WILDCARD_OUT: 'WC',
};

/**
 * 리그 플레이오프 상금 — FR-EC-003. `tier`에서 유효하지 않은 `placement`(예: 리그3 +
 * `SEMIFINAL_OUT` — 리그3 플레이오프는 결승 1경기뿐이라 4강 자체가 없다)는 `RangeError`.
 */
export function resolvePlayoffPrize(
  tier: LeagueTier,
  placement: PlayoffPlacement,
  table: PlayoffPrizeTable = PLAYOFF_PRIZE_DEFAULT,
): PrizeAward {
  const validPlacements = VALID_PLAYOFF_PLACEMENTS[tier];
  if (validPlacements === undefined) {
    throw new RangeError(`resolvePlayoffPrize: tier=${tier}는 1|2|3이어야 합니다.`);
  }
  if (!validPlacements.includes(placement)) {
    throw new RangeError(
      `resolvePlayoffPrize: 리그${tier}에는 placement="${placement}"가 존재하지 않습니다 ` +
        `(유효값: ${validPlacements.join(', ')}).`,
    );
  }
  const key = `L${tier}_${PLAYOFF_PLACEMENT_SUFFIX[placement]}` as keyof PlayoffPrizeTable;
  return { amount: table[key], reasonCode: 'PLAYOFF_PRIZE' };
}

const CUP_TABLE_KEY: Readonly<Record<CupPlacement, keyof CupPrizeTable>> = {
  WIN: 'WIN',
  RUNNERUP: 'RUNNERUP',
  SEMIFINAL_OUT: 'SF',
  QUARTERFINAL_OUT: 'QF',
  ROUND_OF_16_OUT: 'R16',
  ROUND_OF_32_OUT: 'R32',
  ROUND_1_OUT: 'R1',
};

/** 컵대회 상금 — FR-EC-004(리그 구분 없는 단일 표, 60팀 통합 대회이므로). */
export function resolveCupPrize(
  placement: CupPlacement,
  table: CupPrizeTable = CUP_PRIZE_DEFAULT,
): PrizeAward {
  return { amount: table[CUP_TABLE_KEY[placement]], reasonCode: 'CUP_PRIZE' };
}

/**
 * 자이언트킬링 보너스 — FR-EC-004 "하위 티어 팀이 상위 티어 팀을 이기면 티어 차당
 * +100pt". 티어 번호가 클수록 하위 리그(`League.tier` "1/2/3", 1이 최상위)이므로 승자
 * 티어가 패자 티어보다 **숫자가 큰**(더 하위인) 경우에만 보너스가 발생한다. 같은 티어
 * 대결이거나 상위 티어가 이긴 통상적인 결과면 보너스가 없다는 뜻으로 `null`을 반환한다
 * (0원 지급 원장 레코드를 만들 필요가 없다는 신호 — 호출자가 `null`이면 원장 기록 자체를
 * 생략하면 된다).
 */
export function resolveGiantKillingBonus(
  winnerTier: LeagueTier,
  loserTier: LeagueTier,
  table: CupPrizeTable = CUP_PRIZE_DEFAULT,
): PrizeAward | null {
  const tierGap = winnerTier - loserTier;
  if (tierGap <= 0) {
    return null;
  }
  return { amount: tierGap * table.GIANT_KILLING, reasonCode: 'GIANT_KILLING_BONUS' };
}
