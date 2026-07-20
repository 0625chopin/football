/**
 * GK 퇴장 + 교체 소진 시 필드플레이어 GK 배치 (D-22, 구 I-02)
 *
 * Task 023 / 14일차(2026-08-07) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 14일차 행:
 * "GK 퇴장 + 교체 소진 시 필드플레이어 GK 배치 (D-22: 벤치 GK+교체여유 → GK 투입 / 소진 시
 * `goalkeeping` 최고 → 동률 시 유효능력 최저 → 시드 결정론, 배율 0.35)"(동일 항목이
 * `ROADMAP.md` Task 023 6번째 체크박스). 근거 `docs/require/06-prioritization-and-risks.md`
 * D-22 원문(세부 절차):
 *
 * ① 벤치에 GK가 있고 **교체 카드가 남아 있으면** → 유효 능력치가 가장 낮은 필드플레이어를
 *    빼고 GK 투입
 * ② 교체 소진이거나 벤치 GK가 없으면 → **출전 중 선수 중 `goalkeeping` 능력치 최고**인 선수
 * ③ ②가 동률이면 → **유효 능력치가 가장 낮은 선수** (팀 전력 손실 최소화)
 * ④ 그래도 동률이면 → `player_id` 기반 **시드 결정론적 선택** (재현성 보장)
 * ⑤ 선정된 필드플레이어에게 **GK 교차 배율 0.35** 적용, 원 포지션 기여는 상실
 *
 * `tick.ts`(9일차) 파일 헤더가 이미 "GK 대체(14일차 `gk-fallback.ts`)는 전부 이 파일의
 * 범위 밖"이라고 선언해 두었다 — 이 파일이 그 몫을 신규로 채운다.
 *
 * ## 이 파일의 책임 범위 — "①의 교체"는 재구현하지 않고 위임한다
 * `substitution.ts`(12일차)가 이미 인원 상한(5명)·창 상한(3회)·재투입 금지를 순수 함수
 * `applySubstitution`으로 강제하고 있다. D-22 ①의 "교체 카드가 남아 있으면"이라는 조건은
 * 사실상 `applySubstitution`이 승인하는지 여부와 동일하므로, 이 파일은 상한을 다시
 * 검사하지 않고 `applySubstitution` 호출 결과(승인/거부)로 ①과 ②의 분기를 가른다.
 *
 * ## "goalkeeping·유효 능력치"는 이 파일이 계산하지 않는다
 * `tick.ts`/`events.ts`/`substitution.ts`/`penalty.ts`가 확립한 선례와 동일하게, 실제
 * 능력치 산출(9개 계수 체인)은 `Task 024`(17~24일차)의 산출물이다 — 14일차 시점에는 그
 * 계수도 라인업 데이터도 없다. 그래서 이 파일은 `goalkeepingAbility`/`effectiveAbility`
 * 값 자체를 계산하지 않고, 이미 산출된 값을 담은 후보 배열(`GkFallbackCandidate[]`)을
 * 호출자에게 입력으로 요구한다. 오늘 리터럴이나 추측으로 그 값을 지어내면 024 계수
 * 체인과 충돌할 소지가 있다(NFR-CFG-001).
 *
 * ## `precision.ts`(확률 비교)를 쓰지 않는 이유
 * `NFR-DT-005`/`precision.ts` 파일 헤더가 명시하는 고정 정밀도 비교는 **확률**
 * (`[0, 1]` 범위, `toUnits`가 이 범위를 벗어나면 예외) 비교 전용이다.
 * `goalkeepingAbility`/`effectiveAbility`는 확률이 아니라 능력치 크기 값이라 이 대상이
 * 아니다 — 그래서 이 파일은 일반 숫자 비교(`Math.max`/`Math.min`·`===`)와
 * `sort.ts`의 `stableSortBy`를 쓴다(둘 다 부동소수 "확률 비교 오차"가 아니라 정수/실수
 * 대소 비교이므로 NFR-DT-005 대상 밖).
 *
 * ## ①의 "유효 능력치 최저" 동률 처리 — D-22 원문에 없는 절차를 새로 만들지 않는다
 * D-22는 ②→③→④에서만 동률 절차(goalkeeping 최고 → 유효능력 최저 → 시드 추첨)를
 * 명시한다. ①에서 "누구를 빼고 벤치 GK를 투입할지" 고를 때 유효 능력치가 동률이면
 * 원문이 침묵하므로, 이 파일은 새로운 RNG 지점을 만들지 않고 `stableSortBy`로
 * `playerId` 오름차순 고정을 적용해 결정론만 보장한다(추첨이 필요한 사안이라고
 * 추측하지 않는다 — NFR-CFG-001과 동일한 "지어내지 않는다" 원칙).
 *
 * ## RNG 사용 방식 — 왜 `eventIndex 3`을 예약하는가
 * `events.ts`(10일차)는 같은 `tick.tick`에서 `eventIndex 1`("발생하는가")·`2`("무엇이
 * 발생하는가")를 이미 쓰고, `tick.ts`(9일차)는 경계 분(45/90)에서 `eventIndex 0`을 쓴다
 * (`events.ts` 파일 헤더 "시드 사용 방식" 절 참조). GK 퇴장은 `RED_CARD`/`SECOND_YELLOW`
 * 이벤트 발생 직후 판단이 필요한데, `events.ts`의 골격은 **틱당 이벤트를 최대 1건만
 * 생성**하므로(`generateMatchEvents` 순회 구조 확인) 같은 tick에서 이 파일의 추첨과
 * `events.ts`의 추첨이 동시에 일어날 일이 없다 — 그래도 값 자체가 겹치는 것은 별개
 * 문제이므로, `derive.ts`가 보장하는 "다른 (tick, eventIndex) 조합 = 독립 스트림"을
 * 실제로 지키기 위해 `events.ts`가 쓰지 않는 `3`을 이 파일 전용으로 예약한다.
 * `penalty.ts`(13일차)의 `PENALTY_SHOOTOUT_RESERVED_TICK`(전용 tick 예약)과 같은
 * 목적의 규약을, 이 파일은 "같은 tick 안에서 전용 eventIndex를 예약"하는 방식으로
 * 적용한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴(`@/types`)로 `PlayerId`/`TeamId`/`MatchSeed`만 참조한다(서브경로
 * 금지, 재선언 금지).
 *
 * ## GK 교차 배율은 리터럴이 아니라 파라미터로 주입받는다 (I-83, 14일차 확정 — 사용자 승인)
 * 최초 작성 시 `GK_CROSS_POSITION_MODIFIER = 0.35`를 이 파일의 export 리터럴 상수로 두고
 * "H-05 공통코드 인수 목록(024/025/027)에 없으니 NFR-CFG-001 대상이 아니다"라고 판단했으나,
 * 이는 오판이었다 — 3팀 `src/lib/config/catalog.ts`의 `COMMON_CODE_GROUP_CATALOG`를 다시
 * 확인한 결과 `POSITION_PROFICIENCY_MULT` 그룹(`applyPolicy: NEXT_SEASON`)의 코드값으로
 * `GK_CROSS=0.35`가 **이미 공통코드 카탈로그에 정식 등재되어 있다.** 즉 이 값은 시즌마다
 * 조정 가능한 밸런싱 파라미터이지 축구 규칙 구조 상수가 아니다(`substitution.ts`의
 * `MAX_SUBSTITUTIONS_PER_TEAM`=5와는 성격이 다르다).
 *
 * 12일차부터 2팀이 제기해 사용자 판정을 대기하던 I-83("`src/lib/sim/**`가 공통코드 값을
 * 얻는 방식")이 14일차에 **(b) 스냅샷 주입 방식**으로 확정됐다 — `src/lib/sim/**`의 순수
 * 함수는 `loadConstants()`를 **직접 호출하지 않고**, 엔진 밖 오케스트레이션 계층이
 * `SimConstantSnapshot`(E-44, `@/types/config.ts`)에서 꺼낸 값을 **파라미터로 주입**받는다.
 * 근거: ① E-44 JSDoc "재현(FR-AD-004) 시 반드시 이 `constants`를 로드해 사용" ②
 * `Fixture.snapshotId` NOT NULL(경기 시뮬 시점 상수를 얼리기 위함) ③
 * `docs/db/schema-design.md` R-11 "`CommonCode → SimConstantSnapshot`은 직접 FK가 아니라
 * 직렬화 결과로만 연결". `loadConstants()`는 모듈 스코프 가변 상태(`cache`,
 * `globalDefaultSource`, 3팀 `loader.ts`)에 의존해 같은 인자로도 시점에 따라 다른 값을
 * 반환하므로, 엔진이 직접 호출하면 참조 투명성과 FR-AD-004 재현이 동시에 깨진다.
 *
 * 그래서 이 파일은 `GK_CROSS_POSITION_MODIFIER`를 export 상수로 고정하지 않고,
 * `ResolveGkFallbackOptions.crossPositionModifier`(선택적 파라미터)로 주입받는다.
 * 주입원(오케스트레이션 계층의 `SimConstantSnapshot` 배선)이 아직 연결되지 않은 현재
 * 시점에는 `GK_CROSS_POSITION_MODIFIER_DEFAULT`(=0.35, 카탈로그 기본값과 동일)를 안전
 * 기본값으로 남겨 둔다 — `events.ts`의 `occursProbability`처럼 아예 필수 파라미터로
 * 강제하지 않은 이유는, 그쪽은 애초에 확정된 기본값이 없는 순수 밸런싱 미지수인 반면
 * 이 값은 3팀 카탈로그에 이미 확정 등재된 기본값이 있어 안전 기본값으로 남겨도
 * "지어낸 값"이 아니기 때문이다. 이 파일은 `src/lib/config/**`를 import하지 않는다
 * (해당 경로는 3팀 소유이며, I-83이 명시한 대로 `loadConstants()` 호출 자체를 이 파일
 * 밖에서 하도록 경계를 유지한다).
 *
 * ## 값의 출처를 왜 반환값으로만 드러내는가 — WARN 로그를 넣지 않는 이유 (14일차, 사용자 승인)
 * 1팀이 14일차 교차 점검에서 "주입 누락 시 조용한 폴백" 위험을 지적했다 — 오케스트레이션
 * 배선이 빠지면 `crossPositionModifier`가 아무 신호 없이 안전 기본값으로 대체되고,
 * 어드민이 DB에서 `GK_CROSS`를 조정해도 반영되지 않는 상태가 소리 없이 지속될 수 있다
 * (FR-AD-004를 조용히 깨는 경로). 3팀 `fallback.ts`/`loader.ts`는 같은 상황에서
 * `console.warn` 기반 캡슐화 로그를 남기는 관례를 이미 확립했지만, 이 파일은 그 관례를
 * **따르지 않고 `GkFallbackResult.crossPositionModifierSource`(반환값)로만** 신호를
 * 노출한다. 근거:
 * 1. **부작용 0건이 이 레이어의 불변식이다** — `tick.ts`/`events.ts`/`stats.ts`/
 *    `substitution.ts`/`penalty.ts` 5개 선행 파일 전부 `console.*` 호출이 0건이고, 순수
 *    입력→출력만으로 테스트를 검증해 왔다(`toEqual`로 결과 객체를 통째로 비교하는 이
 *    파일의 테스트 스타일도 동일). `console.warn`을 처음 들이면 이 불변식이 깨지고,
 *    테스트도 `vi.spyOn(console, 'warn')` 같은 부수효과 검증으로 성격이 바뀐다.
 * 2. **`fallback.ts`의 WARN은 값이 발견되지 않아 시스템이 멈추지 않게 하는 최후
 *    방어선**(NFR-CFG-005)이고, 이 파일의 "기본값 사용"은 그와 다르다 — 오케스트레이션이
 *    아직 배선되지 않은 **현재 개발 단계의 정상 상태**다. 정상 경로에 매 호출마다 WARN을
 *    찍으면 실제 이상(예: `fallback.ts`가 조회 자체에 실패하는 경우)의 신호 대 잡음비가
 *    떨어진다.
 * 3. **로깅 주체는 호출자가 맞다** — 이 파일은 `matchId`/`fixtureId` 같은 문맥을 모른다.
 *    구조적 JSON 로깅(39일차 `obs/logger.ts`)이 붙을 오케스트레이션 계층이 이 필드를
 *    보고 문맥을 채워 로그를 남기는 편이, 엔진이 문맥 없는 `console.warn` 한 줄을 남기는
 *    것보다 실제로 유용하다.
 *
 * 결론: 순수 함수 계층은 **관측 가능성을 반환값으로 노출**하고, **관측(로깅) 정책은
 * 호출자에게 위임**한다. Task 031b(68일차, 3팀 수락 기준 "`src/lib/sim/`에 대상 상수
 * 리터럴 잔존 0건") 시점에 오케스트레이션 배선이 완성되면 `GK_CROSS_POSITION_MODIFIER_
 * DEFAULT` 자체를 걷어낼 예정이다 — 그때는 이 출처 필드도 함께 재검토한다.
 */

