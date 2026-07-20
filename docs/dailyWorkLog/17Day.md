# 17일차 (2026-08-12, 수)

## 1. 참여 팀

| 팀 | Task | 오늘 범위 |
|---|---|---|
| 1팀 코어품질 | 010 | `no-restricted-imports` — sim에서 `react`/`@supabase/*` 금지, `src/components/`에서 Supabase 직접 import 금지 |
| 2팀 시뮬레이션엔진 | 024 | 9개 계수 함수 골격 + 클램프 [0.35, 1.35] |
| 3팀 데이터밸런싱배당 | 007 | 4상태 시나리오 Mock 픽스처 (정상/로딩/빈/에러) |
| 4팀 UI기반i18n | 011 | 번역 키 네이밍 규약 + 키 상수 타입 안전 접근 |
| 6팀 DB인프라 | 032 | DB 타입 생성 + 도메인 매퍼 |

**5팀(화면배팅UX)은 17일차 배정 행 없음 — 미참여.**

## 2. 최종 게이트

| 검증 | 결과 |
|---|---|
| `npm run lint` | **clean** (경고 0) |
| `npx tsc --noEmit` | **오류 0** |
| `npm run test` | **516 passed / 6 todo**, 41 파일 통과 · 6 skipped, **Type Errors: no errors** |
| sim 금지 API grep (`Math.random`/`Date.now`/`react`/`@supabase`) | 실코드 0건 (히트는 전부 주석) |
| `@/types` 서브경로 직접 import (C-5·C-6) | **0건** |
| 도메인 타입 재선언 | 0건 (매퍼는 `Database`·`@/types`에서만 파생) |

프로덕션 빌드는 WSL 환경 제약(I-62)으로 판정 수단에서 제외.

## 3. 팀별 산출물

### 1팀 — Task 010 (계속, 19일차까지)

`eslint.config.mjs`에 `no-restricted-imports` 2블록 추가.
- `src/lib/sim/**` 블록(기존 `no-restricted-properties`와 동일 스코프): `react`/`react-dom` paths 금지 + `@supabase/*` patterns 금지.
- `src/components/**` 신규 블록: `@supabase/*` 직접 import 금지. 디렉터리는 아직 없으나(4팀 23일차 이후) **선제 등록**.

임시 파일로 룰 발동을 수동 확인 후 삭제, 잔존물 없음(팀장이 `git status`로 재확인 — `src/components/` 미생성 확인).

### 2팀 — Task 024

`src/lib/sim/ability/modifiers.ts` 신규. 개별 계수 8종(condition/fitness/injury/familiarity/home/weather/manager/position) + 합성 `combineAbilityModifiers` = 9개. 공유 진입점 `clampAbilityModifier`가 **유일한 클램프 지점**.

- 8개 개별 함수는 **중립값 1.0을 클램프해 반환하는 자리표시자** — 실제 공식은 18(컨디션·피로·캐미)·19(포지션)·20일차(날씨·감독)에 채움. 조기 확정으로 담당 일차 판단을 앞지르지 않기 위한 의도적 공백(TODO 주석 명시).
- 클램프 경계는 `gk-fallback.ts`(D-22, I-83)와 동일한 **안전 기본값 export + options override** 패턴. `SimConstantSnapshot`(E-44) 주입 전까지 기본값 사용.
- `modifiers.test.ts` 36 tests — 하한·상한·경계값·override·`min>max`·NaN 전건 통과.

### 3팀 — Task 007

`src/lib/mock/fixtures/` 신규 6파일(`schedule` / `states` / `screens` / 테스트 2 / `index`).
- `schedule.ts` — 서클법 더블 라운드로빈 **풀 일정 생성 + `FINISHED` 경기만 집계해 순위표 역산**.
- `states.ts` — 4상태 제네릭 빌더(`Result<T>` 경유).
- `screens.ts` — **11개 화면**의 4상태 픽스처(완전 8 + 부분 2). LOADING/EMPTY/ERROR는 화면 무관 공통 모양이라 실작업은 화면별 "정상" 표본 조립.

### 4팀 — Task 011 (계속, 22일차까지)

