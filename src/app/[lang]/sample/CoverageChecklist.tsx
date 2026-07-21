import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Task 014(38일차, 4팀) — 커버리지 체크리스트.
 *
 * 3개 항목(등록 컴포넌트 수 / 4상태 구현 수 / 번역 키 누락 수)을 표시하되, 숫자는 전부
 * 호출부(`page.tsx`)가 `component-registry.ts`(`computeComponentCoverage`)와
 * `@/i18n/coverage`(`computeTranslationKeyCoverage`)로 실제로 센 값을 그대로 받는다 —
 * 이 컴포넌트 자신은 어떤 숫자도 계산하거나 하드코딩하지 않는, 순수 표시 컴포넌트다.
 *
 * 각 행의 상태는 기호(✓/!) + 텍스트 라벨을 항상 함께 노출한다 — 색만으로 판정을
 * 구분하지 않는다(NFR-A11Y-002, 컴포넌트 규약 §5). `--promotion`/`--warning` 같은
 * 시맨틱 컬러 토큰은 이 항목들의 의미(코드 커버리지 판정)와 결이 달라 쓰지 않는다.
 */
export interface CoverageChecklistProps {
  readonly locale: SupportedLocale;
  readonly registeredCount: number;
  readonly fourStateImplementedCount: number;
  readonly fourStateEligibleCount: number;
  readonly missingTranslationKeyCount: number;
}

function CoverageRow({ label, value, ok }: { readonly label: string; readonly value: string; readonly ok: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm not-last:border-b not-last:border-border">
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className={cn("font-mono", ok ? "text-foreground" : "text-destructive")}>
          {ok ? "✓" : "!"}
        </span>
        <span className="text-foreground/90">{label}</span>
      </span>
      <span className="scoreboard text-xs text-muted-foreground">{value}</span>
    </li>
  );
}

export function CoverageChecklist({
  locale,
  registeredCount,
  fourStateImplementedCount,
  fourStateEligibleCount,
  missingTranslationKeyCount,
}: CoverageChecklistProps) {
  const fourStatePercent =
    fourStateEligibleCount === 0
      ? 100
      : Math.round((fourStateImplementedCount / fourStateEligibleCount) * 1000) / 10;

  return (
    <Card size="sm" className="gap-3">
      <CardHeader>
        <CardTitle className="eyebrow">{t(locale, "sample.coverage.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          <CoverageRow
            label={t(locale, "sample.coverage.registeredLabel")}
            value={t(locale, "sample.status.componentCount", { count: registeredCount })}
            ok
          />
          <CoverageRow
            label={t(locale, "sample.coverage.fourStateLabel")}
            value={t(locale, "sample.coverage.fourStateValue", {
              implemented: fourStateImplementedCount,
              eligible: fourStateEligibleCount,
              percent: fourStatePercent,
            })}
            ok={fourStateImplementedCount === fourStateEligibleCount}
          />
          <CoverageRow
            label={t(locale, "sample.coverage.missingKeysLabel")}
            value={t(locale, "sample.coverage.missingKeysValue", { count: missingTranslationKeyCount })}
            ok={missingTranslationKeyCount === 0}
          />
        </ul>
      </CardContent>
    </Card>
  );
}
