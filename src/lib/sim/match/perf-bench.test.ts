/**
 * 16일차 성능 벤치 — Task 023 수락 기준 (`docs/team-schedule/02-시뮬레이션엔진팀.md` 16일차 행).
 *
 * "경기 1건"을 틱 순회(`tick.ts`) → 이벤트 생성(`events.ts`) → PK 연결(`linkPenaltyOutcomes`)
 * → 스탯 폴드(`stats.ts`)까지 실제 파이프라인 그대로 실행해 p95/p99를 측정하고, 스코어(골
 * 이벤트 합)와 자책골 귀속이 100% 정합하는지 검증한다. 15일차 `snapshot-pipeline.ts`는
 * "다른 팀이 import할 계약이 아닌 테스트 전용 고정 픽스처"(해당 파일 헤더 주석)이므로
 * 재사용하지 않고, 이 벤치 전용 참가자 배정기를 별도로 둔다 — OWN_GOAL의 `teamId`(수혜팀)
 * 귀속 규약(stats.ts I-53 주석)을 명시적으로 재현해야 스코어 정합 검증이 의미가 있기 때문이다.
 *
 * `performance.now()`는 벤치 측정 목적의 시간 측정이며 시뮬레이션 로직(난수·확률 판정)에는
 * 쓰이지 않으므로 NFR-DT-001과 무관하다(6일차 `rng/bench.test.ts`와 동일 근거).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건 — 아래
 * "import 제약" describe가 `src/lib/sim/**` 전 파일을 스캔해 이를 직접 검증한다.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { MatchEventType, MatchSeed, PlayerId, TeamId } from '../../../types';
import { deriveMatchSeed, deriveSeasonSeed } from '../rng/derive';
import { buildTickSequence } from './tick';
import {
  generateMatchEvents,
  linkPenaltyOutcomes,
  type GenerateMatchEventsOptions,
  type MatchEventDraft,
  type MatchEventGenerationContext,
  type MatchEventParticipants,
} from './events';
import { accumulatePlayerMatchStats } from './stats';

const MATCH_COUNT = 200;
const P95_LIMIT_MS = 50;
const P99_LIMIT_MS = 120;

/** 16일차 날짜 리터럴(스냅샷 시드 관례와 동일) — 밸런싱 값이 아니다. */
const BENCH_WORLD_SEED = 20_260_811;
const BENCH_SEASON_NUMBER = 16;

const TEAM_HOME = 'bench-team-home' as TeamId;
const TEAM_AWAY = 'bench-team-away' as TeamId;
const HOME_PLAYERS: readonly PlayerId[] = Array.from(
  { length: 11 },
  (_, i) => `bench-home-p${i + 1}` as PlayerId,
);
const AWAY_PLAYERS: readonly PlayerId[] = Array.from(
  { length: 11 },
  (_, i) => `bench-away-p${i + 1}` as PlayerId,
);

/** 선수 → 실제 소속팀. 스코어 정합 검증에서 "로스터 기준 진실"로 쓰인다. */
const ROSTER: ReadonlyMap<PlayerId, TeamId> = new Map([
  ...HOME_PLAYERS.map((p) => [p, TEAM_HOME] as const),
  ...AWAY_PLAYERS.map((p) => [p, TEAM_AWAY] as const),
]);

function opponentOf(team: TeamId): TeamId {
  return team === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
}

/** 23종 전부에 0이 아닌 가중치를 둔다(15일차 스냅샷 픽스처와 동일 설계 의도). */
const BENCH_WEIGHTS: Readonly<Record<MatchEventType, number>> = {
  KICKOFF: 1,
  SHOT_ON: 10,
  SHOT_OFF: 10,
  SHOT_BLOCKED: 6,
  GOAL: 4,
  ASSIST: 3,
  OWN_GOAL: 1,
  PENALTY_AWARDED: 2,
  PENALTY_SCORED: 1,
  PENALTY_MISSED: 1,
  YELLOW_CARD: 5,
  SECOND_YELLOW: 1,
  RED_CARD: 1,
  FOUL: 8,
  OFFSIDE: 4,
  CORNER: 6,
  SAVE: 6,
  INJURY: 1,
  SUBSTITUTION: 3,
  HALF_TIME: 1,
  FULL_TIME: 1,
  EXTRA_TIME_START: 1,
  PENALTY_SHOOTOUT: 1,
};

