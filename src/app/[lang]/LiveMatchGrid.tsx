"use client";

import { useState } from "react";

import { usePollingList } from "@/lib/data/polling";
import { isError, isLoading, isSuccess } from "@/lib/data/result";
import { MatchCard, computeElapsedMinutes } from "@/components/composite/MatchCard";
import type { MatchCardData } from "@/components/composite/MatchCard";
import type { SupportedLocale } from "@/i18n/locales";
import type { FixtureStatus, LeagueId, TeamId, Timestamp } from "@/types";
import type { LiveMatchesApiResponse } from "@/app/api/live/matches/types";

/** A2 로딩 스켈레톤 카드 수 — 와이어프레임 01번 §5 "카드 스켈레톤 6개" 명문 값 */
const LOADING_SKELETON_COUNT = 6;
const GRID_CLASS_NAME = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";

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
 * ## 36일차 — I-182 해소: 폴링 fetcher가 이제 Route Handler를 경유한다
 * `fetchLiveMatchCards`는 더 이상 `bootstrapApp()`/`getDataSource()`를 클라이언트에서
 * 직접 호출하지 않는다 — `DataSource` 조회는 `src/app/api/live/matches/route.ts`(같은 5팀
 * 소유)로 옮겼고, 이 파일은 그 응답을 `fetch()`로 받아 `MatchCardData`로 가공만 한다(팀·
 * 리그 이름 매핑, `computeElapsedMinutes` 적용). 응답 타입(`LiveMatchesApiResponse`)은 1팀
 * 정식 계약이 나오기 전까지 임시다 — `src/app/api/live/matches/types.ts` 파일 헤더 참조.
 *
 * ## 초기 데이터 — 로딩 스켈레톤으로 되돌아가지 않는다
 * `usePollingList`는 마운트 시 항상 `LOADING`에서 시작한다(`polling.ts` 설계, 이 파일
 * 소유 밖이라 수정하지 않음). 그런데 서버가 이미 실제 카드를 렌더해 보냈으므로(LCP 요소,
 * NFR-PF-009), 첫 폴링 결과가 도착하기 전 짧은 순간에도 스켈레톤으로 되돌아가면 CLS가
 * 생긴다 — `LOADING` 동안은 `initialCards`(서버 렌더값)를 그대로 보여주고, 실제 재조회
 * 결과(`SUCCESS`/`EMPTY`)가 오면 그때 교체한다.
 *
 * ## 37일차(Task 015, 5팀) — 4상태 완성
 * - **Loading**: `initialCards`가 아예 없을 때만(진짜 최초 로딩, SSR 값이 없는 소비처) A2
 *   자리에 `MatchCard` 로딩 카드 6장(`LOADING_SKELETON_COUNT`, 와이어프레임 01번 §5 명문
 *   값)을 그리드로 낸다. 홈은 항상 SSR로 `initialCards`를 채워 보내므로(위 "초기 데이터"
 *   절) 오늘 이 분기는 home에서 실제로 보이지 않는다 — 그래도 이 컴포넌트가 SSR 값 없이
 *   재사용될 소비처를 위해 4상태 계약을 온전히 갖춘다.
 * - **Empty**: 진행 중 경기가 0건이면 `MatchCard`에 `nextKickoffAt`(새 prop, `getNextKickoff`
 *   결과)을 같이 넘겨 "다음 킥오프 HH:MM"까지 보여준다(DC-07 로케일 변환은 `MatchCard`가
 *   `formatKickoff`로 한다 — 이 파일은 원본 `Timestamp`를 그대로 전달만 한다).
 * - **Error**: `MatchCard`에 `onRetry`를 넘긴다. `usePollingList`(1팀 H-02)는 수동 재조회
 *   트리거를 노출하지 않으므로, 바깥 `LiveMatchGrid`가 `retryToken` state로 안쪽
 *   `LiveMatchGridBody`를 `key` 리마운트시켜 재시도를 구현한다 — 마운트 시 훅이 즉시 1회
 *   조회하는 동작(`polling.ts`의 `void tick()`)을 그대로 재사용할 뿐, 1팀 소유 파일은
 *   건드리지 않는다.
 */
