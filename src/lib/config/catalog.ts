/**
 * 공통코드 그룹 카탈로그 — **37종 전량** (9일차 2026-07-31 착수, 14일차 2026-08-07 37번째
 * 그룹 추가, Task 003 착수분)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.12.1절 "공통코드 그룹 카탈로그(초기 시드)"
 * 표(#1 `ROUND_INTERVAL_MIN` ~ #36 `TRANSFER_PARAM`) + **#37 `NATIONALITY_WEIGHT`**(05문서
 * 표 밖, 14일차 신규 — 아래 "37번째 그룹 추가" 절 참조), ROADMAP.md Task 003.
 * 소유: 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/config/**`).
 *
 * ## 37번째 그룹 추가 — I-88 사용자 결정 (14일차, 2026-08-07)
 * 13일차 `namePools.ts`는 국적 이름 풀·비중을 05문서 5.12.1절 표(9일차 동결분, #1~#36)에
 * 자리가 없어 정적 TS 데이터로 구현했고, 이 괴리를 팀장 보고로 넘겼다(I-88). 3팀은
 * "정적 데이터 유지"를 권고했으나(`_assertCatalogSize`가 여러 팀 산출물에 박혀 있어 그룹
 * 추가 시 연쇄 재작업이 발생한다는 근거), **사용자가 D-17 파급① 원문("국가 목록과 각국
 * 비중은 공통코드로 관리")을 그대로 지키는 쪽으로 14일차에 최종 판단**했다 — 결정문을
 * 구현에 맞춰 정정하지 않고 구현을 결정문에 맞춘다는 취지(`docs/require/
 * 06-prioritization-and-risks.md`의 D-17 원문은 수정하지 않음). 그래서 37번째 그룹
 * `NATIONALITY_WEIGHT`를 추가한다 — 단 **이름 풀 데이터 자체(20개국 성/이름 후보군
 * 문자열)는 이 결정의 대상이 아니다.** D-17 파급①이 말하는 건 "국가 목록과 비중"이지
 * 이름 문자열 전체가 아니므로, `namePools.ts`의 이름 데이터는 계속 정적 TS로 남는다
 * (범위를 넓히지 않는다). "국가 목록"은 이 그룹의 code 키 집합(=
 * `SUPPORTED_NATIONALITY_CODES`와 동일)으로, "비중"은 코드별 `DECIMAL` 값으로 표현한다.
 * 실값은 어디에도 문서화된 적이 없어(I-88 "각국 비중은 아예 미구현") **억측 금지
 * 원칙에 따라 `fallback.ts`에 빈 구조로 둔다** — `WEATHER_EFFECT`(그룹#10) 선례와 동일.
 * 15일차 Mock 월드 팩토리는 이 그룹 값이 비어 있어도(또는 로더가 비어있는 값을 반환해도)
 * `SUPPORTED_NATIONALITY_CODES` 균등 랜덤 추첨으로 착수 가능 — 실측 비중은 031b(66~68일차
 * 밸런싱 튜닝)에서 채운다.
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: 그룹 메타데이터(정적 카탈로그)뿐이다 — `group_code`, 표시명, 설명, 값
 *   타입, 발효 정책, 관련 FR, 콘솔 표시 순서.
 * - **담지 않는 것**: 상수 로더(`loadConstants`)·그룹 단위 캐시·무효화 훅(10일차
 *   `loader.ts`), 하드코딩 안전 기본값·폴백 WARN 로그(11일차 `fallback.ts`), 발효 정책
 *   해석 함수(11일차 `policy.ts`), 스냅샷 직렬화·해시(12일차 `snapshot.ts`), 그룹별 실제
 *   `default_value` 시드 데이터(36일차 `supabase/seed/common-code.sql`), JSON 스키마
 *   검증(37일차 `schema.ts`)은 전부 이후 일차 소관이며 이 파일에서 다루지 않는다.
 *
 * ## 타입 재사용 원칙
 * `src/types/**`는 8일차(2026-07-30) 동결되었으므로 새 도메인 타입을 선언하지 않는다.
 * 이 파일의 `CommonCodeGroupCatalogEntry`는 신규 엔티티가 아니라 이미 정의된
 * **E-41 `CommonCodeGroup`**(`@/types`)에서 `Pick`으로 파생한 부분 뷰(view)다 — 카탈로그
 * 정의 시점에는 아직 존재하지 않는 DB 파생 필드(`isActive`/`createdAt`/`updatedAt`)만
 * 제외했다. import는 배럴(`@/types`)만 사용하고 서브경로(`@/types/config`) 직접 import는
 * 쓰지 않는다(체크리스트 C-5·C-6).
 *
 * ## `minValue`/`maxValue`/`jsonSchema`가 이 파일에 없는 이유 (13일차 이슈 배치, I-93)
 * 원래 이 3필드는 E-41 `CommonCodeGroup`(그룹 레벨, 그룹당 1쌍)에 있었다. 그러나 그룹
 * 내부 코드들의 자연스러운 유효 범위는 서로 판이하다(예: `SQUAD_PARAM.MIN`=22 vs
 * `GK_MIN`=2, `ROUND_INTERVAL_MIN.LEAGUE_1`=75 vs `LEAGUE_3`=115 — `CUP_PARAM.BYE_COUNT`
 * 스칼라 vs `INSERT_ROUNDS` 배열도 같은 문제) — 그룹 레벨 1쌍으로는 이걸 표현할 수 없다.
 * 13일차 1차 교차 점검(3팀·6팀이 각자 다른 사례로 독립 제기, 팀장 승인)에서 1팀이
 * **E-42 `CommonCode`(코드 레벨)로 이동**시켰다(`src/types/config.ts`). 그래서 그룹
 * 메타데이터만 담는 이 카탈로그에는 더 이상 이 3필드가 없다 — 실제 범위/스키마 값은
 * 코드 단위로, 37일차(`schema.ts`, NFR-CFG-004) 이후 그룹별로 점진 채워진다("실측
 * 근거 없이 범위를 추정하지 않는다"는 원칙은 여전히 유효하며, 오늘도 값을 채우지 않는다).
 *
 * ## value_type이 그룹 내에서 혼합된 항목(설계 메모 — 팀 보고 대상)
 * 05문서 표는 일부 그룹(`FITNESS_PARAM`·`INJURY_PARAM`·`SPONSOR_PARAM`·`ODDS_PARAM`·
 * `RETIREMENT_PARAM`·`SANCTION_PARAM`·`CUP_PARAM`·`TRANSFER_PARAM`)의 값 타입을
 * "DECIMAL/INT" 또는 "INT/JSON"처럼 **복수**로 표기한다. 그러나 E-41 `CommonCodeGroup.
 * valueType`은 그룹당 단일 enum(`INT`/`DECIMAL`/`STRING`/`BOOL`/`JSON`)이다(05:540, DB
 * CHECK 제약도 그룹 단위). 이 파일에서는 그룹 내 개별 코드가 모두 표현 가능한 **상위(superset)
 * 타입**을 그룹 값으로 선택했다 — 정수만 필요한 코드도 `DECIMAL`로 저장 가능하므로
 * `DECIMAL/INT` 조합은 `DECIMAL`을, 배열·객체가 섞인 `CUP_PARAM`(`INT/JSON`)은 `JSON`을
 * 채택했다. 이는 근거 문서의 표기 불일치이므로 `docs/ISSUES.md` 반영을 팀장 보고에
 * 포함한다(반영 편집은 1팀 코어·품질팀 소관).
 */

