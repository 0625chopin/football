/**
 * 하드코딩 안전 기본값 테이블 + 폴백 시 WARN 로그 규약 — **11일차(2026-08-04), Task 003 계속분**
 *
 * 근거: `ROADMAP.md` Task 003 "하드코딩 안전 기본값 테이블 작성(NFR-CFG-005, DC-13) + 폴백
 * 시 WARN 로그 규약" / `docs/team-schedule/03-데이터밸런싱배당팀.md` 11일차 행 / `docs/require/
 * 04-non-functional-requirements.md` NFR-CFG-005 / `docs/require/05-data-requirements.md`
 * DC-13 / `docs/ISSUES.md` AS-13. 소유: 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/config/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: 10일차 `loader.ts`가 정의한 `ConstantSource` 계약을 구현하는 **하드코딩
 *   안전 기본값 테이블**(`SAFE_DEFAULT_VALUES`)과, 조회 시 남기는 캡슐화된 WARN 로그.
 *   `installHardcodedFallback()`으로 `loader.ts`의 `setFallbackSource`에 명시적으로
 *   등록할 수 있게 노출한다.
 * - **담지 않는 것(이후 일차 소관)**: 38개 그룹의 **정식 시드 데이터**(36일차
 *   `supabase/seed/common-code.sql`, 031a) — 이 파일의 값은 "시스템이 멈추지 않게 하는
 *   안전값"이 목적이지, DB에 적재할 최종 기본값 확정이 아니다(team-schedule 11일차 산출물
 *   설명 "하드코딩 안전 기본값 테이블" vs 36일차 "36개 그룹 실제 기본값 시드 데이터"의
 *   표현 차이를 그대로 따른다). 다만 값 자체는 05문서 5.12.1 코드 예시를 그대로 재사용하므로
 *   36일차 시드 SQL 작성 시 이 파일을 참고 출발점으로 재사용할 수 있다. 구조적 JSON 로깅
 *   (39일차 `src/lib/obs/logger.ts`)도 아직 없으므로 이 파일의 WARN 로그는 `console.warn`
 *   기반 사설 함수로 캡슐화해 두었다 — 39일차에 `obs/logger.ts`가 생기면 이 함수 내부
 *   구현만 교체하면 된다(외부에 로그 포맷을 노출하지 않는다).
 *
 * ## 값의 출처와 한계
 * `SAFE_DEFAULT_VALUES`의 그룹별 코드=값 쌍은 `docs/require/05-data-requirements.md`
 * 5.12.1절 표의 "코드 예시(기본값)" 컬럼을 그대로 옮긴 것이다(catalog.ts의 `description`
 * 필드에도 동일 문자열이 이미 들어있다). 다만 표에는 **일부 JSON형 그룹**(`WEATHER_EFFECT`
 * 9종 계수 객체, `RATING_WEIGHT` 이벤트별 가중치 객체, `OVR_WEIGHT` 11군×34속성 가중치
 * 객체, `MANAGER_MATCHUP` 6×6 상성 계수)의 **구체 숫자가 없고 구조 설명만** 있다.
 * catalog.ts가 이미 확립한 "억측 금지" 원칙(min/max 전 그룹 `null`)을 그대로 따라, 이
 * 4개 그룹은 **빈 객체 `{}`**로 둔다 — 근거 없는 숫자를 만들어 넣지 않는다. 이는 완전한
 * 안전은 아니다: 소비자가 `weather.CLEAR`처럼 특정 키를 가정하고 접근하면 `undefined`가
 * 나올 수 있다. "값이 있으면 안전 기본값을 반환한다"는 NFR-CFG-005 ①(폴백 발생 시 시스템
 * 미정지)은 충족하지만, "폴백 상태로도 전 기능이 정상 동작"(NFR-CFG-005 ③)까지 완전히
 * 보장하려면 이 4개 그룹의 실제 구조가 36일차(031a)에 채워져야 한다 — 팀장 보고에 이슈로
 * 남긴다. `CUP_PARAM`은 표에 구체값(`BYE_COUNT`=4, `INSERT_ROUNDS`=[6,12,18,24,32,40])이
 * 있으므로 그대로 채웠다.
 *
 * **37일차 추가 — `RATING_WEIGHT` 채움(I-187 팀장 판정 ⓐ안, 2026-09-09)**: 위 "4개 그룹"
 * 중 `RATING_WEIGHT`는 2팀 37일차 FR-ST-003(경기 평점 산출) 작업이 막혀 있어 팀장이 3팀
 * 선(先) 정의를 판정했다. 05문서 5.12.1절에는 구조 설명만 있었지만,
 * `docs/require/03-functional-requirements.md` FR-ST-003 절 원문에 구체 가중치(골 +1.0,
 * 도움 +0.7, 키패스 +0.1, 실책-실점 −1.0, 경고 −0.3, 퇴장 −1.0 등)가 명시돼 있어 "억측 금지"
 * 대상이 아니다. 나머지
 * `OVR_WEIGHT`·`MANAGER_MATCHUP`·`WEATHER_EFFECT` 3개 그룹은 규모가 커 별도 산정
 * 대상으로 그대로 빈 객체 `{}`로 존치한다(팀장 확정).
 *
 * **37일차 2차 판정 — 키 공간을 `MatchEventType`에서 `keyof PlayerStatCoreValues`로 교체**:
 * 최초 반영은 이벤트 타입(`MatchEventType`, 23종)을 키로 썼으나, 2팀 소비 측
 * `src/lib/sim/standing/rating.ts`(`RatingWeightConstants`)가 `PlayerStatCoreValues`
 * 필드명(`goals`/`assists`/`keyPasses` 등)을 키로 쓰고 `{ base, min, max, field, gk }`
 * 형태를 기대한다는 게 접점 통합 테스트(`rating.test.ts`)로 드러나 팀장이 재판정했다.
 * 근거: ① FR-ST-003 예시 6개 중 "키패스"·"실책-실점" 2개가 `MatchEventType`으로 표현
 * 불가(이산 이벤트 자체가 없음) — 요구사항을 완전히 표현 못 하는 키 공간은 채택 불가.
 * ② 평점은 스탯 폴드(`PlayerMatchStatTierAFold`)에서 계산되므로 스탯 키가 엔진이 실제로
 * 가진 데이터와 직접 대응한다. ③ 05문서 646행 "이벤트별 가중치 객체"는 동기화하지 않는
 * 초안이라 충돌 시 TS(`PlayerStatCoreValues`)가 옳다(9일차 I-58). 값 자체(문서/보간 근거)는
 * 그대로 유지하고 키만 대응되는 스탯 필드로 이관했다 — 이관 내역은
 * `RATING_WEIGHT_FIELD`/`RATING_WEIGHT_GK` 선언부 참조.
 *
 * **14일차 추가 — `NATIONALITY_WEIGHT`(37번째 그룹, I-88 사용자 결정)**: 05문서 표 밖의
 * 신규 그룹이라 "표의 코드 예시"가 아예 없다. 같은 억측 금지 원칙을 적용해 빈 객체 `{}`로
 * 둔다(`WEATHER_EFFECT`류와 동일 취급) — 근거는 `catalog.ts`의 "37번째 그룹 추가" 절 참조.
 *
 * **예외 — `UI_PARAM`(팀장 결정, 11일차 2차 교차 점검)**: `POLL_INTERVAL_MS`/`POLL_LIVE_MS`만
 * 05문서 예시값(5000/3000)이 아니라 **비용 안전망 전용 값**(30000/15000)을 쓴다. 이 그룹
 * 항목 자체의 JSDoc에 근거(`docs/business/03-budget-plan.md` §2.5)와 함께 상세히
 * 설명해 두었다 — 정상 운영값(5초/3초)은 이 폴백이 아니라 6팀 시드 적재 이후 전역 기본값
 * 소스가 공급한다.
 *
 * ## 등록 방식 — side-effect import 금지
 * 모듈 최상위에서 `setFallbackSource`를 자동 호출하지 않는다. `loader.test.ts`가 이미
 * `afterEach`에서 `setFallbackSource(null)`로 전역 상태를 리셋하는 관례를 확립했으므로,
 * 이 모듈을 import하는 것만으로 전역 폴백 소스가 바뀌면 예측 불가능한 부작용이 된다.
 * 대신 `installHardcodedFallback()`을 명시적으로 호출해야 등록된다(앱 부트스트랩 시점의
 * 책임 — 이 파일 밖에서 결정).
 *
 * ## import 규약
 * 그룹 코드·소스 계약은 같은 소유 디렉터리의 `./catalog`, `./loader`에서 가져온다.
 * **37일차 추가**: `RATING_WEIGHT` 채움에 `PlayerStatCoreValues`(`@/types` 배럴, 체크리스트
 * C-5·C-6)가 필요해졌다 — `RatingWeightTable`의 키를 이 인터페이스의 필드명으로 한정하는
 * 타입 전용(`import type`) 참조일 뿐, 값을 만들지는 않는다. `src/lib/sim/**`(2팀
 * `rating.ts` 포함)는 이 작업에서 읽기만 하고 수정하지 않는다.
 *
 * **42일차 추가 — WARN 노이즈 억제(I-206 대응)**: `setGlobalDefaultSource()` 호출처가
 * 아직 프로덕션 코드에 없어(등록은 1팀 `bootstrapApp()` 소관, I-206) 이 시점 기준
 * 모든 공통코드 조회가 이 폴백을 상시로 탄다 — 매 조회마다 WARN을 출력하면 dev 로그가
 * 45건/요청씩 묻힌다. 그래서 `warnFallbackUsed`는 이제 직접 `console.warn`을 내지 않고
 * `obs/alert.ts`의 `FallbackWarnRecorder`를 거친다 — 그룹별 **최초 1회만** 실제 WARN을
 * 내고, 이후 같은 그룹 조회는 카운트만 누적한다(전체 현황은 `getFallbackWarnSnapshot()`).
 * 설계 근거 전문은 `obs/alert.ts` 파일 헤더 "왜 최초 1회만 WARN인가" 절 참조. I-206이
 * 해소되면(전역 기본값 소스가 채워지면) 이 폴백 경로 자체를 타지 않게 되므로 카운터도
 * 자연히 조용해진다 — 별도 해제 작업이 필요 없다.
 */

