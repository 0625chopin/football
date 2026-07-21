/**
 * 정규시즌 라운드 직후 컵 슬롯 삽입 — Task 027 (44일차).
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 44일차 행. 근거: FR-LG-015 "정규시즌 병행"
 * (리그1 라운드 6/12/18/24/32/40 직후 컵 슬롯 삽입), 공통코드 `CUP_PARAM.INSERT_ROUNDS`
 * (기본값 `[6,12,18,24,32,40]`)·`PHASE_DURATION_MIN.CUP_SLOT`(기본값 75분).
 *
 * ## 완료 판정 — "슬롯 중 리그 킥오프 0건"
 * `kickoff.ts`가 만든 리그별 킥오프(`LeagueKickoffSchedule.kickoffByRound`)는 컵 슬롯을
 * 전혀 모르는 채로 산출된다(3개 리그가 각자 독립적으로 라운드 간격을 선형 신장/압축해
 * REGULAR 페이즈 끝에 정렬할 뿐). 이 파일은 그 "순진한(naive)" 스케줄 위에, 리그1의
 * 삽입 지점 라운드 킥오프 시각을 **마커**로 삼아 그 이후 모든 킥오프(3개 리그 전부, 리그1
 * 자신 포함)를 지나간 슬롯 개수만큼 뒤로 미는 순수 함수를 제공한다 — 값을 리터럴로 갖지
 * 않고 전부 호출자가 공통코드에서 주입한다(CLAUDE.md, NFR-CFG-001, `berger.ts`/`kickoff.ts`와
 * 동일 규약).
 *
 * ## 왜 이 이동만으로 충돌이 "항상" 0건인가 (증명, 런타임 검증에 의존하지 않음)
 * 마커를 오름차순 `m_1 < m_2 < ... < m_n`(n=슬롯 수)이라 하고, 임의의 원본 킥오프 시각
 * `t`에 대해 `shift(t) = t + duration × |{ m_i : m_i < t }|`로 정의한다. 슬롯 i의 조정된
 * 창은 `[shift(m_i), shift(m_i) + duration)`이다.
 * - `t`가 `m_i` 이하이면(`m_1..m_{i-1}`만 `t` 미만) `shift(t) ≤ shift(m_i)` — 창 시작
 *   이하이므로 창 밖(시작 지점 포함, 컵 라운드 자신의 킥오프 순간).
 * - `t`가 `m_i` 초과이면(`m_1..m_i`가 `t` 미만) `shift(t) > shift(m_i) + duration` — 창
 *   끝을 반드시 넘어선다.
 * 즉 `shift()`를 거친 시각은 그 어떤 슬롯 창의 **내부**에도 결코 들어갈 수 없다 — 마커가
 * 리그1에서 나왔든, 그 마커로 다른 리그(2·3)의 킥오프를 이동시키든 동일하게 성립한다(모든
 * 리그가 같은 실시간 축을 공유하므로). `findCupSlotConflicts`는 이 불변식을 테스트에서
 * 값으로 재확인하는 용도일 뿐, 통과를 위해 별도 보정 로직을 두지 않는다.
 *
 * ## 세 계층의 경계 — 컵 관련 3파일이 각자 무엇을 맡는지
 * - **브래킷 생성**(대진표 자체, 시드·홈어웨이·라운드 진행)은 `knockout/cup.ts` 소관.
 * - **이산 페이즈 전이**(`REGULAR`→`CUP_SLOT`→`REGULAR`, 언제 슬롯에 진입/이탈하는가)는
 *   `season/phase.ts`의 `ENTER_CUP_SLOT`/`EXIT_CUP_SLOT` 이벤트 소관.
 * - **슬롯의 실제 시작/끝 시각과 그로 인한 리그 킥오프 이동**(연속값 계산)은 이 파일 소관.
 * 이 파일은 "컵 대진 자체를 시즌 진행에 배선"하는 일(어느 라운드가 끝나면 어느 컵 라운드를
 * 실제로 트리거하는지)이나 `season/phase.ts`의 이산 전이 발화 자체는 다루지 않는다 — 순수하게
 * **킥오프 시각 계산 계층**(`kickoff.ts`/`speed.ts`와 같은 층)에서 "컵 슬롯 창이 어디에
 * 있고, 그 창을 반영하면 리그 스케줄이 어떻게 밀리는지"만 값으로 계산한다. 이 창의 시작/끝
 * 시각이 `season/phase.ts`의 `ENTER_CUP_SLOT`/`EXIT_CUP_SLOT` 발화 시점과 실제로 맞물리는
 * 접점은 아직 배선되지 않았다 — 팀장 인계 대상(44일차 스코프 밖, 임의로 배선하지 않음).
 *
 * ## 슬롯 ↔ 컵 스테이지 1:1 대응
 * 삽입 지점이 6개, 컵 스테이지(`knockout/cup.ts`의 `CupStage`)도 6개(1라운드~결승)로
 * 개수가 일치한다 — 각 슬롯이 정확히 컵 한 라운드를 담는 자리라는 설계 의도로 읽어
 * `CUP_STAGE_SLOT_ORDER` 기본값을 두되, 필요하면 호출자가 다른 순서/개수를 주입할 수
 * 있게 매개변수로 남긴다(길이가 다르면 즉시 예외).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 타입은 `@/types`
 * 배럴로만 import.
 */

