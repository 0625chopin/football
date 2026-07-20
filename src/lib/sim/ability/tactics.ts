/**
 * `src/lib/sim/ability/tactics.ts`
 *
 * Task 024(20일차) — 날씨 계수(`M_weather`, FR-MT-006)·감독 성향 계수(`M_manager`,
 * FR-MT-009, 6×6 상성 매트릭스 포함)를 이 파일로 분리한다. `modifiers.ts`의 두 스텁
 * (`weatherModifier`/`managerModifier`)을 대체하며, 그 파일에는 두지 않는다.
 *
 * ## `modifiers.ts` 잔류 vs 파일 분리 — 20일차 판단(오늘 결정, 19일차 인계 지시에 따른 재판단)
 * 19일차 `position.ts` 분리 판단(그래프 BFS 복잡도)은 **자동 승계되지 않는다** — 날씨·감독은
 * `position.ts`처럼 그래프 순회가 필요 없는 각각 "단일 매트릭스 룩업"이라 그 근거를 그대로
 * 재사용할 수 없다. 그래서 오늘 독립적으로 판단했고, 결론은 **분리한다**이며 근거는 다음과
 * 같다(복잡도가 아니라 **의존 축**이 다르다는 것이 핵심 근거):
 * ① `modifiers.ts`(17~19일차 컨디션·피로·캐미)는 `@/types` 외 어떤 모듈도 import하지 않는
 *    순수 수식 3종이었다. 반면 이 파일의 두 함수는 **`@/lib/config/loader`(3팀 소유,
 *    공통코드 로더)에 의존**한다 — 19일차까지 `ability/**`에 없던 새 의존 축이다. 이 의존을
 *    `modifiers.ts`에 섞으면 그 파일이 지켜온 "순수 수식만 담는다"는 성질이 깨진다.
 * ② 19일차 인계 사항대로, `POSITION_PROFICIENCY_MULT`(P5~P1 등)는 FR-PL-006/05문서에
 *    **구체 숫자가 이미 명시**돼 있어 `position.ts`처럼 안전 기본값 상수를 그대로 선언할 수
 *    있었다. 반대로 `WEATHER_EFFECT`/`MANAGER_MATCHUP`은 `src/lib/config/fallback.ts`
 *    헤더가 명시하듯 **구체 숫자도 JSON 내부 구조도 아직 결정되지 않았다**("억측 금지" 원칙,
 *    36일차/031a 소관) — 그래서 이 두 계수는 안전 기본값을 새로 선언할 근거 자체가 없고,
 *    반드시 로더를 거쳐야 한다("코드 로더 경유 구조만 갖추고 리터럴은 쓰지 마세요", 팀장
 *    20일차 지시). 이 점이 `position.ts`와 근본적으로 다른 지점이라 그 판단을 승계하지 않고
 *    새로 분리 결론을 냈다.
 * ③ `managerModifier`는 17~19일차 스텁(`ManagerModifierInput { style }`)에 없던
 *    `opponentStyle` 필드가 6×6 상성 매트릭스 판정에 반드시 필요하다 — 시그니처 자체가
 *    바뀌므로, 기존 스텁이 있던 자리에 그대로 덮어쓰기보다 새 파일에서 새 계약으로 여는
 *    편이 "무엇이 바뀌었는지"를 더 분명히 한다.
 *
 * ## 로더 소비 방식 — "오케스트레이션 주입 우선, 직접 호출은 기본값" (I-83 패턴의 확장)
 * `position.ts`/`modifiers.ts`의 I-83 패턴("안전 기본값 export + 선택적 override")은 안전
 * 기본값이 있다는 전제가 있었다. 이 파일은 안전 기본값이 없으므로 대신 **"override 테이블이
 * 없으면 `loadConstants(group)`을 직접 호출한다"**로 그 패턴을 확장했다 — `options?.
 * weatherEffectTable`/`options?.matchupTable`을 주면 그 값을 그대로 쓰고(테스트·오케스트레이션
 * 계층이 스냅샷을 미리 캡처해 결정론을 보장하려는 경우), 주지 않으면 로더 캐시를 직접
 * 조회한다. `loadConstants` 자체는 `Math.random()`/`Date.now()`/`react`/`@supabase/*`를
 * 쓰지 않는 순수 캐시 조회이므로(NFR-DT-001 위반 아님) 직접 호출이 허용된다 — 이미 `src/lib/
 * data/mock/MockDataSource.ts` 등 다른 레이어도 동일하게 직접 호출한다.
 *
 * ## `ConstantSourceUnavailableError`를 여기서 삼키지 않는 이유
 * 전역 기본값 소스도 하드코딩 폴백 소스도 등록되지 않은 상태(`loader.ts`)에서
 * `loadConstants`는 명시적으로 에러를 던진다 — 이는 "앱 부트스트랩이 `installHardcodedFallback()`을
 * 호출했어야 한다"는 3팀의 의도된 fail-fast다. 이 파일이 그 에러를 잡아 조용히 중립값으로
 * 대체하면 부트스트랩 누락을 숨기게 되므로 그대로 전파한다. **오늘 실제로 중립값이 되는
 * 경우**는 폴백 소스는 등록됐지만(`installHardcodedFallback()` 호출됨) 그 안의
 * `WEATHER_EFFECT`/`MANAGER_MATCHUP`이 아직 빈 객체 `{}`라서(위 ② 참조) 특정 키를 못 찾는
 * 경우뿐이다 — 이건 AS-13(미등록·손상에도 시스템 미정지) 그대로다.
 *
 * ## 날씨 — `WEATHER_EFFECT[weather]`에서 읽는 키 (설계 메모, 팀 보고 대상)
 * FR-MT-006은 날씨별로 패스 성공률·실책 확률·기대득점·부상 확률·스태미나 소모·롱슛/크로스
 * 정확도 등 **여러 축**의 효과를 예시로 든다. 그러나 FR-MT-004 능력치 보정 체인의
 * `M_weather`는 **단일 스칼라**다. 저 여러 축 중 부상 확률·스태미나 소모·실책 확률·기대득점은
 * 각각 다른 서브시스템(부상 판정, 피로 소모, 이벤트 틱 확률, xG 계산 — 전부
 * `src/lib/sim/match/**` 영역이지 이 능력치 체인이 아니다) 소관으로 보인다. 그래서 이
 * 파일은 `WEATHER_EFFECT[weather]` JSON 객체 안에서 이 능력치 체인 전용 키
 * `ABILITY_MULT`(아래 상수)만 읽는다 — 나머지 축(패스 성공률 등)은 이 파일 밖의 소비자가
 * 같은 그룹에서 각자의 키로 읽으면 된다. **이 키 이름은 05문서에 명시되지 않아 이 파일이
 * 처음 정하는 값**이므로, 36일차(031a) 실제 시드 데이터 작성 시 이 키와 어긋나지 않도록
 * 정렬이 필요하다 — 팀장 보고에 이슈 후보로 남긴다.
 *
 * ## 감독 — 6×6 상성 매트릭스 표현
 * `MANAGER_MATCHUP`의 코드(그룹 내 키)를 **자기 성향**(`ManagerStyle` 6종)으로, 그 값(JSON
 * 객체)을 **상대 성향별 계수 맵**(다시 `ManagerStyle` 6종을 키로)으로 둔다 — 즉
 * `MANAGER_MATCHUP.COUNTER.POSSESSION`이 "COUNTER 감독이 POSSESSION 감독을 상대할 때"
 * 계수다. 6개 코드 × 코드당 6개 내부 키 = 6×6 전 쌍을 그대로 표현하며, 두 키 전부
 * `ManagerStyle`(이미 동결된 도메인 타입)이라 새 코드 집합을 발명하지 않는다.
 * FR-MT-009가 함께 정의하는 "전술 성향 자체의 xG 배율"과 "숙련도 실현율
 * (`0.6 + 0.4×(skill/30)`)"은 팀 단위 xG 조정 개념이라 개별 선수 능력치 체인(`M_manager`,
 * 이 파일의 스칼라 하나)과는 층위가 달라 여기서 다루지 않는다 — 매치 엔진 xG 계산 소관으로
 * 남겨 둔다(이 역시 팀장 보고 이슈 후보).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 타입은 `@/types`
 * 배럴로만 import(서브경로 금지). 공통코드 대상 숫자 리터럴 0건(check-literals 검사 대상) —
 * 이 파일에 등장하는 수는 전부 `NEUTRAL_MODIFIER`(1.0, 사소값이라 검사 제외 대상) 하나뿐이다.
 */

