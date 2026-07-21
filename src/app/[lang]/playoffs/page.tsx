import Link from "next/link";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { formatKickoff } from "@/i18n/format";
import { resolveBracketWinnerSide, type BracketMatchSlot } from "@/components/composite/BracketTree";
import { EmptyState } from "@/components/state/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Fixture, League, Team, TeamId, Timestamp } from "@/types";
import type { SupportedLocale } from "@/i18n/locales";

/**
 * `/[lang]/playoffs` 플레이오프 인덱스 — **50일차 신설(I-223, 49일차 Task 048 배정)**.
 *
 * ## 이 화면의 성격 — 대진표가 아니라 대회 선택 화면
 * 사이드 내비 잔여 3종(경기·플레이오프·팀) 중 플레이오프는 49일차에 Task 048로 정식
 * 배정됐다(`docs/ISSUES.md` I-223 — 44일차 리그·49일차 선수와 같은 경위: Task 020의
 * 구현 사항은 전부 `[leagueId]` 상세이고 인덱스는 없었다). 대응 와이어프레임이 없으므로
 * 44일차 `leagues/page.tsx`·49일차 `players/page.tsx`와 같은 최소 스코프 원칙을 따른다.
 *
 * `[leagueId]` 상세(`playoffs/[leagueId]/page.tsx`)는 `BracketTree`/`BracketViewport`로
 * 대진 전체를 그리지만, 이 인덱스는 **리그 3개 중 어디로 들어갈지 고르는 화면**이라
 * `BracketTree`를 쓰지 않는다 — 카드 하나에 슬롯 수·생성 라운드 수·다음 경기(또는 대회가
 * 끝났으면 최종 라운드 결과)만 요약한다. 승자 판정만 `BracketTree.tsx`가 export하는
 * `resolveBracketWinnerSide()`를 재사용한다(중복 구현 금지, `cup/page.tsx`와 동일 판단).
 *
 * ## 데이터
 * `getLeagues()` × 리그별 `getPlayoffBracket({ leagueId })`. `Fixture[]`가 비어 있으면
 * "대진 미생성" 빈 상태 카드를 그대로 렌더한다 — **I-227**(mock 리그1 WC 절삭)로 실제
 * 생성 라운드 수가 명세(10팀 기준)와 달라도 이 화면은 어댑터 반환값을 정직하게 보여줄 뿐,
 * "정상" 라운드 수를 별도로 가정하지 않는다.
 *
 * ## 다음 경기 vs 최종 라운드 결과
 * `status !== 'FINISHED'`인 경기 중 `kickoffAt` 오름차순 첫 건을 "다음 경기"로 보여준다.
 * 그런 경기가 하나도 없으면(전 경기 종료) 최고 `round` 경기를 "최종 라운드 결과"로 보여준다
 * — 스코어는 이미 종료된 경기의 것이라 미래 정보 비노출(C-23) 대상이 아니다. 진행 중(LIVE)
 * 경기는 종료 전이므로 자연히 "다음 경기" 분기로 들어가고 점수를 노출하지 않는다. 요약 계산은
 * 화면 로컬 순수 함수(`summarizePlayoffBracket`)로 호출부에서 미리 끝내고, 카드 컴포넌트는
 * 계산된 값만 받는다(`MatchCard`가 경과분을 직접 계산하지 않는 것과 동일한 판단).
 *
 * ## `/cup` 링크
 * 컵대회는 3개 리그 통합 단일 토너먼트라 리그 카드 목록에 넣을 수 없다. 별도 섹션으로
 * 아래에 두어, 이 화면이 "플레이오프 리그 3개 + 컵 1개" 4갈래 대회 선택 화면이 되게 한다.
 */
