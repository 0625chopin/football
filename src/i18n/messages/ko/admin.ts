// Task 011(16일차) 골격. Task 021(54일차)에서 G1~G4(시뮬 상태·배속·정지/재개·시드 조회)
// 실기능 키를 채운다 — 와이어프레임 `docs/wireframe/07-어드민-운영콘솔.md` §4 영역 명세
// 번역키 프리픽스(`admin.status.*`/`admin.speed.*`/`admin.pause.*`/`admin.seed.*`) 대응.
// G5(월드 리셋)·G6(로그 뷰어)는 55일차 이후 범위라 이 커밋에서 키를 추가하지 않는다.
export const admin = {
  console: {
    title: "운영 콘솔",
  },
  status: {
    inactive: "관리자 기능은 아직 준비되지 않았습니다.",
    stateLabel: "상태",
    running: "진행 중",
    paused: "일시정지 중",
    noNextKickoff: "예정된 다음 킥오프가 없습니다",
  },
  speed: {
    title: "배속 제어",
    multiplierFormat: "×{value}",
    currentFormat: "현재 ×{value}",
    sliderLabel: "배속 슬라이더",
    applyButton: "적용",
    appliedFormat: "배속이 ×{value}로 적용되었습니다",
    disclaimer: "ⓘ 진행 중 경기 결과는 불변입니다",
  },
  pause: {
    title: "정지 / 재개",
    elapsedFormat: "{elapsed} 경과",
    pauseButton: "정지",
    resumeButton: "재개",
  },
  seed: {
    title: "시드 조회",
    worldSeedLabel: "world_seed",
    seasonSeedLabel: "season_seed",
    seasonSeedContextFormat: "(시즌 {season})",
    matchSeedLabel: "match_seed 조회",
    matchIdPlaceholder: "matchId 입력",
    lookupButton: "조회",
    lookupResultFormat: "{matchId} → {value}",
    notFound: "해당 경기를 찾을 수 없습니다",
  },
  error: {
    accessDenied: "접근 권한이 없습니다.",
  },
};

export type AdminMessages = typeof admin;
