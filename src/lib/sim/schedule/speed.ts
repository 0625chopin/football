/**
 * 배속(0.25×~20×) 비례 재계산 및 정지/재개 오프셋 처리 — Task 025 (29일차, AS-16).
 *
 * `kickoff.ts`가 만든 라운드별 킥오프 `Timestamp`(`LeagueKickoffSchedule.kickoffByRound`)는
 * 생성 시점의 배속을 전제로 확정된 실시간 시각이다. 월드는 재생 중 배속을 바꾸거나(0.25배속
 * ~ 20배속, `World.speedMultiplier` — `src/types/world.ts` E-01) 정지/재개할 수 있으므로,
 * 이미 확정된 스케줄의 **아직 지나지 않은** 항목만 다시 계산해야 한다. 이 파일은 그 재계산
 * 두 가지를 순수 함수로 제공한다.
 *
 * ## 두 재계산은 성격이 다르다
 * - **배속 변경 → 비례(곱) 재계산.** 아직 남은 "월드 분(分)" 자체는 배속과 무관하게 그대로다
 *   (콘텐츠 총량은 변하지 않는다) — 다만 그 월드 분을 실시간으로 환산하는 비율이 바뀐다.
 *   `실시간 잔여분 = 월드 분 잔여 / 배속`이므로, 배속이 `oldSpeed → newSpeed`로 바뀌면
 *   실시간 잔여분에 `oldSpeed / newSpeed`를 곱해 다시 늘리거나 압축한다(`rescaleKickoffsForSpeedChange`).
 * - **정지/재개 → 오프셋(덧셈) 재계산.** 정지 구간에는 배속 개념 자체가 적용되지 않는다(월드가
 *   멈춰 있었다) — 정지된 실시간 길이만큼 남은 일정 전체를 뒤로 그대로 밀면 된다
 *   (`rescheduleKickoffsForPauseResume`).
 *
 * 두 함수 모두 "기준 시각 이전(이미 지난) 항목은 그대로 둔다"는 규칙을 지켜, 이미 킥오프한
 * 라운드의 확정 결과에 소급 영향을 주지 않는다.
 *
 * ## AS-16 — 동시 종료 정렬 유지
 * `kickoff.ts`는 여러 리그의 마지막 라운드를 같은 실시간 지점(`anchor + regularPhaseDurationMin`)에
 * 강제 정렬한다(리그 간 "동시 종료"). 이 정렬은 **모든 리그에 완전히 동일한 기준 시각·배속
 * 비율·정지 오프셋을 적용**해야만 재계산 후에도 유지된다 — 리그마다 다른 기준값을 쓰면 상대
 * 간격이 어긋나 동시 종료가 깨진다. `rescaleLeagueKickoffsForSpeedChange`/
 * `rescheduleLeagueKickoffsForPauseResume`는 리그 배열 전체에 **같은 `context`/`window`
 * 하나**를 일괄 적용해 이 불변식을 구조적으로 보장한다.
 *
 * ## 이 파일이 다루지 않는 것
 * 실시간 경과분을 월드 경과분으로 적분하는 일반식(`worldMinutesAtSpeedChange +
 * 실시간경과분 × speedMultiplier`, `src/types/world.ts` E-01 주석)은 월드 시계 자체의
 * 단일 소유 구현(2팀 H-24, 30일차 인계) 소관이다. 이 파일은 이미 계산된 **스케줄(킥오프
 * 시각 맵)**만 입력으로 받아 재계산하는 좁은 유틸이며, 월드 시계 상태를 직접 들고 있거나
 * 그 일반식을 재구현하지 않는다.
 */

import type { LeagueKickoffSchedule } from './kickoff';
import type { Timestamp } from '@/types';

/** `World.speedMultiplier`(E-01)와 동일한 배속 하한/상한. */
const MIN_SPEED_MULTIPLIER = 0.25;
const MAX_SPEED_MULTIPLIER = 20;

function assertValidSpeedMultiplier(value: number, label: string): void {
  if (!(value >= MIN_SPEED_MULTIPLIER && value <= MAX_SPEED_MULTIPLIER)) {
    throw new Error(
      `${label}는 ${MIN_SPEED_MULTIPLIER}~${MAX_SPEED_MULTIPLIER} 사이여야 합니다 (받은 값: ${value}).`,
    );
  }
}

function toEpochMs(timestamp: Timestamp, label: string): number {
  const ms = new Date(timestamp).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`${label}가 유효한 ISO 타임스탬프가 아닙니다 (받은 값: "${timestamp}").`);
  }
  return ms;
}

function fromEpochMs(ms: number): Timestamp {
  return new Date(Math.round(ms)).toISOString();
}

/** 배속 변경 재계산에 필요한 입력. */
export interface SpeedChangeContext {
  /** 배속 변경이 적용되는 실시간 기준 시각. 이 시각 이전(포함) 킥오프는 이미 지난 것으로 보고 그대로 둔다. */
  readonly referenceNow: Timestamp;
  /** 변경 직전까지 적용되던 배속. */
  readonly oldSpeedMultiplier: number;
  /** 변경 후 적용할 배속. */
  readonly newSpeedMultiplier: number;
}

