/**
 * 경기 이벤트 생성 — 23종 이벤트 시간순 생성 + 정렬
 *
 * Task 023 / 10일차(2026-08-03) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 10일차 행:
 * "이벤트 23종 생성 및 시간순 정렬. `detail(JSON)` 최소화. 이벤트는 타입 코드만 저장하고
 * 문구는 UI 카탈로그가 담당"(D-18) (동일 항목이 `ROADMAP.md` Task 023 두 번째 체크박스).
 *
 * ## 이 파일의 책임 범위 — "골격"의 의미 (tick.ts와 동일한 경계 원칙)
 * 9일차 `tick.ts`가 "각 슬롯에서 실제로 무슨 일이 일어나는지(슛/파울/카드 등 이벤트 23종
 * 생성)는 10일차 events.ts가 이 배열을 순회하며 채운다(FR-MT-002)"고 위임한 부분을 여기서
 * 구현한다. 다만 실제 선수 능력치 기반 확률(9개 계수 체인)은 **Task 024(17~24일차)**,
 * 라인업 자동 선정(출전 선수 확정)은 **024 21일차**에야 나온다 — 10일차 시점에는
 * "이 이벤트를 누가 만들었는가"를 결정할 입력 데이터 자체가 없다. 그래서:
 *
 * - **이벤트 발생확률·타입별 가중치**는 이 파일에 리터럴 상수로 두지 않고 호출자가
 *   `GenerateMatchEventsOptions`로 주입한다. `docs/team-schedule/02-시뮬레이션엔진팀.md`
 *   9일차 각주가 "9~12일차의 023 작업(틱 순회·이벤트 생성)은 공통코드가 필요 없는 구조
 *   부분만 수행하도록 배치했습니다"라고 명시하므로, 밸런싱 성격의 숫자(발생확률·타입
 *   가중치)를 오늘 지어내면 3팀 H-05 공통코드(13일차) 또는 024 계수 체인과 충돌할
 *   소지가 있다 — 그래서 아예 만들지 않고 파라미터로만 받는다(NFR-CFG-001).
 * - **참가자**(teamId/primaryPlayerId/secondaryPlayerId)와 **xG**는 선택적 콜백
 *   (`resolveParticipants`/`estimateXg`)으로 주입받고, 미제공 시 전부 `null`이다
 *   (`MatchEvent`의 해당 필드가 전부 `T | null`이므로 구조적으로 안전 — C-23와 동일한
 *   nullable 설계 원칙).
 *
 * ## 시드 사용 방식 — 왜 eventIndex를 0이 아니라 1부터 쓰는가
 * `tick.ts`의 `rollStoppageMinutes`는 **경기당 정확히 2회**(전반/후반 각 1회)
 * `deriveEventSeed(matchSeed, boundaryMinute, 0)`을 호출한다 — 이때 두 번째 인자는
 * `MatchTick.tick`(순차 인덱스)이 아니라 **경계 분(45 또는 90)**이다. 전반 정규 구간은
 * 스토피지 이전이라 `tick`과 `minute`이 1:1로 같으므로(1~45), 이 파일이 `MatchTick.tick`
 * 값을 그대로 `deriveEventSeed`의 두 번째 인자로 쓰고 `eventIndex=0`을 쓴다면
 * `tick.tick === 45`인 슬롯에서 `deriveEventSeed(matchSeed, 45, 0)`을 호출하게 되어
 * `tick.ts`의 전반 스토피지 추첨과 **정확히 같은 시드**를 만든다. `derive.ts`가 보장하는
 * "다른 (tick, eventIndex) 조합 = 독립 스트림"은 호출부가 조합을 실제로 다르게 유지할
 * 책임까지 대신 져주지 않으므로, 이 파일은 `eventIndex 0`을 완전히 비워 두고(예약)
 * `occursProbability` 판정에 `1`, 이벤트 타입 선택에 `2`를 써서 위 충돌을 원천적으로
 * 피한다.
 *
 * ## 11일차 stats.ts와의 계약
 * `generateMatchEvents()`의 반환값은 **이미 시간순 정렬되어 있고**(`minute` →
 * `addedTime` → `sequence`), `sequence`는 1부터 빈틈없이 연속 증가한다. 11일차
 * `stats.ts`는 이 배열을 SSOT로 삼아 스탯을 파생시킬 예정이므로 이 계약(정렬됨·연속
 * sequence)을 깨는 변경은 후속 일차에 영향을 준다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴(`@/types`)로만 참조한다(서브경로 금지, 재선언 금지).
 */

