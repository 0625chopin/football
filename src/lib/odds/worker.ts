/**
 * 배당 산출 워커 — "언제"(schedule.ts)와 "무엇을"(runner.ts/match-market.ts) 사이를 잇는
 * 오케스트레이션 계층
 *
 * Task 035 / 33일차(2026-09-03) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 33일차 행: "워커·큐로 분리 가능한 인터페이스 구조 (NFR-SC-004). V-02 결과에 따른 8분할
 * 처리 대응". 수락 기준: "단일 호출 시간 한도 내".
 *
 * 이 파일은 두 가지 별개 몫을 담는다 — 둘 다 32일차 `schedule.ts`가 명시적으로 이 파일에
 * 남긴 책임이다(그 파일 헤더 "이 파일의 책임 범위" 절 참조).
 *
 * ## ① 8분할 처리 (NFR-SC-004, V-02 결과 반영)
 * `docs/dailyWorkLog/26Day.md` V-02 실측: 풀 엔진 1회 호출 ≈0.497ms. `runOddsPresimMatch`는
 * 기본 `MC_N_MATCH`(3,000)회를 순차 반복하므로 단일 호출 총 소요가 ≈1.5s에 달한다 — 이후
 * 비동기 큐(워커)로 옮길 것을 전제로 "단일 호출"의 작업량을 줄여야 한다는 게 오늘 수락
 * 기준의 근거다. `ODDS_PARAM.PARTITION_COUNT`(공통코드, 오늘 신설 — I-167과 같은 33일차
 * `catalog.ts`/`fallback.ts` 반영)만큼 `MC_N_MATCH`를 파티션으로 나누고, 파티션마다
 * `runOddsPresimMatch`를 `runIndexOffset`(27일차 `runner.ts`에 오늘 추가한 파라미터)만큼
 * 어긋난 구간으로 호출해 시드 중복 없이 독립적으로 실행한다.
 *
 * NFR-SC-004 수락 기준("호출부 수정만으로 비동기 큐로 전환 가능")을 만족시키려고
 * `runOddsComputeMatchMarket`의 파티션 실행기(`executeJob`)를 주입 가능하게 열어 뒀다 —
 * 기본값은 동기 `runOddsComputeJob`을 감싼 즉시 완료 Promise이지만, 실제 큐가 생기면 호출부는
 * `executeJob`만 "큐에 넣고 완료를 기다리는 함수"로 바꿔 끼우면 된다. `runOddsComputeMatchMarket`
 * 자체의 시그니처·반환 타입(`MatchOutcomeMarket`)은 그대로다 — 이것이 "인터페이스가 엔진에서
 * 분리되어 있다"의 실체다.
 *
 * ## ② 최초 산출 이력 상태 (32일차 인계 ⓑ)
 * `schedule.ts`는 순수 함수라 "이 대진의 최초 산출이 이미 실행됐는지"를 모른다 — 그 파일
 * 헤더가 이 구분을 명시적으로 이 파일 몫으로 남겼다("재산출 트리거의 시점 가정" 절).
 * `decideOddsComputeAction`이 `OddsComputeStateStore`(대진별 최초 산출 여부만 기억하는 최소
 * 상태)를 받아, 재산출 트리거(`LINEUP_CONFIRMED`/`INJURY_OCCURRED`)가 최초 산출이 아직 없던
 * 대진에 도착한 경우를 `'INITIAL_VIA_RECOMPUTE'`로 — 이미 최초 산출이 끝난 대진의 통상
 * 재산출(`'RECOMPUTE'`)과 다른 상태로 — 구분해 반환한다. 킥오프 경과로 인한 차단은 그대로
 * `schedule.ts`(`decideInitialCompute`/`decideRecompute`)에 위임한다 — 이 파일은 그 판정
 * 위에 "최초 실행 여부"라는 상태 한 겹만 얹는다.
 *
 * ## 공통코드 (NFR-CFG-001, I-167)
 * 리드타임(`INITIAL_LEAD_MIN`)·파티션 개수(`PARTITION_COUNT`) 둘 다 `ODDS_PARAM`에서
 * `loadConstants`로 읽는다(`overround.ts`의 `resolveOptions`와 동일한 오버라이드 패턴) —
 * 이 파일에 리터럴 30·8을 직접 두지 않는다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 미사용 — "현재 시각"은 `schedule.ts`와 동일하게 호출자가
 * `now: Timestamp`로 주입한다. `react` / `@supabase/*` import 0건. 도메인 타입은 배럴
 * (`@/types`)로만 import한다.
 */

