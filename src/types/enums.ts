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
 * 시즌 페이즈 (E-01 `current_phase` / E-03 `phase`).
 * 작업표상 "페이즈 6종"이며 6일차에 최종 확정한다. 현재는 요구사항 05 E-01 기재분 5종.
 */
export type SeasonPhase =
  | 'REGULAR'
  | 'CUP_SLOT'
  | 'PLAYOFF'
  | 'SETTLEMENT'
  | 'PRESEASON';

/** 감독 스타일 (E-06 `style`) — 전술 6종(D-20 · T21 폴백 = `BALANCED`) */
export type ManagerStyle =
  | 'ATTACKING'
  | 'BALANCED'
  | 'DEFENSIVE'
  | 'COUNTER'
  | 'POSSESSION'
  | 'HIGH_PRESS';

/** 포메이션 7종 (E-06 `preferred_formation`) — 값 목록은 6일차 확정 */
export type Formation = string;

/** 포지션 11군 (E-07 `preferred_position`) — 6일차에 유니온으로 확정 */
export type Position = string;

/** 주발 (E-07 `preferred_foot`) */
export type PreferredFoot = 'LEFT' | 'RIGHT' | 'BOTH';

/**
 * 국적 코드 (E-07 `nationality`) — D-17.
 * 국가 목록을 타입에 하드코딩한 유니온으로 고정하지 않는다(T9). 공통코드 조회 결과와
 * 정합하는 형태로 두며, 6일차에 코드 체계(ISO 3166-1 alpha-2 등)를 확정한다.
 */
export type NationalityCode = string;

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
 * 이벤트 타입 (E-16 `type`, FR-MT-002 전 23종) — **6일차 소관**이라 값을 선점하지 않는다.
 * FR-MT-002 원문에 23종이 이미 열거돼 있지만, 팀 스케줄이 "이벤트 23종" 전량 확정을
 * 6일차 항목으로 명시했으므로 오늘은 자리표시자만 둔다(day-6 선점 금지).
 *
 * `string`이 아니라 **브랜드 처리**했다 — plain string 리터럴은 대입 시 `as MatchEventType`
 * 캐스팅을 강제로 요구해, 어떤 구현체도 이 자리표시자에 조용히 의존할 수 없다
 * (3일차 `PlayerAttributeValues.__unfilled34Attributes?: never` 선례와 동일한 취지).
 * 6일차에 실제 23종 리터럴 유니온으로 교체되며 이 브랜드는 사라진다.
 */
export type MatchEventType = string & {
  readonly __unconfirmedMatchEventType: true;
};

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
 * 배팅 마켓 상태 (E-33 `status`) — **"마켓 상태"는 6일차 목록에 명시적으로 포함**돼 있어
 * 오늘은 값을 선점하지 않는다. `MatchEventType`(day-6 이벤트 23종)과 동일한 브랜드
 * placeholder 패턴 — plain string 대입 시 `as BetMarketStatus` 캐스팅을 강제해 조용한
 * 오용을 차단한다.
 */
export type BetMarketStatus = string & { readonly __unconfirmedBetMarketStatus: true };

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
