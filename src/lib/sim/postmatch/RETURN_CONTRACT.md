# 엔진 반환 계약 — H-15 "후처리·순위 확정 계약" (39일차 SP-3)

`docs/team-schedule/02-시뮬레이션엔진팀.md` 3.1절 H-15 인계물의 산출 문서. **수신 팀**: 6팀
(크론 Task 033), 3팀(정산 입력 — Task 027/030). **소비 시작**: 40일차. 코드 자체의 판단
근거는 각 파일 헤더 JSDoc이 단일 소스이며, 이 문서는 **소비자가 알아야 할 반환 타입·호출
순서·순수성 보장**만 정리한다.

## 0. 공통 전제 — 이 문서가 다루는 4개 파일

| 파일 | 역할 |
|---|---|
| `postmatch/pipeline.ts` | 경기 1건 종료 후 7종 후처리(스코어확정·순위갱신·스탯누적·컨디션피로·부상판정·카드정지·정산트리거) 오케스트레이션 |
| `standing/aggregate.ts` | 라운드별 순위표 스냅샷 누적·재생 |
| `standing/tiebreak.ts` / `standing/playoff-tiebreak.ts` | 7단계 타이브레이커 + 승강 경계 결정전 Fixture 초안 |
| `stats/recompute.ts` | 이벤트 로그 기반 시즌 스탯 재계산(백필·정합성 감사) |

전부 **순수 함수**다(NFR-DT-001 — `Math.random()`/`Date.now()`/`react`/`@supabase/*` 0건).
같은 입력이면 항상 같은 출력이고, 인자를 변형하지 않으며, 모듈 스코프 가변 상태가 없다 —
**재시도가 이중 반영을 일으키지 않는다**는 것이 코드 구조 자체로 보장된다(각 파일의
`재호출 멱등성` 테스트가 이를 값으로 증명한다, 39일차 보강).

## 1. 6팀 크론(033)이 받는 것 — "라운드/경기 종료마다 호출"

### 1.1 경기 1건 종료 → `runPostMatchPipeline(input): PostMatchPipelineResult`

```ts
interface PostMatchPipelineResult {
  executedStages: readonly PostMatchStageName[]; // 항상 POST_MATCH_STAGE_ORDER와 동일
  scoreConfirmation: ConfirmedMatchScore;         // 배선됨
  standingsUpdate: PostMatchStageNotImplemented;  // 계약만(순위는 §1.2로 별도 호출)
  statAccumulation: ReadonlyMap<PlayerId, PlayerMatchStatTierAFold>; // 배선됨
  conditionFatigue: PostMatchStageNotImplemented; // 계약만
  injuryAssessment: PostMatchStageNotImplemented; // 계약만
  cardSuspension: ReadonlyMap<PlayerId, PlayerDisciplineState>;      // 배선됨
  settlementTrigger: SettlementTriggerPayload;    // 배선됨 — §2 참조
}
```

- **`standingsUpdate`/`conditionFatigue`/`injuryAssessment`는 아직 계약뿐**이다
  (`implemented: false` + `reason`). 하위 산식(컨디션·피로/부상)이 미확정이라 값을 지어내지
  않았다 — `implemented` 필드로 컴파일 타임에 오접근을 막는다. 순위 갱신은 하위 모듈이
  이미 있으므로(§1.2) 크론이 이 파이프라인과 **별도로** `standing/aggregate.ts`를 호출한다.
- 스테이지 하나가 throw하면 **아무것도 반환하지 않는다**(부분 반영 없음, "단일 트랜잭션").
- 재시도 필요 시 `runPostMatchPipelineWithRetry(input, { maxAttempts? })`를 쓴다 — 성공 시
  `{ ok: true, attempts, result }`, 전부 실패 시 던지지 않고
  `{ ok: false, attempts, notification: PostMatchPipelineFailureNotification }`를 반환한다.
  기본 최대 3회.