import type { Timestamp } from '@/types';
import { loadConstants } from '@/lib/config/loader';
import {
  decideInitialCompute,
  decideRecompute,
  type OddsComputeSkipReason,
  type OddsComputeTrigger,
} from './schedule';
import {
  runOddsPresimMatch,
  type OddsPresimMatchResult,
  type OddsPresimRunResult,
  type RunOddsPresimOptions,
} from './runner';
import {
  computeMatchOutcomeProbabilities,
  tallyMatchOutcomes,
  type MatchOutcomeMarket,
} from './match-market';

/* ────────────────────────────────────────────────────────────────────────
 * 공통코드 주입 (I-167 — 리터럴 하드코딩 금지)
 * ──────────────────────────────────────────────────────────────────────── */

/** 최초 산출 리드타임(킥오프 T-분). 기본 `ODDS_PARAM.INITIAL_LEAD_MIN`(=30). */
function resolveLeadMinutes(override?: number): number {
  return override ?? loadConstants('ODDS_PARAM').INITIAL_LEAD_MIN;
}

/** 몬테카를로 반복 파티션 개수. 기본 `ODDS_PARAM.PARTITION_COUNT`(=8, NFR-SC-004). */
function resolvePartitionCount(override?: number): number {
  return override ?? loadConstants('ODDS_PARAM').PARTITION_COUNT;
}

/* ────────────────────────────────────────────────────────────────────────
 * ② 최초 산출 이력 상태 (32일차 인계 ⓑ)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `decideOddsComputeAction`이 반환하는 행동 종류.
 * - `INITIAL`: 최초 산출 윈도 도달 → 정상 최초 산출.
 * - `INITIAL_VIA_RECOMPUTE`: **최초 산출이 아직 실행된 적 없는 대진에 재산출 트리거가
 *   먼저 도착한 경우** — 이번 32일차 인계 ⓑ가 별도 상태로 구분하라고 남긴 케이스다.
 * - `RECOMPUTE`: 최초 산출이 이미 끝난 대진의 통상 재산출.
 * - `SKIPPED`: `schedule.ts`가 차단(`skipReason` 참조) — 산출 윈도 전이거나 킥오프 경과.
 */
export type OddsComputeActionKind =
  | 'INITIAL'
  | 'INITIAL_VIA_RECOMPUTE'
  | 'RECOMPUTE'
  | 'SKIPPED';

export interface OddsComputeAction {
  readonly kind: OddsComputeActionKind;
  readonly trigger: OddsComputeTrigger;
  /** `kind === 'SKIPPED'`일 때만 값을 갖는다. */
  readonly skipReason: OddsComputeSkipReason | null;
}

/**
 * 대진별 "최초 산출이 실행된 적 있는가"만 기억하는 최소 상태 계약. `schedule.ts`는 순수
 * 함수 집합이라 이 상태를 가질 수 없어(그 파일 헤더 참조) 워커 계층이 대신 가진다.
 * 인터페이스로 분리해 뒀으니 테스트는 인메모리 구현을, 실배포는 영속 저장소(예: Supabase
 * 테이블 조회) 구현을 자유롭게 주입할 수 있다.
 */
export interface OddsComputeStateStore {
  hasInitialComputeRun(matchKey: number): boolean;
  markInitialComputeRun(matchKey: number): void;
}

/** `OddsComputeStateStore`의 인메모리 구현(테스트·단일 프로세스 기본값). */
export function createInMemoryOddsComputeStateStore(): OddsComputeStateStore {
  const computedMatchKeys = new Set<number>();
  return {
    hasInitialComputeRun(matchKey) {
      return computedMatchKeys.has(matchKey);
    },
    markInitialComputeRun(matchKey) {
      computedMatchKeys.add(matchKey);
    },
  };
}

/**
 * (재)산출 트리거 하나를 받아 "무엇을 해야 하는가"를 상태까지 반영해 최종 판정한다.
 * 킥오프 경과·산출 윈도 미도달 차단은 `schedule.ts`(`decideInitialCompute`/`decideRecompute`)
 * 그대로 위임하고, 이 함수는 그 위에 "최초 산출 이력" 한 겹만 얹는다(32일차 인계 ⓑ).
 *
 * `shouldCompute: true`로 판정되는 모든 경로(`INITIAL`/`INITIAL_VIA_RECOMPUTE`/`RECOMPUTE`)는
 * 반환 직전 `store`에 해당 대진을 "최초 산출 완료"로 표시한다 — 재산출이 최초 산출을 대신
 * 여는 경우(`INITIAL_VIA_RECOMPUTE`) 이후 트리거부터는 정상적으로 `RECOMPUTE`로 판정되게
 * 하기 위함이다.
 */
