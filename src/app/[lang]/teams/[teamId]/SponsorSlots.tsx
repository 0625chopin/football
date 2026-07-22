import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { formatPoints } from "@/i18n/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClubOwner, Sponsor, SponsorContract } from "@/types";

/**
 * F6 스폰서 3슬롯(`06-클럽상세.md`) — 52일차, 화면 로컬(5팀). **52일차 수락 기준
 * "스폰서 3슬롯 표기"의 본체** — 항상 3슬롯을 그리고, 계약 없는 슬롯은 "빈 슬롯"
 * 플레이스홀더로 채운다(52일차 완료 판정 = 이 요건).
 *
 * **체결 구단주(D-35) 조인 — `ClubOwner` ID 단건 조회 계약 부재로 간접 매칭**:
 * `SponsorContract.signedByOwnerId`는 `ClubOwnerId`이지만 `DataSource`엔 그 ID로
 * `ClubOwner`를 직접 조회하는 메서드가 없다(`getManager?(managerId)`처럼 감독엔 있는
 * 선택 메서드가 구단주엔 아직 없음 — I-213과 동형 갭, 이슈 후보로 보고). 호출부(page.tsx)가
 * 이미 조회해 둔 F3-o "현재" 구단주(`owner`)와 `signedByOwnerId`를 대조해 일치하면 이름을
 * 보여주고, 불일치(또는 구단주 공석)면 "체결 정보 없음"으로 대체한다 — mock 계약 생성기가
 * 항상 현재 구단주로 계약을 만들어(`world.ts` `generateSponsorContractsForTeam`) 오늘은
 * 항상 일치하지만, 소유주 교체 이력이 생기면 이 매칭이 깨질 수 있다.
 *
 * **부도 위험 배지** — `Sponsor.balance < 0 || Sponsor.bankruptAtSeason !== null`
 * (`/sponsors` 화면, 4팀 46일차 조건과 동일). `VOIDED` 계약 배지(FR-EC-011 ③, W-33 초안)와는
 * 별개 신호 — 계약은 `ACTIVE`인데 스폰서 자체가 부도 위험일 수 있다.
 */

const SLOT_COUNT = 3;

export interface SponsorSlotEntry {
  readonly contract: SponsorContract;
  readonly sponsor: Sponsor | null;
}

export interface SponsorSlotsProps {
  readonly locale: SupportedLocale;
  readonly entries: readonly SponsorSlotEntry[];
  readonly owner: ClubOwner | null;
  readonly currentSeasonNumber: number | null;
}

export function SponsorSlots({ locale, entries, owner, currentSeasonNumber }: SponsorSlotsProps) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => entries[index] ?? null);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {slots.map((entry, index) =>
        entry ? (
          <SponsorSlotCard
            key={entry.contract.id}
            locale={locale}
            entry={entry}
            owner={owner}
            currentSeasonNumber={currentSeasonNumber}
          />
        ) : (
          <EmptySlotCard key={`empty-${index}`} locale={locale} />
        ),
      )}
    </div>
  );
}

function EmptySlotCard({ locale }: { readonly locale: SupportedLocale }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-4 text-center">
      <span className="text-sm font-medium text-muted-foreground">{t(locale, "team.sponsor.emptySlotLabel")}</span>
      <span className="text-xs text-muted-foreground">{t(locale, "team.sponsor.emptySlotCaption")}</span>
    </div>
  );
}

function SponsorSlotCard({
  locale,
  entry,
  owner,
  currentSeasonNumber,
}: {
  readonly locale: SupportedLocale;
  readonly entry: SponsorSlotEntry;
  readonly owner: ClubOwner | null;
  readonly currentSeasonNumber: number | null;
}) {
  const { contract, sponsor } = entry;
  const isVoided = contract.status === "VOIDED";
  const isBankruptRisk = sponsor !== null && (sponsor.balance < 0 || sponsor.bankruptAtSeason !== null);
  const signedByName = owner && owner.id === contract.signedByOwnerId ? owner.name : null;
  const remainingSeasons =
    currentSeasonNumber !== null ? Math.max(contract.endSeason - currentSeasonNumber, 0) : null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="min-w-0 truncate font-medium" title={sponsor?.name}>
          {sponsor?.name ?? "—"}
        </span>
        <Badge variant="outline">{t(locale, "team.sponsor.scaleFormat", { scale: sponsor?.scale ?? "—" })}</Badge>
      </div>

      <p className="scoreboard text-xs">{t(locale, "team.sponsor.incomeFormat", { amount: formatPoints(contract.incomePerSeason, locale) })}</p>
      <p className="text-xs text-muted-foreground">
        {t(locale, "team.sponsor.sharePctFormat", { pct: contract.sharePct })}
        {remainingSeasons !== null && <> · {t(locale, "team.sponsor.remainingSeasonsFormat", { count: remainingSeasons })}</>}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {signedByName ? t(locale, "team.sponsor.signedByFormat", { name: signedByName }) : t(locale, "team.sponsor.signedByUnknown")}
      </p>

      {(isVoided || isBankruptRisk) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {isVoided && (
            <Badge variant="outline" className={cn("gap-1 border-warning bg-warning text-warning-foreground")}>
              <span aria-hidden>⚠</span>
              {t(locale, "team.sponsor.voidedBadge")}
            </Badge>
          )}
          {isBankruptRisk && !isVoided && (
            <Badge variant="outline" className={cn("gap-1 border-warning bg-warning text-warning-foreground")}>
              <span aria-hidden>⚠</span>
              {t(locale, "team.sponsor.bankruptRiskBadge")}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