/**
 * 벤치 전용 결정론적 참가자 배정기(RNG 미사용). `OWN_GOAL`만 특별 취급한다 —
 * `primaryPlayerId`는 실제 자책골을 넣은 선수(자기 팀 net에 넣은 쪽)이고
 * `teamId`는 득점 혜택팀(상대팀)이다(stats.ts의 "OWN_GOAL: teamId는 수혜팀" 규약,
 * I-53). 나머지 타입은 행위팀 = 귀속팀으로 단순화한다(이 벤치의 관심사가 아니다).
 */
function resolveParticipants(ctx: MatchEventGenerationContext): MatchEventParticipants {
  const { tick, type } = ctx;
  const actingTeam = tick.tick % 2 === 0 ? TEAM_HOME : TEAM_AWAY;
  const actingRoster = actingTeam === TEAM_HOME ? HOME_PLAYERS : AWAY_PLAYERS;
  const primaryPlayerId = actingRoster[tick.tick % actingRoster.length];

  if (type === 'OWN_GOAL') {
    return { teamId: opponentOf(actingTeam), primaryPlayerId, secondaryPlayerId: null };
  }
  return { teamId: actingTeam, primaryPlayerId, secondaryPlayerId: null };
}

/** 슛류 이벤트 전용 결정론적 xG(현실성 아님, [0,1] 범위 고정 공식 — 15일차 픽스처와 동일 패턴). */
function estimateXg(ctx: MatchEventGenerationContext): number {
  return ((ctx.tick.minute % 20) + 1) / 40;
}

function buildBenchOptions(): GenerateMatchEventsOptions {
  return {
    occursProbability: 0.35,
    weights: BENCH_WEIGHTS,
    resolveParticipants,
    estimateXg,
  };
}

function buildMatchSeedForIndex(index: number): MatchSeed {
  const seasonSeed = deriveSeasonSeed(BENCH_WORLD_SEED, BENCH_SEASON_NUMBER);
  return deriveMatchSeed(seasonSeed, index) as MatchSeed;
}

interface MatchRunResult {
  readonly elapsedMs: number;
  readonly events: readonly MatchEventDraft[];
}

/** 경기 1건 전 파이프라인(틱→이벤트→PK연결→스탯)을 실행하고 소요 시간과 이벤트를 반환한다. */
function runOneMatch(index: number): MatchRunResult {
  const matchSeed = buildMatchSeedForIndex(index);

  const t0 = performance.now();
  const { ticks } = buildTickSequence({ matchSeed, includeExtraTime: index % 5 === 0 });
  const events = generateMatchEvents(ticks, matchSeed, buildBenchOptions());
  const linked = linkPenaltyOutcomes(events);
  accumulatePlayerMatchStats(linked);
  const elapsedMs = performance.now() - t0;

  return { elapsedMs, events: linked };
}

/** p50/p95/p99 등 표준 순위 방식(ceil(p/100 * n) - 1, 0-index)으로 백분위수를 구한다. */
function percentile(sortedAsc: readonly number[], p: number): number {
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1));
  return sortedAsc[idx];
}

