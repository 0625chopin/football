/**
 * `src/lib/sim/postmatch/pipeline.ts`
 *
 * Task 026(33일차) — "후처리 7종 단일 트랜잭션 골격 — 스코어 확정 / 순위 갱신 / 스탯 누적 /
 * 컨디션·피로 / 부상 판정 / 카드·정지 / 정산 트리거". `docs/team-schedule/
 * 02-시뮬레이션엔진팀.md` 33일차 행. 완료 판정 "7종 순서 고정"은 아래
 * `POST_MATCH_STAGE_ORDER`가 순서의 유일한 정의이고 `runPostMatchPipeline()`이 그 순서
 * 그대로만 실행한다는 사실로 성립한다(`pipeline.test.ts`가 `executedStages` 실행 트레이스로
 * 검증 — 코드 구조가 아니라 런타임 값으로 순서를 증명한다).
 *
 * ## 오늘 실제로 배선하는 4종 vs 계약만 두는 3종
 * 7종 중 이미 존재하는 엔진 산출물로 실제 배선되는 것은 스코어 확정(신규, 이 파일)·스탯
 * 누적(11일차 `match/stats.ts`의 `accumulatePlayerMatchStats` 재사용)·카드·정지(22일차
 * `discipline/suspension.ts`의 `applyMatchCards`/`advanceCompetitionRound` 재사용)·정산
 * 트리거(신규, 최소 마커) 4종이다. 순위 갱신(리그 전체 타이브레이커 — 공수 근거표가
 * "7단계 타이브레이커"로 별도 명시, `match/stats.ts` 헤더가 예고한 `standing/aggregate.ts`도
 * 아직 없음)·컨디션·피로·부상 판정 3종은 이 계층이 의존할 하위 계산 모듈이 아직 없다 —
 * `match/tier-b-resim-contract.ts`(11일차) 선례와 같은 이유로 "동작하는 척"하는 스텁 함수를
 * 만들지 않는다("오늘은 …타입 계약만 고정한다"). 대신 `PostMatchStageNotImplemented` 마커
 * 하나로 통일해 **7개 자리가 구조적으로 전부 존재한다는 것**과 **그중 3개는 계약뿐이라는
 * 것**을 동시에 타입으로 드러낸다 — `implemented: false` 판별 필드가 있어 오케스트레이션
 * 계층이 값을 실제로 쓰려 하면(예: 존재하지 않는 필드 접근) 컴파일 타임에 막힌다.
 *
 * ## "단일 트랜잭션"의 의미 — 엔진은 순수 함수라 DB 트랜잭션이 없다
 * 이 파일은 `@supabase/*`를 import하지 않는다(NFR-DT-001) — 실제 커밋/롤백은 오케스트레이션
 * 계층(H-15 소비 시점, 6팀 크론 033) 소관이다. 여기서 "트랜잭션"이 뜻하는 것은 ① 입력
 * 스냅샷 하나에서 7개 스테이지 산출물 전체를 한 번에 계산해 하나의 불변 결과 객체로
 * 반환하고 ② 스테이지 하나가 실패(`throw`)하면 이미 계산된 앞 단계 결과까지 포함해 아무
 * 것도 반환하지 않는다(부분 반영 없음)는 순수 함수 수준의 원자성이다 — 호출자는 반환값을
 * 받았다는 사실 자체를 "7종 전부 성공"으로 해석할 수 있다.
 *
 * ## 카드·정지 스테이지는 스탯 누적 스테이지의 산출값을 재사용한다
 * `PlayerMatchStatTierAFold`(스탯 누적 산출)와 `MatchCardCounts`(카드·정지 입력, 22일차
 * `suspension.ts`)가 이미 `yellowCards`/`secondYellows`/`redCards` 3필드로 구조가 같아
 * 변환이 필요 없다 — 이 파이프라인이 순서를 지키는 것 자체가 "카드 집계 재계산 금지"를
 * 구조적으로 보장하는 지점이다(21일차 인계 "입력을 재구현하지 않는다" 원칙과 동일).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 타입은 `@/types`
 * 배럴로만 import.
 */

