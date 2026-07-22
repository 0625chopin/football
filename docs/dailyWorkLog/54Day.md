# 54일차 (2026-10-02, 금)

**참여 팀**: 2팀(시뮬레이션엔진) · 5팀(화면배팅UX) · 6팀(DB인프라)
**미참여**: 1·3·4팀 (일정표에 54일차 행 없음 — 호출하지 않음)

**한 줄 요약**: 시즌 아카이브(I-13 월드 리셋 금지) 확정, `/admin` 화면 G1~G4 구현,
`/admin/**` 인증+역할 가드 신규 도입. **차단성 결함 1건(I-270)을 같은 일차에 해소**했고,
재수정 1라운드로 종료.

| 팀 | Task | 결과 |
|---|---|---|
| 2 | 028 | 시즌 아카이브 확정 · `season_number` 단조 누적 — 재수정 0회 |
| 5 | 021 | `/admin` G1~G4(상태·배속·정지/재개·시드) — 재수정 1회 |
| 6 | 037 | `/admin/**` 인증 + 역할 확인 — 재수정 1회 |

---

## 1. 팀별 작업

### 2팀 — Task 028 시즌 아카이브

`src/lib/sim/season/archive.ts` 신규. 기존 7종(`awards`/`retire`/`rebuild`/`promotion` 등)의
"계산만 하고 영속화는 오케스트레이션 계층에 위임" 책임 분리를 그대로 따라 3함수로 구성.

- `archiveSeason()` — `SETTLEMENT` 단계 · `endedAt` 확정 · `seasonId` 일치 · `finalRank` 확정을
  검증한 뒤 `Season` + `TeamSeason[]`을 불변 `SeasonArchive`로 봉인. **값을 다시 계산하지 않는다.**
- `computeNextSeasonNumber()` — 히스토리 최댓값 + 1. 중복·비정수·0 이하가 섞이면 조용히 이어
  붙이지 않고 **예외**(손상된 히스토리를 못 본 척 잇는 것 자체가 "감지되지 않은 리셋").
- `assertNoWorldReset()` — `World.id`/`worldSeed` 유지 + `currentSeasonNumber` 증가만 통과(I-13 최종 방어선).

신규 도메인 타입 선언 0건(`Season`/`TeamSeason`/`World` 재사용), `@/types` 배럴 import.
**파일**: `archive.ts`, `archive.test.ts`(15건) — 둘 다 신규.

### 5팀 — Task 021 `/admin` 화면

`src/app/[lang]/admin/page.tsx`에 G1 시뮬 상태 요약(`PhaseIndicator`+`CountdownTimer`+`StatusBadge`) ·
G2 배속 슬라이더(0.25×~20×, 드래그=로컬 프리뷰 / `[적용]`=Server Action) · G3 정지/재개 토글 ·
G4 시드 조회(world/season 표시 + `matchId`→`match_seed`)를 구현. G5(리셋)·G6(로그뷰어)는 55일차 범위라 미착수.

- 일정표 산출물 칸은 `src/app/admin/page.tsx`였으나 실경로는 **`src/app/[lang]/admin/page.tsx`**
  (최상단 layout이 없는 이 프로젝트 구조 — 표기가 옛것이라 실경로로 작업).
- 신규: `SpeedControlPanel` · `PauseResumeControl` · `SeedInspectorPanel` · `StatusBadge` ·
  `actions.ts`(`"use server"`) · `world-override-store.ts` · `elapsed.ts` + 테스트.
- i18n `messages/{ko,en}/admin.ts` 값 확장(5팀 소유 키).

### 6팀 — Task 037 `/admin/**` 인증 + 역할 확인

**전제 정정 판정이 선행됐다** — 일정 행은 "1차의 환경 플래그 보호를 **대체**"였으나, 그 플래그
보호는 **코드에 존재한 적이 없다**(`docs/wireframe/07-어드민-운영콘솔.md` W-45가 변수명·검증 위치를
미결로 남긴 채 방치 — 설계만 있고 구현 0건). 즉 이번 변경 전 `/admin/**`은 **완전 무방비**였고,
이번 작업은 대체가 아니라 **신규 도입**이다.

- `src/proxy.ts` — `/admin` 세그먼트(로케일 유무 무관, `startsWith`가 아닌 **세그먼트 등가**라
  `/administrator` 오탐 없음)를 쿠키 access token → `public.profile.role` PostgREST 조회 1회로 가드.
  판정 불가(토큰 없음/PostgREST 비정상/네트워크 에러/env 미설정)는 전부 **fail-closed 403**.
- `@supabase/*` 미설치 유지 — 순수 `fetch`(기존 REST 브리지와 동일 패턴). JWT 서명·만료 검증은
  PostgREST/GoTrue에 위임(시크릿이 `.env.local`에 애초에 없음).
- 로그인/세션 발급 경로가 앱 전체에 **0건**이라(실측) 검증만 넣으면 관리자도 영구 차단되므로
  `src/app/api/admin/session/route.ts`(6팀 소유 경로) 최소 발급 API를 함께 추가.
  POST(로그인, `role≠ADMIN`이면 쿠키 미발급) / DELETE(로그아웃).
