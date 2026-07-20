# 18일차 (2026-08-13, 목)

## 1. 참여 팀

| 팀 | Task | 산출 |
|---|---|---|
| 1팀 코어품질 | 010 | D-18 하드코딩 JSX 문자열 검출 룰 + 숫자 리터럴 잔존 검사 스크립트 |
| 2팀 시뮬레이션엔진 | 024 | 컨디션·피로·캐미 계수 실공식 3종 |
| 3팀 데이터밸런싱배당 | 007 | `MockDataSource` — `DataSource` 56개 메서드 전량 구현 |
| 4팀 UI기반i18n | 011 | 서버·클라이언트 겸용 번역 함수 API + 로케일 Provider |
| 6팀 DB인프라 | 032 | RLS 정책 재편(성능 경고 211건 해소) + 보안 하드닝 + I-110 마감 |

5팀(화면배팅UX)은 18일차 배정 행 없음 — 미소환.

## 2. 최종 게이트

| 항목 | 결과 |
|---|---|
| `npm run test` | **542 passed / 0 fail** (44 files, 6 skipped, 6 todo), Type Errors none |
| `npx tsc --noEmit` | 0 error |
| `npm run lint` | **0 error** / 134 warning (그중 약 112건이 신규 D-18 룰 검출분 — 의도된 warn) |
| `get_advisors(performance)` | `auth_rls_initplan` 41→**0**, `multiple_permissive_policies` 170→**0**, `unused_index` 73 유지(Task 042 이관) |
| `get_advisors(security)` | 5건 → **1건** (ERROR 1, 정당화 승인 — I-112) |

## 3. 팀별 산출물

### 1팀 — Task 010 (D-18)
- `eslint.config.mjs`: `no-restricted-syntax` 기반 JSX 텍스트 리터럴 경고 룰. `src/i18n/**`·테스트 파일 예외(4팀 `t()`/Provider 오탐 방지).
- `scripts/check-literals.mjs`(신규) + `package.json`에 `check:literals` 스크립트. `fallback.ts`의 `SAFE_DEFAULT_VALUES`(37종)와 값이 겹치는 숫자 리터럴을 `src/lib/sim/**`(rng 제외)에서 탐지. **정보성 — 게이트 미연결.**
- 수락 기준 실증: 기존 라우트 placeholder 17곳에서 112건 warn 검출.
- 잔여(19일차): 커밋·PR 체크리스트, ISSUES 갱신 규약.

### 2팀 — Task 024
- `src/lib/sim/ability/modifiers.ts`: `conditionModifier` `M = 0.70 + 0.30×(C−1)/9`, `fitnessModifier` `M = 0.75 + 0.25×(fitness/100)`, `familiarityModifier` `M = min(1.0 + 0.01×seasons, 1.06)`.
- 17일차 `clampAbilityModifier` 단일 진입점 재사용, 신규 클램프 없음.
- 경계값 테스트 포함 `modifiers.test.ts` 39/39 통과 (C=1→0.70, C=10→1.00, fitness 0/100, seasons 0/3/6/20).
- 캐미 증가 곡선은 과제 행에 상한(+6%)만 명시돼 선형 1%p/시즌으로 채택, 근거를 파일 상단 주석에 명시.
- 잔여 5종(부상·홈·날씨·감독·포지션)은 19~20일차 자리표시자 유지.

### 3팀 — Task 007
- `src/lib/data/mock/MockDataSource.ts`(신규, 56개 메서드) + `MockDataSource.test.ts`(13케이스).
- **I-106 완전 해소**: `getStandings`가 `progress.ts` 독립 표본이 아니라 `schedule.ts`의 대진 역산 순위표를 슬라이스. `round` 지정 시 `deriveStandingsFromFixtures`를 필터된 fixtures에 재적용해 시점별 재계산(단일 소스 재사용, 재구현 없음).
- `schedule.ts`에 `deriveStandingsFromFixtures`, `screens.ts`에 `toPublicProfile` export 추가(재사용 목적, 로직 무변경).
- 생성기가 없는 축(계약/부상/수상/이적/임대/통산·경기 스탯/라인업/날씨/시즌지표/원장/스폰서계약/트로피/크론/감사로그)은 값을 발명하지 않고 `null`/`[]` 반환, 사유를 파일 헤더에 명시.
- **`src/lib/data/mock/index.ts`(배럴)는 의도적으로 만들지 않음** — I-113 참조.

