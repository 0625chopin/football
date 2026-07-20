/**
 * penalty.ts 테스트 — Task 023 / 13일차(2026-08-06) 산출물.
 *
 * FR-MT-013 수용기준 3개(①반드시 승자 확정 ②pk_home/pk_away 분리 기록 ③player_match_stat.goals
 * 미포함)와, 완료 판정(team-schedule 13일차 행) "PK 골이 통산 득점에 0건 반영"을
 * `accumulatePlayerMatchStats`(11일차 `stats.ts`)와의 실제 통합 실행으로 직접 증명한다.
 *
 * `@/*` 별칭은 vitest에서 이미 해석되지만(1팀 Task 008, 12일차), 같은 디렉터리의
 * 기존 테스트(`tick.test.ts`/`stats.test.ts`/`substitution.test.ts`)가 전부 상대경로를
 * 쓰므로 일관성을 위해 이 파일도 상대경로로만 import한다.
 */

import { describe, expect, it } from 'vitest';
import {
  PENALTY_SHOOTOUT_BASE_ROUNDS,
  PENALTY_SHOOTOUT_RESERVED_TICK,
  simulatePenaltyShootout,
  type PenaltyKickContext,
  type PenaltyShootoutSide,
} from './penalty';
import { accumulatePlayerMatchStats } from './stats';
import type { MatchEventDraft } from './events';
import type { MatchSeed, PlayerId, TeamId } from '../../../types';

/** 테스트 픽스처 전용 캐스트 — 실제 생성 지점이 아니므로 허용(brand.type-test.ts 관례와 동일). */
const HOME_TEAM = 'team-home' as TeamId;
const AWAY_TEAM = 'team-away' as TeamId;
const SEED = 20260806 as MatchSeed;

function alwaysProbability(homeProbability: number, awayProbability: number) {
  return (ctx: PenaltyKickContext): number => (ctx.side === 'HOME' ? homeProbability : awayProbability);
}

function countScored(kicks: readonly { side: PenaltyShootoutSide; scored: boolean }[], side: PenaltyShootoutSide): number {
  return kicks.filter((k) => k.side === side && k.scored).length;
}

describe('simulatePenaltyShootout — 반드시 승자 확정 (FR-MT-013 수용기준①)', () => {
  it('한쪽이 확실히 유리한 확률이면 그 팀이 승자로 확정된다', () => {
    const result = simulatePenaltyShootout(
      { matchSeed: SEED, homeTeamId: HOME_TEAM, awayTeamId: AWAY_TEAM, resolveScoreProbability: alwaysProbability(0.9, 0.1) },
      1,
    );

    expect(result.winnerTeamId).toBe(HOME_TEAM);
    expect(result.pkHome).toBeGreaterThan(result.pkAway);
  });
});

describe('simulatePenaltyShootout — pkHome/pkAway 정확성 (FR-MT-013 수용기준②)', () => {
  it('kicks 배열의 side별 scored 개수가 pkHome/pkAway와 정확히 일치한다', () => {
    const result = simulatePenaltyShootout(
      { matchSeed: SEED, homeTeamId: HOME_TEAM, awayTeamId: AWAY_TEAM, resolveScoreProbability: alwaysProbability(0.6, 0.4) },
      1,
    );

    expect(result.pkHome).toBe(countScored(result.kicks, 'HOME'));
    expect(result.pkAway).toBe(countScored(result.kicks, 'AWAY'));
  });
});

describe('simulatePenaltyShootout — 결정론', () => {
  it('동일 options로 2회 호출하면 kicks 배열을 포함한 전체 결과가 완전히 동일하다', () => {
    const options = {
      matchSeed: SEED,
      homeTeamId: HOME_TEAM,
      awayTeamId: AWAY_TEAM,
      resolveScoreProbability: alwaysProbability(0.55, 0.5),
    };

    const first = simulatePenaltyShootout(options, 1);
    const second = simulatePenaltyShootout(options, 1);

    expect(second).toEqual(first);
  });
});

describe('simulatePenaltyShootout — 조기 확정(수학적으로 이미 결정된 경우 남은 라운드를 스킵)', () => {
  it('홈이 3라운드 연속 성공, 원정이 3라운드 연속 실패하면 4·5라운드를 진행하지 않고 6킥에서 종료된다', () => {
    const result = simulatePenaltyShootout(
      { matchSeed: SEED, homeTeamId: HOME_TEAM, awayTeamId: AWAY_TEAM, resolveScoreProbability: alwaysProbability(1, 0) },
      1,
    );

    // 3-0 확정 후 원정은 남은 2라운드(remaining=2)로도 따라잡을 수 없어 즉시 종료된다.
    expect(result.kicks).toHaveLength(6);
    expect(result.pkHome).toBe(3);
    expect(result.pkAway).toBe(0);
    expect(result.winnerTeamId).toBe(HOME_TEAM);
    expect(result.kicks.every((k) => !k.isSuddenDeath)).toBe(true);
  });
});

