import { Suspense } from "react";

import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import type { PublicPlayerProfile } from "@/lib/data/DataSource";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { SupportedLocale } from "@/i18n/locales";
import { AbilityRadar } from "@/components/domain/AbilityRadar";
import { computeCategoryAverages, RADAR_CATEGORY_ORDER } from "@/components/domain/radar";
import { PlayerAvatar } from "@/components/domain/PlayerAvatar";
import { TeamBadge } from "@/components/domain/TeamBadge";
import { StatBar } from "@/components/domain/StatBar";
import { ErrorBoundary } from "@/components/state/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sortPlayerStatSeasonRows } from "./PlayerStatTable";
import type { PlayerStatTableSeasonRow } from "./PlayerStatTable";
import {
  CareerSection,
  CareerSectionSkeleton,
  ConditionSection,
  ConditionSectionSkeleton,
  GrowthSection,
  GrowthSectionSkeleton,
  InjurySection,
  InjurySectionSkeleton,
  PositionSection,
  PositionSectionSkeleton,
  StatSection,
  StatSectionSkeleton,
  ValueSection,
  ValueSectionSkeleton,
} from "./sections";
import type {
  PlayerAttribute,
  PlayerAttributeValues,
  PlayerId,
  PlayerState,
  SeasonId,
  Team,
} from "@/types";