export interface LiveMatchGridProps {
  readonly locale: SupportedLocale;
  /** 서버 렌더값(LCP·CLS 방지, 위 "초기 데이터" 절). 생략하면(진짜 최초 로딩) 스켈레톤
   * 6장을 보여준다. */
  readonly initialCards?: readonly MatchCardData[];
  readonly teamNameById: Readonly<Record<TeamId, string>>;
  readonly leagueNameById: Readonly<Record<LeagueId, string>>;
  /** 진행 중 경기가 0건일 때 Empty 상태에 "다음 킥오프" 시각을 같이 보여주기 위함(위
   * "37일차" 절). 생략하면 시각 없이 기본 문구만 보여준다. */
  readonly nextKickoffAt?: Timestamp | null;
  readonly className?: string;
  /**
   * 36일차 — 이 그리드가 놓이는 표면. 홈은 어두운 라이브 보드(`"board"`) 위에 둔다.
   * 값을 그대로 `MatchCard`에 전달만 하며(그 파일의 `surface` prop 주석 참조), 4상태
   * (loading/empty/error) 렌더에도 동일하게 넘겨 표면이 상태마다 바뀌지 않게 한다.
   */
  readonly surface?: "card" | "board";
}

export function LiveMatchGrid(props: LiveMatchGridProps) {
  // 재시도(와이어프레임 01번 §5 Error 행 "[다시 시도]") — `key`를 바꿔 안쪽 컴포넌트를
  // 통째로 리마운트한다(위 파일 헤더 "37일차" 절 참조).
  const [retryToken, setRetryToken] = useState(0);
  return (
    <LiveMatchGridBody
      key={retryToken}
      {...props}
      onRetry={() => setRetryToken((token) => token + 1)}
    />
  );
}

function LiveMatchGridBody({
  locale,
  initialCards,
  teamNameById,
  leagueNameById,
  nextKickoffAt,
  className,
  surface = "card",
  onRetry,
}: LiveMatchGridProps & { readonly onRetry: () => void }) {
  const result = usePollingList<MatchCardData>(
    () => fetchLiveMatchCards(teamNameById, leagueNameById),
    { mode: "default" },
  );

  if (isLoading(result) && initialCards === undefined) {
    return (
      <div className={className ?? GRID_CLASS_NAME}>
        {Array.from({ length: LOADING_SKELETON_COUNT }, (_, index) => (
          <MatchCard key={index} locale={locale} state={{ status: "loading" }} surface={surface} />
        ))}
      </div>
    );
  }

  if (isError(result)) {
    // 진단용 원문(`result.error.message`)은 사용자 대면 문구가 아니므로 그대로 넘기지
    // 않는다(`result.ts` 파일 헤더 "ResultError" 절) — MatchCard가 번역된 기본 문구로
    // 대체하도록 `message`를 비운다.
    return (
      <MatchCard
        locale={locale}
        state={{ status: "error" }}
        surface={surface}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  const cards = isLoading(result) ? (initialCards ?? []) : isSuccess(result) ? result.data : [];

  if (cards.length === 0) {
    return (
      <MatchCard
        locale={locale}
        state={{ status: "empty" }}
        surface={surface}
        emptyNextKickoffAt={nextKickoffAt}
        className={className}
      />
    );
  }

  return (
    // 36일차(I-184 확정) — `sm:grid-cols-2`에서 `md:`로. 이 프로젝트는 `sm`을 375px로
    // 재정의해 뒀고(`docs/wireframe/00-공통규약.md` §5는 sm을 "320과 동일 취급"으로 정의),
    // Tailwind 관용구를 그대로 쓰면 휴대폰 폭에서 바로 2열이 돼 팀명이 잘린다.
    // 열 수가 바뀌는 첫 지점은 `md`(768px)다 — CLAUDE.md 스타일링 절 규약.
    <div className={className ?? GRID_CLASS_NAME}>
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

/**
 * I-182 해소(36일차) — `DataSource`를 직접 호출하지 않고 Route Handler(`src/app/api/live/
 * matches/route.ts`)를 `fetch()`한다. `cache: "no-store"`는 이 호출이 5초 주기 폴링의
 * "지금"을 조회하는 것이라 브라우저/Next 어느 계층에서도 캐시되면 안 되기 때문이다(라우트
 * 핸들러 쪽의 `dynamic = "force-dynamic"`과 이중으로 방어).
 */
async function fetchLiveMatchCards(
  teamNameById: Readonly<Record<TeamId, string>>,
  leagueNameById: Readonly<Record<LeagueId, string>>,
): Promise<readonly MatchCardData[]> {
  const response = await fetch("/api/live/matches", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `[src/app/[lang]/LiveMatchGrid.tsx] /api/live/matches 응답 실패 (status=${response.status})`,
    );
  }

  const { fixtures, matchClock } = (await response.json()) as LiveMatchesApiResponse;

  return fixtures.map((fixture) => {
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
      elapsedMinutes:
        status === "LIVE"
          ? computeElapsedMinutes(fixture.kickoffAt, matchClock.clock, matchClock.now)
          : null,
    } satisfies MatchCardData;
  });
}
