# H-24 — 월드시간↔실시간 환산 계약 (코드 인계)

> **발신**: 2팀 시뮬레이션엔진팀 / **수신**: 5팀 화면·배팅UX팀
> **확정 일차**: 30일차(2026-08-31)
> **소비 시작**: 35일차 (Task 015 홈·라이브, 34~38일차)
> **근거**: `docs/team-schedule/02-시뮬레이션엔진팀.md` §3.1 H-24 / `src/types/world.ts` E-01 `World` 필드 주석
> **소스**: `src/lib/sim/schedule/worldclock.ts` — 아래는 이 파일을 그대로 요약한 것이며 임의로 값을 바꾸지 않았다. 최신 값은 항상 소스 파일이 우선한다.

## 이 문서의 성격

- `World`(E-01)는 `speedMultiplier`/`isPaused`/`pausedTotalMinutes`/`speedChangedAt`/`worldMinutesAtSpeedChange`/`pausedAt`/`clockRevision` 7개 필드로 월드 시계 상태를 이미 정의해 두고 있다(5일차 I-31 해소). 이 문서는 그 필드들을 **어떻게 조합해 실시간↔월드시간을 환산하는지**의 계약이다 — 필드 자체의 의미는 `world.ts` 소스 주석이 단일 소스다.
- `src/lib/sim/**`는 `react`/`Date.now()` import가 금지된 순수 함수 계층이다(NFR-DT-001). 그래서 이 계약은 **구독 메커니즘(React 훅, Supabase Realtime 구독, polling 등) 자체를 포함하지 않는다** — 5팀이 그 메커니즘 안에서 아래 순수 함수를 호출하는 소비자다.

## 0. 왜 `schedule/speed.ts`와 별개 파일인가

| 파일 | 다루는 것 | 다루지 않는 것 |
|---|---|---|
| `schedule/kickoff.ts` + `schedule/speed.ts` | **이미 계산된 킥오프 시각 맵**(라운드→시각)을 배속 변경/정지-재개에 맞춰 재계산 | 월드 시계 자체의 "지금 몇 월드분인가" |
| `schedule/worldclock.ts` (이 문서의 주제) | **월드 시계 자체**의 현재 월드분 산출, 배속/정지 상태 전이, 구독용 변경 분류 | 리그별 킥오프 스케줄(그건 `kickoff.ts`/`speed.ts` 소관) |

두 파일은 **같은 전이 시각**을 앵커로 공유해야 한다 — 배속을 바꾸거나 정지/재개할 때 `speed.ts`의 `SpeedChangeContext.referenceNow`/`PauseResumeWindow`에 넘기는 시각과, `worldclock.ts`의 `applySpeedChange`/`applyPause`/`applyResume`에 넘기는 `at` 시각이 정확히 같은 순간이어야 두 계산이 서로 어긋나지 않는다(오케스트레이션 계층이 이 한 시각을 양쪽에 동일하게 전달할 책임을 진다). `assertValidSpeedMultiplier`/`MIN_SPEED_MULTIPLIER`/`MAX_SPEED_MULTIPLIER`도 `speed.ts`가 export하는 것을 `worldclock.ts`가 그대로 재사용한다(30일차 변경) — 두 파일이 서로 다른 배속 범위를 갖는 사고를 구조적으로 차단한다.

## 1. 타입 — `WorldClockSnapshot`

```ts
import type { World } from '@/types';

type WorldClockSnapshot = Pick<
  World,
  | 'speedMultiplier'
  | 'isPaused'
  | 'pausedTotalMinutes'
  | 'speedChangedAt'
  | 'worldMinutesAtSpeedChange'
  | 'pausedAt'
  | 'clockRevision'
>;
```

`World`의 부분 타입이라 그대로 `world` 레코드를 넘기면 된다. 필드 추가/변경이 있으면 `tsc`가 이 계약의 어긋남을 즉시 잡는다.