import type {
  CommonCodeApplyPolicy,
  CommonCodeGroup,
  CommonCodeValueType,
} from '@/types';

/**
 * 카탈로그 정의 시점에 알 수 있는 그룹 메타데이터만 골라낸 뷰.
 * `CommonCodeGroup`(E-41)의 부분집합이며 신규 도메인 타입이 아니다.
 * 제외한 필드(`isActive`/`createdAt`/`updatedAt`)는 DB 레코드 시점에만 존재하는
 * 값이라 정적 카탈로그 상수에는 부자연스럽다 — 로더(10일차)가 실제 조회 시 채운다.
 */
export type CommonCodeGroupCatalogEntry = Pick<
  CommonCodeGroup,
  | 'groupCode'
  | 'groupName'
  | 'description'
  | 'valueType'
  | 'applyPolicy'
  | 'relatedFr'
  | 'sortOrder'
>;

/**
 * 공통코드 그룹 카탈로그 37종 전량(05문서 5.12.1절 표 36종 + 14일차 신규 1종).
 * 근거: `docs/require/05-data-requirements.md` 5.12.1절 표(#1~#36). `sortOrder`는 표의
 * 순번(#)이며, 37번째(`NATIONALITY_WEIGHT`)는 표에 없어 표 다음 순번을 그대로 이었다
 * (파일 상단 "37번째 그룹 추가" 절 참조).
 */
