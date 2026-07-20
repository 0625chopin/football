import { t, type TranslationParams } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  readonly locale: SupportedLocale;
  /** 소비처가 자기 네임스페이스의 키를 주입한다(예: `team.empty.message`) — 이 컴포넌트는
   * 특정 네임스페이스를 하드코딩하지 않는다. */
  readonly titleKey: TranslationKey;
  readonly descriptionKey?: TranslationKey;
  readonly params?: TranslationParams;
  readonly icon?: React.ReactNode;
  readonly className?: string;
}

/** 목록/컬렉션이 비어 있을 때 쓰는 라우트 레벨 공용 빈 상태. 메시지는 항상 번역 키
 * 경유로만 받는다(하드코딩 문자열 prop 없음). */
export function EmptyState({
  locale,
  titleKey,
  descriptionKey,
  params,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 py-8 text-center text-muted-foreground",
        className,
      )}
    >
      {icon}
      <p className="text-sm font-medium">{t(locale, titleKey, params)}</p>
      {descriptionKey && <p className="text-sm">{t(locale, descriptionKey, params)}</p>}
    </div>
  );
}
