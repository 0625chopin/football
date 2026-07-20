# 21일차 (2026-08-18, 화)

## 1. 참여 팀

| 팀 | Task | 산출 경로 | 수락 기준 |
|---|---|---|---|
| **1팀** 코어품질 | 044 | `.github/workflows/ci.yml` | 스냅샷 변경이 PR diff에 노출 |
| **2팀** 시뮬레이션엔진 | 024 | `src/lib/sim/lineup/select.ts` | 부상·정지 선수 선발 0건 |
| **3팀** 데이터밸런싱배당 | 029 | `src/lib/economy/valuation.ts` | 최저 몸값 ≥ 100pt |
| **4팀** UI기반i18n | 011 | `src/i18n/README.md` | 경계 문서화 |
| **6팀** DB인프라 | 034a 2/3 | `src/lib/data/supabase/**` | 4개 메서드 구현 |

**5팀 미참여** — 팀 md에 21일차 행 없음(20일차에 이어 2일 연속).

## 2. 최종 게이트

`npm run gate` 통과 — `tsc` 0 / `lint` 0 error(경고 111은 D-18 기지, I-116) / 689 tests / coverage **lines 97.9% · branches 92.09%**.

**CI 첫 실행 결과는 여전히 미확인** — 이 환경에 `gh` CLI가 설치돼 있지 않아 GitHub Actions 러너 결과를 조회할 수단이 없다. 20일차 인계에 "21일차 확인"으로 넘겼으나 **확인 수단 부재로 이월**한다.

## 3. 팀별 산출물

**1팀 (Task 044)** — 시드 스냅샷 갱신 차단 + 번역 키 누락 검사 편입.
- **번역 키 검사: 별도 스크립트를 만들지 않았다.** 4팀 `keys.ts`의 재귀 조건부 타입 + en 8파일의 `: XMessages` 타입 주석으로 **`tsc`가 이미 missing/excess 키를 잡는다**는 것을 실측 확인(en에서 키 삭제 → TS2741, 없는 키 추가 → TS2353). gate 1단계가 이미 커버하므로 중복 구현을 회피했다.
- **시드 스냅샷**: vitest 4.1.10이 std-env `isCI` 감지로 CI에서 이미 `updateSnapshot="none"`이 기본값임을 node_modules 소스로 확인하고, 스냅샷을 고의 변조해 `CI=true npx vitest run`으로 실패 + 파일 미변경을 재현했다. **암묵적 기본값에 의존하지 않도록 `env: UPDATE_SNAPSHOT: none`을 명시 고정**(신규 로직이 아니라 기존 동작을 diff로 드러낸 것).
- 발견한 구멍은 `src/i18n/**`가 4팀 소유라 직접 반영하지 않고 **I-120**으로만 제보.

**2팀 (Task 024)** — `selectLineup()`. 가용성(부상·정지) 배제 후 컨디션×피로×포지션 합성 점수로 선발 11(그리디 슬롯 배정) + 벤치 7(GK≥1 우선 확정). `modifiers.ts`/`position.ts` 계수는 **재구현 없이 호출만**.
- 정지 상태는 새 필드를 만들지 않고 기존 `PlayerState.suspensionRemainingLeague/Cup`을 사용. `CompetitionType` 4종 → 2분류 매핑은 025/026 소관이라 추측하지 않고 입력(`suspensionCompetition`)으로 위임.
- **로테이션 정책은 부분 충족** — `PlayerState`에 출전 이력 필드가 없어(8일차 동결) 이력 기반 로테이션 불가. `fitnessModifier` 페널티로 자연 유도 + 동점 시 `playerId` 오름차순 결정론만 적용 → **I-123**.

