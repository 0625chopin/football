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
import { ConditionGauge } from "@/components/domain/ConditionGauge";
import { PositionMap } from "@/components/domain/PositionMap";
import { PlayerAvatar } from "@/components/domain/PlayerAvatar";
import { TeamBadge } from "@/components/domain/TeamBadge";
import { StatBar } from "@/components/domain/StatBar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  Injury,
  PlayerAttribute,
  PlayerAttributeValues,
  PlayerId,
  PlayerPosition,
  PlayerState,
  Position,
  Team,
} from "@/types";

/**
 * `/[lang]/players/[playerId]` 선수 상세 1/2 — Task 018(49일차, 5팀), 와이어프레임
 * `docs/wireframe/05-선수상세.md` E1(프로필 헤더)·E1-r(지표 스트립, D-34)·E2(능력치)·
 * E3(컨디션·피로)·E4(포지션 맵) 구현. E5~E9(몸값·계약/스탯 테이블/성장곡선/부상
 * 타임라인/커리어 이력)는 50일차(2/2) 스코프다 — 지금은 데스크톱 2컬럼(3-2절)을 적용하지
 * 않고 모바일(3-1절)과 동일한 단일 컬럼 순서(E1→E4)로만 쌓는다. 우측 컬럼이 비교할
 * 상대 콘텐츠 없이 먼저 자리 잡으면 레이아웃이 오히려 불안정해지기 때문이다.
 *
 * ## E1 헤더 실패 = 페이지 전체 에러 (§5 4상태 명세)
 * `getPlayerProfile`이 `null`이면 선수 존재 자체가 불확실하므로 `notFound()`로 페이지
 * 전체를 처리한다. 그 아래 E2~E4는 섹션별로 독립 조회하며, 각 조회가 `null`/빈 배열이면
 * 해당 섹션만 `DomainViewState`의 `empty`로 내려보낸다(섹션 단위 격리).
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
 *
 * ## E4 포지션 맵 — `PositionMap`은 단일 포지션 점만 그린다(4팀 소유, 오늘 확장하지 않음)
 * 와이어프레임은 11군 전체를 피치 위에 숙련도와 함께 겹쳐 그리길 원하지만, 기존
 * `PositionMap`(`src/components/domain/PositionMap.tsx`)은 `{ position: Position }` 단건만
 * 받는 계약이라 선호 포지션 하나만 점으로 찍는다. 11군 전체 숙련도는 그 옆에 별도
 * 리스트(범례 겸용)로 보여준다 — 컴포넌트 자체를 다중 포지션 오버레이로 넓히는 건 4팀
 * 소유 파일 변경이라 조율 없이 하지 않는다(이슈 후보로 보고).
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

  const [attribute, playerState, positions, seasonStats, seasons, recentMatchStats] = await Promise.all([
    dataSource.getPlayerAttribute(playerId),
    dataSource.getPlayerState(playerId),
    dataSource.getPlayerPositions(playerId),
    dataSource.getPlayerSeasonStats(playerId),
    dataSource.getSeasons(),
    dataSource.getPlayerRecentMatchStats({ playerId, limit: 1 }),
  ]);

  const [team, injuries] = await Promise.all([
    playerState?.teamId ? dataSource.getTeam(playerState.teamId) : Promise.resolve(null),
    playerState?.activeInjuryId ? dataSource.getPlayerInjuries(playerId) : Promise.resolve([]),
  ]);

  const seasonNumberById = new Map(seasons.map((season) => [season.id, season.seasonNumber]));
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
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <PositionMap
            locale={locale}
            className="max-w-[220px]"
            state={{ status: "ready", data: { position: profile.preferredPosition } }}
          />
          <div className="flex flex-1 flex-col gap-1.5">
            <h3 className="eyebrow text-muted-foreground">
              {t(locale, "player.position.proficiencySectionTitle")}
            </h3>
            <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
              {POSITION_ORDER.map((position) => (
                <PositionProficiencyItem key={position} locale={locale} position={position} positions={positions} />
              ))}
            </ul>
          </div>
        </div>
      </section>
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
