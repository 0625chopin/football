/**
 * enum성 값 **단일 선언** 파일 — 3일차에는 E-01~E-08이 요구하는 최소분만 선언한다.
 *
 * 근거: `docs/devStep/02.타입스키마설계원칙.md` T8 / 체크리스트 C-6(재선언 금지)
 *
 * ⚠️ 6일차(2026-07-28)에 이 파일에서 전량 확정한다 — 이벤트 23종, 포지션 11군,
 *    부상 4등급, 전술 6종, 페이즈 6종, 마켓 상태, 국적 코드(D-17).
 *    **다른 파일에서 enum성 문자열 유니온을 개별 선언하지 않는다.** 필요하면 이 파일에 추가한다.
 *
 * ⚠️ enum → 번역 키 매핑 **규약**은 7일차 `config.ts` 소관이며(T12), 실제 번역 키 문자열·
 *    키 공간은 4팀 단독 소유(H-09, T12-a)다. 여기에 번역 키를 선점하지 않는다.
 */

/**
 * 시즌 페이즈 (E-01 `current_phase` / E-03 `phase`) — **6종 전량 확정(6일차)**.
 * 요구사항 05:46 원문(`REGULAR / CUP_SLOT / PLAYOFF / SETTLEMENT / PRESEASON`)의 5종에
 * `TIEBREAK`를 추가했다.
 *
 * **`TIEBREAK` 근거 (I-33 → D-27 승격, 팀장 승인, 2026-07-23)**:
 * 상태머신은 `… → PLAYOFF → (TIEBREAK?) → SETTLEMENT → PRESEASON …`이며,
 * `TIEBREAK`는 **승강 경계 동률이 발생했을 때만 진입하는 조건부 페이즈**다(항상 거치지 않음).
 * 승인 근거: ① SETTLEMENT 예산 50분은 동률 해소 경기 1회(75~115분)를 담을 수 없음
 * ② PLAYOFF에 흡수하면 "승강 동률 해소가 플레이오프 진입 전에 끝나야 한다"는 순서를 위반
 * ③ `CompetitionType`(E-15)에는 `TIEBREAK`가 이미 있어 대회 축은 정합이었고 페이즈 축만
 * 공백이었음. 전이 반영은 2팀 025(28일차)·기간 신설은 3팀 `PHASE_DURATION_MIN`(팀장 전달 소관).
 */
export type SeasonPhase =
  | 'REGULAR'
  | 'CUP_SLOT'
  | 'PLAYOFF'
  | 'TIEBREAK'
  | 'SETTLEMENT'
  | 'PRESEASON';

/**
 * 감독 스타일 (E-06 `style`) — 전술 6종(D-20 · T21 폴백 = `BALANCED`).
 * FR-MT-009 원문(`ATTACKING, BALANCED, DEFENSIVE, COUNTER, POSSESSION, HIGH_PRESS`)과
 * 대조해 6일차에 재확인 완료 — 3일차에 이미 6종 전량이 정확히 선언돼 있어 값 변경 없음.
 */
export type ManagerStyle =
  | 'ATTACKING'
  | 'BALANCED'
  | 'DEFENSIVE'
  | 'COUNTER'
  | 'POSSESSION'
  | 'HIGH_PRESS';

/** 포메이션 7종 (E-06 `preferred_formation`) — 6일차 대상 목록 밖(값 목록은 추후 확정) */
export type Formation = string;

/**
 * 포지션 11군 (E-07 `preferred_position`) — **6일차 확정**.
 * 값 근거: FR-PL-005 원문("`GK, CB, LB, RB, DM, CM, AM, LW, RW, ST, SS` 11군") 그대로.
 */
export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'DM'
  | 'CM'
  | 'AM'
  | 'LW'
  | 'RW'
  | 'ST'
  | 'SS';

/** 주발 (E-07 `preferred_foot`) */
export type PreferredFoot = 'LEFT' | 'RIGHT' | 'BOTH';

