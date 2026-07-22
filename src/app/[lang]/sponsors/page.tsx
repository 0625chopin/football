import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "@/i18n/locales";
import { formatPoints } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/state/EmptyState";
import { TeamBadge } from "@/components/domain/TeamBadge";
import type { ClubOwner, Sponsor, SponsorContract, SponsorContractStatus, Team, TeamId } from "@/types";

/**
 * `/[lang]/sponsors` 스폰서 현황 — Task 020(46일차, 4팀).
 *
 * ## 목록 배지 3종 — `DataSource.ts` 505~521줄 계약 그대로 사용
 * "계약 팀 수"는 `getSponsorContracts({ sponsorId })`로 필터된 배열의 길이를 그대로 쓴다
 * (그 계약 주석이 명시한 방식 — 상태 필터를 얹지 않는다. ACTIVE/EXPIRED/VOIDED를 가리지
 * 않고 그 스폰서가 맺은 계약 전체 건수를 "계약 팀 수"로 본다). "부도 위험 배지"는
 * `Sponsor.balance < 0` 또는 `bankruptAtSeason !== null` 둘 중 하나라도 참이면 켠다(그
 * 주석이 명시한 조건 그대로). `--warning`은 저대비 토큰이라 단독 채움 금지 규약(NFR-A11Y-002,
 * globals.css 27일차 주석)에 따라 배지를 `bg-warning`(짙지 않은 파스텔) + `text-warning-
 * foreground`(대비 8.2~9.6:1) 조합으로 채우고 "⚠" 아이콘을 라벨과 항상 병기한다 — 색만으로
 * 의미를 전달하지 않는다.
 *
 * ## 계약 상세 데이터 갭은 48일차에 해소됐다 — 이 절은 46일차 작성 당시 상태의 기록
 * 46일차 작성 시점엔 `MockDataSource.getSponsorContracts()`가 파라미터와 무관하게 항상
 * `[]`를 반환했다(`src/lib/mock/world.ts`가 스폰서만 생성하고 `SponsorContract` 레코드를
 * 만들지 않았기 때문). **48일차(3팀 H-27, I-231 해소)에 `world.ts`가 `ClubOwner`와 함께
 * 계약 레코드를 실제로 생성**하도록 바뀌어 이 화면은 이제 실값을 렌더한다(60일차 실측
 * 확인). 두 상태(있음/없음) 모두 정상 처리하는 분기는 그대로 두되(향후 계약 0건인 스폰서가
 * 있을 수 있음), "결함이 아니다"라는 이 문단의 원래 취지는 더 이상 근거가 아니다.
 *
 * ## 「체결 구단주」 열 (60일차, Task 020 소급 — D-33 경로②, D-35, I-239)
 * `SponsorContract.signedByOwnerId`는 조회 전용 필드라 그 ID로 되짚는 메서드가 따로 없다.
 * `DataSource.getClubOwner(teamId)`는 팀의 *현재* 구단주를 반환하는데, `world.ts`의
 * `generateSponsorContractsForTeam`이 계약 생성 시점에 그 팀의 구단주를 그대로
 * `signedByOwnerId`로 기록하고(교체 이력 없음) 이후 구단주가 바뀌는 로직도 없으므로
 * `contract.teamId → getClubOwner` 조인이 곧 체결 당사자와 항상 일치한다. 이름은 고유명사라
 * 변수로 그대로 주입한다(D-17, 번역 비대상) — `sponsor.contracts.ownerHeader`/`ownerUnknown`만
 * i18n 키를 경유한다.
 *
 * ## 계약 상태 라벨 — `enums.ts`(3팀)에 없어 이 화면 전용으로 로컬 매핑
 * `SponsorContractStatus`(E-29)는 `enums.ts`의 `betMarketStatus`(동명 `VOIDED`를 가진
 * 다른 enum)와 다르다. 아직 3팀 카탈로그에 없으므로 `MatchScoreboard.tsx`의
 * `NON_LIVE_STATUS` 로컬 매핑과 동일한 패턴으로 `sponsor.contracts.status*` 키를 이 파일이
 * 직접 참조한다(enums.ts 구조 변경 없음, C-6 위반 아님 — enum을 다시 "선언"하지 않고
 * 기존 유니온 값에 표시 라벨만 로컬로 붙인다).
 */