- **원격 조작 0건** — 마이그레이션·edge 배포·INSERT 없음(I-269 상시 문구 준수).

---

## 2. 팀장 검증

전원 완료 보고 후 팀장 단독 검증. 게이트는 1차에도 클린이었으나(typecheck 0 / lint 0 /
1809 passed) **게이트가 잡지 못하는 차단성 결함 1건**을 코드 판독으로 발견했다.

### 발견 — I-270 Server Action이 인가 가드를 우회 (차단성)

5팀이 이슈 후보로 올린 건을 Next.js 16 **자체 문서**로 대조해 확정했다
(`node_modules/next/dist/docs/01-app/02-guides/data-security.md`):

> L291 *"treat Server Actions as reachable via direct POST requests and **verify authentication
> and authorization inside each one**"*
> L339·L368 *"A page-level authentication check does not extend to the Server Actions defined
> within it. Always re-verify inside the action... the Server Action is a separate entry point."*

프록시는 **라우트 경로만** 막는다. `actions.ts`의 `applySpeedMultiplier`·`toggleWorldPause`는
인가 검사 없는 **쓰기 진입점**이었고, 수락 기준 "비인가 `/admin` 차단"이 라우트 기준으로만
성립하고 실제 조작은 열려 있었다.

**조율 방식**: 인가 로직은 6팀 소유, 액션 파일은 5팀 소유라 **팀장이 계약을 먼저 고정**해
양 팀에 동일 통보하고 병렬로 재수정시켰다(순차 대기 회피).

```ts
// src/app/api/admin/auth.ts (6팀 소유)
export const ADMIN_SESSION_COOKIE = "admin_session_token";
export async function isAuthorizedAdminToken(token: string | undefined): Promise<boolean>;
export async function assertAdminSession(): Promise<void>; // 비인가 시 throw
```

**재수정 결과(1라운드로 해소)**
- 6팀: `auth.ts` 신규 + `proxy.ts`·`session/route.ts` 중복 제거 → 판정 로직 **단일 소스**.
  `next/headers`는 함수 본문 안 **동적 import**로 지연(미들웨어 번들 오염 회피).
- 5팀: `actions.ts` **3함수 전부** 첫 줄 `await assertAdminSession()` — 읽기인 `lookupMatchSeed`도
  어드민 전용 시드 노출이라 포함. 비인가 거부 테스트 4케이스 추가.
- 소유 경계 준수 확인: 5팀은 `proxy.ts`·`api/admin/**` 미접촉, 6팀은 `src/app/[lang]/**` 미접촉.

### 최종 게이트 (팀장 직접 실행)

| 항목 | 결과 |
|---|---|
| `npm run typecheck` | 오류 0 |
| `npm run lint` | 오류 0 |
| `npm run test` | **136 files · 1824 passed** / 6 skipped · 6 todo · Type Errors 0 |

재수정 전 1809 → **+15**(6팀 auth 11 + 5팀 액션 인가 4). 회귀 0건.

### 개별 확인

- 2팀 — NFR-DT-001 위반 **0건**(`Math.random`/`Date.now`/`react`/`@supabase` 전 히트가 주석),
  `@/types/` 서브경로 직접 import 0건. **재수정 없음.**
- 6팀 — `proxy.ts` 로케일 리다이렉트 회귀 없음(테스트로 단언), 가드가 리다이렉트보다 **앞**에 위치.
- 5팀 — 3함수 가드 배치 위치를 팀장이 직접 재확인(`actions.ts:43·70·100`).

---

## 3. 이슈

**신규 5건** (`docs/ISSUES.md` 단일 소스)

| ID | 요지 | 상태 |
|---|---|---|
| **I-270** | Server Action이 인가 가드를 우회하는 쓰기 진입점 | **같은 일차 해소**(차단성이었음) |
| **I-271** | `matcher`가 `api` 제외 → 향후 `api/admin/**` service-role 라우트 무방비 | OPEN · 6팀 · 비차단 |
| **I-272** | `src/proxy.ts`는 4팀 단독 소유인데 일정표가 6팀에 "미들웨어"로 배정 | OPEN · 팀장/일정 · 비차단 |
| **I-273** | `/admin` 배속·정지가 in-memory 오버레이라 재시작 시 소실 | OPEN · 5·2·6팀 · 비차단 |
| **I-274** | 원격 `profile` 0행 → `/admin` 인가 **통과** 경로 앱 내 실측 불가 | OPEN · 판정 대기 |

I-272는 **되돌리지 않는다** — 일정 행이 6팀에 명시 배정했고 결과물도 정합하며, 인가 본체가
`api/admin/auth.ts`로 빠져 `proxy.ts` 잔여 변경은 import 수준이다.

---

## 4. 다음 일차 인계