/**
 * 국적 코드 (E-07 `nationality`) — D-17, **6일차 코드 체계 확정**.
 *
 * **T9 (`docs/devStep/02.타입스키마설계원칙.md`)**: 이름 풀·국가별 비중은 공통코드 대상이므로
 * 국가 목록을 타입에 하드코딩한 유니온으로 고정하지 않는다. 따라서 6일차 확정의 내용은
 * "리터럴 값 목록"이 아니라 **코드 체계(포맷) 계약**이다 — **ISO 3166-1 alpha-2**(대문자 2글자,
 * 예: `KR`, `BR`, `ES`) 형식을 단일 계약으로 확정하고, plain string 오사용을 막기 위해
 * 브랜드 타입으로 감쌌다. 실제 국가 목록·이름 풀·비중은 공통코드(3팀 소관, `docs/require/
 * 05-data-requirements.md` 공통코드 카탈로그)에서 런타임에 조회한다.
 */
export type NationalityCode = string & { readonly __nationalityCode: true };

/** 선수 성향 태그 (E-07 `taste_tags`) — 값 목록은 6일차 확정 */
export type TasteTag = string;

/**
 * 대회 구분 (E-15 `competition_type` / E-20 `competition_type` 복합 PK 축).
 * 4일차 확정 — 6일차 확정 목록(이벤트 23종·포지션 11군·부상 4등급·전술 6종·페이즈 6종·
 * 마켓 상태·국적 코드)에 포함되지 않으며 값이 요구사항(05:234)에 이미 확정돼 있어 오늘 전량 선언한다.
 * // 4일차 확정 — 6일차 전량 확정 시 유지(재선언 금지, 이 항목은 6일차 대상 목록 밖)
 */
export type CompetitionType = 'LEAGUE' | 'PLAYOFF' | 'CUP' | 'TIEBREAK';

/**
 * 경기 상태 (E-15 `status`) — 값 확정(05:241)
 * // 4일차 확정 — 6일차 전량 확정 시 유지(6일차 대상 목록 밖)
 */
export type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'VOID';

/**
 * 이벤트 타입 (E-16 `type`, FR-MT-002 전 23종) — **6일차 확정**.
 * 값 근거: FR-MT-002 원문 그대로, 총 23종.
 *
 * **7일차 팀장 확정 규약 2건(`docs/ISSUES.md` I-43·I-44)** — 값 목록 변경은 아니며 발생
 * 규칙 명문화:
 * - **`PENALTY_SCORED`는 정규·연장 PK 득점 시 단독 발생한다. 같은 골에 `GOAL`을
 *   추가로 발생시키지 않는다**(중복 시 D1 스코어보드의 `GOAL`/`OWN_GOAL`/
 *   `PENALTY_SCORED` fold 집계가 1골을 2골로 셈, I-43).
 * - **`PENALTY_SHOOTOUT`은 승부차기 킥마다 별도 `MatchEvent` 레코드로 반복 발생한다**
 *   (같은 `type` 리터럴, 서로 다른 `sequence`/`detail`) — 리터럴 값이 1종인 것과 실제
 *   인스턴스가 1건인 것은 별개다(I-44).
 */
export type MatchEventType =
  | 'KICKOFF'
  | 'SHOT_ON'
  | 'SHOT_OFF'
  | 'SHOT_BLOCKED'
  | 'GOAL'
  | 'ASSIST'
  | 'OWN_GOAL'
  | 'PENALTY_AWARDED'
  | 'PENALTY_SCORED'
  | 'PENALTY_MISSED'
  | 'YELLOW_CARD'
  | 'SECOND_YELLOW'
  | 'RED_CARD'
  | 'FOUL'
  | 'OFFSIDE'
  | 'CORNER'
  | 'SAVE'
  | 'INJURY'
  | 'SUBSTITUTION'
  | 'HALF_TIME'
  | 'FULL_TIME'
  | 'EXTRA_TIME_START'
  | 'PENALTY_SHOOTOUT';

/**
 * 날씨 타입 (E-18 `type`, FR-MT-006 9종) — 값 확정(FR-MT-006)
 * // 4일차 확정 — 6일차 전량 확정 시 유지(6일차 대상 목록 밖)
 */
export type WeatherType =
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'SNOW'
  | 'WINDY'
  | 'HOT'
  | 'COLD'
  | 'FOG';

/**
 * 계약 상태 (E-12 `status`) — 값 확정(05:201)
 * // 4일차 확정 — 6일차 전량 확정 시 유지(6일차 대상 목록 밖)
 */
export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

/**
 * 이적 유형 (E-13 `type`) — 값 확정(05:211)
 * // 4일차 확정 — 6일차 전량 확정 시 유지(6일차 대상 목록 밖)
 */
export type TransferType = 'TRANSFER' | 'FREE' | 'TRADE' | 'RELEASE';

