# 20일차 (2026-08-17, 월)

## 1. 참여 팀

| 팀 | Task | 산출 경로 | 수락 기준 |
|---|---|---|---|
| **1팀** 코어품질 | 044 | `.github/workflows/ci.yml` | 3단 게이트가 CI에서 실행 |
| **2팀** 시뮬레이션엔진 | 024 | `src/lib/sim/ability/tactics.ts` | 숫자 리터럴 0건 |
| **3팀** 데이터밸런싱배당 | 029 | `src/lib/economy/ledger.ts` | 원장 없는 잔고 변동 0건 |
| **4팀** UI기반i18n | 011 | `src/i18n/format.ts` | 포맷터 단일 소스 |
| **6팀** DB인프라 | 034a 1/3 | `src/lib/data/supabase/**` | 2개 메서드 구현 |

**5팀 미참여** — 팀 md에 20일차 행 없음.

## 2. 최종 게이트

`npm run gate` 통과 (I-117 이후 마감 검증은 `test`가 아닌 `gate`로 고정).

- `tsc --noEmit` 오류 0 / `lint` 오류 0 (경고 111건은 D-18 기지 상태, I-116 — 새 경고 아님)
- 테스트 전체 통과, coverage **lines 98.05% / branches 92.14%** (임계 80/70 상회)
- `npm run check:literals` exit 1, 후보 55건 — **전부 기존 파일**, 오늘 산출물 0건 (advisory)

## 3. 팀별 산출물

**1팀 (Task 044)** — `ci.yml` 신규. push/PR(master) → ubuntu-latest → checkout@v4 → setup-node@v4(node 20, npm 캐시) → `npm ci` → `npm run gate`. 로컬 게이트와 CI가 갈라지지 않도록 `gate` 단일 호출로 통일. WSL EPERM(I-62) 때문에 `next build`는 미포함.

**2팀 (Task 024)** — 날씨 `M_weather`(FR-MT-006)·감독 성향 `M_manager`(FR-MT-009 6×6)를 `tactics.ts`로 구현. `WEATHER_EFFECT`/`MANAGER_MATCHUP`은 3팀 로더(`loadConstants`) 경유, 리터럴 0건.
- **`modifiers.ts` 분리 판단(19일차 인계 숙제) → 분리 확정.** 19일차 포지션 계수 판단(그래프 BFS)을 승계하지 않고 "공통코드 로더 의존"이라는 별도 축으로 재판단했다. `WEATHER_EFFECT`/`MANAGER_MATCHUP`은 `fallback.ts`에 구체 숫자·JSON 구조 자체가 없어(36일차 소관) 안전 기본값을 선언할 수 없고, 억측 금지 원칙상 로더를 반드시 거쳐야 한다. `options?.table ?? loadConstants(group)` 패턴으로 override 시 순수함수 유지. 미등록 시 `ConstantSourceUnavailableError`를 삼키지 않고 전파(부트스트랩 누락 은폐 방지).
- `modifiers.ts`에서 `weatherModifier`/`managerModifier` 제거, `NEUTRAL_MODIFIER` export, 테스트 이관.

**3팀 (Task 029)** — `postPointTransaction(currentBalance, input)` 단일 진입점만 잔고 변동을 만들고 항상 `PointTransaction` 레코드 + `balanceAfter`를 함께 반환. **잔고를 직접 바꾸는 함수 자체를 만들지 않아** 수락 기준을 구조적으로 강제. `deriveBalance(transactions)`로 원장 합 = 잔고 항등식(NFR-QA-005) 검증. DC-08 위반 시 `NonIntegerPointsError`. ID/Timestamp는 호출자 주입(NFR-DT-001 관례).

**4팀 (Task 011, 계속·22일차까지)** — `formatKickoff`(time/dateTime/date)·`formatPoints`·`formatOdds` 3함수를 `Intl.*` 기반 단일 포맷터로 구현(DC-07). `enums.ts` 합류·Provider 실배선은 22일차 몫이라 미착수.

