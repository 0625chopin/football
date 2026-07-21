import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import type { PublicPlayerProfile } from "@/lib/data/DataSource";
import { formatPoints } from "@/i18n/format";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { SupportedLocale } from "@/i18n/locales";
import { AbilityRadar } from "@/components/domain/AbilityRadar";
import { computeCategoryAverages, RADAR_CATEGORY_ORDER } from "@/components/domain/radar";
import { ConditionGauge } from "@/components/domain/ConditionGauge";
import { PositionMap } from "@/components/domain/PositionMap";
import { PlayerAvatar } from "@/components/domain/PlayerAvatar";
import { TeamBadge } from "@/components/domain/TeamBadge";
import { StatBar } from "@/components/domain/StatBar";
import { GrowthChart } from "@/components/composite/GrowthChart";
import { InjuryTimeline } from "@/components/composite/InjuryTimeline";
import { TrophyCase } from "@/components/composite/TrophyCase";
import type { TrophyCaseAwardRow, TrophyCaseTrophyRow } from "@/components/composite/TrophyCase";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayerStatTable, sortPlayerStatSeasonRows } from "./PlayerStatTable";
import type { PlayerStatTableSeasonRow } from "./PlayerStatTable";
import { TransferHistoryList, buildTransferHistoryRows } from "./TransferHistoryList";
import type {
  Injury,
  PlayerAttribute,
  PlayerAttributeValues,
  PlayerId,
  PlayerPosition,
  PlayerState,
  Position,
  SeasonId,
  Team,
  TeamId,
} from "@/types";