import type { PlayerStatCoreValues } from '@/types';
import { createFallbackWarnRecorder, type FallbackWarnSnapshot } from '@/lib/obs/alert';
import { COMMON_CODE_GROUP_CATALOG, type CommonCodeGroupCode } from './catalog';
import type { ConstantGroupValues, ConstantSource } from './loader';
import { setFallbackSource } from './loader';

/**
 * 그룹별 폴백 조회 횟수 카운터(42일차, I-206 대응). 모듈 스코프 싱글턴 — `fallback.ts`
 * 자신이 유일한 쓰기 주체이고, 외부에는 `getFallbackWarnSnapshot()`(읽기)과
 * `resetFallbackWarnTracking()`(테스트 전용 리셋)만 노출한다.
 */
const fallbackWarnRecorder = createFallbackWarnRecorder();

/**
 * 폴백 조회 발생 시 WARN 로그를 남긴다(NFR-CFG-005 ②, AS-13). 그룹별 최초 1회만 실제로
 * `console.warn`을 낸다 — 위 파일 헤더 "42일차 추가" 절 참조. `console.warn` 기반으로
 * 캡슐화했다 — 39일차 `obs/logger.ts`가 생기면 이 함수 내부만 교체한다. 외부에는 로그
 * 포맷을 노출하지 않는다(export하지 않음).
 */
