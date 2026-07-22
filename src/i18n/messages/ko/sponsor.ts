// Task 020(46일차, 4팀) — `/[lang]/sponsors` 스폰서 현황 전용 네임스페이스.
//
// 스폰서명(`Sponsor.name`)·산업(`Sponsor.industry`)은 목업 생성기(`src/lib/mock/world.ts`
// `SPONSOR_NAME_PREFIXES`/`SUFFIXES`/`SPONSOR_INDUSTRIES`)가 만드는 영문 고유명사
// 표시값이다 — 선수·클럽명과 동일하게 번역 대상이 아니므로(D-17과 동일 판단) 변수로
// 그대로 주입하고, 이 파일엔 그 값 목록을 다시 선언하지 않는다.
//
// `contracts.status*` — `SponsorContract.status`(`SponsorContractStatus` E-29)는
// `enums.ts`(3팀 소유)에 아직 라벨이 없다(`betMarketStatus`의 동명 `VOIDED`와 다른
// enum). `enums.ts`를 직접 건드리지 않고(C-6/소유 경로 원칙) `MatchScoreboard.tsx`의
// `NON_LIVE_STATUS` 로컬 매핑과 동일한 패턴으로 이 화면 전용 라벨을 여기 둔다 —
// 필요해지면 3팀에 `enums.ts` 이관을 제안한다(이슈 후보, 보고 참조).
export const sponsor = {
  common: {
    // 금액 단위는 pt 고정, 원화 기호·"원" 표기 금지(L-03). `{amount}`엔 이미
    // `formatPoints()`(`@/i18n/format`)로 로케일 천단위 서식이 적용된 문자열을 넣는다.
    pointsFormat: "{amount} pt",
  },
  page: {
    title: "스폰서 현황",
    caption: "스폰서별 잔고·계약 팀 수·부도 위험과 전체 계약 내역을 확인합니다.",
  },
  list: {
    title: "스폰서 목록",
    empty: "등록된 스폰서가 없습니다.",
    balanceLabel: "잔고",
    reputationLabel: "평판",
    scaleFormat: "규모 {scale}/5",
    contractCountFormat: "계약 {count}팀",
    bankruptBadge: "부도 위험",
  },
  contracts: {
    title: "계약 상세",
    caption: "전체 스폰서 계약 내역입니다.",
    empty: "등록된 스폰서 계약이 없습니다.",
    sponsorHeader: "스폰서",
    teamHeader: "팀",
    ownerHeader: "체결 구단주",
    ownerUnknown: "–",
    periodHeader: "기간",
    periodFormat: "S{start}~S{end}",
    incomeHeader: "시즌당 수익",
    sharePctHeader: "배분율",
    sharePctFormat: "{pct}%",
    statusHeader: "상태",
    statusActive: "활성",
    statusExpired: "만료",
    statusVoided: "무효",
  },
};

export type SponsorMessages = typeof sponsor;