## 2. ① 진행 중 경기 경과분 산출식 (순수 함수, 시계는 호출자 주입)

```ts
function worldMinutesAt(clock: WorldClockSnapshot, now: Timestamp): number;
function matchElapsedMinutesAt(kickoffWorldMinutes: number, clock: WorldClockSnapshot, now: Timestamp): number;
```

- `worldMinutesAt`이 기본식이다: 정지 중이 아니면 `worldMinutesAtSpeedChange + (실시간경과분 × speedMultiplier)`, 정지 중이면 `now`와 무관하게 `worldMinutesAtSpeedChange`(정지 순간 동결값)를 그대로 반환한다.
- **`Date.now()`를 이 함수에 절대 넘기지 마라.** `now`는 5팀이 자기 레이어(클라이언트 시계 또는 서버 요청 시각)에서 얻어 명시적으로 주입한다 — 그래야 SSR/클라이언트 시계 오차, 테스트 재현성 문제를 피한다.
- 진행 중 경기의 경과분이 필요하면, **킥오프 순간에 `worldMinutesAt`을 한 번 호출해 `kickoffWorldMinutes`를 캡처해 저장**해 두고(경기 레코드에 필드로 들고 있거나 캐시), 이후 매 질의마다 `matchElapsedMinutesAt(kickoffWorldMinutes, 현재clock, now)`를 호출한다. 경기 도중 배속이 바뀌어도(`clock`이 최신 스냅샷이기만 하면) 정확하다 — 킥오프 이후 배속이 바뀐 시나리오는 `worldclock.test.ts`의 "경기 도중 배속이 바뀌어도 킥오프 시점 앵커를 기준으로 누적 경과분을 올바르게 구한다" 테스트로 검증돼 있다.

## 3. ③ 정지 구간 오프셋 규약

```ts
function applySpeedChange(clock: WorldClockSnapshot, at: Timestamp, newSpeedMultiplier: number): WorldClockSnapshot;
function applyPause(clock: WorldClockSnapshot, at: Timestamp): WorldClockSnapshot;
function applyResume(clock: WorldClockSnapshot, at: Timestamp): WorldClockSnapshot;
```

- 이 세 함수가 **월드 시계 상태 전이의 단일 소유 구현**이다 — 5팀이 배속 변경·정지·재개 액션을 처리할 때, 새 `World` 레코드를 손수 조합하지 말고 이 함수들이 반환한 값으로 DB를 갱신할 것(계산 로직 중복·드리프트 방지).
- 정지 시 그 순간의 월드분을 `worldMinutesAtSpeedChange`에 동결한다 — 정지 구간에는 월드 시간이 전혀 흐르지 않는다(도메인 규칙).
- 재개 시 정지 구간의 실시간 길이(`at - pausedAt`)만 `pausedTotalMinutes`에 **가산**하고, 동결돼 있던 월드분은 그대로 이어받는다. **이 `{pausedAt, resumedAt}` 쌍은 `schedule/speed.ts`의 `PauseResumeWindow`와 완전히 같은 두 시각이어야 한다** — 킥오프 스케줄 재계산(`rescheduleLeagueKickoffsForPauseResume`)과 월드 시계 재계산이 다른 정지 구간을 기준으로 삼으면 라운드 킥오프 시각과 월드 시계가 서로 어긋난다. 배속 변경도 마찬가지로 `applySpeedChange`의 `at`을 `speed.ts`의 `SpeedChangeContext.referenceNow`와 같은 시각으로 맞춰 호출할 것.
- 모든 전이 함수는 상태가 실제로 바뀔 때만 `clockRevision`을 1 증가시킨다(예: 이미 정지 중인데 `applyPause`를 다시 호출하면 no-op, 원본을 그대로 반환).

## 4. ② 배속·정지 상태 구독 및 재동기화 신호