export const COMMON_CODE_GROUP_CATALOG = [
  {
    groupCode: 'ROUND_INTERVAL_MIN',
    groupName: '리그별 라운드 간격(분)',
    description:
      '리그별 라운드 간격(분) — 코드 예시(기본값): LEAGUE_1=75, LEAGUE_2=90, LEAGUE_3=115',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-LG-009'],
    sortOrder: 1,
  },
  {
    groupCode: 'LEAGUE_TEAM_COUNT',
    groupName: '리그별 팀 수',
    description:
      '리그별 팀 수 — 코드 예시(기본값): LEAGUE_1=24, LEAGUE_2=20, LEAGUE_3=16',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-LG-001'],
    sortOrder: 2,
  },
  {
    groupCode: 'PROMOTION_RELEGATION_SLOTS',
    groupName: '승격·강등 슬롯',
    description:
      '승격·강등 슬롯 — 코드 예시(기본값): PROMOTION=3, RELEGATION=3',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-LG-006'],
    sortOrder: 3,
  },
  {
    groupCode: 'MATCH_POINTS',
    groupName: '승/무/패 승점',
    description: '승/무/패 승점 — 코드 예시(기본값): WIN=3, DRAW=1, LOSS=0',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-LG-004'],
    sortOrder: 4,
  },
  {
    groupCode: 'PHASE_DURATION_MIN',
    groupName: '페이즈 길이(분)',
    description:
      '페이즈 길이(분) — 코드 예시(기본값): REGULAR=3450, CUP_SLOT=75, PLAYOFF=300, SETTLEMENT=50, PRESEASON=150',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-LG-010'],
    sortOrder: 5,
  },
  {
    groupCode: 'CONDITION_MULT',
    groupName: '컨디션 배율 계수',
    description:
      '컨디션 배율 계수 — 코드 예시(기본값): BASE=0.70, RANGE=0.30, MIN_C=1, MAX_C=10',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-008'],
    sortOrder: 6,
  },
  {
    groupCode: 'FITNESS_PARAM',
    groupName: '피로 계수',
    description:
      '피로 계수(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): MULT_BASE=0.75, MULT_RANGE=0.25, DRAIN_FULL=18, RECOVER=12, STREAK_FACTOR=0.7',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-007'],
    sortOrder: 7,
  },
  {
    groupCode: 'POSITION_PROFICIENCY_MULT',
    groupName: '포지션 숙련도 배율',
    description:
      '포지션 숙련도 배율 — 코드 예시(기본값): P5=1.00, P4=0.95, P3=0.88, P2=0.75, P1=0.60, UNFAMILIAR_BASE=0.88, UNFAMILIAR_STEP=0.11, UNFAMILIAR_FLOOR=0.45, GK_CROSS=0.35',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-PL-006'],
    sortOrder: 8,
  },
  {
    groupCode: 'HOME_ADVANTAGE',
    groupName: '홈 어드밴티지',
    description:
      '홈 어드밴티지 — 코드 예시(기본값): MULT=1.05, CONDITION_BONUS=0.5',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-005'],
    sortOrder: 9,
  },
  {
    groupCode: 'WEATHER_EFFECT',
    groupName: '날씨 효과 계수',
    description:
      '날씨 효과 계수 — 코드 예시(기본값): CLEAR/RAIN/HEAVY_RAIN/SNOW/WINDY/HOT/COLD/FOG/CLOUDY 각 계수 객체',
    valueType: 'JSON',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-006'],
    sortOrder: 10,
  },
  {
    groupCode: 'WEATHER_PROBABILITY',
    groupName: '날씨 발생 확률',
    description: '날씨 발생 확률 — 코드 예시(기본값): 9종 각 확률(합 1.0)',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-006'],
    sortOrder: 11,
  },
  {
    groupCode: 'INJURY_PARAM',
    groupName: '부상 확률·결장',
    description:
      '부상 확률·결장(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): BASE_TICK_PROB, SEVERITY_1_MULT=0.93, SEVERITY_4_RETURN_MULT=0.90, S2_MIN/MAX=1/3, S3_MIN/MAX=4/10, S4_MIN/MAX=11/40',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-PL-009'],
    sortOrder: 12,
  },
  {
    groupCode: 'GROWTH_AGE_FACTOR',
    groupName: '성장 나이대 계수',
    description:
      '성장 나이대 계수 — 코드 예시(기본값): ROOKIE_UP=1.6, ROOKIE_DOWN=0.4, PRIME_UP=1.0, PRIME_DOWN=1.0, VETERAN_UP=0.5, VETERAN_DOWN=1.4, OLD_UP=0.2, OLD_DOWN=2.0, MAX_DELTA=6',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-PL-011'],
    sortOrder: 13,
  },
  {
    groupCode: 'FAMILIARITY',
    groupName: '팀 캐미 계수',
    description: '팀 캐미 계수 — 코드 예시(기본값): STEP=0.015, CAP=0.06',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-PL-010'],
    sortOrder: 14,
  },
  {
    groupCode: 'LEAGUE_FINISH_POINT',
    groupName: '순위 포인트 곡선',
    description:
      '순위 포인트 곡선 — 코드 예시(기본값): L1_BASE=1500, L1_RANGE=1500, L2_BASE=850, L2_RANGE=950, L3_BASE=400, L3_RANGE=600, EXP=1.8',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-EC-002'],
    sortOrder: 15,
  },
  {
    groupCode: 'PLAYOFF_PRIZE',
    groupName: '플레이오프 상금',
    description: '플레이오프 상금 — 코드 예시(기본값): L1_WIN=1500 … L3_RUNNERUP=200',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-EC-003'],
    sortOrder: 16,
  },
  {
    groupCode: 'CUP_PRIZE',
    groupName: '컵 상금',
    description:
      '컵 상금 — 코드 예시(기본값): WIN=2000, RUNNERUP=1000, SF=500, QF=250, R16=120, R32=60, R1=30, GIANT_KILLING=100',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-EC-004'],
    sortOrder: 17,
  },
  {
    groupCode: 'MARKET_VALUE_PARAM',
    groupName: '몸값 공식 계수',
    description:
      '몸값 공식 계수 — 코드 예시(기본값): OVR_DIVISOR=15, OVR_EXP=2.6, AGE_*, POT_STEP=0.05, REP_BASE=0.8, REP_STEP=0.004, CONTRACT_*, TIER_*, FLOOR=100',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-EC-005'],
    sortOrder: 18,
  },
  {
    groupCode: 'WAGE_RATIO',
    groupName: '급여 비율',
    description: '급여 비율 — 코드 예시(기본값): RATIO=0.18',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-EC-006'],
    sortOrder: 19,
  },
  {
    groupCode: 'SPONSOR_PARAM',
    groupName: '스폰서 규칙',
    description:
      '스폰서 규칙(그룹 내 INT·DECIMAL 혼재 — DECIMAL로 표현) — 코드 예시(기본값): MAX_PER_TEAM=3, CONTRACT_MIN=1, CONTRACT_MAX=10, SHARE_PCT_CAP=30, POOL_MIN=40',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-EC-008', 'FR-EC-010', 'FR-EC-011'],
    sortOrder: 20,
  },
  {
    groupCode: 'CONTRACT_PARAM',
    groupName: '선수 계약',
    description: '선수 계약 — 코드 예시(기본값): YEARS_MIN=1, YEARS_MAX=5',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-TR-005'],
    sortOrder: 21,
  },
  {
    groupCode: 'SQUAD_PARAM',
    groupName: '스쿼드 규칙',
    description:
      '스쿼드 규칙 — 코드 예시(기본값): MIN=22, MAX=30, HARD_MIN=18, GK_MIN=2, CB_MIN=3',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-TM-007'],
    sortOrder: 22,
  },
  {
    groupCode: 'YOUTH_PARAM',
    groupName: '유소년 배출',
    description:
      '유소년 배출 — 코드 예시(기본값): BASE=0.5, LEVEL_STEP=0.4, SANCTION_BONUS_PP=0.10, ROOKIE_AGE_MIN/MAX=16/18, ROOKIE_OVR_MIN/MAX=6/14',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-YT-001', 'FR-YT-002'],
    sortOrder: 23,
  },
  {
    groupCode: 'RETIREMENT_PARAM',
    groupName: '은퇴 임계',
    description:
      '은퇴 임계(그룹 내 INT·DECIMAL 혼재 — DECIMAL로 표현) — 코드 예시(기본값): RISK_START_AGE=34, FORCE_AGE=40, BASE_PROB',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-PL-015'],
    sortOrder: 24,
  },
  {
    groupCode: 'ODDS_PARAM',
    groupName: '배당 산출',
    description:
      '배당 산출(그룹 내 INT·DECIMAL 혼재 — DECIMAL로 표현) — 코드 예시(기본값): MC_N_MATCH=3000, MC_N_SEASON=300, OVERROUND=1.06, MIN_ODDS=1.01, MAX_ODDS=500. ' +
      '주의: MC_N_SEASON=300은 05문서 원본값이며 `docs/ISSUES.md` I-08은 배당오차 ±11.5% 문제로 1,500 상향(+재산출 주기 매라운드→5라운드)을 권고한다 — 반영 시점은 Task 035 착수 전(팀 일정 30일차)이므로 이 카탈로그(9일차)에는 원본값을 유지한다.',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_MARKET',
    relatedFr: ['FR-BT-005'],
    sortOrder: 25,
  },
  {
    groupCode: 'BET_LIMIT',
    groupName: '베팅 한계',
    description:
      '베팅 한계 — 코드 예시(기본값): STAKE_MIN=100, SINGLE_MAX=100000, MULTI_RETURN_MAX=1000000, LEGS_MAX=10',
    valueType: 'INT',
    applyPolicy: 'NEXT_MARKET',
    relatedFr: ['FR-BT-010'],
    sortOrder: 26,
  },
  {
    groupCode: 'RATING_WEIGHT',
    groupName: '평점 가중치',
    description: '평점 가중치 — 코드 예시(기본값): 필드플레이어·GK 이벤트별 가중치 객체',
    valueType: 'JSON',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-ST-003'],
    sortOrder: 27,
  },
  {
    groupCode: 'OVR_WEIGHT',
    groupName: '포지션별 OVR 가중치',
    description: '포지션별 OVR 가중치 — 코드 예시(기본값): 11군 각 34속성 가중치 객체',
    valueType: 'JSON',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-PL-003'],
    sortOrder: 28,
  },
  {
    groupCode: 'UI_PARAM',
    groupName: 'UI 동작',
    description:
      'UI 동작 — 코드 예시(기본값): POLL_INTERVAL_MS=5000, POLL_LIVE_MS=3000, LEADERBOARD_MIN_APPEARANCE_PCT=30',
    valueType: 'INT',
    applyPolicy: 'IMMEDIATE',
    relatedFr: ['FR-UI-022', 'FR-ST-004'],
    sortOrder: 29,
  },
  {
    groupCode: 'MANAGER_MATCHUP',
    groupName: '감독 상성 매트릭스',
    description: '감독 상성 매트릭스 — 코드 예시(기본값): 6×6 성향 상성 계수',
    valueType: 'JSON',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-009'],
    sortOrder: 30,
  },
  {
    groupCode: 'CRON_PARAM',
    groupName: '크론 설정',
    description:
      '크론 설정 — 코드 예시(기본값): INTERVAL_MIN=1, LOCK_TIMEOUT_MIN=5, CATCHUP_MAX_PER_RUN=50, RETRY_MAX=3, GAP_DETECT_MULTIPLIER=3',
    valueType: 'INT',
    applyPolicy: 'IMMEDIATE',
    relatedFr: ['FR-AD-017', 'FR-AD-018', 'FR-AD-019', 'FR-AD-020'],
    sortOrder: 31,
  },
  {
    groupCode: 'SANCTION_PARAM',
    groupName: '리그3 리빌드 제재',
    description:
      '리그3 리빌드 제재(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): REP_PENALTY_PERMANENT=3, REP_PENALTY_NEGOTIATION=5, GRANT_PCT=0.40, YOUTH_BONUS_PP=0.10',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-LG-007'],
    sortOrder: 32,
  },
  {
    groupCode: 'CUP_PARAM',
    groupName: '컵대회 설정',
    description:
      '컵대회 설정(그룹 내 INT·JSON 혼재 — 배열을 담는 JSON으로 표현) — 코드 예시(기본값): BYE_COUNT=4, INSERT_ROUNDS=[6,12,18,24,32,40]',
    valueType: 'JSON',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-LG-015'],
    sortOrder: 33,
  },
  {
    groupCode: 'CARD_PARAM',
    groupName: '카드·정지',
    description:
      '카드·정지 — 코드 예시(기본값): SUSPENSION_THRESHOLD=5, RED_MIN/MAX=1/3',
    valueType: 'INT',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-011'],
    sortOrder: 34,
  },
  {
    groupCode: 'EFFECTIVE_MULT_CLAMP',
    groupName: '보정 체인 클램프',
    description: '보정 체인 클램프 — 코드 예시(기본값): MIN=0.35, MAX=1.35',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-MT-004'],
    sortOrder: 35,
  },
  {
    groupCode: 'TRANSFER_PARAM',
    groupName: '이적 빈도·협상',
    description:
      '이적 빈도·협상(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): RATE_MIN_PCT=8, RATE_MAX_PCT=15, PER_TEAM_MAX=4, SUCCESS_MIN=0.05, SUCCESS_MAX=0.95, TRADE_VALUE_GAP_PCT=15, LOAN_WAGE_SHARE_PCT=50',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-TR-003', 'FR-TR-006', 'FR-TR-009', 'FR-TR-010'],
    sortOrder: 36,
  },
  {
    groupCode: 'NATIONALITY_WEIGHT',
    groupName: '국적 배정 비중',
    description:
      '국적 배정 비중(D-17 파급① "국가 목록과 각국 비중은 공통코드로 관리", I-88 사용자 결정 ' +
      '14일차 반영 — 05문서 5.12.1절 표에는 없던 그룹, 파일 상단 "37번째 그룹 추가" 절 참조) — ' +
      '코드는 `src/lib/naming/namePools.ts`의 `SUPPORTED_NATIONALITY_CODES` 20개국과 동일: ' +
      'KR/JP/CN/BR/AR/MX/ES/PT/FR/DE/IT/GB/NL/HR/NG/SN/CI/GH/CM/EG. ' +
      '각 코드의 값은 선수 국적 배정 시 상대 가중치(비중)다. ' +
      '실값은 문서 근거가 없어 미정 — 억측 금지 원칙에 따라 기본값을 비워 둔다(`fallback.ts` ' +
      '참조, `WEATHER_EFFECT` 선례와 동일). 15일차는 균등분포로 시작하고 031b(밸런싱 튜닝)에서 ' +
      '실측 보강한다.',
    valueType: 'DECIMAL',
    applyPolicy: 'NEXT_SEASON',
    relatedFr: ['FR-PL-014'],
    sortOrder: 37,
  },
] as const satisfies readonly CommonCodeGroupCatalogEntry[];

