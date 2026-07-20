# 22일차 (2026-08-19, 수)

## 1. 참여 팀

| 팀 | Task | 결과 |
|---|---|---|
| **1팀 코어·품질** | 044 | 통과 (+ 팀장 지시 재작업 1건 완료) |
| **2팀 시뮬레이션엔진** | 024 | 통과 (결함 0건) |
| **3팀 데이터·밸런싱·배당** | 029 | 통과 (결함 0건) |
| **4팀 UI기반·i18n** | 011 | 통과 — **Task 011 종료 · M-1 Phase 1 완료** |
| **6팀 DB·인프라** | 034a | 통과 — **034a 3/3 종료** |

5팀 화면·배팅UX 미참여(4일 연속 대기, H-06 가드레일 인수 상태 유지).

## 2. 최종 게이트

전 팀 작업 + 재작업 반영 후 팀장이 직접 실행:

- `npx tsc --noEmit` — **0 error**
- `npm run lint` — **0 problems** (D-18 경고 111건 → **0건**)
- `npm run test` — **774 passed / 6 todo / 0 failed**, `Type Errors: no errors`
- dev(webpack, 격리 포트 3461) — **1차 `/ko` 200 · 1차 `/en` 200**, `Critical dependency` / `MODULE_NOT_FOUND` **0건**

## 3. 팀별 산출물

### 1팀 — Task 044 (시크릿 스캔)

- `.github/workflows/secret-scan.yml` 신규 — job1: gitleaks CLI 바이너리 직접 설치 후 `detect --log-opts="--all"`(`fetch-depth: 0`)로 **커밋 히스토리 전체** 스캔. 마켓플레이스 액션 대신 CLI를 쓴 이유는 `gitleaks-action` v2의 `GITLEAKS_LICENSE` 의존 회피(CLI 본체는 MIT). job2: `npm run build` 후 `.next/static`을 grep해 서비스롤 키 유출 검사.
- `eslint.config.mjs` — `no-restricted-imports`로 **프로덕션 코드의 `@/lib/mock/**` import 정적 차단**(21일차 결함 A 재발 방지). 예외는 `src/lib/mock/**` 자신·`src/lib/data/mock/**`·테스트 파일.
- 로컬 gitleaks 35 commits 스캔 **0건**. 팀장 확인: 프로덕션 코드의 `@/lib/mock` import **잔존 0건**, `.env.local` gitignore 적용 확인.

### 2팀 — Task 024 (카드·정지)

- `src/lib/sim/discipline/suspension.ts` / `.test.ts` 신규. 카드 누적 5장 정지·퇴장 정지를 **리그/컵 축으로 완전 분리**(상호 미간섭을 테스트로 고정). 21일차 `select.ts`의 `SuspensionCompetition`, `stats.ts`의 `PlayerMatchStatTierAFold`를 재구현 없이 소비.
- D-23 감독 공석 BALANCED 폴백(`resolveManagerStyle`) 동일 파일 배치 — **팀장 승인**(§4 참조).
- 퇴장 정지 경기 수(1~3)는 CardReason taxonomy가 I-41로 보류 중이라 **값을 추측하지 않고** 호출자 명시(`dismissalSuspensionGames`) + 범위 검증(fail-fast)로 남김. 단독 21 tests 통과.

### 3팀 — Task 029 (급여·성과·스폰서)

- `src/lib/economy/salary.ts` / `.test.ts` 신규. 급여(몸값 × `WAGE_RATIO` 0.18) 차감, 성과 분배(`LEAGUE_FINISH_POINT` 순위 곡선), 스폰서 수입 **zero-sum 2건 기록**(팀 +, 스폰서 −).
- **수락 기준 "급여 이중 차감 0건"은 구조적 보장** — 별도 "지급함" 플래그를 만들지 않고 `postSalaryPayment`가 매 호출 시 원장을 스캔(`reasonCode: 'WAGE'` + `refType: 'Contract'` + `refId` + `seasonId` 일치)해 있으면 `DuplicateSalaryPaymentError`를 던진다. **원장이 유일한 근거**라는 20일차 `ledger.ts` 단일 소스 원칙 승계.
- 20~21일차 `ledger.ts`·`valuation.ts` 관례(순수 함수, DC-08, `@/types` 배럴, `options?.table ?? loadConstants`) 승계 확인. 신규 15건 포함 economy 35 tests 통과.