- **중복 재실행 감지**: `computePostMatchIdempotencyKey(fixture) → string`. **경고**: 이 키는
  `fixtureId`만으로 만들어 "정확히 같은 입력의 우발적 재호출"만 식별한다 — Tier B
  재시뮬레이션(다른 시드/리비전)의 중복 판정에는 쓰면 안 된다(`pipeline.ts` 434행 주석 참조,
  별도 식별자 필요 — 아직 스키마에 없음, 이슈 후보).

### 1.2 라운드 종료 → 순위표 스냅샷 갱신

**평상시(라운드 1개 갱신)**: `advanceStandingRound(input): readonly Standing[]`

```ts
interface AdvanceStandingRoundInput {
  seasonSeed: number;                 // deriveSeasonSeed() 결과 그대로
  seasonId: SeasonId; leagueId: LeagueId; round: number;
  previousStandings: readonly Standing[];      // 직전 라운드 스냅샷(시즌 첫 라운드는 [])
  newTeamIds?: readonly TeamId[];              // 신규 참가팀만
  roundFixtures: readonly StandingRoundFixtureInput[];      // 이번 라운드 경기만
  allFinishedFixtures: readonly HeadToHeadFixtureInput[];   // 시즌 누적 종료 경기 전체(4단계용)
  matchPoints?: TiebreakMatchPoints;  // 미지정 시 WIN3/DRAW1/LOSS0
}
```

**캐치업/백필(라운드 다수 재생)**: `buildStandingHistory(input): ReadonlyMap<number, readonly Standing[]>`
— 시즌 전체 경기를 라운드 오름차순으로 재생. 크론이 다운타임 후 누락 라운드를 몰아
처리할 때만 쓰고, 평상시는 `advanceStandingRound()`만 호출한다.

- **크론 조회 경로가 p95 ≤ 120ms인 이유(수락 기준)**: 이 함수들은 **쓰기 시점**(라운드 종료
  직후)에만 실행되고, 그 산출물 `Standing[]`를 그대로 저장한다. **읽기 시점**(사용자
  순위표 조회)은 저장된 스냅샷을 `round = 조회 라운드`로 꺼내기만 하면 되므로 매 조회마다
  타이브레이커 재계산이 없다(`aggregate.ts` 헤더 "누적과 타이브레이크의 분리" 참조) — 즉
  120ms 예산은 DB 단건 조회 시간이지 이 엔진의 계산 시간이 아니다. 쓰기 경로 자체의
  실측 비용은 크론이 라운드당 팀 수(≤ 수십)·경기 수(≤ 수십) 규모의 순수 함수 1회 호출이라
  경기 시뮬레이션(16일차 벤치 p95 < 50ms/경기)보다 훨씬 가볍다.
- `previousStandings`/`roundFixtures`에 없는 `teamId`가 섞이면 `RangeError`(오타·데이터
  누락 조기 발견용).

### 1.3 승강 경계 동률 → 결정전 Fixture 초안

`detectBoundaryTiebreaks(input): readonly TiebreakFixtureDraft[]`

- 6단계까지 동률인 팀 쌍이 크론이 넘긴 `boundaries: StandingBoundary[]`(리그별
  `PROMOTION_SLOTS`/`RELEGATION_SLOTS` 공통코드에서 크론이 미리 파생)에 걸치면 `TIEBREAK`
  Fixture 초안 1건씩 반환. **아직 `Fixture`가 아니다** — `id`/`matchSeed`/`snapshotId`/
  `kickoffAt`은 크론이 채워야 비로소 저장 가능한 레코드가 된다(`brand.ts` 단일 발급 지점
  원칙).
- 3팀 이상이 동시에 한 경계에 걸치면(다자 대진 규칙 미정) `RangeError` — 크론이 이슈로
  등재할 신호다. 경계가 아예 안 걸치면 빈 배열.

### 1.4 백필/정합성 감사 → 이벤트 로그 재계산

`recomputePlayerSeasonStatsFromEventLogs(matchEventLogs)` /
`recomputeTeamSeasonStatsFromEventLogs(matchEventLogs)` — 저장된 시즌 누계와 원본 이벤트
로그를 대조 감사하거나, 재시뮬레이션 후 이력을 다시 쌓을 때 쓴다. **Tier A 16필드만**
채운다(출전시간·패스·드리블 등 Tier B 40필드는 범위 밖 — `PlayerSeasonStat`/
`TeamSeasonStat` 전체가 아니다). 평상시 경기 종료마다는 `accumulateMatchStatsIntoSeason()`
(1건 증분)을 쓴다.