export default async function Page(props: PageProps<"/[lang]/playoffs">) {
  const { lang } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const leagues = [...(await dataSource.getLeagues())].sort((a, b) => a.tier - b.tier);

  const cards = await Promise.all(
    leagues.map(async (league) => {
      const fixtures = await dataSource.getPlayoffBracket({ leagueId: league.id });
      if (fixtures.length === 0) {
        return { league, summary: null };
      }
      const teamIds = Array.from(
        new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])),
      );
      const teamById = new Map(
        (await dataSource.getTeamsByIds(teamIds)).map((team) => [team.id, team] as const),
      );
      return { league, summary: summarizePlayoffBracket(fixtures, teamById) };
    }),
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t(locale, "match.playoffsList.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, "match.playoffsList.description")}</p>
      </header>

      {leagues.length === 0 ? (
        <EmptyState
          locale={locale}
          titleKey="league.list.emptyTitle"
          descriptionKey="league.list.emptyDescription"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ league, summary }) => (
            <li key={league.id}>
              <PlayoffCard locale={locale} league={league} summary={summary} />
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, "match.playoffsList.cupSectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {t(locale, "match.playoffsList.cupSectionDescription")}
          </p>
          <Link
            href={`/${locale}/cup`}
            className="w-fit rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            {t(locale, "match.playoffsList.cupLinkLabel")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 대진 요약 — 대회가 끝나지 않았으면 다음 경기, 끝났으면 최종 라운드 결과.
 * 팀 이름 조회 실패(방어적 케이스)는 `null`로 두고 카드 컴포넌트가 `match.bracket.tbd`로
 * 번역해 채운다 — 이 함수는 로케일을 몰라도 되게 순수하게 둔다.
 */
type PlayoffBracketSummary =
  | {
      readonly kind: "next";
      readonly roundCount: number;
      readonly homeName: string | null;
      readonly awayName: string | null;
      readonly kickoffAt: Timestamp;
    }
  | {
      readonly kind: "final";
      readonly roundCount: number;
      readonly winnerName: string | null;
      readonly winnerScore: number;
      readonly loserName: string | null;
      readonly loserScore: number;
    };

function summarizePlayoffBracket(
  fixtures: readonly Fixture[],
  teamById: ReadonlyMap<TeamId, Team>,
): PlayoffBracketSummary {
  const roundCount = new Set(fixtures.map((fixture) => fixture.round)).size;

  const pending = [...fixtures]
    .filter((fixture) => fixture.status !== "FINISHED")
    .sort((a, b) => {
      if (a.kickoffAt !== b.kickoffAt) return a.kickoffAt < b.kickoffAt ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  if (pending.length > 0) {
    const next = pending[0];
    return {
      kind: "next",
      roundCount,
      homeName: teamById.get(next.homeTeamId)?.name ?? null,
      awayName: teamById.get(next.awayTeamId)?.name ?? null,
      kickoffAt: next.kickoffAt,
    };
  }

  const maxRound = Math.max(...fixtures.map((fixture) => fixture.round));
  const [finalFixture] = [...fixtures]
    .filter((fixture) => fixture.round === maxRound)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const home = teamById.get(finalFixture.homeTeamId);
  const away = teamById.get(finalFixture.awayTeamId);
  const slot: BracketMatchSlot = {
    matchId: finalFixture.id,
    home: home ? { teamId: home.id, name: home.name, shortName: home.shortName } : null,
    away: away ? { teamId: away.id, name: away.name, shortName: away.shortName } : null,
    homeScore: finalFixture.homeScore,
    awayScore: finalFixture.awayScore,
    wentToPenalties: finalFixture.pkHome != null && finalFixture.pkAway != null,
    homePenaltyScore: finalFixture.pkHome,
    awayPenaltyScore: finalFixture.pkAway,
  };
  const winnerSide = resolveBracketWinnerSide(slot);
  const winnerTeam = winnerSide === "away" ? away : home;
  const loserTeam = winnerSide === "away" ? home : away;
  const winnerScore = (winnerSide === "away" ? finalFixture.awayScore : finalFixture.homeScore) ?? 0;
  const loserScore = (winnerSide === "away" ? finalFixture.homeScore : finalFixture.awayScore) ?? 0;

  return {
    kind: "final",
    roundCount,
    winnerName: winnerTeam?.name ?? null,
    winnerScore,
    loserName: loserTeam?.name ?? null,
    loserScore,
  };
}

function PlayoffCard({
  locale,
  league,
  summary,
}: {
  readonly locale: SupportedLocale;
  readonly league: League;
  readonly summary: PlayoffBracketSummary | null;
}) {
  const bracketHref = `/${locale}/playoffs/${league.id}`;
  const tbd = t(locale, "match.bracket.tbd");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* 리그명은 고유명사라 번역 대상이 아니다(D-17) — 값 그대로 렌더한다. */}
          <span className="text-base">{league.name}</span>
          <span className="eyebrow text-muted-foreground">
            {t(locale, "league.header.tierLabel", { tier: league.tier })}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="eyebrow text-muted-foreground">
              {t(locale, "match.playoffsList.slotsLabel")}
            </dt>
            <dd className="scoreboard">
              {t(locale, "league.header.teamCountFormat", { count: league.playoffTeamCount })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="eyebrow text-muted-foreground">
              {t(locale, "match.playoffsList.roundsGeneratedLabel")}
            </dt>
            <dd className="scoreboard">
              {t(locale, "match.playoffsList.roundsGeneratedFormat", {
                count: summary?.roundCount ?? 0,
              })}
            </dd>
          </div>
        </dl>

        {summary === null ? (
          <EmptyState
            locale={locale}
            titleKey="match.playoffsList.bracketEmptyTitle"
            descriptionKey="match.playoffsList.bracketEmptyDescription"
            className="py-4"
          />
        ) : summary.kind === "final" ? (
          <div className="flex flex-col gap-1">
            <span className="eyebrow text-muted-foreground">
              {t(locale, "match.playoffsList.finalResultLabel")}
            </span>
            <span className="text-sm">
              {t(locale, "match.cup.matchupFormat", {
                winner: summary.winnerName ?? tbd,
                winnerScore: summary.winnerScore,
                loserScore: summary.loserScore,
                loser: summary.loserName ?? tbd,
              })}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="eyebrow text-muted-foreground">
              {t(locale, "match.playoffsList.nextMatchLabel")}
            </span>
            <span className="text-sm">
              {t(locale, "match.upcoming.matchupFormat", {
                home: summary.homeName ?? tbd,
                away: summary.awayName ?? tbd,
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              {t(locale, "fixtures.round.kickoffLabel", {
                time: formatKickoff(summary.kickoffAt, locale, "dateTime"),
              })}
            </span>
          </div>
        )}

        <Link
          href={bracketHref}
          className="w-fit rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {t(locale, "match.playoffsList.detailLinkLabel")}
        </Link>
      </CardContent>
    </Card>
  );
}