### 4팀 — Task 011 (i18n) **종료**

- `src/components/ui/LocaleSwitcher.tsx` 신규 — **`src/components/` 디렉터리 첫 파일**(원래 23일차 예정이나 Task 011 산출물이라 앞당김. `domain/`·`state/`·프리미티브 13종은 여전히 23일차 이후). 경로 첫 세그먼트 교체 방식 전환(`router.replace` — 로케일 전환은 설정 토글이라 히스토리 스택에 안 남김) + 쿠키 영속화.
- 루트 레이아웃 **Provider 실배선**(18일차 API 확정 후 이월분) + 헤더 placeholder → 실 컴포넌트 교체.
- **D-18 경고 111건 → 0건** — 헤더·사이드내비·푸터 + 라우트별 `loading`/`error`/`not-found` 60개(20라우트×3) + `global-not-found`. **Task 011 수락 판정의 핵심 조건이 이로써 충족.**
- `enums.ts` → `../index.ts` 합류(구조만, 실값 기입은 3팀 23일차 이후).
- 검증 제약: **Playwright MCP는 Chromium 미설치로 실패** — 클릭 전환·"새로고침 없음" 실측 미수행, curl 기반 SSR 검증으로 대체(§5 I-128).

### 6팀 — 034a 3/3 **종료**

- `SupabaseDataSource`가 **`DataSource` 전 메서드(55개) 구현**, `implements Pick<...>` → `implements DataSource` 전체 전환. 뉴스·브래킷·어드민 잔여 구역 배선(기존 `mapper.ts` 재사용, 신규 매퍼 0건).
- `src/lib/data/supabase/index.ts` 신규 — `registerDataSource('supabase', ...)` 자기등록. `@supabase-js` 미설치라 `client.ts`에 PostgREST fetch 브리지(`createSupabaseRestQueryClient`) 추가, 패키지 설치 후 **1줄 교체**로 전환 가능하게 설계(생성자가 `SupabaseQueryClient` 구조적 타입만 요구).
- 팀장이 **런타임으로 등록 경로 직접 검증** — `NEXT_PUBLIC_DATA_SOURCE=supabase` + `bootstrapDataSource()` 후 `getDataSource()`가 정상 인스턴스 반환 확인(임시 테스트, 커밋 안 함).
- `getMatchPlayerRatings`/`getMatchTeamStats`는 2팀 Tier B 재시뮬 컴포넌트 미도착(H-14, 27일차)으로 빈 배열 유지 — 사유를 JSDoc에 명시. 오늘 결함 아님.

## 4. 팀장 검증에서 발견된 결함

### 결함 A — `bootstrapApp()` 루트 레이아웃 배선이 **9일간 미연결** (해소)

- 11일차 I-72/D-32 판정과 12일차 팀장 승인으로 **"4팀이 13일차에 `await bootstrapApp()` 한 줄 호출"**이 확정돼 있었으나, `grep -rn "bootstrapApp" src` 결과 `bootstrap.ts`·`bootstrap.test.ts` 외 **호출처 0건**. 즉 `installHardcodedFallback()`(공통코드 폴백)과 어댑터 등록이 **둘 다 죽어 있었다.**
- 오늘 4팀이 루트 레이아웃을 대폭 손대는 날이라 팀장이 배선을 지시 → `RootLayout` 최상단에 1줄 추가로 해소. 이 배선이 아래 결함 B·C를 드러냈다.

### 결함 B — I-75 실현: webpack이 변수 경유 동적 import 해석 실패 (해소)

- 11일차 등재 시 "webpack이 두 갈래를 정적 분석으로 포함시킬 가능성이 높다"고 본 낙관이 **틀린 것으로 판명**.
- **팀장 직접 재현**(격리 포트 3457): webpack `⚠ Critical dependency: the request of a dependency is an expression`, 1차 `/ko` **500** + `Error: Cannot find module './mock'`(`src/lib/data/mock/`은 실존).
- 해소(1팀, `bootstrap.ts` 소유): 11일차 등재 대안대로 **리터럴 두 갈래 분기**(`kind === 'supabase' ? import('./supabase') : import('./mock')`)로 전환.

