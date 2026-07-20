import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { Player } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";

/** 배경/글자색 조합 팔레트 — 클래스 문자열을 그대로 써서 Tailwind가 정적으로 인식하게 한다. */
const PALETTE = [
  "bg-red-500/15 text-red-700 dark:text-red-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
] as const;

/** djb2 문자열 해시 — 같은 id는 항상 같은 팔레트 인덱스로 귀결된다(순수 함수, RNG 아님). */
function hashToIndex(value: string, modulo: number): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash) % modulo;
}

/** 공백 기준 최대 2글자 이니셜. name은 고유명사라 그대로 쓴다(D-17, 번역하지 않음). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export interface PlayerAvatarProps {
  readonly locale: SupportedLocale;
  readonly size?: "sm" | "default" | "lg";
  readonly state: DomainViewState<Pick<Player, "id" | "name">>;
  readonly className?: string;
}

/**
 * 선수 아바타 — 이니셜 플레이스홀더. 시드 기반 절차적 아바타 생성기(팀 엠블럼의
 * `generateTeamEmblem`에 대응)는 아직 없어(`Player`에 avatarSeed 없음) 도입 전까지
 * `id` 해시로 결정론적 배경색만 부여한다.
 */
export function PlayerAvatar({ locale, size = "default", state, className }: PlayerAvatarProps) {
  if (state.status === "loading") {
    const skeletonSize = size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8";
    return <Skeleton className={cn("rounded-full", skeletonSize, className)} />;
  }

  if (state.status === "empty") {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {t(locale, "player.empty.message")}
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span className={cn("text-sm text-destructive", className)}>
        {state.message ?? t(locale, "player.error.loadFailed")}
      </span>
    );
  }

  const { id, name } = state.data;
  const paletteClass = PALETTE[hashToIndex(id, PALETTE.length)];

  return (
    <Avatar size={size} className={className} aria-label={t(locale, "player.avatar.altText", { name })}>
      <AvatarFallback className={paletteClass}>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
