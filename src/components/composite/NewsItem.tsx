import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import { formatKickoff } from "@/i18n/format"
import type { TranslationKey } from "@/i18n/keys"
import type { SupportedLocale } from "@/i18n/locales"
import type { NewsFeedItemType, Timestamp } from "@/types"
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
  /**
   * 35일차(Task 015, 5팀, I-169/enums 후속) — 이미 번역된 라벨 문자열이 아니라 원본
   * 엔티티(`NewsFeedItem`, E-26)의 enum 값을 그대로 받는다(필드명은 28일차 계약을 유지 —
   * `src/app/[lang]/sample/page.tsx`(4팀)가 이미 이 이름·enum 값으로 소비 중이라 이름을
   * 바꾸면 그 파일이 깨진다, 실측 확인). 배지 라벨 번역은 이 컴포넌트가 `locale` prop으로
   * 직접 한다(`enums.newsFeedItemType` 경유) — `MatchCard`가 `FixtureStatus` 라벨을 호출부
   * 대신 자신이 번역하는 것과 동일한 경계. 화면마다 각자 번역해 호출하지 않도록, 재사용
   * 가능한 이 복합 컴포넌트가 한 곳에서 담당한다.
   */
  category?: NewsFeedItemType
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
  // enum 값을 그대로 배지에 얹으면 D-18(하드코딩 금지) 위반이라 번역키를 거친다 —
  // `enums.newsFeedItemType`(3팀, 10종 전량)이 모든 `NewsFeedItemType` 멤버를 커버해
  // 이 경로는 항상 존재한다(`PhaseIndicator`의 `enums.seasonPhase.*` 캐스트와 동일 근거).
  const categoryLabel = data.category
    ? t(locale, `enums.newsFeedItemType.${data.category}` as TranslationKey)
    : null

  const body = (
    <>
      <div className="flex items-center gap-2">
        {categoryLabel ? <Badge variant="secondary">{categoryLabel}</Badge> : null}
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
