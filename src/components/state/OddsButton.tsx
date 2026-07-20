import { t } from "@/i18n/t";
import { formatOdds } from "@/i18n/format";
import type { SupportedLocale } from "@/i18n/locales";
import type { BetSelection, Odds } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface OddsButtonProps {
  readonly locale: SupportedLocale;
  readonly selection: Pick<BetSelection, "label">;
  readonly odds: Pick<Odds, "decimalOdds">;
  readonly className?: string;
}

/**
 * 배당 표시 버튼 — **1차는 표시 전용, 비활성 모드만**(FR-BT-014,
 * `docs/wireframe/01-홈-라이브센터.md` A2-o / `04-경기상세-라이브중계.md` D7).
 *
 * 의도적으로 `onClick`/`onSelect` 등 어떤 상호작용 prop도 받지 않는다 — 팀장 지시
 * "배팅 동작 연결 금지"를 이 컴포넌트가 **물리적으로** 지키게 하기 위함이다(prop이
 * 없으면 소비처가 실수로도 클릭 핸들러를 연결할 수 없다). `disabled`는 항상 true로
 * 고정하며 prop으로 열어두지 않는다 — 활성화가 필요해지는 2차 배팅 엔진 연결 시점에
 * 별도 판단(래핑/교체)이 필요하다.
 *
 * `selection.label`은 `BetSelection.label`(betting.ts) 타입 그대로 `string`을 받아
 * 그대로 렌더한다 — 그 필드 자체가 "번역 대상 여부는 소비 시점 확정"으로 아직 미정이라
 * (betting.ts E-34 주석), 이 컴포넌트가 임의로 번역 키로 취급하지 않는다.
 */
export function OddsButton({ locale, selection, odds, className }: OddsButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled
      title={t(locale, "common.action.comingSoon")}
      className={cn("flex h-auto min-w-[6ch] flex-col items-center gap-0.5 px-3 py-1.5", className)}
    >
      <span className="text-xs text-muted-foreground">{selection.label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {formatOdds(odds.decimalOdds, locale)}
      </span>
    </Button>
  );
}