import type { MatchSeed, PlayerId, TeamId } from '@/types';
import type { MatchTick } from './tick';
import {
  applySubstitution,
  type SubstitutionAttempt,
  type SubstitutionResult,
  type TeamSubstitutionState,
} from './substitution';
import { deriveEventSeed, stateForSeed } from '../rng/derive';
import { nextIntBelow } from '../rng/prng';
import { stableSortBy } from '../rng/sort';

/**
 * GK 교차 배율(D-22 ⑤ 원문 "GK 교차 배율 0.35")의 **안전 기본값** — 공통코드
 * `POSITION_PROFICIENCY_MULT.GK_CROSS`(3팀 `src/lib/config/catalog.ts` 카탈로그 등재값)와
 * 동일하다. I-83(14일차 확정) 이후 이 값은 더 이상 이 파일의 고정 리터럴이 아니다 —
 * 실제 사용값은 `ResolveGkFallbackOptions.crossPositionModifier`로 주입받고, 주입이
 * 없을 때만 이 상수를 폴백으로 쓴다. 자세한 경위는 파일 상단 "GK 교차 배율은 리터럴이
 * 아니라 파라미터로 주입받는다" 절 참조.
 */
export const GK_CROSS_POSITION_MODIFIER_DEFAULT = 0.35;

