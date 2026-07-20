import { messages } from "./messages";

// Task 011(17일차) — 번역 키 네이밍 규약 + 키 상수의 타입 안전 접근.
//
// ## 네이밍 규약
//
//   <namespace>.<component|screen>.<element>
//
//   - namespace   : src/i18n/messages/{ko,en}/*.ts 파일명과 1:1 (현재 8종 —
//                   common, league, match, player, team, stat, admin, error).
//                   enums.*(3팀), match.ts·bet.ts 확장(5팀) 기여분도 이 규약을 따른다.
//   - component|screen : 네임스페이스 내부 1단계 그룹. 화면 전용이면 화면명(예: `detail`,
//                   `list`), 여러 화면이 공유하는 부품이면 컴포넌트명(예: `header`, `nav`).
//   - element     : 최종 리프 키 — 실제 문자열 값을 가리킨다.
//
//   예: "common.header.leagueSwitcherPlaceholder", "error.notFound.title",
//       "match.detail.timelineTitle"
//
//   기존 8개 네임스페이스 전량이 이미 이 3단 구조다(16일차 골격 실사 확인) — 신규 키를
//   추가할 때도 이 규약을 벗어나지 않는다(예: 리프를 네임스페이스 바로 아래 두지 않는다).
//
// ## 타입 안전 접근 — 별도 코드젠 스크립트 대신 컴파일 타임 재귀 타입으로 "생성"한다
//
//   판단 근거:
//   1) 코드젠 스크립트(카탈로그 → 리터럴 유니온 파일 생성)는 카탈로그가 바뀔 때마다 다시
//      실행해야 최신 상태를 유지한다. 이 프로젝트엔 아직 그 실행을 강제할 장치가 없다
//      (Husky/lint-staged 미설치 — CLAUDE.md "Prettier / typecheck 스크립트 / pre-commit
//      훅 없음" 확인). 재실행을 잊으면 생성된 타입이 stale해져 "존재하지 않는 키인데
//      타입은 통과"하는 역효과가 난다.
//   2) `messages` 카탈로그(`./messages`)의 타입에서 TS 재귀 조건부 타입으로 직접 dot-path
//      유니온을 도출하면 별도 실행 스텝 없이 항상 카탈로그와 동기화된다 — 카탈로그에 키를
//      추가/삭제하는 커밋 안에서 TranslationKey도 즉시 갱신된다.
//   3) 현재 규모(8개 네임스페이스 × 최대 3단 중첩)에서 TS 재귀 깊이 문제가 없다(아래
//      keys.type-test.ts의 tsc typecheck로 실측 확인 — 이 프로젝트의 vitest typecheck
//      모드가 이미 실제 tsc 프로세스를 띄운다, vitest.config.ts 참고).
//
//   대안(파일로 리터럴을 뽑아내는 codegen 스크립트)이 필요해지는 시점은 카탈로그가 매우
//   깊어지거나(TS 재귀 한도 근접) 런타임에서도 키 목록 전체를 순회해야 할 때다 — 지금은
//   해당 없어 이슈로만 남긴다(보고 참조).

type Messages = (typeof messages)["ko"];

/**
 * 중첩 객체 타입을 "a.b.c" 형태의 점(dot) 경로 문자열 리터럴 유니온으로 펼친다.
 * 리프(string 값)에 도달한 지점만 완전한 경로로 채택하고, 중간 그룹만으로는 유니온에
 * 포함시키지 않는다 — 네이밍 규약이 항상 3단(namespace.group.element)이도록 강제한다.
 */
type DotPath<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? `${K}`
        : `${K}.${DotPath<T[K]>}`;
    }[keyof T & string];

/**
 * 존재하는 모든 번역 키의 유니온. `messages.ko` 카탈로그(단일 소스)로부터 파생되므로
 * 카탈로그가 바뀌면 이 타입도 같은 컴파일에서 즉시 갱신된다. en 카탈로그는 각 네임스페이스
 * 파일이 ko의 `*Messages` 타입을 그대로 재사용해 구조가 강제로 일치한다(예: en/common.ts의
 * `CommonMessages` import) — 따라서 ko 기준으로만 파생해도 두 로케일 모두를 커버한다.
 */
export type TranslationKey = DotPath<Messages>;

/**
 * 번역 키 리터럴을 타입 체크만 하고 그대로 반환하는 항등 함수.
 *
 * 번역 함수 API(`t()`)와 로케일 Provider는 Task 011의 이후 일차(18~22일차) 몫이다 —
 * 아직 로케일을 인자로 받아 실제 문자열을 조회하는 런타임 배선은 하지 않는다. 그 전까지
 * 다른 팀이 키 상수를 미리 타입 안전하게 참조/보관할 수 있도록 이 헬퍼만 제공한다.
 *
 * 존재하지 않는 키를 넘기면 `TranslationKey`에 속하지 않아 `tsc`가 타입 오류로 잡는다
 * (17일차 수락 기준 — keys.type-test.ts에서 실측 검증).
 */
export function translationKey<K extends TranslationKey>(key: K): K {
  return key;
}