export function decideOddsComputeAction(
  store: OddsComputeStateStore,
  matchKey: number,
  now: Timestamp,
  kickoffAt: Timestamp,
  trigger: OddsComputeTrigger,
  leadMinutes?: number,
): OddsComputeAction {
  if (trigger === 'INITIAL_WINDOW') {
    const decision = decideInitialCompute(now, kickoffAt, resolveLeadMinutes(leadMinutes));
    if (!decision.shouldCompute) {
      return { kind: 'SKIPPED', trigger, skipReason: decision.skipReason };
    }
    store.markInitialComputeRun(matchKey);
    return { kind: 'INITIAL', trigger, skipReason: null };
  }

  const decision = decideRecompute(now, kickoffAt, trigger);
  if (!decision.shouldCompute) {
    return { kind: 'SKIPPED', trigger, skipReason: decision.skipReason };
  }

  const hadInitialComputeRun = store.hasInitialComputeRun(matchKey);
  store.markInitialComputeRun(matchKey);
  return {
    kind: hadInitialComputeRun ? 'RECOMPUTE' : 'INITIAL_VIA_RECOMPUTE',
    trigger,
    skipReason: null,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * ① 8분할 처리 (NFR-SC-004, V-02 결과 반영)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 총 반복 횟수를 `partitionCount`개의 균형 잡힌 정수 조각으로 나눈다. 나머지는 앞쪽
 * 파티션부터 1씩 더 받는다(합계는 항상 정확히 `totalRunCount`). 파티션 수가 총 반복
 * 횟수보다 많으면 크기 0인 파티션은 결과에서 제외한다(빈 작업을 큐에 올리지 않는다).
 */
export function splitRunCount(
  totalRunCount: number,
  partitionCount: number,
): readonly number[] {
  if (!Number.isInteger(totalRunCount) || totalRunCount < 1) {
    throw new RangeError(
      `splitRunCount: totalRunCount는 1 이상의 정수여야 합니다 (받은 값: ${totalRunCount}).`,
    );
  }
  if (!Number.isInteger(partitionCount) || partitionCount < 1) {
    throw new RangeError(
      `splitRunCount: partitionCount는 1 이상의 정수여야 합니다 (받은 값: ${partitionCount}).`,
    );
  }

  const base = Math.floor(totalRunCount / partitionCount);
  const remainder = totalRunCount % partitionCount;
  const sizes: number[] = [];
  for (let i = 0; i < partitionCount; i += 1) {
    const size = base + (i < remainder ? 1 : 0);
    if (size > 0) {
      sizes.push(size);
    }
  }
  return sizes;
}

/**
 * 워커/큐 하나에 넘길 수 있는 작업 단위. `options`는 이미 이 파티션 몫의 `runCount`·
 * `runIndexOffset`으로 좁혀져 있어 `runOddsComputeJob`(또는 큐 컨슈머)이 그대로
 * `runOddsPresimMatch`에 넘기기만 하면 된다 — 직렬화 가능한 순수 데이터라 실제 큐 페이로드로
 * 그대로 쓸 수 있다.
 */
export interface OddsComputeJob {
  readonly partitionIndex: number;
  readonly partitionCount: number;
  readonly options: RunOddsPresimOptions;
}

/**
 * `options`(전체 반복 횟수 — 기본 `ODDS_PARAM.MC_N_MATCH`)를 `partitionCount`
 * (기본 `ODDS_PARAM.PARTITION_COUNT`=8)개 작업으로 쪼갠다. 각 작업은 서로 겹치지 않는
 * `runIndex` 구간을 담당하도록 `runIndexOffset`을 누적한다(`runner.ts` 33일차 추가 파라미터).
 */
export function buildOddsComputeJobs(
  options: RunOddsPresimOptions,
  partitionCount?: number,
): readonly OddsComputeJob[] {
  const totalRunCount = options.runCount ?? loadConstants('ODDS_PARAM').MC_N_MATCH;
  const resolvedPartitionCount = resolvePartitionCount(partitionCount);
  const sizes = splitRunCount(totalRunCount, resolvedPartitionCount);
  const baseOffset = options.runIndexOffset ?? 0;

  const jobs: OddsComputeJob[] = [];
  let offset = baseOffset;
  sizes.forEach((size, i) => {
    jobs.push({
      partitionIndex: i,
      partitionCount: sizes.length,
      options: { ...options, runCount: size, runIndexOffset: offset },
    });
    offset += size;
  });
  return jobs;
}

/** 작업 하나를 동기 실행한다 — 오늘의 기본 실행기. 큐 전환 시 이 함수 자체는 그대로 두고
 * 호출부(`runOddsComputeMatchMarket`의 `executeJob`)만 비동기 디스패처로 바꿔 끼운다. */
export function runOddsComputeJob(job: OddsComputeJob): OddsPresimMatchResult {
  return runOddsPresimMatch(job.options);
}

/**
 * 파티션 실행 결과를 하나로 합친다. 모든 파티션이 같은 `seasonSeed`(같은 월드시드·시즌·
 * 네임스페이스에서 파생)를 가져야 한다는 불변식을 방어적으로 검증한다 — 어긋나면 서로 다른
 * 대진/시즌의 결과가 섞였다는 뜻이라 상위 버그로 간주해 예외를 던진다.
 */
export function mergeOddsPresimMatchResults(
  results: readonly OddsPresimMatchResult[],
): OddsPresimMatchResult {
  if (results.length === 0) {
    throw new RangeError('mergeOddsPresimMatchResults: results는 최소 1개 이상이어야 합니다.');
  }

  const seasonSeed = results[0].seasonSeed;
  const runs: OddsPresimRunResult[] = [];
  for (const result of results) {
    if (result.seasonSeed !== seasonSeed) {
      throw new Error(
        `mergeOddsPresimMatchResults: 모든 파티션이 같은 seasonSeed여야 합니다 ` +
          `(첫 파티션=${seasonSeed}, 이 파티션=${result.seasonSeed}). ` +
          '서로 다른 대진/월드시드의 결과가 섞였을 가능성이 있습니다.',
      );
    }
    runs.push(...result.runs);
  }
  return { seasonSeed, runs };
}

export interface RunOddsComputeMatchMarketConfig {
  /** 파티션 개수. 기본 `ODDS_PARAM.PARTITION_COUNT`(=8). */
  readonly partitionCount?: number;
  /**
   * 작업 하나를 실행하는 함수. 기본값은 동기 `runOddsComputeJob`을 Promise로 감싼 것뿐이다.
   * 실제 큐가 생기면 이 함수만 "큐에 넣고 완료를 기다리는 비동기 디스패처"로 교체하면 되고,
   * `runOddsComputeMatchMarket`의 시그니처·반환 타입은 바뀌지 않는다(NFR-SC-004 수락 기준
   * "호출부 수정만으로 비동기 큐로 전환 가능"의 실체).
   */
  readonly executeJob?: (job: OddsComputeJob) => Promise<OddsPresimMatchResult>;
}

/**
 * 대진 하나의 1X2 마켓을 8분할(기본값) 파티션으로 산출한다. `computeMatchOutcomeMarket`
 * (28일차 `match-market.ts`)과 최종 결과는 동일하지만, 내부적으로 몬테카를로 반복을
 * `ODDS_PARAM.PARTITION_COUNT`개 독립 작업으로 나눠 실행한 뒤 병합한다는 점이 다르다 —
 * 단일 호출(파티션 1개짜리 `runOddsPresimMatch` 한 번)의 작업량을 줄여 "단일 호출 시간
 * 한도" 수락 기준을 충족하고, 각 파티션이 비동기 큐 작업 하나에 대응하도록 구조화했다
 * (NFR-SC-004).
 */
export async function runOddsComputeMatchMarket(
  options: RunOddsPresimOptions,
  config: RunOddsComputeMatchMarketConfig = {},
): Promise<MatchOutcomeMarket> {
  const jobs = buildOddsComputeJobs(options, config.partitionCount);
  const executeJob = config.executeJob ?? ((job: OddsComputeJob) => Promise.resolve(runOddsComputeJob(job)));

  const partials = await Promise.all(jobs.map((job) => executeJob(job)));
  const merged = mergeOddsPresimMatchResults(partials);

  const counts = tallyMatchOutcomes(merged);
  const probabilityUnits = computeMatchOutcomeProbabilities(counts);
  return { simCount: merged.runs.length, counts, probabilityUnits };
}
