"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

// Task 012(27일차) — ko/en 텍스트 길이 편차 대응(테이블 헤더 최소/최대 폭 규약).
// 컬럼별 최장 라벨 길이(승격/순위표 등 실제 헤더 텍스트)는 013A/013B(33일차 이후) 실사용
// 시점에야 확정되므로, 이 프리미티브는 값을 하드코딩하지 않고 메커니즘만 제공한다:
// ① numeric 컬럼(P/W/D/L/Pts 등 숫자 스탯)은 `numeric` prop으로 우측 정렬 + tabular-nums를
//    적용해 로케일이 바뀌어도 자릿수 정렬이 흔들리지 않게 한다. ② 헤더 자체가 넘칠 만큼
//    긴 컬럼(en이 ko보다 긴 경우가 흔함)은 whitespace-nowrap을 유지하고 `Table`이 이미
//    제공하는 `overflow-x-auto` 컨테이너로 가로 스크롤을 허용한다 — 컬럼을 억지로 줄여 헤더가
//    두 줄로 꺾이며 행 높이가 깨지는 것을 막는다. ③ 컬럼별 최소 폭이 필요하면 소비처가
//    `min-w-[Nch]`(두 로케일 중 더 긴 라벨 길이 + 여유 1ch)를 className으로 직접 지정한다.
function TableHead({
  className,
  numeric = false,
  ...props
}: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      data-numeric={numeric || undefined}
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  numeric = false,
  ...props
}: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      data-numeric={numeric || undefined}
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
