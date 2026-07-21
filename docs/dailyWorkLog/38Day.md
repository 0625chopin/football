# 38일차 (2026-09-10, 목)

**참여 팀**: 2팀(시뮬레이션엔진) · 3팀(데이터밸런싱배당) · 4팀(UI기반i18n) · 5팀(화면배팅UX)
**미참여**: 1팀 · 6팀 (일정표에 38일차 행 없음 — 6팀은 38~39일차 자체 작업 없음, 37일차 인계 2번 그대로)

**최종 게이트**: `npm run test` 1407 passed / 6 todo (102 files) · `npm run typecheck` 오류 0 · `npm run lint` 오류 0 — **팀 간 회귀 0건**

---

## 1. 팀별 작업

### 2팀 — Task 026 (선수·팀 지표 풀세트 집계 + 이벤트 로그 재계산, FR-ST-005)

- `src/lib/sim/stats/recompute.ts` 신규 — `accumulateMatchStatsIntoSeason`(경기 1건 누적) / `accumulateSeasonStats`(배치 리듀스) / `foldPlayerStatsIntoTeams`(로스터 귀속) / `recomputePlayerSeasonStatsFromEventLogs` · `recomputeTeamSeasonStatsFromEventLogs`(FR-ST-005 본체)
- 기존 `match/stats.ts`의 `accumulatePlayerMatchStats()`와 `standing/aggregate.ts`의 누적↔재계산 분리 패턴을 **재사용**(로직 재구현 없음)
- `recompute.test.ts` 9건 — 수락 기준 "재계산 = 누적"을 동일 입력(3경기 이벤트 로그)으로 두 경로 실행 후 `toEqual` 동치 검증(선수·팀 각각), **경기 순서를 뒤집어도 동일**(교환법칙)까지 단언

### 3팀 — Task 031a (발효 정책 적용 + 스냅샷 예산)

- `src/lib/config/apply.ts` 신규 — 순수 함수 2종
  - `resolveEffectiveCommonCode` — 11일차 `policy.ts` + 9일차 `catalog.ts` 결합. `NEXT_SEASON` 그룹은 `effectiveFromSeason` 미도달 시 무조건 `current` 반환
  - `resolveSnapshotRecording` — 12일차 `snapshot.ts` 해시 dedup 위에 시즌당 ≤20건 / ≤1MB 예산 감사 계층(canonicalize + `TextEncoder` 바이트 실측)
- `apply.test.ts` 14건 포함 `src/lib/config` 62 tests 전건 통과. **NEXT_SEASON 즉시 반영 0건을 시즌 1~9 전 구간 스윕으로 단언**
- 예산 초과 시 throw 대신 `BUDGET_EXCEEDED` 판정 값 반환 — 실제 DB 쓰기 정책은 6팀 소관으로 남김(헤더에 근거 명시). `loader.ts` 미수정(별도 배선)

### 4팀 — Task 014 (커버리지 체크리스트 자동 표기)

- `/sample`에 `CoverageChecklist` 카드 신설. **3개 카운터 전부 레지스트리/카탈로그 실측** — 등록 컴포넌트 22종 / 4상태 16/16(**100%**) / 번역 키 누락 **0**
- domain·composite·state 섹션의 기존 **하드코딩 배지(8/8/6)도 같은 레지스트리로 교체**
- 신규: `component-registry.ts`(+`.test.ts`), `CoverageChecklist.tsx`, `src/i18n/coverage.ts`(+`.test.ts`, ko/en 카탈로그 실제 순회 diff). 수정: `StateToggleSlot.tsx`(`ComponentKey` export, `FOUR_STATE_COMPONENT_KEYS`), `page.tsx`, `i18n/messages/{ko,en}/sample.ts`(키 6개)
- **RSC 경계 함정을 실측으로 발견·해소**: `component-registry.ts`가 `"use client"` 모듈(`StateToggleSlot.tsx`)의 배열 값을 직접 import하자 Server Component에서 빈 값으로 치환돼 "0/16" 회귀 발생(Playwright로 적발). → 런타임 카운트는 client 모듈 import 없이 리터럴 목록으로 분리하고, 실제 디스패치 레지스트리와의 일치를 vitest(Node, RSC 경계 없음)가 **매 실행 교차검증**하도록 재설계
- Playwright: `/ko/sample`·`/en/sample` 콘솔 에러 **0**. 스크린샷 `.playwright-mcp/day38-coverage-checklist-{ko,en}.png`