**3팀 (Task 029)** — `calculateMarketValue()`. 20일차 `ledger.ts` 관례 + 2팀 `tactics.ts`의 `override ?? loadConstants` 패턴 승계.
- `MARKET_VALUE_PARAM` 중 `OVR_DIVISOR`/`OVR_EXP`/`POT_STEP`/`REP_BASE`/`REP_STEP`/`FLOOR` 6개는 `fallback.ts`에 안전 기본값이 있어 그대로 사용. `AGE_*`/`CONTRACT_*`/`TIER_*`는 05문서 원본부터 숫자가 없어 폴백도 비어 있으므로 키 없으면 중립값(배율 1) 처리.
- 반올림은 `Math.round`(floor/ceil은 계통적 편향, DC-08은 방향 미지정). **하한은 `Math.max(rounded, floor)`를 배율 로직과 완전히 분리된 마지막 줄로 고정**하고, `ovr` 음수 입력 시 `NaN` 전파로 하한이 뚫리는 것을 `Math.max(0, ovr)`로 방어.
- 테스트 13건 — 최악 입력 조합(음수 OVR/명성/계약, OVR 0, 미정의 티어) 전수 ≥100 고정.

**4팀 (Task 011)** — `src/i18n/README.md` 신규. D-18 번역 경계를 실행 가능한 규칙으로 확장.
- 애매 사례 3종 명문화: ⓐ enum 표시명(유한 집합, 번역함) vs 시드 고유명사(개방형, 번역 안 함) ⓑ 파라미터 치환 방향(템플릿만 번역 + 원문 주입 vs 값도 번역) ⓒ 고유명사+수치가 섞인 완성 문장(headline)은 카탈로그에 아예 넣지 않음.
- **자동/사람 검출 구분표** — `tsc`(키 구조·3단 경로·enum 멤버 커버)와 ESLint D-18(JSX 하드코딩 텍스트)이 각각 무엇을 잡고 무엇을 못 잡는지(고유명사 오탐, 속성값 사각지대, 콘텐츠 경계 미판별) 구분. 1팀의 CI 편입 작업과 맞물린다.

**6팀 (Task 034a 2/3)** — `getFixture`/`getPlayerProfile`/`getTeam`/`getPlayerStatRanking` 4개 구현.
- `client.ts` **미확장** — 4개 모두 `select('*')` 단건/전량 조회로 충분해 컬럼 프로젝션이 불필요했다(20일차에 "범위 밖"으로 남긴 항목이 오늘은 필요 없었음).
- `getPlayerStatRanking`의 출전율 분모·정렬을 Mock(H-07)과 동일하게 맞춤. `minAppearancePct` 기본값은 `loadConstants('UI_PARAM')` 경유.
- 메서드 선정 기준(구역별 진입점 1개씩)이 스케줄표에 없어 임의 판단 → 팀장 승인, **I-126**.

## 4. 팀장 검증에서 발견된 결함

**결함 A — 프로덕션 Supabase 어댑터가 Mock 스택에 의존 → 해소**

6팀이 `getPlayerProfile`에서 `pa`→`scoutRating` 변환을 재구현하지 않으려고 `SupabaseDataSource.ts`에서 `@/lib/mock/fixtures/screens`의 `toPublicProfile`을 import했다. 그런데 `screens.ts`는 상단에서 `generateMockWorld`·`generateMockProgress`·`generateSeasonSchedule`·`buildFourStates`를 정적 import한다 — **프로덕션 데이터 어댑터의 모듈 그래프에 Mock 월드 생성기 스택 전체가 들어온다.** Task 034의 존재 이유(플래그로 Mock↔실데이터 교체, 최종적으로 Mock 분리 가능)와 정면 충돌한다.

**6팀의 잘못이 아니다.** 근거로 인용한 `screens.ts` 주석을 팀장이 직접 읽은 결과 "**18일차 `MockDataSource`가 그대로 재사용한다** — 어댑터 쪽에서 재구현하지 않는다"였다. 이 허용은 **Mock 어댑터**를 가리키지 프로덕션 어댑터를 덮지 않는다. 6팀이 그 차이를 감지해 **스스로 판단을 물어온 것**이라 절차는 정확했고, 재구현 대신 재사용을 택한 판단 자체도 옳았다 — 문제는 함수가 놓인 **위치**였다.