/**
 * 임대 상태 (E-14 `status`) — 값 확정(05:222)
 * // 4일차 확정 — 6일차 전량 확정 시 유지(6일차 대상 목록 밖)
 */
export type LoanStatus = 'ACTIVE' | 'RETURNED';

/* ────────────────────────────────────────────────────────────────────────
 * 5일차(2026-07-27) 추가 확정 — 아래는 전부 6일차 목록(이벤트 23종·포지션 11군·
 * 부상 4등급·전술 6종·페이즈 6종·마켓 상태·국적 코드) **밖**이며 요구사항 원문에
 * 값이 이미 열거돼 있어 4일차 전례(CompetitionType 등)와 동일하게 오늘 확정한다.
 * ──────────────────────────────────────────────────────────────────────── */

/** 부상 상태 (E-24 `status`) — 값 확정(05:354). 등급(severity 1~4)은 6일차 "부상 4등급" 대상 */
export type InjuryStatus = 'ACTIVE' | 'RECOVERED';

/** 뉴스피드 이벤트 종류 (E-26 `type`) — 값 확정(05:369), 10종 */
export type NewsFeedItemType =
  | 'TRANSFER'
  | 'LOAN'
  | 'RETIREMENT'
  | 'YOUTH_DEBUT'
  | 'MANAGER_CHANGE'
  | 'SPONSOR_BANKRUPT'
  | 'AWARD'
  | 'INJURY'
  | 'MILESTONE'
  | 'SANCTION';

/**
 * 제재 종류 (E-27 `sanction_type`) — 현재 확정값은 `REBUILD_SANCTION` 1종뿐(05:379).
 * 원문이 "향후 `RELEGATION` 확장 여지"를 명시했으나 아직 확정 값이 아니므로 유니온에 넣지
 * 않는다. 추가가 필요해지면 이슈 등록 후 배치 반영(8일차 이후는 R-H 배치 규칙 적용).
 */
export type SanctionType = 'REBUILD_SANCTION';

/** 스폰서 계약 상태 (E-29 `status`) — 값 확정(05:406) */
export type SponsorContractStatus = 'ACTIVE' | 'EXPIRED' | 'VOIDED';

/** 포인트 원장 소유자 유형 (E-30 `owner_type`) — 값 확정(05:415) */
export type PointTransactionOwnerType = 'TEAM' | 'SPONSOR';

/**
 * 포인트 원장 사유 코드 (E-30 `reason_code`, FR-EC-001) — 값 확정(03:701).
 * ⚠️ 요구사항 원문은 "12종"이라 적었으나 실제 열거값은 11개뿐이다(문서 표기 오류로 추정,
 * `docs/ISSUES.md` 제보 대상 — 코드는 실제 열거값 11개만 반영한다).
 */
export type PointTransactionReasonCode =
  | 'LEAGUE_FINISH'
  | 'PLAYOFF_PRIZE'
  | 'CUP_PRIZE'
  | 'GIANT_KILLING_BONUS'
  | 'SPONSOR_INCOME'
  | 'SPONSOR_SHARE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'WAGE'
  | 'REBUILD_GRANT'
  | 'YOUTH_COST'
  | 'ACADEMY_INVEST';

/** 수상 종류 (E-31 `type`) — 값 확정(05:436), 12종 */
export type AwardType =
  | 'LEAGUE_MVP'
  | 'GOLDEN_BOOT'
  | 'GOLDEN_PLAYMAKER'
  | 'GOLDEN_GLOVE'
  | 'BEST_YOUNG_PLAYER'
  | 'MANAGER_OF_SEASON'
  | 'TEAM_OF_SEASON'
  | 'BALLON_DOR'
  | 'WORLD_XI'
  | 'CUP_MVP'
  | 'PLAYOFF_MVP'
  | 'PLAYER_OF_THE_ROUND';

/** 수상 범위 (E-31 `scope`) — 값 확정(05:437) */
export type AwardScope = 'LEAGUE' | 'WORLD' | 'CUP' | 'PLAYOFF';

/** 트로피 종류 (E-32 `type`) — 값 확정(05:447) */
export type TrophyType = 'LEAGUE_TITLE' | 'PLAYOFF_TITLE' | 'CUP_TITLE' | 'PROMOTION';

/** 배팅 마켓 범위 (E-33 `scope`) — 값 확정(05:459). 2차 릴리스 선정의 */
export type BetMarketScope = 'MATCH' | 'SEASON' | 'TOURNAMENT';

