/**
 * 감독 성향 xG 배율 + 전술 숙련도 실현율 — FR-MT-009, I-119 (30일차, Task 026 스코프).
 *
 * `ability/tactics.ts`(20일차)의 `managerModifier`는 FR-MT-009의 6×6 상성 매트릭스만
 * 다루며, "전술 성향 자체의 xG 배율"(예: ATTACKING → 자팀 xG ×1.12, 피xG ×1.10)과
 * "숙련도 실현율(`0.6 + 0.4×(skill/30)`)"은 개별 선수 능력치 체인(`M_manager`, 스칼라
 * 1개)과 층위가 다른 **팀 단위 xG 조정**이라 그 파일이 다루지 않는다고 명시했다(그 파일
 * "감독" 절 참조, 팀장 보고 이슈 후보로 남겨졌던 항목 = I-119). 이 파일이 그 잔여를
 * 채운다 — `match/snapshot-pipeline.ts`의 `estimateXg`(테스트 전용 고정값)가 아니라,
 * 오케스트레이션 계층이 실제 `estimateXg` 콜백(`events.ts` `GenerateMatchEventsOptions`)을
 * 구현할 때 이 파일의 `applyManagerTendencyXg`로 베이스 xG를 보정하면 된다.
 *
 * ## 실현율이 스케일하는 대상 — "배율 자체"가 아니라 "중립(1.0) 대비 편차"
 * FR-MT-009 원문은 "숙련도는 성향 효과의 실현율"이라고만 정의하고 구체 합성식은 주지
 * 않는다. 배율(`mult`, 예: 1.12)에 실현율을 그대로 곱하면 숙련도가 낮은 감독일수록
 * 배율 자체가 1 밑으로 내려가거나 왜곡될 수 있다(예: 1.12 × 0.6 = 0.672는 "효과가
 * 약하다"가 아니라 "역전"이 된다). 그래서 이 파일은 중립(1.0)에서 벗어난 **편차**만
 * 실현율만큼 스케일한다: `effectiveMultiplier = 1 + (mult - 1) × realizationRate`.
 * `mult=1.12`일 때 숙련도 30(`realizationRate=1.0`)은 그대로 1.12, 숙련도 1
 * (`realizationRate≈0.6133`)은 1.0735로 편차의 약 61.3%만 실현된다 — 수용 기준 ②
 * ("숙련도 30인 감독의 성향 효과가 숙련도 1보다 유의하게 크게 실현됨")를 만족하는
 * 가장 단순한 해석이다.
 *
 * ## 공통코드 그룹 부재 — 안전 기본값을 두지 않는다 (I-83 (b) 확정 적용, 시정 이력 아래)
 * FR-MT-009는 "전 계수는 공통코드로 관리한다"고 명시하지만, 이 성향별 xG 배율
 * 그룹(가칭 `MANAGER_STYLE_XG`)은 `src/lib/config/catalog.ts`(3팀 소유, 37개 그룹
 * 확인 완료 — 30일차)에 아직 없다. `MANAGER_MATCHUP`(6×6 상성, `M_manager` 전용)과는
 * 다른 그룹이 필요하며, 새 그룹 신설은 3팀 소관이라 이 파일이 임의로 만들지 않는다.
 *
 * **최초 작성 시 "전 성향 중립(1.0)" 안전 기본값 + 선택적 override를 뒀던 것은 오판이었다
 * (30일차 팀장 교차 점검, `match/gk-fallback.ts` 헤더 "GK 교차 배율은 리터럴이 아니라
 * 파라미터로 주입받는다" 절 재확인 결과).** `gk-fallback.ts`가 안전 기본값을 허용하는
 * 경우는 **그 값이 3팀 카탈로그에 이미 확정 등재돼 있어 기본값 자체가 "지어낸 값"이
 * 아닌 경우**(`GK_CROSS=0.35`, `POSITION_PROFICIENCY_MULT` 그룹에 실제 등재)뿐이다.
 * 반대로 `events.ts`의 `occursProbability`처럼 **확정된 기본값 자체가 없는 순수 밸런싱
 * 미지수는 필수 파라미터로 강제**한다 — 이 파일의 성향별 xG 배율은 카탈로그에 그룹조차
 * 없으므로(확정 기본값 없음) 후자에 해당한다. "중립값이라 안전하다"며 기본값을 두면
 * 오케스트레이션이 주입을 빠뜨렸을 때 아무 신호 없이 중립 배율로 시뮬레이션이 굴러
 * FR-AD-004(재현성)를 조용히 깨뜨린다. 그래서 `table`은 `berger.ts`의 `teamCount`와
 * 같은 방식(호출자 필수 주입)으로 바꾸고, 성향 키가 테이블에 없으면 즉시 예외를
 * 던진다(침묵 대체 금지) — `MANAGER_STYLE_XG` 그룹 신설 자체는 팀장 보고 이슈 후보로
 * 남긴다(반영은 3팀/팀장 소관).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 타입은 `@/types`
 * 배럴로만 import(서브경로 금지).
 */