/**
 * `deriveEventSeed(matchSeed, tick.tick, eventIndex)` 전용 예약 `eventIndex` 값. 왜 `3`인지는
 * 파일 상단 "RNG 사용 방식" 절 참조 — `events.ts`가 같은 tick에서 쓰는 `0`/`1`/`2`와
 * 배타적이다.
 */
export const GK_FALLBACK_TIEBREAK_EVENT_INDEX = 3;

/**
 * GK 대체 후보 1명 — 현재 필드 위(퇴장한 GK 제외) 아웃필드 선수. 값 자체는 호출자가
 * 024 계수 체인(또는 테스트 픽스처)에서 산출해 주입한다(파일 상단 참조).
 */
export interface GkFallbackCandidate {
  readonly playerId: PlayerId;
  /** 출전 중 선수의 GK 능력치(D-22 ②). */
  readonly goalkeepingAbility: number;
  /** 출전 중 선수의 유효 능력치(D-22 ①·③, 팀 전력 손실 최소화 판단 기준). */
  readonly effectiveAbility: number;
}

export interface ResolveGkFallbackOptions {
  readonly matchSeed: MatchSeed;
  readonly tick: MatchTick;
  readonly teamId: TeamId;
  /** GK가 퇴장한 팀의 현재 교체 진행 상태(`substitution.ts`). */
  readonly substitutionState: TeamSubstitutionState;
  /** 벤치 GK 선수 ID. 벤치에 GK가 없으면 `null`(D-22 ② 조건 "벤치 GK가 없으면"). */
  readonly benchGoalkeeperId: PlayerId | null;
  /** 퇴장한 GK를 제외한, 현재 필드 위 아웃필드 선수 전원(최소 1명). */
  readonly onFieldOutfieldPlayers: readonly GkFallbackCandidate[];
  /** 벤치 GK 투입이 승인될 경우 `SUBSTITUTION` 이벤트에 부여할 순번. */
  readonly sequence: number;
  /**
   * GK 교차 배율(D-22 ⑤, 공통코드 `POSITION_PROFICIENCY_MULT.GK_CROSS`). I-83(14일차
   * 확정) 이후 오케스트레이션 계층이 `SimConstantSnapshot.constants.POSITION_PROFICIENCY_MULT
   * .GK_CROSS`에서 꺼내 주입한다 — 이 파일은 `loadConstants()`를 직접 호출하지 않는다
   * (파일 상단 "GK 교차 배율은 리터럴이 아니라 파라미터로 주입받는다" 절 참조). 생략하면
   * `GK_CROSS_POSITION_MODIFIER_DEFAULT`(0.35)를 안전 기본값으로 사용한다.
   */
  readonly crossPositionModifier?: number;
}

