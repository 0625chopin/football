/**
 * 발효 정책 3종 해석 함수 시그니처 — **11일차(2026-08-04), Task 003 계속분**
 *
 * 근거: `ROADMAP.md` Task 003 "발효 정책 3종(`NEXT_SEASON`/`IMMEDIATE`/`NEXT_MARKET`) 해석
 * 함수 시그니처 확정" / `docs/team-schedule/03-데이터밸런싱배당팀.md` 11일차 행 / `docs/require/
 * 03-functional-requirements.md` FR-AD-013(발효 시점 규칙). 소유: 3팀 데이터·밸런싱·배당팀
 * (CLAUDE.md `src/lib/config/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: `CommonCodeApplyPolicy`(`NEXT_SEASON`/`IMMEDIATE`/`NEXT_MARKET`) 3종 각각의
 *   "지금 발효되는가"를 판정하는 순수 함수 **시그니처와 최소 판정 로직**.
 * - **담지 않는 것(이후 일차 소관)**: 실제 시즌·마켓 상태를 DB/엔진에서 조회해
 *   `PolicyEffectContext`를 채우는 로직(2팀 엔진, 5팀 어드민 콘솔, 5팀 035 배당 소비
 *   시점), 발효 필터를 `loadConstants`와 결합하는 일(05문서 5.12.2절 "발효 필터"는 값
 *   조회 경로에 정책을 끼워 넣는 것이므로 `loader.ts` 확장이 필요하고 이는 이후 일차
 *   소관). team-schedule 12일차 행이 "시그니처 확정"이라고 명시하므로, 오늘은 계약을
 *   고정하는 것이 목표이며 이 함수들을 실제로 호출하는 배선은 아직 없다.
 *
 * ## FR-AD-013 발효 규칙 요약
 * - **NEXT_SEASON**: 시뮬레이션 밸런스 상수(능력치 보정·부상·성장·포인트 배분·경제) +
 *   스케줄 상수(라운드 간격·페이즈 길이) — `effective_from_season`으로 지정, **다음
 *   시즌부터** 적용. 진행 중 시즌은 불변. `CommonCode.effectiveFromSeason`(E-42,
 *   `src/types/config.ts`)이 이 값을 담는다.
 * - **IMMEDIATE**: 운영 상수(UI 폴링 주기, 로그 레벨, 알림 임계값) — **즉시** 적용.
 * - **NEXT_MARKET**: 배팅 상수(오버라운드, 스테이크 한계, 몬테카를로 N) — **다음 마켓
 *   개설분부터** 적용. 이미 개설된 마켓은 불변.
 *
 * ## `PolicyEffectContext.isMarketAlreadyOpened`를 boolean으로 둔 이유
 * `src/types/betting.ts`(E-34 `BetMarket.status`)에 이미 `BetMarketStatus`
 * (`OPEN`/`CLOSED`/`SETTLED`/`VOIDED`) enum이 있지만, 이 파일(`config` 소유 경로)이 배팅
 * 도메인 타입에 의존하면 두 소유 경로(3팀 `config`, 아직 미착수인 5팀 035 배당) 사이에
 * 불필요한 결합이 생긴다. "지금 시점에 이미 개설된 마켓이 있는가"라는 판정 결과만
 * boolean으로 받는 편이 계약을 더 얇게 유지한다 — 실제 `BetMarketStatus`에서 이 boolean을
 * 계산하는 일은 5팀 035(27~35일차) 소비 시점에서 하면 된다.
 *
 * ## import 규약
 * `CommonCodeApplyPolicy`는 배럴(`@/types`)에서만 import한다(체크리스트 C-5·C-6). 신규
 * 도메인 타입은 선언하지 않는다. `src/lib/sim/**`, `src/types/**`는 이 작업에서 수정하지
 * 않는다.
 */

import type { CommonCodeApplyPolicy } from '@/types';

/**
 * 발효 정책 판정에 필요한 컨텍스트. 이 시점(11일차)에는 정책 3종을 모두 커버할 수 있는
 * 최소 필드만 정의한다 — 실제 값을 채우는 것은 이 파일의 소관이 아니다.
 */
export interface PolicyEffectContext {
  /** 현재 시즌 번호. `NEXT_SEASON` 판정에 쓰인다. */
  readonly currentSeason: number;
  /**
   * 대상 값(코드)의 발효 예정 시즌. `null`이면 아직 지정되지 않은 것이며 미발효로
   * 취급한다(E-42 `CommonCode.effectiveFromSeason`과 동일한 표현).
   */
  readonly effectiveFromSeason: number | null;
  /**
   * `NEXT_MARKET` 판정에 쓰인다. `true`면 이미 개설된 마켓이 있어 이번 값 변경이 그
   * 마켓에는 적용되지 않는다(다음 개설분부터 적용).
   */
  readonly isMarketAlreadyOpened: boolean;
}

/** NEXT_SEASON: 지정된 발효 시즌이 현재 시즌 이하로 도달했을 때만 발효된다. */
export function resolveNextSeasonEffective(ctx: PolicyEffectContext): boolean {
  return ctx.effectiveFromSeason !== null && ctx.effectiveFromSeason <= ctx.currentSeason;
}

/** IMMEDIATE: 운영 상수는 조회 시점에 항상 즉시 발효된 것으로 취급한다. */
export function resolveImmediateEffective(ctx: PolicyEffectContext): boolean {
  void ctx;
  return true;
}

/** NEXT_MARKET: 이미 개설된 마켓이 없을 때만(=다음 개설분부터) 발효된다. */
export function resolveNextMarketEffective(ctx: PolicyEffectContext): boolean {
  return !ctx.isMarketAlreadyOpened;
}

/**
 * 발효 정책 3종에 대한 단일 진입점. `CommonCodeApplyPolicy` 유니온을 전부 분기하는
 * exhaustive switch이므로, 훗날 정책 멤버가 추가되면(있을 가능성은 낮지만) 이 함수가
 * `tsc` 컴파일 오류로 누락을 즉시 드러낸다.
 */
export function isPolicyEffective(
  policy: CommonCodeApplyPolicy,
  ctx: PolicyEffectContext,
): boolean {
  switch (policy) {
    case 'NEXT_SEASON':
      return resolveNextSeasonEffective(ctx);
    case 'IMMEDIATE':
      return resolveImmediateEffective(ctx);
    case 'NEXT_MARKET':
      return resolveNextMarketEffective(ctx);
    default: {
      const _exhaustive: never = policy;
      throw new Error(`[config/policy] 알 수 없는 발효 정책: ${String(_exhaustive)}`);
    }
  }
}