### 4팀 — Task 011
- `src/i18n/t.ts`(신규): `t(locale, key, params?)` — React 미의존 순수 함수. `{placeholder}` 보간, 미존재 키는 throw(무음 실패 방지).
- `src/i18n/provider.tsx`(신규): `TranslationProvider` + `useLocale()`/`useTranslation()`. 동일 `t()`를 바인딩해 감쌈.
- 설계 근거: RSC는 Context를 사용할 수 없어(Next 공식 문서 확인) 서버는 `params.lang`으로 `t()` 직접 호출(getDictionary 패턴), 클라이언트만 Context로 prop 드릴링을 회피. 사실상 단일 선택지.
- 테스트 10건 — jsdom 미설치라 `react-dom/server`의 `renderToStaticMarkup`으로 서버·클라 양쪽 경로 검증.
- 루트 레이아웃 실배선(Provider로 children 감싸기)은 **22일차 LocaleSwitcher와 함께** — 오늘 스코프 아님. 기존 `keys.ts`/`locales.ts`/`messages/` 무변경.

### 6팀 — Task 032 (종료일)
- 마이그레이션 4건: `fix_rls_initplan_standalone_policies`(ALTER POLICY 7건) / `split_service_role_write_policies_no_select_overlap`(34개 테이블 DROP+CREATE) / `add_team_season_stat_biggest_pairing_check` / `reduce_security_definer_exposure`.
- 성능 경고 원인: 34개 테이블의 `_service_role_write`(ALL)가 `_public_select`(SELECT)와 중첩. SELECT는 public_select만 커버하고 write를 INSERT/UPDATE/DELETE 3개로 분리해 해소. 나머지 5개 테이블은 `auth.role()`을 `(select auth.role())`로 래핑.
- **I-110 마감** — `team_season_stat_biggest_win_pairing_check` / `_loss_pairing_check` 추가.
- 보안: `current_world_minute()`·`is_event_elapsed()`를 SECURITY INVOKER로 전환(WARN 4 → 0). `match_event_visible`은 DEFINER 유지 + `security_barrier=true` 하드닝 — I-112 참조.

## 4. 팀장 검증에서 발견된 결함

**1건(6팀), 해소.**

- **6팀 수락 기준 미충족** — 오늘 수락 기준은 "`get_advisors` **보안**·성능 경고 해소"인데 초기 보고는 성능만 처리하고 보안 5건(ERROR 1 + WARN 4)을 "스코프 밖"으로 남겼다. 팀장이 반려하고 ⓐ해소 또는 ⓑ SQL 근거를 갖춘 정당화를 요구 → 재작업으로 WARN 4건 해소, ERROR 1건은 정당화 + 하드닝으로 마감(5→1). 팀장이 `get_advisors` 재실행으로 직접 확인.

### 오탐으로 기각한 보고 2건

- **3팀: "`bootstrap.test.ts` 5건 회귀"** → **기각**. 팀장이 단독 실행 확인 결과 5/5 통과, 전체 542 passed. `src/lib/data/mock/`에 `index.ts`가 없어 `import('./mock')`이 여전히 reject된다. 파일 작성 중간 상태를 관측한 오탐(17일차에 예고된 패턴). **단, 19일차에 배럴을 만드는 순간 실제로 깨진다 → I-113으로 등재.**
- **6팀(재검증 인스턴스): "I-110 CHECK가 이미 존재 — 실결함 아님"** → **기각**. `list_migrations`상 `add_team_season_stat_biggest_pairing_check`가 **오늘(20260720084850) 신규 적용**됐다. 같은 팀의 선행 작업 결과를 관측한 순서 착시이며, I-110은 실결함이었고 오늘 마감된 것이 맞다.

### 운영 사고 — 3팀·6팀 인스턴스 중복 기동

1차 소환분이 산출물 없이 일괄 종료된 것으로 관측돼 5팀을 재소환했는데, 실제로는 1차분이 살아 있어 **3팀·6팀이 각각 2개 인스턴스로 병행**했다. 결과적으로 동일 산출물에 수렴해 손실은 없었으나(트리 정합·전체 테스트 통과 확인), 3팀 인스턴스 하나가 `index.ts`를 만들었다 되돌리는 왕복이 발생했다. 팀장이 정본을 지정하고 나머지를 종료시켜 해소. **재발 방지: 종료 통보를 신뢰하지 말고 `git status`로 산출물 유무를 먼저 확인한다.**

## 5. 신규/갱신 이슈