/** 어느 경로로 GK가 확정됐는지. */
export type GkFallbackMethod = 'BENCH_GOALKEEPER_SUBSTITUTION' | 'FIELD_PLAYER_REASSIGNMENT';

/** `FIELD_PLAYER_REASSIGNMENT`일 때, D-22의 어느 단계에서 후보가 1명으로 좁혀졌는지(감사·테스트용). */
export type GkFallbackResolution = 'GOALKEEPING_ABILITY' | 'EFFECTIVE_ABILITY' | 'SEED_DRAW';

/**
 * `crossPositionModifier`가 **오케스트레이션 계층이 실제로 주입한 값**(`'INJECTED'`)인지,
 * 주입이 생략돼 **안전 기본값으로 조용히 대체된 것**(`'DEFAULT'`)인지 구분하는 신호(1팀
 * 14일차 교차 점검 지적, 사용자 승인 — "주입 누락 시 조용한 폴백" 방지). 파일 상단
 * "값의 출처를 왜 반환값으로만 드러내는가" 절 참조.
 */
export type GkCrossPositionModifierSource = 'INJECTED' | 'DEFAULT';

export interface GkFallbackResult {
  readonly method: GkFallbackMethod;
  /** 이제 GK 역할을 맡는 선수. */
  readonly goalkeeperPlayerId: PlayerId;
  /** `BENCH_GOALKEEPER_SUBSTITUTION`일 때만 채워짐(승인된 `applySubstitution` 결과). */
  readonly substitution: SubstitutionResult | null;
  /**
   * `FIELD_PLAYER_REASSIGNMENT`일 때만 값이 채워짐(주입된 `crossPositionModifier` 또는
   * `GK_CROSS_POSITION_MODIFIER_DEFAULT`), 아니면 `null`(D-22 ⑤).
   */
  readonly crossPositionModifier: number | null;
  /**
   * `crossPositionModifier`의 출처. `crossPositionModifier`가 `null`이면(벤치 GK 투입 경로)
   * 이 필드도 `null`이다 — 배율 자체가 적용되지 않아 출처를 따질 대상이 없기 때문이다.
   */
  readonly crossPositionModifierSource: GkCrossPositionModifierSource | null;
  /** `FIELD_PLAYER_REASSIGNMENT`일 때만 채워짐, 아니면 `null`. */
  readonly resolvedBy: GkFallbackResolution | null;
}

