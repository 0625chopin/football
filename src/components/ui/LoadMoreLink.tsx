import Link from "next/link";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Task 019(43일차, 4팀) — `/stats`·`/transfers`·`/awards` 세 화면(39~41일차)이 제각각
 * `RANK_LIMIT`/`TRANSFER_FEED_LIMIT`/`RANKING_LIMIT` 상수로 표를 고정 상한만 두고
 * "더 보기" 수단이 없던 것을 하나의 규약으로 통일한다.
 *
 * ## 왜 무한 스크롤이 아니라 링크 기반 "더 보기"인가
 * 이 세 화면은 이미 `<form method="get">`/`<Link>` 기반 필터만으로 서버 컴포넌트
 * 경계를 열지 않는 패턴을 확립했다(`stats`/`transfers`/`awards` 페이지 헤더 주석 참조).
 * 무한 스크롤(`IntersectionObserver` + 클라이언트 fetch)은 이 세 화면 전부에 새
 * 클라이언트 경계를 강제하고, `DataSource`(1팀 소유, 8일차 동결)의 세 조회 메서드가
 * `limit`만 받고 `offset`/`cursor`가 없어 페이지 번호식 페이지네이션도 지원하지
 * 않는다. 반면 "다음 링크는 같은 조회를 더 큰 `limit`으로 다시 부른다"는 기존 계약을
 * 전혀 바꾸지 않고 서버 컴포넌트인 채로 구현된다 — 세 메서드 모두 정렬·상한을 서버가
 * 이미 마쳐 내려주므로(R-10) `limit`을 늘려 다시 조회해도 클라이언트 재집계가 없다.
 *
 * ## 규약
 * - 쿼리 파라미터 이름은 항상 `limit`(공유 상수 `LOAD_MORE_QUERY_PARAM` 경유).
 * - "더 있음" 판정은 `결과.length === 요청한 limit`이다(총count 필드가 없다 — 정확히
 *   상한만큼 돌아오면 다음 조각이 있다고 가정하고, 상한 미만이면 소진으로 본다).
 * - 소진 상태에서는 `href`가 `null`이고 이 컴포넌트는 아무것도 렌더하지 않는다(자리
 *   차지 없음 — `EmptyState`처럼 별도 문구를 쓰지 않는다, 페이지네이션은 "더 볼 게
 *   없다"를 알릴 필요가 없는 흔한 UX 관례).
 */
export const LOAD_MORE_QUERY_PARAM = "limit";

export function parseLoadMoreLimit(
  raw: string | readonly string[] | undefined,
  fallback: number,
  max: number,
): number {
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(value) || value < fallback) return fallback;
  return Math.min(value, max);
}

/**
 * 현재 `searchParams`(다른 필터 값은 그대로 보존)에서 `limit`만 `nextLimit`으로
 * 갈아끼운 쿼리 문자열을 만든다. `transfers`의 다중값 체크박스(`type=A&type=B`)처럼
 * 값이 배열인 파라미터도 그대로 반복 유지한다.
 */
export function buildLoadMoreHref(
  searchParams: Readonly<Record<string, string | readonly string[] | undefined>>,
  nextLimit: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === LOAD_MORE_QUERY_PARAM || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    } else {
      params.set(key, value as string);
    }
  }
  params.set(LOAD_MORE_QUERY_PARAM, String(nextLimit));
  return `?${params.toString()}`;
}

export interface LoadMoreLinkProps {
  readonly locale: SupportedLocale;
  /** 다음 페이지 href. 소진 상태면 `null` — 아무것도 렌더하지 않는다. */
  readonly href: string | null;
  readonly className?: string;
}

export function LoadMoreLink({ locale, href, className }: LoadMoreLinkProps) {
  if (!href) return null;

  return (
    <Link
      href={href}
      className={cn(
        "touchline self-center rounded-md border border-border px-4 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {t(locale, "common.pagination.loadMore")}
    </Link>
  );
}