import type { MatchEvent, MatchEventType, MatchSeed, PlayerId, TeamId } from '@/types';
import type { MatchTick } from './tick';
import { deriveEventSeed, stateForSeed } from '../rng/derive';
import { normalizeWeights, pickWeightedIndex, rollSucceeds } from '../rng/precision';
import { stableSortBy } from '../rng/sort';

/**
 * FR-MT-002 전 23종의 **런타임 값 카탈로그**다. `@/types`의 `MatchEventType`(유니온
 * 타입)을 다시 선언하는 게 아니다 — 유니온 타입은 런타임에 순회할 수 없어서 값 배열이
 * 별도로 필요할 뿐이며, 타입 자체는 아래에서 계속 `import type`으로만 참조한다
 * (체크리스트 C-6 대상 아님).
 *
 * `Readonly<Record<MatchEventType, true>>`로 먼저 선언해 TS가 **컴파일 타임에**
 * "23종 전부 키로 존재하는가"를 강제하게 한다 — `MatchEventType` 유니온에 멤버가
 * 추가/삭제되면 이 객체 리터럴이 즉시 컴파일 오류를 낸다(과잉/누락 키 모두 오류).
 * `Object.keys()`는 문자열 배열만 돌려주므로 `MatchEventType[]`로 되돌려 캐스팅한다
 * (원본 키가 전부 `MatchEventType` 리터럴이었으므로 안전).
 */
const MATCH_EVENT_TYPE_PRESENCE: Readonly<Record<MatchEventType, true>> = {
  KICKOFF: true,
  SHOT_ON: true,
  SHOT_OFF: true,
  SHOT_BLOCKED: true,
  GOAL: true,
  ASSIST: true,
  OWN_GOAL: true,
  PENALTY_AWARDED: true,
  PENALTY_SCORED: true,
  PENALTY_MISSED: true,
  YELLOW_CARD: true,
  SECOND_YELLOW: true,
  RED_CARD: true,
  FOUL: true,
  OFFSIDE: true,
  CORNER: true,
  SAVE: true,
  INJURY: true,
  SUBSTITUTION: true,
  HALF_TIME: true,
  FULL_TIME: true,
  EXTRA_TIME_START: true,
  PENALTY_SHOOTOUT: true,
};

/** 23종 이벤트 타입 카탈로그. 순서는 가중치 배열(`normalizeWeights`)의 인덱스와 대응한다. */
export const MATCH_EVENT_TYPES: readonly MatchEventType[] = Object.keys(
  MATCH_EVENT_TYPE_PRESENCE,
) as MatchEventType[];

/** FR-MT-002 수용기준 — 이벤트 타입이 정확히 23종이어야 한다. */
export const MATCH_EVENT_TYPE_COUNT = MATCH_EVENT_TYPES.length;

/**
 * 순수 시뮬레이션 함수의 산출물. `MatchEvent`(`@/types`)에서 `id`/`matchId`를 제외한
 * 나머지 전 필드를 그대로 가진다. 두 필드는 영속 계층(DB/adapter — CLAUDE.md
 * "아직 도입되지 않은 것" 목록에 있는 Supabase 클라이언트/DB 타입)이 부여하는 값이라
 * 이 순수 함수 계층에는 아직 존재할 수 없다. `Omit`으로 파생만 하고 다른 필드를
 * 다시 선언하지 않으므로 도메인 타입 재선언(체크리스트 C-6) 대상이 아니다.
 */
export type MatchEventDraft = Omit<MatchEvent, 'id' | 'matchId'>;

/** xG가 값을 가질 수 있는 이벤트 타입("슛 이벤트가 아니면 null", `match.ts` E-16 주석). */
const XG_ELIGIBLE_TYPES: ReadonlySet<MatchEventType> = new Set<MatchEventType>([
  'SHOT_ON',
  'SHOT_OFF',
  'SHOT_BLOCKED',
  'GOAL',
  'PENALTY_SCORED',
  'PENALTY_MISSED',
]);

