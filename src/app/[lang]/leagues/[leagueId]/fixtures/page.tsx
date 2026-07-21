import Link from "next/link";
import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { computeElapsedMinutes, type MatchCardData } from "@/components/composite/MatchCard";
import { RoundNav } from "@/components/composite/RoundNav";
import { TeamBadge } from "@/components/domain/TeamBadge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { t } from "@/i18n/t";
import { formatKickoff } from "@/i18n/format";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { TranslationKey } from "@/i18n/keys";
import type { DataSource } from "@/lib/data/DataSource";
import type { WorldClockSnapshot } from "@/lib/sim/schedule/worldclock";
import type { Fixture, FixtureStatus, LeagueId, SeasonId, Team, TeamId, Timestamp } from "@/types";

/**
 * 42일차 — row 밀도의 비-LIVE 상태 배지(아이콘+라벨). `MatchCard`의 `ROW_STATUS_BADGE`와
 * 매핑은 동일하되(같은 번역키를 가리킨다 — 문구 자체는 중복 선언하지 않는다), 저 상수는
 * 그 컴포넌트 파일 안에 비공개(`export`되지 않음)로 있어 여기서 직접 import할 수 없다.
 * `<table>`로 전환하며 `<td>` 단위로 쪼개 그려야 해서(`MatchCard`는 `<div>` 블록 하나로
 * 상태·팀·점수를 묶어 그린다) 이 화면 로컬 렌더링이 필요해졌다 — 와이어프레임이 애초에
 * `MatchRow`(C2-r)를 "화면 로컬" 컴포넌트로 지정해 둔 이유이기도 하다(§8 사용 컴포넌트).
 */
const NON_LIVE_STATUS_BADGE: Record<Exclude<FixtureStatus, "LIVE">, { icon: string; labelKey: TranslationKey }> = {
  SCHEDULED: { icon: "⏱", labelKey: "match.card.scheduledLabel" },
  FINISHED: { icon: "✓", labelKey: "match.card.finishedLabel" },
  VOID: { icon: "⚠", labelKey: "match.card.voidLabel" },
};