/**
 * `/[lang]/players/[playerId]` 선수 상세 — Task 018(49~50일차, 5팀), 와이어프레임
 * `docs/wireframe/05-선수상세.md`. 49일차에 E1(프로필 헤더)·E1-r(지표 스트립, D-34)·
 * E2(능력치)·E3(컨디션·피로)·E4(포지션 맵)를 구현했고, **50일차(2/2)가 E5(몸값·계약)·
 * E6(스탯 [시즌별]/[통산])·E7(성장 곡선)·E8(부상 타임라인)·E9(커리어 이력 [트로피]/
 * [이적])를 채운다.** ⚠️ **PA(잠재능력) 원값은 이 파일 어디에도 없다** — 모든 선수
 * 표시 데이터는 `PublicPlayerProfile`(`Omit<Player, 'pa'>`)과 `pa` 필드 자체가 없는
 * 타입(`PlayerAttribute`/`PlayerAttributeHistory`)만 거친다. 성장 곡선(E7)에 PA
 * 상한선을 그리지 않는 것도 같은 이유 — `GrowthChart`가 애초에 `ovr`/`seasonNumber`만
 * 읽는다(그 파일 헤더 참조).
 *
 * ## 데스크톱 2컬럼(3-2절) — `lg`(1024px)부터 좌 40%/우 60%
 * 좌 컬럼 = E2·E3·E4·E5, 우 컬럼 = E6·E7·E8·E9(와이어프레임 3-2절 그대로). `sm`(375px)은
 * 이 프로젝트에서 320px과 동일 취급(I-184)이라 레이아웃 전환에 쓰지 않는다 — 전환점은
 * `lg` 하나만 쓴다. 768~1023(`md`, "E6만 전폭") 중간 단계는 오늘 스코프에서 생략했다
 * (좌우 컬럼과 전폭 3종 조합이 필요해 공수 대비 이득이 낮다고 판단, `PositionMap` I-250
 * 선례와 같은 성격의 축소 — 이슈 후보로 보고). `md` 미만(모바일)은 계속 3-1절 단일 컬럼
 * 순서(E1→E9)다.
 *
 * ## E1 헤더 실패 = 페이지 전체 에러 (§5 4상태 명세)
 * `getPlayerProfile`이 `null`이면 선수 존재 자체가 불확실하므로 `notFound()`로 페이지
 * 전체를 처리한다. 그 아래 섹션들은 각자 독립 조회하며, 조회가 `null`/빈 배열이면 해당
 * 섹션만 `DomainViewState`/`CompositeViewState`의 `empty`로 내려보낸다(섹션 단위 격리).
 *
 * ## E1-r 지표 스트립 — 어떤 시즌 행을 "현재/지난 시즌"으로 보는가
 * `getPlayerSeasonStats`는 시즌×대회 전량을 반환한다. LEAGUE 대회 행만 걸러 `getSeasons()`의
 * `seasonNumber`로 내림차순 정렬해 가장 최근 행을 "현재 시즌", 그다음을 "지난 시즌"으로
 * 삼는다(데뷔 시즌이면 지난 시즌 행이 없어 그 항목을 생략). 리그 벤치마크는 현재 시즌 행의
 * `seasonId`/`leagueId`로 `getLeagueAverageRating`을 조회한다(D-34 결정③). ⚠️
 * `getPlayerRecentMatchStats`는 어댑터 레벨에서 `FINISHED` 경기만 반환하는 데이터 계약이라
 * 이 화면은 받은 값을 그대로 쓴다(재필터링 없음, 와이어프레임 05 S-5~S-8).
 *
 * ## E3 가용성 배지 — 정지 > 부상(KNOCK 제외) > 부상(KNOCK) > 가능 순
 * `PlayerState.suspensionRemainingLeague/Cup`이 있으면 정지가 최우선이다. 그 외
 * `activeInjuryId`가 있으면 `getPlayerInjuries`에서 같은 id를 찾아 `severity`를 본다 —
 * `KNOCK`(경미)은 FR-PL-009 ②에 따라 "출전 가능(경미 부상)"으로 별도 표기하고, 그 외
 * 등급은 "부상"으로 막는다. 셋 다 아니면 "출전 가능"이다(NFR-A11Y-002, 아이콘+라벨+색 3중).
 * **50일차**: `getPlayerInjuries`를 이제 항상 조회한다(E8 부상 타임라인 전체 이력이
 * 필요해져서) — 49일차엔 `activeInjuryId`가 있을 때만 불렀다. 같은 배열을 E3·E8이
 * 공유한다(중복 조회 없음).
 *
 * ## E4 포지션 맵 — `PositionMap`은 단일 포지션 점만 그린다(4팀 소유, 오늘 확장하지 않음)
 * 와이어프레임은 11군 전체를 피치 위에 숙련도와 함께 겹쳐 그리길 원하지만, 기존
 * `PositionMap`(`src/components/domain/PositionMap.tsx`)은 `{ position: Position }` 단건만
 * 받는 계약이라 선호 포지션 하나만 점으로 찍는다. 11군 전체 숙련도는 그 옆에 별도
 * 리스트(범례 겸용)로 보여준다 — 컴포넌트 자체를 다중 포지션 오버레이로 넓히는 건 4팀
 * 소유 파일 변경이라 조율 없이 하지 않는다(I-250, 49일차 이슈 후보).
 *
 * ## E5~E9 — 오늘(50일차) Mock 데이터 공백 (`MockDataSource.ts` 파일 헤더가 이미 명문화)
 * `getPlayerContract`·`getPlayerAttributeHistory`·`getPlayerCareerStat`·`getPlayerAwards`·
 * `getPlayerTransferHistory`·`getPlayerLoanHistory`·`getTeamTrophies`는 전부 3팀 Mock
 * 생성기가 아직 없어(economy/성장/수상 파이프라인 이후 예정) `null`/`[]`를 반환한다 —
 * **이 화면의 버그가 아니다.** 그래서 오늘 실렌더하면 E5·E7·E8·E9는 사실상 항상 empty
 * 상태로 보인다. `PS-2`(5시즌 성장 궤적 + 이적 이력 추적) 수락 기준이 53일차로 잡혀 있는
 * 이유가 이것이다 — 오늘은 계약(타입)대로 배선하는 것이 목표이고, 생성기가 붙는 순간
 * UI 변경 없이 채워져야 한다(Mock First 원칙). E6([시즌별] 탭)만은 실데이터다
 * (`statLeadersByPlayer` 기반) — 이 화면 수락 기준 "E6 평점(avgRating) 열 채워짐"이
 * E6를 정조준하는 이유이기도 하다.
 */