**조치**: 소유 경로가 1·3·6팀에 걸쳐 있어 팀장이 **교차 경로 편집을 명시적으로 승인**하고 1팀에 배정(3·6팀에는 통보, 6팀에는 import 줄을 건드리지 말고 대기하도록 지시해 동시 편집 충돌 방지). `toScoutRating`+`toPublicProfile`을 **Mock 비의존 신규 모듈 `src/lib/data/player-profile.ts`로 추출**하고 `screens.ts`에서 제거했다 — **재export를 남기지 않았다**(남기면 결합이 그대로다).

**팀장 재검증(직접 실행)**: `grep -rn "lib/mock" src/lib/data/supabase/` → **0건**. `player-profile.ts`의 import는 `@/types`와 `./DataSource` 2개뿐. `screens.ts`는 이제 반대 방향으로 `@/lib/data/player-profile`을 import한다 — **의존 방향이 `data → mock`에서 `mock → data`로 올바르게 뒤집혔다.** `npm run gate` 통과(689 tests, lines 97.9%).

**통과 확인 항목(결함 없음)**

- 2팀 `LINEUP_STARTER_COUNT = 11`이 `check:literals`에 신규 1건으로 걸리나, `substitution.ts`의 `MAX_SUBSTITUTIONS_PER_TEAM = 5`와 같은 **구조 상수**(축구 규칙)로 우연 일치가 맞다 — 밸런싱 파라미터가 아니다
- 2팀 로테이션 판단 실증: `src/types/person.ts:211` `PlayerState`에 출전 이력 필드 부재 확인. `src/types/stat.ts:54` `appearances`는 시즌 누적이라 대체 불가 — **억측으로 필드를 만들지 않고 멈춘 것이 옳다**
- 1팀의 "번역 키 검사 중복 구현 회피" 판단 — 이미 `tsc`가 커버함을 실측으로 입증한 근거가 타당
- 3팀 하한 100pt가 배율 로직과 분리된 마지막 줄에 있어 **어떤 배율 조합으로도 뚫리지 않는 구조**

## 5. 신규/갱신 이슈

| 건 | 내용 |
|---|---|
| **I-120** 신규(1팀) | 번역 키 검사가 "en 파일이 `: XMessages` 주석을 유지한다"는 관례에만 의존, 중앙 강제 장치 없음 |
| **I-121** 신규(팀장) | **I-118 일반화** — 소비 측이 공통코드 키 이름을 시드보다 먼저 확정하는 패턴이 **이틀 연속 2개 팀**에서 반복(20일차 `ABILITY_MULT`, 21일차 `AGE_*`/`CONTRACT_*`/`TIER_*`). 개별 이슈로 쌓으면 36일차에 추적 불가 → **주석 태그 통일로 grep 수집 가능하게** |
| **I-122** 신규(3팀) | `MARKET_VALUE_PARAM.OVR_DIVISOR`가 곱셈 스케일로 쓰임 — 이름-용법 불일치 |
| **I-123** 신규(2팀+팀장) | `PlayerState`에 출전 이력 필드 부재로 이력 기반 로테이션 불가(타입 동결, C-7 배치 필요). **Task 024 "로테이션 정책"은 부분 충족 기록** |
| **I-124** 신규(2팀) | 라인업 슬롯 배정 그리디 — 결정론은 확보돼 재현성 문제 없음, 밸런싱 검증 단계에서만 재검토 |
| **I-125** 신규(4팀) | `docs/devStep/09` §2(객체 프로퍼티 체인)와 실제 `keys.ts`(점 문자열 + `DotPath`) 드리프트 |
| **I-126** 신규(6팀) | 034a 분할 행이 개수만 명시하고 메서드명 미지정 → **팀장이 "구역별 진입점 1개씩" 기준 승인** |
| **I-118** 갱신 | I-121로 일반화, 첫 사례로 유지 |