/**
 * 배팅 마켓 상태 (E-33 `status`) — **6일차 확정**.
 * 값 근거: `docs/require/05-data-requirements.md:463` (`OPEN / CLOSED / SETTLED / VOIDED`).
 */
export type BetMarketStatus = 'OPEN' | 'CLOSED' | 'SETTLED' | 'VOIDED';

/** 배팅 셀렉션 결과 (E-34 `result`) — 값 확정(05:475). 2차 릴리스 선정의 */
export type BetSelectionResult =
  | 'PENDING'
  | 'WIN'
  | 'LOSE'
  | 'VOID'
  | 'HALF_WIN'
  | 'HALF_LOSE';

/** 베팅 유형 (E-36 `type`) — 값 확정(05:492). 2차 릴리스 선정의 */
export type BetType = 'SINGLE' | 'MULTI';

/** 베팅 상태 (E-36 `status`) — 값 확정(05:493). 2차 릴리스 선정의. `BetMarketStatus`와 별개 축 */
export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'VOID' | 'HALF_WON' | 'HALF_LOST';

/** 사용자 권한 (E-38 `role`) — 값 확정(05:513). 2·3차 릴리스 선정의 */
export type UserRole = 'USER' | 'ADMIN';

/** 지갑 통화 (E-39 `currency`) — 값 확정(05:518), 1종. 2·3차 릴리스 선정의 */
export type WalletCurrency = 'POINT';

/** 지갑 거래 사유 (E-40 `reason`) — 값 확정(05:523). 2·3차 릴리스 선정의 */
export type WalletTransactionReason = 'BET_PLACE' | 'BET_WIN' | 'BET_VOID' | 'TOPUP';

/* ────────────────────────────────────────────────────────────────────────
 * 6일차(2026-07-28) 추가 확정 — 작업표 "enum성 값 단일 선언" 목록의 나머지 항목
 * (이벤트 23종·포지션 11군·부상 4등급·전술 6종·페이즈 6종·마켓 상태·국적 코드) 전량이
 * 위에서 확정됐다. 이 블록은 그중 신규 타입만 담는다.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 부상 강도 4등급 (E-24 `severity`, FR-PL-009) — **신규, 6일차 확정**.
 * 물리 스키마(05:351)의 `severity int(1~4)`에 대응하는 라벨 — 1=`KNOCK`, 2=`MINOR`,
 * 3=`MODERATE`, 4=`SEVERE`(FR-PL-009 표). 결장 라운드·`M_injury` 배율은 공통코드
 * `INJURY_*` 소관이라 여기 담지 않는다(T13 — 원시값만, 표시/파라미터는 별도 계층).
 */
export type InjurySeverity = 'KNOCK' | 'MINOR' | 'MODERATE' | 'SEVERE';

/* ────────────────────────────────────────────────────────────────────────
 * 7일차(2026-07-29) 추가 확정 — E-41~E-43 공통코드 도메인(`config.ts`)이 참조하는
 * enum성 값 3종. 원문 근거는 `docs/require/05-data-requirements.md` 5.12절
 * (E-41 `value_type`/`apply_policy`, E-43 `action`)이며, 이 세 값을 여기 외의
 * 파일(예: `config.ts`)에 재선언하지 않는다(단일 선언 원칙, 체크리스트 C-6).
 * ──────────────────────────────────────────────────────────────────────── */

/** 공통코드 그룹의 값 타입 (E-41 `value_type`) — 값 확정(05:540) */
export type CommonCodeValueType = 'INT' | 'DECIMAL' | 'STRING' | 'BOOL' | 'JSON';

/**
 * 공통코드 발효 정책 (E-41 `apply_policy`, FR-AD-013) — 값 확정(05:541).
 * `NEXT_SEASON`=다음 시즌부터, `IMMEDIATE`=즉시, `NEXT_MARKET`=다음 배팅 마켓부터
 * (2차 릴리스 대상, `ODDS_PARAM`/`BET_LIMIT` 그룹 전용).
 */
export type CommonCodeApplyPolicy = 'NEXT_SEASON' | 'IMMEDIATE' | 'NEXT_MARKET';

/** 공통코드 변경 이력 액션 (E-43 `action`) — 값 확정(05:583). append-only(NFR-SEC-010) */
export type CommonCodeHistoryAction = 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'REACTIVATE';
