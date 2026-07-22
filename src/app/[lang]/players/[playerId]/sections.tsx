import { getDataSource } from "@/lib/data/factory";
import { formatPoints } from "@/i18n/format";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import { ConditionGauge } from "@/components/domain/ConditionGauge";
import { PositionMap } from "@/components/domain/PositionMap";
import { GrowthChart } from "@/components/composite/GrowthChart";
import { InjuryTimeline } from "@/components/composite/InjuryTimeline";
import { TrophyCase } from "@/components/composite/TrophyCase";
import type { TrophyCaseAwardRow, TrophyCaseTrophyRow } from "@/components/composite/TrophyCase";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonBlock } from "@/components/state/SkeletonBlock";
import { PlayerStatTable } from "./PlayerStatTable";
import type { PlayerStatTableSeasonRow } from "./PlayerStatTable";
import { TransferHistoryList, buildTransferHistoryRows } from "./TransferHistoryList";
import type {
  Injury,
  PlayerId,
  PlayerPosition,
  PlayerState,
  Points,
  Position,
  Season,
  SeasonId,
  TeamId,
} from "@/types";

/**
 * `/[lang]/players/[playerId]` E3~E9 — 53일차(5팀, 018 잔여) 섹션 분리.
 *
 * `page.tsx`는 E1(헤더)·E2(능력치)만 직접 렌더한다 — 둘 다 페이지 최상단에서 이미
 * blocking으로 조회한 `attribute`/`playerState`에서 끝나 별도 스트리밍이 필요 없다
 * (FR-UI-005는 섹션별 로딩만 요구하지, 이미 손에 있는 데이터를 일부러 늦추라는 뜻이
 * 아니다). 이 파일의 컴포넌트들은 자기 데이터를 **각자 독립적으로 조회하는 async 서버
 * 컴포넌트**이고, `page.tsx`가 각각을 `<Suspense fallback={...}><ErrorBoundary>...
 * </ErrorBoundary></Suspense>`로 감싼다 — 와이어프레임 05 §5의 "섹션별 스켈레톤 /
 * 섹션별 빈 문구 / 섹션 단위 격리 + 재시도"를 그대로 구현한다.
 *
 * - **Loading**: Suspense `fallback`은 해당 컴포넌트를 `state={{status:"loading"}}`로
 *   그대로 재사용한다(`GrowthChart`·`InjuryTimeline`·`TrophyCase`·`ConditionGauge`·
 *   `PositionMap`은 이미 loading 상태를 지원 — 실제 콘텐츠와 같은 높이라 CLS가 0이다).
 *   전용 view-state가 없는 E5(값·계약)·E6(스탯 표)만 `SkeletonBlock`으로 직접 근사한다.
 * - **Error**: `@/components/state/ErrorBoundary`(Next.js 16.2 `unstable_catchError`)가
 *   섹션 하나의 throw를 그 섹션에서 멈춘다. `[다시 시도]`는 `unstable_retry()`로 그
 *   섹션의 fetch만 재실행한다 — 다른 섹션·E1 헤더는 영향받지 않는다.
 * - **Empty**: 각 섹션이 빈 배열/`null`을 받으면 섹션 제목(`page.tsx`가 그린다)은 남기고
 *   본문만 각 컴포넌트의 empty 렌더로 대체한다(레이아웃 붕괴 방지).
 */

function resolveSeasonLabel(locale: SupportedLocale, seasons: readonly Season[], seasonId: SeasonId): string {
  const seasonNumber = seasons.find((season) => season.id === seasonId)?.seasonNumber;
  return seasonNumber !== undefined ? t(locale, "league.header.seasonLabel", { number: seasonNumber }) : "—";
}

/* ============================================================
 * E3 컨디션·가용성
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

export async function ConditionSection({
  locale,
  playerId,
  playerState,
}: {
  readonly locale: SupportedLocale;
  readonly playerId: PlayerId;
  readonly playerState: PlayerState | null;
}) {
  // E1 헤더가 이미 `playerState`를 조회해 뒀지만(TeamBadge 등에 필요), 가용성 배지는
  // `injuries`가 있어야 판정할 수 있다 — 그 조회만 이 섹션이 독립적으로 담당한다.
  const injuries = await getDataSource().getPlayerInjuries(playerId);
  const availability = playerState ? deriveAvailability(playerState, injuries) : null;

  return (
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
  );
}

export function ConditionSectionSkeleton({ locale }: { readonly locale: SupportedLocale }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:max-w-md">
      <ConditionGauge locale={locale} state={{ status: "loading" }} />
      <SkeletonBlock rows={1} rowClassName="h-5 w-32" />
    </div>
  );
}

/* ============================================================
 * E4 포지션 맵 + 숙련도 리스트
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

/**
 * 50일차 실측(page.tsx 이관) — 좌 컬럼(40%, `lg` 이상) 안에서는 뷰포트 기준 `md`(768px)
 * 전환이 페이지 전체 폭이 아니라 좁은 좌 컬럼 폭으로 발동해, 포지션명이 글자 단위로
 * 줄바꿈되는 회귀가 났다(Playwright 스크린샷 확인). 전환점을 `xl`(1440px)로 늦춰 좌
 * 컬럼이 실제로 넓어진 뒤에만 2열 배치를 적용한다.
 */
