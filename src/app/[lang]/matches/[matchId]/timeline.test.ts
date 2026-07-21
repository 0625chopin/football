import { describe, expect, it } from "vitest";

import type { FixtureId, MatchEvent, MatchEventId, MatchEventType, PlayerId, TeamId } from "@/types";
import { buildTimelineRows } from "./timeline";

// I-244(50일차, 5팀 처리) — Task 017 완료 판정(49일차 1팀 리뷰 게이트) 잔여 결함.
// `buildTimelineRows`(47일차 신설, D3 라이브 폴링과 SSR이 공유하는 순수 함수)가
// 시간 역순 정렬 + ASSIST→GOAL 병합(`relatedEventSequence` 매칭)이라는 실질 로직을
// 갖고 있는데도 전용 단위 테스트가 0건이었다. 자매 파일 `match-scoreboard.test.ts`
// (`EventTimelineItem.tsx` 헤더가 참조하는 선례)와 동일한 `event()` 픽스처 헬퍼 관례를
// 따른다 — 정렬 순서·ASSIST 병합·같은 분 다중 골 케이스 3가지를 검증한다.

const HOME = "team-home" as TeamId;
const AWAY = "team-away" as TeamId;
const MATCH = "match-1" as FixtureId;
const SCORER = "player-scorer" as PlayerId;
const ASSISTER = "player-assister" as PlayerId;

let sequenceCounter = 0;

function event(type: MatchEventType, overrides: Partial<MatchEvent> = {}): MatchEvent {
  sequenceCounter += 1;
  return {
    id: `event-${sequenceCounter}` as MatchEventId,
    matchId: MATCH,
    sequence: sequenceCounter,
    minute: 0,
    addedTime: 0,
    type,
    teamId: null,
    primaryPlayerId: null,
    secondaryPlayerId: null,
    xg: null,
    relatedEventSequence: null,
    detail: {},
    ...overrides,
  };
}

const teamNameById = new Map<TeamId, string>([
  [HOME, "홈팀"],
  [AWAY, "원정팀"],
]);
const playerNameById = new Map<PlayerId, string>([
  [SCORER, "득점자"],
  [ASSISTER, "도우미"],
]);

describe("buildTimelineRows", () => {
  it("시간 역순(최신 위)으로 정렬한다", () => {
    const kickoff = event("KICKOFF", { minute: 0 });
    const halfTime = event("HALF_TIME", { minute: 45, addedTime: 1 });
    const fullTime = event("FULL_TIME", { minute: 90, addedTime: 3 });

    const rows = buildTimelineRows([kickoff, halfTime, fullTime], teamNameById, playerNameById);

    expect(rows.map((row) => row.event.id)).toEqual([fullTime.id, halfTime.id, kickoff.id]);
  });

  it("45+2'는 46'보다 앞선 것으로 취급한다(추가시간을 정규분에 접지 않음)", () => {
    const stoppageGoal = event("GOAL", { minute: 45, addedTime: 2, teamId: HOME });
    const secondHalfGoal = event("GOAL", { minute: 46, addedTime: 0, teamId: AWAY });

    const rows = buildTimelineRows([stoppageGoal, secondHalfGoal], teamNameById, playerNameById);

    // 역순 정렬이므로 더 늦은 시각(46')이 먼저 나온다.
    expect(rows.map((row) => row.event.id)).toEqual([secondHalfGoal.id, stoppageGoal.id]);
  });

  it("ASSIST를 relatedEventSequence로 가리키는 GOAL에 병합하고 독립 행에서 제외한다", () => {
    const goal = event("GOAL", { minute: 30, teamId: HOME, primaryPlayerId: SCORER });
    const assist = event("ASSIST", {
      minute: 30,
      teamId: HOME,
      primaryPlayerId: ASSISTER,
      relatedEventSequence: goal.sequence,
    });

    const rows = buildTimelineRows([goal, assist], teamNameById, playerNameById);

    expect(rows).toHaveLength(1);
    expect(rows[0].event.id).toBe(goal.id);
    expect(rows[0].primaryPlayerName).toBe("득점자");
    expect(rows[0].secondaryPlayerName).toBe("도우미");
  });

  it("ASSIST가 가리키는 GOAL이 없으면(방어) 조용히 버려지고 다른 GOAL의 secondaryPlayerName은 오염되지 않는다", () => {
    const orphanAssist = event("ASSIST", { minute: 10, relatedEventSequence: 9999 });
    const unrelatedGoal = event("GOAL", { minute: 20, teamId: AWAY, primaryPlayerId: SCORER });

    const rows = buildTimelineRows([orphanAssist, unrelatedGoal], teamNameById, playerNameById);

    expect(rows).toHaveLength(1);
    expect(rows[0].event.id).toBe(unrelatedGoal.id);
    expect(rows[0].secondaryPlayerName).toBeNull();
  });

  it("같은 분(같은 minute·addedTime)에 다중 골이 나면 sequence(엔진 생성 순번)로 타이브레이크한다", () => {
    const firstGoal = event("GOAL", { minute: 60, teamId: HOME });
    const secondGoal = event("GOAL", { minute: 60, teamId: AWAY });
    const thirdGoal = event("GOAL", { minute: 60, teamId: HOME });

    const rows = buildTimelineRows([secondGoal, firstGoal, thirdGoal], teamNameById, playerNameById);

    // 같은 분이므로 sequence 역순(늦게 생성된 것이 위)으로 정렬된다.
    expect(rows.map((row) => row.event.id)).toEqual([thirdGoal.id, secondGoal.id, firstGoal.id]);
  });

  it("teamId·playerId가 null이면 해석된 이름도 null로 내려간다(팀/선수 무관 이벤트)", () => {
    const neutralEvent = event("HALF_TIME");

    const rows = buildTimelineRows([neutralEvent], teamNameById, playerNameById);

    expect(rows[0].teamName).toBeNull();
    expect(rows[0].primaryPlayerName).toBeNull();
    expect(rows[0].secondaryPlayerName).toBeNull();
  });
});