describe('simulatePenaltyShootout — 서든데스', () => {
  it('기본 5라운드가 전부 동률이면 서든데스로 진입하고 서든데스 라운드에서 승부가 갈린다', () => {
    const result = simulatePenaltyShootout(
      {
        matchSeed: SEED,
        homeTeamId: HOME_TEAM,
        awayTeamId: AWAY_TEAM,
        resolveScoreProbability: (ctx) => {
          if (!ctx.isSuddenDeath) {
            // 기본 5라운드는 양 팀이 항상 같은 결과(둘 다 성공)로 5-5 동률을 만든다.
            return 1;
          }
          // 서든데스에서만 홈이 유리하도록 갈라 승부를 확정시킨다.
          return ctx.side === 'HOME' ? 1 : 0;
        },
      },
      1,
    );

    const baseKicks = result.kicks.filter((k) => !k.isSuddenDeath);
    const suddenDeathKicks = result.kicks.filter((k) => k.isSuddenDeath);

    expect(baseKicks).toHaveLength(PENALTY_SHOOTOUT_BASE_ROUNDS * 2);
    expect(suddenDeathKicks.length).toBeGreaterThan(0);
    expect(suddenDeathKicks.every((k) => k.round > PENALTY_SHOOTOUT_BASE_ROUNDS)).toBe(true);
    expect(result.pkHome).toBe(5 + 1);
    expect(result.pkAway).toBe(5);
    expect(result.winnerTeamId).toBe(HOME_TEAM);
  });
});

describe('simulatePenaltyShootout — stats.ts 통합 (완료 판정 직접 증거: "PK 골이 통산 득점에 0건 반영")', () => {
  it('PENALTY_SHOOTOUT 이벤트를 정규 GOAL 이벤트와 함께 흘려도 goals는 정규 GOAL 만큼만 증가한다', () => {
    const PLAYER_A = 'player-a' as PlayerId;

    const shootout = simulatePenaltyShootout(
      { matchSeed: SEED, homeTeamId: HOME_TEAM, awayTeamId: AWAY_TEAM, resolveScoreProbability: alwaysProbability(1, 0) },
      2,
    );

    const regularGoal: MatchEventDraft = {
      sequence: 1,
      minute: 30,
      addedTime: 0,
      type: 'GOAL',
      teamId: HOME_TEAM,
      primaryPlayerId: PLAYER_A,
      secondaryPlayerId: null,
      xg: 0.3,
      relatedEventSequence: null,
      detail: {},
    };

    const events: MatchEventDraft[] = [regularGoal, shootout.event];
    const stats = accumulatePlayerMatchStats(events);

    // 승부차기는 PENALTY_SHOOTOUT 단일 구조 마커일 뿐 primaryPlayerId가 없으므로,
    // 새로운 선수 row가 생기지 않고 정규 GOAL을 넣은 PLAYER_A의 goals만 1이다.
    expect(stats.size).toBe(1);
    expect(stats.get(PLAYER_A)?.goals).toBe(1);
    expect(shootout.pkHome).toBeGreaterThan(0);
  });

  it('event는 teamId·primaryPlayerId가 null인 PENALTY_SHOOTOUT 구조 마커 1건이다', () => {
    const shootout = simulatePenaltyShootout(
      { matchSeed: SEED, homeTeamId: HOME_TEAM, awayTeamId: AWAY_TEAM, resolveScoreProbability: alwaysProbability(0.5, 0.5) },
      7,
    );

    expect(shootout.event.type).toBe('PENALTY_SHOOTOUT');
    expect(shootout.event.sequence).toBe(7);
    expect(shootout.event.teamId).toBeNull();
    expect(shootout.event.primaryPlayerId).toBeNull();
    expect(shootout.event.xg).toBeNull();
  });
});

describe('simulatePenaltyShootout — 예약 tick 값', () => {
  it('PENALTY_SHOOTOUT_RESERVED_TICK은 실제 MatchTick.tick 최대 범위(133) 밖의 값이다', () => {
    expect(PENALTY_SHOOTOUT_RESERVED_TICK).toBeGreaterThan(133);
  });
});

describe('simulatePenaltyShootout — 무한루프 방지 안전장치', () => {
  it('양 진영이 항상 같은 결과(둘 다 성공)를 반환하면 서든데스가 영원히 끝나지 않아 오류를 던진다', () => {
    expect(() =>
      simulatePenaltyShootout(
        { matchSeed: SEED, homeTeamId: HOME_TEAM, awayTeamId: AWAY_TEAM, resolveScoreProbability: alwaysProbability(1, 1) },
        1,
      ),
    ).toThrow();
  });

  it('양 진영이 항상 같은 결과(둘 다 실패)를 반환해도 동일하게 오류를 던진다', () => {
    expect(() =>
      simulatePenaltyShootout(
        { matchSeed: SEED, homeTeamId: HOME_TEAM, awayTeamId: AWAY_TEAM, resolveScoreProbability: alwaysProbability(0, 0) },
        1,
      ),
    ).toThrow();
  });
});
