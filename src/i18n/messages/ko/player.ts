// Task 011(16일차) 골격. avatar/ability/state 그룹은 Task 013A(28일차)
// PlayerAvatar·AbilityRadar·ConditionGauge 컴포넌트에서 추가. 성장 곡선·부상
// 타임라인·트로피 등 나머지 확장 키는 후속 013A 컴포넌트 구현 시 추가.
//
// 31일차(013B, 5팀): `growthChart`(`GrowthChart`)·`injuryTimeline`(`InjuryTimeline`)
// 그룹 추가. 키 구조는 4팀 소유·콘텐츠 확장은 5팀 기여 몫 관례(`match.ts` 선례와 동일).
// **32일차(I-165 해소)**: `injuryTimeline.statusActive`/`statusRecovered` 로컬 키는
// `enums.injuryStatus`(3팀이 31일차 신설) 카탈로그와 이중화돼 있어 제거했다 —
// `InjuryTimeline.tsx`는 이제 `enums.injuryStatus.*`를 직접 경유한다.
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
