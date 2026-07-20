/**
 * 월드시간↔실시간 환산 계약 — Task 025 (30일차, H-24, 5팀 인계).
 *
 * `speed.ts`가 다루지 않는다고 명시한 일반식(`World`(E-01) 주석의
 * `worldMinutesAtSpeedChange + 실시간경과분 × speedMultiplier`)의 단일 소유 구현이다.
 * `speed.ts`는 "이미 계산된 킥오프 시각 맵"을 배속·정지 변경에 맞춰 다시 계산하는 좁은
 * 유틸이고, 이 파일은 그 반대 방향 — **월드 시계 자체의 현재 월드분(分)을 실시간 질의
 * 시각으로부터 산출**하는 계약이다. 서로 다른 문제라 이 파일이 `speed.ts`를 대체하지
 * 않는다(오히려 배속·정지 전이 시 `speed.ts`가 쓸 `SpeedChangeContext.referenceNow`/
 * `PauseResumeWindow`와 정확히 같은 순간을 이 파일의 `applySpeedChange`/`applyPause`/
 * `applyResume`도 앵커로 삼는다 — 두 파일이 같은 전이 시각 규약을 공유한다).
 *
 * ## 순수 함수 · 시계는 호출자 주입 (NFR-DT-001)
 * 이 파일 어디에도 `Date.now()`를 호출하지 않는다. "지금"이 필요한 모든 함수는 `now:
 * Timestamp` 매개변수로 호출자(오케스트레이션 계층)에게서 받는다 — 그래야 같은 입력에
 * 항상 같은 출력이 나오고(결정론, KPI-3), 테스트가 실제 시계 없이 임의 시각을 주입해
 * 재현할 수 있다.
 *
 * ## ① 진행 중 경기 경과분 산출식
 * `worldMinutesAt(clock, now)`이 월드 시계 자체의 현재 월드분을 구하고,
 * `matchElapsedMinutesAt(kickoffWorldMinutes, clock, now)`이 그 값에서 경기 킥오프
 * 시점의 월드분을 빼 "진행 중 경기가 몇 월드분 진행됐는지"를 구한다. `kickoffWorldMinutes`는
 * 호출자가 **킥오프 순간의 `WorldClockSnapshot`으로 `worldMinutesAt`을 한 번 호출해 미리
 * 캡처해 둔 값**이다 — 경기 진행 중에는 배속이 바뀔 수 있어 킥오프 시점의 앵커(`speedChangedAt`/
 * `worldMinutesAtSpeedChange`)와 현재 시점의 앵커가 달라질 수 있으므로, 매 질의마다 "현재"
 * 스냅샷과 "킥오프 때 고정해 둔 월드분" 두 값을 함께 넘겨야 한다(둘 다 순수 값이라 저장·
 * 재생 가능).
 *
 * ## ③ 정지 구간 오프셋 규약
 * `applyPause`/`applyResume`가 상태 전이를 명시한다: 정지 시점에 그 순간까지의 월드분을
 * `worldMinutesAtSpeedChange`에 동결하고(`isPaused` 동안은 실시간이 전혀 반영되지 않는다),
 * 재개 시점에 그 정지 구간의 실시간 길이(`resumedAt - pausedAt`)를 `pausedTotalMinutes`에
 * **가산만** 한다 — 동결된 월드분 자체는 재개 후에도 그대로 이어받는다(정지 구간에는
 * 월드 시간이 전혀 흐르지 않는다는 도메인 규칙, `World.pausedTotalMinutes` 주석 "누적
 * 정지 시간(분) — 스케줄 오프셋"과 일치). 이 `pausedAt`/재개 시각 쌍은 `speed.ts`의
 * `PauseResumeWindow`와 그대로 맞물려, 킥오프 스케줄 재계산과 월드 시계 재계산이 항상
 * 같은 정지 구간을 기준으로 삼도록 한다.
 *
 * ## ② 배속·정지 상태 구독 및 재동기화 신호
 * 이 파일은 구독 메커니즘(React 훅 등) 자체를 제공하지 않는다 — `react` import가
 * 금지된 순수 함수 계층이기 때문이다(NFR-DT-001, 이 팀 소유 경로 제약). 대신
 * `classifyWorldClockTransition`이 이전/현재 두 스냅샷을 비교해 **무엇이 바뀌었는지**를
 * 순수 값으로 반환하고, `shouldResyncWorldClock`이 "재동기화가 필요한가"를 `clockRevision`
 * 비교 한 줄로 판정한다. 5팀은 이 두 함수를 구독 콜백(예: Supabase Realtime 구독,
 * `setInterval` 폴링) 안에서 호출해 UI 재계산 트리거로 쓰면 된다 — `clockRevision`이
 * `World`(E-01)에 이미 "배속·정지 변경 감지용 단조 증가 값"으로 정의돼 있으므로, 이
 * 파일의 모든 상태 전이 함수(`applySpeedChange`/`applyPause`/`applyResume`)는 예외 없이
 * `clockRevision`을 1 증가시킨다(변경 없음이라 no-op을 반환하는 경우는 증가시키지 않는다 —
 * `applyPause`가 이미 정지 상태에 호출된 경우 등).
 */