export async function PositionSection({
  locale,
  playerId,
  preferredPosition,
}: {
  readonly locale: SupportedLocale;
  readonly playerId: PlayerId;
  readonly preferredPosition: Position;
}) {
  const positions = await getDataSource().getPlayerPositions(playerId);
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
      <PositionMap
        locale={locale}
        className="max-w-[220px]"
        state={{ status: "ready", data: { position: preferredPosition } }}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="eyebrow text-muted-foreground">{t(locale, "player.position.proficiencySectionTitle")}</h3>
        <ul className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
          {POSITION_ORDER.map((position) => (
            <PositionProficiencyItem key={position} locale={locale} position={position} positions={positions} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PositionSectionSkeleton({ locale }: { readonly locale: SupportedLocale }) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
      <PositionMap locale={locale} className="max-w-[220px]" state={{ status: "loading" }} />
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="eyebrow text-muted-foreground">{t(locale, "player.position.proficiencySectionTitle")}</h3>
        <SkeletonBlock rows={4} rowClassName="h-7" />
      </div>
    </div>
  );
}

/* ============================================================
 * E5 몸값 · 계약
 * ============================================================ */

export async function ValueSection({
  locale,
  playerId,
  marketValue,
}: {
  readonly locale: SupportedLocale;
  readonly playerId: PlayerId;
  readonly marketValue: Points;
}) {
  const dataSource = getDataSource();
  const [contract, currentSeason] = await Promise.all([
    dataSource.getPlayerContract(playerId),
    dataSource.getCurrentSeason(),
  ]);
  // 계약이 있어도 현재 시즌 정보가 없으면(Mock 공백) 잔여 시즌을 표기하지 않는다(값 날조 금지).
  const contractRemainingSeasons =
    contract && currentSeason ? Math.max(contract.endSeason - currentSeason.seasonNumber, 0) : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t(locale, "player.value.marketValueLabel")}</span>
        <span className="scoreboard text-base">
          {t(locale, "player.value.pointsFormat", { amount: formatPoints(marketValue, locale) })}
        </span>
      </div>
      {contract ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
            <span className="text-muted-foreground">
              {t(locale, "player.value.contractSeasonFormat", { start: contract.startSeason, end: contract.endSeason })}
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
  );
}

export function ValueSectionSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <SkeletonBlock rows={3} rowClassName="h-5" />
    </div>
  );
}

/* ============================================================
 * E6 시즌별/통산 스탯
 * ============================================================ */

export async function StatSection({
  locale,
  playerId,
  playerName,
  seasonRows,
}: {
  readonly locale: SupportedLocale;
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly seasonRows: readonly PlayerStatTableSeasonRow[];
}) {
  // `seasonRows`(시즌별 탭)는 E1 헤더가 이미 조회해 둔 `seasonStats`/`seasons`에서
  // page.tsx가 계산해 내려준다(스탯 스트립과 같은 원본이라 재조회하지 않는다). `통산`
  // 탭에만 필요한 `careerStat`만 이 섹션이 독립 조회한다.
  const careerStat = await getDataSource().getPlayerCareerStat(playerId);
  return <PlayerStatTable locale={locale} playerName={playerName} seasonRows={seasonRows} careerStat={careerStat} />;
}

export function StatSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <SkeletonBlock rows={1} rowClassName="h-8 w-20" />
        <SkeletonBlock rows={1} rowClassName="h-8 w-20" />
      </div>
      <SkeletonBlock rows={5} rowClassName="h-6" />
    </div>
  );
}

/* ============================================================
 * E7 성장 곡선
 * ============================================================ */

export async function GrowthSection({
  locale,
  playerId,
  playerName,
}: {
  readonly locale: SupportedLocale;
  readonly playerId: PlayerId;
  readonly playerName: string;
}) {
  const attributeHistory = await getDataSource().getPlayerAttributeHistory(playerId);
  // 와이어프레임 05 §5 — 시즌 1개 이하면 추세를 그릴 수 없어 전용 empty 문구로 대체한다.
  const chartState =
    attributeHistory.length === 0
      ? ({ status: "empty" } as const)
      : attributeHistory.length === 1
        ? ({ status: "empty", message: t(locale, "player.growthChart.insufficientData") } as const)
        : ({ status: "ready", data: attributeHistory } as const);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <GrowthChart locale={locale} state={chartState} />
      {chartState.status === "ready" && (
        // NFR-A11Y-005 — 곡선은 시각 정보만으로 끝내지 않는다. 시즌별 OVR을 sr-only
        // 표로 병기한다. PA는 여기 없다(`PlayerAttributeHistory`에 애초에 `pa` 필드가 없다).
        <table className="sr-only">
          <caption>{t(locale, "player.growthChart.srTableCaption", { name: playerName })}</caption>
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
  );
}

export function GrowthSectionSkeleton({ locale }: { readonly locale: SupportedLocale }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <GrowthChart locale={locale} state={{ status: "loading" }} />
    </div>
  );
}