**6팀 (Task 034a 1/3)** — `getStandings`/`getFixturesByRound` 구현.
- **`@supabase/*` 미설치 제약 대응**: 기존 `supabase/**`에 선례가 없음을 확인하고 **클라이언트 주입 인터페이스(`client.ts`)를 최초 설계**. `from/select/eq/order/limit/maybeSingle` + thenable duck-typing으로 최소 정의해 실제 패키지 설치 후에도 구조적 호환.
- `DataSource` 시그니처 불변. 2/3 잔여로 전체 implements 불가해 `implements Pick<DataSource, ...>`, `factory.ts` 미등록(전체 구현 후).
- `mapper.ts` 재사용(`mapStandingRow`/`mapFixtureRow`/`mapSeasonRow`), 새 매퍼 0개. 브랜드 캐스트는 `mapper.ts`에만 국한.
- `client.ts`의 `select()` 컬럼 프로젝션 미지원은 헤더에 "범위 밖"으로 명시(034a 2/3 참고용).

## 4. 팀장 검증에서 발견된 결함

**결함 A — `check:literals`가 게이트/CI 어디에도 연결되지 않음 → 해소**

2팀 Task 024의 수락 기준이 문자 그대로 "숫자 리터럴 0건 **(CI 검증)**"인데, 1팀이 작성한 `ci.yml`과 `gate.sh` 어디에도 `npm run check:literals`가 없었다. **19일차에 막 해소한 I-117(게이트 미연결)과 정확히 같은 결함 계열** — 스크립트는 있는데 게이트가 부르지 않는 상태.

단 그냥 blocking으로 넣는 것은 오답이다. 팀장이 직접 확인한 사실: ⓐ 현재 exit code 1, 후보 55건이며 **전부 오늘 산출물이 아닌 기존 파일**, ⓑ 스크립트 자신의 출력이 "휴리스틱 검사이므로 1팀 리뷰 대상 후보"라고 명시 — 성격이 advisory다. blocking으로 넣으면 첫 CI부터 빨간불이고 그 원인은 오늘 아무도 만들지 않은 55건이 된다.

→ **비차단 advisory 스텝으로 연결**하도록 1팀에 피드백. `ci.yml`에 `check literals (advisory)`(`continue-on-error: true`) 추가, **`gate.sh`는 미변경**(로컬 머지 게이트는 fail-fast 3단이 정본이며 advisory를 섞으면 게이트 의미가 흐려짐). I-115 allowlist 정리 후 blocking 승격이 최종 목표임을 주석에 명시. 재검증 통과.

**통과 확인 항목(결함 없음)**

- `weatherModifier`/`managerModifier` 제거 후 **잔존 참조 0건**(주석 2건만) — 2팀의 파괴적 변경이 타 팀 코드를 깨뜨리지 않음
- 신규 파일 전체 `@/types` 서브경로 직접 import **0건**(체크리스트 C-5·C-6)
- `tactics.ts`/`ledger.ts`에 `Math.random()`/`Date.now()`/`react`/`@supabase/*` 실사용 **0건**(주석 언급만, NFR-DT-001)
- `src/**`에서 `toLocaleString`/`Intl.*` 직접 호출이 `src/i18n/format.ts` 외 **0건** — 4팀 포맷터 단일 소스 성립
- `tactics.ts`가 `check-literals` 검사 대상 11파일에 포함되며 후보 **0건**
- `ci.yml` YAML 파싱 검증: 5개 스텝, advisory 스텝 `continue-on-error: true` 확인

## 5. 신규/갱신 이슈

| 건 | 내용 |
|---|---|
| **I-118** 신규 | `WEATHER_EFFECT[weather]`의 조회 키 `ABILITY_MULT`를 20일차 2팀이 처음 정함. 36일차 시드 작성자와 정렬 필요 — 다른 키로 시드되면 런타임에 조용히 어긋남 |
| **I-119** 신규 | FR-MT-009의 "성향 자체 xG 배율"·"숙련도 실현율" 소관 미배정. **팀장 확인 결과 `ROADMAP.md`에 "xG" 문자열 0건 — Task 행 자체가 없는 스코프 누락**(스펙은 존재) |
| **I-115** 갱신 | CI에 advisory로 연결됨(결함 A 조치). `gate.sh`에는 여전히 미연결, allowlist 보강 후 blocking 승격이 목표 |

