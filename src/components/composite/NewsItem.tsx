import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import { formatKickoff } from "@/i18n/format"
import type { SupportedLocale } from "@/i18n/locales"
import type { Timestamp } from "@/types"
import type { CompositeViewState } from "./types"

// Task 013B(28일차, 5팀) — 뉴스 피드 카드 한 장.
//
// 뉴스는 아직 `src/types/**`에 도메인 엔티티가 없다(동결된 E-01~E-47에 없음) — 화면
// 우선 개발 원칙에 따라 이 파일 안에 최소 표시용 로컬 타입(`NewsItemData`)만 두고,
// 실제 도메인 타입이 생기면 그 타입으로 교체한다(UI는 그대로 두고 데이터 조회부만
// 교체하는 CLAUDE.md 원칙).
export interface NewsItemData {
  id: string
  title: string
  summary: string
  publishedAt: Timestamp
  category?: string
  imageUrl?: string
  href?: string
}

export interface NewsItemProps {
  locale: SupportedLocale
  state: CompositeViewState<NewsItemData>
  className?: string
}

const CARD_CLASS_NAME = "flex flex-col gap-2 rounded-xl border border-border p-4"

export function NewsItem({ locale, state, className }: NewsItemProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="news-item"
        data-status="loading"
        className={cn(CARD_CLASS_NAME, className)}
      >
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="news-item"
        data-status="empty"
        className={cn("p-4 text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.news.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="news-item"
        data-status="error"
        className={cn("p-4 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "match.news.error")}
      </p>
    )
  }

  const { data } = state
  const publishedLabel = formatKickoff(data.publishedAt, locale, "date")

  const body = (
    <>
      <div className="flex items-center gap-2">
        {data.category ? <Badge variant="secondary">{data.category}</Badge> : null}
        <span className="text-xs text-muted-foreground">{publishedLabel}</span>
      </div>
      <h3 className="text-sm font-medium">{data.title}</h3>
      <p className="line-clamp-2 text-sm text-muted-foreground">{data.summary}</p>
    </>
  )

  if (data.href) {
    return (
      <Link
        href={data.href}
        data-slot="news-item"
        data-status="ready"
        className={cn(CARD_CLASS_NAME, "transition-colors hover:bg-muted/50", className)}
      >
        {body}
      </Link>
    )
  }

  return (
    <div
      data-slot="news-item"
      data-status="ready"
      className={cn(CARD_CLASS_NAME, className)}
    >
      {body}
    </div>
  )
}
