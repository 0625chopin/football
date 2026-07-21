"use client";

import { useEffect, useRef, useState } from "react";

import { usePolling } from "@/lib/data/polling";
import { isSuccess } from "@/lib/data/result";
import { EventTimelineItem } from "@/components/composite/EventTimelineItem";
import type { EventTimelineItemData } from "@/components/composite/EventTimelineItem";
import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { FixtureId, FixtureStatus } from "@/types";
import type { MatchEventsApiResponse } from "@/app/api/live/matches/[matchId]/events/types";

/** 경기 종료 이후에는 재요청하지 않는다(와이어프레임 04번 §6 I-6). */
const TERMINAL_STATUSES: readonly FixtureStatus[] = ["FINISHED", "VOID"];

/**
 * `/[lang]/matches/[matchId]` D3 이벤트 타임라인 — Task 017 D2 잔여(47일차, 5팀).
 *
 * `page.tsx`(서버, 최초 1회 렌더)가 SSR 값을 `initial*` prop으로 내려주고, 이 클라이언트
 * 컴포넌트가 그 이후의 3초 주기 재조회를 맡는다 — `setInterval`을 직접 구현하지 않고 1팀
 * H-02 계약(`usePolling`, `src/lib/data/polling.ts`)을 그대로 소비한다(R-8).
 *
 * ## 폴링 주기 — `page.tsx`가 서버에서 해석해 내려준다 (44일차 I-222와 동일 원칙)
 * `pollIntervalMs`를 생략하면 훅이 브라우저에서 직접 조회를 시도해 안전망 값(15초)에
 * 고정된다 — `./page.tsx`의 `resolvePollIntervalMs("live")` 호출부 주석 참조.
 *
 * ## 단일 페이로드 훅(`usePolling`)을 쓴다 — `usePollingList`가 아니다
 * 이 화면은 "이벤트가 0건"이 "킥오프 전이라 정상"인지 "FINISHED인데 비어 있어 의심스러움"
 * 인지 구분해야 한다(I-65). 한 응답 안에 `status`와 `rows`를 함께 실어 보내는
 * `MatchEventsApiResponse`(단일 객체)를 쓰면 그 구분을 훅이 아니라 이 컴포넌트가 직접
 * (아래 `emptyVariant` 분기) 판단할 수 있다 — `./events/types.ts` 파일 헤더 참조.
 *
 * ## 신규 이벤트 스크린리더 안내(NFR-A11Y-004, I-3)
 * 화면에 보이는 타임라인 목록과 **별개로** 시각적으로 숨긴 `aria-live="polite"` 안내
 * 전용 영역을 둔다 — 목록 쪽에 `aria-live`를 걸면 매 폴링마다 스크린리더가 전체 목록을
 * 다시 읽으려 들 위험이 있다(구현체마다 다르다). 안내 문구는 와이어프레임 04번 §6이 지정한
 * "{minute}분, {eventLabel}, {playerName}" 형식(`match.timeline.liveAnnouncement`)이며,
 * 이미 렌더된 항목의 배지 문구(`enums.matchEvent.*`)와 같은 라벨을 재사용한다(중복 카탈로그
 * 방지). 신규 이벤트 판정은 `event.sequence`(경기 내 고유 순번)로 이전에 본 것과 대조한다.
 *
 * ## 최상단 삽입(I-3) — 별도 로직 없이 정렬 순서 + 안정적 `key`로 해결
 * `buildTimelineRows`가 이미 시간 역순(최신 위)으로 정렬해 반환하므로, 신규 이벤트는
 * 배열 맨 앞에 자연히 온다. `key={row.event.id}`가 안정적이라 React가 기존 행을
 * 재마운트하지 않고 새 행만 추가한다(CLS 0, I-2 "기존 행 재마운트 금지").
 */
export interface LiveEventTimelineProps {
  readonly locale: SupportedLocale;
  readonly matchId: FixtureId;
  readonly initialStatus: FixtureStatus;
  readonly initialMinute: number | null;
  readonly initialRows: readonly EventTimelineItemData[];
  /** 서버(`page.tsx`)가 `resolvePollIntervalMs("live")`로 해석한 값 — 위 파일 헤더 참조. */
  readonly pollIntervalMs?: number;
}