/** 카탈로그가 정확히 37개 그룹을 담고 있음을 모듈 로드 시점에 보증한다(14일차 37번째 그룹 추가 반영). */
const _assertCatalogSize: 37 = COMMON_CODE_GROUP_CATALOG.length;
void _assertCatalogSize;

/** 카탈로그에서 파생한 그룹 코드 유니온 — 신규 도메인 타입이 아니라 배열 리터럴의 파생값이다. */
export type CommonCodeGroupCode = (typeof COMMON_CODE_GROUP_CATALOG)[number]['groupCode'];

/**
 * `group_code`로 즉시 조회 가능한 맵. 10일차 로더(`loader.ts`)가 그룹 단위 캐시를
 * 구축할 때 이 맵을 초기 소스로 재사용할 수 있다.
 */
export const COMMON_CODE_GROUP_BY_CODE: Readonly<
  Record<CommonCodeGroupCode, CommonCodeGroupCatalogEntry>
> = COMMON_CODE_GROUP_CATALOG.reduce<
  Record<CommonCodeGroupCode, CommonCodeGroupCatalogEntry>
>(
  (map, group) => {
    map[group.groupCode] = group;
    return map;
  },
  {} as Record<CommonCodeGroupCode, CommonCodeGroupCatalogEntry>,
);

/** value_type이 CommonCodeValueType 유니온을 벗어나지 않음을 컴파일타임에 보증하기 위한 참조. */
type _AssertValueTypeUnion = CommonCodeGroupCatalogEntry['valueType'] extends CommonCodeValueType
  ? true
  : never;
/** apply_policy가 CommonCodeApplyPolicy 유니온을 벗어나지 않음을 컴파일타임에 보증하기 위한 참조. */
type _AssertApplyPolicyUnion =
  CommonCodeGroupCatalogEntry['applyPolicy'] extends CommonCodeApplyPolicy ? true : never;
const _typeGuards: [_AssertValueTypeUnion, _AssertApplyPolicyUnion] = [true, true];
void _typeGuards;
