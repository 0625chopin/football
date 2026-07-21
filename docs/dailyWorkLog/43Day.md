# 43일차 (2026-09-17 목)

**참여 팀**: 2팀(시뮬레이션엔진) · 4팀(UI기반i18n) · 5팀(화면배팅UX) · 6팀(DB인프라)
**예외 소환**: 1팀(코어품질) — 정규 배정 없음, 팀 간 값 불일치 해소 + 이슈 판정·등재
**미참여**: 3팀(데이터밸런싱배당)

**최종 게이트**: `npm run typecheck` ✅ / `npm run lint` ✅ / `npm run test` ✅ **1583 passed** (116 files, Type Errors 0)

---

## 1. 팀별 작업

### 2팀 — Task 027 · 홈 결정 규칙 + 중립지 홈 어드밴티지 미적용

41일차에 `cup.ts` 지역 함수로 있던 `homeAwayOf`를 `seeding.ts`로 이관해 **중복을 제거**하고, 중립지(결승) 규칙을 값으로 못박았다.

- `src/lib/sim/knockout/seeding.ts` — `decideCupHomeAway()`(하위 티어 홈 / 동일 티어는 낮은 순위) + `NEUTRAL_HOME_ADVANTAGE_COEFFICIENT = 1.0` + `assertNeutralHomeAdvantage()` 신설
- `src/lib/sim/knockout/cup.ts` — 로컬 `homeAwayOf` 삭제 → `decideCupHomeAway` import (동작 불변)
- `src/lib/sim/knockout/seeding.test.ts` — 신규 6건
- `src/lib/sim/standing/playoff-tiebreak.ts` — I-219 후속, stale 주석 갱신(당일 해소)

**중요**: 오늘 보증한 것은 **"결승 = 1.0" 불변식**이다. 비중립 경기의 홈 계수 **공식**은 여전히 `ability/modifiers.ts`의 `homeModifier` TODO 골격(항상 1.0, 미확정)이며 손대지 않았다. 이 2층 구조(불변식 vs 공식)가 오늘 I-219의 본체다.

### 4팀 — Task 019 · 4상태 + 페이지네이션 규약 통일 + `/sample`

4개 화면(stats/transfers/awards/archive) 4상태는 **기존 완비 확인**. 신규 작업은 "더 보기" 규약 신설·통일이다.

- `src/components/ui/LoadMoreLink.tsx`(신규) — `LoadMoreLink` / `buildLoadMoreHref` / `parseLoadMoreLimit`
- 규약: **`?limit=` 증가 방식 GET 링크** (무한 스크롤·오프셋 아님). 근거는 DataSource가 `limit`만 지원 + SSR 전용 패턴 유지
- stats/transfers/awards 3화면 적용. **archive는 대상 리스트가 이미 유계라 스코프 밖**(코드 주석으로 근거 명시)
- `src/i18n/messages/{ko,en}/common.ts`에 `common.pagination.loadMore`, `sample.ts` 카피 추가
- 팀장 피드백 후속: `MatchScoreboard` `/sample` 등록(LIVE/FINISHED 2슬롯) + `component-registry.ts`·`StateToggleSlot.tsx`·카운트 테스트 갱신(9→10)

### 5팀 — Task 017 · 스코어보드(D1) + 이벤트 타임라인(D3)

`/[lang]/matches/[matchId]/page.tsx` 실렌더. 자리표시자였던 화면이 실제 마크업을 얻었다.

- `src/components/composite/MatchScoreboard.tsx`(신규) + `match-scoreboard.ts`(순수 로직: `foldMatchScore` / `deriveMatchPhase` / `compareEventChronologically`) + 테스트 13건
- D1: 리그·라운드·중립지, LIVE 배지 + 페이즈(전반/하프타임/후반/연장/승부차기) + 경과분·추가시간, PSO 분리 표기(R-13)
- D3: 시간역순 타임라인, ASSIST→GOAL 병합(E-2), R-11 경계 문구
- `src/i18n/messages/{ko,en}/match.ts` — `score.*`, `timeline.futureBoundary`

**실렌더 중 버그 1건 자체 발견·수정**: Mock에 FINISHED 경기의 이벤트 로그가 없어 E-1 이벤트 폴딩이 항상 0-0을 반환. FINISHED만 `Fixture.homeScore`/`awayScore` 직접 사용으로 우회(LIVE는 계속 폴딩). → I-212 append, 팀장 승인.

### 6팀 — Task 033 · 1회 실행 처리 상한 30경기 + 이월