import type { CompetitionType, FixtureId, LeagueId, PlayerId, SeasonId, TeamId } from '@/types';
import type { MatchEventDraft } from '../match/events';
import { accumulatePlayerMatchStats, type PlayerMatchStatTierAFold } from '../match/stats';
import {
  advanceCompetitionRound,
  applyMatchCards,
  type PlayerDisciplineState,
  type SuspensionRuleOptions,
} from '../discipline/suspension';
import type { SuspensionCompetition } from '../lineup/select';

/**
 * 7종 후처리 스테이지의 고정 순서 — 이 배열이 순서의 단일 소스다. 순서를 바꾸려면 이 상수와
 * `runPostMatchPipeline()` 본문을 함께 고쳐야 하며, `pipeline.test.ts`가 두 곳이 어긋나면
 * 실패한다.
 */
export const POST_MATCH_STAGE_ORDER = [
  'SCORE_CONFIRMATION',
  'STANDINGS_UPDATE',
  'STAT_ACCUMULATION',
  'CONDITION_FATIGUE',
  'INJURY_ASSESSMENT',
  'CARD_SUSPENSION',
  'SETTLEMENT_TRIGGER',
] as const;

export type PostMatchStageName = (typeof POST_MATCH_STAGE_ORDER)[number];

// ── 스테이지 1 — 스코어 확정 ────────────────────────────────────────────────

/** 시뮬레이션이 이미 산출한 원시 스코어 — 이 스테이지는 값을 새로 만들지 않고 검증·확정만 한다. */
export interface RawMatchScoreInput {
  readonly homeScore: number;
  readonly awayScore: number;
  readonly htHomeScore: number | null;
  readonly htAwayScore: number | null;
  readonly etHomeScore: number | null;
  readonly etAwayScore: number | null;
  readonly pkHome: number | null;
  readonly pkAway: number | null;
}

/** 확정된 스코어 — `Fixture`의 스코어 필드 + `status: 'FINISHED'`로 패치할 부분집합. */
export type ConfirmedMatchScore = RawMatchScoreInput & { readonly status: 'FINISHED' };

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`confirmMatchScore: ${label}는 0 이상의 정수여야 합니다 (받은 값: ${value}).`);
  }
}

function assertPairedNullable(a: number | null, b: number | null, label: string): void {
  if ((a === null) !== (b === null)) {
    throw new RangeError(`confirmMatchScore: ${label} 쌍은 둘 다 null이거나 둘 다 값이 있어야 합니다.`);
  }
  if (a !== null && b !== null) {
    assertNonNegativeInteger(a, `${label}(home)`);
    assertNonNegativeInteger(b, `${label}(away)`);
  }
}

/**
 * 스테이지 1 — 스코어 확정. D-19(승부차기 득점 미포함·연장전 득점 포함)에 따라
 * `homeScore`/`awayScore`는 이미 연장 득점을 합산한 값으로 들어온다는 전제다(경기 엔진
 * 산출값 그대로 통과시킨다 — 이 함수가 연장을 재합산하지 않는다). 승부차기는
 * `pkHome`/`pkAway`가 있을 때만 검증하고 골 수 필드에는 반영하지 않는다(T18/D-19,
 * `Fixture.pkHome` 필드 주석 "승패 판정 전용, 통산/득점왕 집계에 합산 금지"와 동일 근거).
 *
 * **가정(미확정, 요구사항 문서에 명시적 근거 없음 — 틀렸다고 판명되면 이 함수만 고치면
 * 된다)**: 승부차기가 있으면 연장 스코어도 있어야 한다(승부차기는 연장 무승부 다음에만
 * 발생한다는 축구 규칙 통념을 적용했다). 이 순서 자체를 확정한 결정(D-*)은 아직 없다.
 *
 * @throws 스코어가 음의 정수·비정수이거나, ht/et/pk 쌍 중 한쪽만 있거나, 승부차기가 있는데
 *   연장 스코어가 없거나, 승부차기가 무승부면 오류.
 */
