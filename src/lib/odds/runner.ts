/**
 * 배당 프리시뮬레이션 러너 — 몬테카를로 반복으로 풀 시뮬레이션 엔진을 호출한다
 *
 * Task 035 / 27일차(2026-08-26) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 27일차 행: "`src/lib/odds/` 프리시뮬 러너 — 엔진 호출, 본경기와 독립된 시드 네임스페이스
 * (NFR-DT-006). V-02 결과 반영한 모델 확정". 수락 기준: "프리시뮬 시드 ≠ 본경기 시드".
 *
 * ## 26일차 인계 — 왜 경량 배당 모델이 아니라 엔진을 그대로 재사용하는가
 * Task 029(경량 배당 모델 검토)가 26일차 종료됐고, V-02(배당 모델 차단성 검증)가 통과했다.
 * 그 결과 이 파일은 별도의 근사 모델을 만들지 않고 2팀의 풀 시뮬레이션 엔진
 * (`sim/match/tick.ts` → `events.ts` → `stats.ts`)을 몬테카를로 반복으로 그대로 호출한다.
 *
 * ## 이 파일의 책임 범위 — "엔진 호출만"
 * 소유 경로 문서(`03-데이터밸런싱배당팀.md` §1)가 `src/lib/odds/**`를 "몬테카를로 배당 산출
 * (엔진 호출만)"로 못박는다. 오늘 산출물은 **엔진을 반복 호출해 원시 결과(이벤트·스코어)를
 * 모으는 러너**까지다 — 실제 배당(승/무/패 확률 → `ODDS_PARAM.OVERROUND`/`MIN_ODDS`/
 * `MAX_ODDS`를 적용한 배당률 변환)은 이 파일 범위 밖이다(후속 일차, 같은 디렉터리 소관).
 *
 * 이벤트 발생확률·타입별 가중치(`GenerateMatchEventsOptions`)는 `events.ts` 10일차 문서가
 * 명시한 대로 이 파일이 값을 만들지 않는다 — 호출자(024 계수 체인 연결부)가 주입한다.
 * 여기서 리터럴 확률·가중치를 지어내면 밸런싱 성격 숫자가 이 파일에 생겨 NFR-CFG-001과
 * 충돌한다.
 *
 * ## 시드 네임스페이스 독립성 (NFR-DT-006)
 * `deriveSeasonSeed`를 `SEED_NAMESPACE.ODDS_PRESIM`으로 호출해 이 러너가 파생하는 시드
 * 전량이 본경기(`SEED_NAMESPACE.MAIN`) 시드 값 집합과 서로소가 되도록 한다(`rng/derive.ts`
 * "배당 프리시뮬 독립성" 절 — 구조적 보장, 확률적 우연이 아니다). 몬테카를로 반복 인덱스
 * (`runIndex`)는 `deriveMatchSeed`의 `extraIndices`(문서상 "재경기 회차" 용도)에 그대로
 * 대응한다 — 같은 대진(`matchKey`)을 여러 번 재추첨하는 것이 정확히 이 러너가 하는 일이다.
 * `assertNamespace`로 파생된 시드가 실제로 `ODDS_PRESIM`인지 방어적으로 검증한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴(`@/types`)로만 참조한다(서브경로 금지, 재선언 금지).
 */

import type { MatchEventType, MatchSeed, PlayerId, TeamId } from '@/types';
import {
  SEED_NAMESPACE,
  assertNamespace,
  deriveMatchSeed,
  deriveSeasonSeed,
} from '@/lib/sim/rng/derive';
import { buildTickSequence } from '@/lib/sim/match/tick';
import {
  generateMatchEvents,
  linkPenaltyOutcomes,
  type GenerateMatchEventsOptions,
  type MatchEventDraft,
} from '@/lib/sim/match/events';
import { accumulatePlayerMatchStats, type PlayerMatchStatTierAFold } from '@/lib/sim/match/stats';
import { loadConstants } from '@/lib/config/loader';

/** 득점으로 집계하는 이벤트 타입. `OWN_GOAL.teamId`는 득점 귀속팀(I-53) — 세 타입 모두 `teamId` 그대로 합산한다. */
const SCORING_EVENT_TYPES: ReadonlySet<MatchEventType> = new Set<MatchEventType>([
  'GOAL',
  'OWN_GOAL',
  'PENALTY_SCORED',
]);

export interface MatchScoreTally {
  readonly homeGoals: number;
  readonly awayGoals: number;
}

