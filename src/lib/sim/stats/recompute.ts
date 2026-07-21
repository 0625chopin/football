/**
 * `src/lib/sim/stats/recompute.ts`
 *
 * Task 026(38일차) — "선수·팀 지표 풀세트 집계 + 이벤트 로그 기반 재계산 함수(FR-ST-005)".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 38일차 행. 완료 판정 "재계산 결과 = 누적 결과"는
 * 아래 `recomputePlayerSeasonStatsFromEventLogs()`(시즌 전체 이벤트 로그를 한 번에 다시 접어
 * 계산)와 `accumulateMatchStatsIntoSeason()`을 경기 종료마다 한 번씩 반복 호출한 결과가 항상
 * 같은 값이라는 사실로 성립한다(`recompute.test.ts`가 두 경로를 같은 입력으로 실행해 값
 * 동등성으로 검증한다).
 *
 * ## 이 파일의 책임 — "누적"과 "재계산"의 분리 (`standing/aggregate.ts` 37일차 선례 계승)
 * `standing/aggregate.ts`가 `advanceStandingRound()`(라운드 1개씩 누적)와
 * `buildStandingHistory()`(시즌 전체를 처음부터 재생)를 분리한 것과 동일한 구조를 스탯에도
 * 적용한다:
 * - **누적** — `accumulateMatchStatsIntoSeason()`. 이미 쌓인 시즌 누계에 방금 끝난 경기 1건의
 *   Tier A 폴드를 더한다. 경기가 끝날 때마다(6팀 크론 등 오케스트레이션 계층이) 한 번씩
 *   호출하는 것을 전제한다.
 * - **재계산** — `recomputePlayerSeasonStatsFromEventLogs()` / `recomputeTeamSeasonStatsFromEventLogs()`.
 *   시즌에 속한 경기 전부의 `MatchEventDraft[]`를 한꺼번에 받아 처음부터 다시 접는다(백필·
 *   재시뮬레이션 후 이력 재구축용 — `buildStandingHistory()`의 "평상시엔 안 쓰고 캐치업/
 *   재시뮬레이션 때만 쓴다"는 헤더 원칙을 그대로 물려받는다).
 *
 * 이 파일은 **이벤트를 순회하며 세는 로직을 재구현하지 않는다** — 11일차 `match/stats.ts`의
 * `accumulatePlayerMatchStats()`(경기 1건 단위 Tier A 폴드)를 그대로 재사용하고, 여기서는
 * "경기 단위 폴드를 시즌 단위로 접는 것"과 "선수 단위 폴드를 로스터로 팀 단위로 접는 것"만
 * 새로 담당한다(21일차 인계 "입력을 재구현하지 않는다" 원칙, `postmatch/pipeline.ts`가
 * `accumulatePlayerMatchStats()`를 재사용한 것과 동일한 경계).
 *
 * ## Tier A 스코프 — 이 파일이 다루는 필드는 `match/stats.ts`가 이미 확정한 16필드뿐이다
 * `PLAYER_STAT_FIELD_CLASSIFICATION`(11일차)에서 `tier: 'A'`인 필드만 이벤트 로그에서
 * 재계산 가능하다(Tier B 40필드는 라인업·detail 스키마 등 이벤트 로그 밖의 컨텍스트가
 * 필요해 이 파일 범위 밖 — `match/stats.ts` 헤더 "AS-10 부분 무효화와 Tier 분류" 참조).
 * 이 파일의 "풀세트 집계"는 **Tier A 필드 풀세트**를 의미하며, `PlayerSeasonStat`/
 * `TeamSeasonStat`(`@/types`)의 전체 필드를 채우는 것이 아니다 — Tier B 필드(출전 시간,
 * 패스·드리블·수비 세부, GK 세부 등)는 여전히 라인업·detail 스키마 인계 후 별도 경로가
 * 필요하다. `TIER_A_FIELD_NAMES`를 이 파일이 다시 나열하지 않고
 * `PLAYER_STAT_FIELD_CLASSIFICATION`에서 매 호출 시 `tier === 'A'`인 키만 걸러 파생시킨다 —
 * `match/stats.ts`의 `TierAStatField` 파생 관용구와 동일한 이유(매핑표와 필드 목록이 항상
 * 같은 소스에서 나오게 해 두 목록이 어긋나는 것을 방지)이며, 그 파일의 `TIER_A_FIELD_NAMES`
 * 상수는 export되지 않으므로 여기서 독립적으로 다시 파생시킨다(사본을 만들지 않는다).
 *
 * ## 팀 지표는 "선수 Tier A 폴드를 로스터로 묶은 합"이지 `TeamSeasonStat` 전체가 아니다
 * `TeamSeasonStat`(E-22, `@/types/stat.ts`)은 재정·위상·스쿼드 평균 등 이벤트 로그로도 로스터로도
 * 복원할 수 없는 필드가 대부분이라(그 파일 헤더가 이미 "합산형만 저장" 원칙과 파생 규칙을
 * 명시) 이 파일이 `TeamSeasonStat`을 직접 만들지 않는다. 대신 `foldPlayerStatsIntoTeams()`가
 * "이 팀 소속 선수들의 Tier A 폴드 합"을 만든다 — 예를 들어 팀의 `goals` 합은 그 팀 선수
 * 전원의 득점 합이다. **주의**: `OWN_GOAL`은 Tier A 정의상 득점자(`primaryPlayerId`) 본인의
 * `ownGoals`로만 집계되고(`match/stats.ts` 주석 "teamId는 수혜팀이라 팀 귀속은 스코프 밖"),
 * 이 파일도 그 값을 그대로 득점자 소속 팀에 합산한다 — 즉 이 팀 폴드의 `ownGoals`는
 * "그 팀 선수가 자책골을 넣은 횟수"이지 `TeamSeasonStat.goalsAgainst`(상대 관점 실점)가
 * 아니다. 로스터에 없는 선수의 폴드는 건너뛴다(오늘 경기에 관여하지 않은 것으로 간주 —
 * `postmatch/pipeline.ts`의 `runCardSuspensionStage()` roster 처리와 동일 관례).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건(순수 폴드·합산뿐, 무작위성
 * 없음 — `match/stats.ts` 헤더와 동일 근거). 타입은 `@/types` 배럴로만 import.
 */