- `supabase/migrations/20260721203626_tick_run_batch_cap.sql`(신규) — I-09 데이터 갱신(50→30) + `tick_run()` 재정의
- `supabase/seed/common-code.sql` — `CATCHUP_MAX_PER_RUN` 시드 50→30

설계 요지 두 가지. **① 별도 이월 큐를 두지 않는다** — 상한 초과분은 `SCHEDULED`로 남기면 다음 틱이 자연히 집어간다. **② PostgreSQL UPDATE는 LIMIT을 지원하지 않으므로** 대상 id를 `SELECT ... ORDER BY kickoff_at, id LIMIT v_cap FOR UPDATE`로 먼저 확정(킥오프 이른 순 = 결정론적)한 뒤 그 집합에만 UPDATE. 초과 발생 시 `cron_run.status='PARTIAL'`(41일차 스키마에 있었으나 미사용이던 값)로 남겨 이월을 관측 가능하게 했다.

실측: SCHEDULED 35건 → 1회차 `processed=30, remaining=5, PARTIAL` → 2회차 `processed=5, remaining=0, SUCCESS` → 3회차 `processed=0, SUCCESS`(42일차 멱등성 미손상). 테스트 fixture는 검증 후 전량 삭제, 41~42일차 cron_run 이력 18건 보존 확인. **크론 미점등(I-214) 준수.**

### 1팀 (예외 소환)

- `src/lib/config/fallback.ts`·`catalog.ts` — `CATCHUP_MAX_PER_RUN` 50 → 30 (`schema.ts` 범위 `{min:0,max:null}`는 30도 유효, 수정 불필요)
- I-219 판정(seeding.ts 헤더가 최신, playoff-tiebreak 주석이 stale) + I-220 · I-221 신규 등재, I-212 · I-192 append

---

## 2. 팀장 검증

전원 완료 후 단독 검증. 게이트 3종 외에 팀 간 연동을 직접 대조했다.

| 항목 | 결과 |
|---|---|
| 1팀↔6팀 `CATCHUP_MAX_PER_RUN` | 코드 폴백·카탈로그·DB 시드 **전부 30 일치**(잔존 `50`은 변경 이력 주석뿐) |
| 2팀 중립지 계수 | `assertNeutralHomeAdvantage()`가 값으로 증명, `cup.ts` 중복 제거 확인 |
| `src/lib/sim/**` 금지 API | `Math.random()`/`Date.now()` 실사용 **0건**(적출은 전부 주석) |
| 브레이크포인트 | 신규 파일에 `sm:`/`xs:` 레이아웃 전환 **0건** (I-184 준수) |
| i18n ko/en 키 대칭 | `match.ts`·`common.ts` **대칭 OK** |
| 신규 컴포넌트 하드코딩 한글 | **0건**(전부 주석) |
| composite 14종 `/sample` 커버 | 조치 후 **11/14** — 잔여 3종은 기존 부채(I-221) |
| 소유 경로 침범 | **없음** — 1팀 config / 2팀 sim / 4팀 ui·i18n·sample / 5팀 composite·matches / 6팀 supabase |

**발행한 피드백 3건, 전부 당일 해소**

1. **2팀** → I-219 stale 주석 갱신 ✅
2. **4팀** → `MatchScoreboard` `/sample` 미등록 보완 ✅
3. **1팀** → 이슈 3건 등재 ✅

5팀이 제기한 `roundLabel` 한국어 하드코딩은 **팀장이 원본에서 직접 재현**했다(`src/lib/mock/progress.ts:809`·`:844`, `fixtures/schedule.ts:434` — `${round}라운드`·`${teamsInRound}강`·`결승`). 재현 과정에서 `src/lib/data/supabase/mapper.ts:591`이 DB `row.round_label`을 **그대로 통과시킨다**는 점을 확인해, mock만 고치는 것이 해법이 아님을 I-220에 명시시켰다.

---

## 3. 이슈

**신규 3건 · append 2건 · 당일 해소 1건**