## 6. 다음 일차(22일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | Task 044 21일차분 종료. **⓵ 22일차에 Task 010 lint 수락 기준 재판정 대상**(4팀 D-18 해소 결과에 종속) ⓶ 잔여 044 항목: 시크릿 스캔, Edge Function 배포·롤백 문서화, 환경 분리 — 23일차까지 |
| **2팀** | Task 024 계속(24일차까지) — 잔여: 카드 누적 5장 정지 / 퇴장 1~3경기 정지(리그·컵 분리), 감독 공석 BALANCED 폴백(I-03). **I-123 판정은 025/026 착수 시점** |
| **3팀** | Task 029 계속(26일차까지) — 잔여: 급여 차감·성과 분배·스폰서 수입, 스폰서 엔티티·계약, 부도 판정, 재정 위기. **`src/lib/economy/`에 `ledger.ts`·`valuation.ts` 2파일 존재 — 관례 승계할 것** |
| **4팀** | **Task 011 마감일(22일차)** — 로케일 스위처 + 쿠키 영속화, `enums.ts`의 `../index.ts` 합류, **Provider 루트 레이아웃 실배선**, 그리고 **D-18 경고 111건 해소가 수락 판정 대상**. 오늘 쓴 `src/i18n/README.md`가 그 작업의 기준 문서 |
| **5팀** | 3일 연속 미참여. H-06 ESLint 가드레일 인수 상태 유지 |
| **6팀** | **034a 3/3** — 잔여 구역을 "진입점 1개씩" 기준으로 채우고(I-126 승인), **`factory.ts` 등록 + `implements Pick<...>` → `implements DataSource` 전체 전환을 그때 함께**. `SupabaseDataSource.ts`의 `toPublicProfile` import는 1팀이 `@/lib/data/player-profile`로 바꿔 뒀으니 그대로 쓸 것 |
| **팀장** | ⓐ **CI 첫 실행 결과 미확인이 2일째 이월** — `gh` CLI 부재가 원인이므로 확인 수단부터 정해야 한다(사용자 판단 필요) ⓑ 22일차 Task 010 lint 재판정 ⓒ **I-121 주석 태그 규약을 36일차 전에 확정**해야 매 일차 새 키가 추적 불가 상태로 쌓인다 ⓓ 프로덕션 코드가 `src/lib/mock/**`를 import하지 않는지는 **결함 A 재발 감시 대상** — ESLint 룰로 고정하는 것을 1팀에 검토시킬 만하다 |

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **1팀 lint 경고 0 수락 기준** | 조건부 충족 — D-18 111건이 Task 011에 종속 | **22일차 재판정(팀장)** |
| **CI 첫 실행 결과** | **미확인 2일째** — `gh` CLI 부재로 조회 수단 없음 | **확인 수단 결정 필요(사용자)** |
| **I-121** | 공통코드 키 선확정 패턴 — 태그 규약 미확정 | **36일차(031a) 전, 팀장** |
| **I-123** | 이력 기반 로테이션 필요 여부 | 025/026 착수 시점 |
| **I-119** | xG 배율·숙련도 실현율 Task 행 누락 | **팀장 배정, 30일차 전** |
| **I-118** | `ABILITY_MULT` 키 정렬 (I-121 첫 사례) | 36일차(031a) |
| **I-111** | 미커버 화면 10종 중 6종이 소관 미배정 | 5팀 착수 역산, 팀장 배정 |
| **I-115** | `check-literals.mjs` allowlist (CI advisory 연결됨, blocking 미승격) | 1팀, 급하지 않음 |
| **I-120** · **I-122** · **I-124** · **I-125** · **I-126** | 비차단(정보성·낮은 우선순위·승인 기록) | 별도 일정 |
| **I-107** | 브래킷 부전승·컵 라운드 축소 | 5팀 브래킷 화면 착수 전 |
| **I-102** | `is_event_elapsed()` 실판정 로직 (현재 `select true` 스텁) | 2팀 H-24(30일차) |
| **I-101** | 확장자 경로 404 UI 통일 여부 | Task 014(34~38일차) |
| **I-100** | `bet` 계열 인덱스 2건 | 해당 테이블 생성 Task |
| **unused_index 73** | 회수 검토 이관 | Task 042(58~62일차) |
| **I-112** 승인됨(인증 도입 시 재검토) · **I-109** 낮은 우선순위 · **관계 R-06** 삭제정책 미확정 | 비차단 | 별도 일정 |
| **SKILL.md 교체**(14일차~) · **Playwright 콘솔 스모크**(13일차~, Chrome 필요) | 이월 | 사용자 판단 대기 |