## 6. 다음 일차(21일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | Task 044 **종료**. CI는 아직 GitHub Actions 러너에서 **실행된 적이 없다** — push 후 첫 실행 결과를 반드시 확인할 것(로컬 검증은 YAML 파싱 + `npm run gate`까지만) |
| **2팀** | Task 024의 20일차분(날씨·감독) 종료. **실제 숫자는 36일차(031a) 시드 이후 자동 반영** — 그전까지 이 경로는 로더 미등록 시 `ConstantSourceUnavailableError`로 죽는 것이 정상 동작. I-118 정렬 책임 있음 |
| **3팀** | Task 029 원장 코어 완료. 원장의 **영속화(DB 반영)는 6팀 DataSource 경계 너머**이며 아직 배선 없음 |
| **4팀** | Task 011 계속(22일차까지) — 로케일 스위처, `enums.ts`의 `../index.ts` 합류, Provider 실배선이 22일차 몫. **D-18 경고 111건 해소가 22일차 수락 판정 대상** |
| **5팀** | 20일차 미참여. H-06 ESLint 가드레일 인수 상태 유지, 잔존 111 경고는 D-18 기지 상태(I-116) |
| **6팀** | **034a 2/3 착수** — `client.ts`의 `select()` 컬럼 프로젝션 미지원이 범위 밖으로 남아 있으니 필요해지면 그때 확장. `factory.ts` 등록은 3/3 완료 후 |
| **팀장** | ⓐ 22일차에 1팀 Task 010 lint 수락 기준 **재판정** 필요(19일차 §4-B 이월) ⓑ **I-119 Task 행 신설 배정**이 팀장 몫 — 2팀 H-24(30일차) 착수 전 확정 ⓒ 마감 검증은 계속 `npm run gate`(I-117) ⓓ `check:literals`는 이제 CI advisory이나 **exit 1이 정상 상태**라 경고 신호를 무시하는 습관이 들 위험 — I-115 정리를 방치하지 말 것 |

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **1팀 lint 경고 0 수락 기준** | 조건부 충족 — D-18 111건이 Task 011에 종속 | **22일차 재판정(팀장)** |
| **I-119** | xG 배율·숙련도 실현율 Task 행 누락 | **팀장 배정, 30일차 전** |
| **I-118** | `ABILITY_MULT` 키 정렬 | 36일차(031a) 시드 작성 시 |
| **I-111** | 미커버 화면 10종 중 6종이 소관 미배정 | 5팀 착수 역산, 팀장 배정 |
| **I-115** | `check-literals.mjs` allowlist (CI advisory 연결됨, blocking 미승격) | 1팀, 급하지 않음 |
| **CI 첫 실행 결과** | 미확인 — 러너에서 한 번도 돌지 않음 | **21일차 1팀** |
| **I-107** | 브래킷 부전승·컵 라운드 축소 | 5팀 브래킷 화면 착수 전 |
| **I-102** | `is_event_elapsed()` 실판정 로직 (현재 `select true` 스텁) | 2팀 H-24(30일차) |
| **I-101** | 확장자 경로 404 UI 통일 여부 | Task 014(34~38일차) |
| **I-100** | `bet` 계열 인덱스 2건 | 해당 테이블 생성 Task |
| **unused_index 73** | 회수 검토 이관 | Task 042(58~62일차) |
| **I-112** 승인됨(인증 도입 시 재검토) · **I-109** 낮은 우선순위 · **관계 R-06** 삭제정책 미확정 | 비차단 | 별도 일정 |
| **SKILL.md 교체**(14일차~) · **Playwright 콘솔 스모크**(13일차~, Chrome 필요) | 이월 | 사용자 판단 대기 |
