// Task 014(34일차, 4팀) — `/[lang]/sample` 컴포넌트 쇼케이스 전용 카피.
//
// 이 네임스페이스는 도메인 화면 카피가 아니라 **쇼케이스 페이지 자신의 UI 문구**만
// 담는다(섹션 제목·앵커 내비 라벨·미구현 안내). 쇼케이스가 나열하는 각 컴포넌트
// 인스턴스 자체는 자기 네임스페이스(player.*, team.*, stat.* 등)의 키를 그대로 쓴다 —
// 여기서 중복 선언하지 않는다.
export const sample = {
  meta: {
    title: "컴포넌트 쇼케이스",
    description: "화면이 재사용하는 표현 컴포넌트를 카테고리별로 모아 확인합니다.",
  },
  nav: {
    domain: "도메인",
    composite: "복합",
    state: "상태·유틸",
    chart: "차트",
    admin: "어드민",
  },
  section: {
    domainTitle: "도메인 표현 컴포넌트",
    domainDescription: "선수·팀 등 단일 엔티티를 표현하는 컴포넌트 8종.",
    compositeTitle: "복합 컴포넌트",
    compositeDescription:
      "여러 데이터를 조합해 화면 한 조각을 구성하는 컴포넌트 9종(4상태, MatchCard·StandingsTable 포함) + 정적 표시 1종(ZoneLegend).",
    stateTitle: "상태·유틸 컴포넌트",
    stateDescription: "로딩/빈/에러 등 공용 상태와 유틸리티 컴포넌트 6종(4상태 규약 비대상).",
    chartTitle: "차트",
    chartDescription:
      "차트 전용 카테고리는 아직 컴포넌트가 없습니다 — 복합 카테고리의 GrowthChart가 1차 차트 구현입니다(I-152).",
    adminTitle: "어드민",
    adminDescription: "운영 콘솔 전용 컴포넌트는 아직 없습니다.",
  },
  status: {
    notImplemented: "미구현",
    componentCount: "{count}종 등록",
  },
  coverage: {
    // Task 014(38일차) — 커버리지 체크리스트(등록 컴포넌트 수·4상태 구현 수·번역 키 누락
    // 수). 값은 레지스트리/카탈로그를 실제로 세어 채운다(`component-registry.ts`,
    // `@/i18n/coverage`) — 여기 있는 건 라벨 문구뿐, 숫자는 하드코딩하지 않는다.
    title: "커버리지 체크리스트",
    registeredLabel: "등록 컴포넌트",
    fourStateLabel: "4상태 구현",
    fourStateValue: "{implemented}/{eligible}종 ({percent}%)",
    missingKeysLabel: "번역 키 누락",
    missingKeysValue: "{count}건",
  },
  state: {
    toggleLabel: "상태 미리보기 전환",
    loading: "로딩",
    empty: "비어있음",
    error: "에러",
    ready: "정상",
  },
  viewport: {
    toggleLabel: "뷰포트 미리보기 전환",
    mobile: "모바일",
    tablet: "태블릿",
    desktop: "데스크톱",
  },
  locale: {
    toggleLabel: "로케일 미리보기 전환",
    hint: "헤더의 로케일 스위처는 페이지를 이동합니다 — 이 전환은 페이지 이동 없이 즉시 비교합니다.",
  },
  dataSource: {
    toggleLabel: "데이터 어댑터 전환",
    hint: "환경변수 플래그만 바꿔 데이터 소스를 교체합니다 — 컴포넌트 코드는 그대로입니다(UC-602).",
    optionMock: "Mock",
    optionSupabase: "Supabase",
    switching: "전환 중…",
    revertedToMock: "전환에 실패해 이전 어댑터로 되돌렸습니다.",
  },
  // 39일차 — 5팀 Task 016 등록분(ZoneLegend). 4상태 토글 대상이 아니라 정적 예시 2개를
  // 나란히 보여줄 때 각 예시를 구분하는 라벨.
  zoneLegend: {
    tierLabel: "{league} (티어 {tier})",
  },
};

export type SampleMessages = typeof sample;
