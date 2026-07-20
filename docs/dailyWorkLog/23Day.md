# 23일차 (2026-08-20 목)

## 1. 참여 팀

| 팀 | Task | 결과 |
|---|---|---|
| **1팀** 코어·품질 | 044 | `docs/deploy-runbook.md` 신규 — **Task 044 종료** |
| **2팀** 시뮬엔진 | 024 | ability 계수 9종 커버리지 100% 달성 (24일차까지 계속) |
| **3팀** 데이터·밸런싱 | 029 | 스폰서 계약 + `enums.ts` ko/en 실값 (26일차까지 계속) |
| **4팀** UI기반·i18n | 012 | shadcn 도입 + 프리미티브 8종 (27일차까지 계속) |
| **6팀** DB·인프라 | 034 | 034a 재검증 + CI 커버리지 게이트 해소 |

5팀 미참여(5일 연속).

## 2. 최종 게이트

`npm run gate` **전체 통과** — tsc 0건 / lint 0건 / 816 tests / 커버리지 Stmt 96.3%·Branch 88.69%·Func 98.38%·Line 96.26%, perFile 임계 전건 충족.

**3일간 레드였던 CI가 오늘 복구됐습니다.**

## 3. 팀별 산출물

### 1팀 — Task 044 종료

- `docs/deploy-runbook.md`(신규, 14.5KB): 환경 분리 / 마이그레이션 순서·롤백 / Edge Function 배포·롤백 / 요금제·크론 / CI 3단 게이트 / 후속 과제.
- **CI 확인 블로커(3일째) 해소** — repo가 public이라 `gh` 없이 `curl https://api.github.com/repos/0625chopin/football/actions/runs`로 실행 상태 확인 가능(로그 다운로드만 admin 토큰 필요, 403 실측).
- **수락 기준 실측 충족** — CI가 3회 연속(`3500814`/`f3d2f47`/`d30da33`) failure였고, 원인이 6팀 22일차 산출물의 커버리지 0%임을 확정. "게이트가 실제 실패를 잡아냄"이 실측으로 입증됨.
- I-127 계열 재점검: `config/loader.ts`(동기 setter)·`data/factory.ts`(성공 후 캐시 세팅) 모두 안전 — **동일 패턴 결함 추가 없음, I-127 종결 가능**.

### 2팀 — Task 024

- `src/lib/sim/ability/modifier-chain.test.ts`(신규): 8개 계수 함수를 중립 입력으로 실제 호출 → `combineAbilityModifiers` 합성 결과가 base(1.0)와 일치함을 검증. 기존 테스트는 리터럴 배열만 보고 있어 합성 경로가 비어 있었음.
- ability 4파일 75 테스트, Stmt/Branch/Func/Line **전부 100%**(NFR-QA-002 충족).

### 3팀 — Task 029

- `src/lib/economy/sponsor.ts`·`sponsor.test.ts`(신규): `proposeSponsorContract` — 팀당 활성 계약 ≤ 3 위반 시 `SponsorSlotLimitExceededError`, 기간 1~10시즌 클램프, 명성(`Team.reputation`)×규모 비례 `incomePerSeason`. 수락 기준을 테스트로 고정.
- `src/i18n/messages/{ko,en}/enums.ts`: H-10 기준 7그룹 **66리터럴** 실값 기입(ko 그룹별 `const`, en은 ko 유도 `EnumsMessages` — 키 대칭을 tsc가 강제).
- `src/i18n/messages/ko/enums.test.ts`(신규): 그룹·키 대조 + 빈 문자열 없음 17 tests. 타입이 못 잡는 "값 미기입"을 잡으므로 유지 결정.

### 4팀 — Task 012

- `components.json`·`src/lib/utils.ts`(`cn()`)·`src/components/ui/{badge,button,card,separator,skeleton,table,tabs,tooltip}.tsx` 8종.
- `globals.css`: shadcn init이 심은 `.dark` 클래스 기반 다크모드를 **`prefers-color-scheme` 미디어쿼리 기반으로 교체**(CLAUDE.md 규약 — 클래스 토글러 없음). 그대로 뒀으면 다크모드가 죽었음.
- WSL `/mnt` EPERM(I-62 계열)으로 `shadcn init`의 npm install 실패 → 임시 `.npmrc`의 `--no-bin-links`로 우회, **작업 후 제거 확인**.

### 6팀 — Task 034