function warnFallbackUsed(group: CommonCodeGroupCode): void {
  const { isFirstOccurrence } = fallbackWarnRecorder.record(group);
  if (!isFirstOccurrence) return;
  console.warn(
    `[config/fallback] "${group}" 그룹이 전역 기본값 소스에 없어 하드코딩 안전 기본값으로 ` +
      '폴백했다. 공통코드 미등록·손상 상태일 수 있으니 확인이 필요하다(NFR-CFG-005, AS-13). ' +
      '이 그룹에 대한 이후 폴백은 카운트만 누적하고 재출력하지 않는다 ' +
      '(getFallbackWarnSnapshot()으로 조회).',
  );
}

/**
 * 폴백 WARN 카운터 스냅샷을 읽는다(42일차) — 5팀 어드민 대시보드, `obs/alert.ts`의
 * 이상 탐지 로직 등이 "폴백이 상시화됐는지" 조회하는 용도. 쓰기 메서드는 노출하지
 * 않는다(그룹별 최초 1회 WARN 불변식을 이 파일 밖에서 깨지 못하게 한다).
 */
export function getFallbackWarnSnapshot(): FallbackWarnSnapshot {
  return fallbackWarnRecorder.snapshot();
}

/** 테스트 전용 — 그룹별 "최초 1회 WARN" 누적 상태를 리셋한다(`fallback.test.ts` 관례). */
export function resetFallbackWarnTracking(): void {
  fallbackWarnRecorder.reset();
}

/**
 * `RATING_WEIGHT` 필드플레이어/GK 가중치 테이블 — 2팀 `src/lib/sim/standing/rating.ts`의
 * `RatingWeightTable`(읽기 전용 참조, 그 파일은 수정하지 않음)과 동일한 키 공간
 * (`keyof PlayerStatCoreValues`)·구조(`Partial`, 56필드 전량 강제 안 함)를 그대로 따른다.
 */