/**
 * D-22 ①의 "유효 능력치가 가장 낮은 필드플레이어" 선정. 동률 시 절차는 파일 상단
 * "①의 유효 능력치 최저 동률 처리" 절 참조 — `playerId` 오름차순으로 결정론 고정한다.
 */
function selectWeakestOutfieldPlayer(
  candidates: readonly GkFallbackCandidate[],
): GkFallbackCandidate {
  const minEffective = candidates.reduce(
    (min, candidate) => Math.min(min, candidate.effectiveAbility),
    Infinity,
  );
  const tied = candidates.filter((candidate) => candidate.effectiveAbility === minEffective);
  return stableSortBy(tied, [{ get: (candidate) => candidate.playerId }])[0];
}

/**
 * D-22 ②→③→④ — 출전 중 선수 중 `goalkeeping` 최고 → 동률 시 유효능력 최저 → 그래도
 * 동률이면 `playerId` 기반 시드 결정론 추첨.
 */
function resolveFieldPlayerGoalkeeper(
  candidates: readonly GkFallbackCandidate[],
  matchSeed: MatchSeed,
  tick: MatchTick,
): { readonly player: GkFallbackCandidate; readonly resolvedBy: GkFallbackResolution } {
  // ② goalkeeping 능력치 최고.
  const maxGoalkeeping = candidates.reduce(
    (max, candidate) => Math.max(max, candidate.goalkeepingAbility),
    -Infinity,
  );
  const byGoalkeeping = candidates.filter(
    (candidate) => candidate.goalkeepingAbility === maxGoalkeeping,
  );
  if (byGoalkeeping.length === 1) {
    return { player: byGoalkeeping[0], resolvedBy: 'GOALKEEPING_ABILITY' };
  }

  // ③ 동률이면 유효 능력치 최저.
  const minEffective = byGoalkeeping.reduce(
    (min, candidate) => Math.min(min, candidate.effectiveAbility),
    Infinity,
  );
  const byEffective = byGoalkeeping.filter(
    (candidate) => candidate.effectiveAbility === minEffective,
  );
  if (byEffective.length === 1) {
    return { player: byEffective[0], resolvedBy: 'EFFECTIVE_ABILITY' };
  }

  // ④ 그래도 동률이면 player_id 기반 시드 결정론적 선택. 추첨 대상 순서 자체도
  // playerId 오름차순으로 먼저 고정해, 호출자가 candidates를 어떤 순서로 넘기든
  // 동일 시드에서 동일 인덱스가 동일 선수를 가리킨다(NFR-DT-008 순서 비의존).
  const ordered = stableSortBy(byEffective, [{ get: (candidate) => candidate.playerId }]);
  const seed = deriveEventSeed(matchSeed, tick.tick, GK_FALLBACK_TIEBREAK_EVENT_INDEX);
  const state = stateForSeed(seed);
  const draw = nextIntBelow(state, ordered.length);
  return { player: ordered[draw.value], resolvedBy: 'SEED_DRAW' };
}

