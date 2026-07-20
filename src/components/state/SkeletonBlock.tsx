import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface SkeletonBlockProps {
  /** 렌더할 스켈레톤 줄 수. 카드 본문 등 여러 줄 placeholder에 사용. */
  readonly rows?: number;
  readonly className?: string;
  readonly rowClassName?: string;
}

/** 텍스트/카드 로딩 placeholder용 범용 스켈레톤 블록. 도메인 컴포넌트별 개별 shape가
 * 필요 없는 라우트 레벨(`loading.tsx`) 소비처를 위한 것 — 도메인 컴포넌트(TeamBadge 등)는
 * 각자의 `<Skeleton>` shape를 계속 인라인으로 쓴다. */
export function SkeletonBlock({ rows = 1, className, rowClassName }: SkeletonBlockProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn("h-4 w-full", rowClassName)} />
      ))}
    </div>
  );
}