import type { LeagueId, Timestamp } from '@/types';
import type { CupStage } from '../knockout/cup';
import type { LeagueKickoffSchedule } from './kickoff';

/** 컵 스테이지 6종의 고정 순서 — 삽입 지점(오름차순 라운드 번호)과 위치별로 1:1 대응한다. */
export const CUP_STAGE_SLOT_ORDER: readonly CupStage[] = [
  'ROUND_1',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTERFINAL',
  'SEMIFINAL',
  'FINAL',
];

/** 컵 슬롯 1회분 — 조정된(삽입 반영) 실시간 축 기준 시작/끝. */
export interface CupSlotWindow {
  /** 1부터 시작하는 슬롯 순번(삽입 지점 오름차순). */
  readonly slotIndex: number;
  /** 이 슬롯이 뒤따르는 기준 리그의 원본 라운드 번호(예: 리그1의 6/12/18/24/32/40). */
  readonly afterRound: number;
  readonly stage: CupStage;
  readonly startAt: Timestamp;
  readonly endAt: Timestamp;
}

function toEpochMs(timestamp: Timestamp, label: string): number {
  const ms = new Date(timestamp).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`${label}가 유효한 ISO 타임스탬프가 아닙니다 (받은 값: "${timestamp}").`);
  }
  return ms;
}

function addMinutes(anchor: Timestamp, minutes: number): Timestamp {
  const anchorMs = toEpochMs(anchor, 'addMinutes(anchor)');
  return new Date(anchorMs + Math.round(minutes) * 60_000).toISOString();
}

function assertPositiveDuration(cupSlotDurationMin: number): void {
  if (!(cupSlotDurationMin > 0)) {
    throw new Error(
      `cupSlotDurationMin은 0보다 커야 합니다 (받은 값: ${cupSlotDurationMin}).`,
    );
  }
}

/**
 * 원본 시각 `t`를 마커(오름차순, `computeCupSlotWindows`가 산출한 것과 같은 정렬) 기준으로
 * 밀어낸다 — `t` 이전(strict)에 위치한 마커 개수만큼 `cupSlotDurationMin`을 더한다(파일
 * 헤더 증명 참조). 리그1이 아닌 다른 리그의 킥오프도 같은 마커로 이 함수를 호출하면 동일한
 * 불변식이 성립한다.
 */