/** 이벤트 배열에서 팀별 득점을 집계한다(순수 함수, RNG 미사용). */
export function tallyMatchScore(
  events: readonly MatchEventDraft[],
  homeTeamId: TeamId,
  awayTeamId: TeamId,
): MatchScoreTally {
  let homeGoals = 0;
  let awayGoals = 0;

  for (const event of events) {
    if (!SCORING_EVENT_TYPES.has(event.type)) {
      continue;
    }
    if (event.teamId === homeTeamId) {
      homeGoals += 1;
    } else if (event.teamId === awayTeamId) {
      awayGoals += 1;
    }
  }

  return { homeGoals, awayGoals };
}

export interface RunOddsPresimOptions {
  /** `World.worldSeed` — 본경기와 동일한 월드 시드를 그대로 쓴다. 네임스페이스만 갈라진다. */
  readonly worldSeed: number;
  readonly seasonNumber: number;
  /** 대진 식별 정수. 문자열 ID는 `deriveMatchSeed`와 동일하게 `hashKey()`로 접어서 넘긴다. */
  readonly matchKey: number;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  /**
   * 틱별 이벤트 발생확률·타입 가중치·참가자/xG 콜백. 이 러너는 값을 만들지 않고
   * 그대로 `generateMatchEvents`에 전달한다(024 계수 체인 또는 테스트 픽스처가 주입).
   */
  readonly eventOptions: GenerateMatchEventsOptions;
  /** 연장전 포함 여부. 기본 `false`(리그 경기 — 무승부 허용). */
  readonly includeExtraTime?: boolean;
  /** 몬테카를로 반복 횟수. 기본값은 `ODDS_PARAM.MC_N_MATCH`(공통코드, 27일차 I-08 반영). */
  readonly runCount?: number;
}

export interface OddsPresimRunResult {
  readonly runIndex: number;
  readonly matchSeed: MatchSeed;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly events: readonly MatchEventDraft[];
  readonly playerStats: ReadonlyMap<PlayerId, PlayerMatchStatTierAFold>;
}

export interface OddsPresimMatchResult {
  /** `SEED_NAMESPACE.ODDS_PRESIM`에 속한 시즌 시드 — 모든 `runs[].matchSeed`의 부모. */
  readonly seasonSeed: number;
  readonly runs: readonly OddsPresimRunResult[];
}

/**
 * 대진 하나를 `runCount`회(기본 `MC_N_MATCH`) 반복 시뮬레이션한다.
 *
 * 각 반복은 `deriveMatchSeed(seasonSeed, matchKey, runIndex)`로 서로 다른 독립 시드를 받고
 * (`runIndex`가 곧 반복 회차 구분자), 틱 순회(`buildTickSequence`) → 이벤트 생성
 * (`generateMatchEvents`) → PK 인과 연결(`linkPenaltyOutcomes`) → 스탯 집계
 * (`accumulatePlayerMatchStats`) 순서로 2팀 엔진을 그대로 통과시킨다 — 별도 근사 모델을
 * 두지 않는다(26일차 인계 — Task 029 종료·V-02 통과).
 */
export function runOddsPresimMatch(options: RunOddsPresimOptions): OddsPresimMatchResult {
  const {
    worldSeed,
    seasonNumber,
    matchKey,
    homeTeamId,
    awayTeamId,
    eventOptions,
    includeExtraTime = false,
  } = options;

  const seasonSeed = deriveSeasonSeed(worldSeed, seasonNumber, SEED_NAMESPACE.ODDS_PRESIM);
  assertNamespace(seasonSeed, SEED_NAMESPACE.ODDS_PRESIM);

  const runCount = options.runCount ?? loadConstants('ODDS_PARAM').MC_N_MATCH;

  const runs: OddsPresimRunResult[] = [];
  for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
    const matchSeed = deriveMatchSeed(seasonSeed, matchKey, runIndex) as MatchSeed;
    assertNamespace(matchSeed, SEED_NAMESPACE.ODDS_PRESIM);

    const { ticks } = buildTickSequence({ matchSeed, includeExtraTime });
    const events = linkPenaltyOutcomes(generateMatchEvents(ticks, matchSeed, eventOptions));
    const { homeGoals, awayGoals } = tallyMatchScore(events, homeTeamId, awayTeamId);
    const playerStats = accumulatePlayerMatchStats(events);

    runs.push({ runIndex, matchSeed, homeGoals, awayGoals, events, playerStats });
  }

  return { seasonSeed, runs };
}
