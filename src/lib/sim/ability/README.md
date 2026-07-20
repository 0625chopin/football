# `src/lib/sim/ability/` — 능력치 보정 계수 체인 (Task 024)

Task 024(17~24일차) 산출물 요약 문서. 24일차 team-schedule 행 "계수 체인 통합 검증 +
반환 타입 문서화"의 산출물이다. 코드 자체의 판단 근거는 각 파일 헤더 JSDoc이 단일
소스이며, 이 문서는 **소비자(다른 팀·다른 일차 코드)가 알아야 할 반환 타입과 조립
방법**만 정리한다.

## 1. 9개 계수 함수

전부 **순수 함수**이고, 반환 타입은 예외 없이 `number`(클램프 후 값, 기본 범위
`[0.35, 1.35]` — `ABILITY_MODIFIER_MIN_DEFAULT`/`ABILITY_MODIFIER_MAX_DEFAULT`,
`AbilityModifierClampOptions`로 override 가능). 비유한수 입력이나 `min > max`
override는 `clampAbilityModifier`가 `RangeError`를 던진다.

| # | 함수 | 파일 | 입력 | 공식 / 규칙 | 비고 |
|---|---|---|---|---|---|
| 1 | `conditionModifier` | `modifiers.ts` | `{ condition: number }` (1.0~10.0) | `0.70 + 0.30×(C−1)/9` | C=10 → 1.0 |
| 2 | `fitnessModifier` | `modifiers.ts` | `{ fitness: number }` (0~100) | `0.75 + 0.25×(fitness/100)` | fitness=100 → 1.0 |
| 3 | `injuryModifier` | `modifiers.ts` | `{ severity: InjurySeverity \| null }` | 항상 1.0 | **골격 단계 자리표시자** — 등급별 페널티 미확정(TODO) |
| 4 | `familiarityModifier` | `modifiers.ts` | `{ familiaritySeasons: number }` | `min(1.0 + 0.01×seasons, 1.06)` | seasons=0 → 1.0, 상한 +6% |
| 5 | `homeModifier` | `modifiers.ts` | `{ isHome: boolean }` | 항상 1.0 | **골격 단계 자리표시자** — 홈 이점 공식 미확정(TODO) |
| 6 | `positionModifier` | `position.ts` | `{ assignedPosition, playerPositions }` | GK 교차 예외(0.35) → 보유 5단계표 → 미보유 BFS 거리식 | 보유 CM=P5 등 중립 조건 시 1.0 |
| 7 | `weatherModifier` | `tactics.ts` | `{ weather, position }` | `loadConstants('WEATHER_EFFECT')[weather].ABILITY_MULT`, 없으면 1.0 폴백 | `@/lib/config/loader` 의존 |
| 8 | `managerModifier` | `tactics.ts` | `{ style, opponentStyle }` | `loadConstants('MANAGER_MATCHUP')[style][opponentStyle]`, 없으면 1.0 폴백 | 6×6 상성, 로더 의존 |
| 9 | `combineAbilityModifiers` | `modifiers.ts` | `readonly number[]` (1~8의 실측값) | `product(modifiers)` 후 재클램프 | 배열이 비면 `RangeError` |

`injuryModifier`/`homeModifier`는 20일차까지도 실공식이 없는 **의도된 자리표시자**다 —
빠진 게 아니라 팀 일정표에 배정된 후속 일차가 아직 오지 않았을 뿐이며, 이 문서 갱신
시점(24일차)에도 그대로다. 실공식이 채워지면 이 표만 갱신하면 된다.

## 2. 체인 조립 — "완전한 9개 배선"은 없다

`combineAbilityModifiers`는 숫자 배열만 받으므로, **호출자가 필요한 부분집합만 골라
배열로 넘긴다.** 9개를 전부 항상 같이 쓰는 단일 "마스터 체인 함수"는 이 폴더에 없고
만들지도 않았다 — 소비자마다 필요한 계수의 부분집합이 다르기 때문이다(예: 라인업
선발은 컨디션·피로·포지션만 필요하고 날씨·감독 상성은 필요 없다).

**실제 소비 사례 — `src/lib/sim/lineup/select.ts` `scoreFor()`** (21일차):

```ts
const condition = conditionModifier({ condition: candidate.condition }, options);
const fitness = fitnessModifier({ fitness: candidate.fitness }, options);
const positionScore = positionModifier({ assignedPosition: position, playerPositions: candidate.positions }, options?.position);
return combineAbilityModifiers([condition, fitness, positionScore], options); // 3개만
```

**24일차 통합 검증 사례 — `modifier-chain.test.ts`**: 8개 개별 함수(9번째는 합성 자체)를
전부 중립 입력으로 호출해 `combineAbilityModifiers`가 base(1.0)와 일치하는지 검증한다.
23일차 테스트는 `weatherModifier`/`managerModifier`에 테스트 전용 리터럴 테이블을
주입해 검증했고, **24일차에 추가한 두 번째 `describe` 블록은 `installHardcodedFallback()`
으로 실제 공통코드 로더 경로를 태워** `WEATHER_EFFECT`/`MANAGER_MATCHUP`이 아직 빈
객체(구조 미확정, "억측 금지")인 상태에서도 안전하게 1.0 폴백되어 체인이 깨지지
않음을 함께 고정했다.

**아직 연결되지 않은 지점(그리는 것은 이후 일차/오케스트레이션 계층 몫)**:
- `src/lib/sim/match/**`(023, 승부 시뮬레이션 틱/이벤트)는 이 폴더의 어떤 함수도 아직
  import하지 않는다 — 이벤트 발생 확률·가중치는 여전히 `GenerateMatchEventsOptions`로
  호출자가 주입하는 리터럴/픽스처값이다.
