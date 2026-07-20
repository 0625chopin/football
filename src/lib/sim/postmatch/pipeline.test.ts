/**
 * pipeline.ts 테스트 — Task 026 / 33일차 산출물.
 *
 * 완료 판정(team-schedule 33일차 행) "7종 순서 고정"을 `runPostMatchPipeline()`의
 * `executedStages` 실행 트레이스로 직접 검증한다. 그 외에는 오늘 실제로 배선한 4개
 * 스테이지(스코어 확정·스탯 누적·카드·정지·정산 트리거)의 동작과, 계약만 있는 3개
 * 스테이지(순위 갱신·컨디션·피로·부상 판정)가 `implemented: false` 마커로만 존재한다는
 * 것을 확인한다.
 */

import { describe, expect, it } from 'vitest';
import {
  POST_MATCH_STAGE_ORDER,
  buildSettlementTrigger,
  confirmMatchScore,
  runCardSuspensionStage,
  runPostMatchPipeline,
  runStatAccumulationStage,
  type PlayerCardSuspensionInput,
  type PostMatchPipelineInput,
  type RawMatchScoreInput,
} from './pipeline';
import type { PlayerDisciplineState } from '../discipline/suspension';
import type { MatchEventDraft } from '../match/events';
import type { FixtureId, LeagueId, MatchEventType, PlayerId, SeasonId, TeamId } from '@/types';

const TEAM_HOME = 'team-home' as TeamId;
const TEAM_AWAY = 'team-away' as TeamId;
const PLAYER_A = 'player-a' as PlayerId;
const PLAYER_B = 'player-b' as PlayerId;

const FIXTURE_IDENTITY = {
  fixtureId: 'fixture-1' as FixtureId,
  seasonId: 'season-1' as SeasonId,
  leagueId: 'league-1' as LeagueId,
  competitionType: 'LEAGUE' as const,
  homeTeamId: TEAM_HOME,
  awayTeamId: TEAM_AWAY,
};

const VALID_RAW_SCORE: RawMatchScoreInput = {
  homeScore: 2,
  awayScore: 1,
  htHomeScore: 1,
  htAwayScore: 0,
  etHomeScore: null,
  etAwayScore: null,
  pkHome: null,
  pkAway: null,
};

/** 테스트 픽스처 전용 이벤트 생성 헬퍼 — `stats.test.ts` 관례와 동일. */
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

const baseDisciplineState = (): PlayerDisciplineState => ({
  yellowAccumulatedLeague: 0,
  yellowAccumulatedCup: 0,
  suspensionRemainingLeague: 0,
  suspensionRemainingCup: 0,
});

describe('POST_MATCH_STAGE_ORDER — 7종 고정', () => {
  it('정확히 7개, 문서에 명시된 순서(스코어확정/순위갱신/스탯누적/컨디션피로/부상판정/카드정지/정산트리거) 그대로다', () => {
    expect(POST_MATCH_STAGE_ORDER).toEqual([
      'SCORE_CONFIRMATION',
      'STANDINGS_UPDATE',
      'STAT_ACCUMULATION',
      'CONDITION_FATIGUE',
      'INJURY_ASSESSMENT',
      'CARD_SUSPENSION',
      'SETTLEMENT_TRIGGER',
    ]);
  });
});

describe('confirmMatchScore — 스테이지 1', () => {
  it('정상 스코어는 status: FINISHED로 확정된다', () => {
    const result = confirmMatchScore(VALID_RAW_SCORE);
    expect(result).toEqual({ ...VALID_RAW_SCORE, status: 'FINISHED' });
  });

  it('음수 스코어는 오류', () => {
    expect(() => confirmMatchScore({ ...VALID_RAW_SCORE, homeScore: -1 })).toThrow(RangeError);
  });

  it('비정수 스코어는 오류', () => {
    expect(() => confirmMatchScore({ ...VALID_RAW_SCORE, awayScore: 1.5 })).toThrow(RangeError);
  });

  it('ht 쌍 중 한쪽만 있으면 오류', () => {
    expect(() => confirmMatchScore({ ...VALID_RAW_SCORE, htHomeScore: 1, htAwayScore: null })).toThrow(
      RangeError,
    );
  });

  it('승부차기가 있는데 연장 스코어가 없으면 오류', () => {
    expect(() => confirmMatchScore({ ...VALID_RAW_SCORE, pkHome: 5, pkAway: 4 })).toThrow(RangeError);
  });

  it('승부차기가 무승부면 오류', () => {
    const withEt = { ...VALID_RAW_SCORE, etHomeScore: 0, etAwayScore: 0, pkHome: 4, pkAway: 4 };
    expect(() => confirmMatchScore(withEt)).toThrow(RangeError);
  });

  it('연장·승부차기가 모두 정상이면 확정된다', () => {
    const withEt: RawMatchScoreInput = {
      ...VALID_RAW_SCORE,
      etHomeScore: 0,
      etAwayScore: 0,
      pkHome: 5,
      pkAway: 4,
    };
    expect(confirmMatchScore(withEt).status).toBe('FINISHED');
  });
});

