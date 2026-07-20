import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_TITLE_KEY: TranslationKey = "error.generic.title";
const DEFAULT_DESCRIPTION_KEY: TranslationKey = "error.generic.description";
const DEFAULT_RETRY_LABEL_KEY: TranslationKey = "error.generic.retryLabel";

export interface ErrorStateProps {
  readonly locale: SupportedLocale;
  /** 기본값은 `error.generic.*` — 네트워크 오류 등 더 구체적인 문구가 필요한 소비처만
   * override한다(예: `error.network.title`). */
  readonly titleKey?: TranslationKey;
  readonly descriptionKey?: TranslationKey;
  readonly retryLabelKey?: TranslationKey;
  /** 넘기지 않으면 재시도 버튼 자체를 렌더하지 않는다(재시도가 불가능한 에러). */
  readonly onRetry?: () => void;
  readonly className?: string;
}

/** 라우트 레벨(`error.tsx`) 공용 에러 상태 — 재시도 액션은 `onRetry`로 주입받는다
 * (Next.js `error.tsx`의 `reset()` 등 호출부 사정에 맡긴다). */
export function ErrorState({
  locale,
  titleKey = DEFAULT_TITLE_KEY,
  descriptionKey = DEFAULT_DESCRIPTION_KEY,
  retryLabelKey = DEFAULT_RETRY_LABEL_KEY,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 py-8 text-center", className)}
    >
      <p className="text-sm font-medium text-destructive">{t(locale, titleKey)}</p>
      <p className="text-sm text-muted-foreground">{t(locale, descriptionKey)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t(locale, retryLabelKey)}
        </Button>
      )}
    </div>
  );
}