/** 표시 문구로 흔히 쓰이는 키 이름(대소문자 무관). `detail`에 등장하면 즉시 거부한다. */
const FORBIDDEN_DETAIL_KEYS: ReadonlySet<string> = new Set([
  'label',
  'text',
  'message',
  'description',
  'caption',
  'title',
]);

/**
 * `detail`에 표시 문구(사람이 읽는 문자열 라벨·설명)가 섞여 들어오지 않았는지
 * 검증한다(D-18: "이벤트는 타입 코드만 저장하고 문구는 UI 카탈로그가 담당").
 *
 * 완전한 정적 판별은 불가능하다 — 임의의 문자열이 "코드"인지 "문구"인지는 값만
 * 봐서는 알 수 없다. 그래서 실용적인 두 규칙으로 강제한다:
 * 1. 표시 문구가 관례적으로 담기는 키(`label`/`text`/`message`/`description`/
 *    `caption`/`title`)는 어떤 값이든 금지한다.
 * 2. 문자열 값은 공백을 포함할 수 없다 — 코드값(zone 식별자, enum 리터럴 등)은
 *    보통 공백이 없고, 사람이 읽는 문구는 거의 항상 공백을 포함하므로 저비용으로도
 *    실효성 있는 방어선이 된다.
 *
 * @throws 위 두 규칙 중 하나라도 위반하면 오류.
 */
export function assertNoDisplayText(detail: Readonly<Record<string, unknown>>): void {
  for (const [key, value] of Object.entries(detail)) {
    if (FORBIDDEN_DETAIL_KEYS.has(key.toLowerCase())) {
      throw new Error(`detail: 표시 문구로 의심되는 키 '${key}'는 금지됩니다(D-18).`);
    }
    if (typeof value === 'string' && /\s/.test(value)) {
      throw new Error(
        `detail.${key}: 공백을 포함한 문자열 값은 금지됩니다 — 표시 문구가 아닌 코드값만 허용됩니다(D-18).`,
      );
    }
  }
}

/** 이벤트에 관여한 팀·선수. 미배정 시 전부 `null`(024 라인업 데이터 연결 전 기본값). */
export interface MatchEventParticipants {
  readonly teamId: TeamId | null;
  readonly primaryPlayerId: PlayerId | null;
  readonly secondaryPlayerId: PlayerId | null;
}

/** 참가자·xG 콜백에 전달되는 문맥. */
export interface MatchEventGenerationContext {
  readonly tick: MatchTick;
  readonly type: MatchEventType;
}

const NO_PARTICIPANTS: MatchEventParticipants = {
  teamId: null,
  primaryPlayerId: null,
  secondaryPlayerId: null,
};

/** 오늘 골격에서는 항상 빈 객체 — 타입별 상세 필드는 소비 시점(후속 일차)에 채운다. */
const EMPTY_DETAIL: Readonly<Record<string, unknown>> = {};

export interface GenerateMatchEventsOptions {
  /**
   * 틱마다 "이벤트가 발생하는가"를 판정하는 확률(`[0, 1]`). 실제 값은 이 파일 밖
   * (호출부 테스트 픽스처, 또는 3팀 공통코드/024 계수 체인)이 정한다 — 기본값을 두지
   * 않고 필수 파라미터로 강제해 이 파일에 리터럴 밸런싱 상수가 생기지 않게 한다.
   */
  readonly occursProbability: number;
  /**
   * 발생이 확정된 틱에서 어느 타입이 뽑힐지의 가중치. `MATCH_EVENT_TYPES`의 23종
   * 전부를 key로 가져야 한다(`Record<MatchEventType, number>`가 컴파일 타임에
   * 강제). 합이 1일 필요는 없다 — `normalizeWeights`가 정규화한다.
   */
  readonly weights: Readonly<Record<MatchEventType, number>>;
  /** 참가자 배정. 미제공 시 전부 `null`(024 라인업 데이터 연결 전까지). */
  readonly resolveParticipants?: (ctx: MatchEventGenerationContext) => MatchEventParticipants;
  /** xG 산출. 미제공 시 슛류 이벤트에서도 `null`(026/024가 실제 산식을 연결한다). */
  readonly estimateXg?: (ctx: MatchEventGenerationContext) => number | null;
}