import type { PlayerId, TeamId } from '@/types';
import type { MatchEventDraft } from '../match/events';
import {
  PLAYER_STAT_FIELD_CLASSIFICATION,
  accumulatePlayerMatchStats,
  type PlayerMatchStatTierAFold,
  type TierAStatField,
} from '../match/stats';

/**
 * `PLAYER_STAT_FIELD_CLASSIFICATION`(단일 소스)에서 `tier === 'A'`인 키만 매 모듈 로드 시
 * 1회 파생시킨다 — `match/stats.ts`의 `TIER_A_FIELD_NAMES`(비공개 상수)를 이 파일이 다시
 * 베끼지 않기 위함(파일 헤더 참조).
 */
const TIER_A_FIELD_NAMES: readonly TierAStatField[] = (
  Object.keys(PLAYER_STAT_FIELD_CLASSIFICATION) as (keyof typeof PLAYER_STAT_FIELD_CLASSIFICATION)[]
).filter(
  (field): field is TierAStatField => PLAYER_STAT_FIELD_CLASSIFICATION[field].tier === 'A',
);

/** Tier A 필드 전부가 0인 빈 폴드. */
function zeroTierAFold(): { -readonly [K in TierAStatField]: number } {
  const row = {} as { -readonly [K in TierAStatField]: number };
  for (const field of TIER_A_FIELD_NAMES) {
    row[field] = 0;
  }
  return row;
}

/** 두 Tier A 폴드를 필드별로 더한 새 폴드를 반환한다(둘 다 불변 — 인자를 변형하지 않는다). */
function addTierAFold(
  a: PlayerMatchStatTierAFold,
  b: PlayerMatchStatTierAFold,
): PlayerMatchStatTierAFold {
  const sum = zeroTierAFold();
  for (const field of TIER_A_FIELD_NAMES) {
    sum[field] = a[field] + b[field];
  }
  return sum;
}

/**
 * 시즌 누계(`season`)에 경기 1건의 Tier A 폴드(`matchFold`)를 더한 새 맵을 반환한다.
 * 키 타입(`K`)을 제네릭으로 둬 선수 단위(`PlayerId`)·팀 단위(`TeamId`) 양쪽에 동일 로직을
 * 재사용한다(팀 단위는 `foldPlayerStatsIntoTeams()`가 만든 팀별 폴드를 그대로 넣으면 된다).
 * `season`에 없던 키는 0에서 시작한 것으로 취급한다. 두 인자 모두 변형하지 않는다(새 `Map`
 * 반환 — `standing/aggregate.ts`의 `advanceStandingRound()`가 매 호출 새 스냅샷을 반환하는
 * 것과 동일한 순수 함수 관례).
 */
export function accumulateMatchStatsIntoSeason<K>(
  season: ReadonlyMap<K, PlayerMatchStatTierAFold>,
  matchFold: ReadonlyMap<K, PlayerMatchStatTierAFold>,
): ReadonlyMap<K, PlayerMatchStatTierAFold> {
  const next = new Map<K, PlayerMatchStatTierAFold>(season);
  for (const [key, fold] of matchFold) {
    const existing = next.get(key);
    next.set(key, existing ? addTierAFold(existing, fold) : addTierAFold(zeroTierAFold(), fold));
  }
  return next;
}