- 유일한 명시적 연결 지점은 `match/penalty.ts`의
  `PenaltyShootoutOptions.resolveScoreProbability` JSDoc — "실제 값(Composure·Finishing·
  Reflexes·OneOnOnes 반영)은 이 파일 밖(024 계수 체인 또는 호출부 테스트 픽스처)이
  정한다"고 024를 지목한다. 이 배선 자체는 아직 코드로 존재하지 않는다.
- `src/lib/sim/discipline/suspension.ts`(22일차)는 이 폴더의 계수를 쓰지 않는다(카드
  누적/정지는 능력치 보정과 무관).

## 3. H-14 인계 — 경기 결과·이벤트 로그 반환 타입 (→ 3팀 배당 프리시뮬 035)

**인계일 24일차, 3팀 필요 시점 27일차.** 이 절은 3팀이 배당 프리시뮬을 만들 때 참조할
반환 타입 계약이다. 아래 타입은 전부 **`@/types` 배럴에 이미 존재**하며(8일차 동결),
024가 새로 만든 타입이 아니다 — 023(경기 엔진)이 채워 넣는 필드를 024 인계 슬롯에서
문서화한다.

### `Fixture` (`src/types/match.ts`) — 경기 결과

| 필드 | 타입 | 3팀이 알아야 할 것 |
|---|---|---|
| `homeScore`/`awayScore` | `number \| null` | 정규시간(+연장 포함) 최종 스코어. `status`가 종료 전이면 `null`. |
| `htHomeScore`/`htAwayScore` | `number \| null` | 전반 종료 스코어(라이브 배당 갱신 타이밍용). |
| `etHomeScore`/`etAwayScore` | `number \| null` | 연장 스코어. **D-19**: 연장전 득점은 `homeScore`/`awayScore`에 포함된다. |
| `pkHome`/`pkAway` | `number \| null` | 승부차기 스코어. **D-19**: PK 득점은 `homeScore`/`awayScore`(선수 통산 득점)에 **미포함** — 별도 필드로만 존재. |
| `matchSeed` | `MatchSeed` | 재현/재계산 시 이 시드로 동일 결과가 나와야 한다(FR-AD-004). |

### `MatchEvent` (`src/types/match.ts`) — 이벤트 로그 (23종, `MatchEventType`)

| 필드 | 타입 | 3팀이 알아야 할 것 |
|---|---|---|
| `sequence` | `number` | 경기 내 1부터 연속 증가. 시간순 정렬 보장(`minute`→`addedTime`→`sequence`). |
| `type` | `MatchEventType` | 23종 유니온. 배당에 직접 영향 주는 타입: `GOAL`/`OWN_GOAL`/`PENALTY_SCORED`(스코어 변화), `RED_CARD`/`SECOND_YELLOW`(퇴장), `PENALTY_AWARDED`(다음 이벤트로 스코어 변동 가능성). |
| `teamId` | `TeamId \| null` | **`OWN_GOAL`은 예외** — 자책골을 넣은 선수 소속팀이 아니라 **득점이 귀속되는 수혜팀**이다(I-53). 스코어 집계 방향과 동일하게 취급하면 된다. |
| `xg` | `number \| null` | 기대 득점 — **정규 숫자 필드로 승격**(jsonb `detail` 파싱 불필요). 슛 이벤트가 아니면 `null`. 배당 모델이 슛 품질을 쓸 때 이 필드만 읽으면 된다. |
| `relatedEventSequence` | `number \| null` | 같은 경기 내 다른 이벤트의 `sequence` 참조(중계 표시 전용, 스탯 재계산 입력 아님). `ASSIST→GOAL`, `PENALTY_SCORED/MISSED→PENALTY_AWARDED` 등. **통계·스코어 파생에는 이 필드가 필요 없다** — 각 이벤트 자신의 `type`/`teamId`/`primaryPlayerId`만으로 이미 SSOT. |
| `detail` | `Readonly<Record<string, unknown>>` | `xg`를 제외한 나머지(슛 위치, 부상 등급, 카드 사유 등). **구체 스키마는 소비 시점(3팀) 확정** — 아직 고정 shape가 아니므로 특정 키 존재를 가정하지 말 것. |

### 배당 팀이 직접 쓰지 않아도 되는 것

- `PenaltyShootoutResult`(`src/lib/sim/match/penalty.ts`) — **`@/types` 소속이 아닌
  엔진 내부 헬퍼 반환 타입**이다. 승부차기 최종 결과는 이미 `Fixture.pkHome`/`pkAway`로
  귀속되므로, 3팀은 이 타입을 직접 import할 필요가 없다(감사·표시용 `kicks` 로그만
  이 타입에 남는다).
- `MatchEventDraft`(`src/lib/sim/match/events.ts`) = `Omit<MatchEvent, 'id' | 'matchId'>`
  — 영속화 이전 중간 표현이다. 3팀이 소비하는 것은 영속화 이후의 `MatchEvent`(id·matchId
  채워짐)이므로 이 타입도 직접 참조할 필요가 없다.

### 재현성 계약

`Fixture.matchSeed` + 023의 결정론 규약(NFR-DT-001~003)에 따라, 동일 시드로 재생성하면
`Fixture`/`MatchEvent[]` 전부 바이트 단위로 동일하다(15일차 100경기 스냅샷 diff 0
검증 완료). 배당 프리시뮬이 별도 시드 네임스페이스(NFR-DT-006, `rng/derive.ts`)를 쓰는
한 본경기 재현성과 충돌하지 않는다.