describe('runStatAccumulationStage — 스테이지 3', () => {
  it('accumulatePlayerMatchStats에 그대로 위임한다(골 1개 → goals: 1)', () => {
    const events: MatchEventDraft[] = [makeEvent({ type: 'GOAL', primaryPlayerId: PLAYER_A })];
    const result = runStatAccumulationStage(events);
    expect(result.get(PLAYER_A)?.goals).toBe(1);
  });
});

describe('runCardSuspensionStage — 스테이지 6', () => {
  it('스탯 누적 산출값(카드 3필드)을 그대로 소비해 정지를 반영하고, 라운드도 진행한다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ type: 'YELLOW_CARD', primaryPlayerId: PLAYER_A }),
      makeEvent({ type: 'RED_CARD', primaryPlayerId: PLAYER_A, sequence: 2 }),
    ];
    const statByPlayer = runStatAccumulationStage(events);

    const roster = new Map<PlayerId, PlayerCardSuspensionInput>([
      [
        PLAYER_A,
        {
          priorState: { ...baseDisciplineState(), suspensionRemainingLeague: 2 },
          competition: 'LEAGUE',
          dismissalSuspensionGames: 2,
        },
      ],
      [PLAYER_B, { priorState: { ...baseDisciplineState(), suspensionRemainingLeague: 1 }, competition: 'LEAGUE' }],
    ]);

    const result = runCardSuspensionStage(statByPlayer, roster);

    // A: 옐로 1(누적 미달) + 레드 퇴장(2경기) = +2, 기존 잔여 2 → 4, 라운드 진행으로 -1 → 3
    expect(result.get(PLAYER_A)?.suspensionRemainingLeague).toBe(3);
    // B: 카드 없음(statByPlayer에 항목 없음) — 라운드 진행만, 기존 1 → 0
    expect(result.get(PLAYER_B)?.suspensionRemainingLeague).toBe(0);
  });
});

describe('buildSettlementTrigger — 스테이지 7', () => {
  it('정산 계산 없이 확정 스코어의 필요한 필드만 넘긴다', () => {
    const confirmed = confirmMatchScore(VALID_RAW_SCORE);
    const trigger = buildSettlementTrigger(FIXTURE_IDENTITY, confirmed);
    expect(trigger).toEqual({
      ...FIXTURE_IDENTITY,
      finalScore: { homeScore: 2, awayScore: 1, pkHome: null, pkAway: null },
      readyForSettlement: true,
    });
  });
});

describe('runPostMatchPipeline — 오케스트레이터', () => {
  function buildInput(): PostMatchPipelineInput {
    return {
      fixture: FIXTURE_IDENTITY,
      rawScore: VALID_RAW_SCORE,
      events: [makeEvent({ type: 'GOAL', primaryPlayerId: PLAYER_A })],
      disciplineRoster: new Map<PlayerId, PlayerCardSuspensionInput>([
        [PLAYER_A, { priorState: baseDisciplineState(), competition: 'LEAGUE' }],
      ]),
    };
  }

  it('executedStages가 POST_MATCH_STAGE_ORDER와 정확히 같다(7종 순서 고정)', () => {
    const result = runPostMatchPipeline(buildInput());
    expect(result.executedStages).toEqual(POST_MATCH_STAGE_ORDER);
  });

  it('배선된 4개 스테이지는 실제 값을, 계약뿐인 3개 스테이지는 implemented: false 마커를 반환한다', () => {
    const result = runPostMatchPipeline(buildInput());

    expect(result.scoreConfirmation.status).toBe('FINISHED');
    expect(result.statAccumulation.get(PLAYER_A)?.goals).toBe(1);
    expect(result.cardSuspension.get(PLAYER_A)).toBeDefined();
    expect(result.settlementTrigger.readyForSettlement).toBe(true);

    expect(result.standingsUpdate.implemented).toBe(false);
    expect(result.conditionFatigue.implemented).toBe(false);
    expect(result.injuryAssessment.implemented).toBe(false);
    expect(result.standingsUpdate.stage).toBe('STANDINGS_UPDATE');
    expect(result.conditionFatigue.stage).toBe('CONDITION_FATIGUE');
    expect(result.injuryAssessment.stage).toBe('INJURY_ASSESSMENT');
  });

  it('스코어가 유효하지 않으면 스테이지 1에서 던지고 이후 스테이지는 실행되지 않는다(부분 반영 없음)', () => {
    const input = { ...buildInput(), rawScore: { ...VALID_RAW_SCORE, homeScore: -1 } };
    expect(() => runPostMatchPipeline(input)).toThrow(RangeError);
  });
});