| 번호 | 내용 |
|---|---|
| **I-110** | **해소(2026-08-13)** — CHECK 2건 추가 |
| **I-106** | **해소(2026-08-13)** — `getStandings` schedule.ts 파생 배선 완료, 잔여 없음 |
| **I-111** | **정정** — 제목은 "8종"이나 본문 열거는 FR-UI-001·012·013·015~019·025·026 = **10종**. 수치 불일치를 정정하고 소관/예정 일차를 3팀 판단으로 채움 |
| **I-112**(신규) | `match_event_visible` SECURITY DEFINER 뷰 — advisor ERROR 예외 승인 |
| **I-113**(신규) | `src/lib/data/mock/index.ts` 배럴 추가 시 `bootstrap.test.ts` 5건 확정 파손 |
| **I-114**(신규) | `MOCK_NOW`(2026-08-11T15:00)와 `FIXTURE_NOW`(2026-08-12T12:00)가 하루 어긋남 |
| **I-115**(신규) | `check-literals.mjs` 우연 일치 오탐(36건 중 다수) — allowlist 보강 |

## 6. 다음 일차(19일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | Task 010 마지막 날 — 커밋·PR 체크리스트, ISSUES 갱신 규약. **추가**: I-113 조율(`bootstrap.test.ts`를 "mock 존재" 전제로 갱신) — 이걸 먼저 해야 3팀이 배럴을 올릴 수 있고, 그래야 4·5팀이 20일차부터 소비 가능. I-115 allowlist 보강도 이 팀 몫 |
| **2팀** | Task 024 계속 — 남은 계수 5종(부상·홈·날씨·감독·포지션). 날씨·포지션 계수의 파일 분리 여부(`modifiers.ts` 잔류 vs `tactics.ts`/`position.ts`)를 19·20일차에 판단 |
| **3팀** | Task 007 계속 — 1팀이 I-113을 처리하면 `src/lib/data/mock/index.ts` 배럴 + `registerDataSource` 배선(H-07). I-114 기준 시각 통일. I-111 소관 밖 항목(Award/Trophy/Injury/TeamSeasonStat/CronRun/운영콘솔)은 팀장 배정 대기 |
| **4팀** | Task 011 계속(22일차까지) — 열거형 표시명 카탈로그(3팀 지원), 날짜·숫자 서식, 로케일 스위처. Provider 실배선은 22일차 |
| **6팀** | Task 032 **종료**. 다음 배정 행 확인 후 진행. I-112는 승인된 예외이므로 재제기 불필요 |
| **전 팀** | `R-*` 인용 시 체계 명시("리스크 R-06" / "관계 R-04") — I-109 |
| **팀장** | ⓐ 소환 전 `git status`로 기존 산출물 유무 확인(오늘 중복 기동 사고) ⓑ 팀원의 "타 팀 파일 회귀" 보고는 **직접 재현**한 뒤에만 수용 — 오늘 2건 모두 오탐 ⓒ 수락 기준 문구를 팀 보고보다 우선해 판정(오늘 6팀 보안 항목이 이 경로로 잡힘) |

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **I-113** | 배럴 추가 시 `bootstrap.test.ts` 파손 — 1팀·3팀 조율 | **19일차(H-07 배선 전)** |
| **I-111** | 미커버 화면 10종 중 6종이 소관 미배정 | 5팀 착수 역산, 팀장 배정 |
| **I-114** | Mock 기준 시각 하루 불일치 | 사용자 노출 전(3팀) |
| **I-115** | `check-literals.mjs` allowlist | 19일차 1팀(급하지 않음) |
| **I-112** | SECURITY DEFINER 뷰 예외 승인 | 승인됨 — 인증 도입 시 재검토 |
| **I-107** | 브래킷 부전승·컵 라운드 축소 | 5팀 브래킷 화면 착수 전 |
| **날씨·포지션 계수 파일 분리** | `modifiers.ts` 잔류 vs 분리 | 19·20일차 2팀 판단 |
| **unused_index 73** | 회수 검토 이관 | Task 042(58~62일차) |
| **관계 R-06 삭제정책** | Sponsor↔Team, ON DELETE RESTRICT 미확정 | 별도 일정 |
| **I-109** | `R-*` 접두사 중복 — `REL-*` 개명 여부 | 낮은 우선순위 |
| **I-100** | `bet` 계열 인덱스 2건 | 해당 테이블 생성 Task |
| **I-102** | `is_event_elapsed()` 실판정 로직 (현재 `select true` 스텁) | 2팀 H-24(30일차) |
| **I-101** | 확장자 경로 404 UI 통일 여부 | Task 014(34~38일차) |
| **SKILL.md 교체** | 14일차부터 이월, 사용자 판단 대기 | — |
| **Playwright 콘솔 스모크** | Chrome 확보 필요, 13일차부터 이월 | — |