/**
 * `/[lang]/leagues/[leagueId]/fixtures` 일정/결과 — Task 016(41일차, 5팀), 와이어프레임
 * `docs/wireframe/03-일정-결과.md` C1(라운드 네비게이션)·C2(경기 목록)·C3(특수 대진) 구현.
 * B1(리그 헤더·탭)은 순위표 화면과 공유하는 세그먼트 레이아웃(`../layout.tsx`, W-16)이
 * 이미 그린다 — 이 파일은 C1 이하만 담당한다.
 *
 * ## 라운드 = 페이지 단위(무한 스크롤 없음)
 * 리그1은 46라운드 × 12경기 = 552경기라 전량 로드가 불가능하다(화면 목표 §2). 현재 보는
 * 라운드는 `?round=N` 쿼리스트링이 단일 소스이고(I-2 "URL 쿼리에 반영 — 공유·뒤로가기
 * 대응"), 없으면 `getFixtureRoundBounds().currentRound`(진행 중 라운드)로 기본 선택한다
 * (I-1). 범위를 벗어난 값은 clamp한다 — 존재하지 않는 라운드로 빈 화면을 만들지 않는다.
 *
 * ## C2 마크업 — 42일차, I-210 결론: `<table>`로 전환 (41일차 `<ul>` 편차 해소)
 * 41일차엔 `MatchCard`(`density="row"`)를 재사용하려고 `<ul>` + `aria-label`로 마크업했다
 * (그 판단과 근거는 40일차 인계·`docs/dailyWorkLog/41Day.md` 참조, I-210 제보). 오늘
 * 와이어프레임 원문을 다시 확인한 결과 이 화면은 "카드 리스트"가 아니라 명시적으로
 * "표"를 의도한다 — 결론 근거:
 * ① §3-2 데스크톱 목업 캡션이 "2열 그리드, **테이블 시맨틱 유지**"라고 못 박는다.
 * ② §3 본문이 "데스크톱 2열은 시각적 배치만 2열이고 **마크업은 하나의 테이블**을
 *    유지한다(NFR-A11Y-005)"라고 명시한다 — "목록"은 병기일 뿐 대안이 아니다.
 * ③ §7 NFR-A11Y-005가 "C2에 `<caption>`, 열 헤더 `scope="col"`"을 요구하는데, `scope`는
 *    HTML상 `<th>`/표 밖에서 의미가 없다 — 즉 표 시맨틱이 전제다.
 * ④ 자매 화면 B3(순위표, `02-리그-순위표.md` §7)는 이미 실제 `<table>`이고 같은
 *    NFR-A11Y-005를 표로 만족한다 — 두 화면이 같은 요구사항을 다르게 해석할 이유가 없다.
 * 따라서 `<ul>` 유지는 "편차가 아니라 의도"라는 41일차 판단을 재검토해 뒤집는다.
 *
 * `MatchCard`(`<div>` 트리)는 그대로 `<td>` 셀 4개(상태/홈/스코어/원정)로 쪼개 그릴 수
 * 없어(내부에서 이미 하나의 블록으로 합쳐 그린다), 이 화면 로컬로 행을 다시 그린다 —
 * 파일 상단 `NON_LIVE_STATUS_BADGE` 참조. 와이어프레임 §8이 애초에 `MatchRow`(C2-r)를
 * "[신규] 화면 로컬"로 지정해 둔 것과 같은 결론이다(W-02/SP-2 통합 후보는 유지).
 *
 * **데스크톱 2열 시각 배치는 오늘 구현하지 않는다** — CSS Grid/Columns로 `<table>`
 * 자체의 `display`를 바꾸면 Firefox/Chrome 조합에서 암묵적 표 ARIA 시맨틱(row/cell)이
 * 사라지는 알려진 회귀가 있다(표를 만들어 놓고 접근성 트리에서 다시 잃는 꼴). "마크업은
 * 하나의 테이블"이라는 명시 요구가 "2열 시각 배치"보다 우선한다고 판단해, 전 너비 1열
 * 표로 통일했다 — 필요하면 이슈로 남긴다(완료 보고 참조).
 *
 * ## LIVE 경과분 — H-24 계약(2팀 `worldclock.ts`) 그대로
 * 홈 A2(`[lang]/page.tsx`, 34~35일차)와 동일하게 `getMatchClockContext`로 `now`/`clock`을
 * 한 번에 얻고 `computeElapsedMinutes`(`MatchCard`가 내보내는 순수 함수)로 계산한다 — 이
 * 페이지가 직접 `Date.now()`를 부르지 않는다(C-2 단서: UI가 "지금"을 읽는 것 자체는
 * 허용되지만, 여기서는 그조차 필요 없다 — 서버가 이미 세계시각 컨텍스트를 준다).
 *
 * ## 알려진 Mock 데이터 갭 — LIVE 라운드 행의 점수가 항상 비어 있다
 * `getFixturesByRound`(LEAGUE)가 슬라이스하는 `schedule.fixtures`는 라운드 생성 시점에
 * `status='LIVE'`인 한 경기를 항상 지정하지만(`schedule.ts` "matchIdx===0 → LIVE"), 점수는
 * `status==='FINISHED'`일 때만 시뮬레이션되므로(`schedule.ts` 동일 블록) 그 LIVE 경기는
 * 영구히 `homeScore/awayScore = null`이다. 홈 A2가 보여주는 "진짜" 라이브 스코어는 완전히
 * 별개 소스(`progress.liveFixtures`, 독립 시드·독립 fixtureId)에서 온다 — 두 목록이 같은
 * 경기를 가리키지 않아 병합할 방법이 없다(이 페이지에서 즉석으로 새 Mock 생성기를 만들지
 * 않는다, `MockDataSource.ts` 파일 헤더 원칙과 동일). 그래서 이 라운드 목록의 LIVE 행은
 * "LIVE" 배지 + 경과분(킥오프 시각 기준으로는 계산 가능)까지는 정확하지만 점수는 대시
 * (`–`)로 남는다 — 점수를 지어내지 않는다(C-23). **완료 보고에 이슈 후보로 남긴다.**
 *
 * ## C3 특수 대진 — Mock에 TIEBREAK 생성기가 없어 상시 빈 배열(40일차와 동일 판단 유지)
 * `getFixturesByRound({..., competitionType: 'TIEBREAK'})`는 이 Mock 팩토리에서 항상 `[]`다
 * (`MockDataSource.getFixturesByRound` 주석 "이 Mock 팩토리는 재경기 시나리오를 생성하지
 * 않는다"). 배선만 해 두고(조건부 렌더, 데이터 생기면 그대로 동작) 실제로는 오늘 렌더되지
 * 않는다 — B4 두 번째 줄과 같은 근거로 팀장 인계 항목("B4 두 번째 줄 … 제외 유지")을 그대로
 * 따른다.
 */