| 번호 | 상태 | 요지 |
|---|---|---|
| **I-219** | **당일 해소** | `playoff-tiebreak.ts` 44~46행 주석이 "중립지 규칙은 `ability/` 소관"이라 명시하나 43일차 구현은 `knockout/seeding.ts`. 1팀 판정 → 2팀이 불변식/공식 2층으로 갱신 |
| **I-220** | 신규 OPEN — 3팀, **규약 판정 필요** | `roundLabel`이 mock에서 한국어로 구워져 en 로케일에 노출. `mapper.ts`가 DB 값을 pass-through하므로 **실데이터 전환 후에도 잔존**. 「구조화된 값 + i18n 조립」 전환 여부 판정 필요. 비차단 |
| **I-221** | 신규 OPEN — 소유·일차 미정, **규약 판정 필요** | `/sample` 미등록 composite 3종(`RoundNav`·`SeasonSelect`·`TiebreakNote`). 본체는 **신설 컴포넌트 `/sample` 등록 책임을 어느 팀 DoD에 넣을지** |
| **I-212** | append | FINISHED 경기 이벤트 로그 부재 → 폴딩이 0-0 반환. 5팀 우회(FINISHED만 `Fixture` 스코어 직접 사용) + 팀장 승인 + **임시 조치** 명시 |
| **I-192** | append | 5번째 근거 — `CATCHUP_MAX_PER_RUN` 폴백(50) vs DB(30) 분기가 **소비 지점 테스트 부재로 오늘까지 미검출** |

---

## 4. 다음 일차 인계

1. **I-192 규약 판정이 39일차부터 5일 연속 이월 중이며, 오늘 다섯 번째 근거를 받았다.** 오늘 근거는 특히 직접적이다 — 폴백값이 DB와 갈라졌는데 **양쪽 다 각자의 테스트를 통과하고 있었다.** 경계를 넘는 값에 접점 테스트를 의무화하지 않는 한 이 계열은 계속 나온다. **가장 급함.**
2. **오늘의 교훈은 42일차 I-206 교훈의 정확한 재연이다.** `/sample` 등록 누락(I-221)은 **만드는 팀(5팀)과 등록처를 소유한 팀(4팀)이 다르기 때문에** 발생했다. 아무도 규칙을 어기지 않았는데 결과물이 빠졌다. **소유가 갈리는 지점은 DoD에 명시하지 않으면 반드시 샌다** — I-221 판정을 미루면 신설 컴포넌트마다 재발한다.
3. **I-214 크론 점등 금지 유지.** 6팀이 상한·이월·멱등성을 실측으로 증명했으나 해제 조건은 여전히 **2팀 실엔진 연동 + 후처리 배선**이다. 오늘 작업으로 상쇄되지 않는다.
4. **I-218(`/admin` 대시보드) 선행 배정이 계속 밀리고 있다.** 오늘 6팀이 `PARTIAL` 상태로 이월 관측 경로를 열었는데 **볼 곳이 여전히 없다.** I-208 소비처 배선과 함께 5팀 일차 배정이 필요하다.
5. **비중립 홈 계수 공식(`ability/modifiers.ts`의 `homeModifier`)이 아직 TODO 골격**이다. 오늘은 결승 1.0 불변식만 닫혔으므로, Task 027 잔여로 남는다.
6. **Task 017은 D1·D3만 완료**, D2·D4~D7이 44~48일차 잔여. Task 019는 4화면 완결.
7. **인덱스 화면**: `/ko/leagues` 여전히 404, `NAV_GROUPS`의 `pending` 유지가 맞다. **셸 분리(I-186) 미이행**, I-201은 프로덕션 빌드 불가가 계속 병목. **I-188은 오늘도 전 팀 준수**(5개 팀 동시 작업 트리에서 위반 0건) — 다음 지시문에도 계속 포함할 것.

---

## 5. 미해결·판정 대기

- **I-192 규약 판정**(경계를 넘는 값에 접점 테스트 의무화) — 39일차부터 이월, **오늘 5번째 근거. 가장 급함**
- **I-221** 신설 컴포넌트 `/sample` 등록 DoD 귀속 — 소유·일차 미정 / **I-220** `roundLabel` 구조화 여부 — 3팀
- **I-214** 크론 점등 금지 — **차단성 있음** / **I-218** `/admin` 선행 배정 필요 / **I-208** 소비처 배선 팀·일차 배정
- **I-215 · I-217** 1팀 소관(테스트 인프라 / 동결 타입 배치) / **I-216** 표 2열 시각 배치
- **I-212**(mock 라이브 점수 + FINISHED 이벤트 로그 부재) / **I-209** 마이그레이션 백필 / **I-211** 시즌 경로 승격 / **I-204** 4강 대진 / **I-205** en 뉴스 한국어 — 전부 비차단
- **I-200 · I-201 · I-202 · I-203** 프로덕션 빌드 불가가 병목이거나 배정 대기(변동 없음)
- **I-189 · I-190 · I-191 · I-194** 값·규칙·표기 정합(변동 없음) / **I-193 · I-197** 031b 밸런싱 루프(66~68일차)
- **I-195** mock 킥오프 시각 / **I-196** 재실측 **4일 연속 미이행** / **I-198** `/sample` 격리 / **I-199** 사용자 조치 대기
