/**
 * progress.ts 자기검증 — Task 007 / 16일차 산출물.
 *
 * 16일차 산출물("6종 Mock 생성")의 결정론(D-16)과 각 스냅샷의 내적 정합(played=won+drawn+lost,
 * 득점 이벤트 수=스코어, 브래킷 경기 수=팀수-1 등)을 오늘 수준에서 검증한다. 전체 스위트
 * 보강은 19일차(Task 007 종료)에 이어진다 — `world.test.ts` 헤더와 동일한 전례.
 */

import { describe, expect, it } from 'vitest';
import type { WorldSeed } from '@/types';
import { generateMockProgress, MOCK_NOW } from './progress';
import { generateMockWorld } from './world';

const SEED_A = 20260810 as WorldSeed;
const SEED_B = 999 as WorldSeed;

const worldA = generateMockWorld(SEED_A);
const worldB = generateMockWorld(SEED_B);

describe('generateMockProgress', () => {
  it('동일 입력으로 두 번 호출하면 전 스냅샷이 100% 동일하다', () => {
    const first = generateMockProgress(SEED_A, worldA);
    const second = generateMockProgress(SEED_A, worldA);
    expect(second).toEqual(first);
  });

  it('다른 worldSeed(다른 world)는 다른 결과를 낸다', () => {
    const first = generateMockProgress(SEED_A, worldA);
    const second = generateMockProgress(SEED_B, worldB);
    expect(second.season.id).not.toBe(first.season.id);
    expect(second.newsFeed.map((n) => n.headline)).not.toEqual(first.newsFeed.map((n) => n.headline));
  });

  it('다른 seasonNumber는 다른 시즌 시드를 낸다', () => {
    const s1 = generateMockProgress(SEED_A, worldA, 1);
    const s2 = generateMockProgress(SEED_A, worldA, 2);
    expect(s2.season.seasonSeed).not.toBe(s1.season.seasonSeed);
  });

  it('리그마다 순위표를 생성하고, 각 행은 played=won+drawn+lost·points=won*3+drawn·gd=gf-ga를 만족한다', () => {
    const progress = generateMockProgress(SEED_A, worldA);

    for (const league of worldA.leagues) {
      const rows = progress.standings.filter((s) => s.leagueId === league.id);
      expect(rows).toHaveLength(league.teamCount);

      const ranks = rows.map((r) => r.rank).sort((a, b) => a - b);
      expect(ranks).toEqual(Array.from({ length: league.teamCount }, (_, i) => i + 1));

      for (const row of rows) {
        expect(row.played).toBe(row.won + row.drawn + row.lost);
        expect(row.points).toBe(row.won * 3 + row.drawn);
        expect(row.gd).toBe(row.gf - row.ga);
        expect(row.form).toHaveLength(5);
      }

      for (let i = 1; i < rows.length; i += 1) {
        const prev = rows[i - 1];
        const cur = rows[i];
        expect(prev.rank).toBeLessThan(cur.rank);
        expect(prev.points).toBeGreaterThanOrEqual(cur.points);
      }
    }
  });

  it('리그당 라이브 경기 1건을 생성하고, 홈/원정 팀이 다르며 상태는 LIVE다', () => {
    const progress = generateMockProgress(SEED_A, worldA);
    expect(progress.liveFixtures).toHaveLength(worldA.leagues.length);

    for (const fixture of progress.liveFixtures) {
      expect(fixture.status).toBe('LIVE');
      expect(fixture.homeTeamId).not.toBe(fixture.awayTeamId);
      expect(fixture.simulatedAt).toBeNull();
    }
  });

  it('라이브 경기 이벤트 타임라인의 득점 이벤트 수는 fixture.homeScore/awayScore와 정확히 일치한다', () => {
    const progress = generateMockProgress(SEED_A, worldA);
    const goalTypes = new Set(['GOAL', 'PENALTY_SCORED', 'OWN_GOAL']);

    for (const fixture of progress.liveFixtures) {
      const events = progress.matchEvents.filter((e) => e.matchId === fixture.id);
      expect(events.length).toBeGreaterThan(0);

      const homeGoals = events.filter((e) => goalTypes.has(e.type) && e.teamId === fixture.homeTeamId).length;
      const awayGoals = events.filter((e) => goalTypes.has(e.type) && e.teamId === fixture.awayTeamId).length;
      expect(homeGoals).toBe(fixture.homeScore);
      expect(awayGoals).toBe(fixture.awayScore);

      const sequences = events.map((e) => e.sequence).sort((a, b) => a - b);
      expect(sequences).toEqual(Array.from({ length: events.length }, (_, i) => i));

      for (const event of events) {
        if (event.relatedEventSequence !== null) {
          expect(event.relatedEventSequence).toBeGreaterThanOrEqual(0);
          expect(event.relatedEventSequence).toBeLessThan(events.length);
        }
      }
    }
  });

  it('스탯 리더보드는 실제 world.players에 존재하는 선수만 참조한다', () => {
    const progress = generateMockProgress(SEED_A, worldA);
    const playerIds = new Set(worldA.players.map((p) => p.id));

    expect(progress.statLeaders.length).toBeGreaterThan(0);
    for (const stat of progress.statLeaders) {
      expect(playerIds.has(stat.playerId)).toBe(true);
      expect(stat.starts + stat.subAppearances).toBe(stat.appearances);
    }
  });

  it('뉴스 피드는 발생 시각 역순이며 MOCK_NOW를 넘지 않는다', () => {
    const progress = generateMockProgress(SEED_A, worldA);
    expect(progress.newsFeed.length).toBeGreaterThan(0);

    for (let i = 1; i < progress.newsFeed.length; i += 1) {
      expect(progress.newsFeed[i - 1].occurredAt >= progress.newsFeed[i].occurredAt).toBe(true);
    }
    for (const item of progress.newsFeed) {
      expect(item.occurredAt <= MOCK_NOW).toBe(true);
    }
  });

  it('플레이오프 브래킷은 리그별로 생성되며 경기 수는 (2의 거듭제곱으로 내림한 시드 팀 수 - 1)이다', () => {
    const progress = generateMockProgress(SEED_A, worldA);

    for (const league of worldA.leagues) {
      const fixtures = progress.playoffBracket.filter((f) => f.leagueId === league.id);
      let seedCount = 1;
      while (seedCount * 2 <= league.playoffTeamCount) {
        seedCount *= 2;
      }
      if (seedCount < 2) {
        expect(fixtures).toHaveLength(0);
        continue;
      }
      expect(fixtures).toHaveLength(seedCount - 1);

      const finals = fixtures.filter((f) => f.roundLabel === '결승');
      expect(finals).toHaveLength(1);
      expect(finals[0].status).toBe('SCHEDULED');

      const nonFinal = fixtures.filter((f) => f.roundLabel !== '결승');
      for (const f of nonFinal) {
        expect(f.status).toBe('FINISHED');
        expect(f.homeScore).not.toBeNull();
        expect(f.awayScore).not.toBeNull();
      }
    }
  });

  it('컵 브래킷은 리그 구분이 없고(leagueId=null) 경기 수는 (내림한 팀 수 - 1)이다', () => {
    const progress = generateMockProgress(SEED_A, worldA);
    let seedCount = 1;
    while (seedCount * 2 <= worldA.teams.length) {
      seedCount *= 2;
    }
    expect(progress.cupBracket).toHaveLength(seedCount - 1);
    expect(progress.cupBracket.every((f) => f.leagueId === null)).toBe(true);
    expect(progress.cupBracket.every((f) => f.competitionType === 'CUP')).toBe(true);
  });

  it('전 경기의 matchSeed는 서로 중복되지 않는다(라이브+플레이오프+컵)', () => {
    const progress = generateMockProgress(SEED_A, worldA);
    const seeds = [
      ...progress.liveFixtures.map((f) => f.matchSeed),
      ...progress.playoffBracket.map((f) => f.matchSeed),
      ...progress.cupBracket.map((f) => f.matchSeed),
    ];
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});
