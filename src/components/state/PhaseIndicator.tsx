import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import type { Season } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PhaseIndicatorRoundProgress {
  readonly current: number;
  readonly total: number;
}

export interface PhaseIndicatorProps {
  readonly locale: SupportedLocale;
  readonly season: Pick<Season, "seasonNumber" | "phase">;
  /**
   * 라운드 진행(`R21/46`) 표기용 — 선택적. `totalRounds`가 도메인 타입에 아직 없어
   * (라운드 총수는 `League.teamCount`에서 소비처가 파생) 이 컴포넌트는 계산하지 않고
   * 받은 값을 표시만 한다. SETTLEMENT/PRESEASON처럼 라운드 개념이 없는 페이즈에서는
   * 소비처가 이 prop 자체를 넘기지 않으면 된다.
   */
  readonly round?: PhaseIndicatorRoundProgress;
  readonly className?: string;
}

/**
 * 시즌·페이즈 인디케이터 — `docs/wireframe/01-홈-라이브센터.md` A1, `07-어드민-운영콘솔.md`
 * G1에서 `CountdownTimer`와 짝을 이뤄 쓰인다("시즌 3 · 정규시즌 R21/46").
 *
 * 정지("일시정지 중") 표기는 이 컴포넌트가 아니라 `CountdownTimer` 몫이다(R-14 ④가
 * 정지 상태 표기를 카운트다운에 귀속시킨다 — `docs/wireframe/00-공통규약.md` 참고).
 * 이 컴포넌트는 순수 표시용이라 loading/empty/error 분기를 갖지 않는다(`domain/**` 8종과
 * 달리 013A 상태·유틸 6종의 30~31일차 표는 이 컴포넌트에 4상태 지원을 요구하지 않음 —
 * 소비처가 데이터 도착 전까지는 `SkeletonBlock`으로 자리를 대신한다).
 */
export function PhaseIndicator({ locale, season, round, className }: PhaseIndicatorProps) {
  // `enums.seasonPhase.${SeasonPhase}` 캐스트 근거는 `[lang]/layout.tsx` SiteHeader의
  // 동일 패턴 주석 참고 — `EnumTranslationCatalog<SeasonPhase>`가 전 멤버 커버를 강제해
  // 이 경로는 항상 존재한다.
  const phaseKey = `enums.seasonPhase.${season.phase}` as TranslationKey;
  const phaseLabel = t(locale, phaseKey);
  const summary = t(locale, "common.phase.summary", {
    season: season.seasonNumber,
    phase: phaseLabel,
  });

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="font-medium">{summary}</span>
      {round && (
        <Badge variant="outline" className="tabular-nums">
          {t(locale, "common.phase.roundProgress", {
            current: round.current,
            total: round.total,
          })}
        </Badge>
      )}
    </div>
  );
}