export function LiveEventTimeline({
  locale,
  matchId,
  initialStatus,
  initialMinute,
  initialRows,
  pollIntervalMs,
}: LiveEventTimelineProps) {
  const [isTerminal, setIsTerminal] = useState(TERMINAL_STATUSES.includes(initialStatus));
  const [announcement, setAnnouncement] = useState("");
  // 마운트 시 SSR로 이미 받은 이벤트는 "신규"로 다시 안내하지 않는다.
  const seenSequences = useRef<ReadonlySet<number>>(new Set(initialRows.map((row) => row.event.sequence)));

  const result = usePolling<MatchEventsApiResponse>(
    () => fetchMatchEvents(matchId),
    { mode: "live", intervalMs: pollIntervalMs, enabled: !isTerminal },
  );

  useEffect(() => {
    if (!isSuccess(result)) {
      return;
    }
    const data = result.data;

    const newRows = data.rows.filter((row) => !seenSequences.current.has(row.event.sequence));
    if (newRows.length > 0) {
      setAnnouncement(
        newRows
          .map((row) =>
            t(locale, "match.timeline.liveAnnouncement", {
              minute: row.event.minute,
              eventLabel: t(locale, `enums.matchEvent.${row.event.type}`),
              playerName: row.primaryPlayerName ?? row.teamName ?? "",
            }),
          )
          .join(" "),
      );
    }
    seenSequences.current = new Set(data.rows.map((row) => row.event.sequence));

    if (TERMINAL_STATUSES.includes(data.status)) {
      setIsTerminal(true);
    }
  }, [result, locale]);

  const status = isSuccess(result) ? result.data.status : initialStatus;
  const minute = isSuccess(result) ? result.data.minute : initialMinute;
  const rows = isSuccess(result) ? result.data.rows : initialRows;

  return (
    <>
      {/* NFR-A11Y-004 — 시각적으로는 숨기고 스크린리더에만 안내(위 파일 헤더 참조). */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-col">
        {rows.length === 0 ? (
          <EventTimelineItem
            locale={locale}
            state={{ status: "empty" }}
            emptyVariant={status === "SCHEDULED" ? "kickoffPending" : "default"}
          />
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card px-4">
            {rows.map((row) => (
              <EventTimelineItem key={row.event.id} locale={locale} state={{ status: "ready", data: row }} />
            ))}
          </div>
        )}
      </div>

      {/* R-11 경계 표시 — "결과를 미리 알 수 있으면 이 화면은 실패"(와이어프레임 04번 §2)라,
          노출이 끊기는 지점을 침묵 대신 명문으로 알린다. FINISHED/VOID는 더 가릴 미래가
          없어 표시하지 않는다. */}
      {status === "LIVE" && minute !== null && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span aria-hidden>⏳</span>
          {t(locale, "match.timeline.futureBoundary", { minute })}
        </p>
      )}
    </>
  );
}

/**
 * I-182와 동일 원칙 — `DataSource`를 직접 호출하지 않고 Route Handler(`src/app/api/live/
 * matches/[matchId]/events/route.ts`)를 `fetch()`한다. `cache: "no-store"`는 이 호출이
 * 3초 주기 폴링의 "지금"을 조회하는 것이라 어느 계층에서도 캐시되면 안 되기 때문이다
 * (라우트 핸들러 쪽의 `dynamic = "force-dynamic"`과 이중으로 방어).
 */
async function fetchMatchEvents(matchId: FixtureId): Promise<MatchEventsApiResponse> {
  const response = await fetch(`/api/live/matches/${matchId}/events`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `[src/app/[lang]/matches/[matchId]/LiveEventTimeline.tsx] /api/live/matches/${matchId}/events 응답 실패 (status=${response.status})`,
    );
  }
  return (await response.json()) as MatchEventsApiResponse;
}
