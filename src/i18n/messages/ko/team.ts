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
    title: "트로피",
    empty: "트로피 없음",
    error: "트로피 정보를 불러오지 못했습니다.",
    // {count}는 획득 횟수(숫자)가 그대로 치환된다.
    countFormat: "×{count}",
    // {seasons}는 시즌 표시 라벨 목록을 ", "로 이어붙인 문자열(소비처에서 조립)이 그대로 치환된다.
    seasonsFormat: "({seasons})",
    awardsTitle: "개인 수상",
  },
  // F4 시즌 지표(52일차, Task 018) — FR-ST-002 전량을 그룹 탭 5종으로 분할(W-30 초안 채택).
  // `TeamSeasonStat` 파생값(득실·PPG·정확도·xG차 등)은 소비처(page.tsx/패널)가 계산해
  // 문자열 하나로 조립한 뒤 이 키들에 채워 넣는다(저장 안 함, 파일 헤더 R-03 원칙).
  season: {
    title: "시즌 지표",
    tabResults: "성적",
    tabAttack: "공격",
    tabPassDefense: "패스·수비",
    tabDiscipline: "규율",
    tabSquad: "스쿼드",
    // 02 문서(리그 상세) `league.emptySeason`과 동일 문구(06 문서 §5 "02 문서와 문구 일치").
    empty: "시즌이 아직 시작되지 않았습니다.",
    error: "시즌 지표를 불러오지 못했습니다.",
    // {played}/{wins}/{draws}/{losses}는 TeamSeasonStat 원값 그대로 치환.
    playedFormat: "{played}경기 {wins}승 {draws}무 {losses}패",
    // {points}는 TeamSeasonStat.points 그대로 치환.
    pointsFormat: "승점 {points}",
    // {goalsFor}/{goalsAgainst}는 원값, {goalDifference}는 소비처가 부호(+/-) 포함해 조립한 문자열.
    goalsFormat: "득 {goalsFor} 실 {goalsAgainst} 득실 {goalDifference}",
    // {value}는 (points / played) 소비처 계산, 소수 2자리.
    ppgFormat: "PPG {value}",
    // {wins}/{draws}/{losses}는 TeamSplitRecord(홈) 그대로 치환.
    homeRecordFormat: "홈 {wins}-{draws}-{losses}",
    // {wins}/{draws}/{losses}는 TeamSplitRecord(원정) 그대로 치환.
    awayRecordFormat: "원정 {wins}-{draws}-{losses}",
    cleanSheetsLabel: "클린시트",
    failedToScoreLabel: "무득점",
    longestWinStreakLabel: "최다연승",
    longestUnbeatenLabel: "최다무패",
    shotsLabel: "슈팅",
    shotsOnTargetLabel: "유효슈팅",
    // {pct}는 (shotsOnTarget / shots × 100) 소비처 계산, 정수.
    shotAccuracyFormat: "정확도 {pct}%",
    xgForLabel: "xG",
    xgAgainstLabel: "xGA",
    // {value}는 (xgFor - xgAgainst) 소비처 계산, 소수 1자리 + 부호.
    xgDiffFormat: "xG차 {value}",
    // {value}는 (goalsFor / played) 소비처 계산, 소수 2자리.
    goalsPerGameFormat: "경기당 득점 {value}",
    // {value}는 (goalsAgainst / played) 소비처 계산, 소수 2자리.
    goalsConcededPerGameFormat: "경기당 실점 {value}",
    setPieceGoalsLabel: "세트피스 득점",
    openPlayGoalsLabel: "오픈플레이 득점",
    penaltyGoalsLabel: "페널티 득점",
    scoringByPeriodTitle: "시간대별 득점",
    concedingByPeriodTitle: "시간대별 실점",
    // {pct}는 TeamSeasonStat.possessionAvg 그대로 치환(이미 %).
    possessionAvgFormat: "평균 점유율 {pct}%",
    foulsLabel: "파울",
    yellowCardsLabel: "경고",
    redCardsLabel: "퇴장",
    fairPlayScoreLabel: "페어플레이 점수",
    // {count}는 TeamSeasonStat.squadSize 그대로 치환.
    squadSizeFormat: "스쿼드 {count}명",
    // {value}는 avgAge 소수 1자리.
    avgAgeFormat: "평균 나이 {value}세",
    // {value}는 avgOvr 소수 1자리.
    avgOvrFormat: "평균 OVR {value}",
    // {value}는 avgCondition 소수 1자리.
    avgConditionFormat: "평균 컨디션 {value}",
    squadMarketValueLabel: "총 몸값",
    // {count}는 injuriesActive 그대로 치환.
    injuriesActiveFormat: "부상 {count}명",
    // {count}는 suspensionsActive 그대로 치환.
    suspensionsActiveFormat: "정지 {count}명",
    minutesDistributionTitle: "출전시간 분포",
    // {period}는 Record 키(구간 라벨) 원문, {count}는 그 구간 값 — 둘 다 소비처가 채운다.
    periodEntryFormat: "{period} {count}",
    periodEmpty: "구간별 데이터 없음",
  },
  // F5 재정 패널(52일차) — `TeamSeasonStat` 재정 그룹 필드 그대로. 단위 pt(L-03), "원"/₩ 금지.
  finance: {
    title: "재정",
    empty: "재정 정보가 없습니다.",
    error: "재정 정보를 불러오지 못했습니다.",
    // {amount}는 formatPoints()로 천단위 구분한 문자열이 그대로 치환된다.
    pointsFormat: "{amount} pt",
    balanceLabel: "잔고",
    seasonIncomeLabel: "시즌 수입",
    seasonExpenseLabel: "시즌 지출",
    // {sign}은 "▲"/"▼", {amount}는 formatPoints() 절대값 문자열.
    netFormat: "순익 {sign} {amount} pt",
    wageBillLabel: "급여 총액",
    // {pct}는 (wageBill / seasonIncome × 100) 소비처 계산, 정수. 수입 0이면 "—".
    wageRatioFormat: "수입 대비 {pct}%",
    transferSpendLabel: "이적 지출",
    transferIncomeLabel: "이적 수입",
    // {sign}/{amount}는 netFormat과 동일 규약 — (transferIncome - transferSpend) 기준.
    transferBalanceFormat: "이적 수지 {sign} {amount} pt",
    sponsorIncomeLabel: "스폰서 수입",
    sponsorPayoutLabel: "스폰서 분배",
    // 재정 위기 배지 조건은 FR-EC-012 명시 필드가 아직 없어 balance < 0 휴리스틱으로
    // 판정한다(이슈 후보, 완료 보고 참조).
    statusNormal: "정상",
    statusCrisis: "재정 위기",
  },
  // F6 스폰서 3슬롯(52일차, D-35 F6 체결 구단주 표기 포함) — 항상 3슬롯을 그린다.
  sponsor: {
    title: "스폰서",
    empty: "스폰서 계약 없음",
    error: "스폰서 정보를 불러오지 못했습니다.",
    emptySlotLabel: "빈 슬롯",
    emptySlotCaption: "계약 없음",
    // {scale}은 Sponsor.scale(1~5) 그대로 치환.
    scaleFormat: "규모 {scale}",
    // {amount}는 formatPoints(incomePerSeason)이 그대로 치환된다.
    incomeFormat: "시즌 {amount} pt",
    // {pct}는 SponsorContract.sharePct 그대로 치환.
    sharePctFormat: "분배 {pct}%",
    // {count}는 (endSeason - 현재 시즌 번호, 0 미만 clamp) 소비처 계산.
    remainingSeasonsFormat: "잔여 {count}시즌",
    // {name}은 ClubOwner.name(고유명사, D-17) 그대로 치환 — D-35 체결 주체 표기.
    signedByFormat: "체결 {name}",
    signedByUnknown: "체결 정보 없음",
    voidedBadge: "계약 무효(부도)",
    // Sponsor.balance < 0 또는 bankruptAtSeason !== null일 때(스폰서 현황 화면과 동일 조건).
    bankruptRiskBadge: "부도 위험",
  },
  // F8 최근/예정 경기(52일차) — `MatchCard`(composite, density="row") 그대로 재사용.
  match: {
    title: "최근 / 예정 경기",
    tabRecent: "최근",
    tabUpcoming: "예정",
    liveTitle: "진행 중",
    emptyRecent: "최근 경기가 없습니다.",
    emptyUpcoming: "예정된 경기 없음(시즌 종료)",
    error: "경기 정보를 불러오지 못했습니다.",
    // leagueId가 없는 대회(컵 등)의 카드용 대체 리그명 자리.
    cupLabel: "컵",
  },
};

export type TeamMessages = typeof team;
