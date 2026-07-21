"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * B1 시즌 선택기(`[시즌 3▾]`) — Task 016(41일차 인계분, 5팀), 화면 로컬.
 * `docs/wireframe/02-리그-순위표.md` §4 B1 각주 "시즌 선택기는 아카이브 시즌 포함
 * (UC-011 연동)", §6 I-5.
 *
 * ## `LocaleSwitcher`와 같은 관례 — 라우팅 세그먼트 대신 쿼리스트링
 * 로케일은 경로 세그먼트가 단일 소스라 세그먼트를 바꿨지만, 시즌은 세그먼트가 아니라
 * `DataSource.getStandings`/`getFixturesByRound`의 `seasonId` 파라미터다. 그래서 여기서는
 * `?season=<id>` 쿼리를 바꾸는 `router.replace`를 쓴다(뒤로가기 스택에 남기지 않는 설정
 * 전환 취급은 `LocaleSwitcher` 헤더 주석과 동일 판단).
 *
 * 시즌을 바꾸면 `round` 쿼리는 함께 지운다 — 리그별 총 라운드 수가 시즌마다 다를 수 있어
 * (라운드 간격은 공통코드지만 팀 수 변경 시 라운드 총수도 바뀔 수 있음) 이전 시즌 기준
 * 라운드 번호를 새 시즌에 그대로 들고 가면 범위를 벗어날 수 있다. 대상 페이지가 매 요청
 * `getFixtureRoundBounds`로 라운드를 재계산해 기본 라운드로 되돌아간다.
 *
 * ## 오늘 Mock 한계
 * `MockDataSource.getSeasons()`는 진행 중 시즌 1건만 반환한다(과거 시즌 스냅샷 생성기가
 * 아직 없음 — `MockDataSource.ts` 파일 헤더 "데이터가 없는 메서드" 절 참조). 그래서 이
 * 컴포넌트는 오늘 실질적으로 옵션이 1개뿐이라 기능적으로는 무동작이지만, 구조는 아카이브
 * 시즌이 늘어나는 순간 그대로 동작한다(Mock First 원칙 — 데이터 조회 부분만 교체).
 */
export interface SeasonSelectOption {
  readonly id: string;
  readonly seasonNumber: number;
}

export interface SeasonSelectProps {
  readonly locale: SupportedLocale;
  readonly seasons: readonly SeasonSelectOption[];
  readonly currentSeasonId: string;
  readonly className?: string;
}

export function SeasonSelect({ locale, seasons, currentSeasonId, className }: SeasonSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextSeasonId: string) {
    if (nextSeasonId === currentSeasonId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("season", nextSeasonId);
    params.delete("round");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      aria-label={t(locale, "league.header.seasonSelectorLabel")}
      value={currentSeasonId}
      disabled={seasons.length <= 1}
      onChange={(event) => handleChange(event.target.value)}
      className={cn(
        "rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm",
        "focus-visible:ring-2 focus-visible:ring-current/40 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      {seasons.map((season) => (
        <option key={season.id} value={season.id} className="text-foreground">
          {t(locale, "league.header.seasonLabel", { number: season.seasonNumber })}
        </option>
      ))}
    </select>
  );
}