import type { ManagerStyle, Position, WeatherType } from '@/types';
import type { ConstantGroupValues } from '@/lib/config/loader';
import { loadConstants } from '@/lib/config/loader';
import { type AbilityModifierClampOptions, clampAbilityModifier, NEUTRAL_MODIFIER } from './modifiers';

type WeatherEffectTable = ConstantGroupValues<'WEATHER_EFFECT'>;
type ManagerMatchupTable = ConstantGroupValues<'MANAGER_MATCHUP'>;

/** `WEATHER_EFFECT[weather]` JSON 객체에서 이 능력치 체인이 읽는 전용 키 (파일 상단 "날씨" 절 참조) */
const WEATHER_ABILITY_MULT_KEY = 'ABILITY_MULT';

/** `weatherModifier` 입력 — `position`은 향후 포지션별 세분화 대비 예약 필드(오늘은 미사용, 파일 상단 참조) */
export interface WeatherModifierInput {
  readonly weather: WeatherType;
  readonly position: Position;
}

/** `weatherModifier` 오버라이드 — 미지정 시 `loadConstants('WEATHER_EFFECT')`를 직접 호출한다. */
export interface WeatherModifierOptions extends AbilityModifierClampOptions {
  readonly weatherEffectTable?: WeatherEffectTable;
}