import type { ManagerStyle } from '@/types';

/** 성향 1개의 자팀(own)/피(conceded) xG 배율. */
export interface ManagerTendencyXgMultiplier {
  readonly ownXgMultiplier: number;
  readonly concededXgMultiplier: number;
}

/** 성향 6종 전부에 대한 배율 테이블 — 호출자(오케스트레이션 계층)가 반드시 채워 주입한다. */
export type ManagerTendencyXgTable = Readonly<Record<ManagerStyle, ManagerTendencyXgMultiplier>>;

/** `Manager.tacticalSkill`(`@/types/person.ts`)과 동일한 1~30 스케일. */
const TACTICAL_SKILL_MIN = 1;
const TACTICAL_SKILL_MAX = 30;
const REALIZATION_BASE = 0.6;
const REALIZATION_SPAN = 0.4;

/**
 * 전술 숙련도 실현율(FR-MT-009): `0.6 + 0.4 × (skill / 30)`.
 * `skill=1` → `0.6133...`, `skill=30` → `1.0`(편차 전부 실현).
 *
 * @throws `tacticalSkill`이 `[1, 30]` 범위 밖이거나 유한수가 아니면 오류.
 */
export function tacticalSkillRealizationRate(tacticalSkill: number): number {
  if (
    typeof tacticalSkill !== 'number' ||
    !Number.isFinite(tacticalSkill) ||
    tacticalSkill < TACTICAL_SKILL_MIN ||
    tacticalSkill > TACTICAL_SKILL_MAX
  ) {
    throw new RangeError(
      `tacticalSkillRealizationRate: tacticalSkill은 ${TACTICAL_SKILL_MIN}~${TACTICAL_SKILL_MAX} 사이 유한수여야 합니다 (받은 값: ${tacticalSkill}).`,
    );
  }
  return REALIZATION_BASE + REALIZATION_SPAN * (tacticalSkill / TACTICAL_SKILL_MAX);
}

/** xG 보정을 자팀 관점으로 적용할지, 상대(피) 관점으로 적용할지. */
export type XgPerspective = 'OWN' | 'CONCEDED';

export interface ManagerTendencyXgInput {
  readonly style: ManagerStyle;
  /** 1~30 (`Manager.tacticalSkill`). */
  readonly tacticalSkill: number;
  /**
   * 성향별 xG 배율 테이블 — 필수 주입(I-83 (b), 안전 기본값 없음). 오케스트레이션
   * 계층이 `MANAGER_STYLE_XG` 공통코드 그룹(신설 전까지는 팀장/3팀이 확정한 임시 값)을
   * `SimConstantSnapshot`에서 꺼내 넘긴다.
   */
  readonly table: ManagerTendencyXgTable;
}

/**
 * 감독 성향 xG 배율 + 숙련도 실현율을 `baseXg`에 적용한다(FR-MT-009).
 * `perspective`가 `OWN`이면 자팀 슛(공격 성향 반영), `CONCEDED`면 상대 슛(수비 성향
 * 반영)에 쓴다 — 매 슛 이벤트의 xG 산출 시 감독이 속한 팀 기준으로 호출자가 선택한다.
 *
 * @throws `baseXg`가 음수이거나 유한수가 아니면, `tacticalSkill`이 범위 밖이면, 또는
 *   `input.table`에 `input.style` 키가 없으면 오류(침묵 대체 없음, I-83 (b)).
 */
export function applyManagerTendencyXg(
  baseXg: number,
  perspective: XgPerspective,
  input: ManagerTendencyXgInput,
): number {
  if (typeof baseXg !== 'number' || !Number.isFinite(baseXg) || baseXg < 0) {
    throw new RangeError(`applyManagerTendencyXg: baseXg는 0 이상 유한수여야 합니다 (받은 값: ${baseXg}).`);
  }
  const tendency = input.table[input.style];
  if (!tendency) {
    throw new Error(
      `applyManagerTendencyXg: table에 "${input.style}" 성향의 xG 배율이 없습니다 — 중립값으로 조용히 ` +
        '대체하지 않는다(I-83 (b), FR-AD-004 재현성).',
    );
  }
  const rawMultiplier = perspective === 'OWN' ? tendency.ownXgMultiplier : tendency.concededXgMultiplier;
  const realizationRate = tacticalSkillRealizationRate(input.tacticalSkill);
  const effectiveMultiplier = 1 + (rawMultiplier - 1) * realizationRate;
  return baseXg * effectiveMultiplier;
}
