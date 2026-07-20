/**
 * 100경기 시드 스냅샷 파이프라인 — NFR-QA-003 테스트 전용 지원 모듈
 *
 * Task 023 / 15일차(2026-08-10) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 15일차 행:
 * "Vitest — 시드 스냅샷 100경기 전건 일치(NFR-QA-003), 이벤트↔스탯 재계산 일치".
 *
 * ## 이 파일이 존재하는 이유
 * `match-snapshot.test.ts`가 다이제스트 스냅샷(`toMatchSnapshot()`)과 "동일 시드 재실행 시
 * 재현" 두 테스트에서 **정확히 같은 100경기 생성 절차**를 반복 호출해야 한다. 절차를 각
 * 테스트에 따로 베끼면 두 사본이 슬쩍 달라졌을 때(옵션 값 하나만 달라도) 스냅샷 불일치의
 * 원인이 "엔진 버그"인지 "테스트 코드 드리프트"인지 구분할 수 없다 — 그래서 절차 자체를
 * 이 파일에 단일 소스로 둔다. 프로덕션 오케스트레이션 계층(엔진 밖)이 쓰는 API가 아니라
 * **테스트 전용 고정 픽스처**이므로 `docs/team-schedule` 소유 경로(`src/lib/sim/**`) 안에
 * 있지만 다른 팀이 import할 계약은 아니다.
 *
 * ## 다이제스트 기반 스냅샷을 택한 이유 (팀장 15일차 지시 — "판단 근거를 보고에 남기세요")
 * 100경기 전체 이벤트 로그를 그대로 스냅샷 파일에 저장하면(경기당 최대 120틱 ×
 * occursProbability만큼의 이벤트, 필드 9개) 스냅샷 파일이 수만 줄 규모로 부풀고 리뷰가
 * 사실상 불가능해진다. `rng/hash.ts`의 `hashState()`(SHA-256 + 정렬 직렬화, NFR-DT-003
 * 검증 도구로 이미 6일차에 만들어짐)를 그대로 재사용하면 "같은 입력 → 같은 다이제스트"가
 * 구조적으로 보장되므로, 스냅샷에는 경기당 64자리 hex 문자열 2개(이벤트·스탯)만 남기고도
 * "diff 0" 판정이 원본 배열을 직접 비교하는 것과 동치다(SHA-256 충돌 확률은 무시 가능).
 *
 * ## 옵션 고정 근거
 * `occursProbability`/`weights`/참가자·xG 콜백은 `events.ts`가 요구하는 대로 이 파일이
 * 호출부로서 주입한다(밸런싱 성격의 숫자를 `events.ts`에 두지 않는다는 10일차 원칙과
 * 동일). 실제 계수 체인(024)이 아니라 **테스트 결정론 검증용 고정값**이므로 3팀 H-05
 * 공통코드와 무관하다 — 값 자체의 사실성(현실적인 파울 확률 등)은 이 테스트의 관심사가
 * 아니다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴(`@/types`)로만 참조한다.
 */

import type { MatchEventType, MatchSeed, PlayerId, TeamId } from '@/types';
import { deriveMatchSeed, deriveSeasonSeed } from '../rng/derive';
import { hashState, type Canonicalizable } from '../rng/hash';
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

/** 수락 기준(15일차 행) "100경기 전건 일치"의 100. */
export const SNAPSHOT_MATCH_COUNT = 100;

/** 시즌 시드 파생용 고정 world seed. 15일차 날짜(2026-08-10)를 그대로 리터럴화 — 밸런싱 값 아님. */
const SNAPSHOT_WORLD_SEED = 20_260_810;
/** 이 스냅샷 전용 시즌 번호(임의 상수, 실제 시즌 번호 체계와 무관). */
const SNAPSHOT_SEASON_NUMBER = 15;

const TEAM_HOME = 'snapshot-team-home' as TeamId;
const TEAM_AWAY = 'snapshot-team-away' as TeamId;
const HOME_PLAYERS: readonly PlayerId[] = Array.from(
  { length: 11 },
  (_, i) => `snapshot-home-p${i + 1}` as PlayerId,
);
const AWAY_PLAYERS: readonly PlayerId[] = Array.from(
  { length: 11 },
  (_, i) => `snapshot-away-p${i + 1}` as PlayerId,
);

/**
 * 23종 전량에 0이 아닌 가중치를 부여한다(현실적인 축구 확률 재현이 목적이 아니라, 100경기
 * 규모에서 되도록 많은 이벤트 타입·`stats.ts` 폴드 분기를 실제로 밟게 하려는 테스트 설계).
 */
const SNAPSHOT_WEIGHTS = {
  KICKOFF: 2,
  SHOT_ON: 12,
  SHOT_OFF: 12,
  SHOT_BLOCKED: 8,
  GOAL: 3,
  ASSIST: 3,
  OWN_GOAL: 1,
  PENALTY_AWARDED: 2,
  PENALTY_SCORED: 1,
  PENALTY_MISSED: 1,
  YELLOW_CARD: 6,
  SECOND_YELLOW: 1,
  RED_CARD: 1,
  FOUL: 10,
  OFFSIDE: 5,
  CORNER: 8,
  SAVE: 8,
  INJURY: 2,
  SUBSTITUTION: 4,
  HALF_TIME: 2,
  FULL_TIME: 2,
  EXTRA_TIME_START: 1,
  PENALTY_SHOOTOUT: 1,
} satisfies Readonly<Record<MatchEventType, number>>;