/* ============================================================
 * E8 부상 타임라인
 * ============================================================ */

export async function InjurySection({
  locale,
  playerId,
}: {
  readonly locale: SupportedLocale;
  readonly playerId: PlayerId;
}) {
  // E3(가용성 배지)와 같은 `getPlayerInjuries` 조회를 다시 한다 — 섹션 격리 원칙상
  // 두 섹션이 서로의 성공/실패에 의존하지 않아야 하므로 의도적으로 공유하지 않는다.
  const injuries = await getDataSource().getPlayerInjuries(playerId);
  const totalInjuries = injuries.length;
  const totalRoundsInjured = injuries.reduce(
    (sum, injury) => sum + Math.max(injury.returnRound - injury.occurredRound, 0),
    0,
  );

  return (
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
  );
}

export function InjurySectionSkeleton({ locale }: { readonly locale: SupportedLocale }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <InjuryTimeline locale={locale} state={{ status: "loading" }} />
    </div>
  );
}

/* ============================================================
 * E9 커리어 이력 — [트로피] / [이적]
 * ============================================================ */

export async function CareerSection({
  locale,
  playerId,
  playerTeamId,
  playerTeamName,
  seasons,
}: {
  readonly locale: SupportedLocale;
  readonly playerId: PlayerId;
  readonly playerTeamId: TeamId | null;
  readonly playerTeamName: string | null;
  readonly seasons: readonly Season[];
}) {
  const dataSource = getDataSource();
  const [trophies, awards, transfers, loans] = await Promise.all([
    playerTeamId ? dataSource.getTeamTrophies(playerTeamId) : Promise.resolve([]),
    dataSource.getPlayerAwards(playerId),
    dataSource.getPlayerTransferHistory(playerId),
    dataSource.getPlayerLoanHistory(playerId),
  ]);

  // 이적/임대 상대 클럽명 해석 — 소속 클럽(`playerTeamId`/`playerTeamName`)은 E1 헤더가
  // 이미 조회해 뒀으므로 재조회하지 않는다.
  const otherTeamIds = new Set<TeamId>();
  for (const transfer of transfers) {
    if (transfer.fromTeamId) otherTeamIds.add(transfer.fromTeamId);
    otherTeamIds.add(transfer.toTeamId);
  }
  for (const loan of loans) {
    otherTeamIds.add(loan.ownerTeamId);
    otherTeamIds.add(loan.loanTeamId);
  }
  if (playerTeamId) otherTeamIds.delete(playerTeamId);
  const otherTeams = await Promise.all([...otherTeamIds].map((teamId) => dataSource.getTeam(teamId)));
  const teamNameById = new Map<TeamId, string>();
  if (playerTeamId && playerTeamName) teamNameById.set(playerTeamId, playerTeamName);
  for (const otherTeam of otherTeams) {
    if (otherTeam) teamNameById.set(otherTeam.id, otherTeam.name);
  }

  // 소속 팀이 바뀐 이력까지 조인할 히스토리 데이터가 없어(과거 로스터-트로피 조인 계약
  // 부재) 현재 소속 팀의 트로피만 보여준다 — 이슈 후보로 보고(page.tsx 기존 판단 유지).
  const trophyRows: readonly TrophyCaseTrophyRow[] = trophies.map((trophy) => ({
    trophy,
    seasonLabel: resolveSeasonLabel(locale, seasons, trophy.seasonId),
  }));
  const awardRows: readonly TrophyCaseAwardRow[] = awards.map((award) => ({
    award,
    seasonLabel: resolveSeasonLabel(locale, seasons, award.seasonId),
  }));
  const transferHistoryRows = buildTransferHistoryRows(
    transfers.map((transfer) => ({
      transfer,
      seasonLabel: resolveSeasonLabel(locale, seasons, transfer.seasonId),
      seasonNumber: seasons.find((season) => season.id === transfer.seasonId)?.seasonNumber ?? 0,
    })),
    loans.map((loan) => ({
      loan,
      seasonLabel: resolveSeasonLabel(locale, seasons, loan.seasonId),
      seasonNumber: seasons.find((season) => season.id === loan.seasonId)?.seasonNumber ?? 0,
    })),
  );

  return (
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
  );
}

export function CareerSectionSkeleton({ locale }: { readonly locale: SupportedLocale }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <SkeletonBlock rows={1} rowClassName="h-8 w-20" />
        <SkeletonBlock rows={1} rowClassName="h-8 w-20" />
      </div>
      <TrophyCase locale={locale} state={{ status: "loading" }} />
    </div>
  );
}
