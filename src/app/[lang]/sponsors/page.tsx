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
import type { Sponsor, SponsorContract, SponsorContractStatus, Team, TeamId } from "@/types";

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
 * ## 지금은 항상 "계약 상세 없음"으로 렌더된다 — 결함이 아니라 데이터 계층 갭
 * `MockDataSource.getSponsorContracts()`가 아직 파라미터를 무시하고 항상 `[]`를 반환하고
 * (`src/lib/data/mock/MockDataSource.ts`), 애초에 `src/lib/mock/world.ts`의 월드 생성기가
 * `SponsorContract` 레코드를 하나도 만들지 않는다(스폰서 40+개는 생성하되 계약은 생성 안
 * 함). 둘 다 이 팀 소유 경로가 아니라(`src/lib/data/**`·`src/lib/mock/**`) 직접 고치지
 * 않았다 — `archive.ts`(42일차, 완료 시즌 0건이라 항상 empty인 것과 동일 판단)와 같은
 * 이유로, 화면은 두 상태(있음/없음) 모두를 정상 처리하도록 짜고 지금 보이는 empty 결과는
 * 그대로 둔다(이슈 후보, 완료 보고 참조).
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
