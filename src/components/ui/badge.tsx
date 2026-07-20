import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Task 012(27일차) — ko/en 텍스트 길이 편차 대응(최대 폭 규약).
// 배지는 좁은 자리(테이블 셀·리스트 행)에 놓이는 경우가 많아, en 표시명이 ko보다 긴 조합
// (예: enums.ts awardType "Manager of the Season")에서 무제한으로 자라면 부모 레이아웃이
// 깨진다. max-w를 ch 단위로 고정해 넘치는 부분을 자른다 — shrink-0은 유지해 형제 요소의
// flex-grow에 의해 예기치 않게 짧아지지 않게 한다(최대치까지는 항상 그 폭을 확보).
// ⚠️ `truncate` 클래스를 썼지만 이 컨테이너는 inline-flex라 **말줄임(…)은 나오지 않는다**
// (text-overflow: ellipsis는 flex item에 적용되지 않는다 — 자식이 익명 flex item으로
// 감싸지기 때문). 실제로는 말줄임 없는 하드 클립이다(27일차 팀장 검증, 기존
// overflow-hidden/whitespace-nowrap과 동일한 동작이라 회귀는 아님). 말줄임이 꼭 필요한
// 소비처는 children을 `<span className="min-w-0 truncate">`로 직접 감쌀 것 — 그리고 클립이
// 발생할 수 있는 표시명을 넘기는 소비처는 접근성을 위해 title 속성을 함께 전달할 것
// (마우스오버 시 전체 텍스트 노출).
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit max-w-[14ch] shrink-0 items-center justify-center gap-1 truncate rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