/**
 * `MatchTick[]`(9일차 `tick.ts`)을 순회하며 이벤트를 생성한다.
 *
 * 각 틱마다 (1) `occursProbability`로 "이벤트가 발생하는가"를 판정하고, (2) 발생 시
 * `weights`로 정규화한 가중치에서 타입 1개를 뽑는다. 두 판정 모두 `matchSeed` +
 * `tick.tick` + eventIndex(1, 2)로 파생한 독립 스트림을 쓴다(왜 `eventIndex 0`을
 * 비워두는지는 파일 상단 "시드 사용 방식" 절 참조).
 *
 * 반환 배열은 이미 시간순으로 정렬되어 있다(`sortMatchEventsChronologically` 적용).
 */
export function generateMatchEvents(
  ticks: readonly MatchTick[],
  matchSeed: MatchSeed,
  options: GenerateMatchEventsOptions,
): readonly MatchEventDraft[] {
  const { occursProbability, weights, resolveParticipants, estimateXg } = options;
  const normalizedWeights = normalizeWeights(MATCH_EVENT_TYPES.map((type) => weights[type]));

  const drafts: MatchEventDraft[] = [];
  let sequence = 1;

  for (const tick of ticks) {
    // eventIndex 1: "발생하는가" 판정 전용 독립 스트림. (0은 tick.ts와의 충돌 회피를 위해 예약)
    const occursState = stateForSeed(deriveEventSeed(matchSeed, tick.tick, 1));
    const occursRoll = rollSucceeds(occursState, occursProbability);
    if (!occursRoll.value) {
      continue;
    }

    // eventIndex 2: "무엇이 발생하는가" 판정 전용 독립 스트림(occurs 판정과 분리).
    const typeState = stateForSeed(deriveEventSeed(matchSeed, tick.tick, 2));
    const picked = pickWeightedIndex(typeState, normalizedWeights);
    const type = MATCH_EVENT_TYPES[picked.value];

    const context: MatchEventGenerationContext = { tick, type };
    const participants = resolveParticipants ? resolveParticipants(context) : NO_PARTICIPANTS;
    const xg = XG_ELIGIBLE_TYPES.has(type) && estimateXg ? estimateXg(context) : null;
    const detail = EMPTY_DETAIL;
    assertNoDisplayText(detail);

    drafts.push({
      sequence,
      minute: tick.minute,
      addedTime: tick.addedTime,
      type,
      teamId: participants.teamId,
      primaryPlayerId: participants.primaryPlayerId,
      secondaryPlayerId: participants.secondaryPlayerId,
      xg,
      relatedEventSequence: null,
      detail,
    });
    sequence += 1;
  }

  return sortMatchEventsChronologically(drafts);
}

/**
 * `minute` → `addedTime` → `sequence` 명시적 tiebreak(NFR-DT-008)으로 안정 정렬한다.
 * `sequence`가 이미 유일하므로 세 번째 키에서 항상 완전히 갈린다.
 *
 * `generateMatchEvents`는 틱을 이미 시간순으로 순회하므로 이 함수를 적용해도
 * 결과가 사실상 항등이지만, "시간순 정렬"이 별도 산출물로 요구되었으므로(10일차 행)
 * 정렬 기준을 코드로 명시하는 별도 함수로 노출하고 실제로 호출한다(NFR-DT-008 —
 * 정렬 기준이 암묵적으로 우연히 맞는 상태에 기대지 않는다).
 */
export function sortMatchEventsChronologically(
  events: readonly MatchEventDraft[],
): MatchEventDraft[] {
  return stableSortBy(events, [
    { get: (e) => e.minute },
    { get: (e) => e.addedTime },
    { get: (e) => e.sequence },
  ]);
}