`src/i18n/keys.ts` + `keys.type-test.ts` 신규.
- 네이밍 규약 `<namespace>.<component|screen>.<element>` 명문화. 기존 8개 네임스페이스 전량이 이미 이 3단 구조임을 실사 확인.
- **codegen 스크립트 대신 `messages.ko`에서 TS 재귀 조건부 타입(`DotPath`)으로 `TranslationKey` 유니온을 직접 파생.** 근거: pre-commit 훅이 없어 codegen 재실행을 강제할 수 없고, 잊으면 stale 타입이 "없는 키를 통과시키는" 역효과를 낸다. 재귀 타입은 카탈로그와 같은 컴파일에서 항상 동기화.
- 수락 기준("없는 키 → 타입 오류")을 `@ts-expect-error` 4건으로 **실측 고정**(오탈자·미존재 네임스페이스·부분 경로 전부 실제 오류로 확인).

### 6팀 — Task 032

`src/lib/data/database.types.ts`(39테이블, 생성) + `src/lib/data/supabase/mapper.ts` 신규.
- DB Row → 도메인 타입 **단방향** 매퍼, 38개 엔티티 전량 커버(테이블당 함수 1개).
- 브랜드ID/시드/Points는 브랜드 캐스트, jsonb는 `asJson`/`asJsonOrNull` 헬퍼, 34속성/56필드 공유 블록은 헬퍼로 중복 제거. `TeamSeasonStat`은 DB 평탄 컬럼 → `homeRecord`/`awayRecord`/`biggestWin`/`biggestLoss` 중첩 재구성.
- **범위 밖(명시)**: 배팅·사용자(E-33~E-40)는 대응 테이블 미마이그레이션(2차 릴리스). `DataSource.ts` 조합 DTO는 Task 034(어댑터) 소관.

## 4. 팀장 검증에서 발견된 결함

**코드 결함 0건.** 게이트 6종 전부 통과, 재수정 라운드 없음.

검증 중 확인한 사항 2건:
- 6팀이 보고 시점에 관측한 lint 경고(`src/lib/mock/fixtures/screens.ts:132`)는 3팀 작업 완료 시점에 해소됨 — 최종 게이트에서 재확인 결과 경고 0. **동시 작업 중 타 팀 파일 관측이라 실결함 아님**(I-104 계열 간섭 패턴, 조치 불요).
- 1팀 신규 sim 룰이 2팀 신규 `modifiers.ts`를 깨지 않는지 교차 확인 — lint clean.

**6팀 이슈 후보는 팀장이 DB 원본을 조회해 실결함으로 확정** → I-110 등재(아래).

## 5. 신규/갱신 이슈

| 이슈 | 내용 | 처리 |
|---|---|---|
| **I-106** | 순위표 라운드 가정 | **부분 해소** — `schedule.ts` 풀 일정 역산으로 신규 경로는 해소. `progress.ts`의 `generateStandings`는 별개 목적("진행 중 스냅샷 전용")이라 존치. **잔여: 18일차 MockDataSource의 `getStandings`를 `schedule.ts` 파생값으로 배선**하면 완전 해소 |
| **I-110** (신규) | `team_season_stat` **동반 null 불변식이 DB에서 강제되지 않음** — 매퍼가 캐스트로 가정. 팀장이 `pg_constraint` 직접 조회 → CHECK는 금액 범위 8건 + `competition_type` 1건뿐, 동반 null 제약 **없음**(확인됨) | **18일차 6팀 판정** — `num_nonnulls(...) IN (0,4)` CHECK 추가(권장) vs 매퍼 런타임 방어 |
| **I-111** (신규) | 4상태 픽스처 **미커버 화면 8종**(FR-UI-001·012·013·015~019·025·026) — 대응 Mock 엔티티 생성기 부재 | **일정 확정 필요** — 5팀 화면 일정과 역산 |

2팀의 "날씨·포지션 로직 파일 분리 여부"는 `modifiers.ts` TODO 주석에 담당 일차와 함께 기록돼 있어 **별도 등재 불요**(19·20일차 담당자가 그날 재판단). 4팀의 codegen 대안도 `keys.ts` 주석에 판단 근거·재검토 조건이 남아 있어 등재 불요.

## 6. advisors 이월 현황 (Task 032, 기한 18일차)

