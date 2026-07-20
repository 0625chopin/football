/**
 * 1X2 배당 표시 전용 모드 — 확률/배당 계산 결과를 화면에 넘길 표시용 레코드로 변환
 *
 * Task 035 / 34일차(2026-09-04) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 34일차 행: "1차 표시 전용 모드 — 1X2 배당 반환, 베팅 버튼 비활성 전제(FR-BT-014).
 * 표시 형식 decimal 고정(Q-03 기본 가정)". 수락 기준: "표시 전용 플래그 동작".
 *
 * 근거:
 * - FR-BT-014(1차 릴리스 배당 표시 전용 모드): 배팅 없이 배당만 표시, 베팅 버튼은
 *   비활성 + "곧 오픈" 안내. 수용 기준 ①경기 카드·상세에 1X2 배당 표시 ②베팅 제출
 *   API가 1차 빌드에 노출되지 않음.
 * - Q-03(배당 표시 형식): 1차는 decimal만 지원(분수·미국식 미지원, 2차 이후 재검토).
 *
 * ## 이 파일의 책임
 * `overround.ts`가 만든 `SelectionOdds`(셀렉션 키 → decimal odds, 이미 소수 둘째
 * 자리 반올림)를 받아 **화면이 그대로 렌더링할 수 있는 순수 데이터**로 감싼다.
 * - `format`: 항상 `'decimal'` (Q-03 — 하드코딩이 아니라 1차 릴리스 범위의 고정값이며,
 *   분수/미국식이 2차에 추가되면 이 필드로 분기할 자리를 미리 열어 둔다).
 * - `bettingEnabled`: 항상 `false`. 입력값·옵션으로 덮어쓸 파라미터 자체를 두지 않는다 —
 *   FR-BT-014 수용 기준 ②(베팅 제출 API 비노출)를 이 모듈 경계에서부터 강제하기 위함이며,
 *   소비 측(4팀 `/sample`, 5팀 홈 화면)은 이 값으로 베팅 버튼을 비활성화하고 "곧 오픈"
 *   문구를 노출한다(문구 자체는 i18n 카탈로그 소관, 4팀).
 *
 * ## 표시 문자열은 여기서 만들지 않는다 (H-09 단일 경유지 원칙)
 * `src/i18n/format.ts`(4팀 소유, Task 011)의 `formatOdds(decimalOdds, locale)`가 이미
 * "배당 소수 2자리 로케일 표기"의 단일 경유지다(같은 파일 주석 — 포인트·배당은 화면이
 * 각자 서식을 만들지 않고 이 함수만 거친다). 이 파일이 별도로 `toFixed`류 문자열을
 * 만들면 로케일 추가·자릿수 상수 변경 시 두 곳이 어긋난다. 그래서 패널은 **원시
 * `decimalOdds` 숫자만** 반환하고, 화면 문자열은 소비 측이 `formatOdds`로 만든다.
 * 이 계층은 로케일을 모르는 순수 계층으로 남는다.
 *
 * ## 화면 소비 계약
 * 순수 함수만 노출한다 — React·데이터소스·엔진 호출 없음. 이 팀 소유 경로
 * `src/lib/odds/**`는 "엔진 호출만" 원칙이고 이 파일은 그마저도 하지 않는다: 상위에서
 * `computeMatchOutcomeMarket`(match-market.ts) + `computeMarketOdds`(overround.ts)로 만든
 * `SelectionOdds`를 인자로 받아 표시용으로 감싸기만 한다. UI 컴포넌트는 4·5팀 소유라
 * 여기서 만들지 않는다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` / `react` / `@supabase/*` 사용 0건.
 */

import type { MatchOutcomeKey } from './match-market';
import type { SelectionKey, SelectionOdds } from './overround';

/** 1X2 셀렉션 표시 순서 — 화면에는 항상 승/무/패 순으로 노출한다. */
const MATCH_SELECTION_DISPLAY_ORDER: readonly MatchOutcomeKey[] = ['HOME', 'DRAW', 'AWAY'];

/** 1차 릴리스 고정 표시 형식(Q-03). 분수/미국식은 2차 이후 논의 대상이라 아직 없다. */
export type OddsDisplayFormat = 'decimal';

/**
 * 화면에 그대로 넘길 셀렉션 1건. 표시 문자열은 여기 없다 — 소비 측이
 * `formatOdds(decimalOdds, locale)`(`src/i18n/format.ts`, H-09 단일 경유지)로 만든다.
 */
export interface OddsSelectionDisplay {
  readonly key: SelectionKey;
  /** `overround.ts`가 만든 원시값(이미 소수 둘째 자리 반올림) */
  readonly decimalOdds: number;
}

/**
 * 배당 표시 패널 — FR-BT-014 1차 표시 전용 모드의 반환 계약.
 * `bettingEnabled`는 이 모듈이 만드는 값 중 유일하게 **항상 상수**다(리터럴 타입 `false`로
 * 고정해 호출부가 다른 값을 넣을 수 없다).
 */
export interface OddsDisplayPanel {
  readonly format: OddsDisplayFormat;
  /** FR-BT-014: 1차 릴리스는 항상 false. 호출부가 override할 방법이 없다. */
  readonly bettingEnabled: false;
  readonly selections: readonly OddsSelectionDisplay[];
}

/**
 * decimal odds가 표시 가능한 유한 양수인지 검증한다. `formatOdds`(4팀 소유)에는 없는
 * 방어라 문자열 생성을 걷어낸 뒤에도 별도로 남긴다 — 잘못된 값을 그대로 패널에 실어
 * 화면까지 전달되는 것을 여기서 막는다.
 */
function assertValidDecimalOdds(decimalOdds: number): void {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 0) {
    throw new RangeError(`decimalOdds: 유한한 양수여야 합니다 (받은 값: ${decimalOdds})`);
  }
}

/**
 * 임의 마켓(셀렉션 키 → decimal odds)을 표시 패널로 감싼다. 셀렉션 순서는
 * `selectionOdds`의 키 순서를 그대로 따른다 — 순서 보장이 필요하면(경기 1X2 등)
 * `toMatchOddsDisplayPanel`처럼 전용 함수로 순서를 명시한다.
 */
export function toOddsDisplayPanel(selectionOdds: SelectionOdds): OddsDisplayPanel {
  const selections = Object.keys(selectionOdds).map((key) => {
    const decimalOdds = selectionOdds[key];
    assertValidDecimalOdds(decimalOdds);
    return { key, decimalOdds };
  });
  return { format: 'decimal', bettingEnabled: false, selections };
}

/**
 * 경기 1X2 마켓 전용 — `overround.computeMarketOdds(computeMatchOutcomeProbabilities(...))`
 * 결과를 승/무/패 순으로 정렬한 표시 패널로 만든다. 확률 0으로 제외된 셀렉션은
 * (FR-BT-005 "확률 0 셀렉션은 마켓에서 제외") `selectionOdds`에 키 자체가 없으므로
 * 여기서도 그대로 빠진다 — 없는 값을 0이나 placeholder로 채우지 않는다.
 */
export function toMatchOddsDisplayPanel(selectionOdds: SelectionOdds): OddsDisplayPanel {
  const selections = MATCH_SELECTION_DISPLAY_ORDER.filter((key) => key in selectionOdds).map((key) => {
    const decimalOdds = selectionOdds[key];
    assertValidDecimalOdds(decimalOdds);
    return { key, decimalOdds };
  });
  return { format: 'decimal', bettingEnabled: false, selections };
}
