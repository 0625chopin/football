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
  },
  injuryTimeline: {
    empty: "표시할 부상 기록이 없습니다.",
    error: "부상 타임라인을 불러오지 못했습니다.",
    // {round}는 라운드 번호(숫자)가 그대로 치환된다.
    roundLabel: "R{round}",
    // {start}/{end}는 라운드 번호(숫자)가 그대로 치환된다.
    roundRangeFormat: "R{start}–R{end}",
  },
};

export type PlayerMessages = typeof player;