/**
 * `PENALTY_SCORED`/`PENALTY_MISSED`가 직전의 미해결 `PENALTY_AWARDED`를 가리키도록
 * `relatedEventSequence`를 채우는 순수 변환(`match.ts` E-16 확정 규약 — I-54,
 * "결과 이벤트가 자신을 있게 한 선언 이벤트를 가리킨다").
 *
 * **적용 정책(언제 `PENALTY_AWARDED` 다음에 `SCORED`/`MISSED`가 와야 하는가)은 이
 * 파일의 책임이 아니다** — 그 흐름을 실제로 결정하는 것은 승부차기·PK 판정 로직
 * (13일차 `penalty.ts`)의 몫이며, 여기서는 "이미 만들어진 이벤트 배열에서 인과를
 * 이어붙이는" 순수 변환만 제공한다(구조 이상의 시뮬레이션 로직을 만들지 않는다 —
 * 10일차는 여전히 "구조 부분"이 범위다).
 */
export function linkPenaltyOutcomes(events: readonly MatchEventDraft[]): MatchEventDraft[] {
  let pendingAwardSequence: number | null = null;

  return events.map((event) => {
    if (event.type === 'PENALTY_AWARDED') {
      pendingAwardSequence = event.sequence;
      return event;
    }
    if (
      (event.type === 'PENALTY_SCORED' || event.type === 'PENALTY_MISSED') &&
      pendingAwardSequence !== null
    ) {
      const linked: MatchEventDraft = { ...event, relatedEventSequence: pendingAwardSequence };
      pendingAwardSequence = null;
      return linked;
    }
    return event;
  });
}

/** `ensureStructuralMarkers`가 보장하는 4개 구조 마커 타입(I-65). */
type StructuralMarkerType = 'KICKOFF' | 'HALF_TIME' | 'FULL_TIME' | 'EXTRA_TIME_START';

interface StructuralMarkerRequirement {
  readonly type: StructuralMarkerType;
  readonly tick: MatchTick;
}

/**
 * 마커 타입별 임시 정렬 우선순위(재정렬 후 `sequence`를 1부터 다시 부여하므로 값 자체는
 * 의미가 없다 — 같은 minute·addedTime을 공유하는 기존 이벤트와의 **상대 순서**만 정한다).
 * `KICKOFF`/`EXTRA_TIME_START`는 그 구간을 "여는" 마커라 같은 슬롯의 다른 이벤트보다
 * 앞에 오고, `HALF_TIME`/`FULL_TIME`은 그 구간을 "닫는" 마커라 뒤에 온다.
 */
const STRUCTURAL_MARKER_TIEBREAK: Readonly<Record<StructuralMarkerType, number>> = {
  KICKOFF: -2,
  EXTRA_TIME_START: -1,
  HALF_TIME: Number.MAX_SAFE_INTEGER - 1,
  FULL_TIME: Number.MAX_SAFE_INTEGER,
};