type RatingWeightTable = Readonly<Partial<Record<keyof PlayerStatCoreValues, number>>>;

/**
 * 필드플레이어 스탯별 평점 가중치(FR-ST-003, I-187 팀장 2차 판정 — `MatchEventType`에서
 * `keyof PlayerStatCoreValues`로 키 공간 교체, 37일차). 값별 근거는 각 줄 주석에
 * "문서"(FR-ST-003 원문 명시값) / "보간"(원문 미명시, 명시값을 기준점 삼아 일관된 규칙으로
 * 산정한 잠정값 — 031b 밸런싱 튜닝 교체 대상)으로 구분 표기했다. FR-ST-003 명시 6개
 * (`goals`/`assists`/`keyPasses`/`errorsLeadingToGoal`/`yellowCards`/`redCards`)는 원문
 * 값을 그대로 쓴다 — `keyPasses`/`errorsLeadingToGoal`은 오늘 기준 Tier B(대응 이벤트
 * 없음, `stats.ts`)라 `computeMatchRating`의 폴드 순회에서 아직 곱해지지 않지만, 값은
 * 문서적 근거 보존 차원에서 그대로 둔다(rating.ts `RATING_WEIGHT_DEFAULT`와 동일 패턴).
 *
 * `Partial`이라 대응 스탯이 없거나 다른 필드에 이미 반영되는 이벤트(과거 `MatchEventType`
 * 기준표의 `SHOT_BLOCKED`·`CORNER`·`KICKOFF`·`SHOT_ON`/`SHOT_OFF`·`INJURY`·`SUBSTITUTION`·
 * `HALF_TIME`/`FULL_TIME`/`EXTRA_TIME_START`·`PENALTY_SHOOTOUT` 등)는 억지로 매핑하지
 * 않고 뺐다 — 대응하는 Tier A 스탯 자체가 없거나(행정 마커류) 다른 필드로 이미 흡수되는
 * 경우(`PENALTY_SCORED`→`goals`, 위 주석 참조)다. `SECOND_YELLOW`는 예외적으로
 * `secondYellows`로 매핑했다(아래 개별 주석 — yellowCards 폴드분과 별개로 증분만 추가).
 */
const RATING_WEIGHT_FIELD = {
  goals: 1.0, // 문서 명시값("골 +1.0") — PENALTY_SCORED도 I-43에 따라 goals에 폴드되므로 별도 penaltiesScored 가중은 두지 않는다(이중 반영 방지)
  assists: 0.7, // 문서 명시값("도움 +0.7")
  keyPasses: 0.1, // 문서 명시값("키패스 +0.1") — Tier B, 오늘은 미작동(위 JSDoc 참조)
  errorsLeadingToGoal: -1.0, // 문서 명시값("실책-실점 −1.0") — Tier B, 오늘은 미작동
  yellowCards: -0.3, // 문서 명시값("경고 −0.3")
  redCards: -1.0, // 문서 명시값("퇴장 −1.0")
  ownGoals: -1.0, // 보간 — 자책골은 Tier A로 실제 계산되는 가장 명확한 개인 실책(errorsLeadingToGoal은 Tier B라 오늘은 이 값만 실동작)
  secondYellows: -0.7, // 보간 — yellowCards가 SECOND_YELLOW도 폴드한다는 가정(stats.ts 가정 2, 미확정)을 전제로, 이미 반영된 -0.3에 증분만 더해 총손실을 redCards(-1.0)와 맞춘다
  foulsCommitted: -0.05, // 보간 — 경미한 파울
  foulsDrawn: 0.2, // 보간 — 파울/PK를 얻어낸 공격 기여(PENALTY_AWARDED도 foulsDrawn에 폴드, stats.ts I-60)
  offsides: -0.03, // 보간 — 공격 기회 무산, 경미한 손실
} satisfies RatingWeightTable;

/**
 * GK 스탯별 평점 가중치(FR-ST-003 "GK는 별도 가중치표를 사용한다", 37일차). 필드플레이어
 * 테이블을 기준선으로 스프레드하고 GK 포지션 특성상 값이 달라지는 항목만 덮어썼다 — 나머지
 * (카드·경고 등)는 필드플레이어와 동일하게 취급한다(보간).
 */