export function confirmMatchScore(raw: RawMatchScoreInput): ConfirmedMatchScore {
  assertNonNegativeInteger(raw.homeScore, 'homeScore');
  assertNonNegativeInteger(raw.awayScore, 'awayScore');
  assertPairedNullable(raw.htHomeScore, raw.htAwayScore, 'htScore');
  assertPairedNullable(raw.etHomeScore, raw.etAwayScore, 'etScore');
  assertPairedNullable(raw.pkHome, raw.pkAway, 'pkScore');

  if (raw.pkHome !== null && raw.etHomeScore === null) {
    throw new RangeError('confirmMatchScore: 승부차기 스코어가 있으면 연장 스코어도 있어야 합니다.');
  }
  if (raw.pkHome !== null && raw.pkAway !== null && raw.pkHome === raw.pkAway) {
    throw new RangeError('confirmMatchScore: 승부차기는 무승부가 될 수 없습니다.');
  }

  return { ...raw, status: 'FINISHED' };
}

// ── 계약만 있는 스테이지(순위 갱신 / 컨디션·피로 / 부상 판정) 공통 마커 ──────────

/**
 * 계약만 있는 스테이지의 공통 마커 — 왜 함수 구현이 없는지는 파일 헤더 "오늘 실제로
 * 배선하는 4종 vs 계약만 두는 3종" 참조. `implemented: false` 판별 필드로 오케스트레이션
 * 계층이 값을 실제로 쓰기 전에 컴파일 타임에 걸러지도록 한다.
 */
export interface PostMatchStageNotImplemented {
  readonly stage: PostMatchStageName;
  readonly implemented: false;
  /** 이 스테이지가 의존할 하위 계산 모듈이 아직 없는 이유 — 채워질 시점 단서 포함. */
  readonly reason: string;
}

function stageNotImplemented(stage: PostMatchStageName, reason: string): PostMatchStageNotImplemented {
  return { stage, implemented: false, reason };
}

// ── 스테이지 3 — 스탯 누적 ──────────────────────────────────────────────────

/**
 * 스테이지 3 — 스탯 누적. 11일차 `match/stats.ts`의 `accumulatePlayerMatchStats()`를 그대로
 * 재사용한다(이 파일이 이벤트 순회 로직을 재구현하지 않는다 — 21일차 인계 "입력을
 * 재구현하지 않는다" 원칙과 동일). 시즌 누계(`PlayerSeasonStat`/`TeamSeasonStat`) 반영은 이
 * 스테이지 범위 밖이다(`match/stats.ts` 헤더가 예고한 `standing/aggregate.ts` 소관, 아직
 * 미착수 — 순위 갱신 스테이지가 계약만 있는 이유와 같은 하위 모듈 부재).
 */
export function runStatAccumulationStage(
  events: readonly MatchEventDraft[],
): ReadonlyMap<PlayerId, PlayerMatchStatTierAFold> {
  return accumulatePlayerMatchStats(events);
}

// ── 스테이지 6 — 카드·정지 ──────────────────────────────────────────────────

export interface PlayerCardSuspensionInput {
  readonly priorState: PlayerDisciplineState;
  readonly competition: SuspensionCompetition;
  /** 퇴장이 있는 선수만 필수(`applyMatchCards` 기존 계약과 동일 — I-41 보류로 이 파일이
   *  사유→경기수 매핑을 추측하지 않는다). */
  readonly dismissalSuspensionGames?: number;
}

/**
 * 스테이지 6 — 카드·정지. 22일차 `discipline/suspension.ts`의 `applyMatchCards`(이번 경기
 * 카드 반영)와 `advanceCompetitionRound`(라운드 진행에 따른 잔여 정지 차감)를 그대로
 * 재사용한다. 카드 집계 자체는 재계산하지 않고 **스테이지 3(스탯 누적)의 산출값을 그대로
 * 소비**한다(파일 헤더 "카드·정지 스테이지는 스탯 누적 스테이지의 산출값을 재사용한다"
 * 참조).
 *
 * `roster`에 없는 선수는 이번 경기에 관여하지 않은 것으로 보고 건너뛴다. `roster`에 있지만
 * `statByPlayer`에 없는 선수(이번 경기 카드가 0장)는 카드 0장으로 처리하고 라운드 진행만
 * 반영한다.
 */
