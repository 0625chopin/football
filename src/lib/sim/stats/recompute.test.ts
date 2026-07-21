/**
 * recompute.ts 테스트 — Task 026 / 38일차(2026-09-10) 산출물.
 *
 * 수락 기준 "재계산 결과 = 누적 결과"를 직접 단언한다: 여러 경기의 이벤트 로그를
 * ① 경기가 끝날 때마다 `accumulateMatchStatsIntoSeason()`으로 한 건씩 누적한 결과와
 * ② `recomputePlayerSeasonStatsFromEventLogs()`/`recomputeTeamSeasonStatsFromEventLogs()`로
 * 시즌 전체를 한꺼번에 재계산한 결과가 항상 같은 값이어야 한다. 그 외에
 * `foldPlayerStatsIntoTeams()`의 로스터 귀속 규칙, 빈 입력 경계도 함께 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { MatchEventType, PlayerId, TeamId } from '@/types';
import type { MatchEventDraft } from '../match/events';
import { accumulatePlayerMatchStats, type PlayerMatchStatTierAFold } from '../match/stats';
import {
  accumulateMatchStatsIntoSeason,
  accumulateSeasonStats,
  foldPlayerStatsIntoTeams,
  recomputePlayerSeasonStatsFromEventLogs,
  recomputeTeamSeasonStatsFromEventLogs,
  type TeamStatEventLogEntry,
} from './recompute';

const PLAYER_A = 'player-a' as PlayerId;
const PLAYER_B = 'player-b' as PlayerId;
const PLAYER_C = 'player-c' as PlayerId;
const TEAM_HOME = 'team-home' as TeamId;
const TEAM_AWAY = 'team-away' as TeamId;

/** stats.test.ts와 동일한 픽스처 헬퍼 — 실제 생성 지점(events.ts)이 아니므로 필드를 직접 채운다. */
function makeEvent(overrides: Partial<MatchEventDraft> & { type: MatchEventType }): MatchEventDraft {
  return {
    sequence: 1,
    minute: 10,
    addedTime: 0,
    teamId: TEAM_HOME,
    primaryPlayerId: null,
    secondaryPlayerId: null,
    xg: null,
    relatedEventSequence: null,
    detail: {},
    ...overrides,
  };
}

/** 3경기 분량의 서로 다른 이벤트 로그 — 같은 선수가 여러 경기에 걸쳐 등장하도록 구성. */
const MATCH_1_EVENTS: readonly MatchEventDraft[] = [
  makeEvent({ type: 'GOAL', primaryPlayerId: PLAYER_A, xg: 0.4 }),
  makeEvent({ type: 'ASSIST', primaryPlayerId: PLAYER_B }),
  makeEvent({ type: 'YELLOW_CARD', primaryPlayerId: PLAYER_C }),
];

const MATCH_2_EVENTS: readonly MatchEventDraft[] = [
  makeEvent({ type: 'SHOT_ON', primaryPlayerId: PLAYER_A, xg: 0.2 }),
  makeEvent({ type: 'GOAL', primaryPlayerId: PLAYER_A, xg: 0.5 }),
  makeEvent({ type: 'FOUL', primaryPlayerId: PLAYER_C, secondaryPlayerId: PLAYER_B }),
];

const MATCH_3_EVENTS: readonly MatchEventDraft[] = [
  makeEvent({ type: 'RED_CARD', primaryPlayerId: PLAYER_C }),
  makeEvent({ type: 'PENALTY_SCORED', primaryPlayerId: PLAYER_B, xg: 0.76 }),
  makeEvent({ type: 'OWN_GOAL', primaryPlayerId: PLAYER_A }),
];

const SEASON_EVENT_LOGS: readonly (readonly MatchEventDraft[])[] = [
  MATCH_1_EVENTS,
  MATCH_2_EVENTS,
  MATCH_3_EVENTS,
];

