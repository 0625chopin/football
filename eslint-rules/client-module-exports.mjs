/**
 * 커스텀 ESLint 룰 — **`'use client'` 모듈은 컴포넌트·훅·타입만 export한다** (44일차, I-222)
 *
 * ## 왜 이 룰이 필요한가 — 같은 함정이 세 번 재발했다
 * RSC 번들러는 `'use client'` 파일의 **모든 export를 client reference로 치환**한다. 그래서 그
 * 파일에 순수 유틸·상수를 두면, 서버 컴포넌트가 그것을 import했을 때 값이 오지 않는다. 문제는
 * 이 실패가 **일관되게 시끄럽지 않다는 것**이다 — 호출하면 런타임 오류지만, 배열·객체를 읽으면
 * 조용히 빈 값으로 평가돼 화면 숫자만 틀린다.
 *
 * 이 저장소에서 실제로 일어난 3건:
 * 1. **11일차(I-74)** — `fetchResult`/`fetchListResult`가 `polling.ts`(`'use client'`)에 있어
 *    서버 컴포넌트가 1회성 `await`에 재사용할 수 없었다 → `fetch-result.ts`로 분리.
 * 2. **38일차(4팀)** — 서버 `sample/page.tsx`가 `StateToggleSlot.tsx`의
 *    `FOUR_STATE_COMPONENT_KEYS`를 읽어 커버리지 배지가 **"0/16"으로 조용히 오표시**됐다
 *    (Playwright 재현 후 구조 변경). 예외가 전혀 나지 않은 사례다.
 * 3. **44일차(I-222)** — 서버 `[lang]/page.tsx`가 `polling.ts`의 `resolvePollIntervalMs`를
 *    호출해 홈이 에러 바운더리로 떨어졌다 → `poll-interval.ts`로 분리.
 *
 * 세 번 모두 "고치고 파일 헤더에 주석을 남긴다"로 끝냈고, 세 번 모두 다음 사람이 다시 밟았다.
 * 그래서 주석이 아니라 린트로 고정한다.
 *
 * ## 강제하는 불변식
 * `'use client'` 파일은 **컴포넌트(PascalCase) · 훅(`use` + 대문자) · 타입만** export한다.
 * 이 조건이 지켜지면 서버가 client 모듈에서 가져올 수 있는 것은 렌더 대상(정상)과 훅(서버에서
 * 호출하면 기존 `react-hooks` 룰이 잡는다)뿐이라, **호출·판독 가능한 순수 값이 경계 뒤에 갇히는
 * 상황 자체가 만들어지지 않는다.**
 *
 * ## 위반했을 때의 해법
 * 그 값을 `'use client'`가 **없는 형제 모듈**로 옮기고, client 파일은 그것을 import해 쓴다.
 * 참조 구현: `src/lib/data/fetch-result.ts`(11일차) · `src/lib/data/poll-interval.ts`(44일차).
 * 값이 client 전용이더라도 옮기는 편이 안전하다 — 지시자 없는 모듈은 양쪽에서 다 쓸 수 있지만,
 * 반대 방향은 불가능하기 때문이다.
 *
 * ## 판정 범위
 * 타입 전용 export(`export type`/`export interface`/`export { type X }`)는 컴파일 시점에
 * 소거돼 client reference 치환 대상이 아니므로 항상 허용한다. `export *`는 무엇이 나가는지
 * 정적으로 알 수 없어 금지한다(현재 사용처 0건).
 */

/**
 * 컴포넌트(PascalCase) 또는 훅(`useXxx`)로 볼 수 있는 이름인가.
 *
 * PascalCase 판정에 **밑줄을 명시적으로 배제**한다(`^[A-Z][A-Za-z0-9]*$`). 단순히 `^[A-Z]`로
 * 보면 `FOUR_STATE_COMPONENT_KEYS` 같은 SCREAMING_SNAKE_CASE 상수가 통과해 버리는데, 그건
 * 컴포넌트가 아니라 **정확히 이 룰이 잡아야 할 데이터 상수**다(38일차 `/sample` 배지 0/16
 * 오표시의 실제 원인이었다 — 룰 최초 작성 시 이 케이스를 놓쳐 실측으로 발견했다).
 */
function isComponentOrHookName(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name) || /^use[A-Z][A-Za-z0-9]*$/.test(name);
}

/** 파일의 진짜 첫 구문이 `'use client'` 지시자인가(Next.js 요구사항과 동일한 판정). */
function hasUseClientDirective(sourceCode) {
  const body = sourceCode.ast.body;
  for (const node of body) {
    if (node.type !== 'ExpressionStatement' || typeof node.directive !== 'string') {
      return false; // 지시자 구간이 끝났다 — 여기까지 못 찾았으면 없는 것
    }
    if (node.directive === 'use client') {
      return true;
    }
  }
  return false;
}

const MESSAGE =
  "`'use client'` 파일은 컴포넌트·훅·타입만 export할 수 있습니다. `{{name}}`은(는) RSC 경계에서 " +
  'client reference로 치환돼, 서버 컴포넌트가 import하면 호출 시 런타임 오류가 나거나 값이 조용히 ' +
  '비어서 평가됩니다(I-222 — 이 저장소에서 11·38·44일차 세 번 재발). 지시자가 없는 형제 모듈로 ' +
  '옮기고 이 파일이 그것을 import하세요 — 참조: src/lib/data/poll-interval.ts, src/lib/data/fetch-result.ts.';

export const clientModuleExportsRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "'use client' 모듈이 컴포넌트·훅·타입 외의 값을 export하는 것을 금지한다 (RSC 경계 함정, I-222)",
    },
    schema: [],
    messages: {
      nonComponentExport: MESSAGE,
      wildcardExport:
        "`'use client'` 파일에서 `export *`는 무엇이 나가는지 정적으로 알 수 없어 금지합니다 " +
        '(컴포넌트·훅·타입만 명시적으로 export하세요, I-222).',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    if (!hasUseClientDirective(sourceCode)) {
      return {};
    }

    function check(node, name) {
      if (!isComponentOrHookName(name)) {
        context.report({ node, messageId: 'nonComponentExport', data: { name } });
      }
    }

    return {
      ExportNamedDeclaration(node) {
        // `export type { X }` / `export type X = ...` — 소거되므로 허용
        if (node.exportKind === 'type') {
          return;
        }

        const decl = node.declaration;
        if (decl) {
          if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
            if (decl.id) check(decl.id, decl.id.name);
            return;
          }
          if (decl.type === 'VariableDeclaration') {
            for (const d of decl.declarations) {
              if (d.id.type === 'Identifier') check(d.id, d.id.name);
            }
          }
          // TSInterfaceDeclaration / TSTypeAliasDeclaration 등은 타입이라 통과
          return;
        }

        for (const spec of node.specifiers) {
          if (spec.exportKind === 'type') continue;
          const exported = spec.exported;
          const name = exported.type === 'Identifier' ? exported.name : exported.value;
          if (typeof name === 'string') check(exported, name);
        }
      },

      ExportAllDeclaration(node) {
        if (node.exportKind === 'type') return;
        context.report({ node, messageId: 'wildcardExport' });
      },
    };
  },
};

/** flat config에 인라인으로 꽂아 쓰는 로컬 플러그인. */
export const localRscPlugin = {
  rules: {
    'client-module-exports': clientModuleExportsRule,
  },
};
