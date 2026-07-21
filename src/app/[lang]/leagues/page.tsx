import Link from "next/link";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { EmptyState } from "@/components/state/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { League } from "@/types";
import type { SupportedLocale } from "@/i18n/locales";

/**
 * `/[lang]/leagues` 리그 목록 — **44일차 신설(I-223), 5팀 소유**
 *
 * ## 왜 이 화면이 계획에 없었는가
 * 사이드 내비 11개 중 5개(`leagues`·`matches`·`playoffs`·`teams`·`players`)는 동적 자식
 * 라우트만 있고 인덱스 화면이 없어 누르면 404였다. 36일차에 I-186으로 등재하면서 "인덱스
 * 화면 5종 신설은 Task 016~021 스코프"라고 적고 내비를 `pending: true`(비활성)로 막아
 * 두었으나, **44일차 실사에서 그 전제가 틀렸음이 확인됐다** — Task 016~021의 구현 사항은
 * 전부 상세 화면(`leagues/[leagueId]` 등)이고 인덱스 화면은 한 줄도 없다. 리그를 담당한
 * Task 016은 42일차에 완료 처리돼 만들어질 창구도 닫혔다. 자세한 경위는 `docs/ISSUES.md`
 * I-223.
 *
 * 그래서 이 화면에는 대응하는 와이어프레임이 없다(`docs/wireframe/`의 리그 관련 문서는
 * 02=순위표·03=일정 둘 다 `[leagueId]` 상세다). 명세 없이 만드는 화면이므로 **스코프를
 * 의도적으로 최소화**했다 — `League`(E-02)가 이미 가진 필드만 보여주고, 새 도메인 개념이나
 * 집계(현재 선두 팀, 진행 라운드 등)를 끌어들이지 않는다. 그런 것을 넣으려면 먼저 명세가
 * 있어야 한다(규약: 와이어프레임에 없는 것을 임의로 늘리지 않는다).
 *
 * ## 데이터
 * `getLeagues()` 하나만 호출한다(`DataSource.ts` — "리그 목록: 전역 헤더 리그 스위처
 * ·순위표 진입점 공용"). 티어 오름차순으로 정렬해 1부→3부 순으로 세운다.
 *
 * ## 접근성 — 승강 슬롯은 색 단독으로 구분하지 않는다
 * 승격/플레이오프/강등 3종은 시맨틱 컬러 대상이라 색만으로 의미를 전달할 수 없다
 * (NFR-A11Y-002). `StandingsTable`이 쓰는 것과 **같은 아이콘(▲/◆/▼)과 같은 번역 키
 * (`league.zone.*`)** 를 재사용해 색·아이콘·라벨 3중으로 전달한다 — 두 화면에서 같은
 * 개념이 다른 기호로 보이면 안 되기 때문이다.
 */
export default async function Page(props: PageProps<"/[lang]/leagues">) {
  const { lang } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const leagues = await getDataSource().getLeagues();

  // 티어 오름차순(1부 → 3부). 어댑터의 반환 순서에 의존하지 않는다.
  const ordered = [...leagues].sort((a, b) => a.tier - b.tier);

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t(locale, "league.list.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, "league.list.description")}</p>
      </header>

      {ordered.length === 0 ? (
        <EmptyState
          locale={locale}
          titleKey="league.list.emptyTitle"
          descriptionKey="league.list.emptyDescription"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ordered.map((league) => (
            <li key={league.id}>
              <LeagueCard locale={locale} league={league} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 승강 슬롯 한 줄의 표시 규격. `StandingsTable`의 `ZONE_ICON`/`ZONE_CLASS`와 **같은 기호와
 * 같은 번역 키**를 쓴다(위 파일 헤더 "접근성" 절). 클래스는 완성된 문자열로 나열한다 —
 * 동적 조립은 Tailwind가 정적으로 읽지 못한다.
 */
const SLOT_ROWS = [
  { icon: "▲", className: "text-promotion", labelKey: "league.zone.promotionLabel" },
  { icon: "◆", className: "text-playoff", labelKey: "league.zone.playoffLabel" },
  { icon: "▼", className: "text-relegation", labelKey: "league.zone.relegationLabel" },
] as const;

function LeagueCard({ locale, league }: { readonly locale: SupportedLocale; readonly league: League }) {
  const standingsHref = `/${locale}/leagues/${league.id}`;
  const fixturesHref = `${standingsHref}/fixtures`;

  const slotCounts = [league.promotionSlots, league.playoffTeamCount, league.relegationSlots];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* 리그명은 고유명사라 번역 대상이 아니다(D-17) — 값 그대로 렌더한다. */}
          <span className="text-base">{league.name}</span>
          <span className="eyebrow text-muted-foreground">
            {t(locale, "league.header.tierLabel", { tier: league.tier })} ·{" "}
            {t(locale, "league.header.teamCountFormat", { count: league.teamCount })}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted-foreground">
            {t(locale, "league.list.slotsLabel")}
          </span>
          <ul className="flex flex-col gap-1">
            {SLOT_ROWS.map((row, index) => (
              <li key={row.labelKey} className="flex items-center gap-2 text-sm">
                {/* 아이콘은 장식이 아니라 라벨과 함께 의미를 전달하는 한 쌍이라, 아이콘만
                    aria-hidden 처리하고 옆의 텍스트 라벨이 접근 이름을 담당한다. */}
                <span aria-hidden className={cn("scoreboard", row.className)}>
                  {row.icon}
                </span>
                <span className="text-muted-foreground">{t(locale, row.labelKey)}</span>
                <span className="scoreboard ml-auto">
                  {t(locale, "league.header.teamCountFormat", { count: slotCounts[index] })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* 두 링크는 동등하다 — 어느 쪽도 "선택됨"이 아니므로 `touchline-on`(활성 표시
              초크 바)이나 `--primary`를 쓰지 않는다. 그 둘은 "조작 가능 / 지금 진행 중"
              전용이라, 평범한 이동 링크에 쓰면 강조가 강조를 잃는다(globals.css 규칙). */}
          <Link
            href={standingsHref}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            {t(locale, "league.tab.standingsLabel")}
          </Link>
          <Link
            href={fixturesHref}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            {t(locale, "league.tab.fixturesLabel")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