describe('recomputePlayerSeasonStatsFromEventLogs — 재계산 결과 = 누적 결과 (수락 기준)', () => {
  it('경기마다 한 건씩 누적한 결과와 시즌 전체를 한꺼번에 재계산한 결과가 선수 단위로 동일하다', () => {
    // ① 누적 경로 — 경기가 끝날 때마다 accumulateMatchStatsIntoSeason()을 한 번씩 호출.
    let accumulated: ReadonlyMap<PlayerId, PlayerMatchStatTierAFold> = new Map();
    for (const events of SEASON_EVENT_LOGS) {
      accumulated = accumulateMatchStatsIntoSeason(accumulated, accumulatePlayerMatchStats(events));
    }

    // ② 재계산 경로 — 시즌 전체 이벤트 로그를 한꺼번에 넣어 처음부터 다시 계산.
    const recomputed = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);

    expect(recomputed).toEqual(accumulated);
    // 값 자체도 비어 있지 않음을 함께 확인(항상-동일-빈값으로 통과하는 위양성 방지).
    expect(recomputed.size).toBeGreaterThan(0);
  });

  it('선수 A의 시즌 누계가 경기별 폴드의 산술 합과 일치한다(goals=2, xg=0.4+0.2+0.5, ownGoals=1)', () => {
    const recomputed = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);
    const playerA = recomputed.get(PLAYER_A);

    expect(playerA).toBeDefined();
    expect(playerA?.goals).toBe(2);
    expect(playerA?.shots).toBe(3); // GOAL(match1) + SHOT_ON + GOAL(match2)
    expect(playerA?.shotsOnTarget).toBe(3);
    expect(playerA?.xg).toBeCloseTo(0.4 + 0.2 + 0.5, 10);
    expect(playerA?.ownGoals).toBe(1);
  });

  it('accumulateSeasonStats()(배치 리듀스)로 만든 결과도 동일하다 — 세 경로가 전부 일치', () => {
    const viaBatchReduce = accumulateSeasonStats(
      SEASON_EVENT_LOGS.map((events) => accumulatePlayerMatchStats(events)),
    );
    const viaRecompute = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);

    expect(viaBatchReduce).toEqual(viaRecompute);
  });

  it('빈 이벤트 로그 배열이면 빈 맵을 반환한다', () => {
    expect(recomputePlayerSeasonStatsFromEventLogs([]).size).toBe(0);
  });

  it('경기 순서를 바꿔도(교환 법칙) 재계산 결과가 동일하다', () => {
    const forward = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);
    const reversed = recomputePlayerSeasonStatsFromEventLogs([...SEASON_EVENT_LOGS].reverse());

    expect(reversed).toEqual(forward);
  });
});

describe('recomputePlayerSeasonStatsFromEventLogs / recomputeTeamSeasonStatsFromEventLogs — 재호출 멱등성', () => {
  it('선수 단위 재계산을 여러 번 호출해도 항상 완전히 동일한 결과다(누적되지 않음)', () => {
    const first = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);
    const second = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);
    const third = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    // "매번 재계산해도 goals가 2에서 4, 6으로 불어나지 않는다"를 값으로 직접 증명.
    expect(second.get(PLAYER_A)?.goals).toBe(first.get(PLAYER_A)?.goals);
  });

  it('팀 단위 재계산을 여러 번 호출해도 항상 완전히 동일한 결과다(누적되지 않음)', () => {
    const roster: ReadonlyMap<PlayerId, TeamId> = new Map([
      [PLAYER_A, TEAM_HOME],
      [PLAYER_B, TEAM_AWAY],
      [PLAYER_C, TEAM_HOME],
    ]);
    const teamEventLogs: readonly TeamStatEventLogEntry[] = SEASON_EVENT_LOGS.map((events) => ({
      events,
      roster,
    }));

    const first = recomputeTeamSeasonStatsFromEventLogs(teamEventLogs);
    const second = recomputeTeamSeasonStatsFromEventLogs(teamEventLogs);

    expect(second).toEqual(first);
  });

  it('재계산 호출 전후로 원본 이벤트 로그·로스터 맵이 변형되지 않는다', () => {
    const roster: ReadonlyMap<PlayerId, TeamId> = new Map([[PLAYER_A, TEAM_HOME]]);
    const rosterSnapshot = new Map(roster);
    const eventsSnapshot = JSON.parse(JSON.stringify(SEASON_EVENT_LOGS));

    recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);
    recomputeTeamSeasonStatsFromEventLogs([{ events: MATCH_1_EVENTS, roster }]);

    expect(SEASON_EVENT_LOGS).toEqual(eventsSnapshot);
    expect(roster).toEqual(rosterSnapshot);
  });
});