/**
 * `KICKOFF`/`HALF_TIME`/`FULL_TIME`/`EXTRA_TIME_START` 구조 마커 결정론적 보정 — I-65
 * (`TIER_B_RESIM_DESIGN.md` §5, 31일차 착수 확정).
 *
 * ## 왜 필요한가
 * `generateMatchEvents`는 구조 마커도 사건 이벤트(`SHOT_ON`/`GOAL` 등)와 **동일한 확률
 * 가중치 풀**(`occursProbability` + `weights`)에서 뽑는다 — 낮은 확률로는 해당 틱에서
 * 아무 이벤트도 발생하지 않을 수 있어(occurs 판정 실패), `FINISHED`인 경기인데도 이벤트
 * 로그에 `KICKOFF`/`FULL_TIME`이 아예 없는 상태가 구조적으로 가능하다. 이러면 1팀
 * `fetchListResult`가 "이벤트 0건"을 "잠재 버그 신호"로 안전하게 쓸 수 없다.
 *
 * ## 방식 — 추첨이 아니라 보정(AS-10과 무관)
 * 무작위성이 전혀 없다. `ticks`에서 각 마커가 있어야 할 자리(틱)를 구조적으로 결정하고,
 * `events`의 같은 `minute`·`addedTime`에 그 타입이 이미 있으면 그대로 두고, 없으면
 * 결정론적으로 삽입한다 — "임의 배분"이 아니라 "있어야 할 자리에 없으면 채워 넣는" 구조
 * 보정이라 AS-10 대상이 아니다.
 *
 * ## 마커 위치 결정 규칙
 * - `KICKOFF`: `ticks[0]`(경기 최초 틱).
 * - `HALF_TIME`: 전반(스토피지 포함)의 마지막 틱 — `FIRST_HALF`/`FIRST_HALF_STOPPAGE`
 *   구간의 마지막 원소(스토피지가 0분이면 `FIRST_HALF`의 마지막 틱과 같아진다).
 * - `FULL_TIME`: `ticks`의 마지막 원소(연장 포함 시 연장 후반 마지막 틱, 아니면 후반
 *   스토피지 마지막 틱) — `MatchEventType`(23종, 폐쇄 집합)에 "정규 90분 종료" 전용
 *   타입은 없으므로 연장 여부와 무관하게 항상 마지막 틱 하나에만 부여한다.
 * - `EXTRA_TIME_START`: `ticks`에 `EXTRA_FIRST` 구간이 있을 때만 — 그 구간의 첫 틱.
 *   연장이 없으면 삽입하지 않는다.
 *
 * ## 파이프라인 순서 — `linkPenaltyOutcomes`보다 반드시 먼저 호출
 * 삽입 시 `sequence`를 1부터 다시 연속 부여한다("11일차 stats.ts와의 계약" — sequence
 * 연속 규약 유지). `linkPenaltyOutcomes`는 `relatedEventSequence`에 특정 `sequence` 값을
 * 그대로 저장하므로, 이 함수를 그 **뒤에** 돌리면 이미 만들어진 참조가 옛 sequence를 가리켜
 * 깨진다. 호출 순서는 반드시 `generateMatchEvents` → `ensureStructuralMarkers` →
 * `linkPenaltyOutcomes`.
 *
 * @param events `generateMatchEvents`가 만든(아직 `linkPenaltyOutcomes` 적용 전) 결과.
 * @param ticks 같은 경기의 `buildTickSequence(...).ticks`(9일차 `tick.ts`).
 * @returns 4개 마커가 전부 보장된 배열(항상 새 배열 — 이미 전부 있었어도 얕은 복사본을 반환해
 *   호출부가 참조 동일성에 기대지 않게 한다). `ticks`가 빈 배열이면 마커 위치를 정할 수 없어
 *   `events`의 얕은 복사만 반환한다.
 */
export function ensureStructuralMarkers(
  events: readonly MatchEventDraft[],
  ticks: readonly MatchTick[],
): MatchEventDraft[] {
  if (ticks.length === 0) {
    return [...events];
  }

  const firstTick = ticks[0];
  const lastTick = ticks[ticks.length - 1];

  let halfTimeTick: MatchTick = firstTick;
  for (const tick of ticks) {
    if (tick.phase === 'FIRST_HALF' || tick.phase === 'FIRST_HALF_STOPPAGE') {
      halfTimeTick = tick;
    } else {
      break;
    }
  }

  const extraFirstTick = ticks.find((tick) => tick.phase === 'EXTRA_FIRST') ?? null;

  const required: StructuralMarkerRequirement[] = [
    { type: 'KICKOFF', tick: firstTick },
    { type: 'HALF_TIME', tick: halfTimeTick },
    { type: 'FULL_TIME', tick: lastTick },
  ];
  if (extraFirstTick) {
    required.push({ type: 'EXTRA_TIME_START', tick: extraFirstTick });
  }

  const hasMarker = (requirement: StructuralMarkerRequirement): boolean =>
    events.some(
      (event) =>
        event.type === requirement.type &&
        event.minute === requirement.tick.minute &&
        event.addedTime === requirement.tick.addedTime,
    );

  const missing = required.filter((requirement) => !hasMarker(requirement));
  if (missing.length === 0) {
    return [...events];
  }

  const inserted: MatchEventDraft[] = missing.map((requirement) => ({
    sequence: STRUCTURAL_MARKER_TIEBREAK[requirement.type],
    minute: requirement.tick.minute,
    addedTime: requirement.tick.addedTime,
    type: requirement.type,
    teamId: null,
    primaryPlayerId: null,
    secondaryPlayerId: null,
    xg: null,
    relatedEventSequence: null,
    detail: EMPTY_DETAIL,
  }));

  const merged = sortMatchEventsChronologically([...events, ...inserted]);
  return merged.map((event, index) => ({ ...event, sequence: index + 1 }));
}
