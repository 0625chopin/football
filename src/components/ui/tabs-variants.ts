/**
 * `tabs.tsx`의 cva 변형 정의 — **`'use client'` 없는 모듈** (44일차, I-222)
 *
 * shadcn 원본은 이 `cva(...)`를 `tabs.tsx` 안에 함께 두지만, 이 저장소에서는 분리한다.
 * `tabs.tsx`는 `'use client'` 파일이라 그 파일의 **모든 export가 RSC 경계에서 client
 * reference로 치환**되고, 그러면 서버 컴포넌트가 `tabsListVariants({ variant })`를 호출해
 * className을 계산하려 할 때 값이 오지 않는다 — 같은 함정이 이 저장소에서 11·38·44일차
 * 세 번 재발했다(`eslint-rules/client-module-exports.mjs` 파일 헤더가 전체 이력의 단일 소스).
 * 이 파일에는 지시자가 없으므로 서버·클라이언트 양쪽에서 안전하게 쓸 수 있다.
 *
 * **shadcn CLI로 `tabs`를 재생성하면 이 분리가 되돌아간다** — 그때는 `tabsListVariants`를
 * 다시 이 파일로 옮기세요(린트 `local-rsc/client-module-exports`가 error로 잡아 줍니다).
 */

import { cva } from "class-variance-authority"

export const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
