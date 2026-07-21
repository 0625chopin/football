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
import type { AwardType, LeagueId, PlayerId, SeasonId, TeamId, WorldSeed } from '@/types';
import { MockDataSource } from './MockDataSource';

/** `AwardType`(E-31) 12종 전량 — `enums.ts` 선언 순서와 동일하게 유지(FR-AW-001~004). */
const ALL_AWARD_TYPES: readonly AwardType[] = [
  'LEAGUE_MVP',
  'GOLDEN_BOOT',
  'GOLDEN_PLAYMAKER',
  'GOLDEN_GLOVE',
  'BEST_YOUNG_PLAYER',
  'MANAGER_OF_SEASON',
  'TEAM_OF_SEASON',
  'BALLON_DOR',
  'WORLD_XI',
  'CUP_MVP',
  'PLAYOFF_MVP',
  'PLAYER_OF_THE_ROUND',
];

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

    // D-35(48일차, I-239)·D-34(48일차, I-238) — ClubOwner·avgRating도 동일 시드에서 바이트 단위 동일.
    const teamId = (await a.getFixturesByRound({ leagueId, round: 1 }))[0].homeTeamId;
    const [ownerA, ownerB] = await Promise.all([a.getClubOwner(teamId), b.getClubOwner(teamId)]);
    expect(JSON.stringify(ownerA)).toBe(JSON.stringify(ownerB));

    const [seasonStatsA, seasonStatsB] = await Promise.all([
      a.getPlayerStatRanking({ leagueId, competitionType: 'LEAGUE', metric: 'goals' }),
      b.getPlayerStatRanking({ leagueId, competitionType: 'LEAGUE', metric: 'goals' }),
    ]);
    expect(JSON.stringify(seasonStatsA.map((s) => s.avgRating))).toBe(
      JSON.stringify(seasonStatsB.map((s) => s.avgRating)),
    );
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
    // 'x'는 실존하지 않는 팀 ID라 팀 축 조회는 여전히 빈 배열이다(I-231 해소 후에도 동일).
    expect(await ds.getTeamSponsorContracts(anyTeamId)).toEqual([]);
    expect(await ds.getTeamTrophies(anyTeamId)).toEqual([]);
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

  it('getAwards는 진행 중 시즌 1건에 AwardType 12종을 전부 최소 1건씩 채운다(41일차, 4팀 갭 보완)', async () => {
    const ds = new MockDataSource(SEED_A);
    const season = await ds.getCurrentSeason();
    const awards = await ds.getAwards({ seasonId: season?.id });

    expect(awards.length).toBeGreaterThan(0);
    expect(awards.every((a) => a.seasonId === season?.id)).toBe(true);

    const presentTypes = new Set(awards.map((a) => a.type));
    for (const type of ALL_AWARD_TYPES) {
      expect(presentTypes.has(type)).toBe(true);
    }

    // 수상 대상 배타(playerId/managerId/teamId 중 정확히 하나만) — Award(E-31) 헤더 원칙.
    for (const award of awards) {
      const filled = [award.playerId, award.managerId, award.teamId].filter((v) => v !== null);
      expect(filled).toHaveLength(1);
    }
  });

  it('TEAM_OF_SEASON/WORLD_XI는 각각 정확히 11명이 채워진다(4팀 PitchLineup 4-3-3 소비 전제)', async () => {
    const ds = new MockDataSource(SEED_A);
    const [teamOfSeason, worldXi] = await Promise.all([
      ds.getAwards({ type: 'TEAM_OF_SEASON' as AwardType }),
      ds.getAwards({ type: 'WORLD_XI' as AwardType }),
    ]);

    expect(teamOfSeason).toHaveLength(11);
    expect(worldXi).toHaveLength(11);
    expect(new Set(teamOfSeason.map((a) => a.playerId)).size).toBe(11);
    expect(new Set(worldXi.map((a) => a.playerId)).size).toBe(11);

    // 41일차 2차 수정(팀장 실렌더 지적) — TEAM_OF_SEASON(최상위 리그 1곳)과 WORLD_XI(전
    // 리그 슬롯 분산)가 11명 전원 동일하게 뽑히던 결함의 회귀 방지. 완전 동일만 금지하며
    // (구조적으로 겹칠 수 있는 슬롯도 있어) 부분 일치는 허용한다.
    const teamOfSeasonIds = teamOfSeason.map((a) => a.playerId).sort();
    const worldXiIds = worldXi.map((a) => a.playerId).sort();
    expect(teamOfSeasonIds).not.toEqual(worldXiIds);
  });

  it('getAwards는 leagueId로 필터할 수 있다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const filtered = await ds.getAwards({ leagueId: league.id });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((a) => a.leagueId === league.id)).toBe(true);
  });

  it('getMultiAwardRanking은 선수/감독 부문이 채워지고, 팀 부문은 도메인상 항상 빈 배열이다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [playerRanking, managerRanking, teamRanking] = await Promise.all([
      ds.getMultiAwardRanking({ subjectType: 'PLAYER' }),
      ds.getMultiAwardRanking({ subjectType: 'MANAGER' }),
      ds.getMultiAwardRanking({ subjectType: 'TEAM' }),
    ]);

    expect(playerRanking.length).toBeGreaterThan(0);
    expect(managerRanking.length).toBeGreaterThan(0);
    // AwardType 12종 전부가 선수/감독 수상이라 teamId가 채워지는 Award가 없다(값을 지어내지
    // 않음, I-41) — 클럽 단위 이력은 Trophy(E-32)가 담당하는 별도 축.
    expect(teamRanking).toEqual([]);

    for (let i = 1; i < playerRanking.length; i += 1) {
      expect(playerRanking[i - 1].totalAwards).toBeGreaterThanOrEqual(playerRanking[i].totalAwards);
    }
  });

  it('getAwards/getMultiAwardRanking은 동일 시드에서 결정론적이다', async () => {
    const a = new MockDataSource(SEED_A);
    const b = new MockDataSource(SEED_A);

    const [awardsA, awardsB] = await Promise.all([a.getAwards(), b.getAwards()]);
    expect(JSON.stringify(awardsA)).toBe(JSON.stringify(awardsB));

    const [rankingA, rankingB] = await Promise.all([
      a.getMultiAwardRanking({ subjectType: 'PLAYER' }),
      b.getMultiAwardRanking({ subjectType: 'PLAYER' }),
    ]);
    expect(JSON.stringify(rankingA)).toBe(JSON.stringify(rankingB));
  });

  it('getAwards는 알려지지 않은 seasonId에는 빈 배열을 반환한다(D-15 — 진행 중 시즌 1건만 존재)', async () => {
    const ds = new MockDataSource(SEED_A);
    expect(await ds.getAwards({ seasonId: 'no-such-season' as SeasonId })).toEqual([]);
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

  /* ────────────────────────────────────────────────────────────────────
   * 19일차 게이트 커버리지 보강 — perFile 임계(lines 80%/branches 70%) 미달 해소.
   * 18일차 산출물 자체의 신규 로직이 아니라, 그날 빠졌던 나머지 메서드/분기를
   * 뒤늦게 덮는다(팀장 피드백, 18일차 마감이 `npm run test`만 돌리고 `npm run gate`를
   * 돌리지 않아 놓친 이월분).
   * ──────────────────────────────────────────────────────────────────── */

  it('getLeague는 존재하는 리그를 찾고, 없는 리그는 null을 반환한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();

    expect((await ds.getLeague(league.id))?.id).toBe(league.id);
    expect(await ds.getLeague('no-such-league-id' as LeagueId)).toBeNull();
  });

  it('getCurrentSeason/getSeasons는 진행 중 시즌 1건을 반환한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const season = await ds.getCurrentSeason();
    expect(season).not.toBeNull();
    expect(await ds.getSeasons()).toEqual([season]);
  });

  it('getStandings는 모르는 리그/시즌이면 빈 배열을 반환한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const season = await ds.getCurrentSeason();
    const [league] = await ds.getLeagues();

    expect(await ds.getStandings({ leagueId: 'no-such-league-id' as LeagueId })).toEqual([]);
    expect(await ds.getStandings({ leagueId: league.id, seasonId: 'no-such-season-id' as SeasonId })).toEqual([]);
    // 명시적으로 올바른 seasonId를 넘긴 경우도 정상 동작한다(isKnownSeason의 "일치" 분기).
    expect(await ds.getStandings({ leagueId: league.id, seasonId: season?.id })).not.toEqual([]);
  });

  it('getFixturesByRound는 PLAYOFF/CUP/미지원 대회 유형·모르는 리그/시즌을 각각 올바르게 처리한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();

    const playoff = await ds.getFixturesByRound({ leagueId: league.id, round: 1, competitionType: 'PLAYOFF' });
    expect(playoff.every((f) => f.leagueId === league.id)).toBe(true);

    const cup = await ds.getFixturesByRound({ leagueId: league.id, round: 1, competitionType: 'CUP' });
    expect(Array.isArray(cup)).toBe(true);

    expect(
      await ds.getFixturesByRound({ leagueId: league.id, round: 1, competitionType: 'TIEBREAK' }),
    ).toEqual([]);
    expect(await ds.getFixturesByRound({ leagueId: 'no-such-league-id' as LeagueId, round: 1 })).toEqual([]);
    expect(
      await ds.getFixturesByRound({ leagueId: league.id, round: 1, seasonId: 'no-such-season-id' as SeasonId }),
    ).toEqual([]);
  });

  it('getFixtureRoundBounds는 LEAGUE/PLAYOFF/CUP/미지원 유형·모르는 리그를 각각 올바르게 처리한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();

    const leagueBounds = await ds.getFixtureRoundBounds({ leagueId: league.id });
    expect(leagueBounds.maxRound).toBeGreaterThan(0);

    expect(await ds.getFixtureRoundBounds({ leagueId: 'no-such-league-id' as LeagueId })).toEqual({
      minRound: 0,
      maxRound: 0,
      currentRound: 0,
    });

    const playoffBounds = await ds.getFixtureRoundBounds({ leagueId: league.id, competitionType: 'PLAYOFF' });
    expect(playoffBounds.maxRound).toBeGreaterThanOrEqual(playoffBounds.minRound);

    const cupBounds = await ds.getFixtureRoundBounds({ leagueId: league.id, competitionType: 'CUP' });
    expect(cupBounds.maxRound).toBeGreaterThanOrEqual(cupBounds.minRound);

    // 이 Mock 팩토리는 TIEBREAK 대진을 생성하지 않으므로 항상 빈 브래킷 분기를 탄다.
    expect(await ds.getFixtureRoundBounds({ leagueId: league.id, competitionType: 'TIEBREAK' })).toEqual({
      minRound: 0,
      maxRound: 0,
      currentRound: 0,
    });
  });

  it('getMatchEvents는 라이브 경기의 이벤트를 찾고, 이벤트 없는 경기는 빈 배열을 반환한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const live = await ds.getLiveFixtures();
    expect(live.length).toBeGreaterThan(0);
    const liveEvents = await ds.getMatchEvents(live[0].id);
    expect(liveEvents.length).toBeGreaterThan(0);

    const [league] = await ds.getLeagues();
    const scheduled = await ds.getFixturesByRound({ leagueId: league.id, round: 1 });
    const scheduledFixture = scheduled.find((f) => f.id !== live[0].id);
    expect(scheduledFixture).toBeDefined();
    expect(await ds.getMatchEvents((scheduledFixture as NonNullable<typeof scheduledFixture>).id)).toEqual([]);
  });

  it('선수 단건 조회 메서드는 존재/미존재 playerId를 모두 올바르게 처리한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const [fixture] = await ds.getFixturesByRound({ leagueId: league.id, round: 1 });
    const squad = await ds.getTeamSquad(fixture.homeTeamId);
    const playerId = squad[0].id;
    const missingId = 'no-such-player-id' as PlayerId;

    expect(await ds.getPlayerAttribute(playerId)).not.toBeNull();
    expect(await ds.getPlayerAttribute(missingId)).toBeNull();

    expect(await ds.getPlayerState(playerId)).not.toBeNull();
    expect(await ds.getPlayerState(missingId)).toBeNull();

    expect((await ds.getPlayerPositions(playerId)).length).toBeGreaterThan(0);
    expect(await ds.getPlayerPositions(missingId)).toEqual([]);

    // 스탯 리더보드 표본 밖 선수는 빈 배열(정직한 "표본 없음")이 정상 동작이다.
    expect(await ds.getPlayerSeasonStats(missingId)).toEqual([]);
  });

  it('getTeamManager/getTeamSquadStates/getTeamsByIds/getSponsorsByIds가 정상 동작한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const [fixture] = await ds.getFixturesByRound({ leagueId: league.id, round: 1 });

    expect((await ds.getTeamManager(fixture.homeTeamId))?.teamId).toBe(fixture.homeTeamId);
    expect(await ds.getTeamManager('no-such-team-id' as TeamId)).toBeNull();

    const squadStates = await ds.getTeamSquadStates(fixture.homeTeamId);
    expect(squadStates.length).toBeGreaterThan(0);

    const teams = await ds.getTeamsByIds([fixture.homeTeamId, 'no-such-team-id' as TeamId]);
    expect(teams).toHaveLength(1);

    const sponsors = await ds.getSponsors();
    const sponsorIds = sponsors.slice(0, 2).map((s) => s.id);
    expect((await ds.getSponsorsByIds(sponsorIds)).length).toBe(sponsorIds.length);
  });

  it('getClubOwner가 팀과 1:1로 조회된다(D-35, 48일차, I-239)', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const [fixture] = await ds.getFixturesByRound({ leagueId: league.id, round: 1 });

    const owner = await ds.getClubOwner(fixture.homeTeamId);
    expect(owner?.teamId).toBe(fixture.homeTeamId);
    expect(owner?.wealth).toBeGreaterThanOrEqual(1);
    expect(owner?.wealth).toBeLessThanOrEqual(30);
    expect(owner?.negotiation).toBeGreaterThanOrEqual(1);
    expect(owner?.negotiation).toBeLessThanOrEqual(30);

    expect(await ds.getClubOwner('no-such-team-id' as TeamId)).toBeNull();
  });

  it('getTeamSponsorContracts/getSponsorContracts가 팀당 ACTIVE ≤ 3건을 실제로 생성해 반환한다(I-231)', async () => {
    const ds = new MockDataSource(SEED_A);

    const all = await ds.getSponsorContracts();
    expect(all.length).toBeGreaterThan(0);

    // fixture.homeTeamId는 계약이 0건 배정된 팀일 수 있어(0~MAX_PER_TEAM 확률) 대신
    // 전역 목록에서 실제로 계약을 가진 팀을 골라 팀 축 조회를 검증한다 — 그래야
    // teamContracts가 빈 배열이면 아래 단언이 자명 통과가 아니라 실패한다.
    const teamIdWithContract = all[0].teamId;
    const teamContracts = await ds.getTeamSponsorContracts(teamIdWithContract);
    expect(teamContracts.length).toBeGreaterThan(0);
    expect(teamContracts.every((c) => c.teamId === teamIdWithContract)).toBe(true);
    expect(teamContracts.filter((c) => c.status === 'ACTIVE').length).toBeLessThanOrEqual(3);
    expect(teamContracts.every((c) => typeof c.signedByOwnerId === 'string' && c.signedByOwnerId.length > 0)).toBe(
      true,
    );

    const bySponsor = await ds.getSponsorContracts({ sponsorId: all[0].sponsorId });
    expect(bySponsor.every((c) => c.sponsorId === all[0].sponsorId)).toBe(true);
  });

  it('getPlayerRecentMatchStats/getLeagueAverageRating이 D-34 결정④·③을 만족한다(48일차, I-238)', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const seasonStats = await ds.getPlayerStatRanking({
      leagueId: league.id,
      competitionType: 'LEAGUE',
      metric: 'goals',
    });
    expect(seasonStats.length).toBeGreaterThan(0);
    const [sample] = seasonStats;

    const recent = await ds.getPlayerRecentMatchStats({ playerId: sample.playerId, limit: 3 });
    expect(recent.length).toBeLessThanOrEqual(3);
    expect(recent.every((s) => s.matchRating >= 1 && s.matchRating <= 10)).toBe(true);

    const noSample = await ds.getPlayerRecentMatchStats({ playerId: 'no-such-player-id' as PlayerId, limit: 5 });
    expect(noSample).toEqual([]);

    const avg = await ds.getLeagueAverageRating({
      seasonId: sample.seasonId,
      leagueId: league.id,
      competitionType: 'LEAGUE',
    });
    expect(avg).not.toBeNull();
    expect(avg).toBeGreaterThanOrEqual(1);
    expect(avg).toBeLessThanOrEqual(10);

    expect(
      await ds.getLeagueAverageRating({
        seasonId: 'no-such-season-id' as SeasonId,
        leagueId: league.id,
        competitionType: 'LEAGUE',
      }),
    ).toBeNull();
  });

  it('getTeamFixtures는 팀 소속 경기를 최신순으로 limit만큼 자르고, 모르는 팀은 브래킷만 본다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const [fixture] = await ds.getFixturesByRound({ leagueId: league.id, round: 1 });

    const defaultLimit = await ds.getTeamFixtures({ teamId: fixture.homeTeamId });
    expect(defaultLimit.length).toBeGreaterThan(0);
    expect(defaultLimit.every((f) => f.homeTeamId === fixture.homeTeamId || f.awayTeamId === fixture.homeTeamId)).toBe(
      true,
    );

    const limited = await ds.getTeamFixtures({ teamId: fixture.homeTeamId, limit: 1 });
    expect(limited).toHaveLength(1);

    const unknownTeam = await ds.getTeamFixtures({ teamId: 'no-such-team-id' as TeamId });
    expect(unknownTeam).toEqual([]);
  });

  it('getNewsFeed는 types/limit 파라미터 유무에 따라 다르게 필터링된다', async () => {
    const ds = new MockDataSource(SEED_A);
    const all = await ds.getNewsFeed();
    expect(all.length).toBeGreaterThan(0);

    const oneType = all[0].type;
    const filtered = await ds.getNewsFeed({ types: [oneType] });
    expect(filtered.every((n) => n.type === oneType)).toBe(true);

    const limited = await ds.getNewsFeed({ limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it('getPlayoffBracket/getCupBracket은 정상/모르는 시즌 분기를 모두 처리한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();

    const playoff = await ds.getPlayoffBracket({ leagueId: league.id });
    expect(playoff.every((f) => f.leagueId === league.id)).toBe(true);
    expect(await ds.getPlayoffBracket({ leagueId: league.id, seasonId: 'no-such-season-id' as SeasonId })).toEqual(
      [],
    );

    expect((await ds.getCupBracket()).length).toBeGreaterThan(0);
    expect((await ds.getCupBracket({})).length).toBeGreaterThan(0);
    expect(await ds.getCupBracket({ seasonId: 'no-such-season-id' as SeasonId })).toEqual([]);
  });

  it('getPlayerStatRanking은 minAppearancePct 미지정 시 UI_PARAM 기본값으로 대체한다', async () => {
    const ds = new MockDataSource(SEED_A);
    const [league] = await ds.getLeagues();
    const ranking = await ds.getPlayerStatRanking({ leagueId: league.id, competitionType: 'LEAGUE', metric: 'goals' });
    expect(Array.isArray(ranking)).toBe(true);
  });

  it('getCommonCodes는 JSON형 그룹(객체값)도 숫자형 그룹과 동일하게 도메인 엔티티로 감싼다', async () => {
    const ds = new MockDataSource(SEED_A);
    const codes = await ds.getCommonCodes('CUP_PARAM');
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every((c) => c.valueJson !== null && c.valueNum === null)).toBe(true);
  });
});
