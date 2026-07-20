import { generateTeamEmblem } from "@/lib/naming/emblem";
import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";

const SIZE_CLASSES = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
} as const;

export interface TeamBadgeProps {
  readonly locale: SupportedLocale;
  readonly size?: keyof typeof SIZE_CLASSES;
  readonly state: DomainViewState<Pick<Team, "name" | "shortName" | "crestSeed">>;
  readonly className?: string;
}

/**
 * 팀 엠블럼 + 약칭 배지. `crestSeed` 하나로 결정되는 절차적 SVG를 렌더한다.
 *
 * `generateTeamEmblem`이 반환하는 `svg`는 사용자 입력이나 외부 데이터가 전혀 섞이지
 * 않는 순수 함수 산출물(정적 도형 상수 + `crestSeed` 파생 색상만 조립)이라
 * `dangerouslySetInnerHTML`로 삽입해도 XSS 위험이 없다(emblem.ts 참고).
 */
export function TeamBadge({ locale, size = "md", state, className }: TeamBadgeProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (state.status === "loading") {
    return <Skeleton className={cn("rounded-full", sizeClass, className)} />;
  }

  if (state.status === "empty") {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {t(locale, "team.empty.message")}
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span className={cn("text-sm text-destructive", className)}>
        {state.message ?? t(locale, "team.error.loadFailed")}
      </span>
    );
  }

  const { name, shortName, crestSeed } = state.data;
  const emblem = generateTeamEmblem(crestSeed);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* emblem.svg는 aria-hidden 장식용 — 접근 가능한 이름은 이 wrapper가 가진다
          (emblem.ts "소비처가 반드시 알아야 할 것" 참고). currentColor 대비를 위해
          텍스트 색을 명시한다. */}
      <span
        role="img"
        aria-label={t(locale, "team.badge.altText", { name })}
        className={cn("shrink-0 text-black/70 dark:text-white/70", sizeClass)}
        dangerouslySetInnerHTML={{ __html: emblem.svg }}
      />
      <Badge variant="outline">{shortName}</Badge>
    </span>
  );
}
