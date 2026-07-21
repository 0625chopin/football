// Task 019(41일차, 4팀) — `/[lang]/awards` 수상/명예의 전당 전용 네임스페이스.
//
// 수상 유형(`AwardType`)·범위(`AwardScope`)·포지션(`Position`) 라벨은 `enums.*`(3팀
// 소유 카탈로그)를 그대로 재사용한다 — 이 파일엔 enum 표시명을 다시 선언하지 않는다
// (C-6). 이 파일은 이 화면 고유의 섹션 제목·표 헤더·빈 상태 문구만 담는다.
//
// `bestXI.formationNote` — `Award`(E-31)엔 포메이션 필드가 없어(FR-AW-005 스코프 밖)
// 베스트11 피치 뷰는 고정 4-3-3 배치에 포지션 우선순위(GK→DF→MF→FW)로 정렬한 근사
// 배치를 쓴다(`page.tsx` `BEST_XI_FORMATION` 주석 참조) — 사용자에게 그 근사임을
// 밝히는 문구.
export const awards = {
  page: {
    title: "수상 · 명예의 전당",
    caption: "시즌별 수상, 베스트11, 통산 다관왕 랭킹을 확인합니다.",
  },
  season: {
    navLabel: "시즌 선택",
    numberFormat: "시즌 {number}",
  },
  seasonAwards: {
    title: "시즌별 수상",
    caption: "선택한 시즌의 개인·팀 수상 내역입니다.",
    empty: "이 시즌 수상 기록이 없습니다.",
    typeHeader: "수상",
    subjectHeader: "수상자",
    leagueHeader: "리그",
    scopeHeader: "범위",
  },
  bestXI: {
    title: "베스트11",
    formationNote: "포메이션 정보가 없어 4-3-3 배치 기준으로 표시합니다.",
    empty: "이 시즌 베스트11이 선정되지 않았습니다.",
  },
  ranking: {
    title: "통산 다관왕 랭킹",
    caption: "역대 시즌 누적 수상 횟수 상위 랭킹입니다.",
    playerTitle: "선수 부문",
    managerTitle: "감독 부문",
    teamTitle: "팀 부문",
    rankHeader: "순위",
    subjectHeader: "이름",
    countHeader: "수상 횟수",
    countFormat: "{count}회",
    empty: "랭킹 데이터가 없습니다.",
    managerUnavailable: "감독 이름을 조회할 방법이 없어 이 랭킹은 표시할 수 없습니다.",
  },
  subject: {
    unresolvedManager: "감독 정보 없음",
  },
};

export type AwardsMessages = typeof awards;