export function shiftTimestampForCupSlots(
  t: Timestamp,
  slotMarkers: readonly Timestamp[],
  cupSlotDurationMin: number,
): Timestamp {
  assertPositiveDuration(cupSlotDurationMin);
  const tMs = toEpochMs(t, 't');
  const passedCount = slotMarkers.filter((m) => toEpochMs(m, 'slotMarkers[]') < tMs).length;
  return passedCount === 0 ? t : addMinutes(t, passedCount * cupSlotDurationMin);
}

/**
 * `kickoffByRound` 하나(리그 한 개분)의 모든 라운드에 `shiftTimestampForCupSlots`를
 * 적용한다(`speed.ts`의 `rescaleKickoffsForSpeedChange`와 동일한 map-level 계층 구조).
 */
export function insertCupSlotsIntoKickoffs(
  kickoffByRound: ReadonlyMap<number, Timestamp>,
  slotMarkers: readonly Timestamp[],
  cupSlotDurationMin: number,
): ReadonlyMap<number, Timestamp> {
  const shifted = new Map<number, Timestamp>();
  for (const [round, kickoffAt] of kickoffByRound) {
    shifted.set(round, shiftTimestampForCupSlots(kickoffAt, slotMarkers, cupSlotDurationMin));
  }
  return shifted;
}

/**
 * 여러 리그의 킥오프 스케줄 전체에 같은 `slotMarkers`/`cupSlotDurationMin`을 일괄 적용한다.
 * 모든 리그가 **동일한 마커 집합**을 공유해야 파일 헤더의 불변식이 성립하므로
 * (`speed.ts`의 AS-16 "동일한 하나의 context" 규약과 같은 이유), 리그별로 다른 마커를
 * 넘기지 않는다.
 */
export function insertCupSlotsIntoLeagueKickoffs(
  schedules: readonly LeagueKickoffSchedule[],
  slotMarkers: readonly Timestamp[],
  cupSlotDurationMin: number,
): readonly LeagueKickoffSchedule[] {
  return schedules.map((schedule) => ({
    ...schedule,
    kickoffByRound: insertCupSlotsIntoKickoffs(schedule.kickoffByRound, slotMarkers, cupSlotDurationMin),
  }));
}

/**
 * 기준 리그(보통 리그1)의 원본(삽입 반영 전) `kickoffByRound`에서 `insertAfterRounds`에
 * 해당하는 킥오프 시각만 뽑아 **오름차순 정렬된 마커**로 반환한다. `insertAfterRounds`는
 * 공통코드 원문 그대로 순서를 보장하지 않으므로(`CUP_PARAM.INSERT_ROUNDS` 스키마 주석
 * "오름차순이 아니라 라운드 번호 배열이라는 것만 강제") 이 함수가 정렬을 책임진다.
 */
export function deriveCupSlotMarkers(
  referenceKickoffByRound: ReadonlyMap<number, Timestamp>,
  insertAfterRounds: readonly number[],
): readonly Timestamp[] {
  if (insertAfterRounds.length === 0) {
    throw new Error('deriveCupSlotMarkers: insertAfterRounds는 최소 1개 이상이어야 합니다.');
  }
  if (new Set(insertAfterRounds).size !== insertAfterRounds.length) {
    throw new Error('deriveCupSlotMarkers: insertAfterRounds에 중복된 라운드 번호가 있습니다.');
  }

  const sortedRounds = [...insertAfterRounds].sort((a, b) => a - b);
  return sortedRounds.map((round) => {
    const kickoffAt = referenceKickoffByRound.get(round);
    if (kickoffAt === undefined) {
      throw new Error(
        `deriveCupSlotMarkers: ${round}라운드에 대한 킥오프 시각이 referenceKickoffByRound에 없습니다.`,
      );
    }
    return kickoffAt;
  });
}