import type { Timestamp, World } from '@/types';
import { assertValidSpeedMultiplier } from './speed';

/**
 * 월드 시계 상태 스냅샷. `World`(E-01)의 시계 관련 필드만 뽑은 부분 타입이라, `World`
 * 정의가 바뀌면 `tsc`가 이 파일의 어긋남을 즉시 잡는다(타입을 여기서 다시 선언하지 않음,
 * CLAUDE.md "타입은 `@/types` 단일 소스").
 */
export type WorldClockSnapshot = Pick<
  World,
  | 'speedMultiplier'
  | 'isPaused'
  | 'pausedTotalMinutes'
  | 'speedChangedAt'
  | 'worldMinutesAtSpeedChange'
  | 'pausedAt'
  | 'clockRevision'
>;

function toEpochMs(timestamp: Timestamp, label: string): number {
  const ms = new Date(timestamp).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`${label}가 유효한 ISO 타임스탬프가 아닙니다 (받은 값: "${timestamp}").`);
  }
  return ms;
}

function realMinutesBetween(from: Timestamp, to: Timestamp, label: string): number {
  const fromMs = toEpochMs(from, `${label}.from`);
  const toMs = toEpochMs(to, `${label}.to`);
  if (toMs < fromMs) {
    throw new Error(
      `${label}: 종료 시각이 시작 시각보다 앞설 수 없습니다 (from=${from}, to=${to}).`,
    );
  }
  return (toMs - fromMs) / 60_000;
}

/**
 * 월드 시계의 현재 월드분(分)을 실시간 질의 시각 `now`로부터 산출한다(H-24 ①의 기반식,
 * `World`(E-01) 주석 원식). 정지 중이면 `now`와 무관하게 `worldMinutesAtSpeedChange`가
 * 그대로 현재 월드분이다(정지 시점에 이미 동결됨, `applyPause` 참조) — 정지 중이 아니면
 * `speedChangedAt` 이후 실시간 경과분에 `speedMultiplier`를 곱해 더한다.
 */
export function worldMinutesAt(clock: WorldClockSnapshot, now: Timestamp): number {
  if (clock.isPaused) {
    return clock.worldMinutesAtSpeedChange;
  }
  const elapsedRealMin = realMinutesBetween(clock.speedChangedAt, now, 'worldMinutesAt(now)');
  return clock.worldMinutesAtSpeedChange + elapsedRealMin * clock.speedMultiplier;
}

/**
 * 진행 중 경기의 경과 월드분(H-24 ①). `kickoffWorldMinutes`는 호출자가 킥오프 순간의
 * `WorldClockSnapshot`으로 `worldMinutesAt`을 한 번 호출해 미리 캡처해 둔 값이다(파일
 * 상단 설명 참조). 음수가 나올 수 있는 호출(질의 시각이 킥오프 이전인 경우)은 호출자
 * 오류로 보아 0으로 클램프하지 않고 그대로 반환한다 — 클램프하면 "킥오프 전에 호출했다"는
 * 신호가 조용히 사라진다.
 */
export function matchElapsedMinutesAt(
  kickoffWorldMinutes: number,
  clock: WorldClockSnapshot,
  now: Timestamp,
): number {
  return worldMinutesAt(clock, now) - kickoffWorldMinutes;
}

/**
 * 배속을 `at` 시각에 `newSpeedMultiplier`로 바꾼다. 전이 직전까지의 월드분을
 * `worldMinutesAt`으로 구해 새 앵커(`worldMinutesAtSpeedChange`)로 동결하므로, 전이
 * 전후로 `worldMinutesAt` 값이 끊김 없이 이어진다(연속성 보장 — `speed.test.ts`의
 * "재계산 후에도 라운드가 올라갈수록 킥오프 시각이 항상 증가한다"와 같은 성질을 월드
 * 시계 자체에도 적용한 것).
 */
export function applySpeedChange(
  clock: WorldClockSnapshot,
  at: Timestamp,
  newSpeedMultiplier: number,
): WorldClockSnapshot {
  assertValidSpeedMultiplier(newSpeedMultiplier, 'newSpeedMultiplier');
  const worldMinutesAtTransition = worldMinutesAt(clock, at);
  return {
    ...clock,
    speedMultiplier: newSpeedMultiplier,
    speedChangedAt: at,
    worldMinutesAtSpeedChange: worldMinutesAtTransition,
    clockRevision: clock.clockRevision + 1,
  };
}