/**
 * D-22 절차 전체를 진행해 GK 대체 결과를 확정한다.
 *
 * 순서: `benchGoalkeeperId`가 있으면 먼저 ①(벤치 GK 투입)을 시도하고, `applySubstitution`이
 * 승인하면 즉시 `BENCH_GOALKEEPER_SUBSTITUTION`으로 반환한다. 벤치 GK가 없거나, 있어도
 * 교체 카드/창이 소진돼 거부되면 ②→③→④(`resolveFieldPlayerGoalkeeper`)로 넘어가
 * `FIELD_PLAYER_REASSIGNMENT`를 반환한다.
 *
 * @throws `onFieldOutfieldPlayers`가 비어 있으면(선정 대상 자체가 없음) 오류.
 * @throws ① 시도가 `PLAYER_ALREADY_SUBSTITUTED_OFF`로 거부되면 오류 — 이는 교체
 *   카드/창 소진이 아니라 호출자가 이미 필드를 떠난 선수를 후보로 넘긴 데이터 오류이므로,
 *   조용히 ②로 폴백하지 않고 즉시 드러낸다(`sort.ts`/`precision.ts`/`penalty.ts`가 공유하는
 *   이 프로젝트의 fail-fast 관례와 동일).
 */
export function resolveGkFallback(options: ResolveGkFallbackOptions): GkFallbackResult {
  const {
    matchSeed,
    tick,
    teamId,
    substitutionState,
    benchGoalkeeperId,
    onFieldOutfieldPlayers,
    sequence,
    crossPositionModifier: injectedCrossPositionModifier,
  } = options;

  // 주입 여부(출처)는 기본값을 적용하기 *전에* 판별해야 한다 — 기본값 적용 후에는
  // "생략돼서 기본값이 된 것"과 "우연히 기본값과 같은 값을 주입한 것"을 구분할 수 없다.
  const crossPositionModifierSource: GkCrossPositionModifierSource =
    injectedCrossPositionModifier === undefined ? 'DEFAULT' : 'INJECTED';
  const resolvedCrossPositionModifier =
    injectedCrossPositionModifier ?? GK_CROSS_POSITION_MODIFIER_DEFAULT;

  if (onFieldOutfieldPlayers.length === 0) {
    throw new RangeError(
      'resolveGkFallback: onFieldOutfieldPlayers는 최소 1명 이상이어야 합니다(선정 대상 없음).',
    );
  }

  if (benchGoalkeeperId !== null) {
    const weakest = selectWeakestOutfieldPlayer(onFieldOutfieldPlayers);
    const attempt: SubstitutionAttempt = {
      tick,
      teamId,
      playerOffId: weakest.playerId,
      playerOnId: benchGoalkeeperId,
    };
    const substitution = applySubstitution(substitutionState, attempt, sequence);

    if (substitution.accepted) {
      return {
        method: 'BENCH_GOALKEEPER_SUBSTITUTION',
        goalkeeperPlayerId: benchGoalkeeperId,
        substitution,
        crossPositionModifier: null,
        crossPositionModifierSource: null,
        resolvedBy: null,
      };
    }

    if (substitution.reason === 'PLAYER_ALREADY_SUBSTITUTED_OFF') {
      throw new RangeError(
        `resolveGkFallback: 교체 시도가 PLAYER_ALREADY_SUBSTITUTED_OFF로 거부되었습니다 ` +
          `(benchGoalkeeperId=${benchGoalkeeperId}, weakest outfield playerId=${weakest.playerId}). ` +
          '벤치 GK 또는 최저 유효능력 필드플레이어가 이미 교체 아웃된 상태입니다 — 호출자의 입력 데이터를 확인하십시오.',
      );
    }
    // reason이 SUBSTITUTION_LIMIT_REACHED 또는 WINDOW_LIMIT_REACHED — 교체 카드/창 소진(D-22 ②
    // 조건 "교체 소진")이므로 아래 필드플레이어 재배치로 폴백한다.
  }

  const { player, resolvedBy } = resolveFieldPlayerGoalkeeper(onFieldOutfieldPlayers, matchSeed, tick);
  return {
    method: 'FIELD_PLAYER_REASSIGNMENT',
    goalkeeperPlayerId: player.playerId,
    substitution: null,
    crossPositionModifier: resolvedCrossPositionModifier,
    crossPositionModifierSource,
    resolvedBy,
  };
}