/**
 * `insertAfterRounds`(기준 리그의 삽입 지점 라운드 번호)와 `stages`(같은 위치의 컵
 * 스테이지, 기본값 `CUP_STAGE_SLOT_ORDER`)를 짝지어 조정된(삽입 반영) 실시간 축 기준
 * `CupSlotWindow` 배열을 만든다. 두 배열 길이가 다르면 즉시 예외를 던진다 — 어느 슬롯이
 * 어느 스테이지인지 암묵적으로 추측하지 않는다.
 */
export function computeCupSlotWindows(
  referenceKickoffByRound: ReadonlyMap<number, Timestamp>,
  insertAfterRounds: readonly number[],
  cupSlotDurationMin: number,
  stages: readonly CupStage[] = CUP_STAGE_SLOT_ORDER,
): readonly CupSlotWindow[] {
  if (insertAfterRounds.length !== stages.length) {
    throw new RangeError(
      `computeCupSlotWindows: insertAfterRounds(${insertAfterRounds.length}개)와 stages` +
        `(${stages.length}개)의 개수가 일치해야 합니다.`,
    );
  }
  assertPositiveDuration(cupSlotDurationMin);

  const stageByRound = new Map(insertAfterRounds.map((round, i) => [round, stages[i]] as const));
  const markers = deriveCupSlotMarkers(referenceKickoffByRound, insertAfterRounds);
  const sortedRounds = [...insertAfterRounds].sort((a, b) => a - b);

  return sortedRounds.map((round, index) => {
    const startAt = shiftTimestampForCupSlots(markers[index], markers, cupSlotDurationMin);
    return {
      slotIndex: index + 1,
      afterRound: round,
      stage: stageByRound.get(round)!,
      startAt,
      endAt: addMinutes(startAt, cupSlotDurationMin),
    };
  });
}

/** `findCupSlotConflicts` 위반 1건 — 어떤 리그의 어떤 라운드가 어느 슬롯 창 내부에 떨어졌는지. */
export interface CupSlotConflict {
  readonly leagueId: LeagueId;
  readonly round: number;
  readonly kickoffAt: Timestamp;
  readonly slotIndex: number;
}

/**
 * `schedules`(삽입 반영 후 킥오프 스케줄)의 모든 킥오프가 `windows`의 어느 슬롯 창
 * 내부(시작 제외·끝 제외, 즉 여닫힘 없는 완전 개구간)에도 떨어지지 않는지 검사한다.
 * 위반이 없으면 빈 배열이다(`berger.ts`의 `detectVenueStreaks`와 동일한 "값으로만 알린다"
 * 패턴 — 이 파일도 `console.*` 부작용 0건). 파일 헤더의 증명대로 `insertCupSlotsIntoKickoffs`/
 * `insertCupSlotsIntoLeagueKickoffs`로 만든 스케줄과 그 계산에 쓴 마커로 만든 `windows`를
 * 함께 넘기면 항상 빈 배열이어야 한다 — 이 함수는 그 불변식을 테스트에서 값으로 재확인하는
 * 용도다.
 */
export function findCupSlotConflicts(
  windows: readonly CupSlotWindow[],
  schedules: readonly LeagueKickoffSchedule[],
): readonly CupSlotConflict[] {
  const parsedWindows = windows.map((w) => ({
    slotIndex: w.slotIndex,
    startMs: toEpochMs(w.startAt, `windows[${w.slotIndex}].startAt`),
    endMs: toEpochMs(w.endAt, `windows[${w.slotIndex}].endAt`),
  }));

  const conflicts: CupSlotConflict[] = [];
  for (const schedule of schedules) {
    for (const [round, kickoffAt] of schedule.kickoffByRound) {
      const kickoffMs = toEpochMs(kickoffAt, `${String(schedule.leagueId)}.kickoffByRound[${round}]`);
      for (const w of parsedWindows) {
        if (kickoffMs > w.startMs && kickoffMs < w.endMs) {
          conflicts.push({ leagueId: schedule.leagueId, round, kickoffAt, slotIndex: w.slotIndex });
        }
      }
    }
  }
  return conflicts;
}
