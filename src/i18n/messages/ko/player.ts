// Task 011(16일차) 골격. avatar/ability/state 그룹은 Task 013A(28일차)
// PlayerAvatar·AbilityRadar·ConditionGauge 컴포넌트에서 추가. 성장 곡선·부상
// 타임라인·트로피 등 나머지 확장 키는 후속 013A 컴포넌트 구현 시 추가.
//
// 31일차(013B, 5팀): `growthChart`(`GrowthChart`)·`injuryTimeline`(`InjuryTimeline`)
// 그룹 추가. 키 구조는 4팀 소유·콘텐츠 확장은 5팀 기여 몫 관례(`match.ts` 선례와 동일).
// **32일차(I-165 해소)**: `injuryTimeline.statusActive`/`statusRecovered` 로컬 키는
// `enums.injuryStatus`(3팀이 31일차 신설) 카탈로그와 이중화돼 있어 제거했다 —
// `InjuryTimeline.tsx`는 이제 `enums.injuryStatus.*`를 직접 경유한다.
//
// 49일차(Task 018 1/2, 5팀, 와이어프레임 05번): `/players/[playerId]` 화면 소유 키.
// - `profile`(E1)·`stat`(E1-r, D-34)·`condition`(E3)·`position` 확장(E4)을 추가했다.
// - `ability`에 34속성 개별 라벨(`attr*`)을 추가했다 — `enums.ts`에는 이 34필드에 대응하는
//   카탈로그가 없다(포지션·부상등급 등 8종 카탈로그 목록에 속성명이 없음, 3팀 소관 확인
//   필요 → 이슈 후보). 이 화면(E2)에서만 쓰이는 표시명이라 우선 여기 로컬로 채운다.
// - `position.proficiency*` 5단계 이름은 와이어프레임이 로케일 무관 영문 loanword로
//   표기(FR-PL-006) — ko/en 동일 문자열. "미보유"(0/미보유)만 로케일별로 갈린다.
export const player = {
  list: {
    title: "선수 목록",
    // 50일차(I-223, 사용자 지시) — `/[lang]/players` 인덱스 화면. 44일차 `leagues/page.tsx`가
    // 세운 선례를 따라 `title`은 16일차 골격의 미사용 키를 그대로 살려 썼다. 나이 값 표기는
    // `profile.ageFormat`, 포지션 라벨은 `enums.position.*`를 재사용한다 — 같은 개념에 키를
    // 새로 만들지 않는다.
    description: "리그와 구단을 골라 소속 선수를 찾고, 이름을 눌러 선수 상세로 이동합니다.",
    leagueLabel: "리그",
    teamLabel: "구단",
    apply: "적용",
    caption: "선택한 구단의 소속 선수 명단",
    nameHeader: "선수",
    positionHeader: "포지션",
    ageHeader: "나이",
    emptyTeams: "표시할 구단이 없습니다.",
  },
  detail: {
    title: "선수 프로필",
    statsTitle: "시즌 스탯",
  },
  avatar: {
    // {name}은 Player.name(고유명사) — 번역 대상 아님(D-17), 그대로 치환된다.
    altText: "{name} 아바타",
  },
  profile: {
    // {number}는 PlayerState.squadNumber(숫자)가 그대로 치환된다.
    numberFormat: "#{number}",
    // {age}는 Player.age(숫자)가 그대로 치환된다.
    ageFormat: "{age}세",
    ovrLabel: "OVR",
    scoutRatingLabel: "스카우트 등급",
    scoutRatingTooltip: "잠재력 추정 등급(정확한 값은 공개되지 않습니다)",
    // {rating}은 PublicPlayerProfile.scoutRating(1~5)이 그대로 치환된다.
    scoutRatingFormat: "{rating}/5",
    // {value}는 Player.reputation(0~100)이 그대로 치환된다.
    reputationFormat: "명성 {value}",
    activeBadge: "현역",
    retiredBadge: "은퇴",
    freeAgentBadge: "무소속",
  },
  ability: {
    title: "능력치",
    technical: "기술",
    mental: "정신",
    physical: "신체",
    goalkeeping: "골키핑",
    // {value}는 카테고리 평균(소수 1자리, 숫자)이 그대로 치환된다.
    averageFormat: "평균 {value}",
    // 기술 10
    attrFinishing: "결정력",
    attrPassing: "패스",
    attrCrossing: "크로스",
    attrDribbling: "드리블링",
    attrFirstTouch: "트래핑",
    attrTackling: "태클",
    attrMarking: "마크",
    attrHeading: "헤딩",
    attrLongShots: "중거리 슈팅",
    attrSetPieces: "세트피스",
    // 정신 10
    attrComposure: "침착성",
    attrDecisions: "판단력",
    attrVision: "시야",
    attrPositioning: "위치선정",
    attrWorkRate: "활동량",
    attrAggression: "투쟁심",
    attrLeadership: "리더십",
    attrTeamwork: "팀워크",
    attrAnticipation: "예측력",
    attrDetermination: "승부욕",
    // 신체 8
    attrPace: "스피드",
    attrAcceleration: "가속력",
    attrStamina: "스태미나",
    attrStrength: "피지컬",
    attrAgility: "민첩성",
    attrBalance: "밸런스",
    attrJumping: "점프력",
    attrNaturalFitness: "천성 체력",
    // GK 6
    attrReflexes: "반응속도",
    attrHandling: "핸들링",
    attrOneOnOnes: "1대1 대응",
    attrAerialReach: "공중볼 처리",
    attrKicking: "킥력",
    attrCommandOfArea: "지역 장악력",
  },
  state: {
    condition: "컨디션",
    fitness: "피로도",
  },
  condition: {
    sectionTitle: "컨디션 · 피로",
    availabilityLabel: "가용성",
    availableBadge: "출전 가능",
    availableInjuredBadge: "출전 가능 (경미 부상)",
    injuredBadge: "부상",
    suspendedBadge: "출장정지",
  },
  position: {
    title: "포지션",
    // {position}은 enums.position.* 조회 결과(이미 번역된 라벨)가 그대로 치환된다.
    altText: "{position} 포지션",
    proficiencySectionTitle: "포지션 숙련도",
    proficiencyNatural: "Natural",
    proficiencyAccomplished: "Accomplished",
    proficiencyCompetent: "Competent",
    proficiencyUnconvincing: "Unconvincing",
    proficiencyAwkward: "Awkward",
    proficiencyUnfamiliar: "미보유",
  },
  stat: {
    stripTitle: "선수 지표",
    appearancesLabel: "출전",
    recentRatingLabel: "최근평점",
    seasonAverageLabel: "리그평균",
    // {value}는 리그 전체 평균 평점(소수 2자리, 숫자)이 그대로 치환된다. 라벨 자체가
    // 선수 개인 평균(seasonAverageLabel)과 구분되는 문구다(NFR-A11Y-002, 색이 아니라
    // 라벨로 구분).
    leagueBenchmarkFormat: "리그 벤치마크 {value}",
    previousSeasonLabel: "지난시즌",
    // 50일차(Task 018 2/2) — E6 스탯 테이블(`PlayerStatTable`, 화면 로컬 신규) 확장.
    tableTitle: "스탯",
    tabSeason: "시즌별",
    tabCareer: "통산",
    // {name}은 Player.name(고유명사) — 번역 대상 아님(D-17), 그대로 치환된다(R-7).
    seasonCaption: "{name} 시즌별 기록",
    careerCaption: "{name} 통산 기록",
    tableEmpty: "출전 기록 없음",
    seasonHeader: "시즌",
    competitionHeader: "대회",
    appearancesHeader: "출전",
    appearancesHeaderFull: "출전 경기 수",
    startsHeader: "선발",
    startsHeaderFull: "선발 출전 수",
    minutesHeader: "분",
    minutesHeaderFull: "출전 시간(분)",
    goalsHeader: "득",
    goalsHeaderFull: "득점",
    assistsHeader: "도",
    assistsHeaderFull: "도움",
    ratingHeader: "평점",
    ratingHeaderFull: "경기 평균 평점",
    careerRowLabel: "통산",
    moreGroupsTitle: "그룹 더보기",
    groupAttack: "공격",
    groupPassing: "패스",
    groupDribbling: "드리블",
    groupDefense: "수비",
    groupDiscipline: "규율",
    groupGk: "GK",
    shotsHeader: "슈팅",
    shotsOnTargetHeader: "유효슈팅",
    xgHeader: "xG",
    xaHeader: "xA",
    passesCompletedHeader: "패스성공",
    passesAttemptedHeader: "패스시도",
    keyPassesHeader: "키패스",
    dribblesCompletedHeader: "드리블성공",
    dribblesAttemptedHeader: "드리블시도",
    touchesHeader: "터치",
    tacklesWonHeader: "태클성공",
    interceptionsHeader: "인터셉트",
    clearancesHeader: "클리어링",
    foulsCommittedHeader: "파울",
    yellowCardsHeader: "경고",
    redCardsHeader: "퇴장",
    savesHeader: "선방",
    cleanSheetsHeader: "클린시트",
    goalsConcededHeader: "실점",
  },
  empty: {
    message: "표시할 선수가 없습니다.",
  },
  error: {
    loadFailed: "선수 정보를 불러오지 못했습니다.",
  },
  growthChart: {
    empty: "표시할 성장 기록이 없습니다.",
    error: "성장 곡선을 불러오지 못했습니다.",
    // {min}/{max}는 시즌별 OVR 이력의 최솟값/최댓값(숫자)이 그대로 치환된다.
    ariaLabel: "선수 OVR 성장 곡선 ({min}~{max})",
    // 50일차 — E7 섹션 제목 + 시각 정보 대체용 sr-only 표(NFR-A11Y-005, "곡선은
    // 시즌별 OVR을 <table> sr-only로 병기").
    sectionTitle: "성장 곡선",
    // {name}은 고유명사 변수 주입(D-17).
    srTableCaption: "{name} 시즌별 OVR",
    srSeasonHeader: "시즌",
    srOvrHeader: "OVR",
  },
  injuryTimeline: {
    empty: "표시할 부상 기록이 없습니다.",
    error: "부상 타임라인을 불러오지 못했습니다.",
    // {round}는 라운드 번호(숫자)가 그대로 치환된다.
    roundLabel: "R{round}",
    // {start}/{end}는 라운드 번호(숫자)가 그대로 치환된다.
    roundRangeFormat: "R{start}–R{end}",
    // 50일차 — E8 섹션 제목 + 통산 요약(FR-PL-009 ③).
    sectionTitle: "부상 타임라인",
    // {count}/{rounds}는 숫자가 그대로 치환된다.
    summaryFormat: "통산 부상 {count}회 · 결장 {rounds}R",
  },
  value: {
    // 50일차(Task 018 2/2) — E5 몸값·계약. 단위는 포인트(L-03), 원화 기호·"원" 표기 금지.
    sectionTitle: "몸값 · 계약",
    marketValueLabel: "몸값",
    // {amount}는 `formatPoints()`(`@/i18n/format`)로 이미 천단위 서식이 적용된 문자열이
    // 그대로 치환된다(`sponsor.common.pointsFormat`과 동일 관례).
    pointsFormat: "{amount} pt",
    // {start}/{end}는 Contract.startSeason/endSeason(숫자)이 그대로 치환된다.
    contractSeasonFormat: "계약 {start}~{end}시즌",
    // {count}는 잔여 시즌 수(숫자)가 그대로 치환된다.
    contractRemainingFormat: "(잔여 {count}시즌)",
    wageLabel: "시즌 급여",
    contractEmpty: "계약 정보 없음",
  },
  career: {
    // 50일차(Task 018 2/2) — E9 커리어 이력. `[트로피]` 탭은 `TrophyCase`(013B 기존
    // 산출물)를 그대로 쓰고, `[이적]` 탭만 화면 로컬 신규(`TransferHistoryList`).
    sectionTitle: "커리어 이력",
    tabTrophy: "트로피",
    tabTransfer: "이적",
    transferEmpty: "이적 이력 없음",
    // TransferType(TRANSFER/FREE/TRADE/RELEASE) 표시명은 enums.ts에 카탈로그가 없어
    // (`competitionType`과 동일 사유, 이슈 후보) 화면 로컬로 임시 채운다. 최상위
    // `player.transferType.*`/`player.competitionType.*`(아래)를 대신 참조한다.
    loanKindLabel: "임대",
  },
  // 50일차 — TransferType(E-13)·CompetitionType(E-20) 표시명 카탈로그. `enums.ts`
  // (3팀 소유)에 두 카탈로그가 없어(카탈로그 목록에 없음), `enums.trophyType`이 32일차
  // 신설 전까지 그랬던 것과 동일하게(I-166 선례) `player` 네임스페이스 로컬로 임시
  // 채운다(`t(locale, "player.competitionType.LEAGUE")` 형태로 경유 — `enums.trophyType`과
  // 동일한 3단 경로 규약). 로컬인 이유는 소비처가 이 화면 하나뿐이기 때문이다(I-249와
  // 동일 판단) — 두 번째 소비 화면이 생기면 `enums.ts` 승격을 이슈로 등재해야 한다(보고 참조).
  competitionType: {
    LEAGUE: "리그",
    PLAYOFF: "플레이오프",
    CUP: "컵",
    TIEBREAK: "타이브레이크",
  },
  transferType: {
    TRANSFER: "이적",
    FREE: "자유이적",
    TRADE: "트레이드",
    RELEASE: "방출",
  },
};

export type PlayerMessages = typeof player;
