"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        // 36일차 — `bg-primary`(브랜드 호박색)에서 `bg-chart-2`(차트 잉크)로.
        // 이 프로젝트에서 Progress는 전부 데이터 막대(컨디션·피트니스·스탯)로만 쓰이는데,
        // 브랜드색을 데이터에 쓰면 "누를 수 있음/지금 일어나는 중"을 뜻하는 호박색이
        // 화면 전체에 깔려 강조가 강조를 잃는다(36일차 /sample 1차 렌더에서 확인).
        className="size-full flex-1 bg-chart-2 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