export function runCardSuspensionStage(
  statByPlayer: ReadonlyMap<PlayerId, PlayerMatchStatTierAFold>,
  roster: ReadonlyMap<PlayerId, PlayerCardSuspensionInput>,
  options?: SuspensionRuleOptions,
): ReadonlyMap<PlayerId, PlayerDisciplineState> {
  const result = new Map<PlayerId, PlayerDisciplineState>();

  for (const [playerId, entry] of roster) {
    const cards = statByPlayer.get(playerId);
    const withCards = cards
      ? applyMatchCards(entry.priorState, entry.competition, cards, entry.dismissalSuspensionGames, options)
      : entry.priorState;
    result.set(playerId, advanceCompetitionRound(withCards, entry.competition));
  }

  return result;
}

// ── 스테이지 7 — 정산 트리거 ────────────────────────────────────────────────

export interface SettlementTriggerFixtureIdentity {
  readonly fixtureId: FixtureId;
  readonly seasonId: SeasonId;
  readonly leagueId: LeagueId | null;
  readonly competitionType: CompetitionType;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
}

export interface SettlementTriggerPayload extends SettlementTriggerFixtureIdentity {
  readonly finalScore: Pick<ConfirmedMatchScore, 'homeScore' | 'awayScore' | 'pkHome' | 'pkAway'>;
  /** 정산 자체는 이 엔진의 책임이 아니다(3팀 도메인 — H-15 "정산 입력" 소비, 39/40일차
   *  인계). 이 필드는 "정산에 필요한 입력이 준비됐다"는 신호일 뿐 배당·포인트 계산을 하지
   *  않는다. */
  readonly readyForSettlement: true;
}

/**
 * 스테이지 7 — 정산 트리거. 배당·포인트 정산 계산 자체는 3팀 도메인(betting/economy)
 * 소관이라 여기서 하지 않는다(엔진 경로 밖 — H-15는 "정산 입력"만 넘긴다). 이 함수는
 * 스테이지 1(스코어 확정) 결과에서 필요한 필드만 뽑아 전달할 뿐 새 계산이 없다.
 */
export function buildSettlementTrigger(
  identity: SettlementTriggerFixtureIdentity,
  confirmedScore: ConfirmedMatchScore,
): SettlementTriggerPayload {
  return {
    ...identity,
    finalScore: {
      homeScore: confirmedScore.homeScore,
      awayScore: confirmedScore.awayScore,
      pkHome: confirmedScore.pkHome,
      pkAway: confirmedScore.pkAway,
    },
    readyForSettlement: true,
  };
}

// ── 오케스트레이터 ──────────────────────────────────────────────────────────

export interface PostMatchPipelineInput {
  readonly fixture: SettlementTriggerFixtureIdentity;
  readonly rawScore: RawMatchScoreInput;
  readonly events: readonly MatchEventDraft[];
  readonly disciplineRoster: ReadonlyMap<PlayerId, PlayerCardSuspensionInput>;
  readonly suspensionOptions?: SuspensionRuleOptions;
}

export interface PostMatchPipelineResult {
  /** 런타임 실행 순서 그대로의 트레이스 — `POST_MATCH_STAGE_ORDER`와 항상 동일해야 한다
   *  (`pipeline.test.ts`가 "7종 순서 고정" 수락 기준을 이 값으로 검증). */
  readonly executedStages: readonly PostMatchStageName[];
  readonly scoreConfirmation: ConfirmedMatchScore;
  readonly standingsUpdate: PostMatchStageNotImplemented;
  readonly statAccumulation: ReadonlyMap<PlayerId, PlayerMatchStatTierAFold>;
  readonly conditionFatigue: PostMatchStageNotImplemented;
  readonly injuryAssessment: PostMatchStageNotImplemented;
  readonly cardSuspension: ReadonlyMap<PlayerId, PlayerDisciplineState>;
  readonly settlementTrigger: SettlementTriggerPayload;
}

/**
 * 7종 후처리를 `POST_MATCH_STAGE_ORDER` 순서 그대로, 한 번의 호출에서 계산한다(파일 헤더
 * "단일 트랜잭션의 의미" 참조). 어느 스테이지든 `throw`하면 그 이전 스테이지 산출물을
 * 포함해 아무 것도 반환하지 않는다.
 */
