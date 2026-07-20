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
