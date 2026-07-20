/**
 * tournament-market.ts 테스트 — Task 035 / 31일차(2026-09-01) 산출물.
 *
 * 핵심 수락 기준: "브래킷 경로별 확률 산출". 우승 라운드(상호 배타 다항 마켓)는
 * "확률 합 = 1"(`PROBABILITY_UNIT_MAX` 정수 합계로 검증, 부동소수 근사 비교 금지 —
 * `precision.ts` 규약). 그 앞 라운드(독립 이진 마켓 묶음)는 반대로 "선택지 간 합이
 * 1이 아닐 수 있음"이 정상이므로 그 비정규화를 명시적으로 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { TeamId } from '@/types';
import { PROBABILITY_UNIT_MAX } from '@/lib/sim/rng/precision';
import { computeTournamentBracketMarket, type TournamentBracketOutcome } from './tournament-market';

const TEAM_A = 'team-a' as TeamId;
const TEAM_B = 'team-b' as TeamId;
const TEAM_C = 'team-c' as TeamId;
const TEAM_D = 'team-d' as TeamId;

/** 8강(4팀 참가) 규모 브래킷 1회 결과 — 준결승 진출(라운드 0) → 우승(라운드 1). */
function outcome(overrides: Partial<TournamentBracketOutcome> = {}): TournamentBracketOutcome {
  return {
    roundWinners: [
      [TEAM_A, TEAM_B],
      [TEAM_A],
    ],
    ...overrides,
  };
}

describe('computeTournamentBracketMarket — 입력 검증', () => {
  it('outcomes가 비어 있으면 오류를 던진다', () => {
    expect(() => computeTournamentBracketMarket([])).toThrow(RangeError);
  });

  it('반복마다 라운드 수가 다르면 오류를 던진다', () => {
    const outcomes = [
      outcome(),
      outcome({ roundWinners: [[TEAM_A, TEAM_B], [TEAM_C, TEAM_D], [TEAM_A]] }),
    ];
    expect(() => computeTournamentBracketMarket(outcomes)).toThrow(RangeError);
  });

  it('마지막 라운드 승자가 1팀이 아니면 오류를 던진다', () => {
    const outcomes = [outcome({ roundWinners: [[TEAM_A, TEAM_B], [TEAM_A, TEAM_B]] })];
    expect(() => computeTournamentBracketMarket(outcomes)).toThrow(RangeError);
  });
});

describe('computeTournamentBracketMarket — 우승 라운드(상호 배타 다항 마켓), 확률 합 = 1', () => {
  it('고르지 않은 분포에서도 우승 확률 합은 정확히 PROBABILITY_UNIT_MAX다', () => {
    const outcomes = [
      ...Array.from({ length: 7 }, () => outcome({ roundWinners: [[TEAM_A, TEAM_B], [TEAM_A]] })),
      ...Array.from({ length: 2 }, () => outcome({ roundWinners: [[TEAM_A, TEAM_B], [TEAM_B]] })),
      ...Array.from({ length: 1 }, () => outcome({ roundWinners: [[TEAM_C, TEAM_D], [TEAM_C]] })),
    ];
    const market = computeTournamentBracketMarket(outcomes);
    const championRound = market.rounds[market.rounds.length - 1];
    const sum = Object.values(championRound).reduce((a, b) => a + b, 0);
    expect(sum).toBe(PROBABILITY_UNIT_MAX);
  });

  it('한 팀이 전 반복에서 우승하면 그 팀만 확률 1, 나머지는 키 자체가 없다(확률 0 셀렉션 제외)', () => {
    const outcomes = Array.from({ length: 10 }, () => outcome());
    const market = computeTournamentBracketMarket(outcomes);
    const championRound = market.rounds[market.rounds.length - 1];
    expect(championRound).toEqual({ [TEAM_A]: PROBABILITY_UNIT_MAX });
    expect(Object.keys(championRound)).not.toContain(TEAM_B);
  });

  it('큰 N(1,500)에서도 우승 확률 합은 정확히 PROBABILITY_UNIT_MAX다', () => {
    const outcomes = Array.from({ length: 1500 }, (_, i) =>
      outcome({
        roundWinners: [
          [TEAM_A, TEAM_B],
          [i % 3 === 0 ? TEAM_A : TEAM_B],
        ],
      }),
    );
    const market = computeTournamentBracketMarket(outcomes);
    const championRound = market.rounds[market.rounds.length - 1];
    const sum = Object.values(championRound).reduce((a, b) => a + b, 0);
    expect(sum).toBe(PROBABILITY_UNIT_MAX);
  });
});

describe('computeTournamentBracketMarket — 진출 라운드(독립 이진 마켓 묶음), 선택지 간 합이 1이 아닐 수 있다', () => {
  it('반복마다 2팀이 동시에 준결승 진출하면 팀별 확률의 합은 1이 아니라 슬롯 수(=2)에 수렴한다', () => {
    // 1,000회 전부 A·B가 라운드 0(준결승)을 통과 — 각 팀 확률은 정확히 1.0, 합은 2배.
    const outcomes = Array.from({ length: 1000 }, () =>
      outcome({ roundWinners: [[TEAM_A, TEAM_B], [TEAM_A]] }),
    );
    const market = computeTournamentBracketMarket(outcomes);
    const reachRound = market.rounds[0];
    expect(reachRound).toEqual({
      [TEAM_A]: PROBABILITY_UNIT_MAX,
      [TEAM_B]: PROBABILITY_UNIT_MAX,
    });
    const sum = Object.values(reachRound).reduce((a, b) => a + b, 0);
    expect(sum).toBe(2 * PROBABILITY_UNIT_MAX);
  });

  it('팀별 진출 확률은 count/totalRuns를 6자리 고정 정밀도로 그대로 반영한다', () => {
    const outcomes = [
      ...Array.from({ length: 250 }, () =>
        outcome({ roundWinners: [[TEAM_A], [TEAM_A]] }),
      ),
      ...Array.from({ length: 750 }, () =>
        outcome({ roundWinners: [[TEAM_B], [TEAM_B]] }),
      ),
    ];
    const market = computeTournamentBracketMarket(outcomes);
    expect(market.rounds[0][TEAM_A]).toBe(250_000);
    expect(market.rounds[0][TEAM_B]).toBe(750_000);
  });

  it('한 번도 진출하지 못한 팀은 결과 레코드에 키 자체가 없다', () => {
    const outcomes = Array.from({ length: 5 }, () => outcome({ roundWinners: [[TEAM_A], [TEAM_A]] }));
    const market = computeTournamentBracketMarket(outcomes);
    expect(Object.keys(market.rounds[0])).toEqual([TEAM_A]);
  });
});

describe('computeTournamentBracketMarket — simCount·라운드 배열 형태', () => {
  it('simCount는 호출부가 넘긴 outcomes.length와 같다', () => {
    const market = computeTournamentBracketMarket(Array.from({ length: 42 }, () => outcome()));
    expect(market.simCount).toBe(42);
  });

  it('rounds.length는 roundWinners.length와 같다(라운드별 마켓 1:1 대응)', () => {
    const market = computeTournamentBracketMarket([outcome()]);
    expect(market.rounds.length).toBe(2);
  });
});