1. **⚠️ 사용자 판정 필요 — I-274.** 원격 `public.profile`이 **0행**이라 `/admin` 인가 통과 경로를
   앱 내에서 왕복 실측할 수 없다(가드가 fail-closed). Task 021 "배속 변경 동작"은 MockDataSource
   직접 호출 + 액션 테스트로 **잠정 인정**한 상태다. 실측하려면 원격 공유 DB에 테스트 관리자
   계정 생성이 필요하고, 되돌리기 어려운 공유 자원 변경이라 **I-269 규율에 따라 팀장 단독으로
   실행하지 않았다.** 미승인이면 034b(실DB 전환) 시점에 자연 해소된다.
2. **I-271을 55~59일차 6팀 어드민 조회 라우트의 완료 조건에 포함** — `cron_run`·`cron_gap`·
   `audit_log` 라우트는 service-role이라 RLS를 우회한다. matcher를 넓히지 말고 **각 Route Handler가
   `assertAdminSession()`을 직접 호출**하는 방향(I-270과 동일 근거).
3. **`"use server"` 함수를 새로 만들 때는 프록시/페이지 가드를 신뢰하지 말고 액션 안에서 항상
   인가를 재검증한다** — I-270의 교훈. 5팀 039(62일차~) 착수 시 특히 해당.
4. **4팀 60일차 지시문에 `proxy.ts` 변경 인계**(I-272) — 54일차 admin 가드가 들어와 있다는 사실과,
   소유를 4팀 유지로 둘지 6팀 공동으로 바꿀지 판정.
5. **5팀 신규 컴포넌트 4종(`SpeedControlPanel`·`PauseResumeControl`·`SeedInspectorPanel`·
   `StatusBadge`)의 `/sample` 등록은 4팀 소유** — KPI-6 커버율 유지를 위해 4팀 등판 시 반영.
6. **5팀 G5(리셋)·G6(로그뷰어)는 55일차** — 54일차 스코프 밖으로 정상 종료.
7. **PS-2 수락 판정은 여전히 3팀 생성기 대기**(53일차 인계 1번, 변동 없음). I-267 · I-264 ·
   I-243+I-263 · I-265/I-121/I-136/I-268 한 패스 · I-260도 53일차와 동일하게 이월.

---

## 5. 미해결·판정 대기

- **I-274** `/admin` 인가 통과 경로 실측 불가(원격 ADMIN 0건) — **사용자 승인 대기**
- **I-273** `/admin` 배속·정지 in-memory 휘발 — 5·2·6팀, 2팀 H-24 + 6팀 쓰기 경로 시점
- **I-272** `proxy.ts` 소유 공백(4팀 소유 ↔ 6팀 배정) — 4팀 60일차 인계
- **I-271** `matcher` api 제외 → 향후 `api/admin/**` 무방비 — 6팀, 55~59일차 완료 조건
- **I-269** 원격 마이그레이션 절차 — 6팀, **54일차 준수 확인**(원격 조작 0건)
- **I-268** 수상 계수 미등록 — 3팀, **I-265·I-121·I-136과 031b 한 패스(4건)**
- **I-267** 지갑 멱등성 키 부재 — 6팀, Task 037 잔여(비차단, 호출자 0건)
- **I-266** 클럽 상세 2/2 데이터 계약 공백 4건 — 5팀 발견, 계약은 1·3팀
- **I-264** `User` 선호 로케일 도메인 필드 부재 — 1팀 배치(비차단, 소비처 0)
- **I-263**(17건) · **I-243** 마이그레이션 로컬 미문서·채번 불일치 — 6팀 한 패스, 034b 전 필수
- **I-262** OVR 산출식 중복 — 2·3팀, **I-257과 한 패스**
- **I-261** I-229 라인업↔이벤트 독립 표본 — 3팀, 다음 등판
- **I-260** 창단·재임 시즌 도메인 축 — 3·5팀, 화면 숨김 우회 중
- **I-259** 선수 상세 잔여 4건 — 5팀, ⓑ는 I-249와 동시 판정
- **I-257 · I-258** 순위 포인트 중복·리빌드 보조금 단위 — 2·3팀 조율
- **I-256** SP-4 잔여 2건(성공률 정의·킥오프 p95 스키마) — 팀장/6팀
- **I-255** 전역 경기 조회 계약 — 1팀, 034b 이후
- **I-252 · I-251 · I-250 · I-248 · I-247 · I-245** 49일차 신규 — 변동 없음
- **I-223** 종결은 62일차 `pending` 0건 확인 시 / **I-241**(MOCK_NOW 고정) — 3팀
- **I-236** `homeModifier` 공식(2팀) / **I-214** 크론 점등 금지(차단성, 54일차 준수 재확인)
- **I-235** 공유 트리 git 조작 — 48~54일차 연속 사고 0건
- **I-233 · I-232 · I-230 · I-228 · I-227 · I-225 · I-220 · I-217 · I-216 · I-215 · I-212 · I-211 · I-209 · I-208 · I-205 · I-204 · I-192** 비차단·배정 대기