/** 틱 인덱스만으로 팀·선수를 배정하는 결정론적 참가자 배정기(RNG 미사용, 순수 함수). */
function resolveParticipants(ctx: MatchEventGenerationContext): MatchEventParticipants {
  const { tick, type } = ctx;
  const isHome = tick.tick % 2 === 0;
  const teamId = isHome ? TEAM_HOME : TEAM_AWAY;
  const teamPlayers = isHome ? HOME_PLAYERS : AWAY_PLAYERS;
  const opponentPlayers = isHome ? AWAY_PLAYERS : HOME_PLAYERS;
  const primaryPlayerId = teamPlayers[tick.tick % teamPlayers.length];

  switch (type) {
    case 'FOUL':
    case 'PENALTY_AWARDED':
      // 파울 피해자는 상대팀 선수(가정 1과 동일한 방향, foulsDrawn 폴드 검증용).
      return {
        teamId,
        primaryPlayerId,
        secondaryPlayerId: opponentPlayers[(tick.tick + 1) % opponentPlayers.length],
      };
    case 'SUBSTITUTION':
      return {
        teamId,
        primaryPlayerId,
        secondaryPlayerId: teamPlayers[(tick.tick + 5) % teamPlayers.length],
      };
    case 'PENALTY_MISSED':
      // 3틱 중 1번만 GK 선방(secondaryPlayerId non-null)으로 걸리게 해 I-55 두 분기를 모두 밟는다.
      return {
        teamId,
        primaryPlayerId,
        secondaryPlayerId:
          tick.tick % 3 === 0 ? opponentPlayers[(tick.tick + 2) % opponentPlayers.length] : null,
      };
    default:
      return { teamId, primaryPlayerId, secondaryPlayerId: null };
  }
}

/** 슛류 이벤트 전용 결정론적 xG(현실성 아님, [0,1] 범위 고정 공식). */
function estimateXg(ctx: MatchEventGenerationContext): number {
  return ((ctx.tick.minute % 20) + 1) / 40;
}

function buildSnapshotOptions(): GenerateMatchEventsOptions {
  return {
    occursProbability: 0.4,
    weights: SNAPSHOT_WEIGHTS,
    resolveParticipants,
    estimateXg,
  };
}

function buildMatchSeedForIndex(index: number): MatchSeed {
  const seasonSeed = deriveSeasonSeed(SNAPSHOT_WORLD_SEED, SNAPSHOT_SEASON_NUMBER);
  return deriveMatchSeed(seasonSeed, index) as MatchSeed;
}

/** `hashState()` 입력용 이벤트 투영 — `detail`은 이 스냅샷에서 항상 `{}`이라 생략한다(10일차 EMPTY_DETAIL 전제). */
function toDigestEvent(event: MatchEventDraft): Canonicalizable {
  return {
    sequence: event.sequence,
    minute: event.minute,
    addedTime: event.addedTime,
    type: event.type,
    teamId: event.teamId as string | null,
    primaryPlayerId: event.primaryPlayerId as string | null,
    secondaryPlayerId: event.secondaryPlayerId as string | null,
    xg: event.xg,
    relatedEventSequence: event.relatedEventSequence,
  };
}

export interface MatchSnapshotEntry {
  readonly seedIndex: number;
  readonly matchSeed: number;
  readonly tickCount: number;
  readonly eventCount: number;
  readonly eventsDigest: string;
  readonly statsDigest: string;
}

/**
 * 인덱스(0~99) 하나에 대해 틱→이벤트→PK연결→스탯 전 과정을 실행하고 다이제스트를 낸다.
 * 순수 함수 — 같은 `index`를 몇 번 호출해도 완전히 같은 결과를 낸다(재현성 자체가 테스트 대상).
 */
export function computeMatchSnapshotEntry(index: number): MatchSnapshotEntry {
  const matchSeed = buildMatchSeedForIndex(index);
  // 4경기 중 1경기는 연장까지 포함시켜 tick.ts의 EXTRA_* 분기도 스냅샷에 실린다.
  const { ticks } = buildTickSequence({ matchSeed, includeExtraTime: index % 4 === 0 });

  const events = generateMatchEvents(ticks, matchSeed, buildSnapshotOptions());
  const linked = linkPenaltyOutcomes(events);
  const statsMap = accumulatePlayerMatchStats(linked);

  const statsEntries: Canonicalizable = Array.from(statsMap.entries())
    .map(([playerId, row]) => ({ playerId: playerId as string, ...row }))
    .sort((a, b) => (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));

  return {
    seedIndex: index,
    matchSeed,
    tickCount: ticks.length,
    eventCount: linked.length,
    eventsDigest: hashState(linked.map(toDigestEvent)),
    statsDigest: hashState(statsEntries),
  };
}

/** 0~`SNAPSHOT_MATCH_COUNT - 1`번 인덱스 전량을 계산한다(NFR-QA-003 "100경기 전건"). */
export function computeAllMatchSnapshotEntries(): readonly MatchSnapshotEntry[] {
  return Array.from({ length: SNAPSHOT_MATCH_COUNT }, (_, index) => computeMatchSnapshotEntry(index));
}