export function runPostMatchPipeline(input: PostMatchPipelineInput): PostMatchPipelineResult {
  const executedStages: PostMatchStageName[] = [];

  executedStages.push('SCORE_CONFIRMATION');
  const scoreConfirmation = confirmMatchScore(input.rawScore);

  executedStages.push('STANDINGS_UPDATE');
  const standingsUpdate = stageNotImplemented(
    'STANDINGS_UPDATE',
    '리그 전체 7단계 타이브레이커·순위 재계산 모듈 미착수(공수 근거표 "7단계 타이브레이커", ' +
      'match/stats.ts 헤더가 예고한 standing/aggregate.ts) — 이 파이프라인은 단일 경기 ' +
      '스코프라 리그 전체 순위를 스스로 계산할 입력도 없다.',
  );

  executedStages.push('STAT_ACCUMULATION');
  const statAccumulation = runStatAccumulationStage(input.events);

  executedStages.push('CONDITION_FATIGUE');
  const conditionFatigue = stageNotImplemented(
    'CONDITION_FATIGUE',
    '컨디션·피로 갱신 계수·산식이 아직 어느 결정(D-*)·요구사항 절에도 확정되지 않았다 — ' +
      '값을 지어내면 I-34가 이미 기각한 "0 자리표시자" 패턴과 같은 임의 배분이 된다.',
  );

  executedStages.push('INJURY_ASSESSMENT');
  const injuryAssessment = stageNotImplemented(
    'INJURY_ASSESSMENT',
    '부상 판정 확률·등급 배분 산식이 미확정이다 — Injury(E-24) 엔티티는 있으나 판정 ' +
      '트리거·확률은 아직 어느 결정에도 없다.',
  );

  executedStages.push('CARD_SUSPENSION');
  const cardSuspension = runCardSuspensionStage(
    statAccumulation,
    input.disciplineRoster,
    input.suspensionOptions,
  );

  executedStages.push('SETTLEMENT_TRIGGER');
  const settlementTrigger = buildSettlementTrigger(input.fixture, scoreConfirmation);

  return {
    executedStages,
    scoreConfirmation,
    standingsUpdate,
    statAccumulation,
    conditionFatigue,
    injuryAssessment,
    cardSuspension,
    settlementTrigger,
  };
}

// ── 재시도 · 롤백 · 멱등성 (Task 026, 34일차) ───────────────────────────────
//
// `runPostMatchPipeline()`은 이미 순수 함수라 스테이지 하나가 throw하면 그 시행에서 계산된
// 값은 전부 버려진다(파일 헤더 "단일 트랜잭션의 의미" — 부분 반영 없음). 아래는 그 원자성을
// "한 시행" 단위에서 "최대 N번 시행" 단위로 확장하는 얇은 겉껍질이다 — 하위 스테이지 로직을
// 전혀 건드리지 않는다.
//
// 이 파이프라인과 스테이지 전부가 순수 함수라(NFR-DT-001, 무작위성 0) 같은 입력이면 항상
// 같은 값 또는 항상 같은 예외를 낸다 — 즉 재시도 자체가 실패를 성공으로 바꾸는 경우는
// 없다. 그럼에도 상한을 두는 이유는 이 호출 경계가 오케스트레이션 계층(DB 커밋 등 이 엔진
// 밖의 일시적 장애)과 함께 재시도되는 것을 전제로 설계된 자리이기 때문이다 — 상한 없는
// 재시도가 실패를 무한 반복하지 않도록 막는 구조적 안전장치다.

/**
 * 파이프라인이 시행을 전부 소진해도 실패했을 때 알림에 필요한 최소 정보. 실제 알림 발송
 * (이메일·푸시 등)은 이 엔진의 책임이 아니다(오케스트레이션 계층 소관 — `buildSettlementTrigger`가
 * 정산 계산 없이 신호만 넘기는 것과 같은 경계). 이 값은 "발송해야 한다"는 신호와 발송에
 * 필요한 식별자만 담는다.
 */
export interface PostMatchPipelineFailureNotification {
  readonly fixtureId: FixtureId;
  readonly attempts: number;
  readonly lastErrorMessage: string;
  readonly notify: true;
}

