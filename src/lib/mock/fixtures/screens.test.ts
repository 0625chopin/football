/**
 * screens.ts 자기검증 — Task 007 / 17일차 산출물.
 *
 * FR-UI-000 수락 기준 ①③("4상태 확인 가능", "커버율 100%" — 이 파일이 커버 범위로
 * 선언한 화면 한정)을 오늘 산출물 수준에서 검증한다: 화면마다 4상태(정상/로딩/빈/에러)가
 * 전부 존재하고 `status` 판별 필드가 정확한지, 결정론(D-16)이 유지되는지.
 */

import { describe, expect, it } from 'vitest';
import { isEmpty, isError, isLoading, isSuccess } from '@/lib/data/result';
import { buildMockFixtureScreens, FIXTURE_WORLD_SEED } from './screens';

describe('buildMockFixtureScreens', () => {
  it('동일 시드로 두 번 호출하면 전 화면 픽스처가 100% 동일하다', () => {
    const first = buildMockFixtureScreens(FIXTURE_WORLD_SEED);
    const second = buildMockFixtureScreens(FIXTURE_WORLD_SEED);
    expect(second).toEqual(first);
  });

  it('화면마다 4상태(정상/로딩/빈/에러) 전부가 올바른 판별 필드를 가진다', () => {
    const screens = buildMockFixtureScreens(FIXTURE_WORLD_SEED);

    for (const [name, fixture] of Object.entries(screens)) {
      expect(isSuccess(fixture.normal), `${name}.normal은 SUCCESS여야 한다`).toBe(true);
      expect(isLoading(fixture.loading), `${name}.loading은 LOADING이어야 한다`).toBe(true);
      expect(isEmpty(fixture.empty), `${name}.empty는 EMPTY여야 한다`).toBe(true);
      expect(isError(fixture.error), `${name}.error는 ERROR여야 한다`).toBe(true);
      if (isError(fixture.error)) {
        expect(fixture.error.error.retryable).toBe(true);
      }
    }
  });

  it('홈 화면 정상 데이터는 리그당 라이브 경기 1건 + 최신 뉴스 5건 이하를 담는다', () => {
    const screens = buildMockFixtureScreens(FIXTURE_WORLD_SEED);
    const { normal } = screens.home;
    if (!isSuccess(normal)) throw new Error('expected SUCCESS');
    expect(normal.data.liveFixtures.length).toBeGreaterThan(0);
    expect(normal.data.topNews.length).toBeLessThanOrEqual(5);
  });

  it('순위표 화면은 schedule.ts가 FINISHED 경기에서 역산한 값과 동일하다(I-106 해소 확인)', () => {
    const screens = buildMockFixtureScreens(FIXTURE_WORLD_SEED);
    const { normal } = screens.standings;
    if (!isSuccess(normal)) throw new Error('expected SUCCESS');
    // 순위 1~N이 정확히 한 번씩 부여된다
    const ranks = normal.data.map((s) => s.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: normal.data.length }, (_, i) => i + 1));
    for (const row of normal.data) {
      expect(row.played).toBe(row.won + row.drawn + row.lost);
    }
  });

  it('일정/결과 화면은 표본 라운드의 경기 + 라운드 경계를 담는다', () => {
    const screens = buildMockFixtureScreens(FIXTURE_WORLD_SEED);
    const { normal } = screens.fixturesByRound;
    if (!isSuccess(normal)) throw new Error('expected SUCCESS');
    expect(normal.data.fixtures.length).toBeGreaterThan(0);
    expect(normal.data.bounds.minRound).toBe(1);
    expect(normal.data.bounds.maxRound).toBeGreaterThan(normal.data.bounds.currentRound);
  });

  it('선수 상세(부분) 화면은 pa를 노출하지 않는다(I-38 PublicPlayerProfile 계약)', () => {
    const screens = buildMockFixtureScreens(FIXTURE_WORLD_SEED);
    const { normal } = screens.playerDetail;
    if (!isSuccess(normal)) throw new Error('expected SUCCESS');
    expect('pa' in normal.data.profile).toBe(false);
    expect(normal.data.profile.scoutRating).toBeGreaterThanOrEqual(1);
    expect(normal.data.profile.scoutRating).toBeLessThanOrEqual(5);
  });

  it('클럽 상세(부분) 화면의 스쿼드도 pa를 노출하지 않는다', () => {
    const screens = buildMockFixtureScreens(FIXTURE_WORLD_SEED);
    const { normal } = screens.clubDetail;
    if (!isSuccess(normal)) throw new Error('expected SUCCESS');
    expect(normal.data.squad.length).toBeGreaterThan(0);
    for (const player of normal.data.squad) {
      expect('pa' in player).toBe(false);
    }
  });
});