### 5팀 — Task 015 (모바일 세로 우선 레이아웃 검증)

- Task 015 화면은 34~37일차에 이미 구현 완료 상태 → **코드 신규 작성 없이 검증만 수행**(변경 파일 0)
- **320px 가로 스크롤 0** — 6뷰포트 전부 `scrollWidth === clientWidth`, ko/en 공통 → **통과**
- **LCP** — 전 12케이스 최대 **268ms**(기준 2.5s) → **통과**. SSR `initialCards`가 즉시 라이브 카드를 그려 PS-1(3초 내 파악)도 사실상 즉시 충족
- **폴링·탭 비활성 중단** — 마운트 시 `/api/live/matches` 1회(≈0.6s) → hidden 32초간 추가 0건 → visible 복귀 즉시 1건. `usePollingList`(1팀 H-02) 계약대로 → **통과**
- **CLS** — `ko` 320px만 기준 초과 → **미달**(아래 2절)
- 스냅샷 12장(6뷰포트 × 2로케일) 확보

---

## 2. 팀장 검증

전 팀 완료 후 팀장 단독 검증. **팀원 간 교차 점검 없음.**

1. **전체 게이트** — test 1407 / typecheck 0 / lint 0. 각 팀이 본인 범위만 테스트했으므로 팀 간 회귀 확인이 목적이었고, **회귀 0건**.
2. **규약 위반 스캔** — `src/lib/sim/stats/` 결정론 위반(`Math.random`/`Date.now`) 0건, `@/types` 서브경로 직접 import 0건, I-184 금지 브레이크포인트(`sm:`/`xs:` 레이아웃 전환) 0건. (grep에 걸린 각 1건은 전부 주석 본문)
3. **5팀 CLS 미달 직접 재현**(타 팀 주장은 직접 재현 원칙) — 320×720에서 `/ko` CLS **0.1735**, 시프트 소스가 `LiveMatchGrid` 그리드·`H1`·`MatchCard` 텍스트 노드 동시 이동으로 5팀 보고와 일치. 대조군 `/en`은 **CLS 0 · 시프트 0건 · 가로 스크롤 0** → 로케일 특정 확정.
4. **원인 지점이 4팀 소유**(`[lang]/layout.tsx` 폰트 선언)라 5팀이 수정하지 않고 판단만 회신한 것은 **절차상 옳음**. 팀장이 4팀에 수정 피드백 → 4팀 시도 3건 전부 무효(2절 아래) → 팀장이 SSR 원문 직접 확인 후 **(a) dev 전용 아티팩트로 취급, 프로덕션 검증 이월**로 판정.
5. **4팀 `display:"optional"` 되돌림 지시 및 확인** — 개선폭이 오차 수준(0.1642 vs 0.1735)인데 "첫 방문 시 한글이 폴백 글꼴로 남는" 확실한 대가를 미검증 가설과 맞바꾸게 되므로 원복. 최종 선언이 `weight 3종 + preload:false`, `display` 미지정임을 파일에서 직접 확인.

### CLS 판정 근거 (I-200)

팀장이 SSR HTML을 직접 확인: `/ko` 응답에 **`<style>` 0개 · `@font-face` 0개 · 외부 `<link rel=stylesheet>` 1개**. 즉 dev 서버는 next/font CSS를 인라인하지 않고 첫 페인트 **이후** 합류시키므로, `font-display`로는 통제 불가능한 종류의 시프트다. 프로덕션은 인라인 방식이 달라 재현되지 않을 수 있으나 **`npm run build`가 WSL EPERM으로 실패해(I-62 계열) 이 저장소에서는 검증 자체가 불가능**하다.

무효로 확인된 시도(다시 파지 말 것, 근거는 `layout.tsx` 헤더 주석에 보존):

| 시도 | ko CLS | 결과 |
|---|---|---|
| (기준선) | 0.1735 | — |
| `display: "optional"` | 0.1642 | 오차 수준, 대가만 발생 → 되돌림 |
| `adjustFontFallback: false` | 0.371 | 악화 |
| `weight: ["400"]`(298→100 파일) | 0.166 | 무효 — 원인이 파일 개수가 아님 |

---

## 3. 이슈