/**
 * 재시도 결과 — 성공/실패가 무엇을 노출하는지 타입 자체로 갈린다. 실패 분기는
 * `PostMatchPipelineResult`의 어떤 필드도 담지 않는다(구조적으로 접근 불가) — 스테이지가
 * 마지막 시행까지 실패하면 그 어떤 시행의 산출물도 호출자에게 넘어가지 않는다("전체 롤백"이
 * 재시도 경계까지 확장된 것). 성공 시에는 여러 번 시행했더라도 성공한 시행 하나의 결과만
 * 반환한다(먼저 실패한 시행의 값이 섞여 들어가지 않는다).
 */
export type PostMatchPipelineOutcome =
  | { readonly ok: true; readonly attempts: number; readonly result: PostMatchPipelineResult }
  | {
      readonly ok: false;
      readonly attempts: number;
      readonly notification: PostMatchPipelineFailureNotification;
    };

export interface PostMatchPipelineRetryOptions {
  /** 기본 3(팀 스케줄 34일차 행 "최대 3회 재시도"). 0 이하로 주면 1회로 취급한다(최소 1회 시행). */
  readonly maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * `runPostMatchPipeline()`을 최대 `maxAttempts`회(기본 3) 시행한다. 첫 성공에서 즉시
 * 반환하고 이후 시행은 하지 않는다. 전부 실패하면 던지지 않고 마지막 실패의 알림 페이로드를
 * `ok: false`로 반환한다 — 호출자(오케스트레이션 계층)가 예외 처리 대신 `ok` 판별로
 * 분기하도록 한다.
 */
export function runPostMatchPipelineWithRetry(
  input: PostMatchPipelineInput,
  options?: PostMatchPipelineRetryOptions,
): PostMatchPipelineOutcome {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = runPostMatchPipeline(input);
      return { ok: true, attempts: attempt, result };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    attempts: maxAttempts,
    notification: {
      fixtureId: input.fixture.fixtureId,
      attempts: maxAttempts,
      lastErrorMessage: describeError(lastError),
      notify: true,
    },
  };
}

/**
 * 같은 경기(`fixtureId`)에 대한 **동일 입력** 재실행을 식별하는 결정론적 키. `Date.now()`/
 * 난수 없이 입력 식별자만으로 만든다 — 오케스트레이션 계층이 "이미 처리된 fixtureId"를 이
 * 키로 조회해 스탯 누적을 다시 적용하지 않도록 하는 데 쓴다(팀 스케줄 34일차 행 "재실행
 * 멱등(중복 누적 0)"). 이 엔진 자체는 어떤 저장소도 갖지 않으므로(순수 함수, NFR-DT-001)
 * 중복 방지 조회·기록 자체는 호출자 책임이다 — 이 함수는 조회 키만 만들어 준다. 같은
 * 이유로 `runPostMatchPipeline()`/`runStatAccumulationStage()`는 모듈 스코프 가변 상태를
 * 전혀 갖지 않는다(매 호출 새 `Map` 반환) — 같은 입력을 여러 번 넣어도 스탯이 시행 간에
 * 누적되지 않는다(재실행 시 스탯 이중 누적 0의 실제 근거는 이 무상태성이다).
 *
 * **경고 — 이 키는 재시뮬레이션 구분자가 아니다.** `fixtureId`만으로 만들기 때문에 D-30·
 * D-31 Tier B 재시뮬레이션처럼 같은 fixture를 **다른 입력**(다른 시드/리비전)으로 다시
 * 계산하면 결과는 달라져도 키는 동일하다. 이 함수의 유일한 용도는 "정확히 같은 입력의
 * 우발적 재호출(네트워크 재시도·중복 이벤트 등)을 걸러내는 것"뿐이다 — 오케스트레이션
 * 계층이 재시뮬레이션 경로에서 이 키로 "이미 처리됨" 판정을 내리면 정당한 재계산 결과가
 * 통째로 버려진다. 재시뮬레이션 산출물의 중복 판정에는 이 키를 쓰지 말고, 시드/리비전을
 * 포함한 별도 식별자를 써야 한다(그런 필드가 `PostMatchPipelineInput`에 아직 없어 이 파일
 * 범위 밖 — H-15 오케스트레이션 배선 시점에 해소, 팀장 이슈 등재 예정).
 */
export function computePostMatchIdempotencyKey(fixture: SettlementTriggerFixtureIdentity): string {
  return `postmatch:${fixture.fixtureId}`;
}
