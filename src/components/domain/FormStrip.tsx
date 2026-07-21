import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";
import { parseForm, type FormResult } from "./form";

/**
 * 36일차 — W를 `default`(브랜드 호박색)로 칠하던 것을 리그 시맨틱색으로 옮겼다.
 *
 * 근거: 호박색은 이 디자인에서 "조작 가능 / 지금 진행 중"을 뜻하는 단 하나의 강조색이라,
 * 승패 기록 같은 정적 데이터에 쓰면 의미가 흐려진다. 승/패는 이미 `--promotion`(상승)·
 * `--relegation`(하락)이라는 방향성 색이 정의돼 있으므로 그 축을 그대로 쓴다.
 *
 * ⚠️ 색은 보조 신호일 뿐이다(NFR-A11Y-002) — 이 배지는 W/D/L 문자를 항상 함께 내고
 * `title`로 전체 라벨도 준다. 색 없이도 판독 가능하다.
 */
const RESULT_VARIANT: Record<FormResult, "secondary" | "destructive"> = {
  W: "secondary",
  D: "secondary",
  L: "destructive", // 종전 그대로 — shadcn `destructive`는 이미 옅은 채움 + 진한 글자다
};

/**
 * 승리만 추가 색을 얹는다. 채움을 15% 틴트로 두고 글자를 `--promotion` 원색으로 쓰는 이유는
 * 대비 때문이다 — `--promotion`을 채움으로 쓰고 흰 글자를 얹으면 다크 모드(L=0.72)에서
 * 대비가 2.2:1로 무너진다. 틴트+원색 글자는 라이트 5.4:1 / 다크 8.3:1로 두 모드 모두
 * WCAG 1.4.3(4.5:1)을 넘는다.
 */
const RESULT_CLASS_NAME: Record<FormResult, string> = {
  W: "bg-promotion/15 text-promotion",
  D: "",
  L: "",
};

const RESULT_LABEL_KEY: Record<FormResult, "team.form.win" | "team.form.draw" | "team.form.loss"> = {
  W: "team.form.win",
  D: "team.form.draw",
  L: "team.form.loss",
};

export interface FormStripProps {
  readonly locale: SupportedLocale;
  /**
   * `Standing.form`/`TeamSeasonStat.currentForm`은 필드명이 달라 `Pick`으로 공유할 수 없어
   * 여기서만 쓰는 로컬 셰이프로 받는다 — 소비처가 원본 필드를 `{ form: standing.form }`처럼 매핑한다.
   */
  readonly state: DomainViewState<{ readonly form: string }>;
  readonly className?: string;
}

/** 최근 5경기 등 폼 문자열("WWDLW")을 W/D/L 배지 스트립으로 시각화한다. */
export function FormStrip({ locale, state, className }: FormStripProps) {
  if (state.status === "loading") {
    return <Skeleton className={cn("h-5 w-24", className)} />;
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

  const { form } = state.data;
  const results = parseForm(form);

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={t(locale, "team.form.altText", { form })}
    >
      {results.map((result, index) => (
        <Badge
          // 같은 결과라도 회차별로 위치가 다르므로 index를 키에 포함한다(값만으로는 중복 가능).
          key={`${index}-${result}`}
          variant={RESULT_VARIANT[result]}
          className={cn("size-5 justify-center rounded-full p-0", RESULT_CLASS_NAME[result])}
          title={t(locale, RESULT_LABEL_KEY[result])}
        >
          {result}
        </Badge>
      ))}
    </span>
  );
}