/**
 * `accumulateMatchStatsIntoSeason()`을 경기 순서대로 반복 적용해 시즌 전체 누계를 만든다.
 * 순서 자체는 결과에 영향을 주지 않는다(덧셈 교환·결합 법칙만 쓰므로) — 다만 이름과 용법은
 * "경기마다 한 번씩 누적"이라는 실제 운영 패턴을 그대로 반영한다. 빈 배열이면 빈 맵.
 */
export function accumulateSeasonStats<K>(
  matchFolds: readonly ReadonlyMap<K, PlayerMatchStatTierAFold>[],
): ReadonlyMap<K, PlayerMatchStatTierAFold> {
  return matchFolds.reduce<ReadonlyMap<K, PlayerMatchStatTierAFold>>(
    (season, matchFold) => accumulateMatchStatsIntoSeason(season, matchFold),
    new Map<K, PlayerMatchStatTierAFold>(),
  );
}

/**
 * 선수 단위 Tier A 폴드(`accumulatePlayerMatchStats()` 산출)를 로스터(`playerId` → `teamId`)로
 * 묶어 팀 단위 Tier A 폴드를 만든다. 로스터에 없는 `playerId`는 건너뛴다(이번 경기에 관여하지
 * 않은 것으로 간주 — 파일 헤더 "팀 지표는…" 절 참조). 팀 귀속의 의미론적 한계(자책골 등)도
 * 같은 절에 문서화돼 있다.
 */
export function foldPlayerStatsIntoTeams(
  playerStats: ReadonlyMap<PlayerId, PlayerMatchStatTierAFold>,
  roster: ReadonlyMap<PlayerId, TeamId>,
): ReadonlyMap<TeamId, PlayerMatchStatTierAFold> {
  const teamFolds = new Map<TeamId, PlayerMatchStatTierAFold>();
  for (const [playerId, fold] of playerStats) {
    const teamId = roster.get(playerId);
    if (!teamId) continue;
    const existing = teamFolds.get(teamId);
    teamFolds.set(teamId, existing ? addTierAFold(existing, fold) : addTierAFold(zeroTierAFold(), fold));
  }
  return teamFolds;
}

/**
 * **FR-ST-005 — 이벤트 로그 기반 선수 시즌 재계산.** 시즌에 속한 경기 전부의
 * `MatchEventDraft[]`(경기당 1개 배열, 순서 무관 — 폴드가 교환·결합 법칙만 쓰므로)를 한꺼번에
 * 받아 각 경기를 `accumulatePlayerMatchStats()`로 다시 접고, 그 결과를
 * `accumulateSeasonStats()`로 시즌 단위까지 합산한다. 저장된 중간 누계(예: 지난 라운드까지의
 * `PlayerSeasonStat`)를 전혀 참조하지 않고 원본 이벤트만으로 처음부터 다시 계산한다는 점이
 * `accumulateMatchStatsIntoSeason()`(누계에 1건만 더하는 증분 경로)과의 핵심 차이다 —
 * 백필·재시뮬레이션 후 이력 재구축, 또는 저장된 누계의 정합성 감사(같은 이벤트 로그로 다시
 * 계산했을 때 저장값과 같은지 대조)에 쓴다.
 */
export function recomputePlayerSeasonStatsFromEventLogs(
  matchEventLogs: readonly (readonly MatchEventDraft[])[],
): ReadonlyMap<PlayerId, PlayerMatchStatTierAFold> {
  const perMatchFolds = matchEventLogs.map((events) => accumulatePlayerMatchStats(events));
  return accumulateSeasonStats(perMatchFolds);
}

/** `recomputeTeamSeasonStatsFromEventLogs()` 입력 — 경기 1건의 이벤트 로그 + 그 경기의 로스터. */
export interface TeamStatEventLogEntry {
  readonly events: readonly MatchEventDraft[];
  /** 이 경기에 관여한 선수의 소속 팀(양 팀 합쳐 하나의 맵) — `foldPlayerStatsIntoTeams()` 입력. */
  readonly roster: ReadonlyMap<PlayerId, TeamId>;
}

/**
 * **FR-ST-005 — 이벤트 로그 기반 팀 시즌 재계산.** 경기별 이벤트 로그 + 로스터 쌍을 받아
 * 각 경기를 선수 단위로 접은 뒤(`accumulatePlayerMatchStats()`) 로스터로 팀 단위로 묶고
 * (`foldPlayerStatsIntoTeams()`), 시즌 단위까지 합산한다(`accumulateSeasonStats()`). 팀 귀속의
 * 의미론적 한계는 파일 헤더 "팀 지표는…" 절 참조.
 */
export function recomputeTeamSeasonStatsFromEventLogs(
  matchEventLogs: readonly TeamStatEventLogEntry[],
): ReadonlyMap<TeamId, PlayerMatchStatTierAFold> {
  const perMatchTeamFolds = matchEventLogs.map(({ events, roster }) =>
    foldPlayerStatsIntoTeams(accumulatePlayerMatchStats(events), roster),
  );
  return accumulateSeasonStats(perMatchTeamFolds);
}