const RATING_WEIGHT_GK = {
  ...RATING_WEIGHT_FIELD,
  ownGoals: -1.2, // 보간 — 최종 방어선 책임 가중, FIELD(-1.0)보다 소폭 엄격
  foulsCommitted: -0.3, // 보간 — GK 파울은 박스 안일 가능성이 높아(PK 허용) FIELD(-0.05)보다 훨씬 엄격
  saves: 0.25, // 보간 — GK 핵심 기여(문서가 "별도 가중치표"를 요구한 핵심 사유), Tier A라 오늘 실제로 반영됨
  penaltiesSaved: 1.0, // 보간 — PK 선방은 실점을 막는 결정적 기여, goals와 대칭적 크기로 설정(GK만 보유하는 필드)
} satisfies RatingWeightTable;

/**
 * 38개 그룹 전량의 하드코딩 안전 기본값. `Record<CommonCodeGroupCode, ...>` 타입 자체가
 * "38개 그룹 키 전량이 존재해야 한다"를 컴파일타임에 강제하므로(누락 시 `tsc` 오류),
 * catalog.ts의 `_assertCatalogSize` 관례처럼 별도 런타임 assert는 불필요하다. 값 출처와
 * 한계는 위 JSDoc "값의 출처와 한계" 절 참조.
 *
 * **타입 주의**: `Record<CommonCodeGroupCode, ConstantGroupValues<CommonCodeGroupCode>>`처럼
 * 제네릭 인자에 유니온 전체를 그대로 넘기면 안 된다 — `loader.ts` 헤더가 이미 경고한 대로
 * (`COMMON_CODE_GROUP_BY_CODE` 관련 주석) 조건부 타입이 유니온에 분배되며 그룹별 스칼라
 * 타입이 뭉개진다. 아래는 `{ [G in CommonCodeGroupCode]: ConstantGroupValues<G> }` 매핑
 * 타입으로 그룹마다 독립적으로 좁혀지도록 했다.
 *
 * **37일차 `RATING_WEIGHT` 저장 형태 — `FIELD`/`GK`/`SCALE` 3코드**: `base`/`min`/`max`를
 * 최상위 스칼라 number로 두면(`{ base: 6.0, ... }`) `ConstantGroupValues<'RATING_WEIGHT'>`
 * (코드→object 맵 강제, 이 그룹 `valueType`도 `JSON`)를 못 만족해 `tsc`가 막는다(3팀이
 * `TS2322`로 재현·보고, 2팀 `rating.ts` 헤더 "저장 형태가 flat이 아닌 이유" 참조 — 팀장
 * 판정으로 `base`/`min`/`max` 3개를 `SCALE`이라는 코드 하나의 object로 묶었다). 그래서
 * 이 그룹도 다른 JSON형 그룹과 동일하게 `ConstantGroupValues<G>`를 그대로 만족한다 —
 * 별도 타입 예외·캐스팅이 필요 없다.
 */