### 결함 C — 부트스트랩 플래그가 실패를 은폐 (해소, 신규 발견)

- **4팀이 재작업 중 문서에 없던 결함을 발견**: `dataSourceBootstrapped`/`appBootstrapped`를 `await`·등록 **이전에 동기 세팅**해, 첫 호출이 던져도 플래그가 `true`로 남는다 → **2번째 요청부터 전부 200으로 조용히 통과**하지만 실제로는 폴백 등록도 어댑터 등록도 프로세스 수명 내내 실행된 적이 없다. 팀장 재현에서도 1차 500 → 2차 200이 그대로 나왔다.
- 결함 B보다 위험하다고 판정 — B를 고쳐도 이 구조가 남으면 **향후 어떤 부트스트랩 실패든 첫 요청 한 번만 깨지고 그 뒤로는 정상처럼 보인다**(I-85의 전제와 직결).
- 해소(1팀): 불리언 플래그 → **in-flight Promise 캐시**(실패 시 캐시 비우고 재시도 가능). 회귀 테스트 9건 신규 — 최초 실패 후 재시도 / 동시 호출 시 등록 1회 / 성공 후 캐시 재사용을 `vi.doMock`으로 결정론적 검증. 기존 `existsSync` 기반 skipIf/runIf(두 어댑터가 다 실존해 죽은 분기)는 제거.
- **팀장 독립 재검증**(격리 포트 3461, 신규 기동): 1차 `/ko` **200**, 1차 `/en` **200**, `Critical dependency`·`MODULE_NOT_FOUND` **0건**.

### 판정 — 2팀 질의 승인

"D-23 감독 폴백을 `discipline/suspension.ts`에 함께 둔 것이 맞는가" → **그대로 유지**. ⓐ 22일차 행이 산출물 경로를 그 파일 하나로 명시 ⓑ `resolveManagerStyle`은 의존성 없는 순수 함수 1개라 이관 비용 ≈ 0 ⓒ 분리 여부는 025/026(감독·전술) 착수 시점에 함께 보는 것이 맞음 → §7에 판정 대기로 등재.

## 5. 신규/갱신 이슈

| 건 | 내용 | 처리 |
|---|---|---|
| **I-75** | **종결** — webpack 실컴파일로 재현·해소 모두 확인. 리터럴 분기 전환, `bootstrap.ts` 헤더에 22일차 근거 갱신 | 해소(1팀) |
| **I-127** | **부트스트랩 플래그가 실패를 은폐하던 구조**(결함 C) — 등록 성공 전에 완료 플래그를 세우면 최초 실패가 영구히 가려진다. 같은 패턴이 다른 1회성 초기화에도 없는지 점검 필요 | 해소(1팀). 패턴 재점검은 비차단 |
| **I-128** | **Playwright MCP용 Chromium 미설치** — `npx playwright install chrome` 필요. 오늘 Task 011의 클릭 전환·"새로고침 없음"·고유명사 불변 실측이 이 때문에 미수행됐고, 이후 UI 검증 Task마다 반복될 사안 | 사용자 판단 대기 |
| **I-129** | 라우트별 `loading`/`not-found`가 Next 16.2.10에서 `params` 접근 불가(`unstable_rootParams` 제거, 대안 없음)라 **DEFAULT_LOCALE 고정** — 쿠키 판독으로 완화하는 건 후속 과제. 근거는 `src/i18n/README.md` §4 | 4팀, 비차단 |