- **I-200 신규 등재** — ko 320px CLS 0.1735(기준 0.1 초과), dev 전용 아티팩트 가능성 높으나 이 저장소에서 확정 불가. **Task 015의 `CLS ≤ 0.1`은 통과로 기록하지 않는다**(나머지 수락 기준은 전건 통과).
- 2팀 이슈 후보(팀 폴드 `ownGoals` 귀속 의미 차이) — 파일 헤더 문서화로 충분, 신규 I-번호 불필요로 팀장 동의.
- 3팀 이슈 후보 없음.
- 4팀 이슈 후보(Server Component에서 `"use client"` 모듈의 값 export를 import하면 RSC 경계에서 빈 값) — 최종 코드에 남지 않았고 vitest 교차검증으로 재발이 자동 차단되나, **다른 팀이 같은 패턴(서버 파일이 클라이언트 파일의 상수를 재사용)을 쓸 여지가 있어 아래 인계 3번으로 승계**.
- 5팀 부수 관찰(`UI_PARAM` 폴백 경고 반복) — `polling.ts` 헤더(I-77)에 의도된 안전망으로 문서화됨. 신규 결함 아니나 **정상 폴링 5초가 여전히 미적용**이라는 뜻(37일차 인계 4번 그대로 유효).

---

## 4. 다음 일차 인계

1. **I-200 — 프로덕션 빌드 가능한 환경에서 ko CLS 재실측.** Task 015 수락 기준 중 이 1건만 판정 보류 상태다. 무효 시도 3건은 `layout.tsx` 주석에 기록돼 있으니 반복하지 말 것. 자체 호스팅(`preload:true` 허용)은 **스코프 확장이라 승인 필요**.
2. **Task 033 착수는 026 도착으로 조건 충족** — 2팀 026이 오늘 완료됐다. 6팀은 38~39일차 자체 작업이 없고 40일차 골격 완성 시 I-196 종단 재실측이 함께 걸린다.
3. **RSC 경계 상수 공유 함정** — 서버 파일이 `"use client"` 모듈의 일반 값을 import하면 조용히 빈 값이 된다(4팀 실측). **테스트가 없으면 무증상으로 지나간다**는 점에서 I-192와 같은 계열이다. 같은 패턴을 쓰는 팀은 Node 환경 테스트로 교차검증을 걸 것.
4. **`RATING_WEIGHT` 소비 배선 미배정** — 37일차 인계 1번 그대로. 소비자(정산·크론)가 생기는 시점에 소유 팀 지정 필요.
5. **정상 폴링 5초 미적용** — `UI_PARAM` 미적재로 안전망 30초 동작 중. 6팀의 3팀 시드 적재가 선행 조건(36일차부터 이월).
6. **1팀 — 라이브 API 응답 타입 계약** 확정 시 `api/live/matches/types.ts`의 임시 `LiveMatchesApiResponse` 교체.
7. **인덱스 화면 5종(Task 016~021)** 채울 때 `NAV_GROUPS`의 `pending` 플래그 함께 제거.
8. **셸 컴포넌트 분리**(I-186) 36일차부터 미이행. **I-188**(트리 전역 git 조작 금지)은 소환 지시문에 계속 포함.

---

## 5. 미해결·판정 대기

- **I-192 규약 판정**(공통코드 소비 계약마다 접점 테스트 의무화 여부) — 오늘 4팀이 같은 계열 함정(RSC 경계)을 독립적으로 밟아 **범위를 "공통코드"에서 "팀·경계를 넘는 값 공유 전반"으로 넓혀 판정할 근거가 생겼다. 가장 급함**
- **I-200** ko CLS — 프로덕션 검증 환경 확보 시 재실측
- **I-194** `fairPlayScore` 산식 부재 / **I-189** 다자 경계 동률 대진 규칙 / **I-190** 잠정값·`PLAYOFF_PRIZE` 누락 / **I-191** 36 vs 38그룹 표기
- **I-193 · I-197** 031b 밸런싱 루프(66~68일차) 대상 / **I-195** mock 킥오프 시각 분산 / **I-196** 40일차 재실측 / **I-199** 사용자 조치 대기
- **뉴스 헤드라인이 `/en`에서도 한국어** — mock 생성기(3팀) 데이터 자체가 한국어. 실데이터 전환 시 재검토