/**
 * `at` 시각에 월드를 정지한다(H-24 ③). 이미 정지 중이면(`isPaused`) 상태를 바꿀 것이
 * 없으므로 입력을 그대로 반환한다(`clockRevision` 증가 없음 — `speed.ts`의 "정지 길이가
 * 0이면 원본 맵을 그대로 반환한다"와 같은 무변경-무신호 규약).
 */
export function applyPause(clock: WorldClockSnapshot, at: Timestamp): WorldClockSnapshot {
  if (clock.isPaused) {
    return clock;
  }
  const worldMinutesAtTransition = worldMinutesAt(clock, at);
  return {
    ...clock,
    isPaused: true,
    pausedAt: at,
    speedChangedAt: at,
    worldMinutesAtSpeedChange: worldMinutesAtTransition,
    clockRevision: clock.clockRevision + 1,
  };
}

/**
 * `at` 시각에 월드를 재개한다(H-24 ③). 정지 구간의 실시간 길이(`at - pausedAt`)를
 * `pausedTotalMinutes`에 가산만 하고, 동결돼 있던 `worldMinutesAtSpeedChange`는 그대로
 * 이어받는다(정지 구간에는 월드 시간이 흐르지 않았으므로). `at`이 새 `speedChangedAt`
 * 앵커가 되어, 재개 이후 실시간 경과분부터 다시 `speedMultiplier` 배로 누적된다.
 * `speed.ts`의 `PauseResumeWindow`(`{ pausedAt, resumedAt }`)와 동일한 두 시각을 그대로
 * 재사용해 호출하면, 킥오프 스케줄 재계산과 이 상태 전이가 같은 정지 구간을 기준으로
 * 정렬된다.
 */
export function applyResume(clock: WorldClockSnapshot, at: Timestamp): WorldClockSnapshot {
  if (!clock.isPaused || clock.pausedAt === null) {
    throw new Error('applyResume: 정지 중이 아닌 월드 시계는 재개할 수 없습니다.');
  }
  const pausedDurationMin = realMinutesBetween(clock.pausedAt, at, 'applyResume(pausedAt→at)');
  return {
    ...clock,
    isPaused: false,
    pausedAt: null,
    pausedTotalMinutes: clock.pausedTotalMinutes + pausedDurationMin,
    speedChangedAt: at,
    clockRevision: clock.clockRevision + 1,
  };
}

/** `classifyWorldClockTransition`이 반환하는 판별 유니온(H-24 ②). */
export type WorldClockTransition =
  | { readonly type: 'unchanged' }
  | { readonly type: 'speed-changed'; readonly from: number; readonly to: number }
  | { readonly type: 'paused' }
  | { readonly type: 'resumed' }
  | { readonly type: 'revision-only' };

/**
 * 두 월드 시계 스냅샷을 비교해 무엇이 바뀌었는지 분류한다(H-24 ② 구독·재동기화 신호).
 * `clockRevision`이 같으면 항상 `unchanged`다(단조 증가 값이므로 다른 필드가 우연히
 * 같은 값을 가리키는 경우까지 볼 필요가 없다). 리비전이 다르면 정지 상태 전이 →
 * 배속 변경 순으로 우선 판정하고, 그중 어디에도 해당하지 않으면(리비전만 바뀌고 이
 * 함수가 아는 필드는 그대로인 경우) `revision-only`로 남겨 소비처가 안전하게 무시하지
 * 않고 최소한 재조회는 하도록 한다.
 */
export function classifyWorldClockTransition(
  prev: WorldClockSnapshot,
  next: WorldClockSnapshot,
): WorldClockTransition {
  if (prev.clockRevision === next.clockRevision) {
    return { type: 'unchanged' };
  }
  if (!prev.isPaused && next.isPaused) {
    return { type: 'paused' };
  }
  if (prev.isPaused && !next.isPaused) {
    return { type: 'resumed' };
  }
  if (prev.speedMultiplier !== next.speedMultiplier) {
    return { type: 'speed-changed', from: prev.speedMultiplier, to: next.speedMultiplier };
  }
  return { type: 'revision-only' };
}

/**
 * 재동기화가 필요한지를 `clockRevision` 비교만으로 판정한다(H-24 ②). 5팀 구독 콜백의
 * 최소 계약 — "재계산이 필요한가"라는 참/거짓만 필요할 때는 `classifyWorldClockTransition`
 * 대신 이 함수 하나로 충분하다.
 */
export function shouldResyncWorldClock(prev: WorldClockSnapshot, next: WorldClockSnapshot): boolean {
  return prev.clockRevision !== next.clockRevision;
}