## 2. 3팀 정산(027/030)이 받는 것

### 2.1 경기별 정산 트리거 — `PostMatchPipelineResult.settlementTrigger`

```ts
interface SettlementTriggerPayload {
  fixtureId: FixtureId; seasonId: SeasonId; leagueId: LeagueId | null;
  competitionType: CompetitionType; homeTeamId: TeamId; awayTeamId: TeamId;
  finalScore: { homeScore: number; awayScore: number; pkHome: number | null; pkAway: number | null };
  readyForSettlement: true;
}
```

**배당·포인트 계산 자체는 이 엔진의 책임이 아니다** — 이 페이로드는 "정산에 필요한 입력이
준비됐다"는 신호와 최종 스코어만 넘긴다. `pkHome`/`pkAway`는 승부차기 스코어이며 D-19에
따라 `finalScore`의 `homeScore`/`awayScore`에는 이미 **합산되지 않는다**(승패 판정 전용).

### 2.2 시즌 정산(승격/강등/상금) — 최종 `Standing[]`

라운드가 끝나면 §1.2 `advanceStandingRound()`가 만든 마지막 라운드 `Standing[]`(특히
`rank`/`points`/`tiebreakApplied`)을 그대로 쓴다. 3팀이 직접 타이브레이커를 재계산하지
않는다 — 순위는 항상 이 엔진의 산출값이 단일 소스다. 승강 경계 결정전이 걸린 경우
§1.3 `detectBoundaryTiebreaks()`의 결과(결정전 Fixture)가 먼저 소진돼야 최종 순위가
확정된다는 점에 유의(결정전 경기 자체의 결과 반영은 그 Fixture가 `FINISHED`된 후 다시
`advanceStandingRound()`를 호출하는 통상 경로를 그대로 탄다 — 별도 API 없음).

### 2.3 시즌 스탯(성과 기반 정산이 필요하면) — §1.4 재계산 함수

`recomputeTeamSeasonStatsFromEventLogs()`의 `PlayerMatchStatTierAFold`(팀 단위 합산,
Tier A 16필드: `goals`/`assists`/`shots`/... )를 쓴다. **주의**: 이건 `TeamSeasonStat`
(E-22) 전체가 아니라 이벤트 로그로 복원 가능한 합산형 필드만이다 — 재정·순위·스쿼드
평균 등은 이 경로에 없다.

## 3. 멱등성 보장 요약(H-15 재시도 계약)

| 함수 | 재호출 시 |
|---|---|
| `runPostMatchPipeline` / `WithRetry` | 동일 입력 → 동일 결과, 스탯 이중 누적 0 (`computePostMatchIdempotencyKey`로 우발적 재호출만 식별) |
| `advanceStandingRound` | 동일 `previousStandings`+`roundFixtures` → 동일 스냅샷(재시도 안전). **단, 호출자가 실수로 자기 자신의 산출물을 다시 `previousStandings`로 넣고 같은 라운드를 두 번 진행시키면 이중 집계된다 — 이는 이 함수의 결함이 아니라 "직전 라운드"를 정확히 추적해야 하는 호출자 책임이다.** |
| `buildStandingHistory` | 동일 `fixtures` → 동일 라운드별 이력 전체 |
| `detectBoundaryTiebreaks` | 동일 입력 → 동일 Fixture 초안 목록(순서 무관, `teamId` 오름차순 정규화) |
| `recompute*FromEventLogs` | 동일 이벤트 로그 → 동일 시즌 합계, 경기 순서 무관(교환 법칙) |

모든 항목은 `*.test.ts`의 "재호출 멱등성" 테스트로 값 단위 검증됨(39일차 보강,
`standing/tiebreak.test.ts`·`standing/aggregate.test.ts`·`stats/recompute.test.ts`).