describe('accumulateMatchStatsIntoSeason — 인자 불변(순수 함수)', () => {
  it('season/matchFold 인자를 변형하지 않고 항상 새 Map을 반환한다', () => {
    const season = accumulateMatchStatsIntoSeason(new Map(), accumulatePlayerMatchStats(MATCH_1_EVENTS));
    const seasonSnapshot = new Map(season);
    const matchFold = accumulatePlayerMatchStats(MATCH_2_EVENTS);
    const matchFoldSnapshot = new Map(matchFold);

    const next = accumulateMatchStatsIntoSeason(season, matchFold);

    expect(season).toEqual(seasonSnapshot);
    expect(matchFold).toEqual(matchFoldSnapshot);
    expect(next).not.toBe(season);
  });
});

describe('foldPlayerStatsIntoTeams — 로스터 귀속', () => {
  const ROSTER: ReadonlyMap<PlayerId, TeamId> = new Map([
    [PLAYER_A, TEAM_HOME],
    [PLAYER_B, TEAM_AWAY],
    // PLAYER_C는 의도적으로 로스터에서 제외 — "관여하지 않은 것으로 간주"를 검증.
  ]);

  it('로스터에 있는 선수의 폴드만 소속 팀으로 합산되고, 로스터 밖 선수는 건너뛴다', () => {
    const playerFold = accumulatePlayerMatchStats(MATCH_1_EVENTS);
    const teamFold = foldPlayerStatsIntoTeams(playerFold, ROSTER);

    expect(teamFold.get(TEAM_HOME)?.goals).toBe(1); // PLAYER_A의 GOAL
    expect(teamFold.get(TEAM_AWAY)?.assists).toBe(1); // PLAYER_B의 ASSIST
    // PLAYER_C(YELLOW_CARD)는 로스터에 없어 어느 팀 폴드에도 반영되지 않는다.
    const totalYellowCards =
      (teamFold.get(TEAM_HOME)?.yellowCards ?? 0) + (teamFold.get(TEAM_AWAY)?.yellowCards ?? 0);
    expect(totalYellowCards).toBe(0);
  });

  it('로스터가 빈 맵이면 팀 폴드도 빈 맵이다', () => {
    const playerFold = accumulatePlayerMatchStats(MATCH_1_EVENTS);
    expect(foldPlayerStatsIntoTeams(playerFold, new Map()).size).toBe(0);
  });
});

describe('recomputeTeamSeasonStatsFromEventLogs — 재계산 결과 = 누적 결과 (팀 단위)', () => {
  const FULL_ROSTER: ReadonlyMap<PlayerId, TeamId> = new Map([
    [PLAYER_A, TEAM_HOME],
    [PLAYER_B, TEAM_AWAY],
    [PLAYER_C, TEAM_HOME],
  ]);

  const TEAM_EVENT_LOGS: readonly TeamStatEventLogEntry[] = SEASON_EVENT_LOGS.map((events) => ({
    events,
    roster: FULL_ROSTER,
  }));

  it('경기마다 한 건씩 누적한 팀 결과와 시즌 전체 재계산 팀 결과가 동일하다', () => {
    let accumulated: ReadonlyMap<TeamId, PlayerMatchStatTierAFold> = new Map();
    for (const { events, roster } of TEAM_EVENT_LOGS) {
      const playerFold = accumulatePlayerMatchStats(events);
      const teamFold = foldPlayerStatsIntoTeams(playerFold, roster);
      accumulated = accumulateMatchStatsIntoSeason(accumulated, teamFold);
    }

    const recomputed = recomputeTeamSeasonStatsFromEventLogs(TEAM_EVENT_LOGS);

    expect(recomputed).toEqual(accumulated);
    expect(recomputed.size).toBeGreaterThan(0);
  });

  it('TEAM_HOME(선수 A·C 소속) 시즌 합산이 개별 선수 시즌 합산의 팀 내 합과 일치한다', () => {
    const teamRecomputed = recomputeTeamSeasonStatsFromEventLogs(TEAM_EVENT_LOGS);
    const playerRecomputed = recomputePlayerSeasonStatsFromEventLogs(SEASON_EVENT_LOGS);

    const teamHomeGoals = teamRecomputed.get(TEAM_HOME)?.goals ?? -1;
    const expectedGoals =
      (playerRecomputed.get(PLAYER_A)?.goals ?? 0) + (playerRecomputed.get(PLAYER_C)?.goals ?? 0);

    expect(teamHomeGoals).toBe(expectedGoals);
  });
});
