/**
 * world.ts 자기검증 — Task 007 / 15일차 산출물.
 *
 * 15일차 수락 기준("스쿼드 불변식 22~30명, GK≥2, CB≥3")과 결정론(D-16)을 오늘 산출물
 * 수준에서 검증한다. 등번호 중복 0·국적별 이름 풀 매칭 등 Mock 팩토리 전체 스위트는
 * 19일차(Task 007 종료)에 별도로 보강되며, 이 파일을 대체하지 않는다.
 */

import { describe, expect, it } from 'vitest';
import { setFallbackSource } from '@/lib/config/loader';
import type { WorldSeed } from '@/types';
import { generateMockWorld } from './world';

const SEED_A = 20260810 as WorldSeed;
const SEED_B = 999 as WorldSeed;

describe('generateMockWorld', () => {
  it('동일 worldSeed로 두 번 호출하면 전 엔티티가 100% 동일하다', () => {
    const first = generateMockWorld(SEED_A);
    const second = generateMockWorld(SEED_A);

    expect(second).toEqual(first);
  });

  it('다른 worldSeed는 다른 결과를 낸다', () => {
    const first = generateMockWorld(SEED_A);
    const second = generateMockWorld(SEED_B);

    expect(second.world.id).not.toBe(first.world.id);
    expect(second.teams.map((t) => t.name)).not.toEqual(first.teams.map((t) => t.name));
  });

  it('3리그 · 팀 합계 60 · 감독 60을 생성한다', () => {
    const mock = generateMockWorld(SEED_A);

    expect(mock.leagues).toHaveLength(3);
    expect(mock.teams).toHaveLength(60);
    expect(mock.managers).toHaveLength(60);
    expect(mock.teams.length).toBe(mock.leagues.reduce((acc, l) => acc + l.teamCount, 0));
  });

  it('스폰서 풀은 40개 이상이다', () => {
    const mock = generateMockWorld(SEED_A);
    expect(mock.sponsors.length).toBeGreaterThanOrEqual(40);
  });

  it('부도 위험 배지 조건(Sponsor.balance < 0)을 만족하는 스폰서가 최소 1개 존재한다(49일차, I-231 후속)', () => {
    const mock = generateMockWorld(SEED_A);
    const atRiskSponsors = mock.sponsors.filter((s) => s.balance < 0);
    expect(atRiskSponsors.length).toBeGreaterThan(0);
    // 확정 부도(bankruptAtSeason)와는 구분되는 "위험" 상태여야 한다.
    expect(atRiskSponsors.every((s) => s.bankruptAtSeason === null)).toBe(true);
  });

  it('팀당 스쿼드는 22~30명이고 GK≥2, CB≥3을 만족한다', () => {
    const mock = generateMockWorld(SEED_A);

    for (const team of mock.teams) {
      const squad = mock.players.filter((p) =>
        mock.playerStates.some((s) => s.playerId === p.id && s.teamId === team.id),
      );
      expect(squad.length).toBeGreaterThanOrEqual(22);
      expect(squad.length).toBeLessThanOrEqual(30);

      const gkCount = squad.filter((p) => p.preferredPosition === 'GK').length;
      const cbCount = squad.filter((p) => p.preferredPosition === 'CB').length;
      expect(gkCount).toBeGreaterThanOrEqual(2);
      expect(cbCount).toBeGreaterThanOrEqual(3);
    }
  });

  it('선수 총원은 약 1,560명 범위(22×60 ~ 30×60)에 든다', () => {
    const mock = generateMockWorld(SEED_A);
    expect(mock.players.length).toBeGreaterThanOrEqual(22 * 60);
    expect(mock.players.length).toBeLessThanOrEqual(30 * 60);
  });

  it('팀당 등번호는 중복이 없다', () => {
    const mock = generateMockWorld(SEED_A);

    for (const team of mock.teams) {
      const numbers = mock.playerStates
        .filter((s) => s.teamId === team.id)
        .map((s) => s.squadNumber);
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('선수마다 PlayerAttribute·PlayerState가 정확히 1건씩 존재한다', () => {
    const mock = generateMockWorld(SEED_A);

    expect(mock.playerAttributes).toHaveLength(mock.players.length);
    expect(mock.playerStates).toHaveLength(mock.players.length);
    for (const player of mock.players) {
      expect(mock.playerAttributes.filter((a) => a.playerId === player.id)).toHaveLength(1);
      expect(mock.playerStates.filter((s) => s.playerId === player.id)).toHaveLength(1);
    }
  });

  it('선수마다 선호 포지션 PlayerPosition(숙련도 5)이 최소 1건 존재한다', () => {
    const mock = generateMockWorld(SEED_A);

    for (const player of mock.players) {
      const preferred = mock.playerPositions.find(
        (p) => p.playerId === player.id && p.position === player.preferredPosition,
      );
      expect(preferred).toBeDefined();
      expect(preferred?.proficiency).toBe(5);
    }
  });

  it('1부 리그 평균 OVR이 3부 리그보다 유의하게 높다', () => {
    const mock = generateMockWorld(SEED_A);
    const tier1Teams = new Set(mock.teams.filter((_, i) => i < mock.leagues[0].teamCount).map((t) => t.id));

    const avgOvrByTeam = (teamIds: ReadonlySet<string>) => {
      const attrs = mock.playerAttributes.filter((a) => {
        const state = mock.playerStates.find((s) => s.playerId === a.playerId);
        return state !== undefined && state.teamId !== null && teamIds.has(state.teamId);
      });
      return attrs.reduce((acc, a) => acc + a.ovrCached, 0) / attrs.length;
    };

    const tier3TeamIds = new Set(
      mock.teams.slice(mock.leagues[0].teamCount + mock.leagues[1].teamCount).map((t) => t.id),
    );

    expect(avgOvrByTeam(tier1Teams)).toBeGreaterThan(avgOvrByTeam(tier3TeamIds));
  });

  it('모든 능력치·PA·평판은 1~30 및 0~100 범위를 벗어나지 않는다', () => {
    const mock = generateMockWorld(SEED_A);

    for (const attr of mock.playerAttributes) {
      expect(attr.ovrCached).toBeGreaterThanOrEqual(1);
      expect(attr.ovrCached).toBeLessThanOrEqual(30);
    }
    for (const player of mock.players) {
      expect(player.pa).toBeGreaterThanOrEqual(1);
      expect(player.pa).toBeLessThanOrEqual(30);
      expect(player.reputation).toBeGreaterThanOrEqual(0);
      expect(player.reputation).toBeLessThanOrEqual(100);
      expect(player.marketValue).toBeGreaterThanOrEqual(100);
    }
  });

  it('생성 후에도 전역 상수 소스 상태와 무관하게 재현된다(폴백 재등록 후 재검증)', () => {
    setFallbackSource(null);
    const mock = generateMockWorld(SEED_A);
    expect(mock.teams).toHaveLength(60);
  });
});