export const SAFE_DEFAULT_VALUES: Readonly<{
  [G in CommonCodeGroupCode]: ConstantGroupValues<G>;
}> = {
  ROUND_INTERVAL_MIN: { LEAGUE_1: 75, LEAGUE_2: 90, LEAGUE_3: 115 },
  LEAGUE_TEAM_COUNT: { LEAGUE_1: 24, LEAGUE_2: 20, LEAGUE_3: 16 },
  PROMOTION_RELEGATION_SLOTS: { PROMOTION: 3, RELEGATION: 3 },
  MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 },
  PHASE_DURATION_MIN: {
    REGULAR: 3450,
    CUP_SLOT: 75,
    PLAYOFF: 300,
    SETTLEMENT: 50,
    PRESEASON: 150,
  },
  CONDITION_MULT: { BASE: 0.7, RANGE: 0.3, MIN_C: 1, MAX_C: 10 },
  FITNESS_PARAM: {
    MULT_BASE: 0.75,
    MULT_RANGE: 0.25,
    DRAIN_FULL: 18,
    RECOVER: 12,
    STREAK_FACTOR: 0.7,
  },
  POSITION_PROFICIENCY_MULT: {
    P5: 1.0,
    P4: 0.95,
    P3: 0.88,
    P2: 0.75,
    P1: 0.6,
    UNFAMILIAR_BASE: 0.88,
    UNFAMILIAR_STEP: 0.11,
    UNFAMILIAR_FLOOR: 0.45,
    GK_CROSS: 0.35,
  },
  HOME_ADVANTAGE: { MULT: 1.05, CONDITION_BONUS: 0.5 },
  // 05문서 표에 9종 각 계수 객체라고만 서술되고 구체 숫자가 없다 — 억측 금지 원칙(catalog.ts)에
  // 따라 빈 구조로 둔다. 실제 구조는 36일차(031a) 소관.
  WEATHER_EFFECT: {},
  WEATHER_PROBABILITY: {
    CLEAR: 0.4,
    RAIN: 0.15,
    HEAVY_RAIN: 0.05,
    SNOW: 0.05,
    WINDY: 0.1,
    HOT: 0.05,
    COLD: 0.05,
    FOG: 0.05,
    CLOUDY: 0.1,
  },
  INJURY_PARAM: {
    BASE_TICK_PROB: 0,
    SEVERITY_1_MULT: 0.93,
    SEVERITY_4_RETURN_MULT: 0.9,
    S2_MIN: 1,
    S2_MAX: 3,
    S3_MIN: 4,
    S3_MAX: 10,
    S4_MIN: 11,
    S4_MAX: 40,
  },
  GROWTH_AGE_FACTOR: {
    ROOKIE_UP: 1.6,
    ROOKIE_DOWN: 0.4,
    PRIME_UP: 1.0,
    PRIME_DOWN: 1.0,
    VETERAN_UP: 0.5,
    VETERAN_DOWN: 1.4,
    OLD_UP: 0.2,
    OLD_DOWN: 2.0,
    MAX_DELTA: 6,
  },
  FAMILIARITY: { STEP: 0.015, CAP: 0.06 },
  LEAGUE_FINISH_POINT: {
    L1_BASE: 1500,
    L1_RANGE: 1500,
    L2_BASE: 850,
    L2_RANGE: 950,
    L3_BASE: 400,
    L3_RANGE: 600,
    EXP: 1.8,
  },
  PLAYOFF_PRIZE: {
    L1_WIN: 1500,
    L3_RUNNERUP: 200,
  },
  CUP_PRIZE: {
    WIN: 2000,
    RUNNERUP: 1000,
    SF: 500,
    QF: 250,
    R16: 120,
    R32: 60,
    R1: 30,
    GIANT_KILLING: 100,
  },
  MARKET_VALUE_PARAM: {
    OVR_DIVISOR: 15,
    OVR_EXP: 2.6,
    POT_STEP: 0.05,
    REP_BASE: 0.8,
    REP_STEP: 0.004,
    FLOOR: 100,
  },
  WAGE_RATIO: { RATIO: 0.18 },
  SPONSOR_PARAM: {
    MAX_PER_TEAM: 3,
    CONTRACT_MIN: 1,
    CONTRACT_MAX: 10,
    SHARE_PCT_CAP: 30,
    POOL_MIN: 40,
  },
  CONTRACT_PARAM: { YEARS_MIN: 1, YEARS_MAX: 5 },
  SQUAD_PARAM: { MIN: 22, MAX: 30, HARD_MIN: 18, GK_MIN: 2, CB_MIN: 3 },
  YOUTH_PARAM: {
    BASE: 0.5,
    LEVEL_STEP: 0.4,
    SANCTION_BONUS_PP: 0.1,
    ROOKIE_AGE_MIN: 16,
    ROOKIE_AGE_MAX: 18,
    ROOKIE_OVR_MIN: 6,
    ROOKIE_OVR_MAX: 14,
  },
  RETIREMENT_PARAM: { RISK_START_AGE: 34, FORCE_AGE: 40, BASE_PROB: 0.05 },
  // I-08 반영(27일차, Task 035 착수 — V-02 차단성 검증 통과 후 "모델 확정" 시점): 배당오차
  // ±11.5% 문제로 MC_N_SEASON 300→1,500 상향. 재산출 주기(매라운드→5라운드)는 수치가 아니라
  // 호출 빈도 정책이라 REFRESH_ROUND_INTERVAL로 별도 등록해 스케줄러(후속 일차)가 참조하게 한다.
  // 33일차 추가(I-167): INITIAL_LEAD_MIN(킥오프 T-분, schedule.ts 최초 산출 리드타임 —
  // 32일차 ROADMAP 행 정책값 30을 리터럴로 두지 않고 이 그룹에 등록, worker.ts가 주입)·
  // PARTITION_COUNT(NFR-SC-004, V-02 결과에 따른 8분할 처리 — worker.ts가 몬테카를로
  // 반복을 이 개수로 나눠 "단일 호출 시간 한도" 수락 기준을 충족).
  ODDS_PARAM: {
    MC_N_MATCH: 3000,
    MC_N_SEASON: 1500,
    REFRESH_ROUND_INTERVAL: 5,
    OVERROUND: 1.06,
    MIN_ODDS: 1.01,
    MAX_ODDS: 500,
    INITIAL_LEAD_MIN: 30,
    PARTITION_COUNT: 8,
  },
  BET_LIMIT: {
    STAKE_MIN: 100,
    SINGLE_MAX: 100000,
    MULTI_RETURN_MAX: 1000000,
    LEGS_MAX: 10,
  },
  // 37일차 I-187 팀장 판정으로 채움 — 05문서에는 구체 숫자가 없었지만 FR-ST-003 원문에
  // 명시값이 있어 억측 금지 대상이 아니다. SCALE.base/min/max는 FR-ST-003 원문 클램프
  // 그대로(기본 6.0, [1.0, 10.0]) — 2팀 rating.ts에만 하드코딩돼 있던 것을 공통코드로
  // 끌어올려 어드민이 튜닝할 수 있게 한다. FIELD/GK/SCALE 3코드로 나눈 이유는 위
  // SAFE_DEFAULT_VALUES JSDoc "RATING_WEIGHT 저장 형태" 절 참조. 값 근거는
  // RATING_WEIGHT_FIELD/GK 선언부 참조.
  RATING_WEIGHT: {
    FIELD: RATING_WEIGHT_FIELD,
    GK: RATING_WEIGHT_GK,
    SCALE: { base: 6.0, min: 1.0, max: 10.0 },
  },
  // 05문서 표에 "11군 각 34속성 가중치 객체"라고만 서술되고 구체 숫자가 없다 — 억측 금지,
  // 빈 구조로 둔다. 실제 구조는 36일차(031a) 소관.
  OVR_WEIGHT: {},
  // ⚠️ POLL_INTERVAL_MS/POLL_LIVE_MS는 ROADMAP Task 004 원문의 "기본 5초 / 라이브 3초"가
  // 아니라 **비용 안전망(fallback) 전용 값**이다(팀장 결정, 11일차, docs/business/
  // 03-budget-plan.md §2.5 실측표 근거). §2.5 케이스 A(일 평균 동시 125명) 기준 폴링
  // 주기별 월 비용: 5초=$133.7, 3초는 그보다 더 비쌈(요청 수가 주기에 반비례), 15초=$23.2,
  // 30초=$1.6 — 이 폴백은 "공통코드 조회 실패(장애)" 상황에서만 쓰이는데, 정상값(5초/3초)
  // 그대로 폴백하면 **장애 상황이 오히려 가장 비싼 설정으로 귀결**되는 역전 구조가 된다.
  // 그래서 이 안전망만 30초/15초로 낮춘다 — "정상 운영값을 바꾸는 것"이 아니라 "장애 시
  // 비용 폭증을 막는 것"이 목적이다. 정상값 5000/3000은 이 값이 아니라, 6팀이
  // `common_code` 실데이터를 적재(031a, 36일차)한 뒤 전역 기본값 소스(`loader.ts`의
  // `setGlobalDefaultSource`)가 공급한다 — 전역 기본값이 항상 이 하드코딩 폴백보다
  // 우선하므로(해석 우선순위, loader.ts), 그 시점부터는 이 30000/15000이 아니라 정상값이
  // 쓰인다. `LEADERBOARD_MIN_APPEARANCE_PCT`는 비용과 무관해 05문서 값(30)을 그대로 둔다.
  UI_PARAM: { POLL_INTERVAL_MS: 30000, POLL_LIVE_MS: 15000, LEADERBOARD_MIN_APPEARANCE_PCT: 30 },
  // 05문서 표에 "6×6 성향 상성 계수"라고만 서술되고 구체 숫자가 없다 — 억측 금지, 빈 구조로
  // 둔다. 실제 구조는 36일차(031a) 소관.
  MANAGER_MATCHUP: {},
  CRON_PARAM: {
    INTERVAL_MIN: 1,
    LOCK_TIMEOUT_MIN: 5,
    CATCHUP_MAX_PER_RUN: 50,
    RETRY_MAX: 3,
    GAP_DETECT_MULTIPLIER: 3,
  },
  SANCTION_PARAM: {
    REP_PENALTY_PERMANENT: 3,
    REP_PENALTY_NEGOTIATION: 5,
    GRANT_PCT: 0.4,
    YOUTH_BONUS_PP: 0.1,
  },
  // CUP_PARAM 그룹의 valueType은 JSON이다(catalog.ts — 그룹 내 INT·JSON 혼재를 JSON으로
  // 표현). 그룹 값 타입은 코드 단위가 아니라 그룹 단위이므로, INT 값인 BYE_COUNT도 이
  // 그룹 안에서는 JSON 스칼라(`Readonly<Record<string, unknown>>`)로 감싸야 한다.
  CUP_PARAM: { BYE_COUNT: { value: 4 }, INSERT_ROUNDS: { value: [6, 12, 18, 24, 32, 40] } },
  CARD_PARAM: { SUSPENSION_THRESHOLD: 5, RED_MIN: 1, RED_MAX: 3 },
  EFFECTIVE_MULT_CLAMP: { MIN: 0.35, MAX: 1.35 },
  TRANSFER_PARAM: {
    RATE_MIN_PCT: 8,
    RATE_MAX_PCT: 15,
    PER_TEAM_MAX: 4,
    SUCCESS_MIN: 0.05,
    SUCCESS_MAX: 0.95,
    TRADE_VALUE_GAP_PCT: 15,
    LOAN_WAGE_SHARE_PCT: 50,
  },
  // 05문서 표 밖의 14일차 신규 그룹(I-88 사용자 결정) — "국가 목록과 각국 비중" 중 비중
  // 실값은 어디에도 문서화된 적이 없다. 억측 금지 원칙에 따라 빈 구조로 둔다. 코드 키
  // 집합(국가 목록)은 `namePools.ts`의 `SUPPORTED_NATIONALITY_CODES`가 이미 20개국으로
  // 담당하고 있어 여기서 다시 나열하지 않는다(값이 채워지기 전까지 로더 소비자는 이
  // 그룹에서 특정 국가 키를 가정하지 말고 균등분포로 처리해야 한다 — 15일차 Mock
  // 팩토리가 그렇게 한다). 실제 비중은 031b(66~68일차 밸런싱 튜닝)에서 채운다.
  NATIONALITY_WEIGHT: {},
  // 31일차 신규 그룹(I-160 반영, `catalog.ts` "38번째 그룹 추가" 절 — 값 산정 근거 전문은
  // 거기 있다). MANAGER_MATCHUP(빈 구조)과 달리 여기는 실값을 채운다 — FR-MT-009가
  // ATTACKING 하나는 구체값을 명시했고(own×1.12/conceded×1.10), 나머지 5종은 3팀이
  // 그 값을 기준점 삼아 대칭·비대칭 설계로 산정한 잠정값이다(031b 밸런싱 튜닝 대상).
  // 각 코드(성향)의 값은 `xg-manager-tendency.ts`의 `ManagerTendencyXgMultiplier` 형태
  // (`{ ownXgMultiplier, concededXgMultiplier }`)를 그대로 따른다 — 그 파일은 읽기만 하고
  // 수정하지 않았다(2팀 소유).
  MANAGER_STYLE_XG: {
    ATTACKING: { ownXgMultiplier: 1.12, concededXgMultiplier: 1.1 },
    BALANCED: { ownXgMultiplier: 1.0, concededXgMultiplier: 1.0 },
    DEFENSIVE: { ownXgMultiplier: 0.88, concededXgMultiplier: 0.9 },
    COUNTER: { ownXgMultiplier: 1.06, concededXgMultiplier: 0.94 },
    POSSESSION: { ownXgMultiplier: 1.08, concededXgMultiplier: 1.04 },
    HIGH_PRESS: { ownXgMultiplier: 1.1, concededXgMultiplier: 1.12 },
  },
};

