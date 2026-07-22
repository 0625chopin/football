// Task 011(16일차) 골격. badge 그룹은 Task 013A(28일차) TeamBadge 컴포넌트에서 추가.
//
// 32일차(013B, 5팀): `trophy`(`TrophyCase`) 그룹 추가. 키 구조는 4팀 소유·콘텐츠 확장은
// 5팀 기여 몫 관례(player.ts growthChart/injuryTimeline 선례와 동일) — wireframe
// `06-클럽상세.md` F7이 `team.trophy.*` 프리픽스를 명시했다.
//
// 33일차(I-166): `trophy.type.*` 로컬 키는 제거됐다. 32일차 당시 `enums.ts`에
// `trophyType` 카탈로그가 없어 `TrophyType`(E-32, 4종) 표시명을 여기 임시로 뒀지만,
// 3팀이 `enums.trophyType` 정본 카탈로그를 신설하고 `TrophyCase`가 그 카탈로그
// 소비로 교체돼(`t(locale, \`enums.trophyType.${type}\`)`) 이 로컬 키는 참조처가
// 0건이 됐다 — `empty`/`error`/`countFormat`/`seasonsFormat`/`awardsTitle` 등
// 나머지 `trophy.*`는 `TrophyCase`가 계속 쓰므로 그대로 둔다.
// 51일차(Task 018, 5팀) — 클럽 상세(`06-클럽상세.md`) F1·F2·F3·F3-o 4개 섹션 키 신설.
// F4~F8(시즌 지표/재정/스폰서/트로피/최근·예정 경기)은 52일차 몫이라 아직 없다.
export const team = {
  list: {
    title: "팀 목록",
  },
  detail: {
    title: "팀 프로필",
    rosterTitle: "선수단",
  },
  badge: {
    // {name}은 Team.name(고유명사) — 번역 대상 아님(D-17), 그대로 치환된다.
    altText: "{name} 엠블럼",
  },
  form: {
    win: "승",
    draw: "무",
    loss: "패",
    // {form}은 Standing.form/TeamSeasonStat.currentForm 원본 문자열("WWDLW" 등) 그대로 치환된다.
    altText: "최근 5경기 {form}",
  },
  empty: {
    message: "표시할 팀이 없습니다.",
  },
  error: {
    loadFailed: "팀 정보를 불러오지 못했습니다.",
  },
  // F1 클럽 헤더 — 이름·엠블럼은 변수 주입(D-17), 리그명도 League.name을 그대로 치환(고유명사 취급).
  header: {
    // {number}는 Team.foundedSeason 그대로 치환.
    foundedSeasonFormat: "창단 시즌 {number}",
    reputationLabel: "명성",
    // {count}는 Team.fanBase 천단위 구분 서식 문자열이 그대로 치환된다.
    fanBaseFormat: "팬 규모 {count}",
    stadiumLabel: "홈구장",
    // {count}는 Team.stadiumCapacity 천단위 구분 서식 문자열.
    capacityFormat: "수용 {count}",
    // {rank}는 Standing.rank 그대로 치환.
    rankFormat: "리그 순위 {rank}위",
    rankUnavailable: "순위 없음",
    recentFormLabel: "최근 5경기",
  },
  // F2 스쿼드 테이블
  squad: {
    title: "스쿼드",
    // {teamName}은 Team.name(고유명사) 그대로 치환.
    caption: "{teamName} 스쿼드",
    colNumber: "#",
    colName: "이름",
    colPosition: "포지션",
    colAge: "나이",
    colOvr: "OVR",
    colCondition: "컨디션",
    colStatus: "상태",
    colAppearances: "출전",
    colGoals: "득점",
    filterAll: "전체",
    filterGk: "GK",
    filterDf: "DF",
    filterMf: "MF",
    filterFw: "FW",
    statusNormal: "정상",
    statusInjured: "부상",
    statusSuspended: "정지",
    // {count}/{avgAge}/{avgOvr}은 전 스쿼드(필터 무관) 기준 집계값이 그대로 치환된다.
    summaryFormat: "스쿼드 {count}명 · 평균 {avgAge}세 · 평균 OVR {avgOvr}",
    summaryInjuriesFormat: "부상 {count}명",
    summarySuspensionsFormat: "정지 {count}명",
    empty: "스쿼드가 비어 있습니다.",
  },
  // F3 감독 · 전술 카드 — 감독명은 변수 주입(D-17), 성향은 enums.managerStyle.* 경유(R-2)
  manager: {
    title: "감독 · 전술",
    ageFormat: "{age}세",
    tacticalSkillLabel: "전술 숙련",
    // {value}는 Manager.tacticalSkill(1~30) 그대로 치환.
    tacticalSkillFormat: "전술 숙련 {value}/30",
    formationLabel: "선호 포메이션",
    // {count}는 Manager.contractUntilSeason - 현재 시즌 번호(0 미만은 clamp) 계산값.
    contractRemainingFormat: "계약 잔여 {count}시즌",
    reputationFormat: "명성 {value}",
    actingBadge: "임시 감독",
    vacantMessage: "감독 공석",
  },
  // F3-o 구단주 카드(D-35, 47일차 사용자 요청) — F3 감독 카드와 대칭 배치.
  // 구단주명은 변수 주입(D-17), 번역 비대상(D-18). 국적은 ISO 3166-1 alpha-2 코드를
  // 그대로 표기한다(국가명 카탈로그가 아직 없어 05/06 문서 어디에도 국적 표시 선례가 없음).
  owner: {
    title: "구단주",
    ageFormat: "{age}세",
    nationalityLabel: "국적",
    // {value}는 ClubOwner.wealth(1~30) 그대로 치환.
    wealthFormat: "재력 {value}/30",
    // {value}는 ClubOwner.negotiation(1~30) 그대로 치환.
    negotiationFormat: "협상력 {value}/30",
    reputationFormat: "명성 {value}",
    // {number}는 ClubOwner.sinceSeason 그대로 치환.
    sinceSeasonFormat: "재임 시즌 {number}부터",
    vacantMessage: "구단주 공석",
  },
  trophy: {
    empty: "트로피 없음",
    error: "트로피 정보를 불러오지 못했습니다.",
    // {count}는 획득 횟수(숫자)가 그대로 치환된다.
    countFormat: "×{count}",
    // {seasons}는 시즌 표시 라벨 목록을 ", "로 이어붙인 문자열(소비처에서 조립)이 그대로 치환된다.
    seasonsFormat: "({seasons})",
    awardsTitle: "개인 수상",
  },
};

export type TeamMessages = typeof team;
