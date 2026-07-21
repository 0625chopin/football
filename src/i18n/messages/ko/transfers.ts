// Task 019(40일차, 4팀) — `/[lang]/transfers` 이적/뉴스 피드 전용 네임스페이스.
//
// `news`(NewsItem 소비, 상태 문구)는 아직 5팀 `match.ts`에 임시로 얹혀 있고(I-154 판정
// 대기, 그 파일 헤더 참조) 이 화면도 `NewsItem`을 그대로 재사용하므로 그 `match.news.*`
// 키(빈 목록/에러 문구)를 그대로 쓴다 — 여기서 새로 선언하지 않는다(중복 금지). 이
// 파일은 이 화면 고유의 제목·필터 문구만 담는다. 소식 유형 라벨(영입/임대/은퇴/유소년
// 데뷔/감독 교체/스폰서 부도)도 `enums.newsFeedItemType.*`(3팀)를 그대로 재사용한다 —
// enum 값을 이 네임스페이스에 다시 선언하지 않는다(C-6).
export const transfers = {
  feed: {
    pageTitle: "이적 · 뉴스 피드",
    caption: "영입·임대·은퇴·유소년 데뷔·감독 교체·스폰서 부도 소식을 최신순으로 봅니다.",
  },
  filters: {
    typeLegend: "소식 유형",
    apply: "필터 적용",
  },
};

export type TransfersMessages = typeof transfers;
