"use client";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { usePollingList } from "@/lib/data/polling";
import { isError, isLoading, isSuccess } from "@/lib/data/result";
import { MatchCard, computeElapsedMinutes } from "@/components/composite/MatchCard";
import type { MatchCardData } from "@/components/composite/MatchCard";
import type { SupportedLocale } from "@/i18n/locales";
import type { Fixture, FixtureStatus, LeagueId, TeamId } from "@/types";

/**
 * 홈 A2 라이브 그리드 — Task 015(35일차, 5팀) I-169 해소 후속.
 *
 * 서버 컴포넌트(`page.tsx`)는 최초 1회만 렌더하므로, 5초 재조회(`↻5s`, FR-UI-022,
 * 와이어프레임 01번 I-1~I-4)는 이 클라이언트 컴포넌트가 맡는다. `setInterval`을 직접
 * 구현하지 않고 1팀 H-02 계약(`usePollingList`, `src/lib/data/polling.ts`)을 그대로
 * 소비한다 — 탭 비활성 시 중단·재활성 시 즉시 1회 재조회는 그 훅이 이미 구현해 뒀다
 * (규약 R-8, "화면은 소비만").
 *
 * ## 경과분 — `getMatchClockContext` 사용 (I-169 해소분)
 * 매 tick마다 `getLiveFixtures()`로 받은 경기 id들로 `getMatchClockContext`를 **함께**
 * 호출해 `now`/`clock`을 원자적으로 얻는다(따로 조회 금지 — 파일 헤더 경고 참조). 이 값을
 * `MatchCard.computeElapsedMinutes`(34일차 기신설 어댑터)에 그대로 넘긴다.
 *
 * `computeElapsedMinutes(kickoffAt, clock, now)`는 내부에서 `worldMinutesAt(clock,
 * kickoffAt)`을 호출해 킥오프 시점의 월드분을 **매번 현재 `clock`으로 역산**한다 —
 * `WorldClockContext.kickoffWorldMinutesByFixtureId`(서버가 미리 캡처해 둔 근사값)를
 * 별도로 쓰지 않는 이유다. 두 경로 모두 "킥오프 이후 배속 전이가 없었다"는 동일한 근사
 * 전제(I-174 미해소 구간, `DataSource.ts` `WorldClockContext` 주석 참조) 위에 있어 오늘은
 * 결과가 같다 — 굳이 맵을 왕복시키지 않고 이미 있는 어댑터를 그대로 재사용했다.
 *
 * ## 초기 데이터 — 로딩 스켈레톤으로 되돌아가지 않는다
 * `usePollingList`는 마운트 시 항상 `LOADING`에서 시작한다(`polling.ts` 설계, 이 파일
 * 소유 밖이라 수정하지 않음). 그런데 서버가 이미 실제 카드를 렌더해 보냈으므로(LCP 요소,
 * NFR-PF-009), 첫 폴링 결과가 도착하기 전 짧은 순간에도 스켈레톤으로 되돌아가면 CLS가
 * 생긴다 — `LOADING` 동안은 `initialCards`(서버 렌더값)를 그대로 보여주고, 실제 재조회
 * 결과(`SUCCESS`/`EMPTY`)가 오면 그때 교체한다.
 */
export interface LiveMatchGridProps {
  readonly locale: SupportedLocale;
  readonly initialCards: readonly MatchCardData[];
  readonly teamNameById: Readonly<Record<TeamId, string>>;
  readonly leagueNameById: Readonly<Record<LeagueId, string>>;
  readonly className?: string;
  /**
   * 36일차 — 이 그리드가 놓이는 표면. 홈은 어두운 라이브 보드(`"board"`) 위에 둔다.
   * 값을 그대로 `MatchCard`에 전달만 하며(그 파일의 `surface` prop 주석 참조), 4상태
   * (loading/empty/error) 렌더에도 동일하게 넘겨 표면이 상태마다 바뀌지 않게 한다.
   */
  readonly surface?: "card" | "board";
}

export function LiveMatchGrid({
  locale,
  initialCards,
  teamNameById,
  leagueNameById,
  className,
  surface = "card",
}: LiveMatchGridProps) {
  const result = usePollingList<MatchCardData>(
    () => fetchLiveMatchCards(teamNameById, leagueNameById),
    { mode: "default" },
  );

  if (isError(result)) {
    // 진단용 원문(`result.error.message`)은 사용자 대면 문구가 아니므로 그대로 넘기지
    // 않는다(`result.ts` 파일 헤더 "ResultError" 절) — MatchCard가 번역된 기본 문구로
    // 대체하도록 `message`를 비운다.
    return (
      <MatchCard locale={locale} state={{ status: "error" }} surface={surface} className={className} />
    );
  }

  const cards = isLoading(result) ? initialCards : isSuccess(result) ? result.data : [];

  if (cards.length === 0) {
    return (
      <MatchCard locale={locale} state={{ status: "empty" }} surface={surface} className={className} />
    );
  }

  return (
    // 36일차(I-184 확정) — `sm:grid-cols-2`에서 `md:`로. 이 프로젝트는 `sm`을 375px로
    // 재정의해 뒀고(`docs/wireframe/00-공통규약.md` §5는 sm을 "320과 동일 취급"으로 정의),
    // Tailwind 관용구를 그대로 쓰면 휴대폰 폭에서 바로 2열이 돼 팀명이 잘린다.
    // 열 수가 바뀌는 첫 지점은 `md`(768px)다 — CLAUDE.md 스타일링 절 규약.
    <div className={className ?? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"}>
      {cards.map((data) => (
        <MatchCard
          key={data.id}
          locale={locale}
          state={{ status: "ready", data }}
          surface={surface}
        />
      ))}
    </div>
  );
}

function hasLeagueId(fixture: Fixture): fixture is Fixture & { leagueId: LeagueId } {
  return fixture.leagueId !== null;
}

async function fetchLiveMatchCards(
  teamNameById: Readonly<Record<TeamId, string>>,
  leagueNameById: Readonly<Record<LeagueId, string>>,
): Promise<readonly MatchCardData[]> {
  // 클라이언트 번들은 서버 렌더 시점의 `bootstrapApp()` 등록을 공유하지 않는다(별도 모듈
  // 그래프) — 여기서 다시 호출해도 프라미스 캐시(`bootstrap.ts`)라 비용이 크지 않다.
  await bootstrapApp();
  const dataSource = getDataSource();

  const fixtures = await dataSource.getLiveFixtures();
  const leagueFixtures = fixtures.filter(hasLeagueId);
  const fixtureIds = leagueFixtures.map((fixture) => fixture.id);
  const { now, clock } = await dataSource.getMatchClockContext(fixtureIds);

  return leagueFixtures.map((fixture) => {
    const status: FixtureStatus = fixture.status;
    return {
      id: fixture.id,
      leagueName: leagueNameById[fixture.leagueId] ?? fixture.leagueId,
      homeTeamName: teamNameById[fixture.homeTeamId] ?? fixture.homeTeamId,
      awayTeamName: teamNameById[fixture.awayTeamId] ?? fixture.awayTeamId,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      status,
      kickoffAt: fixture.kickoffAt,
      elapsedMinutes: status === "LIVE" ? computeElapsedMinutes(fixture.kickoffAt, clock, now) : null,
    } satisfies MatchCardData;
  });
}