/**
 * 배속 변경을 라운드별 킥오프 스케줄 하나에 비례 반영한다. `referenceNow` 이전(또는 그 순간)
 * 킥오프는 이미 지난 것으로 보아 그대로 두고, 이후 킥오프만 `oldSpeedMultiplier /
 * newSpeedMultiplier` 배율로 잔여 실시간을 다시 늘리거나 압축한다.
 */
export function rescaleKickoffsForSpeedChange(
  kickoffByRound: ReadonlyMap<number, Timestamp>,
  context: SpeedChangeContext,
): ReadonlyMap<number, Timestamp> {
  assertValidSpeedMultiplier(context.oldSpeedMultiplier, 'oldSpeedMultiplier');
  assertValidSpeedMultiplier(context.newSpeedMultiplier, 'newSpeedMultiplier');
  const referenceMs = toEpochMs(context.referenceNow, 'referenceNow');
  const scaleFactor = context.oldSpeedMultiplier / context.newSpeedMultiplier;

  const rescaled = new Map<number, Timestamp>();
  for (const [round, kickoffAt] of kickoffByRound) {
    const kickoffMs = toEpochMs(kickoffAt, `kickoffByRound[${round}]`);
    if (kickoffMs <= referenceMs) {
      rescaled.set(round, kickoffAt);
      continue;
    }
    const remainingRealMs = kickoffMs - referenceMs;
    rescaled.set(round, fromEpochMs(referenceMs + remainingRealMs * scaleFactor));
  }
  return rescaled;
}

/** 정지 → 재개 구간 하나. */
export interface PauseResumeWindow {
  /** 정지가 시작된 실시간 시각. */
  readonly pausedAt: Timestamp;
  /** 재개된 실시간 시각. `pausedAt`보다 앞설 수 없다. */
  readonly resumedAt: Timestamp;
}

/**
 * 정지 구간만큼 라운드별 킥오프 스케줄 하나를 뒤로 민다. `pausedAt` 이전에 이미 지난 킥오프는
 * 그대로 두고, `pausedAt` 이후(정지 시작 시점 포함) 아직 지나지 않았던 킥오프는 전부
 * `resumedAt - pausedAt` 만큼 동일하게 뒤로 이동한다(곱셈이 아닌 오프셋 덧셈 — 정지 구간에는
 * 배속이 적용되지 않는다).
 */
export function rescheduleKickoffsForPauseResume(
  kickoffByRound: ReadonlyMap<number, Timestamp>,
  window: PauseResumeWindow,
): ReadonlyMap<number, Timestamp> {
  const pausedMs = toEpochMs(window.pausedAt, 'pausedAt');
  const resumedMs = toEpochMs(window.resumedAt, 'resumedAt');
  if (resumedMs < pausedMs) {
    throw new Error(
      `rescheduleKickoffsForPauseResume: resumedAt은 pausedAt보다 앞설 수 없습니다 ` +
        `(pausedAt=${window.pausedAt}, resumedAt=${window.resumedAt}).`,
    );
  }
  const offsetMs = resumedMs - pausedMs;
  if (offsetMs === 0) {
    return kickoffByRound;
  }

  const shifted = new Map<number, Timestamp>();
  for (const [round, kickoffAt] of kickoffByRound) {
    const kickoffMs = toEpochMs(kickoffAt, `kickoffByRound[${round}]`);
    shifted.set(round, kickoffMs < pausedMs ? kickoffAt : fromEpochMs(kickoffMs + offsetMs));
  }
  return shifted;
}

/**
 * 배속 변경을 여러 리그의 킥오프 스케줄 전체에 반영한다. 모든 리그에 **동일한 하나의
 * `context`**를 적용하므로(AS-16), 리그 간 이미 성립해 있던 동시 종료 정렬이 재계산 후에도
 * 유지된다.
 */
export function rescaleLeagueKickoffsForSpeedChange(
  schedules: readonly LeagueKickoffSchedule[],
  context: SpeedChangeContext,
): readonly LeagueKickoffSchedule[] {
  return schedules.map((schedule) => ({
    ...schedule,
    kickoffByRound: rescaleKickoffsForSpeedChange(schedule.kickoffByRound, context),
  }));
}

/**
 * 정지 → 재개 구간을 여러 리그의 킥오프 스케줄 전체에 반영한다. 모든 리그에 **동일한 하나의
 * `window`**를 적용하므로(AS-16), 리그 간 이미 성립해 있던 동시 종료 정렬이 재계산 후에도
 * 유지된다.
 */
export function rescheduleLeagueKickoffsForPauseResume(
  schedules: readonly LeagueKickoffSchedule[],
  window: PauseResumeWindow,
): readonly LeagueKickoffSchedule[] {
  return schedules.map((schedule) => ({
    ...schedule,
    kickoffByRound: rescheduleKickoffsForPauseResume(schedule.kickoffByRound, window),
  }));
}