```ts
type WorldClockTransition =
  | { type: 'unchanged' }
  | { type: 'speed-changed'; from: number; to: number }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'revision-only' };

function classifyWorldClockTransition(prev: WorldClockSnapshot, next: WorldClockSnapshot): WorldClockTransition;
function shouldResyncWorldClock(prev: WorldClockSnapshot, next: WorldClockSnapshot): boolean;
```

- `clockRevision`이 `World`(E-01)에 이미 "배속·정지 변경 감지용 단조 증가 값"으로 정의돼 있다 — 5팀의 구독 콜백(Realtime 구독이든 polling이든)에서 **이전에 들고 있던 스냅샷과 새로 받은 스냅샷을 이 두 함수에 넘기기만 하면** 재동기화 여부·종류를 판정할 수 있다.
- 최소 계약: "재계산이 필요한가?"만 필요하면 `shouldResyncWorldClock` 한 줄(`clockRevision` 비교)로 충분하다. UI가 전이 종류별로 다른 처리(예: 정지 시 타이머 애니메이션 멈춤, 배속 변경 시 진행 바 기울기 재계산)를 해야 하면 `classifyWorldClockTransition`을 쓴다.
- `revision-only`는 이 함수가 추적하는 필드(정지 상태·배속)는 그대로인데 리비전만 바뀐 경우다(예: 향후 `World`에 이 계약이 모르는 필드가 추가되고 그것만 바뀐 경우) — 안전하게 "변경 없음"으로 취급하지 말고 최소한 재조회는 하라는 신호다.

**5팀 구독 콜백 계약(권장 절차)**:
1. 서버에서 새 `World` 행을 받을 때마다 이전에 들고 있던 스냅샷과 `shouldResyncWorldClock(prev, next)`를 호출한다.
2. `false`면 로컬에서 계속 `worldMinutesAt`으로 시간만 흘려 그리면 된다(추가 재조회 불필요 — 드리프트 없이 순수 계산으로 충분).
3. `true`면 **로컬에서 이어서 추정하지 말고** 새 스냅샷으로 앵커를 전부 교체한 뒤 다시 `worldMinutesAt`을 호출한다 — 배속이 바뀌었는데 이전 배속으로 계속 추정하면 드리프트가 누적된다.
4. `classifyWorldClockTransition`으로 무엇이 바뀌었는지 알면(`speed-changed`/`paused`/`resumed`) 토스트·인디케이터 문구를 구체적으로 띄울 수 있다 — 최소 계약은 3번(재동기화)이고, 이건 UX 개선용 부가 정보다.
5. `revision-only`가 나오면 이 파일이 모르는 다른 `World` 필드가 바뀐 것일 수 있으니, 최소한 재조회는 하되 시계 관련 재계산은 안 해도 무방하다.

## 5. 알려진 공백 / 후속 확인

- 구독 메커니즘 자체(Realtime 채널 구독, polling 간격)는 5팀 소관이며 이 계약 밖이다.
- `worldclock.ts`는 `World` 레코드 전체가 아니라 시계 관련 7필드만 다룬다 — 5팀이 실제 DB 갱신 시 나머지 `World` 필드(`currentPhase` 등)는 별도로 관리해야 한다.
- 시즌·라운드 오케스트레이션 계층에서 `applySpeedChange`/`applyPause`/`applyResume`를 실제로 호출하는 지점(예: 배속 변경 API 핸들러)은 아직 없다 — 이 계약은 순수 함수 3종만 제공하며, 호출 배선은 오케스트레이션 계층(엔진 밖) 소관이다.
- `pausedTotalMinutes`는 "스케줄 오프셋 참고용 누적치"로만 갱신되고, `worldMinutesAt` 계산식 자체에는 쓰이지 않는다(앵커 쌍 `speedChangedAt`/`worldMinutesAtSpeedChange`만으로 이미 충분하다) — 5팀이 UI에 "총 정지 시간"을 표시하고 싶으면 이 필드를 그대로 읽으면 되고, 별도로 재계산할 필요는 없다.