export default async function Page(props: PageProps<"/[lang]/players/[playerId]">) {
  const { lang, playerId: rawPlayerId } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;
  const playerId = rawPlayerId as PlayerId;

  await bootstrapApp();
  const dataSource = getDataSource();

  const profile = await dataSource.getPlayerProfile(playerId);
  if (!profile) {
    notFound();
  }

  const [
    attribute,
    playerState,
    positions,
    seasonStats,
    seasons,
    recentMatchStats,
    contract,
    attributeHistory,
    careerStat,
    awards,
    transfers,
    loans,
    currentSeason,
  ] = await Promise.all([
    dataSource.getPlayerAttribute(playerId),
    dataSource.getPlayerState(playerId),
    dataSource.getPlayerPositions(playerId),
    dataSource.getPlayerSeasonStats(playerId),
    dataSource.getSeasons(),
    dataSource.getPlayerRecentMatchStats({ playerId, limit: 1 }),
    dataSource.getPlayerContract(playerId),
    dataSource.getPlayerAttributeHistory(playerId),
    dataSource.getPlayerCareerStat(playerId),
    dataSource.getPlayerAwards(playerId),
    dataSource.getPlayerTransferHistory(playerId),
    dataSource.getPlayerLoanHistory(playerId),
    dataSource.getCurrentSeason(),
  ]);

  // 50일차 — E8 부상 타임라인은 전체 이력이 필요해 항상 조회한다(위 파일 헤더 "E3" 절 참조).
  const [team, injuries, trophies] = await Promise.all([
    playerState?.teamId ? dataSource.getTeam(playerState.teamId) : Promise.resolve(null),
    dataSource.getPlayerInjuries(playerId),
    playerState?.teamId ? dataSource.getTeamTrophies(playerState.teamId) : Promise.resolve([]),
  ]);

  // E9 이적/임대 상대 클럽명 해석 — 이미 조회한 소속 클럽(`team`)은 재조회하지 않는다.
  const otherTeamIds = new Set<TeamId>();
  for (const transfer of transfers) {
    if (transfer.fromTeamId) otherTeamIds.add(transfer.fromTeamId);
    otherTeamIds.add(transfer.toTeamId);
  }
  for (const loan of loans) {
    otherTeamIds.add(loan.ownerTeamId);
    otherTeamIds.add(loan.loanTeamId);
  }
  if (playerState?.teamId) otherTeamIds.delete(playerState.teamId);
  const otherTeams = await Promise.all([...otherTeamIds].map((teamId) => dataSource.getTeam(teamId)));
  const teamNameById = new Map<TeamId, string>();
  if (team && playerState?.teamId) teamNameById.set(playerState.teamId, team.name);
  for (const otherTeam of otherTeams) {
    if (otherTeam) teamNameById.set(otherTeam.id, otherTeam.name);
  }

  const seasonNumberById = new Map(seasons.map((season) => [season.id, season.seasonNumber]));
  function resolveSeasonLabel(seasonId: SeasonId): string {
    const seasonNumber = seasonNumberById.get(seasonId);
    return seasonNumber !== undefined ? t(locale, "league.header.seasonLabel", { number: seasonNumber }) : "—";
  }
  const leagueSeasonStats = seasonStats
    .filter((stat) => stat.competitionType === "LEAGUE")
    .slice()
    .sort((a, b) => (seasonNumberById.get(b.seasonId) ?? 0) - (seasonNumberById.get(a.seasonId) ?? 0));
  const currentSeasonStat = leagueSeasonStats[0] ?? null;
  const previousSeasonStat = leagueSeasonStats[1] ?? null;

  const leagueBenchmark = currentSeasonStat
    ? await dataSource.getLeagueAverageRating({
        seasonId: currentSeasonStat.seasonId,
        leagueId: currentSeasonStat.leagueId,
        competitionType: "LEAGUE",
      })
    : null;

  const statStrip: StatStripData = {
    appearances: currentSeasonStat?.appearances ?? null,
    recentRating: recentMatchStats[0]?.matchRating ?? null,
    seasonAverageRating: currentSeasonStat?.avgRating ?? null,
    leagueBenchmark,
    previousSeasonRating: previousSeasonStat?.avgRating ?? null,
  };

  const availability = playerState ? deriveAvailability(playerState, injuries) : null;
  const categoryAverages = attribute ? computeCategoryAverages(attribute) : null;

  // E6 — 시즌별 탭 행(전 대회: 리그/플레이오프/컵/타이브레이크). 통산 탭은 careerStat 그대로.
  const seasonRows: readonly PlayerStatTableSeasonRow[] = sortPlayerStatSeasonRows(
    seasonStats.map((stat) => ({ stat, seasonLabel: resolveSeasonLabel(stat.seasonId) })),
    (stat) => seasonNumberById.get(stat.seasonId) ?? 0,
  );

  // E9 [트로피] 탭 — TrophyCase는 팀 트로피 + 개인 수상을 함께 받는다(그 파일 헤더 참조).
  // 소속 팀이 바뀐 이력까지 조인할 히스토리 데이터가 없어(과거 로스터-트로피 조인 계약
  // 부재) 현재 소속 팀의 트로피만 보여준다 — 이슈 후보로 보고.
  const trophyRows: readonly TrophyCaseTrophyRow[] = trophies.map((trophy) => ({
    trophy,
    seasonLabel: resolveSeasonLabel(trophy.seasonId),
  }));
  const awardRows: readonly TrophyCaseAwardRow[] = awards.map((award) => ({
    award,
    seasonLabel: resolveSeasonLabel(award.seasonId),
  }));

  // E9 [이적] 탭 — Transfer + Loan 병합.
  const transferHistoryRows = buildTransferHistoryRows(
    transfers.map((transfer) => ({
      transfer,
      seasonLabel: resolveSeasonLabel(transfer.seasonId),
      seasonNumber: seasonNumberById.get(transfer.seasonId) ?? 0,
    })),
    loans.map((loan) => ({
      loan,
      seasonLabel: resolveSeasonLabel(loan.seasonId),
      seasonNumber: seasonNumberById.get(loan.seasonId) ?? 0,
    })),
  );

  // E5 — 계약 잔여 시즌. 현재 시즌 정보가 없으면(Mock 공백) 표기하지 않는다(값 날조 금지).
  const contractRemainingSeasons =
    contract && currentSeason ? Math.max(contract.endSeason - currentSeason.seasonNumber, 0) : null;

  // E8 — 통산 부상 요약. `returnRound`가 `occurredRound`보다 앞서는 이상 데이터는 0으로 clamp.
  const totalInjuries = injuries.length;
  const totalRoundsInjured = injuries.reduce(
    (sum, injury) => sum + Math.max(injury.returnRound - injury.occurredRound, 0),
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
      <ProfileHeaderSection
        locale={locale}
        profile={profile}
        attribute={attribute}
        playerState={playerState}
        team={team}
        statStrip={statStrip}
      />

      {/* 데스크톱 2컬럼(3-2절) — lg(1024px)부터 좌 40%/우 60%. sm은 레이아웃 전환에 쓰지
          않는다(I-184) — 전환점은 lg 하나만 쓴다(위 파일 헤더 참조). */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">
      <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.ability.title")}</h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <AbilityRadar
            locale={locale}
            state={attribute ? { status: "ready", data: attribute } : { status: "empty" }}
          />
          {attribute && categoryAverages ? (
            <div className="flex flex-1 flex-col gap-2">
              {RADAR_CATEGORY_ORDER.map((category) => (
                <details key={category} className="rounded-lg border border-border bg-card p-3">
                  <summary className="eyebrow cursor-pointer text-muted-foreground">
                    {t(locale, `player.ability.${category}`)} ·{" "}
                    {t(locale, "player.ability.averageFormat", {
                      value: categoryAverages[category].toFixed(1),
                    })}
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {ATTRIBUTE_GROUPS[category].map((field) => (
                      <StatBar
                        key={field}
                        locale={locale}
                        label={t(locale, ATTRIBUTE_LABEL_KEYS[field])}
                        state={{ status: "ready", data: { value: attribute[field], max: 30 } }}
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t(locale, "player.empty.message")}</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.condition.sectionTitle")}</h2>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:max-w-md">
          <ConditionGauge
            locale={locale}
            state={
              playerState
                ? { status: "ready", data: { condition: playerState.condition, fitness: playerState.fitness } }
                : { status: "empty" }
            }
          />
          {availability && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t(locale, "player.condition.availabilityLabel")}</span>
              <AvailabilityBadge locale={locale} availability={availability} />
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.position.title")}</h2>
        {/* 50일차 — E4는 이제 좌 컬럼(40%, lg 이상) 안에 들어가 뷰포트 기준 md(768px)
            전환이 이 섹션 자체 폭이 아니라 페이지 전체 폭을 기준으로 발동한다. lg에서
            좌우 분할과 md 전환이 동시에 켜지면 좌 컬럼이 좁은 채로 flex-row+3열이 겹쳐
            포지션명이 글자 단위로 줄바꿈되는 회귀가 났다(50일차 실측, Playwright 스크린샷
            확인). 전환점을 xl(1440px)로 늦춰 좌 컬럼이 실제로 넓어진 뒤에만 2열 배치를
            적용한다 — 768~1439 구간은 세로 스택(기본값)으로 안전하게 남는다. */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
          <PositionMap
            locale={locale}
            className="max-w-[220px]"
            state={{ status: "ready", data: { position: profile.preferredPosition } }}
          />
          <div className="flex flex-1 flex-col gap-1.5">
            <h3 className="eyebrow text-muted-foreground">
              {t(locale, "player.position.proficiencySectionTitle")}
            </h3>
            <ul className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
              {POSITION_ORDER.map((position) => (
                <PositionProficiencyItem key={position} locale={locale} position={position} positions={positions} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.value.sectionTitle")}</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t(locale, "player.value.marketValueLabel")}</span>
            <span className="scoreboard text-base">
              {t(locale, "player.value.pointsFormat", { amount: formatPoints(profile.marketValue, locale) })}
            </span>
          </div>
          {contract ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                <span className="text-muted-foreground">
                  {t(locale, "player.value.contractSeasonFormat", {
                    start: contract.startSeason,
                    end: contract.endSeason,
                  })}
                </span>
                {contractRemainingSeasons !== null && (
                  <span className="text-xs text-muted-foreground">
                    {t(locale, "player.value.contractRemainingFormat", { count: contractRemainingSeasons })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(locale, "player.value.wageLabel")}</span>
                <span className="scoreboard text-base">
                  {t(locale, "player.value.pointsFormat", { amount: formatPoints(contract.wagePerSeason, locale) })}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t(locale, "player.value.contractEmpty")}</p>
          )}
        </div>
      </section>
      </div>

      <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.stat.tableTitle")}</h2>
        <PlayerStatTable locale={locale} playerName={profile.name} seasonRows={seasonRows} careerStat={careerStat} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.growthChart.sectionTitle")}</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <GrowthChart
            locale={locale}
            state={attributeHistory.length > 0 ? { status: "ready", data: attributeHistory } : { status: "empty" }}
          />
          {attributeHistory.length > 0 && (
            // NFR-A11Y-005 — 곡선은 시각 정보만으로 끝내지 않는다. 시즌별 OVR을 sr-only
            // 표로 병기한다(와이어프레임 05번 §7 "차트 대체 텍스트"). PA는 여기 없다 —
            // `PlayerAttributeHistory`에 애초에 `pa` 필드가 없다(GrowthChart 헤더 참조).
            <table className="sr-only">
              <caption>{t(locale, "player.growthChart.srTableCaption", { name: profile.name })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t(locale, "player.growthChart.srSeasonHeader")}</th>
                  <th scope="col">{t(locale, "player.growthChart.srOvrHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {[...attributeHistory]
                  .sort((a, b) => a.seasonNumber - b.seasonNumber)
                  .map((entry) => (
                    <tr key={entry.seasonNumber}>
                      <td>{entry.seasonNumber}</td>
                      <td>{entry.ovr}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.injuryTimeline.sectionTitle")}</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <InjuryTimeline
            locale={locale}
            state={injuries.length > 0 ? { status: "ready", data: { injuries } } : { status: "empty" }}
          />
          {injuries.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t(locale, "player.injuryTimeline.summaryFormat", { count: totalInjuries, rounds: totalRoundsInjured })}
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.career.sectionTitle")}</h2>
        <Tabs defaultValue="trophy">
          <TabsList>
            <TabsTrigger value="trophy">{t(locale, "player.career.tabTrophy")}</TabsTrigger>
            <TabsTrigger value="transfer">{t(locale, "player.career.tabTransfer")}</TabsTrigger>
          </TabsList>
          <TabsContent value="trophy">
            <TrophyCase locale={locale} state={{ status: "ready", data: { trophies: trophyRows, awards: awardRows } }} />
          </TabsContent>
          <TabsContent value="transfer">
            <TransferHistoryList
              locale={locale}
              rows={transferHistoryRows}
              teamNameById={teamNameById}
              buildTeamHref={(teamId) => `/${locale}/teams/${teamId}`}
            />
          </TabsContent>
        </Tabs>
      </section>
      </div>
      </div>
    </div>
  );
}

/* ============================================================
 * E1 프로필 헤더 + E1-r 지표 스트립
 * ============================================================ */

interface StatStripData {
  readonly appearances: number | null;
  readonly recentRating: number | null;
  readonly seasonAverageRating: number | null;
  readonly leagueBenchmark: number | null;
  readonly previousSeasonRating: number | null;
}

function ProfileHeaderSection({
  locale,
  profile,
  attribute,
  playerState,
  team,
  statStrip,
}: {
  readonly locale: SupportedLocale;
  readonly profile: PublicPlayerProfile;
  readonly attribute: PlayerAttribute | null;
  readonly playerState: PlayerState | null;
  readonly team: Pick<Team, "name" | "shortName" | "crestSeed"> | null;
  readonly statStrip: StatStripData;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <PlayerAvatar locale={locale} size="lg" state={{ status: "ready", data: profile }} />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{profile.name}</h1>
            {playerState && (
              <span className="eyebrow text-muted-foreground">
                {t(locale, "player.profile.numberFormat", { number: playerState.squadNumber })}
              </span>
            )}
            {profile.retiredAtSeason !== null ? (
              <Badge variant="outline">{t(locale, "player.profile.retiredBadge")}</Badge>
            ) : (
              <Badge variant="secondary">{t(locale, "player.profile.activeBadge")}</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {t(locale, "player.profile.ageFormat", { age: profile.age })}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {team ? (
              <TeamBadge locale={locale} size="sm" state={{ status: "ready", data: team }} />
            ) : (
              <Badge variant="outline">{t(locale, "player.profile.freeAgentBadge")}</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {t(locale, `enums.position.${profile.preferredPosition}`)}
            </span>
            <span className="scoreboard text-sm">
              {t(locale, "player.profile.ovrLabel")} {attribute?.ovrCached ?? "—"}
            </span>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex cursor-help items-center gap-1.5 text-sm">
                  <span aria-hidden>{starsFor(profile.scoutRating)}</span>
                  <span className="text-muted-foreground">
                    {t(locale, "player.profile.scoutRatingLabel")}{" "}
                    {t(locale, "player.profile.scoutRatingFormat", { rating: profile.scoutRating })}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t(locale, "player.profile.scoutRatingTooltip")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <p className="text-sm text-muted-foreground">
            {t(locale, "player.profile.reputationFormat", { value: profile.reputation })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 md:grid-cols-4">
        <StatStripItem label={t(locale, "player.stat.appearancesLabel")} value={statStrip.appearances} />
        <StatStripItem
          label={t(locale, "player.stat.recentRatingLabel")}
          value={statStrip.recentRating}
          decimals={1}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t(locale, "player.stat.seasonAverageLabel")}</span>
          <span className="scoreboard text-base">
            {statStrip.seasonAverageRating !== null ? statStrip.seasonAverageRating.toFixed(2) : "—"}
          </span>
          {statStrip.leagueBenchmark !== null && (
            <span className="text-xs text-muted-foreground">
              {t(locale, "player.stat.leagueBenchmarkFormat", { value: statStrip.leagueBenchmark.toFixed(2) })}
            </span>
          )}
        </div>
        {statStrip.previousSeasonRating !== null && (
          <StatStripItem
            label={t(locale, "player.stat.previousSeasonLabel")}
            value={statStrip.previousSeasonRating}
            decimals={2}
          />
        )}
      </div>
    </section>
  );
}

function StatStripItem({
  label,
  value,
  decimals = 0,
}: {
  readonly label: string;
  readonly value: number | null;
  readonly decimals?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="scoreboard text-base">{value !== null ? value.toFixed(decimals) : "—"}</span>
    </div>
  );
}

/** E1-s 스카우트 등급 — ★1~5 범위 표기. PA를 입력으로 받지 않는다(P-2, 서버 산출값만 표시). */
function starsFor(rating: 1 | 2 | 3 | 4 | 5): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

/* ============================================================
 * E3 가용성 배지
 * ============================================================ */

type Availability =
  | { readonly kind: "available" }
  | { readonly kind: "availableInjured" }
  | { readonly kind: "injured" }
  | { readonly kind: "suspended" };

function deriveAvailability(state: PlayerState, injuries: readonly Injury[]): Availability {
  if (state.suspensionRemainingLeague > 0 || state.suspensionRemainingCup > 0) {
    return { kind: "suspended" };
  }
  if (state.activeInjuryId !== null) {
    const injury = injuries.find((candidate) => candidate.id === state.activeInjuryId);
    if (injury?.severity === "KNOCK") {
      return { kind: "availableInjured" };
    }
    return { kind: "injured" };
  }
  return { kind: "available" };
}

const AVAILABILITY_PRESENTATION: Record<
  Availability["kind"],
  { readonly icon: string; readonly labelKey: TranslationKey; readonly variant: "secondary" | "destructive" }
> = {
  available: { icon: "⚑", labelKey: "player.condition.availableBadge", variant: "secondary" },
  availableInjured: { icon: "✚", labelKey: "player.condition.availableInjuredBadge", variant: "secondary" },
  injured: { icon: "✚", labelKey: "player.condition.injuredBadge", variant: "destructive" },
  suspended: { icon: "⛔", labelKey: "player.condition.suspendedBadge", variant: "destructive" },
};

function AvailabilityBadge({ locale, availability }: { readonly locale: SupportedLocale; readonly availability: Availability }) {
  const presentation = AVAILABILITY_PRESENTATION[availability.kind];
  return (
    <Badge variant={presentation.variant}>
      <span aria-hidden>{presentation.icon}</span>
      {t(locale, presentation.labelKey)}
    </Badge>
  );
}

/* ============================================================
 * E4 포지션 숙련도 리스트
 * ============================================================ */

const POSITION_ORDER: readonly Position[] = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST", "SS"];

function proficiencyLabelKey(proficiency: number): TranslationKey {
  switch (proficiency) {
    case 5:
      return "player.position.proficiencyNatural";
    case 4:
      return "player.position.proficiencyAccomplished";
    case 3:
      return "player.position.proficiencyCompetent";
    case 2:
      return "player.position.proficiencyUnconvincing";
    case 1:
      return "player.position.proficiencyAwkward";
    default:
      return "player.position.proficiencyUnfamiliar";
  }
}

function PositionProficiencyItem({
  locale,
  position,
  positions,
}: {
  readonly locale: SupportedLocale;
  readonly position: Position;
  readonly positions: readonly PlayerPosition[];
}) {
  const found = positions.find((candidate) => candidate.position === position);
  const proficiency = found?.proficiency ?? 0;

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1 text-sm">
      <span>{t(locale, `enums.position.${position}`)}</span>
      <span className="text-xs text-muted-foreground">
        {proficiency > 0 ? proficiency : "—"} · {t(locale, proficiencyLabelKey(proficiency))}
      </span>
    </li>
  );
}

/* ============================================================
 * E2 능력치 아코디언 — 34속성 → 4카테고리 그룹
 * ============================================================ */

const ATTRIBUTE_GROUPS: Record<(typeof RADAR_CATEGORY_ORDER)[number], readonly (keyof PlayerAttributeValues)[]> = {
  technical: [
    "finishing",
    "passing",
    "crossing",
    "dribbling",
    "firstTouch",
    "tackling",
    "marking",
    "heading",
    "longShots",
    "setPieces",
  ],
  mental: [
    "composure",
    "decisions",
    "vision",
    "positioning",
    "workRate",
    "aggression",
    "leadership",
    "teamwork",
    "anticipation",
    "determination",
  ],
  physical: ["pace", "acceleration", "stamina", "strength", "agility", "balance", "jumping", "naturalFitness"],
  goalkeeping: ["reflexes", "handling", "oneOnOnes", "aerialReach", "kicking", "commandOfArea"],
};

const ATTRIBUTE_LABEL_KEYS: Record<keyof PlayerAttributeValues, TranslationKey> = {
  finishing: "player.ability.attrFinishing",
  passing: "player.ability.attrPassing",
  crossing: "player.ability.attrCrossing",
  dribbling: "player.ability.attrDribbling",
  firstTouch: "player.ability.attrFirstTouch",
  tackling: "player.ability.attrTackling",
  marking: "player.ability.attrMarking",
  heading: "player.ability.attrHeading",
  longShots: "player.ability.attrLongShots",
  setPieces: "player.ability.attrSetPieces",
  composure: "player.ability.attrComposure",
  decisions: "player.ability.attrDecisions",
  vision: "player.ability.attrVision",
  positioning: "player.ability.attrPositioning",
  workRate: "player.ability.attrWorkRate",
  aggression: "player.ability.attrAggression",
  leadership: "player.ability.attrLeadership",
  teamwork: "player.ability.attrTeamwork",
  anticipation: "player.ability.attrAnticipation",
  determination: "player.ability.attrDetermination",
  pace: "player.ability.attrPace",
  acceleration: "player.ability.attrAcceleration",
  stamina: "player.ability.attrStamina",
  strength: "player.ability.attrStrength",
  agility: "player.ability.attrAgility",
  balance: "player.ability.attrBalance",
  jumping: "player.ability.attrJumping",
  naturalFitness: "player.ability.attrNaturalFitness",
  reflexes: "player.ability.attrReflexes",
  handling: "player.ability.attrHandling",
  oneOnOnes: "player.ability.attrOneOnOnes",
  aerialReach: "player.ability.attrAerialReach",
  kicking: "player.ability.attrKicking",
  commandOfArea: "player.ability.attrCommandOfArea",
};