| 항목 | 16일차 | 17일차 | 비고 |
|---|---|---|---|
| `auth_rls_initplan` | 41 | 41 | **미착수 — 18일차 기한, 남은 1일** |
| `multiple_permissive_policies` | 170 | 170 | **미착수 — 18일차 기한, 남은 1일** |
| `unused_index` | 73 | 73 | Task 042 이관 확정, 미접촉 |

6팀은 오늘 확인만 하고 미착수(주 작업이 타입·매퍼였음). **18일차에 반드시 소화해야 하는 최우선 항목.**

## 7. 다음 일차(18일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | Task 010 계속(19일차까지) — 남은 항목: UI 하드코딩 문자열 검출 룰(D-18), 숫자 리터럴 잔존 검사, 커밋·PR 체크리스트, ISSUES 갱신 규약. sim 룰은 여전히 **멤버 접근만 차단** — `const { random } = Math` 구조분해·`new Date()` 우회 가능(수락 기준 밖) |
| **2팀** | Task 024 계속 — 18일차에 **컨디션·피로·캐미 3종 실공식**을 `modifiers.ts` 자리표시자에 채움(`M = 0.70+0.30×(C−1)/9` 등 TODO 주석 참조). 클램프 진입점은 이미 단일화돼 있으니 새로 만들지 말 것 |
| **3팀** | Task 007 계속 — **18일차 MockDataSource의 `getStandings`를 `schedule.ts` 파생값으로 배선**(I-106 완전 해소 조건). **I-111** 미커버 화면 8종 일정 확정. **I-107**(브래킷 부전승)은 5팀 착수 전 |
| **4팀** | Task 011 계속(22일차까지) — 번역 함수 API(`t()`)·로케일 Provider, 열거형 표시명 카탈로그(3팀 지원), 날짜·숫자 서식, 로케일 스위처. i18n 라이브러리는 여전히 미설치(런타임 의존성 3개) |
| **6팀** | **⚠️ advisors 성능 2종이 18일차 기한 — 최우선.** 추가로 **I-110**(`team_season_stat` 동반 null CHECK) 판정. 관계 R-06(Sponsor↔Team) 삭제정책은 별도 일정 |
| **전 팀** | `R-*` 인용 시 체계 명시("리스크 R-06" / "관계 R-04") — I-109 |
| **팀장** | ⓐ 게이트 직후 `git status` 재확인 후 커밋 ⓑ **팀원 이슈 후보는 원본(DB·문서) 직접 대조 후 등재**(오늘 I-110이 이 절차로 확정됨) ⓒ 병렬 팀이 타 팀 미완 파일을 관측해 오탐 보고하는 패턴 존재 — 최종 게이트로 재판정 |

## 8. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **auth_rls_initplan 41 / multiple_permissive_policies 170** | 미착수 | **18일차(Task 032 종료) — 남은 1일** |
| **I-110** | `team_season_stat` 동반 null CHECK 부재(확인됨) | 18일차 6팀 |
| **I-106 잔여** | `getStandings` → `schedule.ts` 배선 | 18일차 3팀 |
| **I-111** | 미커버 화면 8종 픽스처 일정 | 5팀 착수 역산 |
| **I-107** | 브래킷 부전승·컵 라운드 축소 | 5팀 브래킷 화면 착수 전 |
| **날씨·포지션 계수 파일 분리** | `modifiers.ts` 잔류 vs `tactics.ts`/`position.ts` 분리 | 19·20일차 담당 판단 |
| **unused_index 73** | 회수 검토 이관 | Task 042(58~62일차) |
| **관계 R-06 삭제정책** | Sponsor↔Team, ON DELETE RESTRICT 미확정 | 별도 일정 |
| **I-109** | `R-*` 접두사 중복 — `REL-*` 개명 여부 | 낮은 우선순위 |
| **I-100** | `bet` 계열 인덱스 2건 | 해당 테이블 생성 Task |
| **I-102** | `is_event_elapsed()` 실판정 로직 | 2팀 H-24(30일차) |
| **I-101** | 확장자 경로 404 UI 통일 여부 | Task 014(34~38일차) |
| **SKILL.md 교체** | 14일차부터 이월, 사용자 판단 대기 | — |
| **Playwright 콘솔 스모크** | Chrome 확보 필요, 13일차부터 이월 | — |
