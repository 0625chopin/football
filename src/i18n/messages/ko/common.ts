// Task 011(16일차) — 메시지 카탈로그 골격. 값은 `src/app/[lang]/layout.tsx`의
// SiteHeader/SideNav/SiteFooter 하드코딩 문자열(011에서 번역 키로 교체 예정 주석)을
// 그대로 옮긴 것이며, layout.tsx 자체의 실배선은 22일차(LocaleSwitcher.tsx)에 했다.
//
// 22일차: `localeSwitcherPlaceholder`(파라미터화 placeholder)는 실제
// `LocaleSwitcher` 컴포넌트로 교체되며 폐기 — 대신 스위처 자체의 aria-label과 옵션
// 레이블(`localeSwitcherOptionKo`/`En`) 3개 키로 나눈다. 옵션 레이블은 두 로케일
// 카탈로그에서 값이 동일하다(자기 언어의 자체 명칭을 그대로 노출하는 언어 스위처의
// 일반적 UX 관행 — 사용자가 현재 UI 언어를 모르더라도 자신의 언어를 식별할 수 있어야
// 한다). D-17 고유명사와는 다른 이유의 "로케일 불변 문자열"이라 카탈로그에 여전히
// 넣는다(유한 집합 2개, 사람이 리뷰 가능 — i18n/README.md §2.1 판별 질문 참고).
export const common = {
  app: {
    name: "football4",
    devStatus: "개발 진행 중",
    // Task 014(34일차) 팀장 검증 후속 — 루트 레이아웃 `generateMetadata`가 `<meta
    // name="description">`을 로케일별로 내보내도록 여기 번역 키를 신설한다(이전엔
    // metadata 객체에 한글이 하드코딩돼 `/en`에도 그대로 새 나갔다).
    description: "가상 축구 리그 시뮬레이션 · 개발 진행 중",
  },
  header: {
    leagueSwitcherPlaceholder: "리그 선택 (준비 중)",
    seasonPhaseLabel: "시즌 페이즈: {phase} (준비 중)",
    nextKickoffPlaceholder: "다음 킥오프까지 -- (준비 중)",
    localeSwitcherLabel: "언어 선택",
    localeSwitcherOptionKo: "한국어",
    localeSwitcherOptionEn: "English",
  },
  nav: {
    primaryLabel: "주 메뉴",
    // Task 013C(36일차) — 사이드 내비를 3개 그룹으로 묶으면서 신설한 그룹 머리말.
    // 그룹은 장식이 아니라 라우트의 성격(대회/구성원/기록)을 표시한다.
    sectionCompetition: "대회",
    sectionSquad: "구성원",
    sectionRecords: "기록",
    home: "홈",
    leagues: "리그",
    matches: "경기",
    players: "선수",
    teams: "팀",
    stats: "통계",
    playoffs: "플레이오프",
    cup: "컵",
    transfers: "이적",
    awards: "수상",
    archive: "아카이브",
    sponsors: "스폰서",
  },
  footer: {
    devStatus: "football4 · 개발 진행 중",
  },
  action: {
    comingSoon: "준비 중",
    save: "저장",
    cancel: "취소",
    confirm: "확인",
    close: "닫기",
    loading: "불러오는 중…",
  },
  // Task 013A(31일차) — PhaseIndicator. `{phase}`엔 `enums.seasonPhase.*`(3팀 기여)로
  // 이미 번역된 표시명을 주입한다(템플릿·주입값 모두 번역 — i18n/README.md §2.1 정책과
  // `common.header.seasonPhaseLabel`이 이미 쓰는 관례를 그대로 따름). `roundProgress`는
  // 라운드 개념이 없는 페이즈(SETTLEMENT/PRESEASON 등)에서는 소비처가 아예 렌더하지
  // 않도록 선택적으로 쓴다 — `totalRounds` 도메인 필드가 아직 없어(라운드 총수는
  // League.teamCount에서 소비처가 파생) 이 컴포넌트는 값을 계산하지 않고 표시만 한다.
  phase: {
    summary: "시즌 {season} · {phase}",
    roundProgress: "R{current}/{total}",
  },
  // Task 013A(31일차) — CountdownTimer. 카운트다운 환산식은 H-24 계약 범위 밖이라
  // (`docs/wireframe/00-공통규약.md` R-14 ②) 이 컴포넌트는 `kickoffAt`(서버가 배속 반영해
  // 산출한 실제 타임스탬프)까지 클라 tick만 한다. `paused`는 R-14 ④ "정지 상태 표기".
  countdown: {
    nextKickoffLabel: "다음 킥오프",
    paused: "일시정지 중",
  },
  // Task 019(43일차) — `/stats`·`/transfers`·`/awards` 세 화면이 공유하는 "더 보기"
  // 링크 규약(`LoadMoreLink`, `src/components/ui/LoadMoreLink.tsx` 헤더 주석 참조).
  // 화면별 네임스페이스에 중복 선언하지 않고 공용 문구로 둔다.
  pagination: {
    loadMore: "더 보기",
  },
};

export type CommonMessages = typeof common;
