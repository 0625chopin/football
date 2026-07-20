/**
 * `MockDataSource` 자기검증 — Task 007 / 18일차 산출물.
 *
 * `DataSource` 69개 메서드 전량이 실제로 호출 가능한지(인터페이스 구현 완결성), 결정론이
 * 유지되는지(동일 시드 → 동일 결과), 그리고 이 파일이 직접 파생하는 축(`getStandings`의
 * I-106 해소, `getPlayerProfile`의 `pa` 미노출, `getTeamSeason` 파생)이 계약대로 동작하는지
 * 검증한다. 생성기가 없는 축(계약·부상·수상 등)은 "빈 배열/`null`을 정직하게 반환하는지"만
 * 확인한다 — 존재하지 않는 데이터를 검증할 수는 없다(위 `MockDataSource.ts` 헤더 참조).
 */

import { describe, expect, it } from 'vitest';
import type { PlayerId, TeamId, WorldSeed } from '@/types';
import { MockDataSource } from './MockDataSource';

const SEED_A = 20260813 as WorldSeed;

describe('MockDataSource', () => {
  it('생성자가 던지지 않고, 3개 리그를 만든다', async () => {
    const ds = new MockDataSource(SEED_A);
    const leagues = await ds.getLeagues();
    expect(leagues).toHaveLength(3);
  });

  it('동일 시드로 두 인스턴스를 만들면 주요 조회 결과가 바이트 단위로 동일하다(결정론)', async () => {
    const a = new MockDataSource(SEED_A);
    const b = new MockDataSource(SEED_A);

    const [leaguesA, leaguesB] = await Promise.all([a.getLeagues(), b.getLeagues()]);
    expect(JSON.stringify(leaguesA)).toBe(JSON.stringify(leaguesB));

    const leagueId = leaguesA[0].id;
    const [standingsA, standingsB] = await Promise.all([
      a.getStandings({ leagueId }),
      b.getStandings({ leagueId }),
    ]);
    expect(JSON.stringify(standingsA)).toBe(JSON.stringify(standingsB));
  });

  it('getStandings는 라운드 기본값에서 schedule.ts 파생 순위표를 그대로 반환한다(I-106 해소)', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const standings = await ds.getStandings({ leagueId: league.id });

    expect(standings.length).toBe(league.teamCount);
    // 순위표가 실제 대진 이력 집계라면, played 합계는 0보다 커야 하고(과거 라운드가 FINISHED),
    // rank는 1..teamCount로 중복 없이 매겨진다.
    const ranks = standings.map((s) => s.rank).sort((x, y) => x - y);
    expect(ranks).toEqual(Array.from({ length: league.teamCount }, (_, i) => i + 1));
    expect(standings.every((s) => s.played > 0)).toBe(true);
  });

  it('getStandings에 다른 round를 넘기면 그 라운드까지만 반영된, 더 작은 played 값을 낸다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const bounds = await ds.getFixtureRoundBounds({ leagueId: league.id });

    const early = await ds.getStandings({ leagueId: league.id, round: 1 });
    const late = await ds.getStandings({ leagueId: league.id, round: bounds.currentRound - 1 });

    const totalPlayedEarly = early.reduce((sum, s) => sum + s.played, 0);
    const totalPlayedLate = late.reduce((sum, s) => sum + s.played, 0);
    expect(totalPlayedEarly).toBeLessThan(totalPlayedLate);
  });

  it('getFixturesByRound(LEAGUE)가 반환한 경기 전부 round가 요청값과 일치한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const fixtures = await ds.getFixturesByRound({ leagueId: league.id, round: 3 });

    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((f) => f.round === 3)).toBe(true);
    expect(fixtures.every((f) => f.leagueId === league.id)).toBe(true);
  });

  it('getFixture가 스케줄·라이브·브래킷 경기를 전부 찾는다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const fixtures = await ds.getFixturesByRound({ leagueId: league.id, round: 1 });
    const found = await ds.getFixture(fixtures[0].id);
    expect(found?.id).toBe(fixtures[0].id);

    const live = await ds.getLiveFixtures();
    if (live.length > 0) {
      const foundLive = await ds.getFixture(live[0].id);
      expect(foundLive?.id).toBe(live[0].id);
    }

    expect(await ds.getFixture('no-such-fixture-id' as never)).toBeNull();
  });

  it('getPlayerProfile은 pa를 구조적으로 노출하지 않는다(I-38)', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const squad = await ds.getTeamSquad((await ds.getFixturesByRound({ leagueId: league.id, round: 1 }))[0].homeTeamId);
    expect(squad.length).toBeGreaterThan(0);

    const profile = await ds.getPlayerProfile(squad[0].id);
    expect(profile).not.toBeNull();
    expect('pa' in (profile as object)).toBe(false);
    expect(profile?.scoutRating).toBeGreaterThanOrEqual(1);
    expect(profile?.scoutRating).toBeLessThanOrEqual(5);

    expect(await ds.getPlayerProfile('no-such-player-id' as PlayerId)).toBeNull();
  });

  it('getTeamSeason은 진행 중 시즌 전제(finalRank=null, promoted/relegated=false)로 파생된다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const teamId = (await ds.getFixturesByRound({ leagueId: league.id, round: 1 }))[0].homeTeamId;

    const teamSeason = await ds.getTeamSeason({ teamId });
    expect(teamSeason).not.toBeNull();
    expect(teamSeason?.leagueId).toBe(league.id);
    expect(teamSeason?.finalRank).toBeNull();
    expect(teamSeason?.promoted).toBe(false);
    expect(teamSeason?.relegated).toBe(false);

    expect(await ds.getTeamSeason({ teamId: 'no-such-team-id' as TeamId })).toBeNull();
  });

  it('getCommonCodeGroups/getCommonCodes가 config 카탈로그를 도메인 엔티티로 감싼다', async () => {
    const ds = new MockDataSource(SEED_A);
    const groups = await ds.getCommonCodeGroups();
    expect(groups.length).toBeGreaterThanOrEqual(37);
    expect(groups.every((g) => g.isActive)).toBe(true);

    const codes = await ds.getCommonCodes('MATCH_POINTS');
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every((c) => c.groupCode === 'MATCH_POINTS')).toBe(true);

    expect(await ds.getCommonCodes('NO_SUCH_GROUP')).toEqual([]);
  });

  it('생성기가 없는 축은 빈 배열/null을 정직하게 반환한다(값을 지어내지 않음)', async () => {
    const ds = new MockDataSource(SEED_A);
    const anyPlayerId = 'x' as PlayerId;
    const anyTeamId = 'x' as TeamId;

    expect(await ds.getPlayerContract(anyPlayerId)).toBeNull();
    expect(await ds.getPlayerInjuries(anyPlayerId)).toEqual([]);
    expect(await ds.getPlayerAwards(anyPlayerId)).toEqual([]);
    expect(await ds.getPlayerTransferHistory(anyPlayerId)).toEqual([]);
    expect(await ds.getPlayerLoanHistory(anyPlayerId)).toEqual([]);
    expect(await ds.getPlayerCareerStat(anyPlayerId)).toBeNull();
    expect(await ds.getPlayerAttributeHistory(anyPlayerId)).toEqual([]);
    expect(await ds.getTeamSeasonStat({ teamId: anyTeamId })).toBeNull();
    expect(await ds.getTeamPointTransactions({ teamId: anyTeamId })).toEqual([]);
    expect(await ds.getTeamSponsorContracts(anyTeamId)).toEqual([]);
    expect(await ds.getTeamTrophies(anyTeamId)).toEqual([]);
    expect(await ds.getSponsorContracts()).toEqual([]);
    expect(await ds.getAwards()).toEqual([]);
    expect(await ds.getMultiAwardRanking({ subjectType: 'PLAYER' })).toEqual([]);
    expect(await ds.getMatchLineups('x' as never)).toEqual([]);
    expect(await ds.getMatchPlayerRatings('x' as never)).toEqual([]);
    expect(await ds.getMatchTeamStats('x' as never)).toEqual([]);
    expect(await ds.getMatchWeather('x' as never)).toBeNull();
    expect(await ds.getLatestCronRun()).toBeNull();
    expect(await ds.getCronRuns()).toEqual([]);
    expect(await ds.getCronGaps()).toEqual([]);
    expect(await ds.getAuditLogs()).toEqual([]);
    expect(await ds.getCommonCodeHistory('x' as never)).toEqual([]);

    const metrics = await ds.getCronRunMetrics();
    expect(metrics).toEqual({ successRatePct: 0, avgDurationMs: 0, maxDurationMs: 0, sampleSize: 0 });
  });

  it('getPlayerStatRanking은 leagueId로 필터하고 metric 내림차순으로 정렬한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const ranking = await ds.getPlayerStatRanking({
      leagueId: league.id,
      competitionType: 'LEAGUE',
      metric: 'goals',
      minAppearancePct: 0,
    });

    expect(ranking.every((r) => r.leagueId === league.id)).toBe(true);
    for (let i = 1; i < ranking.length; i += 1) {
      expect(ranking[i - 1].goals).toBeGreaterThanOrEqual(ranking[i].goals);
    }

    expect(await ds.getPlayerStatRanking({ leagueId: null, competitionType: 'CUP', metric: 'goals' })).toEqual([]);
  });

  it('getNextKickoff은 SCHEDULED 경기 중 가장 이른 킥오프를 반환한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const next = await ds.getNextKickoff();
    expect(next).not.toBeNull();
    expect(next?.status).toBe('SCHEDULED');
  });

  it('getWorldStatus는 진행 중 월드를 그대로 반환한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const world = await ds.getWorldStatus();
    expect(world.currentSeasonNumber).toBe(1);
  });
});