export default async function Page(props: PageProps<"/[lang]/sponsors">) {
  const { lang } = await props.params;
  const locale: SupportedLocale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const [sponsors, contracts] = await Promise.all([
    dataSource.getSponsors(),
    dataSource.getSponsorContracts(),
  ]);

  const contractsBySponsorId = new Map<Sponsor["id"], SponsorContract[]>();
  for (const contract of contracts) {
    const bucket = contractsBySponsorId.get(contract.sponsorId);
    if (bucket) {
      bucket.push(contract);
    } else {
      contractsBySponsorId.set(contract.sponsorId, [contract]);
    }
  }

  const teamIds = Array.from(new Set(contracts.map((contract) => contract.teamId)));
  const teams = teamIds.length > 0 ? await dataSource.getTeamsByIds(teamIds) : [];
  const teamById = new Map<TeamId, Team>(teams.map((team) => [team.id, team] as const));

  // 「체결 구단주」 열(D-33 경로②, D-35, I-239, 60일차 소급) — `SponsorContract.signedByOwnerId`는
  // 조회 전용 필드라 역조회 메서드가 없다. `getClubOwner(teamId)`는 팀의 *현재* 구단주를
  // 반환하지만, 계약 생성기(`world.ts` `generateSponsorContractsForTeam`)가 애초에 그 팀의
  // 구단주를 `signedByOwnerId`로 그대로 기록하므로(교체 이력 없음) 이 조인이 곧 체결 당사자다.
  const owners = teamIds.length > 0 ? await Promise.all(teamIds.map((teamId) => dataSource.getClubOwner(teamId))) : [];
  const ownerByTeamId = new Map<TeamId, ClubOwner>();
  teamIds.forEach((teamId, index) => {
    const owner = owners[index];
    if (owner) ownerByTeamId.set(teamId, owner);
  });

  const sortedSponsors = [...sponsors].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const sortedContracts = [...contracts].sort((a, b) => {
    if (a.sponsorId !== b.sponsorId) return a.sponsorId < b.sponsorId ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t(locale, "sponsor.page.title")}</h1>
        <p className="eyebrow text-muted-foreground">{t(locale, "sponsor.page.caption")}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t(locale, "sponsor.list.title")}</h2>
        {sortedSponsors.length === 0 ? (
          <EmptyState locale={locale} titleKey="sponsor.list.empty" />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sortedSponsors.map((sponsor) => {
              const contractCount = contractsBySponsorId.get(sponsor.id)?.length ?? 0;
              const isBankruptRisk = sponsor.balance < 0 || sponsor.bankruptAtSeason !== null;

              return (
                <li key={sponsor.id}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span className="min-w-0 truncate" title={sponsor.name}>
                          {sponsor.name}
                        </span>
                      </CardTitle>
                      <p className="eyebrow truncate text-muted-foreground" title={sponsor.industry}>
                        {sponsor.industry}
                      </p>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{t(locale, "sponsor.list.balanceLabel")}</span>
                        <span className="scoreboard tabular-nums">
                          {t(locale, "sponsor.common.pointsFormat", { amount: formatPoints(sponsor.balance, locale) })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{t(locale, "sponsor.list.reputationLabel")}</span>
                        <span className="tabular-nums">{sponsor.reputation}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{t(locale, "sponsor.list.scaleFormat", { scale: sponsor.scale })}</Badge>
                        <Badge variant="secondary">
                          {t(locale, "sponsor.list.contractCountFormat", { count: contractCount })}
                        </Badge>
                        {isBankruptRisk ? (
                          <Badge
                            variant="outline"
                            className={cn("gap-1 border-warning bg-warning text-warning-foreground")}
                          >
                            <span aria-hidden>⚠</span>
                            {t(locale, "sponsor.list.bankruptBadge")}
                          </Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t(locale, "sponsor.contracts.title")}</h2>
        {sortedContracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "sponsor.contracts.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>{t(locale, "sponsor.contracts.caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t(locale, "sponsor.contracts.sponsorHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "sponsor.contracts.teamHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "sponsor.contracts.ownerHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "sponsor.contracts.periodHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "sponsor.contracts.incomeHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "sponsor.contracts.sharePctHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "sponsor.contracts.statusHeader")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedContracts.map((contract) => {
                  const sponsorName = sponsors.find((sponsor) => sponsor.id === contract.sponsorId)?.name ?? "–";
                  const team = teamById.get(contract.teamId);
                  const ownerName = ownerByTeamId.get(contract.teamId)?.name;

                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="min-w-0 truncate" title={sponsorName}>
                        {sponsorName}
                      </TableCell>
                      <TableCell>
                        {team ? (
                          <TeamBadge locale={locale} size="sm" state={{ status: "ready", data: team }} />
                        ) : (
                          "–"
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 truncate" title={ownerName}>
                        {ownerName ?? t(locale, "sponsor.contracts.ownerUnknown")}
                      </TableCell>
                      <TableCell>
                        {t(locale, "sponsor.contracts.periodFormat", {
                          start: contract.startSeason,
                          end: contract.endSeason,
                        })}
                      </TableCell>
                      <TableCell className="scoreboard tabular-nums">
                        {t(locale, "sponsor.common.pointsFormat", {
                          amount: formatPoints(contract.incomePerSeason, locale),
                        })}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {t(locale, "sponsor.contracts.sharePctFormat", { pct: contract.sharePct })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(locale, SPONSOR_CONTRACT_STATUS_KEY[contract.status])}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

const SPONSOR_CONTRACT_STATUS_KEY: Readonly<Record<SponsorContractStatus, TranslationKey>> = {
  ACTIVE: "sponsor.contracts.statusActive",
  EXPIRED: "sponsor.contracts.statusExpired",
  VOIDED: "sponsor.contracts.statusVoided",
};
