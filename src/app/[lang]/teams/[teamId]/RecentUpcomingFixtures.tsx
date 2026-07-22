"use client";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchCard } from "@/components/composite/MatchCard";
import type { MatchCardData } from "@/components/composite/MatchCard";

/**
 * F8 최근/예정 경기(`06-클럽상세.md`) — 52일차, 화면 로컬(5팀). 행 렌더는 `MatchCard`
 * (composite, `density="row"`)를 그대로 재사용한다 — 새 카드를 만들지 않는다(W-02 이미
 * 3번째 사용처로 지목된 근거를 늘리지 않기 위해서도 재사용이 맞다).
 *
 * ⚠️ **S-9(R-11) — LIVE 행 분리**: 진행 중 경기는 `[최근]`/`[예정]` 어느 탭에도 넣지 않고
 * 항상 상단에 별도로 보여준다(진행 중 경기의 "최종 스코어"를 최근 탭에 넣으면 결과 역산이
 * 된다). 데이터·경과분 계산은 `page.tsx`가 홈(`[lang]/page.tsx`)과 동일하게
 * `getMatchClockContext` + `computeElapsedMinutes`로 이미 채워 넘긴다 — 이 컴포넌트는
 * 계산하지 않는다(H-24 계약, `MatchCard.tsx` 헤더 참조).
 *
 * **미폴링**(I-1, W-36 미승인) — 진입 시 1회 조회만 한다.
 */

export interface RecentUpcomingFixturesProps {
  readonly locale: SupportedLocale;
  readonly live: readonly MatchCardData[];
  readonly recent: readonly MatchCardData[];
  readonly upcoming: readonly MatchCardData[];
}

export function RecentUpcomingFixtures({ locale, live, recent, upcoming }: RecentUpcomingFixturesProps) {
  return (
    <div className="flex flex-col gap-3">
      {live.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-live">{t(locale, "team.match.liveTitle")}</span>
          {live.map((data) => (
            <MatchCard key={data.id} locale={locale} density="row" state={{ status: "ready", data }} />
          ))}
        </div>
      )}

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">{t(locale, "team.match.tabRecent")}</TabsTrigger>
          <TabsTrigger value="upcoming">{t(locale, "team.match.tabUpcoming")}</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          {recent.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">{t(locale, "team.match.emptyRecent")}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recent.map((data) => (
                <MatchCard key={data.id} locale={locale} density="row" state={{ status: "ready", data }} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">{t(locale, "team.match.emptyUpcoming")}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {upcoming.map((data) => (
                <MatchCard key={data.id} locale={locale} density="row" state={{ status: "ready", data }} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