export default async function Page(
  props: PageProps<"/[lang]/leagues/[leagueId]/fixtures">,
) {
  const { lang, leagueId } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;
  const searchParams = await props.searchParams;
  const seasonId = typeof searchParams.season === "string" ? (searchParams.season as SeasonId) : undefined;

  await bootstrapApp();
  const dataSource = getDataSource();

  const league = await dataSource.getLeague(leagueId as LeagueId);
  if (!league) {
    notFound();
  }

  const [selectedSeason, roundBounds] = await Promise.all([
    resolveSelectedSeason(dataSource, seasonId),
    dataSource.getFixtureRoundBounds({ leagueId: league.id, seasonId }),
  ]);

  const hasSchedule = roundBounds.maxRound > 0;
  const requestedRound = Number(searchParams.round);
  const currentRound = hasSchedule
    ? clampRound(Number.isFinite(requestedRound) ? requestedRound : roundBounds.currentRound, roundBounds)
    : 0;

  const basePath = `/${locale}/leagues/${leagueId}/fixtures`;
  const seasonLabel = selectedSeason
    ? t(locale, "league.header.seasonLabel", { number: selectedSeason.seasonNumber })
    : "";

  if (!hasSchedule) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t(locale, "fixtures.match.emptySchedule")}
        </p>
      </div>
    );
  }

  const [fixtures, specialFixtures] = await Promise.all([
    dataSource.getFixturesByRound({ leagueId: league.id, round: currentRound, seasonId }),
    dataSource.getFixturesByRound({
      leagueId: league.id,
      round: currentRound,
      seasonId,
      competitionType: "TIEBREAK",
    }),
  ]);

  const teamIds = Array.from(
    new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])),
  );
  const [teams, matchClock] = await Promise.all([
    dataSource.getTeamsByIds(teamIds),
    dataSource.getMatchClockContext(fixtures.map((fixture) => fixture.id)),
  ]);
  const teamById = new Map<TeamId, Team>(teams.map((team) => [team.id, team]));

  const cards = fixtures.map((fixture) =>
    buildMatchRowData(fixture, matchClock.clock, matchClock.now, teamById),
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <RoundNav
        locale={locale}
        basePath={basePath}
        currentRound={currentRound}
        minRound={roundBounds.minRound}
        maxRound={roundBounds.maxRound}
        liveRound={roundBounds.currentRound}
        kickoffAt={fixtures[0]?.kickoffAt ?? null}
        seasonParam={seasonId}
      />

      {fixtures.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t(locale, "fixtures.match.emptySchedule")}
        </p>
      ) : (
        <Table className="table-fixed">
          <TableCaption className="sr-only">
            {t(locale, "fixtures.match.caption", {
              league: league.name,
              season: seasonLabel,
              round: currentRound,
            })}
          </TableCaption>
          {/* 헤더 행의 "텍스트"만 sr-only로 감춘다(§3 목업엔 시각적 헤더 행이 없다) — `<thead>`/
              `<th>` 자체를 sr-only로 감추면 `table-fixed`가 열 너비를 첫 행(헤더) 셀 너비에서
              가져오다가 sr-only의 `width:1px`를 열 너비로 오인해 4열이 균등폭으로 무너진다
              (42일차 실렌더 중 발견 — 320px에서 홈 팀명이 통째로 잘렸다). 그래서 `<th>`엔
              데이터 셀과 동일한 폭 클래스를 주고, 시각적으로 비우는 건 `h-0 overflow-hidden`
              (텍스트가 sr-only라 어차피 안 보이지만 셀 자체 높이도 접어 빈 줄을 없앤다)로
              처리한다 — 열 너비 기준은 살리고 화면엔 빈 행이 뜨지 않는다. */}
          <TableHeader>
            {/* 열 폭 — `table-fixed`라 이 첫 행(헤더)의 지정폭이 열 전체 폭을 정한다. 4열
                모두 `width`(고정 px, `min-w`가 아니다 — 시험해 보니 `table-fixed`는 `width`
                없는 열을 `min-w`와 무관하게 잔여폭만 나눠 줘서 팀명이 다시 짓눌렸다)를 준다.
                4열 합(80+128+64+128=400px)이 320px 컨테이너보다 커, 그 초과분이 컨테이너의
                `overflow-x:auto`(수락 기준 "모바일 가로 스크롤 컨테이너")로 스크롤된다 —
                팀명을 문자 0개로 짓뭉개는 것(42일차 실렌더 중 첫 시도에서 재현)보다 스크롤
                한 번이 낫다는 판단이다. */}
            <TableRow className="h-0 border-0">
              <TableHead scope="col" className="h-0 w-20 overflow-hidden p-0">
                <span className="sr-only">{t(locale, "fixtures.match.statusHeader")}</span>
              </TableHead>
              <TableHead scope="col" className="h-0 w-32 overflow-hidden p-0">
                <span className="sr-only">{t(locale, "fixtures.match.homeHeader")}</span>
              </TableHead>
              <TableHead scope="col" className="h-0 w-16 overflow-hidden p-0">
                <span className="sr-only">{t(locale, "fixtures.match.scoreHeader")}</span>
              </TableHead>
              <TableHead scope="col" className="h-0 w-32 overflow-hidden p-0">
                <span className="sr-only">{t(locale, "fixtures.match.awayHeader")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => {
              const hasScore = card.homeScore !== null && card.awayScore !== null;
              const scoreLabel = hasScore
                ? t(locale, "match.card.scoreFormat", { home: card.homeScore, away: card.awayScore })
                : card.status === "SCHEDULED"
                  ? formatKickoff(card.kickoffAt, locale, "time")
                  : "–";
              const isLive = card.status === "LIVE";
              const elapsedLabel =
                isLive && card.elapsedMinutes !== null
                  ? t(locale, "match.card.elapsedFormat", { minute: card.elapsedMinutes })
                  : null;
              // 42일차 팀장 피드백 반영 — 상태 셀 접근명을 상태값 하나로 고정한다.
              // `aria-label`을 이 값 그대로 셀(`<td>`)에 직접 얹으면(아래 TableCell) accname
              // 알고리즘이 자식(늘인 링크 + 텍스트) 순회를 건너뛰어 셀 이름 = 이 문자열
              // 하나가 된다 — 늘인 링크 자신의 접근명(행 전체 요약)은 그 링크 자체의
              // `aria-labelledby`로 별도 계산되므로 영향받지 않는다(자식 엘리먼트의 접근명은
              // 조상의 `aria-label`이 아니라 그 엘리먼트 자신의 속성으로 계산된다).
              const statusLabelText = isLive
                ? t(locale, "match.live.label")
                : t(locale, NON_LIVE_STATUS_BADGE[card.status].labelKey);
              const statusAccessibleLabel = elapsedLabel
                ? `${statusLabelText} ${elapsedLabel}`
                : statusLabelText;
              const statusId = `fx-${card.id}-status`;
              const homeId = `fx-${card.id}-home`;
              const scoreId = `fx-${card.id}-score`;
              const awayId = `fx-${card.id}-away`;

              return (
                // I-4(41Day.md 이전 인계) "행 전체가 링크" — `<tr>`은 앵커가 될 수 없어
                // 첫 셀에 `absolute inset-0`으로 늘인 링크를 겹치는 통상적인 패턴("stretched
                // link")을 쓴다. 링크 자체는 시각 텍스트가 없어 `aria-labelledby`로 나머지
                // 3개 셀(홈/스코어/원정) + 상태 셀의 텍스트를 접근 가능한 이름으로 합성한다
                // — 새 번역 템플릿을 만들지 않고 이미 화면에 그려지는 텍스트를 그대로 쓴다.
                //
                // ⚠️ **늘인 링크가 셀 내용보다 위에 있어야 한다**(`z-20` > 내용 `z-10`).
                // 48일차까지 링크가 `z-0`이라 각 셀의 `relative z-10` 내용(상태 배지·팀명·
                // 점수)이 링크를 완전히 덮었고, 결과적으로 셀 padding의 빈 틈을 정확히
                // 눌렀을 때만 이동했다 — 모바일에서는 그 틈이 사실상 없어 "어디를 눌러도
                // 반응 없음"으로 보였다. 내용에서 `z-10`을 빼는 대신 링크를 올리는 쪽을
                // 택한 이유는, 내용의 `relative z-10`이 `<tr>`의 짝수행 배경(`bg-muted/30`)
                // 위로 올리는 역할도 겸하고 있어서다. 링크는 배경이 없어 위에 있어도
                // 텍스트를 가리지 않는다(텍스트 드래그 선택만 불가 — 행 전체 링크의 통상적
                // 트레이드오프).
                <TableRow key={card.id} className="relative">
                  <TableCell aria-label={statusAccessibleLabel}>
                    <Link
                      href={`/${locale}/matches/${card.id}`}
                      aria-labelledby={`${homeId} ${scoreId} ${awayId} ${statusId}`}
                      className="absolute inset-0 z-20 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    />
                    <span
                      id={statusId}
                      className="relative z-10 flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 text-live">
                          <span aria-hidden className="live-dot" />
                          <span className="eyebrow">{t(locale, "match.live.label")}</span>
                        </span>
                      ) : (
                        <>
                          <span aria-hidden>{NON_LIVE_STATUS_BADGE[card.status].icon}</span>
                          <span className="eyebrow">
                            {t(locale, NON_LIVE_STATUS_BADGE[card.status].labelKey)}
                          </span>
                        </>
                      )}
                      {elapsedLabel && <span className="scoreboard">{elapsedLabel}</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span id={homeId} className="relative z-10 flex min-w-0 items-center gap-1.5 text-sm">
                      {card.homeTeam && (
                        <TeamBadge locale={locale} size="sm" state={{ status: "ready", data: card.homeTeam }} />
                      )}
                      <span className="min-w-0 truncate">{card.homeTeamName}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span id={scoreId} className="scoreboard relative z-10">
                      {scoreLabel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span id={awayId} className="relative z-10 flex min-w-0 items-center gap-1.5 text-sm">
                      <span className="min-w-0 truncate">{card.awayTeamName}</span>
                      {card.awayTeam && (
                        <TeamBadge locale={locale} size="sm" state={{ status: "ready", data: card.awayTeam }} />
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {specialFixtures.length > 0 && (
        <section aria-labelledby="fixtures-special-title" className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
          <h2 id="fixtures-special-title" className="eyebrow text-muted-foreground">
            {t(locale, "fixtures.special.title")}
          </h2>
          <ul className="flex flex-col gap-2">
            {specialFixtures.map((fixture) => {
              const home = teamById.get(fixture.homeTeamId);
              const away = teamById.get(fixture.awayTeamId);
              return (
                <li key={fixture.id}>
                  {t(locale, "fixtures.special.tiebreakLabel")} —{" "}
                  {t(locale, "fixtures.match.vsFormat", {
                    home: home?.name ?? fixture.homeTeamId,
                    away: away?.name ?? fixture.awayTeamId,
                  })}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

interface FixtureRoundBoundsLike {
  readonly minRound: number;
  readonly maxRound: number;
}

function clampRound(round: number, bounds: FixtureRoundBoundsLike): number {
  return Math.min(Math.max(round, bounds.minRound), bounds.maxRound);
}

/**
 * 시즌 선택 해석 — `seasonId`가 주어지면 `getSeasons()`(아카이브 포함) 목록에서 찾고,
 * 없거나 못 찾으면 현재 시즌으로 되돌아간다. `SeasonSelect` 컴포넌트 헤더와 동일하게
 * 오늘 Mock은 시즌이 1건뿐이라 사실상 항상 현재 시즌이지만, 배선은 아카이브 대비다.
 */
async function resolveSelectedSeason(dataSource: DataSource, seasonId: SeasonId | undefined) {
  if (!seasonId) {
    return dataSource.getCurrentSeason();
  }
  const seasons = await dataSource.getSeasons();
  return seasons.find((season) => season.id === seasonId) ?? dataSource.getCurrentSeason();
}

/**
 * `Fixture` → `MatchCardData` 변환 — 홈 페이지 `buildMatchCardData`(`[lang]/page.tsx`)와
 * 동일 골격이되, 이 화면은 4개 상태 전량(SCHEDULED/LIVE/FINISHED/VOID)을 실제로 만난다는
 * 점이 다르다(홈 A2는 LIVE만). `homeTeam`/`awayTeam`은 `MatchCard` row 밀도의 엠블럼 배지용
 * (41일차 신규 선택 필드, 그 파일 헤더 참조) — 조회 실패 시에도 이름 텍스트는 항상 있다.
 */
function buildMatchRowData(
  fixture: Fixture,
  clock: WorldClockSnapshot,
  now: Timestamp,
  teamById: ReadonlyMap<TeamId, Team>,
): MatchCardData {
  const status: FixtureStatus = fixture.status;
  const homeTeam = teamById.get(fixture.homeTeamId);
  const awayTeam = teamById.get(fixture.awayTeamId);

  return {
    id: fixture.id,
    leagueName: "",
    homeTeamName: homeTeam?.name ?? fixture.homeTeamId,
    awayTeamName: awayTeam?.name ?? fixture.awayTeamId,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    status,
    kickoffAt: fixture.kickoffAt,
    elapsedMinutes: status === "LIVE" ? computeElapsedMinutes(fixture.kickoffAt, clock, now) : null,
    homeTeam: homeTeam && { name: homeTeam.name, shortName: homeTeam.shortName, crestSeed: homeTeam.crestSeed },
    awayTeam: awayTeam && { name: awayTeam.name, shortName: awayTeam.shortName, crestSeed: awayTeam.crestSeed },
  };
}