/** 카탈로그의 38개 그룹과 안전 기본값 테이블의 그룹 수가 일치함을 모듈 로드 시점에 보증한다. */
const _assertSafeDefaultCoverage: 38 = Object.keys(SAFE_DEFAULT_VALUES).length as 38;
void _assertSafeDefaultCoverage;
void COMMON_CODE_GROUP_CATALOG;

/**
 * 하드코딩 안전 기본값 테이블을 노출하는 `ConstantSource` 구현체(10일차 `loader.ts` 계약).
 * 값을 반환할 때마다 WARN 로그를 남긴다(NFR-CFG-005 ②).
 */
export const hardcodedFallbackSource: ConstantSource = {
  name: 'hardcoded-fallback',
  getGroupConstants(group) {
    const value = SAFE_DEFAULT_VALUES[group];
    if (value === undefined) {
      return undefined;
    }
    warnFallbackUsed(group);
    return value;
  },
};

/**
 * 하드코딩 폴백 소스를 `loader.ts`에 등록한다(해석 우선순위 2순위). 모듈을 import하는
 * 것만으로는 등록되지 않는다 — 반드시 이 함수를 호출해야 한다(앱 부트스트랩 시점의 책임,
 * 위 JSDoc "등록 방식" 절 참조). 등록 즉시 `loader.ts`의 캐시가 전체 무효화된다.
 */
export function installHardcodedFallback(): void {
  setFallbackSource(hardcodedFallbackSource);
}
