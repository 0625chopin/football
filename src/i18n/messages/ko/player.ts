// Task 011(16일차) 골격. avatar/ability/state 그룹은 Task 013A(28일차)
// PlayerAvatar·AbilityRadar·ConditionGauge 컴포넌트에서 추가. 성장 곡선·부상
// 타임라인·트로피 등 나머지 확장 키는 후속 013A 컴포넌트 구현 시 추가.
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
  ability: {
    title: "능력치",
    technical: "기술",
    mental: "정신",
    physical: "신체",
    goalkeeping: "골키핑",
  },
  state: {
    condition: "컨디션",
    fitness: "피로도",
  },
  position: {
    title: "포지션",
    // {position}은 enums.position.* 조회 결과(이미 번역된 라벨)가 그대로 치환된다.
    altText: "{position} 포지션",
  },
  empty: {
    message: "표시할 선수가 없습니다.",
  },
  error: {
    loadFailed: "선수 정보를 불러오지 못했습니다.",
  },
};

export type PlayerMessages = typeof player;