- **034a 재검증**: `match_event_visible` 뷰·`current_world_minute()`/`is_event_elapsed()` 실존 확인. `is_event_elapsed`는 `SELECT true` 스텁이나 `schema-design.md §6.3.1`에 "2팀 H-24 인계 후 30일차 확정"으로 명시된 **의도된 placeholder** — 결함 아님.
- **CI 레드 해소**: `client.test.ts`·`index.test.ts`(신규) — `client.ts` 100%(47/47 stmt, 27/27 branch), `index.ts` 100%.
- **실버그 발견·수정** — `client.ts`의 `eq()`/`in()`이 `encodeURIComponent` 후 `URLSearchParams`가 재인코딩해 **이중 인코딩**(공백이 `%2520`). 팀명 등 공백·한글 값의 PostgREST 필터가 **항상 불일치**했을 결함. 커버리지를 숫자 채우기로 처리하지 않아 잡힌 건.
- 1팀 런북용 요금제·크론·환경분리 입력 제공.

## 4. 팀장 검증에서 발견된 결함

### 결함 A — 팀 인스턴스 중복 기동 (팀장 귀책, 해소)

3·4·6팀이 소환 직후 종료 통보를 보냈으나 **실제로는 살아서 작업 중**이었다. 팀장이 `git status`(당시 clean)만 보고 종료로 판단해 3팀을 재소환했고, 두 인스턴스가 같은 파일에서 경합했다.

- **4팀**: `components.json`이 두 값으로 연속 덮어써지고 `npm install`이 동시 실행됨. **재소환된 인스턴스가 경합을 감지해 즉시 멈추고 보고** → 팀장이 먼저 돌던 쪽을 정본 지정.
- **3팀**: 우연히 작업이 갈렸다(재소환분이 `sponsor.ts`, 원본이 `enums.ts`). 재소환분의 `enums.ts` 쓰기는 충돌로 2회 모두 실패 — **유실 없음**.
- **6팀**: 두 인스턴스가 독립적으로 같은 검증을 수행, 결론 일치.

**교훈**: 종료 통보와 `git status`만으로는 생존 판정이 불충분하다. 작업 시작 직후엔 아직 디스크에 산출물이 없어 clean이 정상이므로, clean은 "종료됨"의 근거가 못 된다.

### 결함 B — `lucide-react` import 0건 (해소)

4팀이 shadcn init 표준 흐름대로 런타임 의존성 6개를 추가했으나, 프리미티브 8종 중 아이콘을 쓰는 게 없어 `lucide-react`가 import 0건이었다. 수락 기준 "신규 의존성이 근거와 함께 최소로(NFR-MT-008)"를 팀장이 **"마감 시점 `src/` 내 import 0건인 런타임 의존성은 남기지 않는다"**는 판정 규칙으로 구체화 → 4팀이 제거. 최종 6개 전부 import 근거 확보(cva 3 / radix-ui 5 / tw-animate-css 1 / clsx 1 / tailwind-merge 1).

### 결함 C — 034a 라벨 오류 (일정표 귀책)

오늘 6팀 일정 행이 "034a — `match_event` 경과 시간 필터"로 적혀 있으나, ROADMAP 715행 기준 **034a = Supabase 어댑터 구현·플래그 전환**(22일차 종료)이다. `match_event` 필터는 ROADMAP **727행의 라벨 없는 Task 034 최상위 항목**이며, 034a 3/3 바로 아래에 붙어 있어 연장으로 오독되는 서식이다. 6팀 오독이 아니라 일정표 라벨 오류. → I-130 등재.

### 검증 항목 (전건 통과)

- NFR-DT-001: `src/lib/sim/**`의 `Math.random()`/`Date.now()`/`react`/`@supabase/*` 실사용 **0건**(매치된 것은 전부 주석).
- `src/components/`의 Supabase 직접 import **0건**.
- enums ko/en 키 대칭 — 구조는 다르나(ko: 그룹별 `const`, en: 단일 객체) 타입으로 강제됨, 결함 아님.
- 임시 `.npmrc` 잔류 없음.

## 5. 신규/갱신 이슈