describe('perf bench — 경기 1건 p95/p99 (Task 023, 16일차)', () => {
  it(
    `경기 ${MATCH_COUNT}건 표본에서 p95 < ${P95_LIMIT_MS}ms, p99 < ${P99_LIMIT_MS}ms`,
    () => {
      const timings: number[] = [];
      for (let i = 0; i < MATCH_COUNT; i += 1) {
        timings.push(runOneMatch(i).elapsedMs);
      }

      const sorted = [...timings].sort((a, b) => a - b);
      const p50 = percentile(sorted, 50);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);
      const max = sorted[sorted.length - 1];

      console.log(
        `[16일차 벤치] 경기 ${MATCH_COUNT}건: p50=${p50.toFixed(3)}ms p95=${p95.toFixed(3)}ms ` +
          `p99=${p99.toFixed(3)}ms max=${max.toFixed(3)}ms`,
      );

      expect(p95).toBeLessThan(P95_LIMIT_MS);
      expect(p99).toBeLessThan(P99_LIMIT_MS);
    },
    10_000,
  );
});

describe('score consistency — 골 이벤트 합 + 자책골 귀속 정합 100% (Task 023, 16일차)', () => {
  it(`경기 ${MATCH_COUNT}건 전량에서 이벤트 기반 스코어 == 로스터 기반 스코어`, () => {
    let totalGoals = 0;
    let mismatchedMatches = 0;

    for (let i = 0; i < MATCH_COUNT; i += 1) {
      const { events } = runOneMatch(i);

      // 방법 1 — 이벤트의 teamId를 그대로 신뢰(OWN_GOAL도 관례상 이미 수혜팀).
      const scoreByEvent = new Map<TeamId, number>([[TEAM_HOME, 0], [TEAM_AWAY, 0]]);
      // 방법 2 — 득점자의 실제 로스터 소속팀에서 독립적으로 재도출(OWN_GOAL은 상대팀으로 반전).
      const scoreByRoster = new Map<TeamId, number>([[TEAM_HOME, 0], [TEAM_AWAY, 0]]);

      for (const event of events) {
        if (event.type !== 'GOAL' && event.type !== 'PENALTY_SCORED' && event.type !== 'OWN_GOAL') {
          continue;
        }

        if (event.teamId) {
          scoreByEvent.set(event.teamId, (scoreByEvent.get(event.teamId) ?? 0) + 1);
        }

        const scorerTeam = event.primaryPlayerId ? ROSTER.get(event.primaryPlayerId) : undefined;
        if (!scorerTeam) {
          continue;
        }
        const creditedTeam = event.type === 'OWN_GOAL' ? opponentOf(scorerTeam) : scorerTeam;
        scoreByRoster.set(creditedTeam, (scoreByRoster.get(creditedTeam) ?? 0) + 1);
      }

      const homeMatches = scoreByEvent.get(TEAM_HOME) === scoreByRoster.get(TEAM_HOME);
      const awayMatches = scoreByEvent.get(TEAM_AWAY) === scoreByRoster.get(TEAM_AWAY);
      if (!homeMatches || !awayMatches) {
        mismatchedMatches += 1;
      }
      totalGoals += (scoreByEvent.get(TEAM_HOME) ?? 0) + (scoreByEvent.get(TEAM_AWAY) ?? 0);
    }

    console.log(
      `[16일차 벤치] 경기 ${MATCH_COUNT}건 골 이벤트 합계=${totalGoals}건, 스코어 불일치=${mismatchedMatches}건`,
    );

    expect(mismatchedMatches).toBe(0);
    expect(totalGoals).toBeGreaterThan(0);
  });
});

describe('import 제약 — react/@supabase 0건 (NFR-DT-001, Task 023 16일차)', () => {
  it('src/lib/sim/** 전 파일에서 react/@supabase import가 0건이다', () => {
    const simRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
    const forbiddenImport = /(?:from\s+|require\()\s*['"](react(?:-dom)?|@supabase\/[^'"]*)['"]/;

    const collectSourceFiles = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          return collectSourceFiles(fullPath);
        }
        return /\.tsx?$/.test(entry) ? [fullPath] : [];
      });

    const offenders = collectSourceFiles(simRoot).filter((file) =>
      forbiddenImport.test(readFileSync(file, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });
});