## 6. 다음 일차(23일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | 잔여 044 항목 **23일차 마감**: Edge Function 배포·롤백 문서화, 환경 분리. **I-127 계열 패턴**(성공 전 플래그 세팅)이 다른 1회성 초기화에 없는지 점검 여지 |
| **2팀** | Task 024 계속(24일차까지) — 잔여는 24일차 행 참조. **I-123 판정은 025/026 착수 시점**, 감독 폴백 파일 분리 여부도 같은 시점 |
| **3팀** | Task 029 계속(26일차까지) — 잔여: 스폰서 엔티티·계약(팀당 3슬롯), 부도 판정, 재정 위기. **`enums.ts` 실값 기입(4팀 인계분)이 23일차 이후 3팀 몫** |
| **4팀** | **Task 011 종료.** 23일차부터 `src/components/` 본격 착수(`domain/`·`state/`·프리미티브 13종). 오늘 `LocaleSwitcher.tsx`만 먼저 들어가 있으니 디렉터리 관례를 여기에 맞출 것. `SiteHeader`/`SideNav`/`SiteFooter` 로컬 함수 분리도 23일차 이후 |
| **5팀** | 4일 연속 미참여. H-06 ESLint 가드레일 인수 상태 유지 |
| **6팀** | **034a 종료.** `@supabase-js` 설치 시 `index.ts` 1줄 교체로 실클라이언트 전환(설계 완료). `getMatchPlayerRatings`/`getMatchTeamStats`는 2팀 Tier B(H-14, 27일차) 도착 후 채움 |
| **팀장** | ⓐ **CI 첫 실행 결과 미확인 3일째** — `gh` CLI 부재. 오늘 `secret-scan.yml`이 추가돼 확인 대상이 2개로 늘었다. **확인 수단 결정 필요(사용자)** ⓑ **I-121 주석 태그 규약을 36일차 전에 확정** ⓒ I-119·I-111 배정 미이행 ⓓ **`bootstrapApp` 미연결이 9일간 아무 게이트에도 안 걸렸다** — "지시했으나 배선 안 된 항목"을 잡을 수단이 lint/tsc/test 어디에도 없다. 같은 계열(I-67·I-72·I-117·오늘 결함 A)이 네 번째다 |

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **CI 첫 실행 결과** | **미확인 3일째** — `gh` CLI 부재, 대상 워크플로우 2개로 증가 | **확인 수단 결정 필요(사용자)** |
| **I-128** | Playwright Chromium 미설치 — UI 실측 검증 반복 차단 | **사용자 판단 대기** |
| **미연결 재발 방지 수단** | 결함 A가 같은 계열 4회차 — 게이트화 여부 | **팀장, 23일차 검토** |
| **I-121** | 공통코드 키 선확정 패턴 — 태그 규약 미확정 | **36일차(031a) 전, 팀장** |
| **I-123** | 이력 기반 로테이션 필요 여부 | 025/026 착수 시점 |
| **D-23 폴백 파일 분리** | 오늘 `suspension.ts` 잔류 승인 — 재판단 시점만 예약 | 025/026 착수 시점 |
| **I-119** | xG 배율·숙련도 실현율 Task 행 누락 | **팀장 배정, 30일차 전** |
| **I-118** | `ABILITY_MULT` 키 정렬 (I-121 첫 사례) | 36일차(031a) |
| **I-111** | 미커버 화면 10종 중 6종이 소관 미배정 | 5팀 착수 역산, 팀장 배정 |
| **I-129** | `loading`/`not-found`의 DEFAULT_LOCALE 고정 | 4팀, 비차단 |
| **I-127** | 성공 전 플래그 세팅 패턴 재점검 | 1팀, 비차단 |
| **I-115** | `check-literals.mjs` allowlist (CI advisory, blocking 미승격) | 1팀, 급하지 않음 |
| **I-120** · **I-122** · **I-124** · **I-125** · **I-126** | 비차단(정보성·낮은 우선순위·승인 기록) | 별도 일정 |
| **I-107** | 브래킷 부전승·컵 라운드 축소 | 5팀 브래킷 화면 착수 전 |
| **I-102** | `is_event_elapsed()` 실판정 로직 (현재 `select true` 스텁) | 2팀 H-24(30일차) |
| **I-101** | 확장자 경로 404 UI 통일 여부 | Task 014(34~38일차) |
| **I-100** | `bet` 계열 인덱스 2건 | 해당 테이블 생성 Task |
| **unused_index 73** | 회수 검토 이관 | Task 042(58~62일차) |
| **I-112** 승인됨(인증 도입 시 재검토) · **I-109** 낮은 우선순위 · **관계 R-06** 삭제정책 미확정 | 비차단 | 별도 일정 |
| **SKILL.md 교체**(14일차~) | 이월 | 사용자 판단 대기 |