| 번호 | 내용 |
|---|---|
| **I-130** | ROADMAP Task 034 서식 — 727행 `match_event` 필터 항목에 라벨이 없어 034a 연장으로 오독됨. 명시적 라벨 부여 필요 |
| **I-131** | **브랜치 보호 없음** — CI 실패가 3일간 머지를 막지 못하고 master에 누적. 게이트 무력화 리스크. **사용자 판단 필요** |
| **I-132** | `supabase/migrations/` 로컬 2파일 vs 원격 19건 적용(17건 미커밋) — **git으로 스키마 재현 불가**. 스테이징 승격 설계의 선행 과제 |
| **I-133** | Supabase 브랜칭(스테이징) 미구성/미가용(`list_branches` 실패로 실측) |
| **I-134** | Edge Function **CPU 2초/호출**이 요금제 무관 하드 리밋, NFR-PF-003이 이미 75% 소모 → catch-up 상한 **50→30경기 하향** 권고(문서 반영 완료, 코드 반영 미착수) |
| **I-135** | `enums.ts` 스캐폴드에 **`AwardScope`(4종) 그룹 누락** — 4팀 소관, Task 019 착수 전 필요. H-10의 70리터럴 중 66만 채워진 원인 |
| **I-136** | `SPONSOR_PARAM`의 `INCOME_BASE`/`INCOME_REP_STEP`이 05문서·`fallback.ts`에 없어 `sponsor.ts`가 신규 정의 — 36일차(031a) 시드 정리 시 실값 정렬 |
| **I-137** | `match_event_visible`이 `security_definer_view` advisor ERROR로 남음 — 설계상 의도이나 공식 accept 문서화 없음 |
| **I-127** | **종결 가능** — 1팀 재점검 결과 동일 패턴 결함 추가 없음 |

## 6. 다음 일차(24일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | Task 044 종료. **CI 확인 수단이 확보됐으니(§4.2 `curl`) 이후 일차 마감마다 CI 상태를 실제로 확인할 것.** I-130 라벨링은 팀장이 처리 |
| **2팀** | Task 024 계속(24일차까지). I-123 판정·감독 폴백 파일 분리는 025/026 착수 시점 유지 |
| **3팀** | Task 029 계속(26일차까지) — 잔여: 부도 판정, 재정 위기. `AwardScope`(I-135)는 4팀 골격 추가 후 값 기입 |
| **4팀** | Task 012 계속(24~27일차, 전부 `globals.css` 토큰 작업). **프리미티브 소비는 28일차(013A)부터** — 추가 프리미티브는 그때 필요한 것만. **I-135(`AwardScope` 골격) 처리 필요**. `SiteHeader`/`SideNav`/`SiteFooter` 로컬 함수 분리 미착수 |
| **5팀** | 5일 연속 미참여. H-06 ESLint 가드레일 인수 상태 유지 |
| **6팀** | ROADMAP 727행(`match_event` 필터)은 **30일차 확정 대상** — `is_event_elapsed()` 실판정(I-102)이 2팀 H-24 도착 후. I-132 마이그레이션 동기화는 자격증명 필요(사용자) |
| **팀장** | ⓐ **중복 기동 재발 방지** — 종료 통보 검증 방법을 `git status` 외로 보강 ⓑ I-131 브랜치 보호 사용자 판단 ⓒ I-121 태그 규약 36일차 전 확정 ⓓ I-119·I-111 배정 미이행(3일째) |

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **I-131 브랜치 보호** | CI 실패가 머지를 못 막음 | **사용자 판단 대기** |
| **I-132 마이그레이션 드리프트** | 원격 19 vs 로컬 2 — 액세스 토큰·DB 비밀번호 필요 | **사용자 판단 대기** |
| **I-128** | Playwright Chromium 미설치 — UI 실측 검증 차단 | **사용자 판단 대기** |
| **I-134** | catch-up 50→30경기 코드 반영 | 담당 팀 배정 필요, 팀장 |
| **I-135** | `AwardScope` 그룹 골격 | 4팀, Task 019 전 |
| **I-121** | 공통코드 키 선확정 태그 규약 | **36일차(031a) 전, 팀장** |
| **I-136** · **I-118** | 시드 상수 실값 정렬 | 36일차(031a) |
| **I-123** · **D-23 폴백 파일 분리** | 판정 시점 예약 | 025/026 착수 시점 |
| **I-119** | xG 배율·숙련도 실현율 Task 행 누락 | **팀장 배정, 30일차 전** |
| **I-111** | 미커버 화면 10종 중 6종 소관 미배정 | 5팀 착수 역산, 팀장 배정 |
| **I-102** | `is_event_elapsed()` 실판정(현재 스텁) | 2팀 H-24(30일차) |
| **I-130** · **I-137** · **I-129** · **I-115** | 비차단 | 별도 일정 |
| **I-107** | 브래킷 부전승·컵 라운드 축소 | 5팀 브래킷 화면 착수 전 |
| **I-101** | 확장자 경로 404 UI 통일 | Task 014(34~38일차) |
| **I-100** · **unused_index 73** | 인덱스 관련 | 해당 Task / 042(58~62일차) |
| **I-112** 승인됨 · **I-109** 낮음 · **관계 R-06** 미확정 · **I-120·I-122·I-124·I-125·I-126** | 비차단 | 별도 일정 |
| **SKILL.md 교체**(14일차~) | 이월 | 사용자 판단 대기 |