function readAbilityMult(entry: Readonly<Record<string, unknown>> | undefined, key: string): number {
  const raw = entry?.[key];
  return typeof raw === 'number' ? raw : NEUTRAL_MODIFIER;
}

/**
 * 날씨 계수(`M_weather`, FR-MT-006). `WEATHER_EFFECT[weather].ABILITY_MULT`를 읽어 클램프한다.
 * 그룹에 해당 날씨 키가 없거나 `ABILITY_MULT`가 숫자가 아니면(오늘의 실제 상태 — 그룹이
 * 빈 객체 `{}`) `NEUTRAL_MODIFIER`(보정 없음)로 대체한다.
 */
export function weatherModifier(input: WeatherModifierInput, options?: WeatherModifierOptions): number {
  const table = options?.weatherEffectTable ?? loadConstants('WEATHER_EFFECT');
  const raw = readAbilityMult(table[input.weather], WEATHER_ABILITY_MULT_KEY);
  return clampAbilityModifier(raw, options);
}

/** `managerModifier` 입력 — 6×6 상성 판정에는 자기 성향과 상대 성향이 모두 필요하다. */
export interface ManagerModifierInput {
  readonly style: ManagerStyle;
  readonly opponentStyle: ManagerStyle;
}

/** `managerModifier` 오버라이드 — 미지정 시 `loadConstants('MANAGER_MATCHUP')`를 직접 호출한다. */
export interface ManagerModifierOptions extends AbilityModifierClampOptions {
  readonly matchupTable?: ManagerMatchupTable;
}

/**
 * 감독 성향 상성 계수(`M_manager`, FR-MT-009 6×6 매트릭스). `MANAGER_MATCHUP[style]
 * [opponentStyle]`을 읽어 클램프한다. 자기 성향 행이 없거나 상대 성향 열이 숫자가 아니면
 * (오늘의 실제 상태 — 그룹이 빈 객체 `{}`) `NEUTRAL_MODIFIER`(상성 없음)로 대체한다.
 */
export function managerModifier(input: ManagerModifierInput, options?: ManagerModifierOptions): number {
  const table = options?.matchupTable ?? loadConstants('MANAGER_MATCHUP');
  const row = table[input.style] as Readonly<Record<string, unknown>> | undefined;
  const raw = readAbilityMult(row, input.opponentStyle);
  return clampAbilityModifier(raw, options);
}