/**
 * `/[lang]/players/[playerId]` 선수 상세 — Task 018(49~53일차, 5팀), 와이어프레임
 * `docs/wireframe/05-선수상세.md`. 49~50일차에 E1~E9 전 영역을 배선했고(당시엔 단일
 * `Promise.all`로 페이지 전체를 blocking 조회), **53일차(018 잔여, 52일차 인계 승인
 * 사항)에 §5 4상태 명세를 "페이지 단위"에서 "섹션 단위"로 전환했다.**
 *
 * ## 아키텍처 — E1·E2는 eager, E3~E9는 섹션별 Suspense + ErrorBoundary(`./sections.tsx`)
 * FR-UI-005는 "섹션별 스켈레톤 / 섹션별 빈 문구 / 섹션 단위 격리 + 재시도"를 요구한다
 * (§5). E1(헤더)은 라우트 파라미터·프로필이 있어야 페이지 존재 자체가 성립하므로 계속
 * blocking으로 먼저 조회한다("LCP 확보", §5 Loading 행). E2(능력치)는 E1이 OVR 라벨
 * 표시에 이미 `attribute`를 조회해 두므로 그 결과를 그대로 재사용한다 — 이미 손에 있는
 * 데이터를 일부러 스트리밍 대상으로 늦추지 않는다.
 *
 * E3~E9는 각자 필요한 데이터를 **독립적으로** 조회하는 async 서버 컴포넌트로 분리했다
 * (`./sections.tsx`). 각 섹션을 `<Suspense fallback={...}><ErrorBoundary>...
 * </ErrorBoundary></Suspense>`로 감싸 — 한 섹션의 실패가 다른 섹션·E1 헤더를 무너뜨리지
 * 않고(`ErrorBoundary`가 Next.js 16.2 `unstable_catchError` 위에서 이미 구현한 격리 +
 * `[다시 시도]`를 그대로 재사용), 각자의 조회가 끝나는 대로 스트리밍된다. Suspense
 * `fallback`은 실제 콘텐츠와 같은 높이의 로딩 상태를 그대로 재사용해(`GrowthChart`
 * `state={{status:"loading"}}` 등) CLS를 0으로 유지한다(NFR-PF-009, 자세한 설계 근거는
 * `sections.tsx` 파일 헤더).
 *
 * ⚠️ **PA(잠재능력) 원값은 이 화면 어디에도 없다** — 모든 선수 표시 데이터는
 * `PublicPlayerProfile`(`Omit<Player, 'pa'>`)과 `pa` 필드 자체가 없는 타입만 거친다.
 *
 * ## 데스크톱 2컬럼(3-2절) — `lg`(1024px)부터 좌 40%/우 60%
 * 좌 컬럼 = E2·E3·E4·E5, 우 컬럼 = E6·E7·E8·E9(와이어프레임 3-2절 그대로). `sm`(375px)은
 * 이 프로젝트에서 320px과 동일 취급(I-184)이라 레이아웃 전환에 쓰지 않는다 — 전환점은
 * `lg` 하나만 쓴다.
 *
 * ## E1 헤더 실패 = 페이지 전체 에러 (§5 4상태 명세)
 * `getPlayerProfile`이 `null`이면 선수 존재 자체가 불확실하므로 `notFound()`로 페이지
 * 전체를 처리한다. E1이 곁들여 조회하는 지표 스트립(E1-r)도 같은 blocking 묶음이라
 * 실패 시 라우트 `error.tsx`로 올라간다 — 이는 49일차부터 유지해 온 판단이고, 오늘
 * 새로 분리한 건 그 아래 E3~E9뿐이다.
 *
 * ## E1-r 지표 스트립 — 어떤 시즌 행을 "현재/지난 시즌"으로 보는가
 * `getPlayerSeasonStats`는 시즌×대회 전량을 반환한다. LEAGUE 대회 행만 걸러 `getSeasons()`의
 * `seasonNumber`로 내림차순 정렬해 가장 최근 행을 "현재 시즌", 그다음을 "지난 시즌"으로
 * 삼는다(데뷔 시즌이면 지난 시즌 행이 없어 그 항목을 생략). 리그 벤치마크는 현재 시즌 행의
 * `seasonId`/`leagueId`로 `getLeagueAverageRating`을 조회한다(D-34 결정③). ⚠️
 * `getPlayerRecentMatchStats`는 어댑터 레벨에서 `FINISHED` 경기만 반환하는 데이터 계약이라
 * 이 화면은 받은 값을 그대로 쓴다(재필터링 없음, 와이어프레임 05 S-5~S-8). 같은
 * `seasonStats`/`seasons`를 E6(시즌별 스탯 표)의 `seasonRows`도 재사용한다(재조회 없음).
 *
 * ## E5~E9 — Mock 데이터 공백 지속 (`MockDataSource.ts` 파일 헤더 참조)
 * `getPlayerContract`·`getPlayerAttributeHistory`·`getPlayerCareerStat`·`getPlayerAwards`·
 * `getPlayerTransferHistory`·`getPlayerLoanHistory`는 53일차 시점에도 여전히 `null`/`[]`
 * 반환이다(3팀 생성기 미착수 — 이 화면의 버그가 아니다). **PS-2(5시즌 성장 궤적 + 이적
 * 이력 추적) 수락 기준은 오늘 UI 계약상으로는 충족되지만(빈 배열이 오면 섹션별 empty
 * 문구로 정확히 대체됨), 실측 가능한 5시즌 궤적을 보여주는 것은 그 생성기가 붙어야
 * 가능하다** — Mock First 원칙대로 데이터가 채워지는 순간 이 파일은 수정할 필요가 없다.
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

  const [attribute, playerState, seasonStats, seasons, recentMatchStats] = await Promise.all([
    dataSource.getPlayerAttribute(playerId),
    dataSource.getPlayerState(playerId),
    dataSource.getPlayerSeasonStats(playerId),
    dataSource.getSeasons(),
    dataSource.getPlayerRecentMatchStats({ playerId, limit: 1 }),
  ]);

  const team = playerState?.teamId ? await dataSource.getTeam(playerState.teamId) : null;

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

  const categoryAverages = attribute ? computeCategoryAverages(attribute) : null;

  // E6 — 시즌별 탭 행(전 대회: 리그/플레이오프/컵/타이브레이크). E1-r과 같은 `seasonStats`/
  // `seasons`를 재사용한다(재조회 없음) — `통산` 탭에만 필요한 `careerStat`만 StatSection이
  // 독립 조회한다(섹션 격리 대상은 실제로 실패할 수 있는 "그 섹션만의" 데이터다).
  const seasonRows: readonly PlayerStatTableSeasonRow[] = sortPlayerStatSeasonRows(
    seasonStats.map((stat) => ({ stat, seasonLabel: resolveSeasonLabel(stat.seasonId) })),
    (stat) => seasonNumberById.get(stat.seasonId) ?? 0,
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
        <Suspense fallback={<ConditionSectionSkeleton locale={locale} />}>
          <ErrorBoundary locale={locale} name="player.condition">
            <ConditionSection locale={locale} playerId={playerId} playerState={playerState} />
          </ErrorBoundary>
        </Suspense>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.position.title")}</h2>
        <Suspense fallback={<PositionSectionSkeleton locale={locale} />}>
          <ErrorBoundary locale={locale} name="player.position">
            <PositionSection locale={locale} playerId={playerId} preferredPosition={profile.preferredPosition} />
          </ErrorBoundary>
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.value.sectionTitle")}</h2>
        <Suspense fallback={<ValueSectionSkeleton />}>
          <ErrorBoundary locale={locale} name="player.value">
            <ValueSection locale={locale} playerId={playerId} marketValue={profile.marketValue} />
          </ErrorBoundary>
        </Suspense>
      </section>
      </div>

      <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.stat.tableTitle")}</h2>
        <Suspense fallback={<StatSectionSkeleton />}>
          <ErrorBoundary locale={locale} name="player.stat">
            <StatSection locale={locale} playerId={playerId} playerName={profile.name} seasonRows={seasonRows} />
          </ErrorBoundary>
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.growthChart.sectionTitle")}</h2>
        <Suspense fallback={<GrowthSectionSkeleton locale={locale} />}>
          <ErrorBoundary locale={locale} name="player.growthChart">
            <GrowthSection locale={locale} playerId={playerId} playerName={profile.name} />
          </ErrorBoundary>
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.injuryTimeline.sectionTitle")}</h2>
        <Suspense fallback={<InjurySectionSkeleton locale={locale} />}>
          <ErrorBoundary locale={locale} name="player.injuryTimeline">
            <InjurySection locale={locale} playerId={playerId} />
          </ErrorBoundary>
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "player.career.sectionTitle")}</h2>
        <Suspense fallback={<CareerSectionSkeleton locale={locale} />}>
          <ErrorBoundary locale={locale} name="player.career">
            <CareerSection
              locale={locale}
              playerId={playerId}
              playerTeamId={playerState?.teamId ?? null}
              playerTeamName={team?.name ?? null}
              seasons={seasons}
            />
          </ErrorBoundary>
        </Suspense>
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
