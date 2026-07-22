# football4 — 가상 축구 리그 시뮬레이션 & 배팅 플랫폼 개발 로드맵

> **"플레이하지 않고, 지켜보고 예측한다."** — 24/7 자동 진행되는 3티어 가상 축구 세계를 관전하고(1차), 이후 배팅한다(2차).

- 문서 버전: v1.1 / 2026-07-20 (D-15 ~ D-18 결정 반영본)
- 근거 PRD: `docs/require/00~06` (요구사항 253건 / FR 163 · NFR 90 / 엔티티 E-01~E-47)
- 개발 원칙: `CLAUDE.md`(Mock First, `/sample` 쇼케이스, Mock↔DB 동일 타입), `AGENTS.md`(Next.js 16 문서 선확인)
- 팀 구성 상세: `docs/TEAM.md`
- **일정 동기화: 2026-07-20** / **최종 갱신 2026-09-25(49일차 종료 시점) — I-223 인덱스 화면 3종(Task 046~048) 정식 배정** / 적용 인원 **N = 6팀** / 시작일 **2026-07-21(화) = 1일차**
- **일정 문서(단일 소스): [`docs/team-schedule/`](docs/team-schedule/README.md)** — 전체 개요 `README.md` + 팀별 파일 6종
  - **스코프(Task·구현 사항·수락 기준·테스트·근거)의 단일 소스는 본 ROADMAP**이고, **일정·배정의 단일 소스는 일정 문서**다. 본 문서의 `**일정**` 줄은 일정 문서의 반영본이며, 값이 어긋나면 일정 문서가 옳다.

---

## 개요

### 대상 사용자

| 페르소나 | 설명 | 핵심 화면 |
|---|---|---|
| **PS-1 라이트 팬** | 모바일로 하루 3~5회, 회당 2~5분 관전 | 홈/라이브 센터, 순위표, 경기 상세 |
| **PS-2 데이터 덕후** | 데스크톱으로 주 2~3회, 회당 20~40분 심층 탐색 | 선수 상세, 클럽 상세, 통계 랭킹 |
| **PS-3 밸류 헌터(2차)** | 킥오프 30분 전 집중 접속, 정산 시점 재확인 | 마켓 목록, 베팅 슬립, 내 베팅 |
| **PS-4 운영자** | 상시 모니터링, 배포 없이 밸런스 튜닝 | 어드민 콘솔, 공통코드 관리, 크론 모니터 |
| **PS-5 개발자** | 컴포넌트 단위 개발, Mock↔실데이터 무통증 전환 | `/sample` 쇼케이스 |

### 핵심 가치 제안

1. **살아있는 세계** — 성장·부상·이적·계약·스폰서·유소년·은퇴가 매 시즌 돌아가는 지속 세계 (FR-PL / FR-TR / FR-EC / FR-YT)
2. **설명 가능한 시뮬레이션** — 분 단위 이벤트 로그가 스탯의 SSOT, "왜 그 결과인지"를 텍스트 중계로 제시 (FR-MT-001~003, FR-ST-005)
3. **결정론적 재현성** — 시드 + 상수 스냅샷 쌍으로 100% 재현. 배팅 신뢰의 기반 (NFR-DT 전량, FR-AD-014)
4. **깊이 있는 배팅 마켓** — 1X2부터 시즌 우승·승강·득점왕까지 몬테카를로 기반 배당 (FR-BT)
5. **코드 없는 밸런싱** — 튜닝 상수 37개 그룹 전량 DB 공통코드 외부화, 배포 없이 세계를 튜닝 (FR-AD-011~016, NFR-CFG) — **37개로 갱신(14일차 I-88 결정, `docs/ISSUES.md` 참조 — 국적/이름 비중 그룹 신규 추가)**

### 핵심 기능 (MVP 기준)

- 3개 리그(24/20/16팀) 더블 라운드로빈 + 통합 컵대회 + 플레이오프의 **24/7 자동 진행** (FR-LG)
- 분 단위 틱 **경기 시뮬레이션 엔진** (선계산 후 경과 시간 스트리밍 재생) (FR-MT)
- 선수 34속성 / 성장·부상·컨디션·피로 / 프리시즌 이적·계약 경제 (FR-PL, FR-TR, FR-EC)
- 전 화면 **4상태(정상/로딩/빈/에러)** + **다국어(ko/en)** 관전 UI, `/sample` 쇼케이스 (FR-UI, D-18)
- 공통코드 운영 콘솔 + Edge Function 크론 모니터 (FR-AD)

### 릴리스 ↔ Phase 매핑

| 릴리스 | 범위 | 대응 Phase |
|---|---|---|
| 🟢 **1차 MVP** — "돌아가는 세계와 관전 UI" | 인증·배팅 없이 자동 진행 + 관전 UI + 배당 표시(FR-BT-005/014) | **Phase 1 → Phase 2 → Phase 3** (Task 001~036) |
| 🟡 **2차** — "배팅 오픈" | FR-BT-001~013, FR-UI-015~017, 인증·지갑, RLS 전면 | **Phase 4** (Task 037~041) |
| 🔵 **3차** — "확장" | 캐시 충전, 인플레이 배팅, 리그4, 아카이빙 자동화 | **Phase 4 후반** (Task 045, 준비만) |

---

## 개발 워크플로우

### 1️⃣ 작업 계획

- PRD(`docs/require/`)에서 대상 FR/NFR/E-XX를 먼저 확정한다.
- 기술적 복잡도·의존성을 분석하고, **구조 → UI → 기능** 순서(Structure-First)를 지킨다.
- 착수 전 `docs/ISSUES.md`의 미결 질문이 해당 Task를 블로킹하는지 확인한다.
- Next.js 16 API를 쓰는 Task는 `node_modules/next/dist/docs/`의 해당 가이드를 **먼저 읽고** 참조 경로를 커밋 메시지에 남긴다 (NFR-MT-006).

### 2️⃣ 작업 생성

- 작업 문서는 `/tasks` 디렉터리에 **`XXX-description.md`** 형식으로 생성한다. (예: `002-define-domain-types.md`)
- 각 작업 문서는 다음 섹션을 반드시 포함한다.
  - `## 목표` — 한 줄 요약과 근거 요구사항 ID(FR/NFR/E-XX)
  - `## 담당` — 담당 팀원 번호·역할, 리뷰어
  - `## 구현 사항` — 체크리스트
  - `## 수락 기준` — 측정 가능한 완료 조건
  - **`## 테스트 체크리스트`** — Vitest 항목 + (API·비즈니스 로직이면) **Playwright MCP E2E 시나리오** 필수
  - `## 산출물` — 파일 경로 목록
- `/tasks` 파일은 해당 Task 착수 시점에 생성한다. (본 로드맵 작성 시점에는 생성하지 않는다.)

### 3️⃣ 작업 구현

- 구현 사항 체크리스트를 순차 완료하고, 완료할 때마다 `/tasks/XXX-*.md`의 체크박스를 갱신한다.
- **API 연동 및 비즈니스 로직 Task는 Playwright MCP로 실제 브라우저 검증을 수행**한다 (스냅샷·콘솔 에러 0건·네트워크 응답 확인).
- 머지 게이트: `npx tsc --noEmit` 오류 0 + `npm run lint` 경고 0 + `npm run test` 통과 (NFR-QA-010).

### 4️⃣ 로드맵 업데이트

- Task 완료 시 본 문서의 해당 Task에 `✅ - 완료`와 `See: /tasks/XXX-xxx.md`를 추가한다.
- Phase의 전 Task 완료 시 Phase 제목 뒤에 ✅를 붙인다.
- 상태 표기: `✅ - 완료` / `- 우선순위`(즉시 착수) / 표기 없음(대기)

---

## 팀 구성 및 업무 분담

> 상세 정의·핸드오프 규약·파일 소유권은 **`docs/TEAM.md`** 참조. 본 팀은 서브에이전트(agents team)로 실행된다.

### 실제 편성 — **6팀 (N = 6)**

> **원 편성(이력 보존)**: 최초 계획은 팀원 10명(1 시장 / 2 경쟁 / 3 예산 / 4 아키텍트 / 5 엔진 / 6 데이터 / 7 배팅 / 8 UI / 9 DB / 10 QA)이었고, 팀원 1~3의 사업 트랙은 ✅ 완료됐다. 잔여 7명분 역할을 **6팀으로 병합 재편**한 것이 아래 표다. 병합 근거·이관 사유는 [`docs/team-schedule/README.md`](docs/team-schedule/README.md) 2절 참조.

| # | 팀명 | 병합된 원 역할 | 주 담당 요구사항 | 총 공수 | 부하율 |
|---|---|---|---|---|---|
| **1** | **코어·품질팀** | 팀원 4(아키텍트) 일부 + 팀원 10(QA) 전량 + 팀원 7 일부(041) | E-01~E-47 타입, FR-UI-023·024, NFR-MT-001·002·005·008·009, NFR-QA 전량, NFR-SEC-004 | 27.0인일 | 77% |
| **2** | **시뮬레이션엔진팀** | 팀원 5 전량 | FR-LG-001~017, FR-MT-001~016, FR-ST-003·005, NFR-DT-001~008, NFR-PF-001~003·006 | 40.5인일 | **115% (최대 부하)** |
| **3** | **데이터·밸런싱·배당팀** | 팀원 6 전량 + 팀원 7 중 배당 산출(035) | FR-PL, FR-TM, FR-TR, FR-EC, FR-YT, FR-AW, FR-AD-011~016, FR-BT-005·006·014, NFR-CFG, NFR-OB, NFR-PF-004·005 | 38.5인일 | 109% |
| **4** | **UI기반·i18n팀** | 팀원 8 중 기반·디자인시스템 + 팀원 4 중 라우트 골격(005) | FR-UI-000·001·008~014·020·021·025·026, D-18, NFR-RS, NFR-A11Y | 35.75인일 | 101% |
| **5** | **화면·배팅UX팀** | 팀원 8 중 화면·운영콘솔 + 팀원 7 중 배팅 UX·정산(039·040) | FR-UI-002~007·015~017·019, FR-AD-001~005, FR-BT-001~004·007·009~013, FR-ST-001·002 | 35.25인일 | 100% |
| **6** | **DB·인프라팀** | 팀원 9 전량 + 팀원 3(예산·요금제 입력) + 팀원 4 일부(045) | E-01~E-47 물리 스키마, FR-AD-017~022, NFR-CR, NFR-SEC-001~003·006~012, NFR-SC, NFR-PF-008·011~014 | 34.5인일 | 98% |

**합계 211.5인일** (평균 35.25인일 = 부하율 100%). 1팀의 77%는 낮아 보이지만 24~68일차의 **상시 리뷰 게이트 45일**이 공수에 계상되지 않은 결과다.

> **병합 경고 — 원 팀원 7(배팅/배당)은 전담 팀을 잃고 3곳으로 흩어졌다.** 035→3팀 / 039·040→5팀 / 041→1팀. `src/lib/odds/`(3팀)와 `src/lib/betting/`(5팀)의 **경계 계약을 40일차까지 문서로 고정**해야 한다.

### Phase별 업무 분담 매트릭스 (◎ 주담당 / ○ 지원 / – 미참여)

| Phase | 1 코어·품질 | 2 시뮬엔진 | 3 데이터·밸런싱·배당 | 4 UI기반·i18n | 5 화면·배팅UX | 6 DB·인프라 |
|---|---|---|---|---|---|---|
| **Phase 1 골격** | ◎ 001·002·004·008·010 | ◎ 006 | ◎ 003·007 / ○ 011 | ◎ 005·011 | – (선행 준비) | ◎ 009 |
| **Phase 2 UI** | ○ 022 리뷰 | – | ○ 021(공통코드 스키마) | ◎ 012·013A·014·019·020·022 | ◎ 013B·015·016·017·018·021 | – |
| **Phase 3 기능** | ◎ 036 | ◎ 023~028 | ◎ 029·030·031·035 | ○ 034 검증 | ○ 034 검증 | ◎ 032·033·034 |
| **Phase 4 고급** | ◎ 041·044 | ○ 042 | ◎ 043 | ○ 039(번역 카탈로그) | ◎ 039·040 | ◎ 037·038·042·045 |

---

## 개발 단계

### 🚦 착수 게이트 현황 — **선행 결정 게이트 없음**

> **D-15 ~ D-20으로 1차 릴리스 전 단계(1~9단계)의 블로킹 게이트가 전부 해소됐다.** Phase 1부터 순차 착수 가능하며, 어떤 Task도 결정 대기 상태가 아니다.

| 결정 | 내용 | 영향 |
|---|---|---|
| **D-15** | **월드는 단일 운영으로 확정** (구 Q-08) | `E-01 World`는 단일 레코드 전제. 전 쿼리 `world_id` 스코핑·월드 스위처 UI는 **범위 밖**(향후 확장 여지로만 유지). 구 가정 AS-09는 확정 사항으로 승격 |
| **D-16** | **FM 실데이터 미사용 확정** (구 AS-02) | 참고 대상은 능력치 체계(1~30 스케일·카테고리 구성)뿐. 실명 선수·실존 클럽·엠블럼, FM 파일 임포트, 스크래핑, 외부 축구 데이터 API 연동 전부 범위 밖. 전 데이터 시드 기반 절차적 생성 |
| **D-17** | **이름 문화권 = 국적 기반 다국적 혼합 확정** (구 Q-05) | 선수·클럽 이름은 `nationality` 필드 기준 국가 이름 풀에서 생성. **Mock 팩토리와 실제 생성기가 동일한 이름 생성 로직을 공유**해야 함 |
| **D-18** | **서비스 언어 = 다국어 대응 확정** (구 Q-04) | 기본 로케일 **ko**, 2차 로케일 **en**, 그 외는 카탈로그 추가만으로 확장. **i18n 기반을 Phase 1(Task 011)에 선구축**하고 Phase 2 전 UI Task의 완료 조건에 "하드코딩 문자열 금지"를 포함 |
| **D-19** | **승부차기 득점은 개인 통산 득점에 미포함** (구 Q-09) | 승부차기는 승패 판정과 별도 기록(`pk_home`/`pk_away`)으로만 남기고 시즌·통산 득점 및 득점왕 집계에서 제외 (FR-MT-013, FR-ST-001) |
| **D-20** | **감독은 독립 엔티티 + 최소 이적** (구 Q-13) | 감독을 팀 부속 속성이 아닌 독립 엔티티(E-06)로 유지하고 명성·수상 트랙을 갖되, 이적은 최소 범위(계약 만료 교체·경질)로만 구현 (FR-TM-004·005, FR-AW-001) |

**잔여 미결 4건은 전부 2차 릴리스 이후 사항** — Q-03(배당 표시 형식) / Q-10(컵 우승 추가 보상 트랙) / Q-11(겨울 이적창) / Q-12(관중·티켓 수입). Phase 4 및 2차·3차 릴리스 절에서만 다룬다.

---

## Phase 1: 애플리케이션 골격 구축

> **일정**: M-1 완료 목표 22일차 (2026-08-19) — 실행 구간 1~22일차 / Task 001~011

> **목표**: 코드를 쓰기 전에 **타입·계약·라우트·i18n·검증 체계**를 먼저 세운다. 이후 UI(Phase 2)와 엔진(Phase 3)이 병렬로 달릴 수 있게 한다.
> **완료 조건**: `npx tsc --noEmit` 무오류 + 전 라우트가 빈 페이지로 존재 + Mock 팩토리가 타입에 맞는 데이터를 생성 + 로케일 전환 동작 + Vitest 스위트 동작.

### Task 001: 확정 결정(D-15~D-26)을 설계 전제로 정착시킨다 - 우선순위

- **담당**: 1팀 코어·품질팀 / 승인: 제품 오너
- **일정**: 1일차 ~ 2일차 (2026-07-21 ~ 2026-07-22) / 추정 1.5인일 / 담당 1팀 코어·품질팀
- **근거**: D-15(구 Q-08), D-16(구 AS-02), D-17(구 Q-05), D-18(구 Q-04), D-19(구 Q-09), D-20(구 Q-13), **D-21~D-26(구 I-01~I-06)**, E-01, NFR-SC-003, NFR-MT-007

> **선반영 완료 (2026-07-20)**: D-15~D-26은 이미 PRD `06-prioritization-and-risks.md` 6.3절 결정 기록과
> `00-requirements-summary.md` 0.6절에 반영됐고, `docs/ISSUES.md`의 Q-04·05·08·09·13 / AS-02·09 / I-01~I-06도 정리 완료다.
> 따라서 본 Task에 남은 것은 **설계 원칙 명문화와 구현 전제 전달**뿐이다.
> (당초 계획한 `docs/DECISIONS.md` 분리 대신 **PRD 결정 기록을 단일 소스로 사용**한다 — 결정이 두 곳에 갈라지는 것을 피하기 위함.)

- **구현 사항**
  - [x] D-15~D-26을 PRD 6.3절 결정 기록에 정리, `docs/ISSUES.md` 미결 목록 정리 — **완료**
  - [x] 단일 월드 전제(D-15)를 타입·스키마 설계 원칙으로 명문화 (전 쿼리 `world_id` 필터 미도입, 확장 여지 한 줄만 유지) — **1일차 완료** (`docs/devStep/02.타입스키마설계원칙.md`)
  - [x] 절차적 생성 원칙(D-16) 명문화 — 외부 축구 데이터 소스·실명 자산 도입 금지를 코드 리뷰 체크리스트에 추가. **D-17의 실명 블랙리스트 필터**를 Task 007 요건으로 전달 — **2일차 완료**
  - [x] D-19(승부차기 득점 미포함, **연장전 득점은 포함**)·D-20(감독 독립 엔티티 + 최소 이적)을 Task 023·028·030의 구현 전제로 명시 — **2일차 완료**
  - [x] **D-21~D-26을 해당 Task의 구현 전제로 배분** — D-21 재임대 금지 → Task 030 / D-22 대체 GK 선정 우선순위 → Task 023·024 / D-23 감독 공석 0라운드·즉시 대행 → Task 030 / D-24 컵 시딩 폴백 → Task 027 / D-25 확률 밴드는 유지하고 엔진 상수를 조정 → Task 008·031 / D-26 공통코드 시드값을 `default_value`로 확정 → Task 003·031 — **2일차 완료** (`docs/devStep/03.결정Task매핑표와코드리뷰체크리스트.md`)
- **수락 기준**: D-15~D-26 12건이 각각 **어느 Task의 구현 전제인지 매핑**되고, `docs/ISSUES.md`의 미결 목록이 **2차 이후 항목 4건(Q-03·Q-10·Q-11·Q-12)만** 남는다. 3절 개선사항(I-*) 목록은 비어 있다.

### Task 002: 도메인 TypeScript 타입 47종을 정의해 단일 소스를 구축한다 - 우선순위

- **담당**: 1팀 코어·품질팀 / 리뷰: 2·3·6팀 (SP-1 타입 동결 리뷰는 전 6팀 참여) / **배치 반영(48일차) 리뷰: 3·5·6팀**(소비처 3곳)
- **일정**: 3일차 ~ 8일차 (2026-07-23 ~ 2026-07-30) / 추정 4.5인일 / 담당 1팀 코어·품질팀 / **8일차 SP-1에서 타입 동결** — 이후 변경은 이슈 배치 반영만 / **+ 배치 반영 48일차 (2026-09-24) / 추정 0.75인일 / 담당 1팀 코어·품질팀**(D-34·D-35 — 타입 5파일 + `*.type-test.ts` + `DataSource` 계약 3종). **같은 날 3·6팀, 다음 날 5팀이 소비하는 직렬 체인의 선두라 오전 완료가 조건**(⚑ H-25). ✅ **팀장 확정: 48일차 1팀 최우선 항목이며, 5팀 017 완료 판정(리뷰 게이트)은 49일차로 이월**한다
- **근거**: E-01~E-47, D-15, DC-01, DC-10, NFR-MT-002, NFR-MT-009
- **구현 사항**
  - [x] `src/types/` 하위를 도메인별로 분할 (`world.ts`, `person.ts`, `match.ts`, `stat.ts`, `economy.ts`, `betting.ts`, `config.ts`, `ops.ts`, `index.ts`) — **3일차 완료** (+ `brand.ts`·`enums.ts` 참조 기반 2종 추가)
  - [x] E-01~E-32 (1차 범위) 전량 정의 + E-33~E-40(배팅·사용자)은 2차 대비 타입만 선정의. **E-01 World는 단일 레코드 전제**(D-15) — **5일차 완료**(E-21~E-23·E-31·E-32는 `stat.ts`, E-24~E-27은 `ops.ts`, E-28~E-30은 `economy.ts`, E-33~E-40은 `betting.ts`). 부수로 `docs/ISSUES.md` I-19·I-31·I-32 5일차 반영 완료
  - [x] enum성 값 단일 선언: 이벤트 타입 23종(FR-MT-002), 포지션 11군(FR-PL-005), 부상 4등급(FR-PL-009), 전술 성향 6종(FR-MT-009, 3일차 선반영 재확인), 페이즈 6종(FR-LG-010 5종 + `TIEBREAK`, I-33/D-27), 마켓 상태, 국적 코드(D-17, T9에 따라 ISO 3166-1 alpha-2 브랜드 계약) — **6일차 완료**. 부수로 `docs/ISSUES.md` I-33·I-37 6일차 반영 완료(`MatchEvent.relatedEventSequence` 추가)
  - [x] 34속성(FR-PL-002) 타입, 시드 계층 타입(world/season/match), 상수 스냅샷 타입(E-44) — *34속성 **4일차 완료**(기술10·정신10·신체8·GK6). 시드 계층(`WorldSeed`/`SeasonSeed`/`MatchSeed`/`EventSeed`)·상수 스냅샷 타입(E-44 `SimConstantSnapshot`) **7일차 완료**(`src/types/brand.ts`, `config.ts`). 부수로 E-41~43(`CommonCodeGroup`/`CommonCode`/`CommonCodeHistory`)도 7일차에 함께 정의*
  - [x] 브랜드 타입으로 ID 혼용 방지(`TeamId`, `PlayerId` 등), 포인트는 정수 타입으로 고정(DC-08) — **7일차 완료**. ID 27종(+ E-42/43용 2종) 전량을 `Brand<T,TName>` 명목 타입으로 승격, `Points`도 브랜드화. `npx tsc --noEmit` 오류 0 + 서로 다른 브랜드 간 대입이 오류로 검출됨을 확인
  - [x] 각 enum에 **번역 키를 매핑하는 타입 규약** 정의 — 표시명은 타입이 아닌 메시지 카탈로그가 소유 (Task 011과 정합) — **7일차 완료**(`src/types/config.ts` `EnumTranslationCatalog<T>`, 키 문자열은 4팀 H-09 소유이므로 미포함)
  - [x] 타입 ↔ 엔티티 매핑표를 `src/types/README.md`로 남겨 추적성 유지 — **8일차 완료**. 작성 중 **E-45 CronRun / E-46 CronGap / E-47 AuditLog 3종이 6~7일차 어느 항목에도 배정되지 않아 미정의 상태**임을 발견(`docs/ISSUES.md` I-45) — E-33~E-40처럼 2차 선정의 대상으로 지정된 적이 없는 1차 범위 엔티티라 8일차에 `ops.ts`에 반영해 완결
  - [x] **배치 반영(48일차, D-34·D-35 / I-238·I-239) — 동결 후 첫 필드 추가. 48일차 완료.** `PlayerStatCoreValues` **56키 불변**(팀장 실측, Task 019 랭킹 회귀 0) · `vitest src/types` 98 tests · `src/types/README.md` 매핑표 갱신(E-48 추가, 검산 47→48, 브랜드 ID 32→33). **`index.ts`는 배럴이 이미 도메인 파일을 re-export해 변경 불필요**(확인 후 미변경). **05문서는 각주만 부기하고 갱신하지 않음**(I-58 규약). 상세: ⓐ `stat.ts`: `PlayerSeasonStat`·`PlayerCareerStat`에 `avgRating` (**`PlayerStatCoreValues`에는 넣지 않는다** — `PlayerStatRankingMetric = keyof PlayerStatCoreValues`라 Task 019 랭킹 지표가 조용히 바뀐다) ⓑ `brand.ts`: `ClubOwnerId`(E-48) ⓒ `person.ts`: `ClubOwner` — Manager와 대칭, `teamId: null` 공석 허용 ⓓ `economy.ts`: `SponsorContract.signedByOwnerId` (**`teamId` 유지 — 원장·회계 항등식 무변경**) ⓔ `index.ts` 배럴 + `*.type-test.ts`. **명명 주의**: `owner`는 `PointTransaction.ownerType`/`ownerId`가 다른 뜻으로 이미 점유 → `ClubOwner`로 고정
- **수락 기준**: `npx tsc --noEmit` 오류 0. E-01~E-47 중 1차 범위 전 엔티티가 타입으로 존재하며 중복 enum 선언 0건. — **8일차 충족 확인**(E-45~47 포함 전 엔티티 존재, `tsc` 오류 0). **48일차 E-48 ClubOwner 추가로 1차 범위는 48종**
- **테스트**: 타입 레벨 테스트(`expectTypeOf`)로 필수 필드 누락 검출. — **8일차 완료**: `src/types/*.type-test.ts` 10파일(도메인별 1종 + `brand`/`enums`). ⚠️ `vitest.config.ts` 부재로 `npm test`(vitest run 기본 include)는 이 파일들을 아직 실행하지 않는다 — 실제 검증은 `npx tsc --noEmit`이 수행(`expectTypeOf`/`@ts-expect-error` 오류 주입 테스트로 실효성 확인 완료). Task 008(12~15일차)에서 `vitest.config.ts` `include`에 `*.type-test.ts` 패턴을 추가해야 `vitest run`으로도 실행된다(`docs/ISSUES.md` I-46).

### Task 003: 공통코드 37개 그룹 체계와 상수 로더 인터페이스를 설계한다 - 우선순위 (**37개로 갱신 — 14일차 I-88 결정, 원래 착수 시점엔 36개였음, 아래 각 완료 항목의 "36" 표기는 그 날짜 기준 사실이라 유지**)

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀 / 지원: 2·5팀(상수 소비측)
- **일정**: 9일차 ~ 12일차 (2026-07-31 ~ 2026-08-05) / 추정 3.5인일 / 담당 3팀 데이터·밸런싱·배당팀
- **근거**: FR-AD-011~016, E-41~E-44, NFR-CFG-001~007, 05문서 5.12.1
- **구현 사항**
  - [x] `src/lib/config/` 에 그룹 카탈로그 36종을 타입 안전한 상수 정의로 작성 (group_code, 타입, min/max, `apply_policy`, description) — **9일차 완료** (`src/lib/config/catalog.ts`, 05문서 5.12.1 표 36개 그룹 전량 등록. `src/types` E-41 `CommonCodeGroup`을 `Pick`으로 파생해 재사용, 신규 타입 미선언). `npx tsc --noEmit`·`npm run lint` 오류 0
  - [x] 상수 로더 인터페이스 정의 — 해석 우선순위(전역 기본값 → 하드코딩 폴백), 그룹 단위 캐시, 무효화 훅 — **10일차 완료** (`src/lib/config/loader.ts`, `loadConstants(group)`). `catalog.ts`의 `CommonCodeGroupCode`(36개 리터럴 유니온)를 파라미터 타입으로 강제해 미등록 그룹 코드는 `tsc` 컴파일 오류가 나며, 반환 타입은 그룹의 `valueType`에서 유도(`INT`/`DECIMAL`→`number`, `STRING`→`string`, `BOOL`→`boolean`, `JSON`→`Readonly<Record<string, unknown>>`). 전역 기본값·하드코딩 폴백은 `ConstantSource` 주입 방식(`setGlobalDefaultSource`/`setFallbackSource`)으로 두어 11일차 `fallback.ts`가 실제 폴백을 연결할 수 있게 확장 지점만 오늘 확정(실 값 데이터는 아직 없음). 그룹 단위 `Map` 캐시 + `invalidateConstants(group?)`/`onConstantsInvalidated` 무효화 훅 포함. 테스트 `src/lib/config/loader.test.ts`(10케이스, 우선순위·캐시·무효화·소스 미등록 에러·타입 강제) 전건 통과, `npx tsc --noEmit`·`npm run lint`·`npm run test`(142 tests) 오류 0
  - [x] 하드코딩 안전 기본값 테이블 작성 (NFR-CFG-005, DC-13) + 폴백 시 WARN 로그 규약 — **11일차 완료** (`src/lib/config/fallback.ts`). 36개 그룹 전량에 안전 기본값을 등록(`SAFE_DEFAULT_VALUES`, 05문서 5.12.1 코드 예시값 기반). 값 구조가 문서에 없는 JSON 그룹 4종(`WEATHER_EFFECT`/`RATING_WEIGHT`/`OVR_WEIGHT`/`MANAGER_MATCHUP`)은 억측 없이 빈 객체로 두고 36일차(031a 실제 시드) 소관임을 명시. `loader.ts`의 `ConstantSource` 계약을 구현하는 `hardcodedFallbackSource` + 조회 시 `console.warn` 기반 WARN 로그(39일차 `obs/logger.ts` 도입 전까지의 캡슐화된 임시 구현) + `installHardcodedFallback()`으로 `setFallbackSource` 명시 등록(모듈 로드 시 자동등록 없음 — 테스트 격리 보존). 테스트 `src/lib/config/fallback.test.ts`(8케이스: 36그룹 커버리지, WARN 로그, 전역 소스 우선순위) 전건 통과
  - [x] 발효 정책 3종(`NEXT_SEASON` / `IMMEDIATE` / `NEXT_MARKET`) 해석 함수 시그니처 확정 — **11일차 완료** (`src/lib/config/policy.ts`). FR-AD-013 기준 `resolveNextSeasonEffective`/`resolveImmediateEffective`/`resolveNextMarketEffective` 3종 + 단일 진입점 `isPolicyEffective`(exhaustive switch로 `CommonCodeApplyPolicy` 유니온 전량 강제). `PolicyEffectContext`는 배팅 도메인 타입(`BetMarketStatus`)에 직접 의존하지 않고 `isMarketAlreadyOpened: boolean`으로 얇게 계약(5팀 035 소비 시점에 실제 상태 매핑). `src/types` 신규 선언 없음, `CommonCodeApplyPolicy`는 배럴 import만 사용. 테스트 `src/lib/config/policy.test.ts`(9케이스) 전건 통과
  - [x] 상수 스냅샷 직렬화·해시(SHA-256) 규칙 확정 (FR-AD-014, NFR-CFG-006) — **12일차 완료** (`src/lib/config/snapshot.ts`). `src/types` E-44 `SimConstantSnapshot`의 `constants` shape을 `buildConstantsSnapshotInput(groups?)`(기본값 36개 전체, `loadConstants` 재조회)로 조립하고, `computeSnapshotHash`가 2팀 `src/lib/sim/rng/hash.ts`의 `hashState()`/`canonicalize()`를 재사용(재구현 없음, `src/lib/sim/**` 미수정)해 SHA-256 해시를 계산. `resolveSnapshotDedup(constants, existingSnapshots)`가 동일 해시 존재 시 `REUSE`(기존 레코드 재사용), 없으면 `CREATE`(새 해시)를 판정하는 순수 함수로 NFR-CFG-006 ①(해시 기준 1건만 저장)을 확정. `withIncrementedRefCount`로 재사용 시 참조 카운트를 불변 증가. NFR-CFG-006 ②③(시즌당 ≤20건·≤1MB 예산 감사)과 실제 DB 영속화·생성 호출 배선은 각각 38일차(`apply.ts`)·2팀 Task 023/031 소비 시점 소관으로 범위 밖. 테스트 `src/lib/config/snapshot.test.ts`(8케이스: 조립·결정론·값 차이·그룹 조회 순서 무관·REUSE·CREATE·빈 목록·refCount 불변성) 전건 통과, `npx tsc --noEmit`·`npm run lint`(신규 파일 0 경고/오류, `.next` 빌드 산출물 관련 기존 오류는 무관)·`npm run test`(23 files, 279 tests) 오류 0. **⚑ H-05 인계 완료 (→ 2팀 엔진 상수, 4팀 폴링 주기, 5팀 어드민 콘솔)**: 공통코드 36그룹 카탈로그(`catalog.ts`)와 `loadConstants(group)` 인터페이스(`loader.ts`)가 13일차부터 소비 가능
- **수락 기준**: 36개 그룹이 모두 등록되고, 엔진이 숫자 리터럴 대신 로더를 통해 값을 얻는 경로가 타입으로 강제된다. (Task 003 자체는 12일차에 36개 기준으로 이미 완료 판정됨 — 이 수치는 그대로 유지)
- **테스트**: 폴백 동작, 발효 정책별 적용 시점, 해시 중복 제거 (NFR-QA-008).
- **⚠️ 37번째 그룹 추가(14일차, I-88 결정)**: D-17 결정문("국가 목록과 각국 비중은 공통코드로 관리") 원문을 준수하기 위해 국적 비중 그룹을 공통코드로 신규 추가한다(사용자 판정, 3팀의 정적 데이터 유지 권고는 채택되지 않음 — 경위는 `docs/ISSUES.md` I-88 참조). 3팀이 `catalog.ts`·`fallback.ts`에 반영 중(14일차). 이후 이 문서의 "36개 그룹" 표기는 **Task 003 완료 시점(9~12일차)의 사실 기록**이므로 그대로 두고, Task 031/037처럼 **앞으로의 작업 범위를 가리키는 표기만 37개로 갱신**했다(아래 참고). `docs/db/schema-design.md`(6팀 소유)와 `docs/dailyWorkLog/1~13Day.md`(그 시점 사실 기록)는 이번에 변경하지 않았다.

### Task 004: Mock↔DB 데이터 어댑터 인터페이스 계약을 확정한다 - 우선순위

- **담당**: 1팀 코어·품질팀 / 리뷰: 4·6팀
- **일정**: 9일차 ~ 11일차 (2026-07-31 ~ 2026-08-04) / 추정 2.5인일 / 담당 1팀 코어·품질팀
- **근거**: FR-UI-023, FR-UI-022, NFR-MT-002, DC-01, R-16
- **구현 사항**
  - [x] `src/lib/data/` 에 `DataSource` 인터페이스 정의 — 화면별 조회 메서드(리그 순위, 일정, 경기 상세, 선수, 클럽, 통계, 뉴스, 브래킷, 어드민) — **9일차 완료** (`src/lib/data/DataSource.ts`)
  - [x] 반환 타입은 `src/types/` 도메인 타입만 사용 (DB 생성 타입 노출 금지) — **9일차 완료**: 배럴(`@/types`)만 import, 비영속 조회 DTO(`PublicPlayerProfile`·`MatchTeamStatComparison` 등)도 도메인 타입 필드로만 합성(I-38·W-38 판정)
  - [x] 환경변수·플래그 기반 어댑터 선택 팩토리 (`NEXT_PUBLIC_DATA_SOURCE=mock|supabase`) — **10일차 완료** (`src/lib/data/factory.ts`): self-registration 레지스트리 패턴 — 3팀(mock)·6팀(supabase) 구현체가 아직 없어 정적 import 대신 `registerDataSource(kind, provider)`로 각 팀이 스스로 등록, `getDataSource()`가 `NEXT_PUBLIC_DATA_SOURCE` 값으로 조회·캐시. 잘못된 값은 `mock`으로 안전 폴백(Supabase 클라이언트 미설치)
  - [x] 폴링 추상화 훅 계약 정의 (기본 5초 / 라이브 3초, 주기는 공통코드, 탭 비활성 시 중단) — **11일차 완료** (`src/lib/data/polling.ts`, H-02): 단발 조회(RSC)·폴링 훅이 공유하는 `fetchResult`/`fetchListResult`(→`Result<T>`) + `resolvePollIntervalMs`(공통코드 `UI_PARAM` 우선, 실패 시 5000/3000ms 안전 폴백) + `'use client'` 훅 `usePolling`/`usePollingList`(탭 비활성 시 자동 중단·복귀 시 재조회). 부수적으로 `src/lib/data/bootstrap.ts` 신설(어댑터 등록 부트스트랩 지점, I-67 해소). `docs/ISSUES.md` I-61·I-65·I-67 갱신
  - [x] 로딩/에러/빈 상태를 타입으로 표현하는 결과 래퍼 정의 (FR-UI-000) — **10일차 완료** (`src/lib/data/result.ts`): `Result<T>` 판별 유니온(`LOADING`/`ERROR`/`EMPTY`/`SUCCESS`) + 생성자·타입가드·변환 헬퍼(`fromNullable`/`fromArray`). `@/types` 비의존 범용 유틸 — `DataSource.ts` 자체는 이번 산출물 범위에서 수정하지 않음(근거는 `docs/ISSUES.md` 신규 이슈 참조)
- **수락 기준**: 어댑터 인터페이스가 확정되어 Task 007(Mock)과 Task 034(Supabase)이 각각 독립 구현 가능하다.

### Task 005: 전 라우트 골격과 전역 레이아웃을 스캐폴딩한다

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 9일차 ~ 13일차 (2026-07-31 ~ 2026-08-06) / 추정 4.0인일 / 담당 4팀 UI기반·i18n팀 / **크리티컬 패스**
- **근거**: FR-UI-001~020, FR-UI-025, FR-UI-026, D-18, NFR-MT-006, DC-02
- **구현 사항**
  - [x] `node_modules/next/dist/docs/`의 App Router·layout·`params`·i18n 라우팅 가이드를 먼저 확인하고 참조 경로 기록 — 9일차 완료, 문서 경로 전량과 발견 사항은 `docs/team-schedule/04-UI기반i18n팀.md` §7 참조
  - [x] 라우트 생성: `/`, `/sample`, `/leagues/[leagueId]`, `/leagues/[leagueId]/fixtures`, `/matches/[matchId]`, `/players/[playerId]`, `/teams/[teamId]`, `/stats`, `/playoffs/[leagueId]`, `/cup`, `/transfers`, `/awards`, `/archive`, `/sponsors`, `/admin`, `/admin/config`, `/admin/scheduler`
    - 10일차 진행: 위 17개 중 8개(`/`, `/sample`, `/leagues/[leagueId]`, `/leagues/[leagueId]/fixtures`, `/matches/[matchId]`, `/players/[playerId]`, `/teams/[teamId]`, `/stats`)를 `src/app/[lang]/**`에 빈 `page.tsx`로 생성. 확인은 `/ko`·`/en` 하위 경로 기준(로케일 없는 `/`는 9일차 §7.4 결정에 따라 `proxy.ts` 부재로 이번 일차엔 404가 정상)
    - **11일차 완료**: 나머지 9개(`/playoffs/[leagueId]`, `/cup`, `/transfers`, `/awards`, `/archive`, `/sponsors`, `/admin`, `/admin/config`, `/admin/scheduler`)를 동일한 `PageProps` 헬퍼 기반 빈 `page.tsx`로 생성. `admin` 서브트리는 화면 본문 담당이 아직 미확정이라 담당팀을 단정하지 않고 골격만 둠. `npx next typegen` 실행 후 `npx tsc --noEmit`(0건) / `npm run lint`(0건) / `npm run test`(142 passed) 통과, `npx next dev --webpack`으로 신규 9개 라우트를 `/ko`·`/en` 양쪽 총 18경로 curl 200 확인. 참조 문서: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`, `.../dynamic-routes.md`
  - [x] **Task 011에서 확정한 로케일 라우팅 전략과 정합**하도록 세그먼트 구조를 결정 (경로 세그먼트 방식 채택 시 전 라우트가 로케일 하위에 배치) — 9일차 §7.4에서 팀장 승인으로 `app/[lang]/` 세그먼트 방식 조기 확정(`docs/team-schedule/04-UI기반i18n팀.md` §7.4), 10일차에 실제 라우트 생성에 적용
  - [x] 2차 대비 라우트 자리만 예약: `/bet`, `/my/bets`, `/my/wallet` (플래그로 비활성) — **11일차 완료**. feature flag 시스템이 아직 프로젝트에 없어(CLAUDE.md "아직 도입되지 않은 것") 코드 분기 없이 순수 placeholder로만 생성, JSDoc에 비활성 자리 예약임을 명시. `/ko`·`/en` 양쪽 6경로 200 확인
  - [x] 전역 레이아웃 골격 — 헤더(리그 스위처·시즌/페이즈 인디케이터·다음 킥오프 타이머·**로케일 스위처**), 사이드 내비, 푸터 (FR-UI-020) — **12일차 완료**: `src/app/[lang]/layout.tsx`의 `<body>`에 `SiteHeader`/`SideNav`/`SiteFooter` 로컬 함수로 앱 셸 추가(`src/components/` 부재로 별도 파일 미분리, 23일차 이후 013A에서 교체 예정). 헤더 4개 자리는 전부 `disabled` placeholder, 사이드 내비는 11일차까지 생성된 라우트만 `/${lang}/...`로 연결(admin/bet/my 예약분 제외). `npx tsc --noEmit`(0건) / `npm run lint`(0건) 통과. 참조: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`, `.../02-components/link.md`(App Router `<Link>`에 Pages Router의 `locale` prop 없음 확인)
  - [x] 각 라우트에 `loading.tsx` / `error.tsx` / `not-found.tsx` 배치 (FR-UI-000 기반) — **13일차 완료**: `src/app/[lang]/**` 20개 리프 라우트(루트 `[lang]` 포함, 예약 3개 포함) 전체에 3종씩 총 60파일 생성. `error.tsx`는 `'use client'` + Next.js 16.2 신규 `unstable_retry`(공식 문서가 `reset`보다 우선 권장) 사용. `npx tsc --noEmit`(0건) / `npx eslint src`(0건), `npm run dev --webpack` 기준 `/ko`·`/en` 40경로 curl 200 전부 확인. WSL에서 `npm run build`는 번들러 무관 EPERM으로 실패하므로(CLAUDE.md) 수락 기준의 "build 성공"은 tsc/eslint/dev 순회로 대체 판정. 참조: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/{loading,error,not-found}.md`
- **수락 기준**: 전 라우트가 200으로 응답하고, `npm run build` 성공, 콘솔 에러 0건. (13일차: WSL 빌드 실패 이슈로 `npm run build` 대신 `tsc --noEmit`/`eslint`/dev 순회 curl 200으로 대체 판정 — CLAUDE.md 근거)
- **테스트**: Playwright MCP로 전 라우트 순회 스모크 — 200 응답 및 콘솔 에러 0건 확인.

### Task 006: 시드 계층 PRNG와 결정론 유틸리티를 구축한다 - 우선순위

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 1일차 ~ 6일차 (2026-07-21 ~ 2026-07-28) / 추정 4.5인일 / 담당 2팀 시뮬레이션엔진팀
- **근거**: FR-MT-015, FR-AD-003, NFR-DT-001~005·008
- **구현 사항**
  - [x] `src/lib/sim/rng/` 에 xoshiro128\*\* 또는 mulberry32 구현 (순수 함수, 상태 명시적 전달) — **1일차 완료** (`prng.ts`)
  - [x] 시드 계층 파생 함수 — `world_seed → season_seed → match_seed → event_seed`, 배당 프리시뮬은 **독립 네임스페이스**(NFR-DT-006) — **2일차 완료** (`derive.ts`)
  - [x] 고정 정밀도(소수 6자리 반올림) 확률 비교 헬퍼 (NFR-DT-005) — **3일차 완료** (`precision.ts`)
  - [x] 안정 정렬 헬퍼 — 명시적 tiebreak 키 필수 (NFR-DT-008) — **4일차 완료** (`sort.ts`, 튜플 타입으로 키 0개 시 컴파일 오류 강제 + `findTiedRuns()`)
  - [x] 상태 해시(정렬 직렬화 + SHA-256) 유틸 (NFR-DT-003) — **4일차 완료** (`hash.ts`, 외부 의존 0의 순수 TS SHA-256 + `canonicalize()`)
- **수락 기준**: 동일 시드 100만 회 추출 결과가 재실행 시 바이트 단위 동일. 단일 경기 재현 ≤ 100ms를 가능케 하는 시드 파생 구조. — **6일차 완료(실측)**: 100만 회 2회 추출 값·최종 state 완전 일치(1회차 49.33ms, 2회차 43.95ms), 경기 1건 분량(5만 회) 추출 3.02ms(≤100ms 여유 충족). `bench.test.ts`, `npx vitest run src/lib/sim/rng/bench.test.ts --reporter=verbose`로 실행
- **테스트**: Vitest — 시드 재현성, 분포 균등성, 입력 순서 셔플 불변성. — **5일차 완료** (`prng.test.ts`, `derive.test.ts`, `precision.test.ts`, `sort.test.ts`, `hash.test.ts`, 총 107 케이스 통과. `npm run test`로 실행)
- **6일차 추가**: I-39(D-28 worldSeed 32→53비트 완화가 `rng/**` 구현에 미반영) 수정 — `prng.ts`의 `createState`가 `seed\|0`으로 상위 비트를 절단하던 문제와 `derive.ts`의 `NAMESPACE_BITS=2`/`PAYLOAD_BITS=30` 32비트 고정 구조를 51비트 payload로 재설계(`bigint` 미사용, 두 32비트 레인을 안전정수 곱셈으로 결합). 100만 회 바이트 동일성 벤치(`bench.test.ts`) 포함, 총 **118 케이스 통과**(`npm run test`), `npx tsc --noEmit` 오류 0건. 근거는 `docs/ISSUES.md` I-39(1팀 소관, 해소 보고는 2팀 6일차 팀장 보고)

### Task 007: 시드 기반 결정론적 Mock 팩토리를 구축한다

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀 / 의존: Task 002·003·006
- **일정**: 13일차 ~ 19일차 (2026-08-06 ~ 2026-08-14) / 추정 5.5인일 / 담당 3팀 데이터·밸런싱·배당팀
- **근거**: FR-LG-017, FR-TM-001, FR-PL-014, D-16, D-17, DC-09, DC-11, DC-12
- **구현 사항**
  - [x] `src/lib/mock/` 에 월드 팩토리 — 3리그 60팀 / 팀당 22~30명 ≈ 1,560명 / 감독 60명 / 스폰서 풀 ≥ 40 — **15일차 완료**(`src/lib/mock/world.ts` 930줄, `world.test.ts` 12케이스. `generateMockWorld(worldSeed)`가 `worldSeed` 하나로 전 엔티티를 결정론 생성 — 실측 팀 60 / 감독 60 / 선수 **1,577명** / 스폰서 41, 전 팀 스쿼드 22~30명·GK≥2·CB≥3 만족. 리그 규모는 `LEAGUE_TEAM_COUNT`(24/20/16), 스쿼드 한계는 `SQUAD_PARAM.MIN/MAX/GK_MIN/CB_MIN`을 `loadConstants` 경유로 읽어 리터럴 사용 0건(NFR-CFG-001). 이름은 `naming/generate.ts`, 엠블럼은 `naming/emblem.ts` 재사용 — `generateTeamEmblem(team.crestSeed)`를 **팀당 1회만** 호출해 `svg`는 렌더용으로 내보내고 `colorPrimary`/`colorSecondary`는 `Team` 필드에 대입(14일차 소비 계약 이행). 국적은 `SUPPORTED_NATIONALITY_CODES` 균등분포 시작(실 비중은 Task 031b). 리그 티어별 품질 중심값으로 OVR 차등(19일차 "상위 리그 평균 OVR 유의차" 대비). 난수는 전량 2팀 `sim/rng/prng.ts` 경유(`Math.random()`/`Date.now()` 0건 — 팀장 grep 실증), 타입은 배럴 `@/types`만 사용. `TasteTag`/`Formation` 값 목록 미확정이라 Mock 전용 로컬 풀 사용 — 확정 시 이 파일만 교체)
  - [x] **국적 기반 이름 생성기**(D-17) — `nationality`별 이름 풀에서 조합 생성, 실존 인물명 회피. **생성 로직은 `src/lib/naming/`에 두어 Mock과 실제 엔진이 공유** — **13일차 완료**(`src/lib/naming/generate.ts`의 `generatePlayerName(state, nationality)`, `namePools.ts`(20개국 이름 풀 + 표기 순서), `blacklist.ts`(실명 60여 건 회피 필터), `generate.test.ts`. 2팀 `sim/rng/prng.ts`의 `nextIntBelow`로 `{state,value}` 스레딩, 블랙리스트 충돌 시 같은 커서로 재추첨. 미지원 국적은 조용한 대체 없이 `RangeError`. `npx tsc --noEmit`·`npx eslint src`·`npm run test` 오류 0. **⚑ H-10 인계**(열거형 ko/en 표시명 목록, `docs/handoff/H-10-enum-display-names.md`) — 4팀 14일차 소비 시작
  - [x] 절차적 엠블럼 SVG 생성기 (외부 에셋·외부 API 의존 0, DC-11, D-16) — **14일차 완료**(`src/lib/naming/emblem.ts`의 `generateTeamEmblem(crestSeed: Seed)`. `Team.crestSeed` 하나로 도형 5종(방패·원·육각·오각·마름모)·배색 패턴 6종·문양 5종·색상 2종(HSL→hex 로컬 헬퍼, 신규 의존성 없음)을 전부 결정해 64×64 viewBox 인라인 SVG 문자열을 조립 — FR-TM-001 ③ "동일 시드 시 동일 엠블럼"을 위해 색상까지 시드에서 파생하고 파라미터로 받지 않음(`colorPrimary`/`colorSecondary`는 반환값으로 내보내 15일차 Mock 팩토리가 `Team.colorPrimary/colorSecondary`에 대입하는 소비 계약 전제). 2팀 `sim/rng/derive.ts`의 `stateForSeed(seed)`(엔진 `penalty.ts`/`tick.ts`/`events.ts`와 동일한 리프 시드 패턴)로 로컬 PRNG 상태 파생, `prng.ts`의 `nextIntBelow`만 사용. `emblem.test.ts` 26케이스(동일 시드 재현성, 외부 참조 문자열 0건, hex 색상 형식, 80개 서로 다른 시드 전량 고유 SVG, 음수·초과·비정수 시드 `RangeError`, 접근성/테마 규약) 전부 통과. **14일차 2차 교차 점검(4팀 지적) 반영**: ① 윤곽선 `stroke`를 고정 `rgba(0,0,0,0.28)`에서 `stroke="currentColor" stroke-opacity="0.28"`로 변경 — Task 012(다크/라이트 대비 4.5:1)에 대응해 소비처가 CSS `color` 상속만으로 테마별 대비 조정 가능(팀 고유 배색인 `colorPrimary`/`colorSecondary`/문양 색은 대상 아님, 그대로 시드 고정). ② `<svg>` 내부 하드코딩 영문 `role="img" aria-label="procedurally generated club emblem"` 제거, `aria-hidden="true" focusable="false"`로 장식용 선언(D-18 하드코딩 문자열 금지) — 실제 접근 가능한 이름은 소비처(미착수 `TeamBadge`)가 wrapper에 번역 키로 부여하는 계약으로 JSDoc에 명시. `npx tsc --noEmit`·`npm run lint`·`npm run test`(28 test files·366 tests) 오류 0.
  - [x] 진행 상태 Mock — 라이브 경기, 이벤트 타임라인, 순위표, 스탯, 뉴스 피드, 브래킷 — **16일차 완료**(`src/lib/mock/progress.ts` 신규 42.8KB, `progress.test.ts` 11케이스). `generateMockWorld()` 산출물을 입력받아 6종을 결정론 생성하며, **`src/lib/data/DataSource.ts`(1팀)의 6개 메서드 반환 타입과 1:1 대응**해 18일차 MockDataSource가 바로 슬라이스할 수 있게 맞췄다. 시드는 `sim/rng/derive.ts`의 `deriveSeasonSeed`/`deriveMatchSeed`/`stateForSeed`로 계층 경유, 타입은 배럴 `@/types`만 사용, `Math.random()`/`Date.now()` 실사용 0건(팀장 grep 실증). **스코프 축소 2건은 파일 헤더 명시 + 이슈 등재**: ① 순위표는 "전 팀 동일 10라운드 소화" 가정 표본이며 17일차 풀 일정 역산이 아님(**I-106**) ② 플레이오프 시딩이 `playoffTeamCount`(10/4/2)를 2의 거듭제곱으로 내림(8/4/2)해 **부전승 미처리**, 컵은 스펙 6라운드(64강) 대신 팀 수 제약으로 5라운드(32강) — **5팀 브래킷 화면 착수 전 확정 필요**(**I-107**)
  - [x] 4상태 시나리오 Mock — 정상/로딩/빈/에러 각각의 픽스처 세트 (FR-UI-000) — **17일차 완료**(`src/lib/mock/fixtures/` 신규 6파일: `schedule.ts`(436줄)·`states.ts`·`screens.ts`(310줄)·테스트 2·`index.ts`). ⓐ `schedule.ts`가 **서클법 더블 라운드로빈으로 풀 일정을 생성하고 `FINISHED` 경기만 집계해 순위표를 역산** — 16일차 `progress.ts`의 "전 팀 동일 10라운드" 가정을 대체해 **I-106을 이 경로에서 해소**했다. ⓑ `states.ts`는 `Result<T>`(1팀 Task 004) 경유 4상태 제네릭 빌더 — LOADING/EMPTY/ERROR는 화면 무관 공통 모양이므로(EMPTY에 사유 필드 없음, ERROR 메시지는 진단용이지 UI 카피 아님 — 10일차 결론 재확인) 실작업은 화면별 "정상" 표본 조립이다. ⓒ `screens.ts`가 `world.ts`/`progress.ts`/`schedule.ts` 산출물을 조합해 **11개 화면**(FR-UI-002·003·004·005부분·006부분·007·008·009·010·011·014)의 4상태 픽스처를 생성 — 완전 8 + 부분 2(선수·클럽 상세는 계약/부상/수상/이적 등 미생성 섹션 제외). 신규 12케이스 포함 `npm run test` 516 통과, `tsc --noEmit`·`lint` 오류 0, `@/types` 서브경로 import·`Math.random()`/`Date.now()` 각 0건(팀장 grep 실증). **스코프컷**: 나머지 8개 화면(FR-UI-001·012·013·015~019·025·026)은 **대응 Mock 엔티티 생성기 자체가 없어** 제외 — 근거는 `screens.ts` 헤더, 일정 확정은 **I-111**
    - **잔여 조치(I-106 완전 해소 조건)**: 18일차 MockDataSource의 `getStandings`가 `progress.ts`의 `generateStandings`(진행 중 스냅샷 전용, 자체 헤더가 "전체 일정 역산 아님"으로 경계 명시)가 아니라 **`schedule.ts` 파생값을 슬라이스**하도록 배선한다. `progress.ts`는 별개 목적이라 17일차에 수정하지 않았다
  - [x] Mock 어댑터를 Task 004의 `DataSource` 인터페이스로 구현 — **18일차 완료**(`src/lib/data/mock/MockDataSource.ts` 신규 34.8KB, `MockDataSource.test.ts` 13케이스). `DataSource` **56개 메서드 전량 구현**. ⓐ **I-106 완전 해소** — `getStandings`가 위 잔여 조치대로 `progress.ts`의 진행 스냅샷이 아니라 `schedule.ts`의 대진 역산 순위표를 슬라이스하며, `round` 지정 시 그 라운드 이하로 필터한 fixtures에 `deriveStandingsFromFixtures`(`schedule.ts`가 신규 export)를 재적용해 시점별 스냅샷을 만든다(재구현 없이 단일 소스 재사용). 이 재계산 경로만 쿼리 시점에 결정론 PRNG를 다시 스레딩한다(같은 입력→같은 출력, `Math.random()` 미사용). ⓑ `screens.ts`가 `toPublicProfile`을 export해 선수 공개 프로필 변환을 재사용(`pa` 미노출 유지). ⓒ `getCommonCodeGroups/Codes`는 `config/catalog.ts` + `loadConstants`를 감싸 실제 값을 반영. ⓓ **생성기가 없는 축**(계약·부상·수상·이적·임대·통산/경기 스탯·라인업·날씨·시즌지표·원장·스폰서계약·트로피·크론·감사로그)은 값을 발명하지 않고 `null`/`[]`를 반환하고 사유를 파일 헤더에 명시 — 관련 화면 픽스처 일정은 **I-111**. `tsc --noEmit`·`lint` 오류 0, `npm run test` 542 통과
    - [x] **⚑ H-07 배선 — 19일차 완료 (Task 007 종료)**: `src/lib/data/mock/index.ts`(신규) + `index.test.ts`(신규). `registerDataSource('mock', () => new MockDataSource())`로 `factory.ts` 레지스트리에 부수효과 1회 등록하며, 두 번째 인자를 **프로바이더 함수로 두어 지연 생성**한다 — `getDataSource()` 최초 호출 시에만 인스턴스화되므로 부트스트랩만 하고 조회하지 않는 경로(`NEXT_PUBLIC_DATA_SOURCE=supabase` 테스트 등)에서 무거운 월드 생성(`generateMockWorld`+`generateMockProgress`+전 리그 풀 시즌 일정)을 지불하지 않는다. **I-113은 1팀이 선행 해소**(`bootstrap.test.ts`를 배럴 존재 여부 런타임 검사 기반 `describe.runIf`/`skipIf`로 재작성 — 순서 고정을 없애 3팀이 언제 올려도 되게 함), 배선 후 해당 블록이 skip 없이 통과함을 확인. **4·5·6팀은 20일차부터 Mock 소비 개시 가능**
    - [x] **I-114 해소(19일차)** — Mock 기준 시각이 `world.ts`(08-10)·`progress.ts`(08-11)·`MockDataSource.ts`(08-13)로 최대 3일 어긋나 있던 것을 `world.ts`의 **`MOCK_EPOCH_NOW` 단일 앵커**로 통일. `WORLD_CREATED_AT`은 시즌 시작(앵커−10일)보다 앞서도록 앵커−40일로 재계산, `progress.MOCK_NOW`는 앵커 재노출, MockDataSource의 설정 타임스탬프는 `world.createdAt` 재사용
    - [x] **Task 007 종료 Vitest 스위트(19일차)** — 시드 재현성, 스쿼드 구조 불변식, 등번호 중복 0, 국적별 이름 풀 매칭, 정적 JSON 하드코딩 0건을 종료 시점에 일괄 고정. `tsc --noEmit` 0 error, `npm run test` 46파일 570케이스 통과
    - [x] **소급 — I-229 해소(51일차, 사용자 지시)**: 254행에서 `null`/`[]`로 남겨 둔 축 중 라인업·평점·팀스탯 3종을 배선. `MockDataSource`의 `getMatchLineups`/`getMatchPlayerRatings`/`getMatchTeamStats`가 `deriveMatchDetail()`로 파생(라인업=`selectLineup()` 직접 호출 ⓐ, 평점·팀스탯=`progress.ts`의 `generatePlayerStatCore` 재사용 ⓑ 혼합). LIVE·FINISHED 양쪽 실측(라인업 11+7·평점 선발 전원·팀스탯 2팀) — **D-33 판정 기준(정상 상태 실측) 충족**. 잘못된 주석 3건 정정. **잔여**: 라인업↔이벤트 독립 표본(I-261), 창단·재임 시즌 음수/미래 값(I-260)
- **수락 기준**: 동일 시드 2회 생성 시 전 엔티티 100% 동일. 상위 리그일수록 평균 OVR이 유의하게 높음. 정적 JSON 하드코딩 0건. — **19일차 충족(팀장 독립 재검증), Task 007 종료**
- **테스트**: Vitest — 시드 재현성, 스쿼드 구조 불변식(22~30명, GK≥2, CB≥3), 등번호 중복 0, 국적별 이름 풀 매칭. — **19일차 전건 통과**

### Task 008: Vitest를 도입하고 검증 스위트 골격을 구성한다 - 우선순위

- **담당**: 1팀 코어·품질팀
- **일정**: 12일차 ~ 15일차 (2026-08-05 ~ 2026-08-10) / 추정 3.0인일 / 담당 1팀 코어·품질팀
- **근거**: D-03, NFR-QA-001~010, NFR-MT-003, DC-03, DC-04
- **구현 사항**
  - [x] Vitest + coverage 설치, `vitest.config.ts`에서 `@/*` 별칭 해석 — **12일차 완료** (`@vitest/coverage-v8` 설치, `vitest.config.ts` 신규 작성. `@/*` 별칭은 Vite 8.1.5 네이티브 `resolve.tsconfigPaths` 옵션으로 해석(별도 플러그인 불필요, tsconfig.json 단일 소스 유지). `npx tsc --noEmit` 오류 0, 실제 소스 범위 lint 오류 0(WSL 마운트 스트레이 아티팩트로 인한 무관 lint 노이즈는 4팀 확인 결과 1팀 소행 아님, I-62 갱신은 팀장 반영).
    - **`docs/ISSUES.md` I-46 실제 해소** — 최초 시도(`test.include`에 `*.type-test.ts` 추가)는 **거짓 해소였다**(팀장 2차 검증 실증: 고의로 틀린 `expectTypeOf` 단언을 넣어도 vitest 런타임 include에서는 esbuild가 타입을 소거해 초록불로 통과). 정정: 런타임 `test.include`에서 `*.type-test.ts`를 **제외**하고, vitest 4.x 네이티브 `test.typecheck`(`enabled: true`, `checker: 'tsc'`, `include: ['**/*.type-test.ts']`)로 전환 — 실제 `tsc` 프로세스가 단언을 검증한다. 동일한 고의 오류 재주입으로 **이번엔 실패로 뜨는 것까지 재현 확인**(`Type Errors 1 failed`). `npx vitest run` 24파일/291케이스(기존 12파일·180케이스 + type-test 10파일 + 2·3팀 신규 2파일) 전건 통과, `Type Errors: no errors`.
    - 주의: vitest의 `typecheck` 모드는 "실험적 기능"이라는 경고가 매 실행 출력된다(vitest 버전 고정 권장). 실행 시간이 typecheck 미포함 대비 약 +5초 늘어난다(8.6초→13초대).
  - [x] `npm run test` / `test:watch` / `test:coverage` 스크립트 추가 — **13일차 완료** (`package.json`. `test:watch`는 `vitest`(기본 watch 모드), `test:coverage`는 `vitest run --coverage` — 이미 설치된 vitest/`@vitest/coverage-v8`만으로 동작해 신규 의존성 없음. `npm run test`: 26파일/325케이스 통과, `npm run test:coverage`: 동일 통과 + 커버리지 리포트 정상 출력(전체 라인 95.28%). **⚠️ 이 95.28%는 "테스트가 있는 파일만"의 수치다** — `vitest.config.ts`의 `coverage`에 `all`/`include`가 없어 무테스트 파일(예: `src/lib/sim/match/events.ts` 305줄, 13일차 1차 교차 점검 실측)이 분모에서 통째로 빠진다. 14일차 임계 설정 시 `all: true` + `include: ['src/lib/sim/**']`를 함께 넣고 재측정 필요 — `docs/ISSUES.md` I-90 참조)
  - [x] 스위트 디렉터리 골격 — 단위 / 스냅샷 / 분포 불변식 / 회계 항등식 / 구조 불변식 / 성능 벤치 6종 — **13일차 완료, 13일차 1차 교차 점검(2팀)으로 경로 정정** (최초 `src/lib/sim/__suites__/`에 생성했으나, ⑴ `accounting`(포인트 총량 보존)이 애초에 sim이 아니라 Task 029(3팀 포인트 원장) 소관이고 ⑵ D-03은 sim 전용이 아니라 H-03(3단 머지 게이트)의 전역 근거이며 ⑶ 14일차 `include: ['src/lib/sim/**']` 커버리지 임계와 경로가 겹치는 문제까지 겹쳐 **`src/__suites__/{unit,snapshot,distribution,accounting,structure,performance}/`로 이동**(팀 md 산출물 지정 `src/**/__suites__/` 그대로 충족, 2팀 소유 경로 `src/lib/sim/**`에서도 빠져나옴). 각 1개 `*.suite.test.ts` placeholder(`describe`+`it.todo`), `docs/require/06-prioritization-and-risks.md` D-03 결정 ①~⑤·⑦ 대응(⑥ 공통코드 테스트는 `src/lib/config/*.test.ts`로 기구현되어 6종에서 제외). 단위(①)·성능(⑦)은 기존 co-located `*.test.ts`(2팀 `rng/{prng,derive,hash,precision,sort}`·`match/{stats,substitution,tick,tier-b-resim-contract,penalty}.test.ts` + `rng/bench.test.ts`)가 실질 담당 중임을 각 파일 JSDoc에 명시. 이동 후 `npx vitest run` 6파일 전부 todo로 재집계 확인(실패 0건, "빈 스위트가 통과" 요건 충족). 최종 구조는 15일차 H-03에서 확정)
  - [x] 커버리지 임계 설정 — `src/lib/sim/` 라인 80% / 브랜치 70% — **14일차 완료** (`vitest.config.ts` coverage에 `include: ['src/lib/sim/**/*.ts']` + `thresholds: { lines: 80, branches: 70 }` 추가, I-90 동반 해소. 재측정 결과 aggregate lines 87.61%/branches 77.97%로 통과. 임계를 임시로 99/99로 올려 `npm run test:coverage`가 실제로 실패(`exit code 1`, `ERROR: Coverage ... does not meet global threshold`)하는 것까지 재현 확인 후 80/70 원복. **⚠️ 13일차 인계가 요구한 `all: true`는 설치된 vitest 4.1.10에 존재하지 않는 옵션**이라 `include`만으로 대체(`docs/ISSUES.md` I-90 정정 기록). `perFile`은 2팀 소유 파일(`events.ts` 0%, `stats.ts` branch 66.66%) 보강을 강제하지 않기 위해 미채택 — 신규 I-94로 후속 판단 이관)
  - [x] 3단 머지 게이트 스크립트화 (`tsc --noEmit` + `lint` + `test`) — **15일차 완료**(`scripts/gate.sh` 신규, `package.json`에 `gate` 스크립트. `set -euo pipefail` fail-fast로 tsc→lint→test 순차 실행. WSL 마운트에서 프로덕션 빌드가 EPERM으로 죽으므로(I-62) `next build`는 게이트에 넣지 않는다. `passWithNoTests: true`로 "빈 스위트 통과" 요건 충족)
    - **24일차 — 3단 → 4단 게이트로 확장(1팀, I-138).** 앞단에 `npx next typegen`을 추가했다. `PageProps`/`LayoutProps`는 Next.js가 생성하는 전역 타입(`.next/types` + `next-env.d.ts`)이라 소스에 선언이 없고, **로컬은 이전 `next dev` 산출물이 남아 tsc가 우연히 통과했지만 CI는 체크아웃 직후라 타입 오류 10건으로 실패**했다(4일 연속 CI 레드의 원인). 두 생성물 모두 `.gitignore` 대상이라 커밋으로는 해결되지 않아 매 실행 시 생성해야 한다. `ci.yml`은 미변경(“`npm run gate` 단일 호출” 설계 유지). **`.next`·`next-env.d.ts`를 완전히 제거한 CI 동일 상태에서 `bash scripts/gate.sh` exit 0을 1팀·팀장이 각각 재현**
    - **팀장 검증에서 결함 2건 발견·수정(15일차).** ⓐ **게이트 3단계가 `npm run test`(= `vitest run`, `--coverage` 없음)라 커버리지 임계가 한 번도 평가되지 않았다** — 수락 기준 "임계 미달 시 실패"는 별도 수동 실행으로 시연됐을 뿐 게이트 동작이 아니었고, 커버리지 0%인 PR도 `npm run gate` exit 0으로 통과했다(팀장 실측). 3단계를 `npm run test:coverage`로 교체해 해소, `--coverage.thresholds.lines=99.9` 강제 시 exit 1 / 정상 임계 시 exit 0을 팀장이 독립 재현. ⓑ **커버리지 범위 보류 근거가 사실과 달랐다** — "회계·배당 모듈이 없어 include 확장이 무의미"라고 보류했으나, 팀장이 `src/lib/**`로 넓혀 실측하니 이미 존재하는 `config`(97.18%)·`naming`(96.18%)·`mock`(98.74%, 3팀 15일차 신설)은 전부 임계를 상회했고 **0%로 미달하는 건 1팀 자기 소유 `src/lib/data/**`**(Task 004 산출물, `bootstrap`/`factory`/`fetch-result`/`result` 4파일)뿐이었다. 해당 4파일에 테스트를 신규 작성해 해소(bootstrap 100%/branch 83.33%, 나머지 3파일 100%). `polling.ts`(272줄)는 React 훅 의존이라 jsdom+Testing Library 미설치 상태에서 `coverage.exclude`로 명시 제외 — **4팀 23일차 의존성 도입 시 재포함 조건부**(I-99)
    - **I-94 해소 — `perFile: true` 채택**(임계 lines 80 / branches 70 유지). 14일차 보류 사유였던 `events.ts`(0%)·`stats.ts`(branch 66.66%)가 2팀 15일차 산출물로 각각 100%/76.92%가 되어 차단 사유 소멸. 최종 `coverage.include`는 `sim`/`data`(polling 제외)/`config`/`naming`/`mock`, aggregate lines **98.05%** / branches **90.7%**, perFile 전 파일 통과. `coverage.exclude` 배열 지정이 vitest 기본 제외 목록을 덮어써 테스트 파일이 분모에 유입되는지 팀장이 json-summary로 별도 검증 — 28파일 중 `*.test.ts` **0건**
    - **인계 결정 2건 확정**: ⓐ 커버리지 범위 = 위 5개 디렉터리(회계 항등식·배당 모듈은 코드 생성 시 동일 임계로 편입). ⓑ **UI 테스트 전략** = 컴포넌트 단위는 **Vitest + Testing Library**(파일별 `// @vitest-environment jsdom` 오버라이드로 sim 기본 환경 유지), E2E·시각 회귀는 **Playwright MCP**로 Task 036(71일차~) 담당. 의존성은 4팀 착수 시점(23일차)에 근거 기재 후 추가
- **수락 기준**: 3개 스크립트가 동작하고 빈 스위트가 통과. 커버리지 임계 미달 시 실패. — **15일차 충족**(팀장 독립 재검증)

### Task 009: Supabase 물리 스키마를 설계한다 (구현 제외)

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 9일차 ~ 12일차 (2026-07-31 ~ 2026-08-05) / 추정 3.0인일 / 담당 6팀 DB·인프라팀
- **근거**: E-01~E-47, D-15, 05문서 5.14~5.17, DC-05~DC-08, NFR-SC-001
- **구현 사항**
  - [x] `docs/db/schema-design.md` 작성 — 47 엔티티의 테이블·컬럼·타입·제약 매핑 (단일 월드 전제)
  - [x] 관계 R-01~R-13 반영 (`TeamSeason` 소속 관리, `Contract/Loan` 기반 선수-팀, `fixture.snapshot_id` NOT NULL)
  - [x] 인덱스 설계 — 5.16절 13개 인덱스 + `fixture(status, kickoff_at)` 부분 인덱스 — **11일차 완료** (`docs/db/schema-design.md` §6.2, 공식 14개 인덱스 + 9~10일차 예고 이월분 6건 처리)
  - [x] 수치 정밀도 규약 (포인트 bigint / 배당 numeric(8,2) / 확률 numeric(9,8) / 컨디션 numeric(3,1)) — **9일차 앞당겨 반영** (`docs/db/schema-design.md` §1.2)
  - [x] RLS 정책 초안 — 공개 읽기·엔진 서비스롤 쓰기·`match_event` 경과 시간 뷰 (DC-05) — **12일차 완료** (`docs/db/schema-design.md` §6.3.1)
  - [x] 데이터 생명주기·아카이브 전략 문서화 (5.17절, NFR-SC-002) — **12일차 완료, I-07 반영(30시즌)** (`docs/db/schema-design.md` §6.3.2)
  - [x] 도메인 타입(Task 002)과의 필드 대응표 작성 — 불일치 0건 확인 — **12일차 완료, H-08 인계** (`docs/db/schema-design.md` §8)
- **수락 기준**: 설계 문서만 산출하며 **마이그레이션은 실행하지 않는다**. 팀원 4의 타입과 필드 단위로 정합.

### Task 010: 코드 규약과 정적 가드레일을 정비한다

- **담당**: 1팀 코어·품질팀
- **일정**: 16일차 ~ 19일차 (2026-08-11 ~ 2026-08-14) / 추정 3.0인일 / 담당 1팀 코어·품질팀
- **근거**: NFR-DT-001, NFR-MT-001·002·005·008·009, NFR-SEC-001, FR-UI-024, D-16, D-18, R-05, R-16
- **구현 사항**
  - [x] ESLint 커스텀 룰 — `src/lib/sim/` 내 `Math.random()` / `Date.now()` 금지, 위반 시 빌드 실패 — **16일차 완료**(`eslint.config.mjs`). **룰 이름을 `no-restricted-globals` → `no-restricted-properties`로 정정**: `no-restricted-globals`는 스코프상 전역 식별자의 **직접 참조**만 검사해 `Math.random()` 같은 MemberExpression에는 반응하지 않아 이 용도에 무력하다(**I-105**). `files: ["src/lib/sim/**/*.ts(x)"]` 스코프에 object/property 쌍(`Math.random`, `Date.now`)을 지정하고 위반 메시지에 대안(`sim/rng/prng.ts` 시드 PRNG)을 안내한다. 금지 패턴을 실제로 심어 lint 2건 에러를 재현한 뒤 원복(byte-identical 확인), 원복 후 lint 재통과. **알려진 한계**: 멤버 접근만 차단하므로 `const { random } = Math` 구조분해·`new Date()`는 우회 가능(수락 기준 밖, 필요 시 보강)
  - [x] `no-restricted-imports` — `src/lib/sim/`에서 `react`·`@supabase/*` import 금지, `src/components/`에서 Supabase 클라이언트 직접 import 금지 — **17일차 완료**(`eslint.config.mjs`, 2블록). ⓐ `src/lib/sim/**` 블록(16일차 `no-restricted-properties`와 동일 스코프): `react`/`react-dom`은 `paths`로, `@supabase/*`는 `patterns.group`으로 차단하고 위반 메시지에 NFR-DT-001 근거를 안내. Task 023(16일차) `perf-bench.test.ts`의 런타임 정규식 검사와 **이중**이지만 상충 없음(정적 lint가 앞단). ⓑ `src/components/**` 신규 블록: `@supabase/*` 직접 import 금지 — Mock First 원칙상 컴포넌트는 `src/lib/data`의 `DataSource` 어댑터만 거쳐야 하며, 클라이언트를 직접 물면 Mock↔실데이터 교체 시 컴포넌트까지 고쳐야 한다. **디렉터리는 아직 없으나(4팀 23일차 이후 생성) 선제 등록**. 임시 파일로 두 룰의 발동을 각각 확인 후 삭제(`git status`로 잔존물 0건 재확인), `lint`·`tsc --noEmit`·`test`(462 통과 시점) 전부 통과
  - [x] **UI 하드코딩 문자열 검출 룰**(D-18) — JSX 텍스트 리터럴 경고, 번역 키 경유 강제 — **18일차 완료**(`eslint.config.mjs` 3번째 룰 블록). `no-restricted-syntax`로 JSX 자식 텍스트(`JSXText`)와 `{"문자열"}`(`JSXExpressionContainer` 내 리터럴) 중 한글·영문을 포함한 것을 **warn**으로 검출하고 번역 키(`@/i18n`) 경유를 안내한다. **예외**: `src/i18n/**`(4팀 `t()`/Provider가 문자열을 값으로 다루는 정당한 경로)과 테스트 파일. **수락 기준 실증** — 룰 적용 후 기존 라우트 placeholder 17곳에서 **112건 warn 검출**, error 0
  - [x] 공통코드 대상 상수의 숫자 리터럴 잔존 검사 스크립트 (NFR-CFG-001 ③) — **18일차 완료**(`scripts/check-literals.mjs` 신규, `package.json`에 `check:literals`). `src/lib/config/fallback.ts`의 `SAFE_DEFAULT_VALUES`(37종)와 **값이 겹치는** 숫자 리터럴을 `src/lib/sim/**`(`rng/**` 제외)에서 찾아 보고하고 검출 시 exit 1. **게이트에는 미연결한 정보성 스크립트** — 값 일치 휴리스틱이라 우연 일치 오탐이 많다(단독 실행 36건 중 다수가 `snapshot-pipeline.ts`의 이벤트 타입 코드·squad 크기 등). mock/data 디렉터리는 시험 스캔에서 239건이 나와 스캔 대상에서 제외했다. allowlist 보강 후 게이트 연결 여부 판단 — **I-115**
  - [x] 커밋·PR 체크리스트 — Next.js 16 문서 참조 경로 명시, 신규 의존성 근거 기재, 외부 축구 데이터 도입 금지(D-16) — **19일차 완료**(`.github/pull_request_template.md` 신규). 전체 체크리스트는 `docs/devStep/03.*`이 단일 소스임을 명시하고, 그중 **위반 시 머지 거부** 3항목(C-1 D-16 외부 데이터 / C-20 Next.js 16 문서 참조 경로 / C-21 신규 의존성 근거)만 PR 시점에 재확인하도록 발췌. 여기에 3단 게이트(C-22), 이슈 연동(`R-*` 체계 명시 — I-109 포함), 소유 경로 확인 절을 붙였다. **3단 게이트의 lint 항목은 "경고 0"이 아니라 "이 PR로 새로 늘어난 경고 없음"으로 정의** — 근거는 아래 수락 기준 주석 및 I-116
  - [x] `docs/ISSUES.md` 갱신 규약 (NFR-MT-007) — **19일차 완료**(`docs/ISSUES.md` §6). 상태 표기 어휘, `R-*` 인용 시 체계 명시 규칙(I-109), PR 연동 규약(해소/신규 이슈 기재, 제보는 전원·반영은 1팀)을 규정
- **수락 기준**: `npm run lint` 경고 0. 금지 패턴을 일부러 심었을 때 CI가 실패한다. — **19일차 조건부 충족(팀장 판정)**. 후자는 팀장이 `src/lib/sim/**`에 `Math.random()`+`Date.now()`를 직접 심어 `no-restricted-properties` 오류 2건 검출을 재현 후 원복 확인. 전자는 **문면상 미충족(111 경고 잔존)이나 잔존 전량이 4·5팀 소유 `src/app/**`의 D-18 하드코딩 UI 텍스트**로, `src/i18n` 실배선(Task 011, 22일차)에 구조적으로 종속돼 1팀이 해소할 수 없다. 1팀 통제 범위 내 경고 0, 오늘 신규 증가분 0(134→111, `no-unused-vars`의 `^_` 접두사 관례 인식 추가 — 규칙 완화가 아니라 기존 코드베이스 관례와의 정합이며 접두사 없는 실제 미사용 변수는 계속 경고됨을 팀장이 diff로 확인). **22일차 Task 011 완료 시 재판정** — 경위는 **I-116**
- **Task 010 종료(19일차).** H-06 ESLint 가드레일은 20일차부터 5팀이 인수한다. 잔여: I-115(`check-literals.mjs` allowlist 보강 후 게이트 연결 여부) 미착수

### Task 011: 다국어(i18n) 기반을 구축한다 - 우선순위

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀 / 지원: 3팀 데이터·밸런싱·배당팀(열거형 ko/en 표시명)
- **일정**: 14일차 ~ 22일차 (2026-08-07 ~ 2026-08-19) / 추정 7.5인일 / 담당 4팀 UI기반·i18n팀 / **크리티컬 패스 · M-1 게이트**
- **근거**: **D-18**, FR-UI-020, FR-UI-023, NFR-MT-006·009, DC-02, DC-10
- **구현 사항**
  - [x] **선행 필수** — `node_modules/next/dist/docs/`에서 Next.js 16의 i18n·라우팅·미들웨어 관련 가이드를 읽고 참조 경로를 기록한다. 학습 데이터 기반 추정 구현 금지 (AGENTS.md) — **14일차 완료**. 참조 경로 5건(`internationalization.md`, `01-getting-started/16-proxy.md`, `03-file-conventions/proxy.md`, `04-functions/cookies.md`, `03-file-conventions/route-groups.md`) 및 15일차 이후 반영할 판단은 `docs/team-schedule/04-UI기반i18n팀.md` §8 참조. 코드/디렉터리 생성 없음(`proxy.ts`·`src/i18n/**` 여전히 미생성)
  - [x] 로케일 라우팅 전략 확정 — 경로 세그먼트(`/[locale]/...`) 방식 여부, 기본 로케일 **ko**, 2차 로케일 **en**, 미지원 로케일 폴백 규칙 — **15일차 완료**. 결정 3건: ⓐ **세그먼트명 `[lang]` 유지**(→`[locale]` 개명 안 함 — 17개 라우트 전체 이동 비용 대비 기능적 이득 0, Next.js는 세그먼트 이름에 의미를 두지 않으며 공식 예제도 `[lang]` 사용). ⓑ **`src/proxy.ts` 신설** — 무프리픽스 경로를 기본 로케일 `ko`로 307 리다이렉트(Next.js 16에서 `middleware.ts`는 `proxy.ts`로 개명됨, named `proxy` export + `matcher` 객체 배열 `source` 사용, `matcher.locale: false`는 App Router에 효과 없어 미사용). ⓒ **I-89 해소 — `experimental.globalNotFound: true` 채택**(`src/app/global-not-found.tsx` 신규)
    - **팀장 검증에서 동일 계열 결함 2회 발견·수정(15일차).** 1차: `/admin`을 `matcher.source`에서 배제한 결과 그 요청이 정규화를 거치지 않고 라우터에 도달해 **`[lang]`에 `admin`이 바인딩** — `GET /admin`이 `<html lang="admin">`으로 **홈 화면을 200 응답**했다(`/administrator` 등 접두사 경로도 동반 오배제). I-89를 채택한 근거("무효 lang 렌더 경로 차단") 자체를 무너뜨리는 결함이라 `/admin` 특별 취급을 철회. 2차: 수정 후에도 `matcher`의 확장자 제외(`.*\..*`)가 남아 **`GET /nonexistent.txt`가 `<html lang="nonexistent.txt">`로 200 응답** — matcher가 설계상 일부 경로를 의도적으로 매치하지 않으므로 "프록시가 모든 요청을 정규화한다"는 전제가 성립하지 않는다는 것이 근본 원인. **제외 목록을 좁히는 방식으로는 닫히지 않아 라우트 단 2중 방어로 전환**: `SUPPORTED_LOCALES` 단일 소스를 `src/i18n/locales.ts`로 분리(Next 런타임 API 미참조 — Edge/Node 양쪽 안전, `proxy.ts`가 import)하고, `[lang]/layout.tsx`에서 `<html lang>`은 항상 유효값만 쓰며 `notFound()`는 **`{children}` 자리의 `LocaleGate` 서브컴포넌트**로 배치(레이아웃 자신이 `<html>` 반환 전에 던지면 상위 경계가 없어 not-found를 못 거치고 내부 폴백으로 떨어짐을 4팀이 실측 확인)
    - **팀장 독립 재검증(클린 재기동 서버)**: `/ko`→200 lang=ko / `/en`→200 lang=en / `/admin`→200 lang=ko(1홉) / `/ko/admin`·`/ko/sample`·`/en/sample`·`/ko/matches/m1`→200 정상 / `/XX`·`/zz/nope`→404 lang=ko / `/nonexistent.txt`·`/some.file.here`→**404**(수정 전 200) / `/_next/static/chunks/webpack.js`→200(정적 에셋 회귀 없음). **무효 lang 렌더 경로 0건**. 잔여: 확장자 포함 경로가 프로젝트 404 UI가 아니라 Next 내부 폴백(`__next_error__`)으로 응답 — 무효 lang은 아니므로 비차단, I-101로 등재
  - [x] 메시지 카탈로그 구조 설계 — `src/i18n/messages/{ko,en}/` 를 도메인별 네임스페이스로 분할(`common`, `league`, `match`, `player`, `team`, `stat`, `admin`, `error`) — **16일차 완료**(`src/i18n/messages/{ko,en}/*.ts` 16파일 + `index.ts` 신규). `index.ts`가 locale→네임스페이스 배럴이며 `satisfies Record<(typeof SUPPORTED_LOCALES)[number], unknown>`로 로케일 목록(`src/i18n/locales.ts`, 15일차)과 카탈로그의 정합을 강제한다. `common` 값은 `[lang]/layout.tsx`의 하드코딩 문자열(011 교체 예정 주석)을 그대로 이관했고 **`layout.tsx` 자체는 미수정**(실배선은 22일차 LocaleSwitcher). 열거형 표시명(`enums.*`, 3팀 H-10)은 이 배럴에 미포함 — 별도 인계
  - [x] 번역 키 네이밍 규약 — `<namespace>.<component|screen>.<element>` 형식, 키 상수의 타입 안전 접근(누락 키를 `tsc`가 잡도록 타입 생성) — **16일차 완료**(`docs/devStep/09.i18n키규약과메시지카탈로그구조_4팀_16일차.md`). **ko가 값+타입의 기준**이고 en 각 파일은 ko에서 뽑은 타입을 적용해(타입 애노테이션 = excess property check) **키 누락·고아 키를 컴파일타임에 차단**한다 — 별도 타입 생성 스크립트 없이 `tsc`가 잡는 구조
    - **17일차 보강 — 규약 명문화 + 소비 측 타입 안전 접근**(`src/i18n/keys.ts`, `keys.type-test.ts` 신규). 16일차가 닫은 것은 **카탈로그 내부의 정합**(ko↔en 키 누락·고아 키)이고, 17일차가 닫은 것은 **카탈로그를 참조하는 쪽**이다 — `messages.ko` 타입에서 재귀 조건부 타입 `DotPath<T>`로 `TranslationKey` 유니온을 파생하고(리프 도달 지점만 채택해 3단 구조를 타입으로 강제), 항등 헬퍼 `translationKey<K extends TranslationKey>(key: K): K`를 제공한다. 네이밍 규약 `<namespace>.<component|screen>.<element>`는 `keys.ts` 헤더에 명문화했고, 기존 8개 네임스페이스 전량이 이미 이 3단 구조임을 실사 확인했다. **codegen 스크립트를 채택하지 않은 근거**: 카탈로그 변경 시 재실행을 강제할 pre-commit 훅이 이 프로젝트에 없어(Husky/lint-staged 미설치) 재실행을 잊으면 생성 타입이 stale해져 **"없는 키인데 타입은 통과"하는 역효과**가 난다 — 재귀 타입은 카탈로그와 같은 컴파일에서 갱신되므로 이 실패 모드가 원천 차단된다(재검토 조건: 카탈로그가 TS 재귀 한도에 근접하거나 런타임 키 순회가 필요해질 때, `keys.ts` 주석에 기록). 수락 기준 "존재하지 않는 키 사용 시 타입 오류"는 `keys.type-test.ts`의 `@ts-expect-error` 4건(오탈자·미존재 네임스페이스·부분 경로)이 **전부 실제 오류로 소비됨**을 vitest typecheck 모드로 실측 고정 — `npm run test` 516 통과, `Type Errors: no errors`
  - [x] 로케일 컨텍스트/Provider와 서버·클라이언트 양쪽에서 쓰는 번역 함수 API 확정 — **18일차 완료**(`src/i18n/t.ts`, `provider.tsx`, 테스트 2파일 신규 / 기존 `keys.ts`·`locales.ts`·`messages/` 무변경). **`t(locale, key, params?)`는 React를 참조하지 않는 순수 함수** — 서버 컴포넌트는 `params.lang`을 그대로 넘겨 직접 호출한다(Next.js 공식 i18n 가이드의 `getDictionary` 패턴). 클라이언트 컴포넌트는 `TranslationProvider`(Context) + `useLocale()`/`useTranslation()`이 **같은 `t()`를 바인딩해** 제공하므로 구현이 두 벌로 갈리지 않고, Context는 prop 드릴링 회피 용도로만 쓰인다. **설계 근거**: RSC는 Context를 사용할 수 없어(공식 문서 확인) 서버가 Provider를 경유할 방법이 없다 — 사실상 단일 선택지. `{placeholder}` 보간을 지원하고, **미존재 키·Provider 누락은 조용히 넘기지 않고 throw**한다. 테스트 10건 — jsdom 미설치라 `react-dom/server`의 `renderToStaticMarkup`으로 서버 직접 호출·Provider 하위 훅·Provider 밖 에러 경로를 모두 검증. `tsc --noEmit` 0 error, `npm run test` 542 통과. **루트 레이아웃 실배선(Provider로 `children` 감싸기)은 22일차 LocaleSwitcher와 함께** — 오늘은 API 확정까지가 스코프
  - [ ] **열거형 표시명 카탈로그**(팀원 6) — 포지션 11군, 이벤트 23종, 부상 4등급, 전술 성향 6종, 페이즈 6종, 수상 종류, 마켓 상태의 ko/en 표시명
    - [x] **골격 — 19일차 완료(4팀)**: `src/i18n/messages/{ko,en}/enums.ts` 신규. 3팀 H-10 목록 전량(포지션 11·이벤트 23·부상 4·전술 6·페이즈 6·수상 12·마켓 상태 4)을 `EnumTranslationCatalog<T>`(T12, `@/types`)로 감싸 **도메인 enum의 전 멤버가 매핑됐는지 tsc가 강제**한다 — 유니온 멤버가 늘거나 줄면 즉시 컴파일 오류로 드러난다. `enums.position.GK` 형태의 3단 구조(`keys.ts` 규약) 준수, `@/types` 배럴로만 import(C-5·C-6 위반 0건, 팀장 grep 실증). ko/en 키 수 동일(각 74), D-18 lint 경고 0. `../index.ts` 통합 `messages`에는 **미합류**(Provider 실배선 22일차 이후, 09문서 §4 방침 유지)
    - [ ] **실값 기입 — 3팀이 23일차 이후**: 현재 값은 전부 enum 리터럴을 echo하는 자리표시자다. 4팀은 값을 임의로 채우지 않는다
  - [x] **날짜·시각·숫자 서식** — 킥오프 시각(UTC 저장 → 로케일 로컬 변환, DC-07), 포인트 천단위 구분, 배당 소수 2자리 표기를 로케일별 포맷터로 단일화 — **20일차 완료**(`src/i18n/format.ts`, `format.test.ts` 신규). `formatKickoff`(style: `time`/`dateTime`/`date`) · `formatPoints` · `formatOdds` 3함수를 `Intl.*` 기반으로 구현. **포맷터 단일 소스 성립을 팀장이 실증** — `src/**`에서 `toLocaleString`/`Intl.*` 직접 호출이 `src/i18n/format.ts` 외 **0건**(각 화면이 직접 포맷하지 않음). 테스트 10케이스 통과, 전체 641 통과(회귀 0), **D-18 경고 신규 추가 0건**(기존 111건 불변). 소비는 5팀 28일차 이후
  - [x] **번역 대상 경계 명문화** — 번역함: UI 레이블, 열거형 표시명, 안내·에러 문구 / **번역하지 않음: 선수·클럽·감독·스폰서 이름(D-17에 따른 국적 기반 생성 고유명사), 구장명, 시드 값** — **21일차 완료**(`src/i18n/README.md` 신규). 산문 나열에 그치지 않고 **판단이 갈리는 경계 사례 3종을 명문화**했다: ⓐ enum 표시명(유한 집합 → 번역함) vs 시드 고유명사(개방형 → 번역 안 함)를 국적코드 vs 구장명 대비로 구분 ⓑ 파라미터 치환 방향 — 템플릿만 번역하고 원문을 주입할지, 주입값도 번역할지(`seasonPhaseLabel {phase}` 사례) ⓒ 고유명사+수치가 섞인 완성 문장(headline)은 **카탈로그에 아예 넣지 않는다**
    - **자동/사람 검출 구분표**를 함께 실었다 — `tsc`(키 구조·3단 경로·enum 멤버 커버)와 ESLint D-18(JSX 하드코딩 텍스트)이 각각 무엇을 잡고 **무엇을 못 잡는지**(고유명사 오탐, 속성값 사각지대, 콘텐츠 경계 미판별)를 구분해, 같은 날 1팀의 CI 번역 키 검사 편입 작업과 맞물린다
    - `docs/devStep/09` §2가 계획한 "객체 프로퍼티 체인"과 실제 `keys.ts`(점 문자열 + `DotPath` 재귀 타입)가 어긋나 있어 README에 **코드가 옳다**고 명시 → I-125(09문서 최소 정정)
    - `tsc` 0 error, lint **신규 경고 0건**(기존 111 불변)
  - [x] 로케일 스위처 컴포넌트 + 선택 로케일 영속화(쿠키), 신규 로케일이 카탈로그 추가만으로 확장 가능함을 확인 — **22일차 완료, Task 011 종료 · M-1 Phase 1**(`src/components/ui/LocaleSwitcher.tsx` 신규 — **`src/components/` 디렉터리 첫 파일**로, 원래 23일차 예정이나 011 산출물이라 앞당겼다. `domain/`·`state/`·프리미티브 13종은 여전히 23일차 이후). 로케일은 경로 세그먼트가 단일 소스이므로 **전환 = 내비게이션** — 현재 경로의 첫 세그먼트만 교체하고 `router.replace`를 쓴다(로케일 전환은 설정 토글에 가까워 히스토리 스택에 항목을 남기지 않음). 쿠키(`LOCALE_COOKIE_NAME`)는 이 전환의 부수효과로만 기록되며 **오늘은 어떤 서버 코드도 읽지 않는다**(선행 배선). 루트 레이아웃에 **`TranslationProvider` 실배선**(18일차 API 확정 후 이월분) + 헤더 placeholder 교체, `enums.ts`의 `../index.ts` 합류(구조만 — 실값 기입은 3팀 23일차 이후)
    - **수락 기준 "D-18 경고 111건 해소"가 판정 대상이었고 111건 → 0건으로 충족**(`npm run lint` 0 problems, 팀장 실행). 대상: 헤더·사이드내비·푸터 + 라우트별 `loading`/`error`/`not-found` 60개(20라우트×3) + `global-not-found`. "번역 키 누락이 `tsc` 오류로 검출"은 기존 `satisfies` 구조 유지로 충족
    - **⚠️ 검증 제약** — Playwright MCP가 **Chromium 미설치로 실패**해 클릭 전환·"새로고침 없음"·고유명사 불변 **실측은 미수행**, curl 기반 SSR 검증(`/ko`·`/en` 라벨 전환, `aria-pressed`)으로 대체했다 → **I-128**. 고유명사 불변은 현재 렌더 페이지에 고유명사 콘텐츠 자체가 없어 실측 불가이나 스위처가 데이터에 관여하지 않아 구조적으로는 성립
    - 라우트별 `loading`/`not-found`는 Next 16.2.10에서 `params` 접근 수단이 없어(`unstable_rootParams` 제거) **DEFAULT_LOCALE 고정** — 근거는 `src/i18n/README.md` §4, 쿠키 판독 완화는 후속 → **I-129**
- **수락 기준**
  - ko/en 두 로케일로 전 라우트가 렌더되고 로케일 전환 시 새로고침 없이 문구가 바뀐다.
  - 번역 키 누락이 `npx tsc --noEmit`에서 오류로 검출된다.
  - 고유명사(선수·클럽명)는 로케일 전환에도 변하지 않는다.
- **테스트**: Playwright MCP — 로케일 스위처 전환 후 헤더·순위표·경기 상세의 레이블 변경 및 고유명사 불변 확인, 날짜·숫자 서식 로케일별 스냅샷.

---

## Phase 2: UI/UX 완성 (더미 데이터 활용)

> **일정**: M-3 완료 목표 65일차 (2026-10-19) — 실행 구간 23~65일차 / Task 012~022 **+ 046~048**(49일차 신설 — I-223 인덱스 화면 3종, 전부 65일차 이전에 종료해 **M-3 불변**)

> **목표**: Mock 데이터만으로 전 관전 화면을 완결한다. **엔진 없이도 제품 전체 플로우를 체험**할 수 있어야 한다.
> **완료 조건**: FR-UI-001~013, 019~021, 025, 026 전 화면이 4상태로 동작 + `/sample` 커버율 100%(KPI-6) + **전 화면 ko/en 렌더**.
> **Phase 2 전 Task 공통 완료 조건 (D-18)**: 하드코딩 문자열 0건 — 모든 표시 문구는 번역 키를 경유하며, ko/en 두 로케일에서 레이아웃이 깨지지 않는다.

### Task 012: shadcn/ui를 도입하고 디자인 토큰 체계를 정립한다 - 우선순위

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀 / 지원: 5팀 화면·배팅UX팀(SP-2 분할 합의)
- **일정**: 23일차 ~ 27일차 (2026-08-20 ~ 2026-08-26) / 추정 4.0인일 / 담당 4팀 UI기반·i18n팀 / **크리티컬 패스**
- **근거**: NFR-RS-003·005, NFR-A11Y-002, D-18, CLAUDE.md(Tailwind v4 CSS-first)
- **구현 사항**
  - [x] shadcn MCP로 레지스트리 확인 후 필요한 프리미티브만 선별 도입 (`components.json` 생성, `cn()` 헬퍼) — **23일차 완료(4팀)**. `components.json`(신규, base=radix / preset=nova), `src/lib/utils.ts`(`cn()` = clsx + tailwind-merge), `src/components/ui/{badge,button,card,separator,skeleton,table,tabs,tooltip}.tsx` **8종**. 나머지(select·dialog·nav-menu 등)는 **013A 확정 후 24~27일차에 필요한 것만** 추가한다. `tsc`·`lint`·816 tests 통과, `npm run dev`(webpack)로 `/ko`·`/ko/sample` 200 확인
    - **shadcn init 기본값 2건이 이 프로젝트 규약과 충돌해 4팀이 직접 교정**했다: ⓐ `.dark` 클래스 기반 다크모드(`@custom-variant dark (&:is(.dark *))`)를 심는데 이 프로젝트는 **클래스 토글러가 없어** 그대로 두면 다크모드가 죽는다 → `prefers-color-scheme` 미디어쿼리 기반으로 교체(CLAUDE.md 규약, `globals.css:84`) ⓑ 내부 `npm install`이 WSL `/mnt`에서 하위 패키지 chmod EPERM으로 실패(I-62 계열) → 임시 `.npmrc`의 `--no-bin-links`로 우회 후 **제거 확인**. 재초기화하는 팀원은 이 둘을 주의
    - **팀장 검증 결함 — `lucide-react` import 0건(해소)**: shadcn init 표준 흐름대로 런타임 의존성 6개가 추가됐으나 프리미티브 8종 중 아이콘을 쓰는 것이 없어 `lucide-react`만 소비처가 없었다. 수락 기준 "근거와 함께 최소로(NFR-MT-008)"를 팀장이 **"마감 시점 `src/` 내 import 0건인 런타임 의존성은 남기지 않는다"**는 판정 규칙으로 구체화 → 4팀이 제거. 최종 6개(cva 3 / radix-ui 5 / tw-animate-css 1 / clsx 1 / tailwind-merge 1) **전부 import 근거 확보**
  - [x] `tailwind.config.ts`를 만들지 않고 `src/app/globals.css`의 `@theme inline`에 토큰 확장 — **24일차 착수(4팀)**. `tailwind.config.ts` **미생성 실측 확인**(CLAUDE.md Tailwind v4 CSS-first 준수). 24일차분은 브레이크포인트 6종이며, 나머지 토큰군은 아래 항목별 일차에 같은 방식으로 이어서 확장한다
  - [x] 시맨틱 컬러 토큰 — 승격(초록)/플레이오프(파랑)/강등(빨강)/LIVE/경고, **색상 단독 금지 → 아이콘·라벨 병기** (NFR-A11Y-002) — **25일차 완료(4팀)**. 24일차에 착수하지 않은 것은 `docs/wireframe/00-공통규약.md`가 "색상 등 시각 토큰은 4팀 H-11(28일차) 전 미정"이라 명시하고 W-06 각주가 25일차를 예고했기 때문(4팀 판단, 팀장 승인). `src/app/globals.css`에 라이트/다크 각각 5종 + `@theme inline` 매핑, 회귀 테스트 `src/lib/a11y/contrast.test.ts`(**102케이스**) 신규
    - **팀장 검증에서 결함 2건이 나와 수정했다.** 초기 산출물은 색맹 3종 상호 구분(ΔE)만 검증하고 **배경 대비 축이 통째로 빠져 있었다** — 팀장 실측 결과 라이트 `--warning` **1.34:1**(비텍스트 3:1 기준도 미달), 다크 `--relegation` 3.70:1(본문 텍스트 불가), **5개 중 4개 토큰이 sRGB 색역 밖**이라 브라우저 클램프로 실제 렌더 색이 달라져 원 ΔE 검증 자체가 무효인 상태였다
    - 조치: 색역 밖 토큰은 채도를 낮춰 색역 안으로 넣고, **`--warning`은 배지 채움 전용으로 용도를 확정**한 뒤 짝이 되는 `--warning-foreground`(배지 위 8.2~9.6:1)를 신설했다. 비텍스트 4색은 라이트·다크 모두 **3:1(WCAG 1.4.11) 이상** 확보. **ΔE 하한은 15 → 12**다 — 후속 재계산에서 이것이 채도 조정의 결과가 아니라 **처음부터 그랬던 것**으로 드러났다. 실측 최소치 **12.56**(다크·protanopia의 `--live`↔`--warning`)인 이 쌍은 두 토큰 모두 채도 미조정 원값이라, **초기 보고의 "ΔE≥15 확보"가 이 쌍을 빠뜨린 부정확한 수치**였다(나머지 39쌍은 ≥15). 아이콘·라벨 병기 전제와 함께 수용하되 여유가 0.56뿐이라 → **I-144**
    - **회귀 테스트는 `globals.css`를 정규식 파싱**해 값을 하드코딩 복사하지 않는다 — 토큰 값이 바뀌면 반드시 깨진다. 4축(CVD 3종+정상 시야 전 쌍 ΔE / sRGB 색역 / 페이지 배경 3:1 / 배지 쌍 4.5:1)을 모두 단언한다
    - ⚠️ **비텍스트 3:1 기준은 "배지 채움·보더·아이콘 전용"이라는 전제 위에 있다.** 다크 `--relegation`은 3.70:1이라 본문 텍스트 전경으로 쓰면 즉시 기준 미달이고, **테스트는 토큰 값만 지킬 뿐 소비처 오용은 잡지 못한다**(컴포넌트가 아직 없어 원천적으로 불가) → **I-143**, 013A(33일차) 착수 시 4팀이 코드로 강제할 방법을 검토한다
  - [x] 라이트/다크 모드 대응 및 대비 4.5:1 검증 — **26일차 완료(4팀)**. 라이트/다크는 기존 `prefers-color-scheme` 구조를 유지해 대응하고, **텍스트 대비 4.5:1(WCAG 1.4.3)을 24조합 전건 실측**해 `src/lib/a11y/contrast.test.ts`에 고정했다(102 → **124케이스**)
    - **create-next-app 기본 토큰에서 미달 1건을 찾아 고쳤다** — 라이트 `--muted-foreground`(L=0.556)가 `--muted` 배경 위 **4.339:1로 기준 미달**이었다. L=0.52로 낮춰 `--muted` 위 **5.051:1**·`--background` 위 5.509:1로 통과시켰다(다크는 원래 5.829:1로 통과). 나머지 22조합은 6.5:1~19.8:1, 다크 최저치는 `sidebar-primary-foreground/sidebar-primary` 6.536:1
    - **팀장이 WCAG 상대휘도 공식으로 독립 재계산해 세 수치(4.339 / 5.051 / 5.509)가 소수점까지 일치**함을 확인했다. 25일차 컬러 토큰과 달리 이번엔 보고치와 실측이 어긋나지 않았다
    - 이 미달이 **프로젝트가 작성한 값이 아니라 스타터 기본값**에서 나온 점이 중요하다 — 검증하지 않은 나머지 기본 토큰에도 같은 문제가 남아 있을 수 있어 013A(33일차) 착수 전 전수 재점검이 필요하다 → **I-148**
  - [x] 타이포·간격·반응형 브레이크포인트(320/375/768/1024/1440/1920) 스케일 확정 — **브레이크포인트 6종 24일차 완료(4팀)**. `@theme inline`에 `--breakpoint-xs`~`--breakpoint-2xl`(20/23.4375/48/64/90/120rem). 값은 `docs/wireframe/00-공통규약.md §5`의 px를 16px 기준 rem 환산해 그대로 반영했고, **`xs`·`sm`·`xl`·`2xl`은 Tailwind v4 기본값과 달라 재정의**했다. `2xl`은 문서상 1920~2560 범위 중 **하한만 브레이크포인트로 쓰고 상단은 최대폭 컨테이너 중앙 정렬로 처리**한다(별도 브레이크포인트를 만들지 않음)
    - **타이포·간격 스케일 26일차 확정(4팀)** — **Tailwind v4 기본 스케일(`--text-*`, `--spacing: 0.25rem)을 오버라이드 없이 그대로 채택**하기로 결정하고 `globals.css`에 근거 주석을 남겼다. 브레이크포인트와 달리 이쪽은 달리해야 할 요구사항이 없었고(`docs/wireframe/00-공통규약.md`가 시각 토큰을 이 팀 재량으로 위임), 4px 그리드와 기본 type scale은 013A/013B가 `text-sm`·`p-4` 같은 유틸리티로 바로 소비할 수 있어 별도 매핑 문서가 필요 없다. **"기본값 채택"이 결정 그 자체이므로 오버라이드가 없어 회귀 테스트 대상도 없고, 그 주석이 결정 기록의 단일 소스다**
    - **27일차 4팀 — 라인하이트·자간 토큰은 추가하지 않기로 확정.** 013A 컴포넌트가 아직 없어 "실사용 시 확인"이 원천 불가능했고, 폭 규약이 `ch` 단위 Tailwind 임의값만으로 해결돼 새 CSS 커스텀 프로퍼티가 필요하지 않았다. **`globals.css`를 이번 일차에 아예 건드리지 않은 것이 I-150(주석 조기 종료) 재발 리스크도 차단**했다. 실제 라인하이트·자간 판정은 013A(33일차) 실사용 시점으로 넘긴다
  - [x] **로케일별 텍스트 길이 편차(ko↔en) 대응 — 버튼·배지·테이블 헤더 최소/최대 폭 규약** — **27일차 완료(4팀)**
    - `button.tsx`: size별 `min-w-[Nch]`(default·lg 6ch / sm 5ch / xs 4.5ch). **max-w는 의도적으로 미지정** — 버튼 라벨은 잘리면 의미가 사라지므로 폭이 늘어나는 쪽을 택했다
    - `badge.tsx`: `max-w-[14ch]` + `shrink-0` 유지(형제의 flex-grow에 짧아지지 않게). en 표시명이 긴 조합(`awardType` "Manager of the Season")에서 부모 레이아웃이 깨지는 것을 막는다
    - **팀장 검증 결함 — `truncate`의 말줄임이 실제로는 나오지 않는다(정정 완료)**: `badgeVariants`가 `inline-flex` 컨테이너라 `text-overflow: ellipsis`가 자식(익명 flex item)에 적용되지 않아 **말줄임(…) 없는 하드 클립**이 된다. 기능 회귀는 아니지만(기존 `overflow-hidden`/`whitespace-nowrap`과 동일 동작) 주석이 "truncate(말줄임)로 자른다"라고 단언해 **계약 문구와 실제 렌더가 어긋난 상태**였다. 소비처가 0곳인 마감일이라 API 변경 대신 **주석과 H-11 문서를 사실대로 정정**했다(하드 클립 명시 + 말줄임이 필요하면 소비처가 `<span className="min-w-0 truncate">`로 감쌀 것 + `title` 속성 권고 강화)
    - `table.tsx`: `TableHead`·`TableCell`에 `numeric` prop 신설(우측 정렬 + `tabular-nums`). 컬럼별 최소폭은 "두 로케일 중 더 긴 라벨 + 여유 1ch"를 소비처가 `min-w-[Nch]`로 지정하는 규약으로 주석화
  - [x] **H-11 인계(→ 5팀)** — **27일차 완료(4팀)**. `docs/handoff/H-11-design-tokens-shadcn-primitives.md`(신규). shadcn 프리미티브 **정확히 8종**(Button·Badge·Card·Separator·Skeleton·Table·Tabs·Tooltip, `LocaleSwitcher`는 011 산출물이라 제외), `cn()`(`src/lib/utils.ts`), 디자인 토큰(브레이크포인트 6종 / 시맨틱 컬러 5종+CVD / radius 7단계 / 타이포·간격 기본값 / `prefers-color-scheme` 다크모드). **팀장이 `src/components/ui/**` 실물 존재를 직접 확인**했다. 미도입 7종(Avatar·Dialog/Sheet·Select·Popover·Progress·Accordion·Alert)은 **013B 중 5팀이 shadcn MCP로 직접 추가 가능**(4팀 승인 불필요, dailyWorkLog 기록만)
    - ⚠️ **H-12(도메인 표현·상태 14종)는 013B가 아니라 015(34일차) 착수 조건**이다 — 5팀 지적으로 확인, 28일차 인계물에 포함하지 않는다
  - [x] **SP-2 컴포넌트 분할 확정(4·5팀)** — **27일차 완료**. 4팀 초안과 5팀 입장이 **완전 일치**해 이견 없이 확정됐다. 배분 근거가 §1 소유 경로(`domain/`·`state/`=4팀 / `composite/`=5팀)로 이미 고정돼 있어 재협상이 아닌 **대조 확인** 성격이었다. **4팀 14종**(도메인 표현 8 + 상태·유틸 6) / **5팀 13B 8종**(복합 7 + MatchCard) = **총 22종**
    - **W-02 `MatchCard` 승격(21→22)**: 홈 A2-c·클럽상세 F8·일정결과 C2-r 3곳이 동일 도메인 모델이라 `density:"card"|"row"` prop 단일 통합으로 처리(5팀 확인). LIVE 배지·경과분(H-24)은 카드형 전용이라 조건부 렌더 분기가 필요하다. **공수는 013B 4.25인일에 흡수하지 않고 +0.6~0.7인일을 증분으로 별도 산정**(5팀 산정 — 2모드 × 3소비처 동기화 비용)
    - **W-31 F4-p(시간대별 득점/실점 분포)는 화면 로컬 유지**: 클럽상세 1곳 전용이라 카탈로그에 넣지 않는다(013B 공수 재초과 방지). 양 팀 동의
- **⚠️ 수락 기준 "두 테마 × 두 로케일 레이아웃 깨짐 0"은 미검증 상태로 종료됐다 → I-153.** Button/Badge/Table의 **실제 소비처가 0곳**이라(013A/013B 착수 전, `/sample`도 34일차까지 빈 자리표시자) 렌더할 화면 자체가 없었고, Playwright 미설치(I-128) + jsdom·`@testing-library/react` 미설치(**I-151**)로 실측 경로가 이중으로 막혀 있다. **4팀이 이를 "통과"로 올리지 않고 "미확인(코드 검토만)"으로 자진 보고했고 팀장이 그대로 수용**했다 — 26일차 V-02 기록 오류(실측치 오기)와 같은 유형을 예방한 처리다. Task 012는 **"작업 완료 / 수락 기준 미검증"** 으로 종료하며, 실측 판정은 013A(33일차)/013B 실사용 시점 또는 jsdom 도입 이후로 이월한다
- **I-148·I-143은 27일차에 처리하지 않았다(기한대로 013A/33일차 유지).** 팀장 소환 지시가 두 이슈 처리를 요구하면서 동시에 `docs/ISSUES.md` 열람을 금지해 4팀이 내용을 확인할 수 없었다 — **지시 설계 오류**이며 4팀의 보류 판단이 옳았다. 이후 소환 지시에 이슈 처리를 넣을 때는 이슈 본문 요약을 함께 준다
  - [ ] **로케일별 텍스트 길이 편차(ko↔en) 대응** — 버튼·배지·테이블 헤더의 최소/최대 폭 규약
- **수락 기준**: 신규 의존성이 근거와 함께 최소로 추가되고(NFR-MT-008), 두 테마·두 로케일 모두 레이아웃 깨짐 0.

#### 후속 — Task 013C 비주얼 디렉션 확립 (36일차, 2026-09-08, 팀장 단독)

정식 Task 번호가 아니라 **사용자 지시("화면이 너무 밋밋하다")에 따른 후속 작업**의 편의상 명칭이다. Task 012가 확정한 것은 시맨틱 5색·브레이크포인트·타이포 스케일뿐이었고 **중립색·차트색은 create-next-app/shadcn 기본값(채도 0의 순수 회색, 명도만 다른 회색 차트 5종)이 그대로 남아** 34~35일차 첫 실렌더에서 전 화면이 무채색으로 보였다. 상세는 `docs/dailyWorkLog/36Day.md`.

- **디렉션 "Floodlit(야간 조명)"** — 브랜드 브라이트는 조명 호박색(hue 68~70). **초록을 브랜드색으로 쓰지 않는다**(`--promotion`과 겹쳐 시맨틱 색의 구분력이 희석되므로). 중립은 hue 172~180의 극저채도 잉크. `--board-*` 4종은 라이트/다크 공통으로 항상 어두운 중계 표면
- **커스텀 유틸리티 6종** — `board`/`pitch-stripes`/`eyebrow`/`scoreboard`/`touchline`/`live-dot`. 규약 요약은 CLAUDE.md 스타일링 절, 근거는 `globals.css` 상단 주석이 단일 소스
- **색상 안전성은 코드 작성 전에 전수 실측** — `contrast.test.ts`와 동일 수식으로 후보 팔레트를 스크립트 검증한 뒤 CSS 작성. 시맨틱 5색은 ΔE 여유 0.56(I-144)이라 **일절 미변경**. 최소 여유는 다크 `--relegation` 대 배경 3.599:1
- **I-153 수락 기준("두 테마 × 두 로케일 레이아웃 깨짐 0")이 이때 처음 실측됐다** — 27일차에 소비처 0곳·Playwright 미설치로 미검증 종료됐던 항목이다. **뷰포트 6종(320/375/768/1024/1440/1920) × 테마 2종 × 경로 7종 = 84조합**을 Playwright로 `documentElement.scrollWidth > clientWidth` 자동 판정해 **전건 오버플로 0**. 이 실측이 결함 2건을 실제로 잡았다 — 320px 사이드바 오버플로(**I-183**, 536→320) / 자리표시자 18개의 `<pre>` 미줄바꿈으로 인한 320px 오버플로(355→320, `whitespace-pre-wrap` 부여로 해소)
- **게이트**: `npm run typecheck`·`lint`·`test`(1331) 전건 통과 / 105파일 변경
- **신규 이슈 3건**: I-184(`sm`=375px 재정의로 `sm:*`가 휴대폰에서 발동) · I-185(WSL DrvFs dev watcher 미동작) · I-186(사이드 내비 11개 중 5개가 404 — 인덱스 라우트 부재)
- **미이행 이월**: `SiteHeader`/`SideNav`/`SiteFooter` 컴포넌트 분리(23일차부터). 36일차 스코프가 이미 100파일을 넘어 리뷰 단위 과대로 판단 — I-186에 묶음

### Task 013: 공통 컴포넌트 21종을 4상태로 구현한다 - 우선순위

- **담당**: 4팀 UI기반·i18n팀(013A 도메인·상태 14종) + 5팀 화면·배팅UX팀(013B 복합 7종) / 리뷰: 1팀 코어·품질팀
- **일정**: 28일차 ~ 33일차 (2026-08-27 ~ 2026-09-03) / 추정 8.5인일 / 담당 4팀 UI기반·i18n팀 + 5팀 화면·배팅UX팀 / **크리티컬 패스** — 일정상 **2단위 분할(스코프 불변)**: 013A(도메인 표현 8종 + 상태·유틸 6종 = 14종, 4.25인일, 4팀) 28~33일차 / 013B(복합 7종, 4.25인일, 5팀) 28~33일차. 두 팀이 서로 다른 디렉터리에서 병렬 수행
- **근거**: FR-UI-021, FR-UI-000, FR-UI-024, NFR-RS-002, D-18
- **구현 사항**
  - [x] 도메인 표현 컴포넌트: ~~`TeamBadge`~~, ~~`PlayerAvatar`~~, ~~`AbilityRadar`~~, ~~`ConditionGauge`~~ (28일차 완료), ~~`FitnessBar`~~, ~~`FormStrip`~~, ~~`PositionMap`~~, ~~`StatBar`~~ (29일차 완료) — **8/8 종결**
  - [ ] 복합 컴포넌트: ~~`EventTimelineItem`~~, ~~`NewsItem`~~ (28일차 완료), ~~`PitchLineup`(7 포메이션)~~ (29일차 완료 — 7종 렌더 검증), ~~`BracketTree`~~ (**30일차 완료**), ~~`GrowthChart`~~, ~~`InjuryTimeline`~~ (**31일차 완료**), ~~`TrophyCase`~~ (**32일차 완료 — 013B 7/7 종결**), **`MatchCard`**(27일차 SP-2 승격 — `density:"card"|"row"` 단일 통합, +0.6~0.7인일 증분)
    - **`GrowthChart`·`InjuryTimeline` 31일차 완료(5팀)** — `src/components/composite/{GrowthChart,InjuryTimeline}.tsx`(+test). **I-152 해소 — 자체 SVG로 확정, recharts 미도입**(런타임 의존성 8개 유지). 두 컴포넌트 모두 단일 시리즈/구간 막대라 폴리라인·rect 좌표 계산으로 완결되며 줌·범례·다중시리즈 요구가 없다는 실구현 근거로 판정했다. 좌표 계산은 순수 함수로 분리(BracketTree·PitchLineup 선례)
    - `GrowthChart`는 **FR-PL-004 준수** — 읽는 필드가 `seasonNumber`/`ovr`뿐이라 `pa`가 구조적으로 미노출된다(팀장 대조 확인). `InjuryTimeline` 상태 표시명은 당일 3팀이 신설한 정본 `enums.injuryStatus`로 32일차에 교체 예정(**I-165**)
    - **`BracketTree` 30일차 완료(5팀)** — `src/components/composite/BracketTree.tsx`(+test). 플레이오프·컵 공용이며 **라운드 배열 길이로 컬럼 수를 결정**해 가변 라운드 수에 대응한다(부전승 = 라운드 간 매치 수 불일치 케이스도 테스트 커버). 차트 라이브러리가 아직 미도입이라(I-152, 31일차 판정) 자체 DOM/CSS 커넥터로 1차 구현했다
    - **D-19(승부차기 별도 표기) 준수** — 정규 스코어와 승부차기 스코어를 **분리 필드**로 받아 합산 없이 별도 표시하고, 승자 판정은 순수 함수 `resolveBracketWinnerSide`가 우선순위(명시 `winnerTeamId` → 정규 스코어 → PSO 스코어)로 결정한다
    - 도메인에 브래킷 전용 타입이 없어(8일차 동결) `TeamId`/`FixtureId`만 재사용하고 트리 구조는 로컬 타입으로 뒀다. 문구는 `src/i18n/messages/{ko,en}/match.ts`의 `bracket` 그룹 경유 — 전용 네임스페이스 분리는 020 시점 판정(**I-161**)
    - **`TrophyCase` 32일차 완료(5팀) — 복합 7종 종결** — `src/components/composite/TrophyCase.tsx`(+test). `Trophy`(필수) + `Award`(optional)를 함께 받아 **클럽 상세(F7)·선수 상세(E9) 두 소비처를 분기 없이 커버**하고, `TrophyType`별 그룹핑(획득 횟수 + 시즌 라벨)은 순수 함수로 분리해 테스트했다(BracketTree·PitchLineup 선례). 문구는 `team.trophy.*` 경유
    - **`TrophyType`(E-32, 4종) 정본 표시명 카탈로그가 `enums.ts`에 없어**(19일차 H-10 7그룹에 트로피 없음) `team.trophy.type.*` 로컬 키로 우회했다 — **I-165와 동일 구조의 재발이라 I-166으로 등재**. 3팀이 `enums.trophyType`을 신설하면 5팀이 소비처를 교체한다
    - **I-165 해소(32일차, 5팀)** — `InjuryTimeline`이 정본 `enums.injuryStatus.*`를 직접 경유하도록 교체하고 `player.injuryTimeline.status{Active,Recovered}` 로컬 키를 ko/en 양쪽에서 제거했다
  - [x] 상태·유틸 컴포넌트: ~~`SkeletonBlock`~~, ~~`EmptyState`(메시지 키 주입)~~, ~~`ErrorState`(재시도 액션)~~ (**30일차 완료 3/6**), ~~`CountdownTimer`~~, ~~`PhaseIndicator`~~, ~~`OddsButton`(1차 비활성 모드)~~ (**31일차 완료 — 6/6 종결**)
    - **30일차 완료(4팀)** — `src/components/state/{SkeletonBlock,EmptyState,ErrorState}.tsx`. **수락 기준(메시지가 번역 키 경유) 충족**: `titleKey`/`descriptionKey`가 `TranslationKey` 타입이고 렌더는 전부 `t(locale, key, params)`를 지난다. 팀장이 하드코딩 표시 문자열 0건을 grep으로 확인했다. `ErrorState`는 `onRetry` 액션 + `error.generic.*` 기본 키
    - 이들은 **라우트 레벨 공용 컴포넌트라 자체 4상태(`DomainViewState`)를 갖지 않는다** — 4상태를 표현하는 쪽이 아니라 그 상태를 *렌더하는* 쪽이기 때문. 기존 domain 카탈로그 관례(`locale` prop, `cn()`, `t()`)는 그대로 따랐다
    - **31일차 완료(4팀)** — `src/components/state/{CountdownTimer,PhaseIndicator,OddsButton}.tsx`. **수락 기준(OddsButton 비활성 동작) 충족**: `disabled` 고정에 더해 **`onClick`/`onSelect` prop 자체를 타입에 노출하지 않아** 소비처가 실수로도 핸들러를 연결할 수 없다 — FR-BT-014를 관례가 아니라 타입으로 차단했다(팀장 대조 확인)
    - `CountdownTimer`는 client 컴포넌트이며 `Date.now()`를 **렌더 중에 직접 호출하지 않고** `useEffect`로 미뤄 SSR/하이드레이션 mismatch를 회피한다. `isPaused` 시 정지 표기, 재동기화는 props 갱신에 위임. `formatCountdownClock`을 `src/i18n/format.ts`에 추가
  - [x] 전 컴포넌트는 **도메인 타입 props만 받고 데이터 페칭을 하지 않는다** — **32일차 감사 완료(4팀 013A 25종 + 5팀 013B 7종), 위반 0건·리팩터 불필요.** 팀장 재현: `grep -rnE "\b(fetch|axios|createClient|supabase)\b" src/components/` **0건**, `grep -rn 'from "@/types/' src/` **0건**(C-5·C-6 배럴 준수)
  - [x] 모든 표시 문구는 번역 키 경유, 숫자·시각은 로케일 포맷터 사용 (D-18) — **32일차 감사 완료, 하드코딩 표시 문자열 0건 / `toLocaleString`·`Intl` 직접 호출 0건**(팀장 grep 재현). **판단으로 종결한 3건**: ⓐ `ConditionGauge`/`FitnessBar`/`StatBar`의 `toFixed(1)`·`Math.round` — `format.ts`는 ko/en 표기가 실제로 갈리는 값(천단위·소수 2자리)만 경유지로 설계됐고 0~100 범위 값은 양 로케일 렌더링이 동일하므로 위반 아님 ⓑ `[lang]/layout.tsx`의 `await bootstrapApp()` — 데이터 페칭이 아닌 1팀 소관 부트스트랩(I-72)이며 재사용 컴포넌트가 아님 ⓒ `global-not-found.tsx`의 `metadata.description` — SEO 메타 필드로 JSX 텍스트 노드가 아님(I-89 10일차 결정)
  - [x] React Compiler 전제 — `useMemo`/`useCallback` 미사용, 예외 시 정당화 주석 — **33일차 감사 완료(4팀 013A 14종 + 5팀 013B 7종)**. 전수 grep 결과 **사용처 0건**이라 제거 대상도 정당화 주석 대상도 없었다(양 팀 독립 실측, 팀장 재확인). 즉 이 항목은 위반을 고친 것이 아니라 **처음부터 준수돼 있었음을 실증**한 것이다
  - [x] 넓은 콘텐츠는 자체 `overflow-x: auto` 컨테이너 적용 — **33일차 완료**. 대상은 013B `BracketTree` 하나뿐이며 로딩 skeleton·ready 렌더 양쪽에 이미 적용돼 있다(5팀). 013A 14종은 전부 고정크기·반응형 소형 위젯(SVG 140px 레이더, w-full 피치맵, 배지·게이지)이라 **대상 없음**으로 판정했고, 나머지 013B 6종도 svg viewBox·flex-wrap으로 자체 스케일된다. 불필요한 wrapper를 일괄 삽입하지 않은 판단이 옳다
    - **I-159 해소(33일차, 4팀)** — `FitnessBar`·`ConditionGauge`에 중복돼 있던 clamp 수식을 `src/components/domain/fitness.ts`의 `clampFitness`로 추출하고 양쪽을 import로 전환(`fitness.test.ts` 4케이스 신설). 29일차에 "세 번째 소비처가 생기는 시점을 트리거로 삼아도 된다"고 유예했던 항목을 013A 종료 구간에서 정리했다
    - **I-166 해소(33일차, 3팀→5팀→4팀)** — 32일차에 카탈로그 부재로 `team.trophy.type.*` 로컬 키를 쓰던 `TrophyCase`가, 3팀이 같은 날 신설한 `enums.trophyType`(ko/en 4종) 소비로 교체됐고(`TrophyCase.tsx:158`) 사장된 로컬 키는 4팀이 제거했다. **소유 경계에 따라 5팀은 4팀 소유 `team.ts`를 직접 지우지 않고 판단만 회신**했으며, I-165와 동일 구조의 재발이라 "신규 enum 표시명은 로컬 키 우회 대신 3팀에 카탈로그를 먼저 요청한다"가 관례로 확립됐다
- **수락 기준**: 22종 전부가 4상태를 지원하고, ko/en 전환 시 하드코딩 문자열 0건. (27일차 SP-2에서 `MatchCard` 승격으로 21→22종). **32일차 진행 21/22** (도메인 8/8 종결, **복합 7/7 종결**, **상태·유틸 6/6 종결**) — 잔여 1종은 `MatchCard`(5팀). **34일차 22/22 종결** — `MatchCard`가 33일차가 아니라 **34일차 Task 015 착수와 함께** 생성됐다(홈 카드 그리드의 실제 소비처가 생기는 시점에 맞춘 것). I-156 단일 prop 규약을 따르며 4상태 실측 분모는 16종(도메인 8 + 복합 7 + `MatchCard` 1)으로 **16/16**. **규약 2항목(페칭 0·번역 키/포맷터)은 32일차 전수 감사로 위반 0건 확정** — 4상태 판별 규약은 `state: DomainViewState|CompositeViewState<T>` 단일 prop + 리터럴 `loading|empty|error|ready`로 양 팀 통일(28일차 팀장 판정, I-156), 인터랙션 없는 컴포넌트는 서버 컴포넌트 + `t(locale, …)` 직접 호출.
  - **33일차 정정(I-168) — "전부 4상태"의 분모에는 예외가 있다.** 상태·유틸 6종(`SkeletonBlock`·`EmptyState`·`ErrorState`·`CountdownTimer`·`PhaseIndicator`·`OddsButton`)은 **4상태 비대상**이다. 앞의 3종은 4상태를 **표현하는 쪽**의 프리미티브라 자기 자신에게 4상태를 요구하는 것이 성립하지 않고(30일차 결정), 뒤의 3종도 31일차 표가 애초에 요구하지 않았다. 따라서 4상태 실측 분모는 **도메인 8 + 복합 7 + `MatchCard` 1 = 16종**이며, 33일차 시점 15/16(잔여 `MatchCard`)이다. 33일차 4팀 감사에서 이 면제가 "8/14 미달"로 오독될 뻔해 팀 md 수락 문구를 정정했다 — **총량 표현("전부/전 종")을 쓸 때는 분모의 예외를 같은 줄에 명시할 것**.
  - **33일차 하드코딩 실측**: 013A 14종은 주석 제외 JSX 렌더 텍스트 0건(perl로 주석 제거 후 재grep), 013B 7종은 JSX 텍스트노드·`title`/`aria-label` 속성 전수 grep 0건 — 양 팀 모두 전부 `t(locale, …)` 경유 또는 데이터 prop.

### Task 014: `/sample` 컴포넌트 쇼케이스를 구축한다 - 우선순위

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀 / 지원: 5팀 화면·배팅UX팀(013B 등록)
- **일정**: 34일차 ~ 38일차 (2026-09-04 ~ 2026-09-10) / 추정 4.0인일 / 담당 4팀 UI기반·i18n팀
- **근거**: FR-UI-001, FR-UI-000, KPI-6, UC-601, D-18
- **구현 사항**
  - [x] 카테고리별 섹션 레이아웃(도메인 / 복합 / 상태 / 차트 / 어드민)과 앵커 네비게이션 — **34일차 완료(4팀)**. `src/app/[lang]/sample/page.tsx`(549줄) + `src/i18n/messages/{ko,en}/sample.ts`(신규 네임스페이스)
    - **21종 전량 등록·실렌더** — domain 8 + composite 7 + state 6. 팀장이 JSX 사용을 전수 grep해 **import만 하고 미사용인 컴포넌트 0건** 확인. 하드코딩 문자열도 0건(주석 제거 후 JSX 텍스트노드 + `title`/`aria-label`/`alt`/`placeholder` 전수 grep 무히트)
    - **chart·admin 섹션은 골격 + "미구현" 표기** — 해당 카테고리 컴포넌트가 아직 없다. `MatchCard`는 같은 날 5팀이 신규 생성했으므로 **35일차에 등록해 22종으로 맞춘다**
    - 데이터는 `getDataSource()` 어댑터만 경유한다. 어댑터가 아직 빈 배열만 반환하는 4종(Injury·Trophy·Award·PlayerAttributeHistory)은 **쇼케이스 전용 인라인 표본**으로 처리해 `no-restricted-imports` 가드레일(21일차 결함 A)을 우회하지 않았다
    - ⚠️ **수락 기준의 Playwright 스크린샷 검증은 I-128(Chromium 미설치)로 여전히 불가.** 34일차 판정은 팀장이 dev 서버(webpack, 재기동 후) 실응답을 curl로 받아 `/ko/sample`·`/en/sample` 200 + 에러 마커 0건 + 앵커 5종을 확인한 것으로 갈음했다
  - [x] 컴포넌트별 4상태 토글 컨트롤 + 뷰포트 프리뷰 전환(모바일/태블릿/데스크톱) *(35일차 — `StateToggleSlot.tsx`·`ViewportFrame.tsx` 신규, 22종 배선(`MatchCard` 등록으로 21→22). **Playwright 실측으로 판정** — 토글 실조작 시 렌더 전환 확인(스크린샷 `testPng/ability-radar-*`), 콘솔 에러 0건. **뷰포트 프리뷰는 실측 중 결함을 발견해 재구현**: 최초 구현이 컨테이너 `max-width`만 바꿨는데 Tailwind `sm:`/`lg:`는 뷰포트 기준이라 그리드가 실제로 재배치되지 않았다(코드 리뷰로는 못 잡는 결함) → Tailwind v4 컨테이너 쿼리(`@container`+`@sm:`/`@lg:`)로 교체해 모바일 1열·태블릿 3열 실재배치 확인)*
  - [ ] **로케일 전환 컨트롤** — 각 컴포넌트를 ko/en으로 즉시 비교 확인 (D-18)
  - [x] 개별 컴포넌트를 `ErrorBoundary`로 격리해 하나가 깨져도 쇼케이스가 살아있게 구성 *(37일차 — `src/components/state/ErrorBoundary.tsx`(신규). **Next 16.2 `unstable_catchError`(`next/error`)** 기반이며 팀장이 `node_modules/next/dist/client/components/catch-error.d.ts`에서 API 실재·사용 형태를 확인했다. `ComponentSlot` 22개 사용처 전량 배선 → 임시 크래시 컴포넌트를 슬롯 하나에 넣어 **나머지 21종 생존을 실측**한 뒤 제거)*
  - [x] 커버리지 체크리스트 자동 표기 — 등록 컴포넌트 수 / 4상태 구현 수 / 번역 키 누락 수 카운터 *(38일차 — `sample/CoverageChecklist.tsx`·`sample/component-registry.ts`·`src/i18n/coverage.ts`(전부 신규, 각 `.test.ts` 동반). **3개 카운터 전부 실측** — 등록 22종 / 4상태 **16/16(100%)** / 번역 키 누락 **0**(ko·en 카탈로그 실제 순회 diff). domain·composite·state 섹션의 기존 **하드코딩 배지(8/8/6)도 같은 레지스트리로 교체**해 표기 이원화를 없앴다. Playwright 실측 — `/ko/sample`·`/en/sample` 콘솔 에러 0, 스크린샷 `.playwright-mcp/day38-coverage-checklist-{ko,en}.png`)*
    - **RSC 경계 함정을 실측으로 발견·해소** — `component-registry.ts`가 `"use client"` 모듈(`StateToggleSlot.tsx`)의 배열 값을 직접 import하자 Server Component에서 **빈 값으로 치환돼 "0/16" 회귀**가 났다(코드 리뷰로는 잡히지 않고 Playwright 실측으로만 드러남). 런타임 카운트는 client 모듈 import 없이 리터럴 목록으로 분리하고, `StateToggleSlot`의 실제 디스패치 레지스트리와의 일치는 **vitest(Node, RSC 경계 없음)가 매 실행 교차검증**하도록 재설계했다 → 38일차 인계 3번
  - [x] 어댑터 토글(Mock ↔ Supabase) 스위치 배치 (UC-602) *(37일차 — `sample/DataSourceToggle.tsx` + `sample/data-source-actions.ts`(신규). `resetDataSourceCache()`(1팀이 "런타임 핫스왑" 용도로 문서화한 API) 경유, 전환 후 헬스체크(`getLeagues()`) → 실패 시 이전 어댑터 자동 복귀. `factory.ts`/`bootstrap.ts` 무수정. Playwright로 Mock↔Supabase 실전환 확인)*
    - ⚠️ **팀장 검증 지적 → dev 전용 가드 추가.** 최초 구현은 "`/sample`은 로컬 전용"이라는 전제를 **주석에만** 두었는데, `"use server"` 액션은 액션 ID로 외부에서 직접 POST 호출이 가능하고 `/sample`은 프로덕션 빌드에 포함되는 일반 라우트다 — 배포 시 **인증 없이 서버 프로세스 전역의 데이터 소스를 뒤집을 수 있는 엔드포인트**가 된다(헬스체크·자동복귀는 "전환 실패"만 막지 "전환 자체"를 막지 않는다). `setDataSourceKindAction` **최상단**(`applyEnv`/`resetDataSourceCache`보다 앞)에 `NODE_ENV !== 'development'` 조기 반환을 넣었고, 토글 UI 숨김은 보조 장치일 뿐 **서버측 거부가 본체**임을 주석에 명시했다
- **수락 기준**: 등록 컴포넌트 4상태 커버율 100%. 이후 모든 신규 컴포넌트는 `/sample` 등록 + ko/en 확인이 완료 조건에 포함된다.
- **테스트**: Playwright MCP — `/sample` 진입 후 4상태·로케일 토글 조작, 콘솔 에러 0건, 스크린샷 확보.

- **36일차(4팀) — 로케일 전환 컨트롤 완료.** `LocaleCompareToggle.tsx`(신규) + `sample/page.tsx` 본문을 `renderShowcaseBody(locale)`로 감싸 라우트 이동 없이 ko/en을 즉시 비교한다. **팀장 Playwright 실측으로 수락 기준("즉시 전환") 충족 확인** — URL 불변 · 문서/RSC 요청 0건 · 본문 전환 · 중복 `id` 없음 · 전환 후 `#domain` 앵커 정상.
  - 설계 기각 근거 2건: ⓐ 헤더 `LocaleSwitcher` 재사용은 **라우트 이동**이라 서버 재실행 + RSC 왕복이 생겨 "즉시"가 아니다 ⓑ CSS `hidden`으로 두 트리를 동시 마운트하면 `ShowcaseSection`의 고정 `id`가 중복돼 **앵커가 숨겨진 사본을 가리킬 수 있다** → 조건부 마운트 채택

### Task 015: 홈/라이브 센터와 전역 레이아웃을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀
- **일정**: 34일차 ~ 38일차 (2026-09-04 ~ 2026-09-10) / 추정 4.0인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-002, FR-UI-020, FR-UI-022, NFR-PF-009, NFR-RS-001
- **구현 사항**
  - [~] 3리그 진행 중 경기 카드 그리드 — 실시간 스코어·경과분·LIVE 배지 — **34일차 스코어·LIVE 배지 완료(5팀), 경과분만 잔여.** `src/components/composite/MatchCard.tsx`(신규 — **013B 잔여 1종 종결, 이로써 22종 전량 완료**) + `src/app/[lang]/page.tsx`(자리표시자 → 카드 그리드) + `src/i18n/messages/{ko,en}/match.ts`(`card` 그룹)
    - `MatchCard`는 named export·서버 컴포넌트·**I-156 단일 prop 규약 준수**(`state: CompositeViewState<MatchCardData>`, 리터럴 `loading|empty|error|ready`). `density:"card"|"row"`로 목록형 재사용 여지를 열어 뒀다(오늘은 card만 사용)
    - 데이터는 `getDataSource()`(`getLiveFixtures`/`getTeamsByIds`/`getLeagues`)만 경유 — Mock 팩토리 직접 호출 0건
    - **경과분은 의도적으로 미표시(`elapsedMinutes: null`)** — H-24 계약대로 UI가 `(now − kickoff)`를 계산하지 않는데, 정작 `now`의 출처가 없다. `DataSource`에 시각 메서드가 없고, `MOCK_NOW` 직접 import는 `eslint.config.mjs:82` 가드레일 위반이며, `Date.now()`는 Mock 세계 시각(2026-08월 고정)과 어긋나 음수가 된다. **가드레일을 뚫는 대신 기능을 축소한 판단을 팀장이 지지**했다. 순수 함수 `computeElapsedMinutes`는 테스트까지 완비되어 `now` 소스가 생기면 즉시 연결 가능 → **I-169(1팀 판정, 35일차 폴링 훅 차단성 있음)**
  - [x] 다음 킥오프 카운트다운, 시즌·페이즈 인디케이터, 주요 뉴스 요약, 로케일 스위처 *(35일차 5팀 — A1 `PhaseIndicator`+`CountdownTimer`(**정지 중 카운트다운 정지 = `isPaused` prop으로 성립**, 팀장 실측 3초에 3초 감소 확인) / A3 다음 킥오프 목록(리그별 라운드 경계로 상위 5건 병합 — `getNextKickoff`가 1건만 반환하기 때문. 현재 라운드 SCHEDULED 0건인 경계 시점 리그 누락 한계를 파일 헤더에 명시) / A4 뉴스 요약 + 카테고리 배지(`enums.newsFeedItemType` 경유, 3팀이 10종 ko·en 채움) / 로케일 스위처는 헤더에 기배치·동작 확인. **「배속 변경 시 즉시 재동기화」는 D-2로 021(54일차) 이월**)*
  - [~] 폴링 훅 적용(기본 5초, 공통코드 주기, 탭 비활성 시 중단) *(35일차 — `LiveMatchGrid.tsx` 신규(클라이언트)가 `usePollingList`(1팀 H-02) 소비, 경과분은 I-169 신설분 `getMatchClockContext`로 `now`/`clock` 원자 조회. 훅 계약·카운트다운 실동작은 팀장 실측 확인. ⚠️ **단 fetcher가 35일차 확정 규약을 위반한다 — I-182**: 클라이언트에서 `bootstrapApp()`/`getDataSource()`를 직접 호출해 Route Handler(`src/app/api/live/**`)를 우회하며, 실측 결과 **12초간 네트워크 요청 0건** + **클라이언트 번들에 `bootstrapApp` 심볼 실재**. 034b 전환 시 Supabase 어댑터도 같은 경로로 브라우저에 노출된다. **36일차 5팀 최우선**(1팀 응답 타입 계약 선행))*
  - [x] 4상태 — 카드 스켈레톤 6개 / "진행 중 경기 없음 + 다음 킥오프 시각" 빈 상태 / 재시도 에러 *(37일차 — `MatchCard` 로딩 스켈레톤을 실제 카드 구조(헤더/팀2행/푸터)로 재구성해 CLS 축소, Empty에 `emptyNextKickoffAt` prop, Error에 `onRetry` + 재시도 버튼. `LiveMatchGrid`는 `initialCards` 부재 시 6장 스켈레톤 그리드. 재시도는 **1팀 소유 폴링 훅을 건드리지 않고 `key` 리마운트**로 구현, 재시도 라벨은 신설 없이 `error.generic.retryLabel` 재사용)*
    - **지시 밖에서 발견·수정한 결함 1건** — 기존 empty/error가 board 표면 위에서 `text-muted-foreground` 등 **페이지 토큰**을 써 대비가 역전돼 있었다(Floodlit 규약 위반). board 전용 톤으로 교체. 팀장이 diff를 전수 검색해 잔존 위반 0건 확인
  - [x] 킥오프 시각은 UTC 저장값을 로케일 로컬 시각으로 변환 표기 (DC-07, D-18) *(37일차 — `formatKickoff` 경유, ko "오전 12:00" / en "12:00 AM"로 로케일 분기 확인)*
    - **36일차 관찰 "다음 킥오프 5건이 전부 오전 12:00"의 원인 확정 — 변환 로직이 아니라 mock 생성기다(I-195).** `world.ts:182` `MOCK_EPOCH_NOW = '2026-08-11T15:00:00.000Z'`가 KST 정각 00:00이고 `progress.ts:917` 등 오프셋이 전부 **1440분(1일) 배수**라 날짜만 바뀌고 time-of-day가 불변이다. 5팀이 3팀 소유 파일이라 수정하지 않고 판단만 회신했고, **팀장이 직접 재현해 확정**했다
  - [~] 모바일 세로 우선 레이아웃, LCP ≤ 2.5s / CLS ≤ 0.1 목표 *(38일차 — 화면은 34~37일차에 이미 완성돼 **코드 변경 0건, 검증만 수행**(5팀). 6뷰포트 × 2로케일 스냅샷 12장 확보. **320px 가로 스크롤 0**(6뷰포트 전부 `scrollWidth === clientWidth`, ko/en 공통) · **LCP 전 12케이스 최대 268ms**(기준 2.5s) · **폴링/탭 비활성 중단 정상**(hidden 32초간 요청 0건 → visible 복귀 즉시 1건). **CLS만 `ko` 320px에서 0.1735로 미달 — I-200으로 판정 보류**, en 및 나머지 5뷰포트는 통과)*
    - **CLS 미달은 dev 전용 아티팩트일 가능성이 높아 이 저장소에서 확정 불가.** 원인은 `[lang]/layout.tsx`의 Gothic A1이 서브셋 미지정 탓에 `preload:false`가 강제되는 구조인데, 팀장이 SSR 원문을 직접 확인한 결과 **dev는 `<style>` 0개·`@font-face` 0개·외부 스타일시트 1개**로 폰트 CSS를 첫 페인트 **이후** 합류시킨다 — `font-display`로 통제 불가능한 종류의 시프트다. 프로덕션은 인라인 방식이 다르나 **`npm run build`가 WSL EPERM으로 실패해 검증 수단이 없다**. 무효 확인된 시도(재시도 금지, 근거는 `layout.tsx` 헤더 주석): `display:"optional"` 0.1642(오차 수준·되돌림) / `adjustFontFallback:false` 0.371(악화) / `weight` 3종→1종 0.166(무효)
- **수락 기준**: 접속 3초 내 진행 중 경기와 스코어 파악 가능(PS-1 성공 신호). 320px에서 가로 스크롤 0.
- **테스트**: Playwright MCP — 폴링 네트워크 요청 관찰, 탭 비활성 시 중단 확인, 6개 뷰포트 × 2로케일 스냅샷.

- **36일차(5팀) — 폴링 훅 적용 + I-182 동시 해소.** `src/app/api/live/matches/route.ts`(신규 Route Handler) 신설, `LiveMatchGrid`의 fetcher가 클라에서 `bootstrapApp()`→`getDataSource()`를 직접 부르던 것을 `fetch()` 경유로 교체했다(35일차 소유 경로 개정이 못박은 "폴링 fetcher는 Route Handler 경유" 규약 준수).
  - **팀장 실측**: `/api/live/matches` 200 / 클라 번들에서 `bootstrap.ts`·`factory.ts`·`data/mock`·`data/supabase` **전부 0건**(모듈 등록 문자열 기준 — raw grep은 JSDoc 산문 때문에 오탐이 난다) / 탭 활성 40초 1건 · **탭 비활성 40초 0건**으로 수락 기준 충족.
  - **⚠️ 실운영 주기는 아직 5초가 아니다** — `UI_PARAM` 미적재라 `polling.ts` 안전망 30초로 동작한다. 6팀이 3팀 시드(031a)를 적재해야 정상값이 걸린다.
  - 1팀 응답 타입 계약 미확정이라 `src/app/api/live/matches/types.ts`에 `LiveMatchesApiResponse`를 **임시 정의**(파일 헤더에 교체 대상 명시). 새 도메인 타입 없이 `@/types`·`DataSource.ts`만 재사용.

### Task 016: 리그 순위표와 일정/결과 화면을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀
- **일정**: 39일차 ~ 42일차 (2026-09-11 ~ 2026-09-16) / 추정 3.0인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-003, FR-UI-004, FR-LG-004, FR-LG-005, NFR-A11Y-002·005, NFR-PF-011
- **구현 사항**
  - [x] 순위표 — 순위·팀·경기·승무패·득실·승점·최근 5경기(`FormStrip`) — 39일차, 3리그 × ko/en 6경로 렌더 확인(24행)
  - [x] 승격/플레이오프/강등 존 시각 구분 + 아이콘·라벨 병기, 타이브레이커 적용 단계 표시 — 40일차 완료. 존 구분은 39일차 산출물(색+▲◆▼+라벨 3중)로 충족 확인, 타이브레이커는 `TiebreakNote`(B4) 신규. **B4 두 번째 줄(TIEBREAK Fixture 안내)은 Mock 재경기 생성기 부재로 잔여**
  - [x] 일정/결과 — 라운드별 그룹, 킥오프 시각, 스코어/LIVE/예정 배지, 라운드 네비게이션 — 41일차 `fixtures/page.tsx` 전면 구현 + `RoundNav`(신규). ko/en 실렌더로 라운드 10→15 이동·"현재로" 복귀 확인. **LIVE 행 점수는 mock 갭으로 항상 `null`(I-212)**
  - [x] 리그 스위처(리그1/2/3)와 시즌 선택기 연동 — 41일차 `SeasonSelect`(신규) + B1을 `leagues/[leagueId]/layout.tsx`로 분리해 두 화면 공유(W-16). **시즌은 D-15로 1건뿐이라 선택기는 비활성 상태로 렌더**되며, layout이 `searchParams`를 못 읽는 제약은 I-211
  - [x] 테이블 시맨틱 마크업(`<caption>`, `scope`) 및 모바일 가로 스크롤 컨테이너 — **42일차 완결.** 순위표는 39일차 충족(42일차에 축약 헤더 9열 `<abbr title>` 추가). **일정/결과 목록(C2)은 41일차 `<ul>` 판단을 뒤집어 `<table>`로 전환(I-210 해소)** — 근거는 와이어프레임 §3 "마크업은 하나의 테이블" 명시 + §7 `scope="col"` 요구는 표 밖에서 무의미 + 자매 화면 B3 선례. `MatchCard`(div)는 `<td>`로 쪼갤 수 없어 행을 화면 로컬로 재작성했고, 늘인 링크가 첫 셀 접근명을 삼키는 문제(팀장 검증 적발)는 상태 셀 `aria-label`로 해소. 실렌더: 3리그 × ko/en, 320px에서 body 가로 스크롤 0(305<320). **데스크톱 2열 시각 그리드는 표 ARIA 회귀 회피를 위해 미구현 → I-216**<br>⚠️ **후속 수정(48일차, `7bd11c6`)**: 이때 도입한 행 전체 링크가 `z-0`인데 셀 내용이 `relative z-10`이라 **내용이 링크를 완전히 덮어 모바일에서 어느 행도 눌리지 않았다**(사용자 제보). 링크를 `z-20`으로 올려 해소(내용의 `z-10`은 짝수행 배경 위로 올리는 역할을 겸하므로 유지). 390×844 실브라우저에서 6행 × 4셀 전부 적중·상태별 이동 5건 확인. **stretched link는 시각 검증으로는 통과하므로 셀 중앙 좌표를 실제로 탭해 확인할 것**
- **수락 기준**: 3개 리그 전부 렌더. 색맹 시뮬레이션 3종에서 존 구분 가능. ko/en 헤더 폭 깨짐 0.

### Task 017: 경기 상세 / 라이브 중계 화면을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀 / 지원: 3팀 데이터·밸런싱·배당팀(배당 패널)
- **일정**: 43일차 ~ 48일차 (2026-09-17 ~ 2026-09-24) / 추정 4.5인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-007, FR-MT-002, FR-MT-016, FR-BT-014, UC-002
- **구현 사항**
  - [x] 스코어보드(경과분·추가시간·페이즈) + 분 단위 이벤트 타임라인 — 43일차, `/[lang]/matches/[matchId]` 실렌더. `MatchScoreboard`(composite 신규) + 순수 로직 `match-scoreboard.ts`(`foldMatchScore`/`deriveMatchPhase`/`compareEventChronologically`, 테스트 13건). LIVE 배지+페이즈 5종, PSO 분리 표기(R-13), 타임라인 시간역순 + ASSIST→GOAL 병합(E-2) + R-11 경계 문구. **Mock에 FINISHED 경기 이벤트 로그가 없어 E-1 폴딩이 항상 0-0을 반환** → FINISHED만 `Fixture.homeScore`/`awayScore` 직접 사용으로 우회(팀장 승인, **임시 조치** — I-212). `Fixture.roundLabel`이 mock에서 한국어로 구워져 `/en`에 그대로 노출(I-220)
  - [x] **이벤트 23종의 중계 문구 템플릿을 번역 카탈로그로 관리** — 선수·팀 이름은 변수로 주입(번역 대상 아님, D-17/D-18) — 44일차, `src/i18n/messages/{ko,en}/match.ts`에 `match.event.*` 23종 신설(와이어프레임 04번 §4 D3 프리픽스 준수). 기존 `enums.matchEvent.*`(4팀, 뱃지용 단어 라벨)와 역할 분리, 기존 키 삭제·변경 0건. `{playerName}`/`{teamName}`은 변수 자리표시자로만 존재(D-17/D-18). `satisfies Record<MatchEventType, string>`로 23종 전량 매핑을 tsc가 강제. **중계 문구 하드코딩 0**. 단 소비처 `EventTimelineItem.tsx:110`은 여전히 `enums.matchEvent.*`만 사용해 **카탈로그 미소비**(I-226 — 배선 일차 미정, 하드코딩 0이라 수락 기준엔 지장 없음)
  - [x] 라인업 피치 뷰(`PitchLineup`), 팀 스탯 비교바, 선수별 평점 테이블 — 45일차, `/[lang]/matches/[matchId]`에 D4(홈/원정 `PitchLineup` 2종 + 선수별 평점 Table)·D5(팀 스탯 대칭 비교바, `StatBar` 조합, mirror는 `[&_[data-slot=progress]]:scale-x-[-1]`) 배선. **신규 composite 0종**(와이어프레임 04번 §8 각주 준수) — 기존 `PitchLineup`에 `orderStartersByFormation`(MatchLineup→피치 슬롯 순서 변환, 테스트 4건) 추가로 갈음. i18n `lineupTitle`/`rating*`/`stat.*` ko·en 신설, 하드코딩 0. **단 `MockDataSource`의 `getMatchLineups`/`getMatchPlayerRatings`/`getMatchTeamStats`가 전부 `return []` 고정이라 빈 상태로만 실렌더 검증 가능** — 엔진의 `selectLineup()`(2팀 21일차)은 이미 존재하나 mock 어댑터 배선이 없다(**I-229** — 3팀, I-206/221/226에 이은 4회째 같은 패턴)
  - [x] 날씨·구장 정보, **배당 패널(표시 전용, 베팅 버튼 비활성)** (FR-BT-014) — 46일차, `/[lang]/matches/[matchId]`에 D6(경기 정보: 구장·수용·관중·날씨)·D7(배당 패널) 배선. D7은 3팀 H-19(`src/lib/odds/display.ts` `OddsDisplayPanel`) 타입을 그대로 소비하는 신규 composite `MatchOddsPanel`(4상태) + 기존 `OddsButton`(4팀 013A, disabled 고정) 재사용. **베팅 버튼 비활성은 `OddsButton`에 `onClick` prop 자체가 없어 물리적으로 강제**되며 보조텍스트(`match.odds.disabledHint`, I-9)도 병기. i18n `info`/`weather`/`odds` 신설, `weather`는 `satisfies Record<WeatherType, string>`로 9종 누락을 tsc가 차단, 하드코딩 0. **단 `DataSource`에 대진별 배당 조회 메서드가 없어 D7은 항상 empty 렌더**(배당 엔진 프리시뮬 호출기 단계 — 소유팀 조율 필요), `getMatchWeather`도 날씨 생성기 부재로 항상 null. 중립지 경기에 홈팀 구장명이 그대로 표시됨(**I-233**). `MatchOddsPanel`의 `/sample` 등록은 **D-33 경로 ①**로 4팀이 당일 이행
  - [x] 라이브 폴링 3초 + 신규 이벤트 `aria-live="polite"` 안내 (NFR-A11Y-004) — 47일차, D3 이벤트 타임라인을 폴링으로 전환. 신규 `matches/[matchId]/LiveEventTimeline.tsx`(클라이언트) + `timeline.ts`(`buildTimelineRows` 순수 함수를 page.tsx에서 분리해 SSR·폴링 API가 공유) + `api/live/matches/[matchId]/{route.ts,types.ts}`(5팀 소유 경로, `DataSource`는 서버에서만 호출 — I-182 준수). **폴링 주기는 공통코드 경유** — 서버 `page.tsx:130`이 `resolvePollIntervalMs("live")`로 해석해 prop 주입, 클라이언트는 `usePolling`(1팀 H-02)의 `intervalMs`에 전달만 하며 **리터럴·직접 조회 0건**(44일차 I-222 해소 패턴 동일, 팀장 grep 재확인). `aria-live` 안내는 sr-only 영역으로 분리 배치, FINISHED/VOID 도달 시 폴링 중단(I-6)
  - [x] 4상태 — "아직 이벤트가 없습니다 (킥오프 대기)" 빈 상태 포함 — 47일차, `EventTimelineItem.tsx`(composite)에 `emptyVariant` prop 추가로 킥오프 대기 문구를 분기. i18n `timeline.emptyKickoffPending`/`timeline.liveAnnouncement` ko·en 신설, 하드코딩 0. ⚠️ **D1 스코어보드는 여전히 서버 1회 렌더**라 LIVE 중 스코어·경과분이 D3만큼 실시간이 아니다 — 같은 화면 내 정보 불일치(**I-237**, 5팀 다음 등판 검토). 탭 자체 배선은 여전히 스코프 밖(46일차 인계 유지)
- **✅ 완료 판정(49일차, 1팀 리뷰 게이트 — 48일차 타입 배치 반영으로 하루 이월분)**: `docs/TEAM.md` 6.3절 **9개 조건 중 8개 통과, 1개 미충족 → Task 017은 완료 인정**. 통과분: `npm run typecheck`(0건)·`npm run lint`(0건)·`npm run test`(전체 1683 passed)·`npm run check:literals`(matches 경로 후보 0건), `/sample` 레지스트리에 `MatchScoreboard`·`PitchLineup`·`MatchOddsPanel`·`EventTimelineItem`·`StatBar` 등록(조건 6), Playwright E2E는 48일차 5팀 수행분으로 충족(조건 5), 신규 의존성·엔진 시드 변경·`Math.random`/React·Supabase import 해당 없음(조건 4·7·9). **미충족은 조건 3(신규 코드 단위 테스트) 1건** — `timeline.ts`의 `buildTimelineRows`(정렬 + `ASSIST`→`GOAL` 병합)가 실질 로직을 갖고도 전용 테스트 0건이다(자매 파일 `match-scoreboard.ts`는 29건 커버). **기능 자체는 E2E로 행위 검증이 끝났으므로 Task는 완료로 인정하고 결함만 I-244로 등재해 5팀에 재요청**했다 — 일정 재개방이 아니다
- **수락 기준**: 경과 시간 이후 이벤트가 화면에 나타나지 않는다(UI 레벨 검증, 서버 강제는 Task 041).
- **테스트**: Playwright MCP — 라이브 Mock에서 이벤트 점진 노출, 3초 폴링, 중계 문구 ko/en 전환 확인. — **48일차 충족(5팀, 코드 변경 0건 · 검증 전용)**. 3초 폴링이 ~23초간 **9회**(간격 일관), ko·en 이벤트 라벨과 미래경계 문구 전환 정상, **22분 픽스처에서 22분 이후 이벤트 0건**(반복 폴링 후에도 동일) → 수락 기준 충족. **단 "점진 노출"은 실측 데모가 불가능하다** — mock의 `MOCK_NOW`가 고정 상수라 경과분이 생성 시점에 굳는다(**I-241**). 이는 결함이 아니라 **컷오프가 생성 시점에 확정돼 미래 정보 비노출이 구조적으로 보장**되는 것이다

### Task 018: 선수 상세와 클럽 상세 화면을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀 / 지원: 1팀(타입·계약)·3팀(Mock 실값)·6팀(스키마) — **48일차 선행분 생산자**
- **일정**: 49일차 ~ 53일차 (2026-09-25 ~ 2026-10-01) / 추정 **4.75인일**(원 4.0 + D-34·D-35 배선 0.75) / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스 — 배정 5일(가용 4.0인일) 대비 0.75인일 초과이며 일수는 밀지 않았다. ✅ 53일차 유지는 팀장 승인 확정**이다. 5팀 1~27일차 대기 구간의 미계상 선행 이득으로 흡수하는 전제이며, **확정 트리거: 51일차 종료 시 클럽 상세 1/2(F3-o 구단주 카드 포함)이 미완이면 5팀은 즉시 팀장에게 보고하고, 팀장이 그 시점에 완화 선택지 3종(4팀 선제 지원 / 018 잔여 1건 021 이후 이월 / 53일차 1일 초과 승인) 중 택일한다** — 5팀은 자체 판단으로 일정·스코프를 바꾸지 않는다(`docs/team-schedule/05-화면배팅UX팀.md` §5)
- **근거**: FR-UI-005, FR-UI-006, FR-PL-016, FR-TM-009, FR-ST-001, FR-ST-002, **D-34**, **D-35**
- **구현 사항**
  - [x] 선수 상세 — 프로필, 능력치 레이더(4카테고리), 컨디션·피로 게이지, 포지션 맵(숙련도 5단계), 몸값·계약, 시즌별/통산 스탯, 성장 곡선, 부상 타임라인, 트로피, 이적 이력 — **49일차 1/2 완료**(E1 프로필 헤더·E2 능력치 레이더 + 34속성 아코디언·E3 컨디션·피로 게이지 + 가용성 배지·E4 포지션 맵 + 11군 숙련도 리스트). `src/app/[lang]/players/[playerId]/page.tsx` 전면 구현 + i18n `player.*` ko/en 확장. **신규 컴포넌트 0종** — 기존 `AbilityRadar`/`ConditionGauge`/`PositionMap`/`PlayerAvatar`/`TeamBadge`/`StatBar` 재사용으로 갈음했으므로 `/sample` 등록(4팀 소유) 필요 없음. **PA 원값 비노출** — 스카우트 등급은 서버 산출 `scoutRating`만 ★1~5로 받아 표시하며 PA를 입력으로 받는 경로 자체가 없다(P-2, 코드 주석 명시). ⚠️ `PositionMap`이 단일 포지션 점만 지원해 11군 오버레이는 옆의 별도 숙련도 리스트로 대체(**I-250**, 4팀 확장 여부 판정). ⚠️ `nationality`/`preferredFoot`는 3팀 표시명 카탈로그 미이행으로 **표기 생략**(**I-248**), 34속성 라벨은 공유 위치 미정이라 화면 로컬 채움(**I-249**). ⚠️ 은퇴 선수 표기 규약(W-28) 미확정이라 empty 폴백만 적용(**I-252**). **몸값·계약, 시즌별/통산 스탯, 성장 곡선, 부상 타임라인, 트로피, 이적 이력은 50일차 2/2 스코프로 잔여** ⚠️ **진입 동선은 49일차 마감 후 별건으로 열었다**(사용자 질의 "선수 카드 보는 방법") — 구현 시점에 이 상세로 가는 앱 내 링크가 **0건**이었다. `/stats`·`/awards` 선수명 3곳 링크화 + `/[lang]/players` 인덱스 신설(내비 `pending` 해제, **I-223** 2차 부분 해소)로 해소. 경위는 `docs/dailyWorkLog/49Day.md` 1-1절 **50일차 2/2 완료** — E5 몸값·계약, E6 시즌별/통산 스탯 표(**`평점` 열 = `avgRating`**, 실측 7.30), E7 성장 곡선, E8 부상 타임라인, E9 트로피·이적 이력. 신규 `PlayerStatTable.tsx`·`TransferHistoryList.tsx`, `i18n/messages/{ko,en}/player.ts` 확장(키 대칭 185=185). **자체 회귀 1건 발견·수정**: 신규 lg 2컬럼이 49일차 E4 포지션 리스트의 md 전환과 겹쳐 글자 단위 줄바꿈이 발생해 md→xl로 완화. **I-252**(은퇴 선수 표기 규약) 미판정이라 49일차와 동일하게 empty 폴백만 적용하고 별도 UI를 만들지 않았다. E5/E7/E8/E9 대부분이 empty로 렌더되는 것은 버그가 아니라 **기존 Mock 공백**(`MockDataSource.ts` 헤더에 문서화됨). 잔여 공백 4건은 **I-259**로 등재.
  - [x] **선수 지표 요약 스트립(E1 프로필 헤더) — 출전경기수 · 최근경기평점 · 리그평균평점(선수 시즌 평균 + 리그 전체 평균 병기) · 지난 시즌 평균평점** (**D-34**, 47일차 사용자 요청) — **49일차 완료**. 출전은 기존 `appearances`, 나머지는 `avgRating`·`getPlayerRecentMatchStats`·`getLeagueAverageRating` 경유. **D-33 판정 기준(빈 상태 렌더 확인만으로 충족 선언 금지)을 실값으로 충족** — 표본 선수 실측 출전 6 · 최근 평점 6.3 · 시즌 평균 9.90 · 리그 벤치마크 6.04. **선수 평균과 리그 벤치마크는 색이 아니라 `seasonAverageLabel`/`leagueBenchmarkFormat` 라벨로 구분**(NFR-A11Y-002). **`FINISHED` 재필터 없음** — 데이터 계약이 컷오프를 보장하므로 화면에서 다시 거르지 않는다(와이어프레임 05 W-34/S-4). ⚠️ 표본(`statLeaders` 60인) 밖 선수는 4지표가 `—`로 정상 empty 폴백되며 이는 `MockDataSource.ts` 헤더에 문서화된 기존 Mock 제약이다. ⚠️ `avgRating` Mock이 1.0~10.0 **균등 분포**(D-34 결정① 그대로)라 "시즌 평균 9.90 vs 리그 평균 6.04"처럼 비현실적 대비가 흔히 나온다 — 화면 결함이 아니며 분포 조정은 031b에서 판정(**I-247**)
  - [x] 34속성·포지션·부상 등급 등 열거형 표시명은 카탈로그 경유 (Task 011) — **53일차 확인 완료**. 34속성 `ATTRIBUTE_LABEL_KEYS`→`player.ability.attr*` · 포지션 `enums.position.*` · 부상 등급 `enums.injurySeverity.*`(`InjuryTimeline` 경유) **전건 번역키 경유**, 화면 하드코딩 0건. 34속성 라벨의 공유 위치(I-249)는 이 화면 단독 소비라 `enums.ts` 승격 대상이 아니라는 판단을 유지한다(`transferType`·`competitionType`과 동일 처리)
  - [x] PA 원값 비노출 — 스카우트 등급 ★1~5 범위 표기만 (FR-PL-004) — 50일차. **팀장 단독 재실측: `src/app/[lang]/players/**` 전체 `potentialAbility` grep 0건**, 실렌더에서 ★ 등급만 노출 확인
  - [x] 클럽 상세 — 헤더(엠블럼·명성·팬), 스쿼드 테이블(부상·정지 배지), 감독/전술 카드, 시즌 지표, 재정 패널, 스폰서 3슬롯, 트로피, 최근/예정 경기 — **51일차 1/2(F1~F3) + 52일차 2/2(F4~F8) 완료**. 51일차: F1 헤더·F2 스쿼드 테이블+포지션 필터·상태 배지·OVR·F3 감독/전술(`SquadTable.tsx` 신규). 52일차: F4 시즌지표(그룹탭 5종)·F5 재정·F6 스폰서 3슬롯(D-35 체결 구단주 포함)·F7 트로피(`TrophyCase` 재사용)·F8 최근/예정(`MatchCard` row, LIVE 분리) — 신규 `SeasonStatPanel`·`FinancePanel`·`SponsorSlots`·`RecentUpcomingFixtures`. 진입 동선 확인(`StandingsTable`→`/teams/[teamId]`). **F6 실값 실측**(3슬롯 채워짐·부도위험 배지 점등). ⚠️ 상태 배지 3단(KNOCK 미분리, I-255 계열). ⚠️ 창단·재임 시즌 **잠정 숨김**(`SHOW_SEASON_ORIGIN_FIELDS=false`, I-260). ⚠️ F4/F5/F7은 `getTeamSeasonStat`/`getTeamTrophies` mock 미착수로 상시 empty 폴백. **데이터 계약 공백 4건 — I-266**
  - [x] **구단주 카드(F3-o) 신설 + F6 스폰서 슬롯에 체결 구단주 표기** (**D-35**, 47일차 사용자 요청) — **51일차 완료**(F3-o). 감독 카드(F3)와 대칭 배치 — 이름·나이·국적·재력·명성·(재임 시즌은 I-260로 잠정 숨김), **공석 시 "구단주 공석"**(코드 분기 구현, mock 60팀 1:1이라 공석 실데이터는 미검증). `getClubOwner(teamId)` 경유, 이름은 변수 주입(D-17), i18n `team.owner.*` 신설. **F6 스폰서 슬롯 체결 구단주 표기는 F6이 53일차 2/2 스코프라 함께 잔여**
  - [x] 섹션 단위 로딩·에러 격리 + 섹션별 빈 상태 문구 — **53일차 완료**(선수 상세). 페이지 단위 4상태 → **섹션 단위**로 전환: E1 헤더·E2 능력치는 최상단에서 이미 조회를 끝낸 데이터라 eager 유지하고(FR-UI-005는 섹션별 로딩을 요구하지 손에 있는 데이터를 늦추라는 뜻이 아니다), E3~E9를 각자 독립 조회하는 async 서버 컴포넌트로 `players/[playerId]/sections.tsx`(신규)에 분리해 `<Suspense fallback={스켈레톤}><ErrorBoundary>…</ErrorBoundary></Suspense>`로 감쌌다. **`ErrorBoundary`는 37일차 4팀 자산(`unstable_catchError`)을 재사용**했고 신규 컴포넌트 0종. Suspense fallback은 각 컴포넌트의 기존 `state:"loading"` 렌더를 그대로 써 **CLS 0** 유지. 빈 상태는 `CompositeViewState` empty variant에 **옵션 `message`**(하위호환)를 추가해 "이력 0건"과 "1건뿐이라 추세 불가"를 구분(i18n 키 경유, `player.growthChart.insufficientData`), E8 문구를 와이어프레임 문구("부상 이력 없음")로 정정. **팀장 실렌더 검증**: `/ko/players/{id}` HTTP 200, Suspense 경계 6개 전부 스트리밍 해소, 에러 폴백 렌더 0건. ⚠️ E9 트로피 빈 문구는 클럽 상세 F7과 **공유 컴포넌트**라 와이어프레임 제안("수상 이력 없음")으로 바꾸지 않고 기존 공유 문구를 유지했다(단독 변경 시 클럽 상세가 함께 바뀐다)
- **선행 조건(48일차 완료 필요)**: 1팀 타입 배치 반영(`avgRating`·`ClubOwner`·`signedByOwnerId` + `DataSource` 계약 3종) / 3팀 Mock 생성(**I-229·I-231 동시 처리**) / 6팀 마이그레이션·매퍼. **5팀 018→021 구간은 여유 0일(크리티컬 패스)이므로 선행분이 밀리면 M-3·M-4가 연쇄로 밀린다** — 5팀은 배선만 수행한다
- **수락 기준**: 특정 선수의 5시즌 성장 궤적과 이적 이력을 한 화면에서 추적 가능(PS-2 성공 신호). **평점 4지표와 구단주 카드가 빈 상태가 아니라 실값으로 실측된다**(D-33 판정 기준 — 빈 상태 렌더 확인만으로 충족 선언 금지).
  - **53일차 판정: 구현 사항 전건 완료, 그러나 PS-2는 판정 보류(D-33에 따라 충족 선언하지 않는다).** UI 계약은 완성됐으나 `MockDataSource`의 `getPlayerAttributeHistory`/`getPlayerTransferHistory`/`getPlayerLoanHistory` 3종이 **여전히 무조건 `return []`**(`MockDataSource.ts:1163/1224/1228`, 팀장 직접 재현)이라 5시즌 궤적·이적 이력을 **실값으로 실측할 수 없다**. **5팀 재작업 사안이 아니다** — 3팀 생성기가 채우는 즉시 뜬다. 3팀 다음 등판의 최우선 항목이며, 그때 PS-2를 실측 판정한다.

### Task 019: 통계 랭킹·수상·아카이브·이적 피드 화면을 완성한다

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 39일차 ~ 43일차 (2026-09-11 ~ 2026-09-17) / 추정 4.0인일 / 담당 4팀 UI기반·i18n팀
- **근거**: FR-UI-008, FR-UI-011, FR-UI-012, FR-UI-013, FR-ST-004, FR-AW-005, FR-YT-006
- **구현 사항**
  - [x] 통계 랭킹 — 리그/통합 필터, 지표 드롭다운 10종 이상, 최소 출전 필터 표기(공통코드 기본 30%) — 39일차, 지표 **12종** 구현(기준 10종 충족). **49일차 마감 후 후속**: "선수" 열의 이름을 `/[lang]/players/[playerId]` 링크로 전환(프로필 조회 실패 행은 죽은 링크 회피로 링크 없음)
  - [x] 이적/뉴스 피드 — 영입·임대·은퇴·유소년·감독교체·스폰서 부도 타임라인, 타입 필터. **뉴스 문구는 템플릿 + 고유명사 변수 주입** — 40일차, `/[lang]/transfers` 실렌더. 이적 문구 하드코딩 0건, 기존 `NewsItem` 재사용(신규 컴포넌트 0). **단 `/en`에서 headline·body가 한국어(I-205, mock 생성기 사안)**
  - [x] 수상/명예의 전당 — 시즌별 수상, 베스트11 피치 뷰, 통산 다관왕 랭킹 — 41일차 `/[lang]/awards` 실렌더. `PitchLineup` 재사용(신규 컴포넌트 0), 클라이언트 컴포넌트 0개(시즌 선택은 GET 링크). **3팀이 같은 일차에 mock `getAwards`/`getMultiAwardRanking`을 실구현해야 화면이 채워졌다** — 팀장 검증에서 전 섹션 empty로 적발 후 조치. 팀장 지적 2건 반영(리그 구분 열 추가 / 감독 부문 랭킹을 안내 문구로 대체). **「올해의 감독」 수상자명은 `DataSource`에 `managerId` 역조회가 없어 미해석(I-213)**, `Award`에 포메이션이 없어 베스트11은 4-3-3 근사 배치 + 안내 문구. **49일차 마감 후 후속**: 시즌별 수상 "대상" 열(선수 행)과 통산 다관왕 선수 부문의 이름을 선수 상세 링크로 전환. 베스트11 피치 뷰도 `PitchLineup`에 **선택적 `href`**를 추가해 함께 링크화(**I-253 해소** — 필드가 없으면 기존과 동일한 정적 텍스트라 `/sample`·경기 상세는 동작 변화 0)
  - [x] 시즌 아카이브 — 시즌 선택기, 최종 순위·우승·승강·수상 요약 — 42일차 `/[lang]/archive`. **완료 시즌이 0건인 것은 버그가 아니라 스펙이 예견한 케이스**(UC-011 선행조건 "시즌 1회 이상 종료", FR-UI-013이 빈 상태 문구를 지정)라 `/awards`처럼 링크 1개짜리 선택기로 흉내내지 않고 지정 문구를 그대로 렌더했다. 3섹션(최종 순위=`StandingsTable`/`ZoneLegend` 재사용, 우승=`Standing.rank===1` 파생, 수상 요약)은 배선 완료 후 **완료 시즌 픽스처를 주입한 렌더 테스트로 실행 검증**(`page.render.test.tsx`, 팀장 지시 — 게이팅된 죽은 코드 방지). **`Trophy`(E-32) 벌크 조회가 없어 우승을 순위 파생으로 대체**한 점은 실사용 시점에 재검토 필요
  - [x] 각 화면 4상태 + 무한 스크롤 또는 페이지네이션 규약 통일 — 43일차. 4상태는 4개 화면 모두 **기존 완비 확인**. 페이지네이션은 **`?limit=` 증가 방식 GET 링크로 통일**(무한 스크롤·오프셋 아님 — `DataSource`가 `limit`만 지원하고 SSR 전용 패턴을 유지하기 위함), `LoadMoreLink`(ui/ 신규, `buildLoadMoreHref`/`parseLoadMoreLimit`) 신설 후 stats/transfers/awards 3화면 적용. **archive는 대상 리스트가 이미 유계라 스코프 밖**(코드 주석에 근거 명시)
- **수락 기준**: 4개 화면 모두 Mock 데이터로 완결 동작하고 `/sample`에 관련 컴포넌트가 등록된다. — **43일차 충족**. `LoadMoreLink` 등록(4상태 비대상, I-168 `ZoneLegend`와 동일 판단) + 팀장 검증에서 적발된 5팀 신설 `MatchScoreboard` 미등록을 4팀이 LIVE/FINISHED 2슬롯으로 보완(composite 9종→10종). **잔여 미등록 3종(`RoundNav`·`SeasonSelect`·`TiebreakNote`)은 기존 부채로 I-221 등재**

### Task 020: 플레이오프·컵 브래킷과 스폰서 현황 화면을 완성한다

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀 / 지원: 5팀 화면·배팅UX팀(`BracketTree`) / **소급분(구단주 열) 선행: 3팀**(I-231 해소)
- **일정**: 44일차 ~ 47일차 (2026-09-18 ~ 2026-09-23) / 추정 3.5인일 / 담당 4팀 UI기반·i18n팀 / **+ 소급 60일차 (2026-10-12) / 추정 0.5인일 / 담당 4팀 UI기반·i18n팀** — D-35 `/sponsors` 체결 구단주 열. 4팀은 48~59일차가 대기 구간이라 **다음 등판일이 60일차**이며(D-33 경로 ② "다음 등판이 기한"), **3팀 I-231 해소(49일차) 확인 후 착수**한다. 022(60~65일차, 크리티컬 패스)와 같은 날이라 그 날 부하가 0.2인일 초과한다
- **근거**: FR-UI-009, FR-UI-010, FR-UI-014, FR-LG-011~013, FR-LG-015, FR-EC-011
- **구현 사항**
  - [x] 플레이오프 브래킷 — 리그1 10팀(WC→8강→4강→결승), 리그2 4팀, 리그3 1경기 — 44일차, `/[lang]/playoffs/[leagueId]` 실렌더. `getLeague`+`getPlayoffBracket`+`getTeamsByIds`로 `Fixture[]`를 라운드별 `BracketTreeData`로 변환해 **기존 `BracketTree`(5팀 013B)에 위임** — 신규 컴포넌트 0종. 신규 i18n 키는 `match.playoffs.title` 1개, 리그명은 고유명사 변수 주입(D-17). ko/en 3리그 전부 렌더 확인. **단 리그1 WC 라운드는 실제로 생성되지 않는다** — mock `progress.ts:1061`의 `floorPow2(playoffTeamCount)`가 10→8로 절삭(8강→4강→결승 3라운드). 기존 문서화된 스코프 축소(bye 슬롯 미지원, I-50 유보)이며 UI는 반환 라운드에 정직 → **I-227로 잔여 추적**
  - [x] 컵 브래킷 — 60팀 6라운드 59경기 트리, 티어 배지, bye 4팀 표기, 자이언트킬링 하이라이트 — 45일차, `/[lang]/cup` 실렌더. `getCupBracket` 평면 `Fixture[]` → 라운드 컬럼 변환 후 **기존 `BracketTree`에 위임**(신규 컴포넌트 0종), 3리그 tier 맵으로 티어 배지, round1/round2 차집합으로 bye 표기, `resolveBracketWinnerSide` 재사용해 자이언트킬링 판정. i18n `cup` 키 8종 ko·en. **단 mock은 32팀 5라운드 31경기만 생성한다** — `progress.ts:1087`의 `floorPow2(60)`이 32로 절삭해 28팀이 대진에서 사라지고 bye가 0건이라 **59경기·bye 4팀에 도달 불가**. UI는 라운드 수 무관하게 렌더하므로 데이터에 정직하며, I-227과 근본 원인이 같은 **I-50 종속 → I-228로 잔여 추적**
  - [x] 승부차기 스코어 별도 표기(`pk_home`/`pk_away`) — 46일차 확인, **신규 코드 불필요**. 5팀 `MatchScoreboard`(43일차 PSO 분리 표기, R-13)와 `BracketTree`(44·45일차 플레이오프·컵)가 이미 본 스코어와 분리해 표기하고 있어 4팀이 전수 재확인만 수행(D-19 준수)
  - [x] 스폰서 현황 — 목록(잔고·계약 팀 수·부도 위험 배지), 계약 상세 — 46일차, `/[lang]/sponsors` 신규 구현(4상태 파일 3종 포함). 목록 카드(잔고·계약 팀 수·부도 위험 배지 3종) + 계약 상세 표. i18n `sponsor` 네임스페이스 ko·en 신설, 하드코딩 0. **단 `MockDataSource.getSponsorContracts()`가 파라미터를 무시하고 항상 `[]`이고 `world.ts`가 `SponsorContract`를 생성하지 않아 계약 상세는 항상 empty이며, 부도 위험 배지도 mock이 항상 `balance > 0`/`bankruptAtSeason: null`이라 점등되지 않는다**(화면은 두 상태 모두 처리 — `archive.ts` 42일차와 동일 판단) → **I-231로 잔여 추적, D-33 경로 ② 적용(3팀 다음 등판 최우선)**. `SponsorContractStatus` 라벨은 `enums.ts` 부재로 로컬 배치(**I-232**)
  - [ ] **소급(4팀 다음 등판, D-35 / I-239) — `/sponsors` 계약 상세 표에 체결 구단주 열 추가.** `SponsorContract.signedByOwnerId` → `getClubOwner` 조인, 이름은 변수 주입(D-17), `sponsor.*` i18n 확장. **I-231(mock 계약 0건)이 3팀에서 해소된 뒤에야 실값 실측이 가능**하므로 3팀 선행 완료를 확인하고 착수한다. 5팀 크리티컬 패스와 무관해 일정 여유 있음
  - [x] 브래킷 가로 스크롤·확대 축소, 모바일 라운드 단위 페이징 — 47일차, **`BracketTree`(5팀 013B, composite)를 수정하지 않고** 감싸는 `src/components/domain/BracketViewport.tsx`(신규)로 구현해 소유 경계를 지켰다. 줌 75~150% 6단계는 `transform:scale` + `w-max`로 BracketTree 내장 `overflow-x-auto`를 무력화하고 **바깥 컨테이너 하나만 스크롤**되게 했고, 라운드 이동(‹ N/전체 ›)은 `data-slot="bracket-tree"` **공개 속성**으로 컬럼을 찾아 `scrollIntoView` — 내부 상수 결합 0. `playoffs/[leagueId]`·`cup` 화면을 교체하고 `/sample` domain 섹션에 **D-33 등록**. i18n `bracket` 그룹 9키 ko·en. **Playwright 실측**(320/1024px, ko·en): 320px에서 페이지 바디 가로 스크롤 없음(`scrollWidth===320`) · 브래킷 내부 컨테이너만 976px 스크롤 · 줌 100%→113% 시 976→1098px(정확히 1.125배로 스크롤 영역 확대) · 1024px에서 라운드 내비 `md:hidden` 처리 확인 → **수락 기준 "6라운드 브래킷이 320px에서도 가로 스크롤 컨테이너 내 탐색 가능" 충족**(컵 화면 실측은 mock 절삭으로 5라운드였으나 로직은 라운드 수 무관 — I-228 참조)
- **수락 기준**: 6라운드 브래킷이 320px에서도 가로 스크롤 컨테이너 내에서 탐색 가능.

### Task 021: 운영 콘솔 3종을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀 / 지원: 3팀(공통코드 스키마)·6팀(크론 지표)
- **일정**: 54일차 ~ 59일차 (2026-10-02 ~ 2026-10-09) / 추정 5.0인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-019, FR-UI-025, FR-UI-026, FR-AD-001~005·012·015·022, NFR-SEC-007
- **구현 사항**
  - [x] `/admin` — 시뮬 상태(페이즈·다음 킥오프), 배속 슬라이더(0.25×~20×), 정지/재개, 시드 조회, 월드 리셋(2단계 확인), 로그 뷰어 — **54일차 G1~G4 + 55일차 G5·G6 완료**. `src/app/[lang]/admin/page.tsx`(실경로 주의 — 일정표의 `src/app/admin/page.tsx`는 옛 표기)에 G1 상태 요약(`PhaseIndicator`+`CountdownTimer`+`StatusBadge`) · G2 배속 슬라이더(드래그=로컬 프리뷰 / `[적용]`=Server Action) · G3 정지/재개 · G4 시드 조회(`matchId`→`match_seed`). 신규 `SpeedControlPanel`·`PauseResumeControl`·`SeedInspectorPanel`·`StatusBadge` + `actions.ts`·`world-override-store.ts`·`elapsed.ts`, i18n `admin.ts` ko·en 확장. ⚠️ **`DataSource`가 어드민 쓰기를 계약 밖으로 명시**해 배속·정지 상태는 프로세스 in-memory 오버레이이며 재시작 시 소실된다 — 실 영속화는 2팀 H-24 + 6팀 쓰기 경로 대기(**I-273**). ⚠️ 수락 기준 "배속 변경 동작"의 **앱 내 왕복 실측은 미달** — 6팀 가드가 fail-closed인데 원격 `public.profile`이 0행이라 인가 통과 세션을 만들 수 없어 MockDataSource 직접 호출 + 액션 단위 테스트로 잠정 인정했었으나 — **55일차 사용자 승인 후 ADMIN 계정(`0625chopin`)을 부여해 왕복 실측 완료, 정식 인정으로 승격(I-274 해소)**: 무인증 403 · 비ADMIN 403 `not_admin` · ADMIN 200 + G1~G6 전량 렌더. **55일차 G5·G6 추가분** — G5는 radix `AlertDialog` 2단계(1단계 아카이브/삭제 → 2단계 사유 필수 + 확인문구 `RESET` 정확 일치)이며 `confirmWorldReset`은 게이트 통과 "요청"만 감사 로그에 `executed:false`로 남기고 **실제 리셋은 수행하지 않는다**(I-13). G6은 `getAuditLogs()` + 로컬 오버레이 병합(actorType 필터 5종·검색·payload 아코디언). 신규 `WorldResetPanel`·`DangerConfirmDialog`·`AuditLogViewer`·`audit-log-store.ts`·`reset-validation.ts`, 클라이언트 비활성화와 서버 재검증이 **같은 `isWorldResetConfirmValid`**를 공유. 잔여: G2·G3 조작이 감사 로그에 미기록(**I-275**), `actorId` 항상 null(**I-276**), 로그 오버레이도 휘발성(**I-273** 확대). 신규 컴포넌트 **누적 7종**의 `/sample` 등록은 4팀 소유라 인계
  - [~] `/admin/config` — 그룹별 상수 목록(현재값·기본값·설명·영향 FR), 편집 폼, 범위 검증 인라인 에러, 발효 시점 지정, 변경 이력 diff (사전 설계: `docs/wireframe/10-어드민공통코드-폼스펙.md`, 13일차 5팀). **56일차 H1~H3 완료** — `src/app/[lang]/admin/config/page.tsx`(실경로 주의)에 H1 그룹 목록(검색 필터·코드 수·영향 FR·발효 정책 배지) · H2 코드 테이블(현재값/기본값/단위/활성, JSON 축약) · H3 편집 폼(사유 필수, 저장 서버 액션). 신규 `ConfigGroupNav`·`ConfigCodeTable`·`ConfigEditForm` + `actions.ts`·`config-override-store.ts`, i18n `admin.config.*` ko·en. 위젯은 그룹 `valueType`별 분기하되 `CUP_PARAM.BYE_COUNT`류 **스칼라 래핑 JSON**(`{"value":N}`)은 폼스펙 §4.2대로 파싱 후 shape로 판별해 숫자 입력으로 내리고 저장 시 재포장한다. 저장 검증은 3팀 `validateCommonCodeValue`를 **재사용**(NFR-CFG-004), 액션 첫 줄 `assertAdminSession()`. ⚠️ **그룹 수는 37이 아니라 실측 38**(14일차 `NATIONALITY_WEIGHT` · 31일차 `MANAGER_STYLE_XG` 추가) — 화면이 `groups.length`를 그대로 쓰므로 숫자를 다시 박지 말 것(**I-280**). 잔여(57일차): 범위 검증 인라인 에러 · 발효 시점 지정 · H4 변경 이력 diff. 잔여 이슈: 빈 입력 → `0` 저장(**I-281**), 4그룹 코드 0건(**I-279**), 오버레이 휘발성(**I-273** 확대)
  - [ ] `/admin/scheduler` — 마지막 실행 시각, 성공/실패 이력, 밀린 라운드 수, 중단 구간(`cron_gap`), 잠금 상태
  - [x] 1차는 비공개 경로 + 환경 플래그로 보호 (NFR-SEC-007) — 54일차 `src/proxy.ts` `/admin/**` 가드 + `actions.ts` 액션별 `assertAdminSession()` 재검증(I-270), **55일차 실측으로 양방향 확인**(무인증·비ADMIN 차단 / ADMIN 통과)
  - [~] 위험 조작(리셋·강제 정산)은 2단계 확인 + 사유 입력 필수 — **55일차 리셋 완료**(브라우저 실측: 2단계 진입 후에도 사유·확인문구 미입력 시 「리셋 확정」 disabled, 서버 액션도 동일 함수로 재검증해 클라이언트 우회 불가). 강제 정산은 미착수
  - [ ] 공통코드 `description`은 운영 언어(ko) 우선, 카탈로그 확장 시 en 병기 가능한 구조
- **수락 기준**: 3개 콘솔이 Mock 데이터로 완결 동작. 범위 밖 상수 입력이 저장 전에 거부된다.
- **테스트**: Playwright MCP — 배속 변경·상수 편집·검증 실패 케이스 조작 시나리오.

### Task 022: 반응형·접근성·다국어 품질 마감을 수행한다

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 60일차 ~ 65일차 (2026-10-12 ~ 2026-10-19) / 추정 4.5인일 / 담당 4팀 UI기반·i18n팀 / **크리티컬 패스 · M-3 게이트**
- **근거**: NFR-RS-001~004, NFR-A11Y-001~006, NFR-PF-009, D-18, KPI-6
- **구현 사항**
  - [ ] 6개 브레이크포인트 × 2로케일에서 전 화면 가로 스크롤 0 검증
  - [ ] axe-core 자동 검사 — critical/serious 위반 0건, `<html lang>`이 활성 로케일과 일치
  - [ ] 키보드만으로 주요 플로우 5종 완주, 포커스 링 가시성 확보
  - [ ] `prefers-reduced-motion` 존중, 라이트/다크 대비 재검증
  - [ ] Lighthouse — LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms
  - [ ] **번역 키 누락·미사용 키 감사** — 누락 0건, 고아 키 목록 정리
  - [ ] `/sample` 커버율 100% 최종 감사 (KPI-6)
- **수락 기준**: 위 지표 전부 충족. 미달 항목은 `docs/ISSUES.md`에 기록 후 Phase 4로 이월.
- **테스트**: Playwright MCP — 6뷰포트 × 2로케일 × 주요 10화면 스냅샷 회귀, 크로스 브라우저 스모크.

---

> **아래 Task 046~048은 49일차에 신설된 인덱스 화면 3종입니다(I-223).** Task 001~045의 스코프는 한 줄도 바꾸지 않았습니다. 번호는 채번 충돌을 피해 046부터 이어 붙였고, 위치는 성격에 따라 Phase 2 말미에 둡니다. **Phase 2의 목표·완료 조건은 불변**입니다.
>
> **신설 경위** — 36일차 I-186이 내비 5종(`leagues`·`matches`·`playoffs`·`teams`·`players`)의 404를 "Task 016~021이 채운다"고 인계했으나, 44일차 실사에서 그 다섯 Task의 구현 사항이 **전부 상세 화면**이고 인덱스는 한 줄도 없음이 확인됐습니다(I-223). 리그(44일차)·선수(49일차)는 두 번 다 **사용자 질의로** 별건 신설돼 이미 열렸고, 남은 **경기·플레이오프·팀 3종**을 여기서 정식 배정해 닫습니다. 세 Task 모두 **대응 FR이 없습니다** — FR-UI 표는 인덱스 경로를 정의하지 않으며(FR-UI-003·004·005·006·009는 전부 `[id]` 상세), 근거는 FR-UI-020(전역 레이아웃·내비)과 품질 NFR입니다. 명세(와이어프레임)가 없는 화면이므로 **스코프 상한을 각 Task에 명시**하고 그 밖은 팀장 판정 대상으로 남깁니다.

### Task 046: 구단 목록 인덱스 화면(`/teams`)을 신설한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀 / 지원: 4팀(내비 `pending` 제거 — `layout.tsx`는 4팀 단독 소유, Task 048 소급분에서 처리)
- **일정**: 60일차 (2026-10-12) / 추정 0.75인일 / 담당 5팀 화면·배팅UX팀 — **크리티컬 패스 아님.** 5팀 021 종료(59일차) ~ 039 착수(62일차, H-18 대기) 사이 **2일 공백**에 배치한다(통합일정표 §1 불일치 C로 이미 문서화된 공백). ⚠️ **021이 밀리면 이 Task가 1순위 이월 대상**이다 — 아무도 이 화면을 기다리지 않으므로 CP를 흡수하는 완충으로 쓴다
- **근거**: FR-UI-020(전역 레이아웃·사이드 내비), FR-UI-006(클럽 상세 진입 동선), NFR-RS-001, NFR-A11Y-002, D-17, D-18, I-186·I-223
- **구현 사항**
  - [ ] `/[lang]/teams` 구단 목록 — 리그 선택 GET 폼(`?league=`), `getStandings({ leagueId })`로 소속 팀 id → `getTeamsByIds`로 카드(팀명·티어·순위표/스쿼드 링크). **정렬은 팀명순**(순위 순서로 세우면 없는 의미가 붙는다 — `players/page.tsx` 49일차 선례). **전용 "리그별 팀 목록" 계약이 없어 `Standing`을 경유**하는 것은 의도된 우회로다
  - [ ] 세그먼트 4상태 3종(`loading`/`error`/`not-found`) — `RouteLoading`/`RouteError`/`RouteNotFound` 얇은 래퍼(36일차 규약, 개별 마크업 금지)
  - [ ] i18n `team.list.*` ko·en 신설(`messages/{ko,en}/team.ts`는 5팀 소유) — 하드코딩 0, 팀명은 변수 주입(D-17)
  - [ ] 320px 가로 스크롤 0 + ko/en 실렌더 실측 후 **4팀에 내비 `pending` 제거를 통지(H-28)** — `src/app/[lang]/layout.tsx`는 4팀 단독 소유이므로 이 팀이 직접 편집하지 않는다
- **수락 기준**: 3개 리그 전부 구단 목록이 **실값으로** 렌더되고 각 카드에서 클럽 상세(`teams/[teamId]`)로 이동 가능하다. **스코프 상한** — 성적·재정·스쿼드 규모 등 집계 열은 넣지 않는다(명세 없는 화면에서 지표를 늘리면 "무엇을 기준으로 고른 목록인가"가 임의로 붙는다).
- **테스트**: Playwright MCP — ko/en × 320·1440px 렌더, 리그 전환 GET 폼 동작, 콘솔 에러 0건.

### Task 047: 경기 일정/결과 인덱스 화면(`/matches`)을 신설한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀 / 지원: 4팀(`match.list.*` 키 골격 선제 생성 — Task 048, 59일차 이전)
- **일정**: 61일차 (2026-10-13) / 추정 0.9인일(원 1.0 − 4팀 i18n 골격 선제 제공 0.1) / 담당 5팀 화면·배팅UX팀 — **크리티컬 패스 아님.** 046과 같은 2일 공백에 배치하며, 그 2일의 가용은 1.6인일인데 046+047 합이 **1.65인일이라 0.05인일 초과**한다(감수, 아래 판정 참조). ⚠️ **021이 밀리면 046과 함께 1순위 이월**
- **근거**: FR-UI-020, FR-UI-002(라이브 목록), FR-UI-004(일정/결과), NFR-RS-001, D-18, I-186·I-223
- **구현 사항**
  - [ ] 라이브·다음 킥오프 섹션 — `getLiveFixtures()` / `getNextKickoff()` 배선. 기존 `MatchCard`·`MatchScoreboard` 재사용(**신규 컴포넌트 0종** — `/sample` 커버율 KPI-6 영향 없음)
  - [ ] 리그·라운드 GET 폼(`?league=`·`?round=`) — `getFixtureRoundBounds`로 라운드 범위와 현재 라운드 기본값, `getFixturesByRound`로 목록. **전역·날짜 범위 경기 조회 계약이 `DataSource`에 없어 라운드 단위로 좁힌다**(수락 기준의 스코프 상한 참조)
  - [ ] 세그먼트 4상태 3종 + i18n `match.list.*` ko·en — `match.ts`는 **구조 4팀 / 값 5팀**이므로 키 골격은 4팀이 선제 생성(Task 048)하고 이 팀은 값만 채운다
  - [ ] 320px 가로 스크롤 0 + ko/en 실렌더 실측 후 4팀에 내비 `pending` 제거를 통지(H-28)
- **수락 기준**: 진행 중 경기가 있으면 라이브 섹션에, 없으면 다음 킥오프가 표시되며, 리그·라운드를 바꾸면 해당 라운드 경기 목록이 실값으로 렌더된다. **스코프 상한** — 날짜 범위 필터·전 리그 통합 타임라인·무한 스크롤은 **이 Task 밖**이다. 그것들은 `DataSource` 계약 신설을 요구하고, 타입은 8일차에 동결돼 배치 반영 절차(체크리스트 C-7 / D-34·D-35 선례)를 거쳐야 한다 — **계약 신설 여부는 팀장 판정 대상**이며 실DB 전환(034b) 이후 재검토를 제안한다.
- **테스트**: Playwright MCP — 라이브 있음/없음 두 상태, 라운드 이동, ko/en × 320·1440px.

### Task 048: 플레이오프 인덱스 화면(`/playoffs`)을 신설하고 내비 `pending`을 종결한다

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀 / **소급분 선행: 5팀**(046·047 완료 통지 H-28)
- **일정**: 50일차 ~ 51일차 (2026-09-28 ~ 2026-09-29) / 추정 1.0인일 / 담당 4팀 UI기반·i18n팀 / **+ 선행 0.1인일 (≤59일차, 유휴 구간 중 임의일) — 5팀 047용 `match.list.*` 키 골격** / **+ 소급 62일차 (2026-10-14) / 추정 0.1인일** — `matches`·`teams` `pending` 제거. 4팀 **48~59일차 12일 대기 구간**을 쓰므로 022(60~65일차, 크리티컬 패스)에 영향이 없다. ⚠️ 단 62일차 소급 0.1인일은 022의 산술 여유(−0.2인일)를 **−0.3인일**로 만든다
- **근거**: FR-UI-020, FR-UI-009(플레이오프 브래킷 진입 동선), NFR-RS-001, NFR-A11Y-002, D-17, D-18, I-186·I-223
- **구현 사항**
  - [x] `/[lang]/playoffs` 인덱스 — `getLeagues()` × `getPlayoffBracket({ leagueId })`로 리그별 카드(플레이오프 슬롯 수, 생성된 라운드 수, 다음 경기 또는 최종 결과 요약) + 컵(`/cup`) 링크. **기존 `BracketTree`/`BracketViewport`는 쓰지 않는다**(인덱스는 트리가 아니라 대회 선택 화면)
  - [x] 세그먼트 4상태 3종 — 브래킷 미생성(프리시즌·정규시즌 중) 리그는 빈 상태 문구로 처리한다. **I-227**(mock이 리그1 WC 라운드를 절삭)로 라운드 수가 명세와 다를 수 있으므로 **화면은 반환된 라운드에 정직하게** 렌더한다
  - [x] i18n — 브래킷·플레이오프 키는 4팀 소유(`match.playoffs.*`·`bracket.*`) 확장, 하드코딩 0 — 50일차 `match.playoffsList.*` 그룹 신설. 기존 키(`league.header.teamCountFormat`·`match.upcoming.matchupFormat`·`match.cup.matchupFormat`·`fixtures.round.kickoffLabel`·`league.list.empty*`)를 최대 재사용해 **신규 중복 키 0**. ko/en 키 대칭 165=165 확인
  - [x] 내비 `playoffs` `pending: true` 제거 + 링크 실측 — **50일차 당일 처리**(팀장 검증 지시). H-28이 이를 62일차로 미룬 근거는 "`layout.tsx`가 4팀 단독 소유라 화면 담당팀이 직접 못 지운다"였으나 **이번 화면은 4팀 본인 산출물이라 전제가 성립하지 않는다** — 그대로 두면 49일차 선수 상세와 같이 "화면은 있으나 앱 내 진입 0건"이 된다(44일차 `leagues` 선례와 동일 처리). `href="/ko/playoffs"` 활성 링크 렌더 확인. **`matches`·`teams`는 화면 미존재라 유지**
  - [x] **선행 — 51일차 완료** — 5팀 047이 쓸 `match.list.roundForm.*` 키 골격(sectionTitle/leagueLabel/roundLabel/submitLabel/empty/error)을 `messages/{ko,en}/match.ts`에 선제 생성(구조는 4팀 소유, 값은 5팀 61일차). **축소 스코프 준수** — 라이브·다음 킥오프는 기존 `card.*`/`upcoming.*` 재사용, 날짜 필터·통합 타임라인 키는 미생성(I-255). **동시에 하드코딩 0 실사(ko·en) + `/ko|en/playoffs` 320px 가로 스크롤 0 실측**(50일차 미실측분) 완료
  - [ ] **소급(62일차)** — 5팀 H-28(61일차) 수신 후 `matches`·`teams` `pending: true` 제거 및 링크 실측. `src/app/[lang]/layout.tsx`는 4팀 단독 소유라 5팀이 직접 편집하지 않는다
- **수락 기준**: 사이드 내비 11개 링크가 전부 200으로 응답한다 — **`NAV_GROUPS`의 `pending: true` 잔여 0건**(I-186·I-223 종결 조건). 3개 리그 카드가 실값 또는 지정 빈 상태로 렌더된다. **스코프 상한** — 대진 트리·경기 상세는 기존 `/playoffs/[leagueId]`(Task 020, 44일차 완료)가 담당하며 인덱스에 복제하지 않는다.
- **테스트**: Playwright MCP — 내비 11개 링크 순회(404 0건), 3리그 카드 렌더, ko/en × 320px.

---

## Phase 3: 핵심 기능 구현

> **일정**: M-2 엔진 코어 확정 37일차 (2026-09-09) · M-4 1차 MVP 릴리스 완료 목표 74일차 (2026-10-30) — 실행 구간 9~74일차 / Task 023~036

> **목표**: 세계가 실제로 돌아가게 만든다. 엔진 → 경제 → DB → 크론 → 어댑터 교체 순으로 수직 슬라이스를 완성한다.
> **완료 조건**: 1차 릴리스(MVP) 범위 전량 동작 + Mock→Supabase 교체 시 **UI 코드 변경 0줄**(FR-UI-023).
> **병렬 구조**: 엔진 트랙(팀원 5·6)과 인프라 트랙(팀원 9)이 동시에 진행되고 Task 034에서 합류한다.

### Task 023: 경기 시뮬레이션 코어 틱 엔진을 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 9일차 ~ 16일차 (2026-07-31 ~ 2026-08-11) / 추정 6.5인일 / 담당 2팀 시뮬레이션엔진팀
- **근거**: FR-MT-001·002·003·012·013·016, **D-19**, NFR-MT-001, NFR-PF-001, I-02
- **구현 사항**
  - [x] `src/lib/sim/match/` — 90틱(+30 연장) 순회 엔진, 추가시간(전반 0~5 / 후반 1~8) 표현 (9일차, `tick.ts`)
  - [x] 이벤트 23종 생성 및 시간순 정렬, `detail(JSON)` 최소화. **이벤트는 타입 코드만 저장하고 문구는 UI 카탈로그가 담당**(D-18) (10일차, `events.ts`)
  - [x] 스탯 자연 누적 — 이벤트 로그가 SSOT, 사후 임의 배분 금지 (11일차, `stats.ts`. **AS-10 9일차 부분 무효화**(`docs/ISSUES.md`) 반영: `PlayerStatCoreValues` 56필드 중 이벤트 대응이 있는 Tier A 16개만 이 파일이 이벤트 폴드로 산출하고, 대응 이벤트가 없거나 로스터·타임라인 컨텍스트가 필요한 Tier B 40개는 이번 산출물에서 제외 — I-34가 요구한 56필드 전량 Tier A/B 매핑표를 `PLAYER_STAT_FIELD_CLASSIFICATION`으로 확정)
  - [x] 교체 로직(최대 5명·3창), 부상 발생 시 즉시 교체 판단 (12일차, `substitution.ts`)
  - [x] 승부차기(5+서든데스) — **PK 골은 `player_match_stat.goals`에 미포함**, `pk_home`/`pk_away`로 분리 기록 (D-19) (13일차, `penalty.ts`. 킥 성공 확률은 024 계수 체인 대기 중이라 `resolveScoreProbability` 콜백으로 위임하고, 매 킥 직후 "수학적으로 이미 결정"(remaining 기반) 검사로 조기 확정·정규 종료를 하나의 식으로 통일. `PENALTY_SHOOTOUT`은 킥마다의 이벤트가 아니라 경기 전체 구조 마커 1건 — `stats.ts`가 이미 이 타입을 Tier A 무기여로 처리해 수정 불필요함을 재검증)
  - [x] GK 퇴장 + 교체 소진 시 필드플레이어 GK 배치 절차 확정 후 `docs/ISSUES.md` I-02 해소 (14일차, `gk-fallback.ts`. D-22 ①~⑤ 전 단계 구현 — ①은 `substitution.ts`의 `applySubstitution`에 위임, ②~④는 goalkeeping 최고→유효능력 최저→`playerId` 기반 시드 결정론 추첨. `docs/ISSUES.md` I-02는 D-22로 이미 취소선 처리되어 있어 별도 편집 없음. **재작업(14일차, 팀장 2차 검증 + I-83 확정 반영, I-95 등재)**: ⑤의 배율 0.35가 실은 3팀 카탈로그 등재값(`POSITION_PROFICIENCY_MULT.GK_CROSS`)임이 드러나 리터럴 `GK_CROSS_POSITION_MODIFIER`를 `GK_CROSS_POSITION_MODIFIER_DEFAULT`(안전 기본값)로 재정의하고 `ResolveGkFallbackOptions.crossPositionModifier`(선택적 주입 파라미터)를 추가. **2차 재작업(1팀 교차 점검 + 사용자 승인)**: 주입 누락 시 조용한 폴백을 막기 위해 `GkFallbackResult.crossPositionModifierSource: 'INJECTED' | 'DEFAULT'` 관측 필드 추가(WARN 로그 대신 반환값으로만 노출 — 순수 함수 계층 부작용 0건 유지). `npx tsc --noEmit`·`npm run lint`·`gk-fallback.test.ts`(16케이스) 전부 통과)
  - [x] React·Supabase import 0건 (순수 함수 계층) — **16일차 완료**(`perf-bench.test.ts`의 "import 제약" describe가 `src/lib/sim/**` 전 파일을 실제로 스캔해 `react`/`@supabase/*` 0건을 검증 — 주석 선언이 아니라 자동 테스트로 고정)
  - [x] **(31일차 신설)** Tier B 26필드(`NO_EVENT_TYPE` — 패스 8·드리블 4·수비 11·GK 3) `matchSeed` 재시뮬레이션 + 이벤트 구조 마커 결정론적 삽입(**I-65**) — **31일차 완료**(`src/lib/sim/match/tier-b-resim.ts` 신규 +test, `events.ts`에 `ensureStructuralMarkers` 추가). 11일차 계약 `tier-b-resim-contract.ts`는 **미수정**이고 새 파일에 구현체만 뒀다. **수락 기준 충족**: 26필드 전량 산출(테스트가 계약의 `TIER_B_RESIM_FIELD_NAMES`와 드리프트 가드로 교차검증 — 독립 12 + 쌍 7개 14 = 26, 반환 행 키 수 26), `FINISHED` 구조 마커 4종(`KICKOFF`/`HALF_TIME`/`FULL_TIME`/`EXTRA_TIME_START`) 누락 0건(`occursProbability=0` 최악 케이스로 검증)
    - 기댓값 테이블(포지션그룹별 기준치)을 **리터럴로 두지 않고 전량 주입**(NFR-CFG-001) — `events.ts` weights, `xg-manager-tendency.ts` table과 동일 패턴. `attempted`만 지터를 주고 `completed = round(attempted × rate)`로 파생시켜 `completed ≤ attempted`를 구조적으로 보장한다. 실제 기준치는 **테스트 픽스처 값일 뿐 밸런싱 확정치가 아니며**, 3팀 공통코드 그룹 신설 여부는 오케스트레이션 계층(H-15 이후) 착수 시 재판단
    - **32일차 테스트 보강(2팀)** — 32일차 4항목(결정론 재현·그룹 내부 불변식·26필드 커버리지·구조 마커 회귀) 중 앞 3개는 31일차 `tier-b-resim.test.ts`에 이미 구현돼 있음을 팀장이 describe/it 전수 대조로 확인했고, 실제로 비어 있던 **구조 마커 삽입 회귀 3케이스만** `events.test.ts`에 추가(+66줄): ⓐ 전반 스토피지가 있을 때 HALF_TIME이 그 마지막 틱(45분+추가시간)에 위치 ⓑ 연장 포함 시 FULL_TIME이 EXTRA_SECOND 마지막 틱(120분)에 위치 ⓒ **정위치가 아닌 동일 타입 기존 이벤트를 마커로 오인하지 않고 정위치에 별도 삽입**(`hasMarker`가 type만 보도록 완화되면 I-65가 재발하는 지점의 오탐 방지). `npx vitest run events tier-b-resim` 3 files / 58 tests 통과
    - **⚠️ 두 함수 모두 현재 소비처 0건이다(I-164)** — `snapshot-pipeline.ts:189`는 여전히 `linkPenaltyOutcomes(events)`만 호출하므로 **파이프라인 산출물에는 아직 구조 마커가 없다.** 배선 시 `ensureStructuralMarkers`는 sequence를 재부여하므로 **`linkPenaltyOutcomes`보다 반드시 앞에서** 호출해야 하고(뒤에 두면 `relatedEventSequence` 참조가 조용히 깨진다), 이 제약을 잡는 테스트를 함께 넣어야 한다
- **수락 기준**: 경기 1건 p95 ≤ 50ms / p99 ≤ 120ms. 스코어 = 골 이벤트 합 + 자책골 정합 100%.
- **테스트**: Vitest — 시드 스냅샷 100경기 전건 일치(NFR-QA-003), 이벤트↔스탯 재계산 일치, 성능 벤치. — **15일차 시드 스냅샷·재계산 일치 완료**(`snapshot-pipeline.ts` 신규 지원 모듈이 100경기 틱→이벤트→PK연결→스탯 파이프라인의 단일 소스, `match-snapshot.test.ts`·`events.test.ts` 신규, `__snapshots__/match-snapshot.test.ts.snap` 806줄. **다이제스트 스냅샷 채택** — 100경기 원본 이벤트 배열을 그대로 저장하면 수만 줄로 부풀어 리뷰가 불가능하므로 기존 `rng/hash.ts`의 `hashState()`(SHA-256, NFR-DT-003 도구 재사용)로 경기당 이벤트·스탯을 64자리 hex 2개로 축약, vitest `toMatchSnapshot()`이 최초 실행 시 자동 생성해 별도 생성 스크립트 불필요. 2회 연속 실행 diff 0 확인. 커버리지 실질 해소: `events.ts` **0%→100%**(라인·브랜치), `stats.ts` 라인 97.61%→100%·브랜치 66.66%→**76.92%**. 잔여 미커버 `default: exhaustiveCheck`(`MatchEventType` 23종 소진 후 구조적 도달불가, 유니온 확장 시 tsc가 즉시 검출)는 1팀 perFile 채택에 맞춰 `/* v8 ignore start/stop */`으로 분모 제외 — **테스트 가능한 15개 분기**(`if (primaryPlayerId)` 등 참가자 미배정 스킵 경로)는 덮지 않고 그대로 남김, 16일차 이후 테스트 부채로 이월. 성능 벤치는 미착수) — **16일차 성능 벤치 완료**(`src/lib/sim/match/perf-bench.test.ts` 신규). 경기 1건을 틱→이벤트→PK연결→스탯 **전 파이프라인 그대로** 측정 구간에 넣어 200건 표본(5건마다 연장전 포함)으로 측정: **p95 0.203ms / p99 0.430ms** — 수락 기준 50ms/120ms 대비 대폭 여유. 스코어 정합은 이벤트 `teamId` ↔ 로스터 기반 재도출 교차검증으로 **불일치 0건**(골 532건/200경기), OWN_GOAL 수혜팀 귀속 규약(I-53) 재현 포함. `performance.now()`는 측정 전용이라 NFR-DT-001과 무관(6일차 `rng/bench.test.ts`와 동일 근거)이며 1팀 16일차 lint 룰(`Math.random`/`Date.now`만 차단)과도 충돌하지 않음. **테스트 부채로 이월했던 참가자 미배정 15개 분기(I-103)도 같은 날 전량 커버해 종결**(`stats.test.ts` describe 추가)

### Task 024: 능력치 보정 체인과 라인업 자동 선정을 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀 / 지원: 3팀 데이터·밸런싱·배당팀(공통코드 값 제공)
- **일정**: 17일차 ~ 24일차 (2026-08-12 ~ 2026-08-21) / 추정 6.5인일 / 담당 2팀 시뮬레이션엔진팀
- **근거**: FR-MT-004~009·011·014, FR-PL-006~010, FR-TM-006, I-03
- **구현 사항**
  - [x] 9개 계수 함수 독립 구현 — condition / fitness / injury / familiarity / home / weather / manager / position + 클램프 [0.35, 1.35] — **17일차 골격 완료**(`src/lib/sim/ability/modifiers.ts` 179줄, `modifiers.test.ts` 36케이스). 개별 계수 8종 + 합성 `combineAbilityModifiers`(계수 체인 곱 후 재클램프) = 9개, 각각 전용 입력 인터페이스를 갖는다. **클램프는 `clampAbilityModifier`가 유일한 진입점**이며 9개 함수 전부가 이를 경유 — 유한수 아님/`min>max`는 `RangeError`. 경계값 `[0.35, 1.35]`는 `match/gk-fallback.ts`의 D-22 GK 교차 배율과 같은 값이고(우연이 아니라 "유효 능력이 최저치에서도 0이 되지 않는다"는 동일 설계 의도), 이 값이 시즌별 밸런싱 파라미터(NFR-CFG-001)인지 알고리즘 불변식인지 미결이라 **`gk-fallback.ts`(I-83)와 동일한 "안전 기본값 export + options override" 패턴**으로 두어 `SimConstantSnapshot`(E-44) 주입에 대비했다. 이 클램프는 `rng/precision.ts` 확률 비교 규약(NFR-DT-005) 대상이 **아니다** — `[0.35,1.35]` 단순 배율이고 `Math.min`/`max`(IEEE-754 표준 연산)만으로 결정론적이다(파일 헤더에 근거 명시). 테스트: 하한·상한·경계값·override·`min>max`·NaN 전건 통과. `tsc --noEmit`·`eslint`(1팀 17일차 신규 sim 룰 포함) 오류 0
    - **⚠️ 8개 개별 함수는 현재 중립값 1.0을 클램프해 반환하는 자리표시자다** — 실제 공식은 담당 일차에 이 자리를 채운다(각 함수 `// TODO(N일차)` 주석): 컨디션·피로·캐미 **18일차**, 포지션 숙련도 **19일차**, 날씨·감독 상성 **20일차**. 조기 확정이 그날 담당 판단을 앞지르는 것을 피하기 위한 의도적 공백이다. **날씨·포지션 로직이 `modifiers.ts`에 잔류할지 `tactics.ts`/`position.ts`로 분리될지는 해당 일차에 재판단**(오늘은 스텁만 유지)
  - [x] 컨디션 `M = 0.70 + 0.30×(C−1)/9`, 피로 `M = 0.75 + 0.25×(fitness/100)`, 캐미 상한 +6% — **18일차 완료**(`modifiers.ts` 자리표시자 3종 교체, `modifiers.test.ts` 36→39케이스). `conditionModifier`/`fitnessModifier`는 과제 행 공식 그대로, `familiarityModifier`는 `M = min(1.0 + 0.01×familiaritySeasons, 1.06)` — **상한 +6%만 명시돼 있고 증가 곡선(선형 vs 체감)·연 증가율이 미정이라 선형 1%p/시즌으로 채택하고 근거를 파일 상단 주석에 명시**(6시즌차부터 상한 고정). 17일차 `clampAbilityModifier` 단일 진입점을 그대로 재사용해 **신규 클램프를 만들지 않았다**. **수락 기준 경계값 전건 통과** — C=1→0.70, C=10→1.00, fitness=0→0.75/100→1.00, seasons=0/3/6/20. `tsc --noEmit` 0 error, `npm run test` 542 통과. 잔여 자리표시자 5종(부상·홈·날씨·감독·포지션)은 19~20일차
  - [x] 포지션 숙련도 5단계 + 인접 그래프 BFS 기반 미보유 페널티, GK 교차 0.35 예외 우선 — **19일차 완료**(`src/lib/sim/ability/position.ts` 신규, `position.test.ts` 60케이스, `modifiers.ts`에서 스텁 이관·제거). 11노드/15엣지 인접 그래프를 모듈 로드 시 **전 쌍 BFS 테이블로 사전 계산**하고, ① `assignedPosition`이 GK 관련 교차면 **하드 고정 0.35를 보유 단계표보다 우선** 적용(FR-PL-006 "하드 고정" + 수용 기준 ④) ② 보유 시 숙련도 5단계(1.00/0.95/0.88/0.75/0.60) ③ 미보유 시 `max(0.45, 0.88 − 0.11×dist)`. GK 교차 배율은 재선언하지 않고 `match/gk-fallback.ts`의 `GK_CROSS_POSITION_MODIFIER_DEFAULT`를 import해 **같은 공통코드 값의 중복 선언을 피했다**. BFS 거리별 페널티 단조 감소를 테스트로 직접 고정. `tsc --noEmit` 0 error, `npx vitest run src/lib/sim` 17파일 299케이스 전건 통과
    - **파일 분리 판단(17일차 인계 사항 해소)** — `modifiers.ts` 잔류가 아닌 **분리 확정**. 근거 ⓐ 단일 수식인 컨디션/피로/캐미와 달리 그래프+BFS+3단 분기로 복잡도 층위가 다름 ⓑ 팀 일정표 산출물 필드가 이미 `position.ts`로 지정돼 있었음 ⓒ `match/gk-fallback.ts`(14일차)가 같은 이유로 분리된 선례. **20일차 날씨·감독은 각각 단일 매트릭스 룩업이라 이 판단이 자동 승계되지 않으며 그날 별도 판단한다**. 참고: FR-PL-007이 [제안] 상태인 값을 코드 상수화했으므로, 값 변경 시 `POSITION_ADJACENCY`만 고치면 된다
  - [x] 날씨 9종·감독 성향 6종 + 6×6 상성 매트릭스(공통코드 로드) — **20일차 완료**(`src/lib/sim/ability/tactics.ts` 신규, `tactics.test.ts` 신규, `modifiers.ts`에서 스텁 이관·제거 + `NEUTRAL_MODIFIER` export). 날씨 `M_weather`(FR-MT-006)·감독 `M_manager`(FR-MT-009 6×6)를 3팀 로더 `loadConstants` 경유로 조회 — **숫자 리터럴 0건**(`check-literals.mjs` 검사 대상 11파일에 `tactics.ts` 포함, 후보 0건 확인). `npx vitest run src/lib/sim/ability/` 65케이스 통과, `tsc --noEmit` 0 error
    - **파일 분리 판단(19일차 인계 사항 해소)** — **분리 확정**. 19일차 포지션 판단(그래프 BFS 복잡도)을 승계하지 않고 **"공통코드 로더 의존"이라는 별도 축**으로 재판단했다: `WEATHER_EFFECT`/`MANAGER_MATCHUP`은 `fallback.ts`의 `SAFE_DEFAULT_VALUES`에 구체 숫자·JSON 구조 자체가 아직 없어(36일차 031a 소관) **포지션처럼 안전 기본값을 선언할 수 없고**, 억측 금지 원칙상 로더를 반드시 거쳐야 한다. `options?.table ?? loadConstants(group)` 패턴으로 override 시 순수함수를 유지하고, 미지정 시에는 로더를 직접 호출한다(다른 레이어의 기존 방식과 동일). 미등록 시 `ConstantSourceUnavailableError`를 **삼키지 않고 전파** — 부트스트랩 누락을 조용한 폴백으로 숨기지 않기 위함
    - **⚠️ 실제 계수 값은 36일차(031a) 시드 이후 자동 반영**된다. 그전까지 이 경로는 로더 미등록 시 예외로 죽는 것이 정상 동작이다. `WEATHER_EFFECT[weather]` 안에서 이 체인이 읽는 키 `ABILITY_MULT`는 05문서에도 `fallback.ts`에도 없어 20일차 2팀이 처음 정한 것이므로 **시드 작성자와 키 이름 정렬 필요 → I-118**
    - **FR-MT-009의 "성향 자체 xG 배율"·"숙련도 실현율"은 이 Task 범위 밖**으로 판단해 남겼다 — 선수 능력치가 아니라 팀 단위 xG 조정이라 매치 엔진 소관이나, **`ROADMAP.md`에 "xG" 문자열이 0건이라 대응 Task 행 자체가 없다(스코프 누락 확정) → I-119, 팀장 배정 대기**
  - [x] 라인업 선정 — 가용성 × 컨디션 × 피로 × 포지션으로 선발 11 + 벤치 7(GK≥1), 로테이션 정책 — **21일차 완료(로테이션은 부분 충족)**(`src/lib/sim/lineup/select.ts`, `select.test.ts` 신규). `selectLineup()`이 가용성(부상·정지) 배제 후 컨디션×피로×포지션 합성 점수로 선발 11(그리디 슬롯 배정) + 벤치 7(GK 1명 우선 확정 후 점수순)을 **결정론적으로** 선정한다 — `modifiers.ts`·`position.ts`의 계수는 **재구현 없이 호출만** 한다. `npx vitest run src/lib/sim/` 316케이스 통과, `tsc --noEmit` 0 error. **수락 기준 "부상·정지 선수 선발 0건"은 테스트로 직접 고정**했다
    - **정지 상태 처리**: 새 필드를 만들지 않고 기존 `PlayerState.suspensionRemainingLeague`/`Cup`을 사용하되, `CompetitionType` 4종 → 리그/컵 2분류 매핑은 **025·026 소관이라 추측하지 않고** 입력(`suspensionCompetition: 'LEAGUE' | 'CUP'`)으로 위임했다
    - **⚠️ 로테이션 정책은 부분 충족 — 이력 기반 로테이션 미구현.** `PlayerState`(`src/types/person.ts:211`)에 최근 출전 이력 필드가 없고(8일차 동결 H-01), `PlayerSeasonStat.appearances`(`src/types/stat.ts:54`)는 시즌 누적이라 "최근 N경기" 판정에 쓸 수 없다 — **팀장이 타입 원본을 직접 확인**했다. 2팀은 억측으로 필드를 만들지 않고 `fitnessModifier` 페널티에 의한 **자연 유도** + 동점 시 `playerId` 오름차순 결정론까지만 적용했다(**판정: 멈춘 것이 옳다**). 이력 기반 로테이션이 실제로 필요한지는 **025·026 착수 시점에 판단** → **I-123**(필요 시 타입 필드 추가는 C-7 배치 선행)
    - 슬롯 배정이 그리디라 전역 최적해와 다를 수 있으나 **결정론은 확보돼 재현성 문제는 없다** → I-124(밸런싱 검증 단계에서만 재검토). `LINEUP_STARTER_COUNT = 11`이 `check:literals`에 걸리나 `substitution.ts`의 5/3과 같은 **구조 상수**(축구 규칙)로 밸런싱 파라미터가 아니다(팀장 확인)
  - [x] 카드 누적 5장 정지 / 퇴장 1~3경기 정지, 리그·컵 누적 분리 — **22일차 완료**(`src/lib/sim/discipline/suspension.ts`, `suspension.test.ts` 신규, 단독 21케이스). 리그/컵을 **축으로 완전 분리**해 한쪽 누적이 다른 쪽에 영향을 주지 않음을 테스트로 직접 고정(수락 기준 "리그·컵 카드가 섞이지 않음" 충족). 21일차 `select.ts`의 `SuspensionCompetition`과 `stats.ts`의 `PlayerMatchStatTierAFold`를 **재구현 없이 소비**한다
    - **퇴장 정지 경기 수(1~3)를 이 파일이 확정하지 않았다** — CardReason taxonomy가 I-41로 보류 중이라 억측 대신 호출자가 `dismissalSuspensionGames`로 명시하게 하고 파일은 범위 검증(fail-fast)만 한다. 21일차 로테이션 판단(타입에 없는 필드를 만들지 않고 멈춤)과 같은 원칙
  - [x] 감독 공석 시 BALANCED 폴백 지속 규칙 확정 후 I-03 해소 — **22일차 완료**(D-23: 공석 0라운드·즉시 대행). `resolveManagerStyle(manager: Pick<Manager,'teamId'|'style'> | null)` — 인자가 `null`이면 BALANCED. **배치 판정(팀장)**: 카드 정지와 별개 관심사임에도 `suspension.ts`에 함께 둔 것을 **승인·유지** — ⓐ 22일차 행이 산출물 경로를 이 파일 하나로 명시했고 ⓑ 의존성 없는 순수 함수 1개라 이관 비용이 사실상 0이며 ⓒ 분리 여부는 025·026(감독·전술) 착수 시점에 함께 판단하는 것이 맞다(그때 재판단하도록 22일차 로그 §7에 예약)
- **수락 기준**: 전 계수를 1.0으로 강제 시 base와 일치. 핵심 9개 함수 커버리지 100% (NFR-QA-002). — **23일차 충족(2팀)**. `src/lib/sim/ability/` 4파일 75케이스, Stmt/Branch/Func/Line **전부 100%**(`vitest run --coverage`로 실측).
  - **"전 계수 1.0 강제 시 base 일치" — 23일차 완료(2팀, `modifier-chain.test.ts` 신규)**. 기존 테스트는 **리터럴 배열만 `combineAbilityModifiers`에 넣어 검증**하고 있어 개별 함수 → 합성으로 이어지는 실제 경로가 비어 있었다. 8개 계수 함수를 각각 **중립 입력으로 실제 호출**해 얻은 값을 합성한 결과가 base(1.0)와 일치함을 고정했다 — 계수 하나가 중립 입력에서 1.0을 벗어나면 이제 이 테스트가 잡는다
  - **실 공통코드 로더 경로 통합 검증 — 24일차 완료(2팀), Task 024 종료.** 23일차 테스트는 `weatherModifier`/`managerModifier`에 **테스트 전용 리터럴 테이블을 주입**해 검증하고 있어 실제 로더 경로를 타지 않았다(2팀 자체 진단). `installHardcodedFallback()` 등록 후 오버라이드 없이 호출해 `WEATHER_EFFECT`/`MANAGER_MATCHUP` 빈 객체에서 `NEUTRAL_MODIFIER` 폴백이 실제로 일어나고 `ConstantSourceUnavailableError`가 던져지지 않으며 합성 결과가 여전히 base(1.0)임을 고정했다. **36일차(031a)에 이 값들이 실제 구조로 채워지면 "1.0 유지" 전제가 깨지므로 함께 갱신해야 한다**(README·테스트 양쪽에 명시)
  - **반환 타입 문서화 — 24일차 완료(2팀)**: `src/lib/sim/ability/README.md` 신규 — 9개 계수 함수 표(입력/공식/반환타입/클램프), 체인 조립이 **소비자별 부분집합** 방식임을 명시(`lineup/select.ts`는 3개만 사용), 미배선 지점 명시(`match/**` 엔진 미연결, `penalty.ts`의 `resolveScoreProbability`가 유일한 명시적 연결점). **H-14(경기 결과·이벤트 반환 타입) 3팀 인계 절 포함** — OWN_GOAL의 `teamId` 귀속, xg 승격 필드, PK 골 미포함(D-19), `relatedEventSequence`는 표시 전용, `PenaltyShootoutResult`/`MatchEventDraft`는 3팀이 직접 참조 불필요
- **테스트**: Vitest — 경계값(C=1→0.70, C=10→1.00 등) 전건, 부상·정지 선수 선발 0건.

### Task 025: 대진표 생성과 라운드 킥오프 스케줄링을 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 25일차 ~ 30일차 (2026-08-24 ~ 2026-08-31) / 추정 4.5인일 / 담당 2팀 시뮬레이션엔진팀
- **근거**: FR-LG-002·003·008·009·010, FR-AD-001·002, AS-16
- **구현 사항**
  - [x] 원형 로테이션(Berger) 더블 라운드로빈 — 552/380/240경기, 46/38/30라운드 **(25일차 2팀 — `src/lib/sim/schedule/berger.ts`, 3개 티어 전건 검증 통과, 리터럴 24/20/16 0건)**
  - [x] 홈·원정 균형(각 N−1), 3연속 동일 장소 방지(불가피 시 경고 로그), 후반기 홈/원정 반전 **(25일차 2팀 — 3개 티어 모두 팀당 홈=원정=N−1 단언 통과, 최장 연속 동일 장소 스트릭 2로 3연속 미발생이라 경고 로그 경로는 사용되지 않음)**
    - **26일차 2팀 — 3연속 방지에 탐지 함수를 붙였다.** `detectVenueStreaks(teamIds, fixtures)`(순수 함수)가 대진표를 팀별 홈/원정 시퀀스로 펼쳐 3연속 이상 스트릭을 찾는다. 실전 규모(16/20/24팀) 전수 검증에서 **위반 0건**(최장 스트릭 2) — 서클법의 라운드 홀/짝 반전이 이를 구조적으로 보장한다. `berger.test.ts` 6케이스 추가
    - **`teamCount = 4`는 3연속 회피가 수학적으로 불가능하다** — 1차전이 3라운드뿐이라 6개 페어의 홈/원정을 어떻게 배치해도(2⁶ = 64가지) 최장 스트릭이 3 미만으로 내려가지 않는다. **팀장이 별도 전수탐색으로 재현해 확인**(달성 가능한 최장 스트릭 최솟값 = 3). 이 경우 대진표를 거부하지 않고 위반 목록을 반환한다
    - **경고를 `console.warn`으로 찍지 않고 반환값으로만 노출**한다 — `gk-fallback.ts`(14일차) 결정과 같은 근거로, 이 파일은 `console.*` 부작용 0건을 유지해 순수성(NFR-DT-001)을 지키고 시즌·리그 id를 아는 호출자가 로깅한다. 설계는 일관되나 **"불가피 시 경고 로그"라는 수락 기준 문구는 소비처가 생기기 전까지 실질 미충족**이다(현재 이 반환값을 쓰는 호출자가 없어 경고가 실제로 남는 곳이 없다) → **I-145**
    - `detectVenueStreaks`는 결번(bye) 라운드가 있는 입력에서 스트릭이 끊기는 해석인데 이 전제가 문서화돼 있지 않다. 리그 대진표는 홀수 팀에 예외를 던져 bye가 없지만, 컵 라운드처럼 결번이 있는 대진에 재사용하면 홈·(휴식)·홈·홈을 놓친다 → **I-146 (27일차 해소)**
      - **27일차 2팀 — JSDoc에 전제를 명시해 I-146 해소.** ⓐ 집계는 "연속 **경기**"가 아니라 "연속 **라운드**" 기준 ⓑ 결번은 스트릭을 **끊는다** ⓒ 결번이 있는 대진(컵·연기 경기)에 재사용하려면 "연속 경기" 해석이 별도로 필요하며 옵션 분기 여부는 I-107(브래킷 부전승)과 함께 검토. 로직 변경 없음. **2팀 1차 보고는 "대상 함수가 아직 존재하지 않음(컵/브래킷 미착수)"으로 보류였으나, 팀장이 이슈 원문과 대조해 대상이 이미 존재하는 `berger.ts:126`임을 확인하고 반려**했다
  - [x] 리그별 라운드 간격 75/90/115분(공통코드) 기반 킥오프 시각 산출, 최종 라운드 T+3,450분 강제 정렬 — **27일차 완료(2팀)**. `src/lib/sim/schedule/kickoff.ts`(신규) + `kickoff.test.ts`(10 tests). `berger.ts`의 라운드 번호에 킥오프 시각을 붙이는 순수 함수 계층이며, 간격(75/90/115분)과 REGULAR 페이즈 길이(3,450분)는 **전부 파라미터 주입**이라 숫자 리터럴 0건(NFR-CFG-001)
    - **최종 라운드 정렬은 강제(선형 스케일링)가 필요했다** — 자연 계산으로는 어긋난다(46R × 75분 = 3,375분 ≠ 3,450분). 1라운드를 오프셋에, 마지막 라운드를 정확히 T+`regularPhaseDurationMin`에 놓도록 라운드 간격을 선형 스케일링한다
    - **I-12 라운드 오프셋 적용** — `computeLeagueRoundOffsetsMin`이 최소 간격 ÷ 리그 수로 1라운드를 어긋나게 배치해 리그 간 공백을 줄인다. 리그 수는 입력 배열 길이에서 도출하므로 하드코딩이 없다(4리그 확장 시 그대로 동작)
  - [x] 시즌 페이즈 상태머신 `REGULAR ⇄ CUP_SLOT → PLAYOFF → (TIEBREAK) → SETTLEMENT → PRESEASON → REGULAR` (멱등 전이). **`TIEBREAK`는 승강 경계 동률 시에만 진입하는 조건부 페이즈**(D-27 / I-33, 6일차 `SeasonPhase`에 반영 완료) — 동률 판정 자체는 Task 026 소관이고 025가 026보다 먼저 끝나므로, **025는 동률 여부를 인자로 주입받는 순수 함수 인터페이스로 먼저 확정**한다 — **28일차 완료(2팀)**. `src/lib/sim/season/phase.ts`(신규) + `phase.test.ts`(12 tests). 이벤트→`{from,to}` 전이 테이블 기반 순수 함수 `transitionSeasonPhase(phase, event)`
    - **멱등은 "목표 페이즈면 no-op"으로 구현했다** — 이미 `to`에 도달해 있으면 그대로 반환하고, `from`도 `to`도 아니면 잘못된 전이로 예외를 던진다. 수락 기준 "동일 전이 2회 호출 시 1회 효과" 충족
    - **동률 판정은 주입이 아니라 이벤트 선택으로 분리**했다 — 호출자가 `ENTER_TIEBREAK`(→TIEBREAK→`RESOLVE_TIEBREAK`→SETTLEMENT)와 `COMPLETE_PLAYOFF`(→SETTLEMENT 직행) 중 맞는 것을 고른다. 026(동률 판정)이 나와도 이 모듈은 바뀌지 않는다
  - [x] 배속(0.25×~20×) 비례 재계산 및 정지/재개 오프셋 처리 — 동시 종료 정렬 유지 — **29일차 완료(2팀)**. `src/lib/sim/schedule/speed.ts`(신규) + `speed.test.ts`(10 tests). 배속 변경은 **비례(곱셈)** 재계산(`rescaleKickoffsForSpeedChange`), 정지/재개는 **오프셋(덧셈)** 재계산(`rescheduleKickoffsForPauseResume`)으로 분리했고 둘 다 "기준 시각 이전 킥오프는 불변" 규칙을 공유한다
    - **AS-16(동시 종료 정렬)은 리그 일괄 적용으로 보존된다** — `rescaleLeagueKickoffsForSpeedChange`/`rescheduleLeagueKickoffsForPauseResume`가 여러 리그에 동일 context/window를 적용하므로, `kickoff.ts`가 만든 리그 간 정렬이 재계산 후에도 **구조적으로** 유지된다(개별 리그를 따로 재계산하면 깨진다)
    - **월드시계 실시간↔월드분 적분 일반식(H-24)은 여기서 구현하지 않았다** — 이 모듈은 스케줄 재계산만 좁게 담당하고, 적분식은 30일차 인계 소관이다
  - [x] **월드시간↔실시간 환산 계약(H-24) — 30일차 완료(2팀), Task 025 종료.** `src/lib/sim/schedule/worldclock.ts`(신규) + `worldclock.test.ts`. 3요소 전부 구현: ⓐ 진행 중 경기 경과분 산출식 `worldMinutesAt`/`matchElapsedMinutesAt` — **순수 함수이며 "지금"은 호출자가 `now`로 주입**한다(이 파일에 `Date.now()` 호출 0건, NFR-DT-001) ⓑ 배속·정지 상태 구독 및 재동기화 신호 — `clockRevision` 비교 기반 `shouldResyncWorldClock`/`classifyWorldClockTransition` ⓒ 정지 구간 오프셋 규약 — `applyPause`/`applyResume`가 정지 구간을 동결하고 `pausedTotalMinutes`에 가산. `speed.ts`와 전이 시각 앵커를 공유한다(상수 export 정합)
    - **구독 메커니즘 자체는 포함하지 않는다** — `src/lib/sim/**`는 `react` import가 금지된 순수 계층이므로 React 훅·Realtime 구독·폴링 타이머는 5팀이 자기 계층에서 구현하고, 이 모듈의 순수 함수를 호출한다. 인계 문서 `docs/handoff/H-24-worldclock-realtime-contract.md`(35일차 Task 015에서 소비)
- **수락 기준**: 세 리그 최종 라운드 킥오프 차이 ≤ 30분. 동일 시드 재생성 시 대진표 100% 동일. 리터럴 `24/20/16` 0건(NFR-SC-003).
  - **[x] 30일차 실측 — 충족.** 최종 라운드 킥오프이 세 리그 전부 `2026-08-28T09:30:00.000Z`로 **완전 동일(드리프트 0분)**, 4리그 확장에서도 0분(기준 ≤ 30분). 동일 입력 재생성 `toEqual` 100% 동일. 검증 지점 `four-league-scale.test.ts:97`
- **테스트**: Vitest — 대진 완전성(모든 팀 쌍 홈·원정 각 1), 배속 변경 시 정렬 유지, 4리그 확장 설정 성공.
  - **[x] 30일차 완료(2팀)** — 대진 완전성·배속 정렬은 기존 테스트 유지, **4리그 확장은 신규** `src/lib/sim/schedule/four-league-scale.test.ts`(가상 4번째 리그 12팀·130분 간격 합성으로 NFR-SC-003 검증 — 리그 수를 리터럴로 갖지 않고 입력 배열 길이에서 도출함을 확인)

### Task 026: 경기 후처리·순위·타이브레이커를 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 6팀 DB·인프라팀(트랜잭션 경계)
- **일정**: 31일차 ~ 37일차 (2026-09-01 ~ 2026-09-09) / 추정 5.5인일 / 담당 2팀 시뮬레이션엔진팀 / **준크리티컬 · M-2 게이트**
- **근거**: FR-MT-010, FR-LG-004~006, FR-ST-001~005, NFR-PF-011, NFR-CR-002
- **구현 사항**
  - [~] 후처리 7종을 단일 트랜잭션으로 — 스코어 확정 / 순위 갱신 / 스탯 누적 / 컨디션·피로 / 부상 판정 / 카드·정지 / 정산 트리거 *(33일차 골격 완료 — `sim/postmatch/pipeline.ts`의 `POST_MATCH_STAGE_ORDER`가 순서 단일 소스, `executedStages` 런타임 트레이스로 순서 증명. **4종 실배선**(스코어 확정·스탯 누적·카드 정지·정산 트리거) / **3종 `implemented:false` 계약뿐**(순위 갱신·컨디션 피로·부상 판정 — 하위 모듈 부재, 실산식 착수 일차 미배정). 실패 시 throw 전파로 원자성 확보)*
  - [x] 실패 시 전체 롤백 + 최대 3회 재시도 + 알림, 재실행 멱등(중복 누적 0) *(34일차 — `runPostMatchPipelineWithRetry()` 기본 3회·첫 성공 즉시 반환, 전부 실패 시 throw 없이 `ok:false` + 알림 페이로드(발송은 오케스트레이션 계층). **실패 분기가 `PostMatchPipelineResult`의 어떤 필드도 담지 않는 유니온 타입**이라 "전체 롤백"이 구조적으로 강제된다. 멱등: `computePostMatchIdempotencyKey()` + 파이프라인 무상태성(매 호출 새 `Map`)으로 스탯 이중 누적 0. **단 이 키는 `fixtureId` 단독이라 Tier B 재시뮬레이션 구분자가 아니다 — I-171**)*
  - [x] 7단계 타이브레이커 — 승점 → 골득실 → 다득점 → 승자승 미니리그 → 다승 → 페어플레이 → 시드 추첨 *(35일차 — `sim/standing/tiebreak.ts` `resolveStandings()`, 재귀 그룹 분해로 각 단계는 직전까지 완전 동률인 그룹에서만 실행하고 갈리는 즉시 `tiebreakApplied`에 단계 번호 기록. 시드 추첨은 `rng/derive.ts`에 `LAYER_TAG.STANDING` 신설 + `deriveStandingDrawSeed()`, `nextIntBelow` 기반 Fisher–Yates. `MATCH_POINTS`는 파라미터 주입(I-83 패턴). **19개 테스트가 7단계를 각각 단독 결정 케이스로 덮음** — 3팀 이상 동률 미니리그 재계산·동률 그룹 밖 경기 필터링·**PRNG `state` 이어받기를 독립 재구현 Fisher–Yates와 대조**(5팀 이상으로 뽑아 우연 일치 배제) 포함. `precision.ts` 미경유는 적용 대상 아님 — 확률 임계 비교가 아니라 정수 인덱스 뽑기)*
  - [x] 승강 경계 동률 시 `competition_type = TIEBREAK` Fixture 자동 생성 *(36일차 — `src/lib/sim/standing/playoff-tiebreak.ts` `detectBoundaryTiebreaks()`, 테스트 9건. 경계 순위값은 리터럴화하지 않고 호출자가 `StandingBoundary[]`로 주입(NFR-CFG-001), 브랜드 ID는 발급하지 않고 `TiebreakFixtureDraft` 초안만 반환(`berger.ts`의 `BergerFixture`와 동일 패턴). **3팀 이상 동시 경계 동률의 다자 대진 규칙은 요구사항 미기재라 명시적 오류 처리 → I-189**)*
  - [x] 사전 집계 `standing` 테이블 갱신(라운드별 스냅샷), 경기 평점 산출(FR-ST-003) *(37일차 — `sim/standing/aggregate.ts`(신규) `advanceStandingRound()`(직전 스냅샷 + 이번 라운드 → `StandingBasis` 누적 → `resolveStandings()` 위임) · `buildStandingHistory()`(시즌 배치 재생·캐치업). `sim/standing/rating.ts`(신규) `computeMatchRating()` — 기본 6.0에서 스탯별 가중 가감 후 `[1.0,10.0]` 클램프. `tiebreak.ts`/`stats.ts`를 재사용하고 "누적"·"산식" 레이어만 신설. 테스트 50건 통과)*
    - `Standing.fairPlayScore`는 **카드→점수 변환 산식이 어느 문서에도 없어**(05:336에 필드만) 계산하지 않고 `homeFairPlayDelta`/`awayFairPlayDelta` 호출자 주입으로 열어 뒀다 → **I-194**
    - 오늘 평점에 실제 반영되는 건 **Tier A 16종뿐**이다. FR-ST-003 예시의 "키패스"·"실책-실점"은 Tier B라 폴드에 키가 없어 가중치가 있어도 자동으로 무시되며, Tier A 승격 시 `rating.ts` 수정 없이 활성화된다
    - ⚠️ **`RATING_WEIGHT` 공통코드 접점 결함 — 팀장 검증에서 적발·해소(I-192).** 2팀 파서는 `{base,min,max,field,gk}`+스탯 키, 3팀 `fallback.ts`는 `{FIELD,GK}`+`MatchEventType` 키로 **각자 초록불인 채 갈라져** 파서가 `null`을 반환, 엔진이 공통코드를 못 읽고 하드코딩 테이블로 **조용히 폴백**했다(I-187 해소 목적인 NFR-CFG-001이 무산되고 FR-ST-003 수용 기준 ④도 미충족인 무증상 상태). **stat-keyed로 통일** — FR-ST-003 예시 6개 중 "키패스"·"실책-실점"이 `MatchEventType` 23종으로 표현 불가하고 `PENALTY_SHOOTOUT`은 득실이 `detail`에만 있어 type으로 안 갈리기 때문(05문서 "이벤트별"은 I-58로 구속력 없음). 저장 형태는 `ConstantGroupValues`가 "그룹→**코드**→JSON object"를 강제해 flat이 불가하므로(`TS2322`, 3팀이 착수 전 재현해 보고) **`{FIELD, GK, SCALE:{base,min,max}}` 3코드**로 확정. **재발 방지로 접점 통합 테스트 2건 추가**(테스트 전용 import — 프로덕션 엔진은 `src/lib/config/**`에 비의존, I-83 유지)
    - **`loadConstants('RATING_WEIGHT')`를 실제 호출해 엔진에 주입하는 오케스트레이션 지점은 아직 미배정** — 파서·값·접점 테스트는 완비됐으나 수용 기준 ④의 종단 충족은 소비자(정산·크론) 등장 시점에 소유 팀 지정 필요
  - [x] 선수·팀 지표 풀세트 집계 및 이벤트 로그 기반 재계산 함수 (FR-ST-005) *(38일차 — `sim/stats/recompute.ts`(신규): `accumulateMatchStatsIntoSeason`(경기 1건 누적) · `accumulateSeasonStats`(배치 리듀스) · `foldPlayerStatsIntoTeams`(로스터 귀속) · `recomputePlayerSeasonStatsFromEventLogs`/`recomputeTeamSeasonStatsFromEventLogs`(FR-ST-005 본체). `match/stats.ts`의 `accumulatePlayerMatchStats()`와 `standing/aggregate.ts`의 누적↔재계산 분리 패턴을 **재사용**해 로직 재구현 0. 테스트 9건 — 수락 기준 "이벤트→스탯 재계산 일치"를 동일 입력(3경기 이벤트 로그)으로 **누적 경로 vs 재계산 경로 `toEqual` 동치**(선수·팀 각각) + **경기 순서를 뒤집어도 동일**(교환법칙)로 단언)*
    - "풀세트"는 **Tier A 16필드 한정**이다(Tier B 40필드는 라인업/detail 스키마 인계 대기 — `match/stats.ts` 기존 분류를 그대로 승계, 신규 이슈 아님). 팀 폴드의 `ownGoals`는 득점자 소속팀 귀속이라 `TeamSeasonStat.goalsAgainst`(상대 실점) 의미와 다르다는 점을 파일 헤더에 명시 — 실제 필드 매핑 시 참고
- **수락 기준**: 순위표 조회가 실시간 계산 없이 p95 ≤ 120ms 경로로 동작. 7단계 각각이 단독으로 순위를 가르는 시나리오 통과.
- **테스트**: [x] Vitest — 타이브레이커 7 시나리오, 멱등성(재처리 시 스탯 이중 누적 0), 이벤트→스탯 재계산 일치. *(39일차 보강 — `tiebreak.test.ts`에 4단계(미니리그) 재동률→5단계 **캐스케이드** 시나리오 및 `resolveStandings`/`groupStandingsBeforeSeedDraw` 재호출 멱등성(동일 결과 + 입력 불변), `aggregate.test.ts`에 `advanceStandingRound`/`buildStandingHistory` 멱등성(**6팀 크론 재시도 안전 근거**), `recompute.test.ts`에 선수·팀 재계산 멱등성 + `accumulateMatchStatsIntoSeason` 인자 불변성 추가)*
- **SP-3 엔진 반환 계약(H-15)**: [x] 39일차 — `src/lib/sim/postmatch/RETURN_CONTRACT.md`(신규). 6팀 크론(033)이 받는 것 / 3팀 정산(027·030)이 받는 것 / 멱등성 보장 요약표로 절 분리. **소비 시작은 40일차.** 표상 리뷰는 2·3·6팀이나 **6팀은 39일차 배정 행이 없어 미소환**해 문서 인계로 대체 — 40일차 6팀 착수 시 6팀 관점 검토 1회 필요

### Task 027: 플레이오프와 컵대회 넉아웃을 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 38일차 ~ 45일차 (2026-09-10 ~ 2026-09-21) / 추정 6.5인일 / 담당 2팀 시뮬레이션엔진팀
- **근거**: FR-LG-011~015, FR-EC-003·004, I-04
- **구현 사항**
  - [x] 리그1 플레이오프 10팀 9경기(WC 2 + 8강 4 + 4강 2 + 결승 1), 리그2 3경기, 리그3 1경기 — 40일차 `src/lib/sim/knockout/playoff.ts`, 라운드별 순수 함수 + 테스트 20케이스로 경기 수 실증. **4강 대진은 요구사항 미명세라 추론 채택(I-204)** / 시즌 페이즈 전환 배선은 미착수
  - [x] 컵대회 60팀 — bye 4, 1라운드 28경기, 총 6라운드 59경기 — 41일차 `src/lib/sim/knockout/cup.ts`(신규). 6라운드 체인(28+16+8+4+2+1=59)·시드 1~60 전량 소진·우승 1팀을 값으로 실증. 2라운드 이후는 `LAYER_TAG.CUP_DRAW` 기반 결정론 추첨이며 **"라운드마다 재추첨" 해석은 요구사항 미명세라 추론 채택(I-207, 1팀 판정 대기)** / 시즌 페이즈 전환 배선은 미착수(I-208)
  - [x] 컵 시딩 — 1라운드 리그1↔리그3 우선 매칭, 잔여 매칭 폴백 규칙 확정 후 I-04 해소 — 41일차, 전역 시드 1~60(리그1 1~24·리그2 25~44·리그3 45~60) 통합 후 D-24 우선순위(1↔3 → 1↔2 → 2↔3 → 동일 티어 교차)로 결정론 생성
  - [x] 홈 결정 규칙(하위 티어 홈 / 동일 티어는 낮은 순위 / 결승 중립지) 및 중립지 홈 어드밴티지 미적용 — 41~42일차, 컵은 **"홈 = 더 큰 시드" 한 규칙**으로 통일했다(전역 시드에서 더 큰 값 = 하위 티어이므로 요구와 자동 일치). **43일차 완료** — `cup.ts`의 지역 함수 `homeAwayOf`를 `seeding.ts`의 `decideCupHomeAway()`로 이관해 중복 제거하고, `NEUTRAL_HOME_ADVANTAGE_COEFFICIENT = 1.0` + `assertNeutralHomeAdvantage()`로 **결승 중립지 홈 계수 1.0 불변식을 값으로 증명**(테스트 6건 추가, `cup.ts` 동작 불변). ⚠️ **오늘 닫힌 것은 불변식이며, 비중립 경기의 홈 계수 _공식_ 은 여전히 `ability/modifiers.ts`의 `homeModifier` TODO 골격(항상 1.0, 미확정) — Task 027 잔여.** 이 2층 구분이 `playoff-tiebreak.ts` stale 주석의 원인이었다(I-219, 당일 해소)
  - [x] **(42일차 추가)** 컵 시딩 모듈 분리 — 41일차 `cup.ts`에 이미 D-24 시딩이 들어 있어 **중복 구현 대신 `knockout/seeding.ts`로 분리·일반화**(`seedCupRound1()` 순수 함수, byeSeeds+pairs 반환)하고 `cup.ts`가 import하도록 축소. 외부 소비자가 없어 breaking change 0. 28쌍 결정론·pools 재실행 동일성을 테스트로 실증. **FR-LG-015 "2라운드 이후 재추첨" 해석은 1팀이 42일차에 판정 완료(I-207 해소)**
  - [x] 정규시즌 라운드 6/12/18/24/32/40 직후 컵 슬롯 6회 삽입 — 슬롯 중 리그 킥오프 0건 — 44일차 `src/lib/sim/schedule/cup-slot.ts`(신규, 테스트 16건). 핵심은 **`shift(t) = t + duration × (마커 중 t 미만인 개수)` 공식이 모든 리그 킥오프가 슬롯 창 내부에 들어갈 수 없음을 수학적으로 보장**한다는 것 — 런타임 충돌 보정이 불필요하며 증명을 파일 헤더에 기재했다(`findCupSlotConflicts()`는 검증용). `CUP_PARAM.INSERT_ROUNDS`/`PHASE_DURATION_MIN.CUP_SLOT`은 주입값이라 리터럴 0건, NFR-DT-001 준수. **3리그 실규모(24/20/16팀) 조정 후 충돌 0건 실증**. ⚠️ **소비처 0건인 순수 계층이다** — `season/phase.ts`의 `ENTER_CUP_SLOT`/`EXIT_CUP_SLOT`(28일차) 발화 시각과 이 모듈의 슬롯 창(`startAt`/`endAt`)이 서로를 모르며, 접점은 오케스트레이션 계층 몫이라 **2팀 소관이 아니다(I-225 — 담당·일차 미배정)**. 계층 경계(브래킷 생성=`knockout/cup.ts` / 페이즈 전이=`season/phase.ts` / 시각 산출=`schedule/cup-slot.ts`)는 44일차에 양쪽 헤더 주석으로 고정
  - [x] 상금 지급(공통코드 `PLAYOFF_PRIZE`, `CUP_PRIZE`, 자이언트킬링 보너스) → 원장 기록 — 45일차 `src/lib/sim/knockout/prize.ts`(신규, 테스트 12건). `resolvePlayoffPrize`(FR-EC-003, tier×5성적)·`resolveCupPrize`(FR-EC-004, 7성적)·`resolveGiantKillingBonus`(티어차×100pt, 동률·역방향은 `null`) 3종 순수 함수. **반환은 `{amount, reasonCode}`뿐이고 실제 원장 기록(`PointTransaction`)은 3팀 `economy/ledger.ts`의 `postPointTransaction()`에 위임**한다(브랜드 값 생성은 이 파일 밖 — brand.ts 원칙). 공통코드는 파라미터 주입만 받고 `loadConstants()` 미호출(I-83), `PLAYOFF_PRIZE_DEFAULT`/`CUP_PRIZE_DEFAULT`는 FR-EC-003 10조합 전량을 채운 로컬 안전기본값이라 카탈로그 8코드 누락(I-190)과 무관하게 동작. NFR-DT-001 준수(`Math.random()`/`Date.now()`/`react`/`@supabase/*` 0건)
  - [x] 플레이오프 우승은 별도 트로피이며 승격 권한 없음 (FR-LG-014) — 45일차. `prize.ts`에 **승격·강등 계산 0건**이며 export 목록 자체가 근거다(승격 슬롯은 정규시즌 순위 Task 026 `standing/`으로만 결정, 플레이오프 결과는 상금·명예에만 영향). 완료 판정 "승격 팀 수 불변" 충족. 파일 헤더 18~21줄에 "이 파일에 승격 로직을 추가하지 말 것"을 명시해 고정
  - [x] **(46일차 추가)** 무승부 시 연장·승부차기 연결 통합 검증 — `src/lib/sim/knockout/knockout-resolution.test.ts`(신규 1개, 기존 파일 무수정). `penalty.ts`(실제 `simulatePenaltyShootout`)↔`playoff.ts`(`resolveKnockoutWinnerTeamId`)↔`cup.ts`(`resolveCupWinnerSeed`)가 그동안 **각자 손으로 채운 값으로만 단위검증**됐고 실제 체인으로 이어붙여진 적이 없어, 시드 40개 × 확률 프로필 5종(대칭·약우세·극단) = **200회 전건**으로 ⓐ PK 결과 → 공통 승자판정 무예외·승자 일치 ⓑ 실제 컵 대진(`generateCupRound1`) 3경기 표본의 시드 환산 일치 ⓒ `pkHome === pkAway`(무승부 잔존) **0건**을 값으로 증명. ⚠️ **다만 그 앞단은 여전히 공백이다** — 정규 90분/연장 120분 실스코어로 "연장이 필요한가"를 판정하는 생산 코드가 어디에도 없다(`tick.ts:77-84`가 상위 계층에 명시 위임했으나 그 계층이 없고, `includeExtraTime` 실소비처는 `odds/runner.ts:148` 고정 `false`와 `snapshot-pipeline.ts:186` `index % 4 === 0`뿐) → **I-230**, 소유팀·일차 미배정, I-214 해제 조건의 일부
- **수락 기준**: 컵 참가 60팀·59경기·우승 1팀. 무승부 발생 시 반드시 승자 확정. → **46일차 충족**(200회 전건 무승부 잔존 0건). 단 넉아웃 **오케스트레이터 부재로 "실경기 스코어 → 연장 진입" 경로는 미검증**(I-230)
- **테스트**: Vitest — 브래킷 구조 불변식, 연장·승부차기 시드 스냅샷, 컵 슬롯 중 리그 경기 0건. **47일차 완료** — `src/lib/sim/knockout/bracket-invariants.test.ts`(전 라운드 시드 중복 0건 · 탈락 시드 재등장 0건 · 승자 전략 3종 교차)와 `bracket-penalty-snapshot.test.ts` + `__snapshots__/`(실제 대진 × 결정론적 `matchSeed` 회귀 고정) 신설. 8 files / 120 tests 전건 통과로 **수락 기준 "브래킷 구조 불변식 전건 통과" 충족**. ⚠️ `homeModifier`(`ability/modifiers.ts`) 공식은 확정 D-\* 부재로 미착수 — 임의 공식 삽입은 NFR-CFG-001 위반 소지라 보류(**I-236**), Task 027 잔여
- **잔여**: 비중립 경기 홈 계수 공식(`ability/modifiers.ts`의 `homeModifier`, 항상 1.0인 TODO 골격) / 시즌 페이즈 전환 배선(I-208·I-225) / 넉아웃 오케스트레이터(I-230)

### Task 028: 시즌 정산·승강·성장·수상을 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀 / 지원: 3팀 데이터·밸런싱·배당팀(성장·수상 파라미터)
- **일정**: 46일차 ~ **55일차** (2026-09-22 ~ 2026-10-05) / 추정 6.5인일 / 담당 2팀 시뮬레이션엔진팀 — **53일차 정정**: 종료일이 53일차로 적혀 있었으나 단일 소스(`docs/team-schedule/02-시뮬레이션엔진팀.md`)는 54일차(시즌 아카이브·`season_number` 누적)·55일차(Vitest 3종 + 수락 기준 실측, **H-16 인계**) 행을 갖는다. 단일 소스 쪽이 옳다
- **근거**: FR-LG-006·007·016, FR-EC-002, FR-PL-011·012·015, FR-AW-001~003·005·006, NFR-PF-006
- **구현 사항**
  - [x] 순위 확정 → 승강 교환(리그1 22~24위 ↔ 리그2 1~3위 / 리그2 18~20위 ↔ 리그3 1~3위), 팀 수 24/20/16 불변 — **48일차 완료**(`src/lib/sim/season/promotion.ts`·`promotion.test.ts` 신규, 21케이스). `League.teamCount`/`promotionSlots`/`relegationSlots`를 **주입으로만** 읽어 24/20/16 리터럴 하드코딩 0건(NFR-CFG-001). **팀 수 불변은 예외로 구조적 강제** — 상위 강등 슬롯 ≠ 하위 승격 슬롯이면 교환이 비대칭이 되어 불변식이 깨지므로 아예 던진다(rank 연속성·슬롯합 초과도 방어). **`TeamSeason.leagueId` 실제 갱신은 이 파일 밖**이며 `PromotionSwap[]`만 반환한다(오케스트레이션 계층 몫, 헤더 명시). 팀장 검증에서 `promotion.test.ts` 타입 9건 지적 → 스프레드 순서 재정렬로 해소하며 **기존 브랜드 캐스트가 스프레드에 덮여 무효화되던 잠재 버그까지 함께 제거**(그대로였다면 `LeagueId`를 실제로는 검증하지 못한 채 통과하는 테스트였다)
  - [x] 리그3 15~16위 **리빌드 제재** — 페널티 3종 + 구제 2종(보조금 40%, 유소년 +10%p) — **49일차 완료**(`src/lib/sim/season/rebuild.ts`·`rebuild.test.ts` 신규, 14케이스). 순수 함수 `resolveRebuildSanctions()`가 페널티 3종(②협상 명성 −5 1회 · ③영구 명성 −3 · ①FR-EC-002 표는 표시만)과 구제 2종(④보조금 = 리그3 1위 포인트 × 40% · ⑤유소년 +10%p 1시즌)을 계산한다. **완료 판정 "최하위 강등 0건"은 구조적으로 자명**하다 — 강등·리그 탈락 로직을 아예 두지 않아 이 함수가 반환할 수 있는 값에 강등이 존재하지 않는다(런타임 검사가 아니라 타입 표면으로 차단). 대상 슬롯 수(2)는 `League`에도 `SANCTION_PARAM`에도 없어 **안전 기본값 없이 필수 파라미터**로 받는다(I-83·`tier-b-resim.ts` 선례). `SANCTION_PARAM` 4종(`REP_PENALTY_PERMANENT`/`REP_PENALTY_NEGOTIATION`/`GRANT_PCT`/`YOUTH_BONUS_PP`)은 I-83 패턴대로 파라미터 주입 + `REBUILD_SANCTION_PARAM_DEFAULT`(3/5/0.4/0.1) 폴백이며, 3팀 `config/fallback.ts` 카탈로그값과 **대조만 하고 import는 하지 않았다**(2팀 소유 경계 유지). ⚠️ 팀장 검증에서 `rebuild.test.ts` TS1117(객체 리터럴 중복 키) 1건 검출 → 2팀 재수정 완료. **테스트 통과가 타입 검증을 대신하지 못한다**는 사례로, vitest는 esbuild 트랜스폼만 하므로 `npm run typecheck`을 별도로 돌려야 한다
  - [x] 시즌 종료 순위 포인트 — 지수 1.8 곡선(L1 1500+1500 / L2 850+950 / L3 400+600) 원장 지급 — 50일차 `src/lib/sim/season/prize.ts`. `resolveLeagueFinishPrizes(entry, table?)`가 리그 전 팀(승격/강등 구분 없이 전 순위)에 대해 `{teamId, leagueId, finalRank, award:{amount, reasonCode:'LEAGUE_FINISH'}}`를 반환하며, **반환 배열 길이가 항상 `league.teamCount`와 일치**하는 것이 수락 기준 "원장 기록 누락 0"의 근거다(완전성 테스트로 단언). 상수는 I-83 패턴대로 `LEAGUE_FINISH_POINT_DEFAULT` 안전 기본값을 쓰고 `loadConstants()`를 직접 호출하지 않는다. tier·순위 완전성 위반은 `RangeError`/`Error`. ⚠️ **`src/lib/economy/salary.ts`(3팀, 22일차)에 같은 공식이 이미 원장 연동까지 구현돼 있다 — I-257로 통합 판정 대기이며, 실지급 배선 전에 결론이 나야 한다**(현재 양쪽 모두 프로덕션 호출자 0건). FR-EC-002 원문 표는 공식 재계산 대비 **5구간(L1 rank5·7, L2 rank11·13·16)에서 ±1 불일치**가 있어 테스트는 ±1 허용 오차로 전 구간을 검증한다
  - [x] 능력치 성장·하락 보정 — 나이대 계수 4구간, PA 초과 금지, 시즌 변동 ±6 이내 — **51일차 완료**(`src/lib/sim/season/growth.ts`·`growth.test.ts` 신규). `applySeasonAttributeGrowth()`(배치 API, H-16 인계 대비)가 나이대 4구간(≤21/22~29/30~33/≥34, 경계는 `world.ts` 시장가치 배율 재사용) 계수 + 진테 ±2 → **±6 클램프**로 속성별 델타를 산출하고, OVR 재계산 후 **PA 초과 시 최대 성장 속성부터 1씩 되돌려** OVR ≤ PA를 전건 보장(다시즌 반복·GK 6속성 분리·결정론 재현 테스트로 고정). ⚠️ OVR(`ovrCached`) 산출식이 `world.ts`에만 있어 재구현 — **I-262로 통합 판정 대기**(I-257 계열, `sim→mock` import 불가라 순수 계층 단일 소스 유력)
  - [x] 명성 갱신(선수·팀), 은퇴 판정(34세부터 확률 상승, 40세 강제) — **52일차 완료**(`src/lib/sim/season/retire.ts`·`retire.test.ts` 신규). `resolveSeasonRetirements`가 은퇴 결정만 반환(영속화는 오케스트레이션 — `promotion.ts` 선례). **"40세 이상 0명"은 구조적 강제** — 40세 강제 은퇴를 확률 분기가 아닌 무조건 분기(PRNG 미소비)로 두어 어떤 확률로도 40세가 남을 수 없다(`retire.test.ts`가 40/41/55세 FORCE_AGE + `age≥FORCE_AGE && !willRetire` 실패 조건으로 단언). 34세부터 나이·OVR하락·저출전 3축 확률 상승(`precision.ts` 6자리 정수 경유). 명성 갱신은 순수 산술(PRNG 미사용), `fanBase`는 정규화 기준 부재로 입력 제외. ⚠️ 세부 확률·명성 계수가 공통코드 미등록이라 자체 기본값 — **I-265**(I-121·I-136 계열, 031b 실값 정렬)
  - [x] 수상 — 리그별 개인 수상, 월드 통합 수상, 대회 수상, 베스트11, 클럽 트로피 — **53일차 완료**(`src/lib/sim/season/awards.ts`·`awards.test.ts` 신규, 25케이스). `AwardType`(E-31) 12종 중 11종을 5개 범주로 구현하고 **`PLAYER_OF_THE_ROUND`만 명시 제외**(라운드 단위 시상이라 시즌 정산이 아니라 라운드 파이프라인 소관). **완료 판정 "득점왕 집계에 PK 0건"은 런타임 차감이 아니라 입력 타입의 불변식으로 성립**한다 — `resolveLeagueGoldenBoot()`가 `PlayerSeasonStat.goals`만 읽고, 그 필드는 T16/T17에 의해 승부차기 득점을 **구조적으로 담을 수 없다**(PSO는 `Fixture.pkHome`/`pkAway`로만 반영되고 집계 파이프라인에 재입력되지 않는다). `penaltiesScored`가 아무리 커도 순위가 흔들리지 않음을 테스트로 고정했다. ⚠️ **정규 PK 득점(`PENALTY_SCORED`)은 D-19 ④에 따라 `goals`에 정상 합산되므로 빼면 안 된다** — D-19가 배제하는 것은 승부차기(PSO)뿐이라는 구분이 파일 헤더에 기록돼 있다. 정렬은 전부 `rng/sort.ts`의 `stableSortBy`, 동률은 최종적으로 player id까지 내려가 해소(결정론). `MANAGER_OF_SEASON`의 `performanceScore`(기대 대비 성과)는 프리시즌 예측치 등 엔진 밖 입력이 필요해 **계산하지 않고 호출자 주입값으로 받는다**(주입 인터페이스만 마련 — 산출 주체는 오케스트레이션 계층에서 별도 판정). ⚠️ `AWARD_PARAM_DEFAULT` 3종(`BEST_YOUNG_MAX_AGE`·`LEAGUE_TIER_WEIGHT`·`TEAM_OF_SEASON_FORMATION`)이 공통코드 미등록이라 I-83 자체 기본값 — **I-268**(I-121·I-136·I-265 계열 4회차, 031b 한 패스)
  - [x] 시즌 아카이브 확정 및 `season_number` 누적 — **54일차 완료**(`src/lib/sim/season/archive.ts`·`archive.test.ts` 신규, 15케이스). 3함수로 스코프 분리: `archiveSeason()`이 `SETTLEMENT` 단계·`endedAt` 확정·`seasonId` 일치·`finalRank` 확정을 검증한 뒤 `Season`+`TeamSeason[]`을 불변 `SeasonArchive`로 봉인하고 **값을 다시 계산하지 않는다**(`promotion.ts`가 순위를 재산정하지 않는 태도와 동일 — 영속화는 오케스트레이션 계층 몫). `computeNextSeasonNumber()`는 히스토리 최댓값+1만 반환하며 **중복·비정수·0 이하가 섞이면 조용히 이어 붙이지 않고 예외**를 던진다(손상된 히스토리를 못 본 척 잇는 것 자체가 "감지되지 않은 리셋"이기 때문). `assertNoWorldReset()`은 `World.id`/`worldSeed` 유지 + `currentSeasonNumber` 증가만 통과시키는 **I-13 최종 방어선**이다. 신규 도메인 타입 선언 0건(`Season`/`TeamSeason`/`World` 재사용, `@/types` 배럴), NFR-DT-001 위반 0건(팀장이 `Math.random`/`Date.now`/`react`/`@supabase` 전수 grep — 전 히트가 주석). 아카이브 시각은 이 파일이 만들지 않고 호출자가 확정한 `season.endedAt`을 그대로 쓴다
  - [x] **롤오버 통합 검증 — 55일차 완료**(`src/lib/sim/season/season-rollover.test.ts` 신규 626줄, **프로덕션 코드 변경 0줄**). 위 6개 모듈(`growth`→`retire`→`promotion`→`archive`+`computeNextSeasonNumber`+`assertNoWorldReset`)을 실제 조립한 하네스로 3종을 단언한다: ① **결정론** — 동일 시드 2회 독립 실행의 3시즌 스냅샷이 `toEqual` 완전 일치 ② **10시즌 구조 불변식** — 리그별 팀 수·경기 수(n×(n−1))·선수 수·활성 계약 1:1 정합·**40세 이상 0명**·승강 슬롯 대칭·`assertNoWorldReset` 전 시즌 통과 ③ **20시즌 OVR 곡선** — `PRIME(22~29) > YOUTH`, `PRIME > DECLINE`, `DECLINE > VETERAN`, `PRIME === max(4구간)` 종형. 리그 순위는 "성장 반영 후 스쿼드 평균 OVR" **결정론적 프록시**를 쓴다(매치엔진은 이 Task 스코프 밖). `performance.now()`는 벤치 측정 전용이며 시뮬 로직에 미사용(NFR-DT-001 유지)
- **수락 기준**: 시즌 종료 처리 ≤ 20초(60팀 ≈1,700선수). 20시즌 시뮬에서 평균 OVR 곡선이 22~29세 피크 종형. → **55일차 충족**(시즌당 실측 수 ms, 종형 4구간 단언 통과). ⚠️ 단 실측은 **축소 스케일**(6팀×3티어 / 288선수)이며 실 구성 24/20/16 규모 재측정은 3팀 생성기(H-16) 시점으로 이월 — **I-278**
- **테스트**: Vitest — 시즌 스냅샷 3시즌 일치, 구조 불변식 10시즌(팀 수·40세 이상 0명·OVR ≤ PA), 승강 후 팀 수 불변. → **55일차 전건 구현·통과**(`vitest run src/lib/sim` 51 files / 805 tests, 회귀 0)
- **⚑ H-16 인계 (→ 3팀 프리시즌)**: 정산 진입점 조립 순서는 위 ①에서 실증됐다. 단 **3가지는 테스트의 의도적 단순화라 프리시즌 구현 시 재설계 필요** — (1) 리그 순위는 실경기 결과가 필요(현재 OVR 프록시) (2) 은퇴 선수 보충은 테스트 자체 합성 생성기이며 실제 신인 생성은 3팀 `mock/world.ts` 소관 (3) **"나이 증분은 시즌 시작 시 먼저 일어난다"는 이 테스트가 정한 컨벤션일 뿐**이고 실제 시점(프리시즌 vs 시즌 종료)은 3팀이 확정해야 한다. 계약 갱신/만료 정책도 미구현(단순 유지) — 프리시즌 설계 대상

### Task 029: 포인트 경제·스폰서·재정 시스템을 구현한다

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀(회계 항등식) / **소급분(구단주 축) 선행: 1팀**(`ClubOwner` 타입)
- **일정**: 20일차 ~ 26일차 (2026-08-17 ~ 2026-08-25) / 추정 5.5인일 / 담당 3팀 데이터·밸런싱·배당팀 / **+ 소급 48일차 ~ 49일차 (2026-09-24 ~ 2026-09-25) / 추정 1.6인일 / 담당 3팀 데이터·밸런싱·배당팀** — D-35 구단주 축(`sponsor.ts`) 및 Mock 실값(`avgRating`·`ClubOwner` 60명·`SponsorContract`) + `MockDataSource` 신규 3종. **I-231(스폰서 계약 mock 0건) 해소를 같은 묶음에 포함**하며(D-33 경로 ②), **I-229(라인업·평점 어댑터 `return []`)는 이어지는 50~51일차 1.5인일**로 배치했다(5팀 018과 무관해 분리 가능)
- **근거**: FR-EC-001·005~012, FR-TM-002·008, NFR-QA-005, KPI-9, DC-08
- **구현 사항**
  - [x] 포인트 원장(`point_transaction`) — 모든 잔고 변동은 원장 레코드 필수, 잔고는 원장의 파생값 — **20일차 완료**(`src/lib/economy/ledger.ts`, `ledger.test.ts` 신규). **`postPointTransaction(currentBalance, input)` 단일 진입점만 잔고 변동을 만들고 항상 `PointTransaction` 레코드 + `balanceAfter`를 함께 반환한다 — 잔고를 직접 바꾸는 함수를 아예 만들지 않아 "원장 없는 잔고 변동 0건"을 구조적으로 강제**했다(런타임 검사가 아니라 API 표면으로 차단). `deriveBalance(transactions)`로 원장 합 = 잔고 항등식(NFR-QA-005)을 검증하고, DC-08(정수 고정) 위반 시 `NonIntegerPointsError`를 던진다. `PointTransaction`/`PointTransactionId`/`PointTransactionOwnerType`/`PointTransactionReasonCode`는 1팀 동결 타입을 `@/types` 배럴로 재사용(재선언 0건, C-5·C-6 준수). ID·Timestamp는 내부 생성이 아니라 **호출자 주입**(`crypto.randomUUID`/`Date.now` 미사용, NFR-DT-001 관례). 테스트 7케이스 통과, `tsc --noEmit`·`eslint` 0 error. **영속화(DB 반영)는 6팀 DataSource 경계 너머이며 아직 배선 없음**
  - [x] 몸값 공식(OVR·나이·잠재·명성·계약·티어), 하한 100pt 보장 — **21일차 완료**(`src/lib/economy/valuation.ts`, `valuation.test.ts` 신규). `calculateMarketValue()`가 20일차 `ledger.ts` 관례(DC-08 정수 고정, `@/types` 배럴)와 2팀 `tactics.ts`의 `options?.table ?? loadConstants(group)` 패턴을 승계한다. 테스트 13케이스, 전체 689 통과(회귀 0), `tsc`·`eslint` 0 error
    - **공통코드 처리**: `MARKET_VALUE_PARAM` 중 `OVR_DIVISOR`/`OVR_EXP`/`POT_STEP`/`REP_BASE`/`REP_STEP`/`FLOOR` 6개는 `fallback.ts`에 안전 기본값이 있어 그대로 쓰고, `AGE_*`/`CONTRACT_*`/`TIER_*`는 **05문서 원본부터 구체 숫자가 없어 폴백도 비어 있으므로**(억측 금지) 키 부재 시 중립값(배율 1)으로 처리한다. 새 키 이름은 이 파일이 처음 정한 것이라 36일차 시드와 정렬 필요 → **I-121**(20일차 I-118과 같은 패턴의 2회차라 구조적 문제로 승격)
    - **수락 기준 "최저 몸값 ≥ 100pt"는 구조적으로 보장**한다 — 하한을 `Math.max(rounded, floor)`로 **배율 로직과 완전히 분리된 마지막 줄**에 두어 어떤 배율 조합으로도 뚫리지 않고, `ovr` 음수 입력 시 `NaN` 전파로 하한이 무력화되는 것을 `Math.max(0, ovr)`로 막았다. 최악 입력 조합(음수 OVR·명성·계약, OVR 0, 미정의 티어) 전수를 테스트로 고정
    - 반올림은 `Math.round` — floor/ceil은 계통적 편향이 생기고 DC-08은 방향을 지정하지 않는다. `OVR_DIVISOR`가 이름과 달리 곱셈 스케일로 쓰이는 이름-용법 불일치 → I-122
  - [x] 급여(몸값 × 비율 0.18) 차감, 성과 분배, 스폰서 수입 — **22일차 완료**(`src/lib/economy/salary.ts`, `salary.test.ts` 신규, 신규 15케이스 포함 economy 35케이스 통과). 20~21일차 `ledger.ts`·`valuation.ts` 관례(순수 함수, DC-08 정수 고정, `@/types` 배럴, `options?.table ?? loadConstants(group)`) 승계
    - **수락 기준 "급여 이중 차감 0건"은 구조적으로 보장**한다 — 별도 "이미 지급함" 플래그를 만들지 않고, `postSalaryPayment`가 매 호출 시 원장(`existingTransactions`)을 스캔해 `reasonCode: 'WAGE'` + `refType: 'Contract'` + `refId: contract.id` + `seasonId`가 모두 일치하는 레코드가 있으면 `DuplicateSalaryPaymentError`를 던진다. **원장이 유일한 근거**라는 20일차 `ledger.ts` 단일 소스 원칙의 연장이며, 상태 플래그를 추가했다면 원장과 이중 소스가 됐을 지점이다
    - 성과 분배는 `LEAGUE_FINISH_POINT`(BASE/RANGE/EXP)를 "1등=BASE+RANGE, 꼴찌=BASE, 사이는 EXP로 휘는 곡선"으로 해석해 `progress = (teamCount − rank)/max(1, teamCount − 1)`를 EXP 지수로 휜다. `teamCount ≤ 1` 분모 0과 범위 밖 `rank`를 clamp로 방어(`valuation.ts`의 구조적 불변식 방어와 동일 성격)
    - 스폰서 수입은 **zero-sum 2건 기록** — 팀 잔고 +, 스폰서 잔고 − 를 같은 `refType: 'SponsorContract'`/`refId`로 함께 남긴다. 팀 한 건만 기록하면 NFR-QA-005(원장 합 = 잔고)가 스폰서 쪽에서 깨진다
  - [x] 스폰서 엔티티·계약(팀당 최대 3슬롯, 1~10시즌), 명성 비례 제안 금액 — **23일차 완료(3팀)**(`src/lib/economy/sponsor.ts`, `sponsor.test.ts` 신규, 8케이스). `proposeSponsorContract()`가 ⓐ 팀당 활성 계약 **≤ 3 위반 시 `SponsorSlotLimitExceededError`**(수락 기준을 예외로 강제, 테스트로 고정) ⓑ 계약 기간 **1~10시즌 클램프** ⓒ 명성(`Team.reputation`)×스폰서 규모 비례 `incomePerSeason`을 산출한다. **Sponsor 엔티티 자체는 19일차 `mock/world.ts`에 이미 있어 재작성하지 않았다**. 20~22일차 `ledger.ts`/`valuation.ts` 관례(DC-08 정수 고정, `@/types` 배럴 import) 승계
    - 제안 금액 계수 `INCOME_BASE`/`INCOME_REP_STEP`이 05문서·`fallback.ts` 어디에도 없어 **이 파일이 처음 정의**했다(`valuation.ts`의 `AGE_STEP_PCT`, 20일차 `ABILITY_MULT`와 같은 계열) → **I-136**, 36일차(031a) 시드 정리 시 실값 정렬
    - **49일차 소급 마무리(3팀) — 부도 위험 배지 픽스처, I-231 종결 확인**: 49일차 착수 시 팀 일정표가 지시한 ⓓⓔ(`SponsorContract` 생성 · 팀당 ACTIVE ≤ 3 · `signedByOwnerId` · `proposeSponsorContract()` 구단주 축 반영)는 **48일차 `d06c213`에서 이미 완료**돼 있었고 **I-231도 그 시점에 실질 종결**이었음을 3팀이 착수 전 실체 확인(`sponsor.ts`의 `owner*Multiplier` 3종·`world.ts`의 `generateSponsorContractsForTeam` 존재)으로 판정했다 — **중복 구현하지 않고 유일한 미반영 델타만 처리**했다. 델타는 **부도 위험 배지가 실제로 점등되는 구성**: `generateSponsors()`에서 첫 스폰서(`i===0`)의 balance를 **RNG 추가 소비 없이 순수 후처리로** 음수화(`rawBalance*0.05`, 최소 200)해 결정론(NFR-DT-001)을 깨지 않았고, `bankruptAtSeason`은 null로 유지해 **"부도 위험"과 "확정 부도"를 구분**했다. `world.test.ts` 회귀 1건 추가, `accounting-identity.test.ts` 8/8 **무변경 통과**(NFR-QA-005·KPI-8 밴드 유지). ⚠️ 팀 일정표가 이미 끝난 작업을 재지시한 것은 **48일차 소급분이 `docs/team-schedule/`에 역반영되지 않은 드리프트**다(**I-245**, I-240과 함께 동기화 패스에서 처리)
  - [x] **`src/i18n/messages/{ko,en}/enums.ts` 실값 기입 — 23일차 완료(3팀)**. 4팀 Task 011 골격(22일차 종료)에 H-10 확정 표시명으로 **7그룹 66리터럴**(포지션 11·이벤트 23·부상 4·전술 6·페이즈 6·수상 12·마켓 상태 4)을 ko/en 양쪽 기입. ko는 그룹별 `const`, en은 ko에서 유도한 `EnumsMessages` 리터럴이라 **키 대칭을 tsc가 강제**(누락=TS2741, 초과=TS2353)한다. 추가로 `enums.test.ts`(17케이스)로 그룹·키 대조 + **빈 문자열 없음**을 고정했다 — 후자는 타입이 잡지 못하는 "값 미기입"을 잡는다
    - H-10 문서의 **70리터럴 중 66만** 채워졌다. `AwardScope`(4종, §6-1) 그룹이 **4팀 스캐폴드에 통째로 없어** 값을 넣을 자리가 없었고, 구조는 4팀 소관이라 3팀이 임의 추가하지 않고 넘겼다(절차 정확) → **I-135**, Task 019 착수 전 4팀 조치 필요
      - **I-135 해소 — 24일차(4팀)**: ko/en 양쪽에 `awardScope` 그룹 골격 4종 추가, `enums.test.ts`의 `EXPECTED_LITERAL_COUNT` **66 → 70**으로 갱신(H-10 문서치와 일치). 값은 19일차 골격 관례대로 **enum 리터럴 echo 자리표시자**이며 4팀이 임의로 채우지 않았다 — **실값 기입은 3팀 몫으로 남아 있다**(25일차 이후 가능)
  - [x] 스폰서 부도 판정 및 관련 계약 일괄 `VOIDED` + 뉴스 피드 노출 — **24일차 완료(3팀)**(`sponsor.ts`의 `judgeSponsorBankruptcy`, `sponsor.test.ts` 4케이스 추가). `Sponsor.balance < 0`을 부도로 판정하되 새 임계 파라미터를 만들지 않았다 — `economy.ts`의 `Sponsor.balance` 타입 주석("음수면 부도 상태")과 `DataSource.ts`의 `getSponsors` 주석이 이미 같은 판정을 전제하고 있어 그것을 한 곳에 모은 것이다. 확정 시 그 스폰서의 **`ACTIVE` 계약 전부**를 `VOIDED`로 전환하고 `SPONSOR_BANKRUPT`(E-26, 기존 타입) 뉴스 피드 아이템 1건을 만든다
    - **`EXPIRED`/이미 `VOIDED`인 계약은 대상에서 제외**한다 — 만료 계약까지 덮어쓰면 "왜 만료된 계약이 부도 시점에 VOIDED로 바뀌었나"라는 이력 왜곡이 생긴다(`proposeSponsorContract`가 슬롯 카운트에서 둘을 제외하는 것과 같은 "ACTIVE만 유효 상태" 전제). 부도는 **스폰서 축 전역**이라 여러 팀에 걸친 계약이 한 번에 대상이 될 수 있어 호출자가 `sponsorId`로 스캔한 전체를 넘긴다
    - **중복 판정은 예외가 아니라 `null` 반환**이다 — `bankruptAtSeason`이 이미 채워졌으면 아무것도 하지 않는다. `salary.ts`의 `DuplicateSalaryPaymentError`와 갈린 지점으로, 이중 지급은 잘못된 *시도*라 에러지만 이미 부도난 스폰서를 다시 조회하는 것은 정상 흐름이다. 잔고는 건드리지 않는다(변경 경로는 `ledger.ts` 단일 소스 원칙 유지)
  - [x] 재정 위기 상태 — 음수 잔고 팀의 프리시즌 강제 매각 트리거 — **25일차 완료(3팀)**(`src/lib/economy/crisis.ts`, `crisis.test.ts` 신규 9케이스). `detectNegativeBalanceTeams()`(수락 기준 "음수 잔고 팀 탐지")와 `judgeFinancialCrisis()`(FR-EC-012)로 구성한 순수 판정 함수다. 프리시즌 진입 시점 잔고로 **매 시즌 재판정**하며 — 음수면 위기 진입/지속으로 `crisisConsecutiveSeasons`를 1 늘리고 `forcedSaleTriggered: true`, 0 이상이면 즉시 회복으로 플래그·연속 카운트를 0으로 리셋한다. **부도(`judgeSponsorBankruptcy`)가 영구 상태인 것과 갈린 지점**으로, FR-EC-012 원문이 "프리시즌에 진입하면"이라 매 시즌 판정이 맞다. 잔고는 읽기만 하며 변경 경로는 `ledger.ts` 단일 소스 원칙을 유지한다
    - **실제 강제 매각(FR-TR-008) 실행은 Task 030(프리시즌 5단계)에 위임**한다 — 매각 리스트 순차 매각·매수자 없을 시 방출은 스쿼드·이적 시장을 알아야 하고 `src/lib/preseason/`은 아직 빈 디렉터리다. 오늘 파일은 트리거 판정까지만 담는다
    - **FR-EC-012 "2시즌 연속 위기 시 명성 −5"의 반복 차감 여부가 원문에 없다** — 연속 카운트가 정확히 2인 시즌 **1회만** 차감으로 해석했다(무제한 누적 시 `reputation` 하한을 빠르게 바닥내 명성 비례인 스폰서 제안액에 과도한 연쇄 효과). **확정 결정이 아니므로 030 착수 전 재확인 필요**
    - 강제 매각 뉴스 피드 노출(FR-TR-008 수락 ③)은 `NewsFeedItemType` 동결 10종에 전용 타입이 없어 **030에서 기존 `'TRANSFER'` 타입 재사용을 제안**한다 — 실제 매각이 일어나는 시점에 표현하는 것이 자연스럽다
  - [x] **Vitest 검증 — 26일차 완료(3팀), Task 029 종료.** `src/lib/economy/accounting-identity.test.ts` 신규(8케이스). 팀 60·스폰서 45·3시즌 시뮬로 **회계 항등식 5종 + DC-08 정수 + 전역 zero-sum**을 검증해 **오차 0**. `npx vitest run src/lib/economy` 6 files / 64 tests 통과, 전체 리포 **982 passed**, `tsc --noEmit`·lint 클린
    - **KPI-8 부도율은 계약 밀도 가정에 좌우된다는 것이 오늘 실측으로 드러났다.** 동일한 60/45 스케일에서 "팀당 스폰서 계약 1건" 가정은 **2.22%**(1/45), 스폰서 1/3을 팀 3곳과 동시계약시킨 구성은 **13.33%**로 갈렸다. 전자는 잔고와 지출이 같은 배수로 움직여 부도가 구조적으로 나기 어려워 **"통과했지만 아무것도 검증하지 않은"** 상태였다(3팀 자체 진단). 팀장이 두 구성의 병합을 지시해 최종본은 **다중계약 33.3%(15/45) 구성에서 부도 3/45 = 6.67%**(밴드 ≤15% 통과, 3회 재실행 동일치)로 고정했고, 부도율과 함께 다중계약 비율을 로그로 출력해 이후 누구든 조건을 확인할 수 있게 했다
    - 따라서 이 통과는 **조건부**다 — 실제 스폰서 배정 로직(Task 030, 54~62일차)이 확정되면 그 계약 밀도로 재측정해야 한다. `sponsor.ts`의 `INCOME_BASE`/`INCOME_REP_STEP`(23일차 임시값, I-136)도 KPI-8에 직결돼 36일차 실값 정렬 후 재검증이 필요하다 → **I-149**
    - 공허한 통과 방지 가드가 **레코드 존재(`length > 0`)만 있고 금액 부호 검증이 없어**, zero-sum 그룹핑이 버그로 빈 그룹만 만들어도(예: `refId` 오타) 자명 통과할 수 있었다. 팀장 지적 → 최종본은 **양쪽 부호를 모두 확인**한다(수입 > 0 · 분배 < 0, 이적 지출 < 0 · 수입 > 0). "존재 확인"과 "부호 확인"은 서로 다른 실패 모드를 막으므로 둘 다 둔다
    - 결정론은 `@/lib/sim/rng/prng`를 재사용한다(시드 `20_260_825`). `src/lib/economy/`는 NFR-DT-001 강제 범위(`src/lib/sim/**`) 밖이라 의무는 아니지만, 임의의 `i % N` 산술은 생성 로직이 조금만 바뀌어도 우연히 같은 패턴이 반복돼(짝수 인덱스 편중 등) 시뮬레이션 다양성을 과소평가하기 쉽다는 판단이다
  - [x] **소급(48일차, D-35 / I-239) — `proposeSponsorContract()`에 구단주 축 추가. 48일차 완료.** **회계 항등식 무변경 확인** — `src/lib/economy` **64 tests가 손대지 않고 통과**(26일차 검증분 보존, D-35 결정②가 지켜졌다는 증거). 함께 **I-231 해소**(`mock/world.ts`가 `proposeSponsorContract`를 호출해 팀당 ACTIVE ≤ 3 계약을 실제 생성, `getSponsorContracts`/`getTeamSponsorContracts`가 파라미터 반영 — 이전엔 무조건 `[]`)와 **I-229 부분 해소**(`getPlayerRecentMatchStats` 실값화 + 허위 주석 정정). 원 지시: 계약 주체가 `ClubOwner`로 바뀌므로 `owner` 인자를 받아 제안 금액·`sharePct` 산출에 `wealth`·`negotiation`·`reputation`을 반영하고 `signedByOwnerId`를 채운다. **신규 계수는 05문서에 근거 수치가 없어 억측하지 않고 키 부재 시 중립값(배율 1)** — `valuation.ts`의 `AGE_*` 선례를 따르며 Task 031b 실값 정렬 대상(I-136 계열)에 넣는다. ⚠️ **돈 흐름은 건드리지 않는다** — `teamId`(수입 귀속처) 유지, `PointTransactionOwnerType` 무변경, `judgeSponsorBankruptcy` 무변경. **아래 수락 기준의 회계 항등식은 재실행으로 무변경 확인**한다
- **수락 기준**: 3시즌 시뮬에서 회계 항등식 오차 0 (수입 − 지출 = 잔고 변화). 이적료·스폰서 분배 zero-sum. — **26일차 충족**
- **테스트**: Vitest — 회계 항등식 5종(NFR-QA-005), 스폰서 부도율 ≤ 15% 밴드(KPI-8). — **26일차 충족(조건부, 위 I-149)**
- **V-02 판정(26일차, 3팀)**: **통과(PASS)**. 측정 대상은 `src/lib/odds/`가 아직 없어(27일차 착수) 현시점 가장 무거운 실제 엔진 경로인 `snapshot-pipeline.ts`의 `computeMatchSnapshotEntry`이며, SHA-256 다이제스트 2회를 포함해 실제 배당 산출기보다 무거우므로 **보수적 상한**이다. 워밍업 100회 후 N=3,000 반복, **3회 실측 avgMs 0.5022 / 0.4920 / 0.4957 → 평균 약 0.497ms**로 **기준 3.3ms 대비 약 6.6배 여유**. `I-08`/V-02가 전제한 "풀엔진 50ms"는 16일차에 정한 **수락 상한(설계 목표치)이었지 실측치가 아니었다** — 실제는 약 100배 빠르다. 따라서 **몬테카를로용 경량 모델이 불필요하고 풀 엔진을 그대로 재사용**할 수 있으며, **Task 035는 계획대로 착수 가능**하다. 리포트·재현 명령은 `docs/team-schedule/outputs/03-데이터밸런싱배당팀.md` 26일차 절
  - ⚠️ **기록 정정(26일차 마감 후)**: 팀장이 최초에 `콜당 0.033ms · 기준의 1/100`으로 적었으나 이는 **중복 기동된 다른 인스턴스가 별도 조건(2팀 perf-bench 200경기 p95 0.229ms, MC_N_MATCH=3,000 연속 실행)으로 잰 값**이었다. 리포트에 커밋된 재현 가능한 실측은 **0.497ms**이며 여유폭이 약 15배 차이 난다. **판정(PASS)과 결론(경량 모델 불필요)은 어느 쪽으로도 동일**하지만, 기록은 재현 명령이 있는 보수적 수치를 정본으로 삼는다. 3팀 제보로 정정

### Task 030: 프리시즌 10단계 처리를 구현한다

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀 / 지원: 2팀 시뮬레이션엔진팀(엔진 호출) / **9단계 구단주 경유 선행: 1팀**(`ClubOwner` 타입, 48일차)·**3팀 자체**(`sponsor.ts` 구단주 축, 49일차)
- **일정**: **56일차 ~ 64일차 (2026-10-06 ~ 2026-10-16)** / 추정 7.5인일 / 담당 3팀 데이터·밸런싱·배당팀 — ⚠️ **일차 정정(48일차)**: 이 줄이 D-31(2팀 Tier B 2일 신설 → H-16이 53→55일차) 반영 전 값인 "54~62일차"로 남아 있었다. 일정 단일 소스인 `docs/team-schedule/03-데이터밸런싱배당팀.md`(56~64일차)에 맞춰 정정했으며 **스코프 변경은 없다**. **D-35 9단계 스폰서 협상은 48~49일차 소급분(`sponsor.ts` 구단주 축)을 재사용**하므로 이 Task에 추가 공수를 계상하지 않았다
- **근거**: FR-TR-001~012, FR-YT-001~006, FR-TM-004·005·007·010, D-17, **D-20**, NFR-PF-007, I-01
- **구현 사항**
  - [ ] 10단계 순차 처리 — 은퇴 → 계약만료 → 유소년 배출 → 재계약 → 강제매각 → 영입/트레이드 → 임대 → FA 충원 → 스폰서 협상 → 검증
  - [ ] **9단계 스폰서 협상은 구단주 경유로 구현한다** (**D-35**, 47일차 사용자 요청) — 계약 주체는 `ClubOwner`이고 `SponsorContract.signedByOwnerId`를 채운다. 제안 금액·`sharePct`에 구단주 축(`wealth`·`negotiation`·`reputation`)을 반영하되, **수입 귀속처는 팀(`teamId`) 그대로**라 원장·회계 항등식(NFR-QA-005)은 변경하지 않는다. 구단주 공석(`teamId: null`) 시 협상 처리 규약을 함께 정한다
  - [ ] 이적 빈도 제어 — 팀당 영입 0~4명, 리그 전체 이적률 8~15%
  - [ ] 협상 성공률(명성·몸값·취향 태그 기반), 계약 1~5시즌, 트레이드 가치 격차 15% 이내
  - [ ] 임대(급여 분담 50%) + **이중 임대 방지 규칙 확정** 후 I-01 해소
  - [ ] 유소년 배출(아카데미 등급 1~5 기반), 루키 초기 능력치(16~18세, OVR 6~14), 외부 루키 풀 보충 — **이름은 Task 007의 공유 생성기 사용**(D-17)
  - [ ] 감독 — **독립 엔티티(E-06)로 유지, 이적은 계약 만료 교체·경질 최소 범위만 구현**, 명성·수상 트랙 반영 (D-20)
  - [ ] 최종 검증 단계 — 스쿼드 22~30명·GK≥2·CB≥3 자동 교정
  - [ ] 프리시즌 전 단계 재실행 시 멱등(이중 이적·이중 급여 차감 0)
- **수락 기준**: 프리시즌 전체 처리 ≤ 60초. 프리시즌 종료 후 전 팀이 스쿼드 규칙 충족.
- **테스트**: Vitest — 20시즌 이적률 밴드, 은퇴·배출 수급 균형, 멱등성 재실행.

### Task 031: 공통코드 37개 그룹을 시드하고 밸런싱 튜닝 루프를 구축한다 (**37개로 갱신 — 14일차 I-88 결정**)

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀 / 지원: 6팀 DB·인프라팀(시드 마이그레이션)
- **일정**: 36일차 ~ 66일차 (2026-09-08 ~ 2026-10-20) / 추정 5.5인일 / 담당 3팀 데이터·밸런싱·배당팀 — 일정상 **2단위 분할(스코프 불변)**: 031a(37그룹 시드·메타데이터·발효 정책 — 37개로 갱신, 14일차 I-88 결정, 2.5인일) 36~38일차 (2026-09-08 ~ 2026-09-10) / 031b(변경 이력·밸런싱 튜닝 루프, 3.0인일) 63~66일차 (2026-10-15 ~ 2026-10-20)
- **근거**: FR-AD-011~016, NFR-CFG-001~007, NFR-OB-003, R-01, R-15, I-05, I-06
- **구현 사항**
  - [ ] 37개 그룹의 실제 기본값 시드 데이터 작성 (05문서 5.12.1 기준 36개 + 국적 비중 그룹 1개, I-88) → I-06 해소
  - [x] 타입·범위 메타데이터 및 DB 제약, JSON 스키마 검증 (NFR-CFG-004) *(37일차 — `src/lib/config/schema.ts`(신규): 코드별 숫자 min/max 카탈로그 + **자체 구현 JSON 스키마 서브셋**(외부 의존성 미추가) + `validateCommonCodeValue()` 저장 전 거부 게이트(`CommonCodeValidationError`). `schema.test.ts` 14건 통과 — 수락 기준 "범위 밖 값 저장 전 거부" 충족)*
    - 범위는 **문서에 단위가 명시된 코드(퍼센트·확률·물리적 음수불가 개수)만** 채우고 나이 임계값·상한 불명확한 배율은 의도적 무제한 — `catalog.ts`의 기존 억측 금지 원칙과 동일선상. **부분 커버리지임을 명시 → I-197**(031b 실측 보강)
  - [x] 발효 정책 적용 — `NEXT_SEASON` 그룹이 진행 중 시즌에 영향 0 *(38일차 — `src/lib/config/apply.ts`(신규) `resolveEffectiveCommonCode()`: 11일차 `policy.ts` + 9일차 `catalog.ts`를 결합해 current/pending 중 지금 발효될 쪽을 판정하며, `NEXT_SEASON`은 `effectiveFromSeason` 미도달 시 무조건 `current` 반환. **수락 기준 "NEXT_SEASON 즉시 반영 0건"을 시즌 1~9 전 구간 스윕으로 단언**)*
  - [x] 상수 스냅샷 기록·해시 중복 제거 (시즌당 ≤ 20건, ≤ 1MB) *(38일차 — 같은 파일 `resolveSnapshotRecording()`: 12일차 `snapshot.ts`의 해시 dedup 위에 시즌당 ≤20건/≤1MB 예산 감사 계층을 얹었다(canonicalize + `TextEncoder` 바이트 실측). 예산 초과 시 throw가 아니라 `BUDGET_EXCEEDED` **판정 값 반환** — 실제 DB 쓰기 정책은 6팀 소관이라 결정을 호출자에게 남겼고 근거를 헤더에 명시. `apply.test.ts` 14건 포함 `src/lib/config` 62 tests 전건 통과. `loader.ts`는 미수정(배선은 별도))*
  - [ ] 변경 이력 append-only 기록 및 롤백(기본값 복원) 경로
  - [ ] **밸런싱 튜닝 루프** — 20시즌 장기 시뮬 → 밸런스 리포트 생성 → 상수 조정 → 재검증 (I-05 해소)
- **수락 기준**: 공통코드 커버리지 ≥ 90%(KPI-10). `src/lib/sim/`에 대상 상수 숫자 리터럴 잔존 0건. KPI-8 밸런스 4지표 밴드 충족.
- **테스트**: Vitest — 공통코드 주입 시 시뮬 결과 변화, 폴백 경고, 발효 정책 3종.

- **36일차(3팀) — 031a 공통코드 시드 초안 완료.** `supabase/seed/common-code.sql`(신규 594행, **DB 미적용** — 적재는 6팀 소관). **38그룹 메타 전량** + 값이 있는 33그룹 **155건**(`world_id NULL` 전역 기본값). 35일차 로그에 폴백 경고가 찍히던 7그룹(`SQUAD_PARAM`·`SPONSOR_PARAM`·`LEAGUE_TEAM_COUNT`·`ROUND_INTERVAL_MIN`·`PROMOTION_RELEGATION_SLOTS`·`MATCH_POINTS`·`UI_PARAM`) 전량 포함(팀장 실측 확인).
  - **`UI_PARAM`만 `fallback.ts`와 의도적으로 다르다**(5000/3000 vs 30000/15000). `fallback.ts` 스스로 30000/15000을 "장애 시 비용 안전망 전용값"이라 밝히고 **"정상값은 6팀이 031a를 적재한 뒤 전역 기본값 소스가 공급한다"**고 명시하므로 05문서 원문값이 맞다. `ODDS_PARAM`은 안전망이 아니라 확정 개선값(I-08/I-167)이라 `fallback.ts` 값 그대로 재사용.
  - **⚠️ 값 없는 4그룹(`WEATHER_EFFECT`·`RATING_WEIGHT`·`OVR_WEIGHT`·`MANAGER_MATCHUP`)은 억측 없이 그룹 메타만 등록했다 → I-187.** `fallback.ts`가 이 넷을 "실제 구조는 36일차(031a) 소관"이라 미뤄 뒀는데 오늘 스코프(05문서 5.12.1)에 값이 없어 이월 사슬이 갈 곳 없이 끝났다. **2팀 37일차 "경기 평점 산출(FR-ST-003)"이 `RATING_WEIGHT`를 소비하므로 착수 전 판정 필요.**
  - 잠정값 2건(`INJURY_PARAM.BASE_TICK_PROB`·`RETIREMENT_PARAM.BASE_PROB`)과 `PLAYOFF_PRIZE` 조합 누락 → **I-190**(031b). 표 문구 "36개 그룹" vs `catalog.ts` 38종 불일치 → **I-191**.

- **37일차(3팀) — I-187 해소, `RATING_WEIGHT` 정의 완료.** 36일차 인계는 "값 정의 주체·시점이 사라졌다"였으나 **전제가 틀렸다** — 값이 없던 건 05문서(5.12.1)뿐이고 `docs/require/03-functional-requirements.md` **FR-ST-003 절에 구체 수치가 이미 있었다**(기본 6.0 / 골 +1.0 · 도움 +0.7 · 키패스 +0.1 · 실책-실점 −1.0 · 경고 −0.3 · 퇴장 −1.0 / `[1.0,10.0]` 클램프 / GK 별도표). 억측 대상이 아니므로 **ⓐ안(3팀 선 정의) 확정**.
  - 최종 형태 **`RATING_WEIGHT: { FIELD, GK, SCALE:{base,min,max} }`** — 키는 `keyof PlayerStatCoreValues`. 문서 명시 6개 + 보간분(`ownGoals`·`secondYellows`·`fouls*`·`offsides`·`saves`·`penaltiesSaved`)에 **값별로 "문서 명시" / "보간" 근거 주석**을 달아 031b 교체 대상을 식별 가능하게 했다.
  - 키 공간·저장 형태 확정 경위와 접점 결함(**I-192**)은 Task 026 항목 참조. GK `saves`/`penaltiesSaved` 잠정값 → **I-193**(031b).
  - **`OVR_WEIGHT`(11군×34속성)·`MANAGER_MATCHUP`(6×6)·`WEATHER_EFFECT` 3그룹은 규모가 커 별도 산정 대상으로 빈 객체 존치**(팀장 확정, I-71 유지).

### Task 032: Supabase 스키마 마이그레이션과 인덱스를 적용한다

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 13일차 ~ 18일차 (2026-08-06 ~ 2026-08-13) / 추정 4.5인일 / 담당 6팀 DB·인프라팀
- **근거**: Task 009 설계서, E-01~E-47, D-15, 05문서 5.16, DC-06~DC-08, NFR-SC-001
- **구현 사항**
  - [x] supabase MCP `apply_migration`으로 1차 범위 테이블 생성 (project ref: `damruradpliktkrlkakl`)
  - [x] 공통코드 4테이블(E-41~E-44) + 운영 3테이블(E-45~E-47) 포함
  - [~] 13개 인덱스 + `fixture(status, kickoff_at)` 부분 인덱스 생성 — **15일차 부분 완료(12/14)**. `docs/db/schema-design.md` §6.2.1 공식 14개 중 12개를 `apply_migration`으로 적용(`task032_core_indexes`). 미생성 2건은 `idx_bet__user_placed`·`idx_bet_market__status_closes`로, **`bet`/`bet_market` 테이블 자체가 2차 릴리스 범위라 아직 존재하지 않는다**(설계서에 `-- 2차` 명시). 해당 테이블 생성 Task에서 인덱스 2건 재적용 필요 — I-100
    - **팀장 검증에서 누락 발견·해소**: 1차 보고는 §6.2.1만 다뤘으나, 설계서 §6.2.4가 Task 032의 범위를 **"§6.2.1(14개) + §6.2.2 이월분(7개) = 총 21개 물리 인덱스"**로 명시하고 있어 **§6.2.2 7개가 통째로 미적용**이었다. 그중 4개는 성능 인덱스가 아니라 **무결성 UNIQUE 제약**(`player_state_squad_number_uq` — 3팀 Mock 팩토리가 코드 레벨에서 이미 전제하는 팀 내 등번호 유일 불변식, `trophy_season_team_type_uq`, `common_code_global_uq`/`common_code_override_uq` — 공통코드 전역/월드 오버라이드 NULL 유일성 분리). `task032_carryover_indexes`로 7개 전건 적용(사전 UNIQUE 위반 점검: 대상 5테이블 모두 0행). **팀장 재검증: `pg_indexes` non-pkey 20개**(Task 032 신규 19 = 12+7, 사전 존재 `world_singleton_uq` 1)
  - [x] 공개 읽기 RLS 기본 정책 + 엔진 서비스롤 쓰기 분리 (1차 범위) — **15일차 완료**. `docs/db/schema-design.md` §6.3.1대로 A/B/C 3그룹 적용: A그룹 34테이블(공개 SELECT + service_role 쓰기), B그룹 4테이블(`cron_run`/`cron_gap`/`audit_log`/`common_code_history` — append-only 트리거로 UPDATE·DELETE 거부), C그룹 `match_event`(원시 테이블 직접 조회 차단 + `match_event_visible` 뷰·함수 경유). `search_path` 고정으로 advisor WARN 3건 해소. PUBLIC EXECUTE 회수는 anon 롤 테스트에서 뷰가 깨져 즉시 원복(anon/authenticated EXECUTE 필요). **팀장 재검증: `pg_tables.rowsecurity` 39/39 true**, anon 롤로 `match_event` 직접 조회 0행 / `match_event_visible` 정상 조회
  - [x] 제약 — `fixture.snapshot_id` NOT NULL, 팀당 활성 스폰서 계약 ≤ 3, 범위 CHECK 제약 — **16일차 완료**(마이그레이션 5건: `task032_sponsor_contract_active_limit_trigger`, `task032_range_checks_batch1`, `task032_range_checks_player_attribute`, `task032_common_code_value_checks`, `task032_carryover_unindexed_fk_pass2`). ① **`fixture.snapshot_id` NOT NULL은 9일차에 이미 적용돼 있어 신규 마이그레이션 없이 확인만**(팀장 재검증: `pg_attribute.attnotnull = true`) — R-06(공통코드 외부화가 결정론을 깨뜨림) 완화책 DC-14에 해당. ② 팀당 ACTIVE 스폰서 계약 ≤ 3은 `trg_sponsor_contract_active_limit` 트리거. ③ 범위 CHECK는 단일컬럼 18개 + `player_attribute`/history 34속성×2 = 68개, 여기에 `common_code` 숫자형 범위 CHECK와 JSON형 필수 트리거(`trg_common_code_json_required`) 추가 — **팀장 재검증: public 스키마 CHECK 제약 142건, 트리거 2종 실재**. 6개 카테고리 위반 삽입 거부 + 경계값 정상 삽입을 `execute_sql`로 검증했고 **테스트 데이터 전량 정리 확인**(팀장 재조회 0행). 여력으로 이월 advisor `unindexed_foreign_keys` **65→0** 전량 해소
  - [x] `mcp__supabase__generate_typescript_types`로 DB 타입 생성 → `src/lib/data/database.types.ts` — **17일차 완료**(3,184줄, 39테이블. 순수 TS 타입 파일이라 `@supabase/*` 미설치 상태에서도 컴파일된다. 재생성 절차를 헤더 주석에 명시)
  - [x] 도메인 타입(Task 002)과의 매퍼 작성 — 컴포넌트는 DB 타입을 직접 참조하지 않음 — **17일차 완료**(`src/lib/data/supabase/mapper.ts` 1,058줄). DB Row → 도메인 타입 **단방향** 매퍼로 38개 엔티티 전량 커버(테이블당 함수 1개). 브랜드ID·시드·Points는 브랜드 캐스트, jsonb는 `asJson`/`asJsonOrNull` 2단 캐스트 헬퍼, 34속성/56필드 공유 블록은 헬퍼로 중복 제거. `TeamSeasonStat`은 DB 평탄 컬럼을 `homeRecord`/`awayRecord`/`biggestWin`/`biggestLoss` 중첩 객체로 재구성. **도메인 타입 재선언 0건**(`Database` 파생 타입과 `@/types` 배럴에서만 유래 — 팀장 grep 실증), `@/types` 서브경로 직접 import 0건. **수락 기준 "매퍼 컴파일 통과" 충족**(`tsc --noEmit` 0 에러, `lint` 0)
    - **범위 밖(명시)**: 배팅·사용자 계열(E-33~E-40)은 **대응 테이블이 아직 미마이그레이션**(2차 릴리스)이라 매퍼 없음. `DataSource.ts`의 조합 DTO(`PublicPlayerProfile` 등)는 Task 034(어댑터) 소관이라 미포함
    - **51일차 소급(032 소급, 6팀)** — 48일차 마이그레이션의 매퍼분 이월 확정 처리. `database.types.ts` 재생성 + `mapper.ts` 로컬 캐스트 3곳 제거 + `mapClubOwnerRow` 신설(신규 3필드·1테이블 DB↔도메인 대응). `mapper.test.ts`/`SupabaseDataSource.test.ts` 반영, `vitest src/lib/data/supabase` 137건 통과. ⚠️ **신규 발견 — I-263**: I-243 판정 중 `list_migrations` 원격 ↔ 로컬 대조에서 **Task 032 초기 RLS/하드닝 마이그레이션 18건이 원격에만 존재하고 로컬 파일 0건**임이 드러났다(원격 DB는 RLS 정상, 로컬 재생 시에만 보안 계층 부재 위험). I-243(로컬 3파일 rename)과 한 패스로 처리 예정, 실DB 전환(034b) 전 필수
    - **✅ I-110 해소(18일차)** — 아래 권장 조치대로 `add_team_season_stat_biggest_pairing_check` 마이그레이션을 적용해 `team_season_stat_biggest_win_pairing_check` / `_biggest_loss_pairing_check` 2건을 추가했다(`num_nonnulls(...) IN (0, 4)`). 매퍼의 캐스트는 이제 DB가 보장하는 전제 위에 선다. 팀장이 `list_migrations`로 오늘 신규 적용임을 확인(같은 팀 재검증 인스턴스의 "이미 존재하므로 실결함 아님" 주장은 순서 착시로 기각). **이하 원문**:
    - **⚠️ I-110(17일차 제보, 18일차 판정)** — 매퍼가 `team_season_stat`의 "`biggest_win_fixture_id`가 null이면 동반 3컬럼도 null"이라는 **불변식을 캐스트로 가정**하는데, **팀장이 `pg_constraint`를 직접 조회한 결과 이 테이블의 CHECK는 금액 범위 8건 + `competition_type` 1건뿐이고 동반 null을 강제하는 제약이 없다**(`biggest_loss_*` 동일). 부분 null 행이 들어오면 타입은 통과하되 런타임에 `undefined` 필드를 가진 도메인 객체가 만들어진다. 권장 조치는 `CHECK (num_nonnulls(...) IN (0, 4))` 마이그레이션(DB가 불변식을 보장해 경계를 하나로 유지)
- **수락 기준**: `list_tables`로 전 테이블 확인. `get_advisors`에서 보안·성능 경고 해소. 도메인 타입 ↔ DB 타입 매퍼 컴파일 통과.
  - **✅ advisors 마감(18일차, Task 032 종료).** 팀장이 `get_advisors` 양쪽을 직접 재실행해 확인했다. **performance**: `auth_rls_initplan` **41→0**, `multiple_permissive_policies` **170→0** — 원인은 34개 테이블의 `_service_role_write`(ALL)가 `_public_select`(SELECT)와 **중첩**된 구조였고, SELECT를 public_select 하나만 담당하게 하고 write를 INSERT/UPDATE/DELETE 3개로 분리해 해소했다(`split_service_role_write_policies_no_select_overlap`). 나머지 5테이블은 `auth.role()`을 `(select auth.role())`로 래핑(`fix_rls_initplan_standalone_policies`). `unindexed_foreign_keys`는 16일차에 65→0. `unused_index`는 73건 유지 — **데이터 0행의 당연한 결과라 Task 042(58~62일차) 회수 검토로 이관**, 오늘 미터치. **security**: 5건 → **1건**. 헬퍼 2종(`current_world_minute()`·`is_event_elapsed()`)은 SECURITY INVOKER 전환으로 WARN 4건 해소(전자는 대상 `world`가 이미 공개 SELECT라 무영향, 후자는 현재 테이블 접근이 없는 `select true` 스텁이라 DEFINER가 애초에 불필요 — I-102). 잔존 ERROR 1건 `match_event_visible`은 **`match_event`의 정책이 `service_role` 전용 1개뿐이라 invoker 전환 시 anon/authenticated에게 완료 경기 이벤트까지 전부 0건이 되어 기능이 깨진다**는 SQL 근거로 예외 승인하고 `security_barrier=true` 하드닝만 적용(`reduce_security_definer_exposure`) — **I-112**. 인증 도입 시 재검토
    - **⚑ 팀장 반려 이력(18일차)**: 1차 보고가 성능만 처리하고 보안 5건을 "스코프 밖"으로 남겨 반려했다. 수락 기준 문구가 "보안·성능 경고 해소"이고 오늘이 종료일이므로, 해소 또는 SQL 근거를 갖춘 정당화 중 하나를 요구해 위 결과로 마감
  - **(이하 15~17일차 시점의 잔여 기록 — 위 항목으로 마감됨)** security: `match_event_visible` SECURITY DEFINER ERROR 1건(뷰가 RLS를 우회하는 것이 설계 의도라 **인정**), 헬퍼 2종의 anon/authenticated EXECUTE WARN 4건(뷰 동작에 필수 + STABLE 읽기전용이라 **인정**). performance: `auth_rls_initplan` 41건(`auth.role()`/`auth.uid()`가 행마다 재평가 — `(select …)` 래핑으로 해소되는 정형 수정, 시드 투입 전 처리 권장), `multiple_permissive_policies` 170건(A그룹 정책 2개 병존 구조의 부산물 — 통합 가능성 판단 필요), `unindexed_foreign_keys` 65건(설계서 21개 인덱스가 FK 전량을 덮지 않음 — 조회 경로 없는 FK를 둘지 판단 필요), `unused_index` 13건(데이터 0행 상태의 당연한 결과 — 시드 후 재평가). **16~18일차 잔여 작업으로 이월 배정**

### Task 033: Supabase Edge Function 크론으로 자동 진행을 구현한다

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀 / 지원: 2팀 시뮬레이션엔진팀(SP-4 엔진 호출 스모크)
- **일정**: 38일차 ~ 48일차 (2026-09-10 ~ 2026-09-24) / 추정 8.5인일 / 담당 6팀 DB·인프라팀 / ✅ **V-01 게이트 통과(37일차 실측) — 착수 조건 충족**
- **✅ V-01 실측 결과 (37일차, 6팀 / SP-3 공유)** — `docs/db/37Day-V01실측결과-SP3공유.md`. 2팀 엔진을 Deno 이식해 신규 Edge Function에 올리고 16일차 `perf-bench.test.ts`와 동일 파라미터로 실호출: **30경기 처리 핸들러 동기구간 웜 9.5~13.2ms / 게이트웨이 종단 111~162ms(콜드 제외)** — 한도 2,000ms 대비 마진 **91.9~99.3%**. 300경기(10배)도 42ms, 콜드스타트 1회 1,116ms(한도 내). → **`D-04`(Edge Function 크론)·`AS-14` 무효화 없음, Task 033 재설계 불필요, 리스크 R-B 해소.**
  - **19~36일차 로그 전수 확인 결과 그 이전 실측은 전무**했다(사전 설계만 존재). 35일차 로그의 "self-consistency 추정치"는 KPI-4(3팀 Brier) 건으로 V-01과 무관 — 혼동 분리 기록.
  - ⚠️ **순수 CPU만 측정했다** — DB I/O(잠금·조회·쓰기)와 024 계수체인 미포함. **Task 033 골격 완성(40일차) 후 I/O 포함 종단 재실측 필요, 콜드스타트 빈도도 미확인 → I-196.**
  - 측정용 임시 함수는 무인증 CPU 소모 벡터(anon key 공개 + `matches` 파라미터 무상한, 6팀이 `matches=999999`로 실증)라 **410 스텁 재배포로 무효화**했다. 슬러그 완전 삭제는 대시보드 권한 필요 → **I-199**. 벤치 원본 소스는 위 문서 §7에 보존.
  - **단 착수는 026 도착(2팀 39일차)까지 대기** — 38~39일차에 6팀 자체 작업 없음.
- **근거**: FR-AD-017~022, NFR-CR-001~009, E-45, E-46, D-04, DC-15, DC-16, R-08, R-09
- **구현 사항**
  - [~] `supabase/functions/tick/` — 잠금 획득 → 킥오프 도래 Fixture 탐지 → 경기 시뮬 → 후처리 → 잠금 해제 — 41일차 골격 신설(`supabase/functions/tick/index.ts`). **40일차 골격은 실제로는 착수되지 않았던 것으로 확인**돼(40일차 6팀 배정 행 없음) 41일차에 락과 함께 구현했다. 잠금 획득·해제 구간은 완료, **Fixture 탐지~후처리 본작업은 잔여**
  - [x] 어드바이저리 락 + 타임아웃 5분, 락 실패는 에러가 아닌 no-op — 41일차 `tick_run()` DB 함수. 락·본작업·해제를 **트랜잭션 1회로 묶어** `pg_try_advisory_xact_lock` 사용, `CRON_PARAM.LOCK_TIMEOUT_MIN`(5분) 조회 후 `SET LOCAL statement_timeout` 적용(폴백 5분). 락 실패 시 `cron_run(NOOP)`만 남기고 200 정상 종료. **판정 근거는 단위 테스트가 아니라 REST RPC 병렬 curl(다른 PID)로 true/false 분기 실증.** `get_advisors` 경고(anon/authenticated RPC 직접 호출)도 REVOKE/GRANT로 해소
  - [x] 멱등성 — 동시 호출 10건에도 중복 시뮬 0건, `FINISHED` 재처리 시 스탯 이중 누적 0 — 42일차 `20260721104357_tick_run_idempotent_claim.sql`. 탐지+상태전이를 **조건부 `UPDATE fixture ... WHERE status='SCHEDULED' ... RETURNING`(원자적 클레임)** 하나로 통합해 락과 별개인 **행 단위 게이트**를 만들었다. **판정은 단위 테스트가 아니라 실증** — 동시 curl 10건(다른 PID) 중 `fixtures_processed=1`이 정확히 1건, FINISHED 재호출 2회는 둘 다 0건이며 `simulated_at` 불변
    - ⚠️ **pg_cron 스케줄은 걸지 않았다(I-214).** 주기 1분은 최소 라운드 간격 75분의 약수라 수치상 문제없으나, **스코어가 STUB인 상태로 점등하면 2팀 실엔진이 붙기 전에 매분 가짜 점수로 `FINISHED` 처리**되어 되돌릴 수 없는 오염이 발생한다. 멱등성이 있어도 "잘못된 값으로 일관되게" 오염될 뿐이라 상쇄되지 않는다. **해제 조건: 2팀 실엔진 연동 + 후처리 배선**
  - [x] 1회 실행 처리 상한 ~~50경기~~ **30경기**, 초과분 다음 틱 이월 (Edge Function 시간 제한 대응) — 43일차 `20260721203626_tick_run_batch_cap.sql`. **I-09 반영으로 상한을 50→30으로 낮췄다**(Edge Function CPU 2초 한도 대응). **별도 이월 큐를 두지 않는다** — 초과분은 `SCHEDULED`로 남겨 다음 틱이 자연히 집어간다. PostgreSQL `UPDATE`는 `LIMIT`을 지원하지 않으므로 대상 id를 `SELECT ... ORDER BY kickoff_at, id LIMIT v_cap FOR UPDATE`로 먼저 확정(킥오프 이른 순 = 결정론적)한 뒤 그 집합에만 UPDATE(42일차 멱등성 게이트 유지). 초과 발생 시 `cron_run.status='PARTIAL'`(41일차 스키마에 있었으나 미사용이던 값)로 남겨 이월을 관측 가능하게 했다 — **다만 볼 대시보드가 아직 없다(I-218)**. **판정은 실측** — SCHEDULED 35건 → 1회차 `processed=30, remaining=5, PARTIAL` → 2회차 `processed=5, remaining=0, SUCCESS` → 3회차 `processed=0`(멱등성 미손상). 1팀이 같은 일차에 코드 폴백(`config/fallback.ts`·`catalog.ts`)도 30으로 정합화 — **폴백과 DB가 갈라진 채 양쪽 다 각자 테스트를 통과하고 있었고 소비 지점 테스트 부재로 미검출이었다(I-192 5번째 근거)**
  - [x] 지수 백오프 3회 재시도, 밀린 라운드 catch-up(폴백 경로 구분 기록) — 44일차 `20260721120512_tick_run_retry_catchup.sql`(CREATE OR REPLACE로 42/43일차 함수 대체). 클레임 실패 시 즉시 `FAILED`가 아니라 **재시도 3회(0.1/0.2/0.4s 지수 백오프)** 후 소진 시에만 `FAILED`로 떨어뜨려 **폴백 경로를 구분 기록**한다. `is_catch_up`은 킥오프가 `INTERVAL_MIN`보다 오래 지난 `SCHEDULED` 존재 여부로 판정 — 41일차 스키마에 있었으나 **0/false 상수로 박혀 있던 값을 실측 기록으로 전환**했다. **판정은 실측** — fixture 40건(상한 30 초과 + 킥오프 2시간 전) 삽입 후 `tick_run()` 2회로 전량 `FINISHED` 완주(1회차 `PARTIAL` 30/잔여 10 `is_catch_up=true`, 2회차 `SUCCESS` 10/잔여 0), 백로그 없는 3회차는 `is_catch_up=false`로 정상 구분. 재시도 루프는 격리 DO 블록으로 검증. 테스트 데이터 전량 삭제 원복 확인. **I-214 크론 점등 금지는 유지**(스케줄 미활성 — 해제 조건은 여전히 2팀 실엔진 연동 + 후처리 배선)
  - [x] 중단 감지 — 주기 3배 초과 시 `cron_gap` 기록 및 경고 — 45일차 `20260721133219_tick_run_gap_detect.sql`. `tick_run()`이 직전 성공 실행의 `finished_at`과 현재 시각 간격이 `GAP_DETECT_MULTIPLIER`(3) × `INTERVAL_MIN`을 초과하면 `cron_gap` 행 INSERT + `RAISE WARNING` + RPC 응답에 `gap_detected`/`gap_minutes`/`cron_gap_id` 반환(R-08). **판정은 실측** — `BEGIN…ROLLBACK` 격리 트랜잭션에서 `finished_at = now()-10min`인 SUCCESS 행 주입 후 `tick_run()` 직접 호출 → `gap_detected:true, gap_minutes:10, cron_gap_id` 반환 및 `cron_gap` 행 생성 확인, 롤백 후 `cron_run`(21)/`cron_gap`(0) 원상복구 검증. 원격 함수 정의를 `pg_get_functiondef`로 파일과 대조해 일치 확인. **I-214 크론 점등 금지 유지**(`cron.job` 릴레이션 없음 = pg_cron 미설치 확인). ⚠️ **여러 틱에 걸친 catch-up 완주 시 `recovered_at` 소급 갱신은 범위 밖**으로 마이그레이션 주석에 명시 — 잔여
  - [x] `cron_run`에 no-op 포함 전 실행 기록, `/api/health` 엔드포인트(NFR-OB-004) — 46일차. **전자는 41일차 `tick_advisory_lock.sql`부터 이미 충족**돼 있음을 코드로 재확인(락 실패 시 `cron_run(NOOP)` 기록) — 신규 변경 0건이며 **일정표 문구가 이미 끝난 요구를 재기재한 것**(I-234, 문구 정정 필요). 후자는 `src/app/api/health/route.ts` 신설 — service-role 클라이언트로 `SupabaseDataSource`를 재사용하고 **3팀 `obs/alert.ts`의 `computeSystemHealth`/`CronHeartbeat` 계약을 그대로 배선해 임계값 중복 구현을 회피**했다. 4상태 필드(`schedulerAlive`/`lastCronRun`/`nextKickoffAt`/`backlogFixtureCount`), **항상 200 + `status` 필드로 이상 표현**(핸들러 내부 예외도 500이 아니라 200 + `degraded` + `error`). ⚠️ `client.ts`가 PostgREST `count=exact`를 지원하지 않아 backlog 수는 **스캔 상한 1000 근사치**(I-234). `obs/alert.ts` 인계분 중 크론 자체(`tick_run`) 쪽 cronHeartbeat 배선은 미착수
  - [x] **(46일차 추가, 25일차 이월)** API p95 1차 측정 — **엔드포인트가 46일차에 처음 생겨 측정 선행 조건이 이 시점에 충족**됐다. `/api/health` 웜 40회 실측 **p95 190.8ms / p99 206.7ms** — NFR-PF-008(≤300ms/800ms) 통과. 상세는 `docs/db/46Day-health-p95측정.md`. 기존 로컬 dev 서버로 실호출해 신규 프로세스 기동 0건
  - [x] 서비스 롤 키는 Edge Function 시크릿에서만 로드 — 클라이언트 번들 grep 0건 — 47일차(NFR-SEC-001). 로드 지점 재확인: Edge Function(`tick`)은 `Deno.env.get`으로 **Supabase 기본 제공 시크릿**을 읽으므로 별도 설정 불필요(supabase docs 확인), `/api/health`는 Next 서버 전용 route로 클라이언트에 도달하지 않는다. **팀장 교차 검증** — 클라이언트 정적 청크(`.next/dev/static`) grep **0건**, 소스 전역에서 `SUPABASE_SERVICE_ROLE_KEY` 참조는 `src/app/api/health/route.ts` 1곳뿐이며 `"use client"` 파일 내 참조 **0건**. ⚠️ **한계: 프로덕션 번들이 아닌 dev 산출물 기준**이다(I-62로 이 환경에서 프로덕션 빌드 자체가 불가) — 빌드가 가능해지는 시점(I-200 계열)에 재검증 필요. 함께 I-234 잔여 처리: `client.ts`에 PostgREST `count=exact`+`head`+`lte` 추가로 `/api/health` 밀린 Fixture 수를 **스캔 상한 1000 근사치에서 정확 집계로 전환**(실 프로젝트 curl 검증). `tick_run` cronHeartbeat는 SQL↔TS 언어 경계상 코드 공유가 불가하나 양쪽 모두 `CRON_PARAM`(INTERVAL_MIN/GAP_DETECT_MULTIPLIER) 단일 소스라 파라미터 드리프트가 없어 **"결함 아님" 판정 권고** — 종결은 1팀 소관, 판정 대기
  - [x] 크론 주기(기본 1분)가 최소 라운드 간격 75분의 약수인지 저장 전 검증 — **48일차 완료**(`supabase/migrations/20260721161210_cron_interval_divisor.sql`). 저장 전 트리거로 거부하며 실측 확인: **7 거부(75%7≠0) · 5 통과 · 1 원복**. `get_advisors` 신규 경고 0건
- **수락 기준**: KPI-1 — 라운드 누락 0건, 크론 성공률 ≥ 99.5%. 킥오프 지연 p95 ≤ 60초. no-op 실행 ≤ 200ms.
- **테스트**: 통합 — 크론 30분 중단 후 재개 시 catch-up 완주, 동시 호출 부하. Playwright MCP — `/admin/scheduler`에서 실행 이력·중단 구간·밀린 라운드 표시 확인. — **통합 2종 49일차 충족(6팀, 코드·마이그레이션 변경 0건 · 검증 전용)**. ⓐ **30분 중단 catch-up**: 마지막 SUCCESS를 30분 전으로 세팅 후 1회차 `gap_detected=true`/`gap_minutes=30`, 35건 중 상한 30건 처리(`PARTIAL`, remaining 5) → 2회차 즉시 재호출로 나머지 5건 완주(`SUCCESS`, remaining 0). ⓑ **동시 호출 부하(R-08)**: 배포된 `tick` Edge Function에 실제 HTTP 10건 동시 요청(20건 fixture) — 1건만 락을 획득해 20건 전량 처리, 7건 `NOOP`(락 경합, 정상), 1건은 지연 락 획득 후 처리분 0. **중복 처리 0건**. DML 테스트 데이터는 종료 후 전량 삭제(잔존 0), **I-214 크론 점등 금지 준수**(pg_cron 스케줄 미활성, 수동 호출로만 검증). ⚠️ 10건 중 1건이 `tick_run()` 도달 전 edge-runtime **"JWT issued at future" 500**으로 실패 — 우리 로직과 무관하고 재시도로 흡수되나, 프로덕션 크론은 단발 호출이라 그 틱이 유실될 수 있어 재시도 정책 확인 필요(**I-246**). **Playwright `/admin/scheduler` 확인은 잔여** ⚠️ **50일차 SP-4에서 이 Playwright 항목은 불성립으로 판정됐다(I-256)** — `/admin/scheduler` 화면은 **5팀 Task 021 / 58일차** 소관이라 50일차 시점에는 11일차 Task 005 골격(`{"route":…}` JSON 출력)뿐이고, 수락 기준 4종(KPI-1 라운드 누락 0 · 크론 성공률 ≥99.5% · 킥오프 지연 p95 ≤60초 · no-op ≤200ms)의 측정 대상 UI 자체가 없다. **SP-4 착수일이 소비 화면 완성일보다 8일차 앞선 순서 역전**이며 6팀 결함이 아니다(6팀은 억지 구현 없이 사실만 보고). 크론 인프라 자체는 45~46일차 완료분이 그대로 존재함을 확인했고(`tick_run()` gap-detect·`cron_run`/`cron_gap`·`/api/health`), **I-214 준수도 재확인**(`cron.job` relation 부재 = pg_cron 미등록). **판정 대기**: ⓐ 58일차 이후 재배치 / ⓑ 화면 없이 `cron_run`·`cron_gap` 직접 질의로 수락 기준 재정의(**팀장 예비 견해는 ⓑ** — 지표 원천은 테이블이고 화면은 표시 계층일 뿐이라 스모크의 본질은 화면 없이도 성립)

### Task 034: Mock 어댑터를 Supabase 어댑터로 교체한다

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀 / 지원: 4·5팀(SP-5 UI diff 판정)
- **일정**: 20일차 ~ 68일차 (2026-08-17 ~ 2026-10-22) / 추정 5.0인일 / 담당 6팀 DB·인프라팀 / **034b는 크리티컬 패스** — 일정상 **2단위 분할(스코프 불변)**: 034a(Supabase 어댑터 구현·플래그 전환, 3.5인일) 20~25일차 (2026-08-17 ~ 2026-08-24) / 034b(전환 전후 스냅샷 비교·UI diff 0 검증, 1.5인일) 66~68일차 (2026-10-20 ~ 2026-10-22)
- **근거**: FR-UI-023, FR-UI-022, NFR-MT-002, NFR-PF-008·011, R-16
- **구현 사항**
  - [ ] Task 004의 `DataSource` 인터페이스를 Supabase 구현체로 작성 (`src/lib/data/supabase/`)
    - [x] **034a 1/3 — 20일차 완료(6팀)**: `getStandings` / `getFixturesByRound` 2개 메서드(`SupabaseDataSource.ts`, `client.ts`, `SupabaseDataSource.test.ts` 신규). **`@supabase/*` 패키지가 미설치인 제약을 클라이언트 주입 인터페이스(`client.ts`)로 해소** — 기존 `supabase/**`에 선례가 없음을 확인하고 최초 설계했으며, `from`/`select`/`eq`/`order`/`limit`/`maybeSingle` + thenable을 duck-typing으로 최소 정의해 **실제 패키지 설치 후에도 구조적으로 호환**된다. `DataSource` 시그니처 불변, 2/3 잔여로 전체 implements가 불가해 `implements Pick<DataSource, 'getStandings'|'getFixturesByRound'>`이며 **`factory.ts` 미등록**(전체 구현 완료 후). Result 래핑 없음(Mock과 동일 패턴). `seasonId` 생략 시 `world.current_season_number`→season 해석, `round` 생략 시 standing `MAX(round)` 조회. **`mapper.ts` 재사용**(`mapStandingRow`/`mapFixtureRow`/`mapSeasonRow`), 새 매퍼 0개이며 브랜드 캐스트는 `mapper.ts`에만 국한. `npx vitest run src/lib/data/supabase/` 49 통과, `tsc --noEmit`·`eslint` 클린. **`client.ts`의 `select()` 컬럼 프로젝션 미지원은 범위 밖으로 헤더에 명시** — 2/3 착수 시 참고
    - [x] **034a 2/3 — 21일차 완료(6팀)**: `getFixture` / `getPlayerProfile` / `getTeam` / `getPlayerStatRanking` 4개 구현(테스트 10케이스 추가, `src/lib/data/supabase/` 59 통과). **`client.ts` 미확장** — 4개 모두 `select('*')` 단건/전량 조회로 충분해 20일차에 "범위 밖"으로 남긴 컬럼 프로젝션이 필요 없었다. `getPlayerStatRanking`의 출전율 분모(시즌+대회 구분 범위 `MAX(appearances)`)·정렬을 Mock(H-07)과 동일하게 맞추고 `minAppearancePct` 기본값은 `loadConstants('UI_PARAM')` 경유. `Pick<DataSource, ...>` 목록 확장, `factory.ts` 미등록 유지
      - **메서드 선정 기준** — 팀 일정표가 "4개 메서드"처럼 개수만 명시하고 메서드명을 지정하지 않아 6팀이 임의 판단해야 했다. **팀장이 "화면 구역별 진입점(루트 조회) 1개씩" 기준을 승인**(20일차 순위·일정 / 21일차 경기상세·선수·클럽·통계) → I-126
      - **팀장 검증 결함 A — 프로덕션 어댑터가 Mock 스택에 의존(해소)**: `getPlayerProfile`이 `pa`→`scoutRating` 변환을 재구현하지 않으려 `@/lib/mock/fixtures/screens`의 `toPublicProfile`을 import했는데, `screens.ts`가 `generateMockWorld`·`generateMockProgress`·`generateSeasonSchedule`을 정적 import해 **프로덕션 어댑터 모듈 그래프에 Mock 월드 생성기 전체가 들어왔다** — 이 Task의 존재 이유(플래그로 Mock↔실데이터 교체, 최종적으로 Mock 분리)와 정면 충돌. 6팀이 인용한 `screens.ts` 주석("18일차 `MockDataSource`가 그대로 재사용한다")은 **Mock 어댑터**를 가리키지 프로덕션을 덮지 않으며, 6팀이 그 차이를 감지해 **스스로 판단을 물어온 것이라 절차는 정확했다**(재구현 대신 재사용한 판단도 옳았고, 문제는 함수의 **위치**였다). **조치**: 팀장이 교차 경로 편집을 승인해 1팀이 `toScoutRating`+`toPublicProfile`을 Mock 비의존 신규 모듈 **`src/lib/data/player-profile.ts`로 추출**하고 `screens.ts`에서 제거(**재export를 남기지 않음** — 남기면 결합이 그대로다). **재검증**: `grep -rn "lib/mock" src/lib/data/supabase/` **0건**, `player-profile.ts`의 import는 `@/types`·`./DataSource` 2개뿐, `screens.ts`가 반대로 `@/lib/data/player-profile`을 import해 **의존 방향이 `data → mock`에서 `mock → data`로 뒤집혔다**
    - [x] **034a 3/3 — 22일차 완료(6팀), 034a 종료**: 뉴스·브래킷·어드민 등 잔여 전 구역 배선으로 **`DataSource` 전 메서드(55개) 구현 달성**, `implements Pick<...>` → **`implements DataSource` 전체 전환** 완료(수락 기준 "인터페이스 전 메서드 구현" 충족). 기존 `mapper.ts` 재사용으로 **신규 매퍼 0건**, 테스트 45케이스 추가(`SupabaseDataSource` 104/104 통과, 전체 774 통과)
      - **`factory.ts` 등록 완료** — `src/lib/data/supabase/index.ts` 신규가 `registerDataSource('supabase', ...)`를 부수효과로 1회 수행하고, `bootstrap.ts`가 이 모듈을 동적 로드한다(`factory.ts` 헤더 규약대로 `factory.ts` 자체는 무수정). 프로바이더 함수로 **지연 생성** — `NEXT_PUBLIC_DATA_SOURCE=mock` 구동 중에는 Supabase 환경변수 부재로 인한 에러가 나지 않는다(`mock/index.ts`와 동일 원칙). **팀장이 런타임으로 직접 검증** — `kind=supabase` + `bootstrapDataSource()` 후 `getDataSource()`가 정상 인스턴스를 반환함을 임시 테스트로 확인(커밋하지 않음)
      - `@supabase-js` 미설치 제약은 `client.ts`에 **PostgREST fetch 브리지**(`createSupabaseRestQueryClient`)를 두어 해소했다 — 생성자가 `SupabaseQueryClient` 구조적 타입만 요구하므로 패키지 설치 후 `index.ts` **1줄 교체**로 실클라이언트 전환된다. `client.ts`에 `eq` boolean 확장 + `in()` 추가
      - `getMatchPlayerRatings`/`getMatchTeamStats`는 2팀 **Tier B 재시뮬 컴포넌트 미도착(H-14, 27일차)**으로 Mock과 동일하게 빈 배열을 반환하되 **사유가 다름을 JSDoc에 명시**했다(오늘 결함 아님, 27일차 이후 채움)
      - **23일차 결함 수정(6팀) — `client.ts`의 이중 URL 인코딩**: `eq()`/`in()`이 값을 `encodeURIComponent`로 미리 인코딩한 뒤 `URLSearchParams`가 직렬화하며 한 번 더 인코딩해 **공백 1글자가 `%2520`으로 전송**됐다. 팀명처럼 공백·한글·특수문자가 든 값의 PostgREST 필터가 **항상 불일치**했을 결함으로, 실데이터 전환 후에야 드러났을 종류다. 원본 문자열을 그대로 넘겨 `URLSearchParams`가 1회만 인코딩하도록 수정. **커버리지 임계를 채우려 테스트를 붙이는 과정에서 발견**됐다
      - **커버리지 0% 해소(6팀 23일차)** — `client.test.ts`·`index.test.ts` 신규로 `client.ts` 100%(47/47 stmt, 27/27 branch)·`index.ts` 100% 달성. 이 두 파일이 22일차에 테스트 없이 들어와 **CI를 3일간 레드로 만든 원인**이었다(Task 044 참조)
  - [ ] **[034-E] `match_event` 경과 시간 필터를 뷰 또는 보안 함수로 강제 (DC-05, NFR-SEC-004)** — **034a/034b와 무관한 별도 항목이다**(라벨 없이 034a 3/3 바로 아래 붙어 있어 034a의 연장으로 오독됐다 → I-130, 23일차 라벨 부여). **완료 기한은 30일차**
    - **23일차 재검증(6팀)**: `match_event_visible` 뷰 + `current_world_minute()`/`is_event_elapsed()` 함수가 원격에 실존함을 확인했다. 다만 `is_event_elapsed()`는 아직 **`SELECT true` 스텁**이다 — `schema-design.md §6.3.1`·`src/types/world.ts:56-61`에 "최종식은 2팀 H-24 인계 후 30일차 확정, 여기선 골격만"으로 명시된 **의도된 placeholder**이며 결함이 아니다(I-102). 따라서 NFR-SEC-004 수락 기준 중 **②(원시 테이블 RLS 차단)만 구조적으로 충족**이고, **①(경과 시간 이후 이벤트 반환 0건)·③(침투 테스트)은 미충족** — 30일차 실측 대상. **이 항목을 지금 체크하지 말 것**
    - `match_event_visible`이 `get_advisors(security)`에서 `security_definer_view` ERROR로 남는다 — 클라이언트 시계 미신뢰라는 설계상 의도이나 **의도적 수용 기록이 없어** advisor 출력만으로는 미해소 결함과 구분되지 않는다 → **I-137**
  - [x] 플래그 전환(`NEXT_PUBLIC_DATA_SOURCE`)으로 Mock↔실데이터 즉시 교체 — **22~23일차에 이미 충족됨(24일차 6팀 조사·팀장 재현 확인, 코드 변경 0건)**. `factory.ts`의 레지스트리 기반 전환 + `bootstrap.ts`의 kind 리터럴 분기 동적 import(22일차, I-75) + `supabase/index.ts`의 `registerDataSource('supabase', ...)` self-registration으로 배선이 완성돼 있고, `supabase/index.test.ts`(23일차)가 `NEXT_PUBLIC_DATA_SOURCE=supabase` 설정 시 `getDataSource()`가 `SupabaseDataSource`를 반환함을 직접 고정한다
  - [x] 폴링 훅을 실데이터에 연결, 이후 Realtime 교체 가능하도록 훅 레이어 유지 — **구조적으로 이미 충족(24일차 확인)**. `polling.ts`의 `usePolling`/`usePollingList`는 `fetcher: () => Promise<T>` **콜백만 받는 어댑터 비의존 설계**라 어느 DataSource를 쓰든 훅 코드가 바뀌지 않고 Realtime 교체 여지도 이미 확보돼 있다. 실제 `fetcher` 주입은 **화면 레벨에서 일어나며 소비처가 28일차(013A) 이후**라, 이 시점에 6팀이 연결할 지점이 존재하지 않았다
    - **⚠️ 24일차 6팀 행이 위 두 항목을 재배정해 중복이었다 → I-139**(I-130과 같은 계열의 일정 문서 오류). **25일차 팀장 재검토로 해소 — 잔여 스코프도 누락 작업도 없음을 확정**하고 `docs/team-schedule/06-DB인프라팀.md` 24일차 행에 취소선 처리했다. 일정 문서 오류였을 뿐 산출물 공백은 아니다
  - [ ] 전환 전후 화면 스냅샷 비교 — **UI 컴포넌트 코드 변경 0줄** 확인
  - [x] 컴포넌트의 Supabase 직접 import 0건 (ESLint 룰 검증) — **25일차 완료(6팀)**. 위반 코드를 실제로 주입해 lint가 잡는지 실증하는 방식으로 검증했고, **그 과정에서 가드레일이 죽어 있던 것을 발견해 수정했다 → I-140**
    - **ESLint flat config는 같은 파일에 매칭되는 여러 블록이 같은 규칙 키를 설정하면 병합하지 않고 뒤 블록으로 전체 교체한다.** 22일차에 추가된 Task 044 블록(`src/**/*.tsx` 대상)이 앞에 있던 **H-06 컴포넌트 Supabase 차단**과 **NFR-DT-001 sim 도메인 `react`/`react-dom`/`@supabase/*` 차단** 두 블록을 통째로 덮어써, 컴포넌트에 `@supabase/supabase-js`를 직접 import해도 lint가 exit 0이었다. 규칙 추가 1회가 가드레일 2개를 동시에 무력화한 구조적 사고다(sim 건은 팀장 지시 전수확인에서 추가 발견)
    - 조치: 두 블록을 각자 스코프에서 가장 뒤가 되도록 재배치하고 하위 패턴을 병합. **위반 5종**(컴포넌트 supabase/mock, sim react/supabase/mock) **실주입으로 전건 발동 확인**, `--print-config` 대조로 겹치는 다른 조합 없음도 확인. 무력화 기간 실제 위반 코드는 0건이라 유출은 없다
    - **가드레일 발동을 자동 검증하는 테스트가 없다는 것이 이 사고의 진짜 원인 → I-142(1팀 배정).** 6팀이 `ESLint#lintText` + 가상 filePath로 실현성 프로토타입까지 검증해 두었다(15~20줄 규모)
    - **"API p95 1차 측정"은 46일차로 이월**(팀장 승인) — 선행 조건인 `/api/health`가 46일차 인계물이라 25일차 시점에 `src/app/api/**` 자체가 없다. 6팀은 허위 수치 대신 측정 불가 사유를 보고했다(올바른 처리)
- **수락 기준**: 목록·상세 API p95 ≤ 300ms / p99 ≤ 800ms, 순위표 p95 ≤ 120ms. UI diff 0.
- **테스트**: Playwright MCP — 어댑터 두 모드에서 주요 10화면 스냅샷 동일성 비교, 네트워크 응답 검증.

### Task 035: 몬테카를로 배당 산출 엔진과 배당 표시를 구현한다

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀 / 지원: 5팀 화면·배팅UX팀(표시)
- **일정**: 27일차 ~ 35일차 (2026-08-26 ~ 2026-09-07) / 추정 7.5인일 / 담당 3팀 데이터·밸런싱·배당팀 / ✅ **V-02 게이트 26일차 통과 — 27일차 착수 완료**
- **근거**: FR-BT-005·006·014, NFR-DT-006, NFR-PF-004·005, NFR-SC-004, R-10, Q-03
- **구현 사항**
  - [x] `src/lib/odds/` — 엔진을 호출하는 프리시뮬 러너, **본경기와 독립된 시드 네임스페이스** — **27일차 완료(3팀)**. `src/lib/odds/runner.ts`(신규) + `runner.test.ts`(14 tests)
    - **26일차 V-02 통과 결론대로 경량 배당 모델을 만들지 않고 2팀 풀 엔진을 그대로 재사용**한다. `runOddsPresimMatch()`가 MC 반복마다 `buildTickSequence → generateMatchEvents → linkPenaltyOutcomes → accumulatePlayerMatchStats`를 호출하고 `tallyMatchScore()`로 팀별 득점을 부가 집계한다
    - **시드 독립성(NFR-DT-006)**: `deriveSeasonSeed(..., SEED_NAMESPACE.ODDS_PRESIM)`로 시즌 시드를 파생하고 `runIndex`를 `deriveMatchSeed`의 재추첨 구분자로 쓴다. `ODDS_PRESIM`(0b01)과 `MAIN`(0b00)은 값 집합이 서로소이며, 러너가 시즌·경기 시드 양쪽에 `assertNamespace` **런타임 검증**까지 건다. 테스트가 ⓐ 전 시드의 네임스페이스 ⓑ 동일 입력으로 파생한 MAIN 시드 집합과 **값이 겹치지 않음** ⓒ MC 반복 간 시드 전량 상이 ⓓ 재실행 완전 재현을 단언한다(**팀장이 `derive.ts`·`runner.ts` 대조로 직접 확인**)
    - 이벤트 발생확률·가중치는 여전히 **호출자 주입**(024 계수 체인 몫). **실제 배당률 변환(오버라운드·클램프)은 오늘 범위 밖**이며 잔여 항목이다
    - **I-08 해소** — `ODDS_PARAM.MC_N_SEASON` 300 → **1,500**, `REFRESH_ROUND_INTERVAL`(신규 코드) **5** 를 `src/lib/config/catalog.ts`·`fallback.ts`에 반영. 이슈 원문의 "월 CPU 총량 동일하게 정확도 2.2배" 권고 그대로이며, 9·11일차 주석이 "Task 035 착수 시 반영"으로 예약해 둔 항목을 기한 내에 처리했다
  - [x] 경기 마켓 N=3,000 프리시뮬 → 결과 분포 → 확률 → 오버라운드 1.06 적용, 배당 1.01~500.00 클램프 — **29일차 완료(3팀)**. `src/lib/odds/overround.ts`(신규) + `overround.test.ts`(13 tests). 배당 = (1/p) × (1/overround), FR-BT-005 ①②. **상수는 재선언하지 않고 27일차 `ODDS_PARAM.OVERROUND/MIN_ODDS/MAX_ODDS`를 `loadConstants`로 재사용**한다(NFR-CFG-001). 셀렉션 키→확률(units) 레코드를 받는 **범용 시그니처**라 1X2뿐 아니라 시즌 마켓도 그대로 재사용 가능하고, 확률 0 셀렉션은 마켓에서 제외한다. 테스트가 클램프 경계(→1.01 / →500.00)와 Σ(1/odds) = 1.06±0.005를 단언한다. **이로써 경기 마켓의 확률 산출~배당 변환 경로가 종결**됐다(시즌 마켓 호출부는 아래 잔여 항목 소관)
    - **28일차분(확률 산출)**: `src/lib/odds/match-market.ts`(신규) + `match-market.test.ts`(16 tests). 27일차 `runner.ts`를 이어받아 `tallyMatchOutcomes`(승/무/패 정수 카운트) → `computeMatchOutcomeProbabilities` → `computeMatchOutcomeMarket`(원스톱) 3계층
    - **수락 기준 "확률 합 = 1"은 근사가 아니라 항상 정확히 성립한다** — `rng/precision.ts`의 `normalizeWeights`가 6자리 고정 정밀도 정수 잔차를 최대 항에 흡수시켜 합계가 언제나 `PROBABILITY_UNIT_MAX`(1,000,000)다. 부동소수 누적합을 쓰지 않는다
    - 기본 N은 리터럴이 아니라 공통코드 `ODDS_PARAM.MC_N_MATCH`(3,000, 27일차 I-08 반영분)를 `runner.ts`가 읽는다. R-10에 따라 오늘은 1X2만 다룬다
  - [~] 시즌 마켓 N=300(우승·승격·강등·득점왕), 토너먼트 마켓 브래킷 기반 — **확률 산출 계층 30~31일차 완료(3팀), 러너(호출부)만 잔여.** `src/lib/odds/season-market.ts`(신규) + `season-market.test.ts`. 반복 결과 `SeasonMarketOutcome[]`를 받아 4개 마켓 확률로 정규화하며, 산출 타입이 `overround.ts`의 `SelectionProbabilityUnits`라 `computeMarketOdds`가 1X2와 **동일 함수로** 배당 변환한다
    - **N은 300이 아니라 1,500이다** — 위 27일차 항목의 I-08 반영으로 `ODDS_PARAM.MC_N_SEASON`이 300→**1,500**, 재산출 주기가 매라운드→**5라운드**로 이미 바뀌었다(공통코드 `catalog.ts`/`fallback.ts`). 이 수락 기준 문구의 "N=300"은 **I-08 이전 값이며 갱신되지 않은 것**이니 코드 기준(1,500)을 따를 것. 30일차 산출물은 그 값을 소비하는 첫 구현물이다
    - **정규화 방식을 마켓 성격에 따라 나눈 것이 핵심 설계다** — 우승·득점왕은 반복당 승자가 정확히 1이라 상호배타 다항이므로 `normalizeWeights`로 합=1을 정확히 맞춘다(1X2와 동일 원리). 반면 **승격·강등은 한 반복에 여러 팀이 동시에 해당되는 팀별 독립 이진 마켓**이라 `toUnits(count/totalRuns)`를 그대로 쓰고 **합이 1이 아닌 것이 정상**이다(승격 2자리면 합은 슬롯 수 ≈ 2에 수렴). 이를 합=1로 강제하면 "두 팀이 동시에 오르는데 그 반복엔 한 팀만 오른다"는 왜곡된 분포가 된다
    - **실제 몬테카를로 러너는 이 파일에 없다** — 잔여 시즌 대진 순회·순위표 갱신·타이브레이크를 돌려 `SeasonMarketOutcome[]`를 만드는 호출부는 **별도 일차 소관이며 아직 미배정**이다. `match-market.ts`가 `runner.ts`의 `runs[]`를 입력받는 것과 동일한 분리 구조
    - **토너먼트 마켓 31일차 완료(3팀)** — `src/lib/odds/tournament-market.ts`(신규) + `tournament-market.test.ts`(11 tests). `season-market.ts` 패턴을 그대로 재사용하며, **정규화 방식 분기도 같은 원리로 승계**했다: 우승 라운드는 반복당 승자가 1이라 `normalizeWeights`(합 = `PROBABILITY_UNIT_MAX`), 그 앞 라운드들의 진출 여부는 **한 반복에 여러 팀이 동시 진출하는 독립 이진 마켓**이라 `toUnits(count/totalRuns)`를 그대로 쓴다. **수락 기준 "브래킷 경로별 확률 산출" 충족**(라운드별 진출 + 우승)
    - 라운드별 진출·우승을 실제로 굴리는 시뮬레이션 러너는 위 시즌 러너와 마찬가지로 범위 밖이며, `TournamentBracketOutcome[]` 입력부터 시작한다. 브래킷 슬롯 타입은 H-01 동결 리뷰에서 "타입 대상 아님"으로 이미 판정돼 로컬 타입으로 뒀다
  - [x] 킥오프 T−30분 산출, 라인업 확정·부상 발생 시 재산출(킥오프 이후 미수행) — **32일차 완료(3팀)**. `src/lib/odds/schedule.ts`(신규) + `schedule.test.ts`(14 tests). (재)산출 **실행 여부만** 판정하는 순수 함수 4종(`hasKickoffPassed` / `computeInitialComputeAt` / `decideInitialCompute` / `decideRecompute`)이며 실제 확률·배당 계산은 이 파일 책임이 아니다(27일차 `runner.ts`·28일차 `match-market.ts`와 동일한 책임 분리)
    - **수락 기준 "킥오프 후 재산출 0건" 충족 근거는 단일 지점이다** — 최초 산출·재산출·트리거 종류를 불문하고 전 경로가 `hasKickoffPassed(now >= kickoffAt)`를 거쳐 차단된다. **등호를 포함**해 킥오프 정각부터 막는다(그 순간부터는 "경기 전 사전 정보로 확률을 조정한다"는 전제가 성립하지 않음). 결정 결과는 `skipReason: 'BEFORE_INITIAL_WINDOW' | 'KICKOFF_PASSED'`로 관측 가능
    - `Date.now()` 미사용 — "지금"은 전부 `now: Timestamp` 인자 주입(NFR-DT-001). 리드타임도 리터럴을 박지 않고 `leadMinutes` 파라미터로 받는다(NFR-CFG-001, 27일차 `kickoff.ts` 관례). **다만 그 결과 정책값 30이 코드베이스 어디에도 없다 — I-167**: 33일차 `worker.ts`가 config 카탈로그에 30을 등록해 주입해야 하며 리터럴을 박아서는 안 된다
    - **판단 지점(팀장 타당 판정)**: `decideRecompute`는 트리거가 T−30 윈도 이전(예: T−45분 조기 라인업 확정)이어도 킥오프 전이면 재산출을 허용한다 — 그 시점 최선 정보로 즉시 갱신하는 편이 낫기 때문. **최초 산출이 아직 없는 상태에서 재산출 트리거만 먼저 온 케이스**의 구분은 "이미 산출된 적 있는지" 상태가 필요해 순수 함수 밖(`worker.ts`) 몫으로 남겼다 — **33일차에 반드시 처리할 것**(누락 시 재산출이 최초 산출을 대신 여는 경로가 열린다)
  - [x] 워커·큐로 분리 가능한 인터페이스 구조 (NFR-SC-004) — **33일차 완료(3팀)**. `src/lib/odds/worker.ts`(신규) + `worker.test.ts`(17 tests), `runner.ts`에 `runIndexOffset` 파라미터 추가
    - **8분할이 결정론을 깨지 않는 것이 핵심 근거다** — `ODDS_PARAM.PARTITION_COUNT`(=8)로 MC 반복을 나누되 파티션마다 `runIndexOffset`을 누적해 시드 구간이 겹치지 않게 하고, `worker.test.ts:155`가 **"8분할 결과와 단일 호출 결과의 확률이 완전히 같다"**를 단언한다(팀장 직접 확인). 나머지는 앞쪽 파티션부터 1씩 분배해 합계가 항상 원래 총량과 같다
    - **큐 전환 지점을 `executeJob` 주입 하나로 좁혔다** — `runOddsComputeMatchMarket`이 잡 실행기를 주입받으므로 호출부 수정만으로 인프로세스→큐 컨슈머 전환이 가능하다(NFR-SC-004). 비동기 큐를 흉내낸 커스텀 `executeJob` 테스트가 동작 동일성을 보증한다
    - **32일차 `schedule.ts`가 남긴 상태 구분 몫을 흡수했다** — `decideOddsComputeAction` + `OddsComputeStateStore`가 "최초 산출이 아직 없는 대진에 재산출 트리거가 먼저 온" 케이스를 `INITIAL_VIA_RECOMPUTE`로 별도 판정한다(`schedule.ts`는 순수 함수라 상태를 못 들고 있었다)
    - **I-167 해소** — 리드타임 30을 리터럴로 박지 않고 `ODDS_PARAM.INITIAL_LEAD_MIN`(30)·`PARTITION_COUNT`(8)로 `catalog.ts`·`fallback.ts`에 정식 등록한 뒤 worker가 읽어 `schedule.ts`에 주입한다(NFR-CFG-001)
  - [x] 1차 표시 전용 모드 — 경기 카드·상세에 1X2 배당 표시, 베팅 버튼 비활성 (FR-BT-014) — **34일차 완료(3팀)**. `src/lib/odds/display.ts`(신규) + `display.test.ts`(9 tests). `toOddsDisplayPanel`(범용, 입력 키 순서 유지) / `toMatchOddsDisplayPanel`(1X2 전용, HOME→DRAW→AWAY 고정 순서). 반환 `OddsDisplayPanel = { format:'decimal', bettingEnabled:false, selections }`
    - **`bettingEnabled`를 리터럴 타입 `false`로 고정하고 override 파라미터 자체를 두지 않았다** — FR-BT-014 수용 기준 ②(베팅 제출 API 비노출)를 모듈 경계에서 타입으로 강제한다. `format`도 `'decimal'` 리터럴 고정(Q-03, 분수·미국식은 2차)
    - 확률 0으로 제외된 셀렉션은 `selectionOdds`에 키 자체가 없어 그대로 누락된다 — 0이나 placeholder로 채우지 않는다(FR-BT-005 일관)
    - **팀장 검증 지적 → 재수정**: 최초 구현이 `toFixed(2)`로 표시 문자열을 자체 생성했으나, 4팀 H-09 인계물 `src/i18n/format.ts:53`의 `formatOdds(odds, locale)`가 이미 있고 같은 파일이 "포인트/배당 단일 경유지 원칙"을 명시한다. ko/en 모두 소수점이 `.`이라 **자체 테스트 9건이 전부 통과했고 육안으로도 잡히지 않았다.** `display` 필드를 제거해 원시값만 반환하고 문자열화는 소비 측(컴포넌트)이 `formatOdds`로 수행하도록 전환 — `src/lib/odds/**`가 로케일을 모르는 순수 계층으로 남는다. 유한 양수 검증은 `assertValidDecimalOdds`로 분리 유지
  - [ ] 표시 형식은 decimal 고정(Q-03 기본 가정) + **로케일 숫자 서식 적용**(D-18), 2차 착수 전 Q-03 재확인
- **수락 기준**: 경기당 산출 ≤ 10초, 라운드 전체 ≤ 60초. KPI-4 — 1X2 Brier Score ≤ 0.21(1,000경기 누적).
  - **35일차 실측(3팀)**: 경기당 **~165~180ms**(MC_N_MATCH=3,000) / 라운드 전체(20팀 10경기) **~1.28초** — 둘 다 기준 대비 여유 큼. 33일차 `worker.ts` 주석의 추정(~1.5s/경기)보다 실측이 빠르며 상한 위반 방향이 아니다.
  - ⚠️ **KPI-4는 미확정** — 실측 **Brier 0.1701**(≤0.21)이 나왔으나, I-160(`MANAGER_STYLE_XG` 실값 미확정)을 회피하려 **테스트 전용 고정 픽스처 기반 self-consistency 추정치**(프리시뮬 N=800 확률 대 본경기 1회 실현, 30경기)로 산출한 것이다. "모델이 자기 자신과 일관적"임을 보인 것이지 **예측력 검증이 아니며 1,000경기 누적도 아니다.** 3팀이 파일 주석에 한계를 명시했고 회귀 고정 assertion(≤0.21)만 걸어 뒀다. **I-160 해소 후 실데이터로 재산출해야 최종 판정된다.**
- **테스트**: Vitest — 프리시뮬 시드 ≠ 본경기 시드, 확률 합 = 1, 오버라운드 검증. Playwright MCP — 경기 상세 배당 패널 표시 및 버튼 비활성 확인.
  - [x] Vitest 3종 — **35일차 완료(3팀)**. 27~29일차 `runner`/`match-market`/`overround.test.ts`가 이미 모듈별로 세 항목을 덮고 있어 **중복 없이 세 모듈을 잇는 통합 파이프라인 회귀 1건 + 성능·KPI 측정**으로 좁혔다(`src/lib/odds/pipeline-kpi.test.ts` 신규). 확률 합 검증도 부동소수 직접 비교가 아니라 `precision.ts` 기준. `vitest run src/lib/odds/` 9 files·96 tests 통과.

### Task 036: 1차 릴리스 통합 테스트와 재현성 검증을 수행한다

- **담당**: 1팀 코어·품질팀 / 지원: 전 6팀(SP-6 입회)
- **일정**: 69일차 ~ 74일차 (2026-10-23 ~ 2026-10-30) / 추정 5.0인일 / 담당 1팀 코어·품질팀 / **크리티컬 패스 종점 · M-4 1차 MVP 릴리스 판정**
- **근거**: NFR-QA-001~010, NFR-DT-002·003, FR-AD-004, KPI-1·3·6·8·9·11·12
- **구현 사항**
  - [ ] Vitest 스위트 완성 — 단위/스냅샷/분포/회계/구조/성능 6종 전부 기준 충족
  - [ ] 경기 재현(Replay) 도구 검증 — `match_id` + 상수 스냅샷으로 재실행 후 diff 0
  - [ ] 실데이터 기반 E2E — 월드 생성 → 라운드 진행 → 시즌 종료 → 프리시즌 → 다음 시즌 전체 사이클 완주
  - [ ] **Playwright MCP E2E 시나리오** — 관전 플로우 5종(라이브→경기상세→선수→클럽→순위표), 어드민 플로우 3종, **로케일 ko/en 각각 1회 반복**
  - [ ] 밸런스 리포트 생성 및 KPI-8 4지표 밴드 확인
  - [ ] 발견 이슈를 `docs/ISSUES.md`에 기록하고 담당 팀원에 배정
- **수락 기준**: 3단 머지 게이트 통과 + KPI-3 재현성 100% + KPI-6 커버율 100% + KPI-12 커버리지 라인 80%/브랜치 70%.

---

## Phase 4: 고급 기능 및 최적화

> **일정**: M-5 완료 목표 79일차 (2026-11-06) · M-6 버퍼 소진 한계 94일차 (2026-11-27) — 실행 구간 20~79일차 / Task 037~045

> **목표**: 2차 릴리스(배팅 오픈)를 완성하고 운영 품질을 확보한다. 3차 확장 지점을 준비한다.
> **완료 조건**: 인증·지갑·배팅·정산이 RLS 전면 적용 상태로 동작하고, 관측성·배포 파이프라인이 갖춰진다.

### Task 037: 인증과 사용자·지갑 기반을 구축한다 (2차)

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 49일차 ~ 53일차 (2026-09-25 ~ 2026-10-01) / 추정 4.0인일 / 담당 6팀 DB·인프라팀
- **근거**: UC-101, FR-EC-013, E-38~E-40, NFR-SEC-006·007
- **구현 사항**
  - [~] Supabase Auth 이메일 인증, 회원가입 시 프로필 + 지갑 자동 생성 — **51일차 부분 완료**(구 49일차). `auth.users` INSERT 트리거로 profile/wallet 자동생성 마이그레이션 2건 적용(`..._auth_profile_wallet_provisioning.sql`·`..._handle_new_user_restrict_execute.sql`, advisors 경고 REVOKE로 해소, 테스트유저 삽입/삭제로 실측). ⚠️ **이메일 인증 활성화 자체는 SQL 밖**(Auth 프로젝트 설정 — Dashboard/Management API 필요)이고 연결된 supabase MCP 툴셋에 해당 기능이 없어 **미수행 — 수동 조치 필요**
  - [~] `User` / `Wallet` / `WalletTransaction` 테이블 및 도메인 타입 활성화 (사용자 선호 로케일 필드 포함) — **52일차 부분 완료**. `profile.locale` 컬럼 추가(D-18, ko/en, default 'ko') + `wallet_transaction`(E-40) 신규 테이블(RLS 4종). `mapper.ts`에 `mapProfileRow`/`mapWalletRow`/`mapWalletTransactionRow` 추가, `database.types.ts` 재생성. `list_tables`로 3테이블 실존·`get_advisors` 신규 경고 0 확인. ⚠️ **도메인 `User`(betting.ts, 8일차 동결)에 선호 로케일 대응 필드가 없어 `mapProfileRow`가 `locale`을 드롭한다** — "선호 로케일 필드 포함"이 DB까지만 충족, 도메인 연결은 1팀 배치(**I-264**) 잔여. ⚠️ `wallet_transaction.ref_bet_id`는 E-36 bet 테이블 부재로 FK 미설정(2차 릴리스, I-100 계열)
  - [~] 지갑 차감·증액을 DB 트랜잭션 + 낙관적 잠금으로 처리 (이중 지출 방지) — **53일차 완료(동시성) / 멱등성 잔여**. `wallet.lock_version` CAS 컬럼 + `wallet_apply_transaction()` RPC 신설(마이그레이션 2건: `20260722064200_*` + ambiguous column 수정 `20260722064414_*`). **1콜 = 1트랜잭션**(41일차 `tick` 패턴 계승), 잔액부족/지갑없음/락소진을 SQLSTATE P0001/P0002/P0003으로 구분하고 엣지 함수가 409/404/503으로 매핑한다. RPC는 `REVOKE … FROM PUBLIC, anon, authenticated` + `GRANT TO service_role`. `supabase/functions/wallet/index.ts`는 검증 + RPC 호출만 하는 얇은 래퍼(**아직 배포하지 않았다** — 원격에 `tick`·`v01-cpu-bench-37d` 2종뿐). ⚠️ **낙관적 잠금은 동시성(lost update)을 막지 중복 요청을 막지 않는다** — 타임아웃 후 재전송이 두 번 다 반영된다. 멱등성 키는 **I-267**로 Task 037 잔여(호출자 0건이라 비차단, **적용된 마이그레이션 2건은 수정하지 말고 후속 마이그레이션으로 덧붙일 것**). ⚠️ 원격 적용이 팀장 사전 승인 없이 선행된 절차 이탈은 **I-269**(부작용 0건 확인 완료)
  - [x] 관리자 라우트 `/admin/**` 인증 + 역할 확인으로 전환 (NFR-SEC-007) — **54일차 완료**. ⚠️ **전제 정정**: "1차의 환경 플래그 보호를 대체"라는 일정 문구와 달리 **그 플래그 보호는 코드에 존재한 적이 없다**(`docs/wireframe/07-어드민-운영콘솔.md` W-45가 변수명·검증 위치를 미결로 남긴 채 방치 — 설계만 있고 구현 0건). 이번 변경 전 `/admin/**`은 **완전 무방비**였고 이 작업은 대체가 아니라 **신규 도입**이다. `src/proxy.ts`가 `/admin` 세그먼트(로케일 유무 무관, `startsWith`가 아닌 **세그먼트 등가 비교**라 `/administrator` 오탐 없음)를 쿠키 access token → `public.profile.role` PostgREST 조회 1회로 가드하고, 판정 불가(토큰 없음/PostgREST 비정상/네트워크 에러/env 미설정)는 전부 **fail-closed 403**. `@supabase/*` 미설치 유지(순수 `fetch`, 기존 REST 브리지 패턴) — JWT 서명·만료 검증은 PostgREST/GoTrue에 위임한다(시크릿이 `.env.local`에 애초에 없다). 세션 **발급** 경로가 앱 전체에 0건이라 검증만 넣으면 관리자도 영구 차단되므로 `src/app/api/admin/session/route.ts`(6팀 소유) 최소 발급 API를 함께 추가(POST 로그인 — `role≠ADMIN`이면 쿠키 미발급 / DELETE 로그아웃). 원격 조작 0건(I-269 준수). ⚠️ **팀장 검증에서 차단성 결함 1건 검출 → 같은 일차 해소(I-270)**: 프록시는 라우트 경로만 막으므로 5팀 `actions.ts`의 Server Action이 인가 없는 쓰기 진입점으로 남아 있었다(Next.js 16 공식 문서 `data-security.md` L291·L339·L368 *"a page-level authentication check does not extend to the Server Actions defined within it"*). 인가 판정을 `src/app/api/admin/auth.ts`로 추출해 `isAuthorizedAdminToken`/`assertAdminSession`을 단일 소스화하고 `proxy.ts`·`session/route.ts` 중복을 제거, 5팀이 액션 3함수 전부에서 재검증하도록 배선했다. ⚠️ `matcher`가 `api`를 제외하므로 55~59일차 `api/admin/**` service-role 라우트는 이 가드를 거치지 않는다 — 각 핸들러가 `assertAdminSession()`을 직접 호출할 것(**I-271**). ⚠️ `src/proxy.ts`는 4팀 단독 소유인데 일정표가 6팀에 배정한 소유 공백(**I-272**, 되돌리지 않음)
  - [x] 테스트 계정 2종으로 로그인·지갑 생성 검증 — **55일차 완료**. `chopin0625@gmail.com`·`0625chopin@gmail.com`을 GoTrue `/auth/v1/signup`으로 신규 생성(기존 0건 확인 후)했고, 51일차 트리거가 `profile`(display_name/role=USER/locale=ko)·`wallet`(balance=0/POINT/lock_version=0)을 자동 생성함을 SELECT로 확인. ⚠️ 최초 로그인은 `email_not_confirmed`(400)로 차단됐다 — 51일차부터 이어진 **Dashboard 수동 조치 영역**(MCP 툴셋에 기능 없음)이 재현된 것. **사용자 승인을 받아** `auth.users.email_confirmed_at`을 두 행 한정 UPDATE(before 둘 다 null)한 뒤 **두 계정 다 로그인 PASS**, 지갑 조회까지 왕복 완료. **RLS 격리 확증** — 각 사용자 토큰으로 `wallet` 조회 시 정확히 본인 1행만 반환(상대방 행 노출 0건). ⚠️ 앱 UI 경로가 아니라 REST 직접 호출로 검증했다 — `/ko/login`·`/ko/signup`이 **404**이고 `/ko/my/wallet`은 Task 005 placeholder이기 때문(**I-277**, 인증 화면은 2차 릴리스라 현 시점 정상)
- **수락 기준**: 동시 100건 부하에서 잔액 불일치 0건. — **53일차 실측 충족**. 임시 auth 유저로 TOPUP 100000 후 원격 PostgREST RPC에 `BET_PLACE −10` **100건 동시 HTTP 요청** → 100/100 성공, 최종 `balance` 99000 = `lock_version` 101 = 원장 101건(중복 0)이 **전부 일치**. 테스트 잔여물은 `auth.users` cascade 삭제 후 4테이블 count 전건 0으로 재확인. ⚠️ 이 기준은 각 요청이 **서로 다른 의도**임을 전제하므로 충족은 정당하나, "이중 지출 방지"의 나머지 절반(중복 요청 멱등성)은 **I-267**로 남는다.
- **테스트**: Playwright MCP — 회원가입 → 로그인 → 지갑 조회 플로우, 비인가 `/admin` 접근 차단. — **54일차 「비인가 `/admin` 차단」 실측 충족**(신규 28건: `auth.test.ts` 11 + `proxy.test.ts` 11 + `session/route.test.ts` 6 — `proxy()`/`POST`/`DELETE` 실함수 직접 호출로 403·하위경로 가드·fail-closed 4종·ADMIN 통과·기존 로케일 리다이렉트 회귀 0을 단언). Playwright가 아니라 자동화 테스트로 대체했다 — 공유 dev 프로세스·`distDir`을 건드리지 않기 위한 의도적 선택. ⚠️ 반대 방향(**인가 통과** 경로)은 원격 `public.profile`이 **0행**이라 실측 불가 — 회원가입·로그인 플로우와 함께 **I-274**로 남는다(테스트 관리자 계정 생성은 되돌리기 어려운 공유 자원 변경이라 사용자 승인 대기) → **55일차 해소**. 사용자 승인 후 `0625chopin`에 `profile.role='ADMIN'`을 부여(1행 한정)하고 Playwright + curl로 **양방향 실측 완료**: 무인증 `/ko/admin` **403** · 비ADMIN 로그인 **403 `not_admin`** · ADMIN 로그인 **200 + 세션 쿠키 발급** · `/ko/admin` **200 렌더**(G1~G6 전량, 오류 마커 0). 회원가입 → 로그인 → 지갑 조회 플로우도 같은 일차에 전 구간 통과(위 구현 사항 참조). **현재 `profile`은 ADMIN 1 · USER 1**

### Task 038: RLS를 전면 적용하고 액터별 권한 경계를 분리한다 (2차)

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 54일차 ~ 57일차 (2026-10-02 ~ 2026-10-07) / 추정 3.5인일 / 담당 6팀 DB·인프라팀
- **근거**: NFR-SEC-003·004·008·010·012, DC-05, 02문서 액터 권한 매트릭스
- **구현 사항**
  - [ ] 액터 6종(게스트/배터/운영자/엔진/배당산출기/정산기)별 RLS 정책 정의
  - [ ] 베팅·지갑은 `user_id = auth.uid()` 제한, 엔진 쓰기는 서비스롤 전용
  - [ ] 감사 테이블(`audit_log`, `common_code_history`, 베팅 감사) append-only 강제
  - [ ] 전 API 입력 스키마 검증(400 응답), 레이트 리밋(베팅 30/분, 공개 300/분)
  - [ ] 정책 테스트 스위트 — 액터별 허용·거부 케이스 전건
- **수락 기준**: 정책 테스트 전건 통과. `get_advisors` 보안 경고 0건.

### Task 039: 배팅 마켓·베팅 슬립·내 베팅 화면을 구현한다 (2차)

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 1팀 코어·품질팀 / 지원: 3팀(배당 반환 계약)·6팀(인증·지갑)
- **일정**: 60일차 ~ 67일차 (2026-10-12 ~ 2026-10-21) / 추정 6.0인일 / 담당 5팀 화면·배팅UX팀 / ⚠️ **L-02 법률 검토 게이트 미통과 시 60일차 착수 불가**
- **근거**: FR-BT-001~004·009·010·014, FR-UI-015~017, E-33~E-37, D-18, Q-03
- **구현 사항**
  - [ ] 마켓 스코프 3종(경기/시즌/토너먼트) 및 마켓 타입 정의, `BetMarket → BetSelection → Odds` 이력 구조
  - [ ] `/bet` 마켓 목록 — 스코프 탭, 마켓 카드, 배당 버튼, 마감 카운트다운
  - [ ] 전역 베팅 슬립 — 셀렉션 최대 10, 스테이크 입력, 총 배당·예상 수익, 상관 조합 차단
  - [ ] 스테이크 제한(최소 100 / 단일 최대 100,000 / 멀티 수익 상한 1,000,000)
  - [ ] `/my/bets` — 진행중/정산완료/보이드 탭
  - [ ] 마켓·셀렉션 표시명 번역 카탈로그 확장, 배당·금액 로케일 서식 (D-18). Q-03(표시 형식) 최종 확인
  - [ ] 4상태 및 인라인 에러(마감/잔액 부족/상관 조합)
- **수락 기준**: 마감까지 남은 시간과 배당 변동을 인지하고 30초 내 베팅 완료 가능(PS-3 성공 신호).
- **테스트**: Playwright MCP — 마켓 탐색 → 슬립 작성 → 제출 → 내 베팅 확인 전체 플로우.

### Task 040: 베팅 제출·정산·보이드 엔진을 구현한다 (2차)

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 1팀 코어·품질팀 / 지원: 6팀 DB·인프라팀
- **일정**: 68일차 ~ 73일차 (2026-10-22 ~ 2026-10-29) / 추정 4.5인일 / 담당 5팀 화면·배팅UX팀
- **근거**: FR-BT-007·010~013, FR-AD-008, NFR-QA-007, NFR-SEC-005, KPI-7
- **구현 사항**
  - [ ] 마감 규칙 — 킥오프 / 최종 라운드 킥오프 시 `OPEN → CLOSED` 전이, 마감 경합 처리
  - [ ] 제출 시 **서버 저장 배당으로 재검증** → 불일치 시 `ODDS_CHANGED` 거부, `Bet.odds_snapshot` 동결
  - [ ] 결과 확정 시 셀렉션 판정 → 베팅 상태 전이 → 지갑 반영 (멱등)
  - [ ] 보이드 — 스테이크 전액 환불 및 사유 기록, 운영자 수동 정산/보이드(FR-AD-008)
  - [ ] 베팅 감사 로그 append-only (배당 스냅샷·결과 근거)
- **수락 기준**: KPI-7 — 오정산 0건, 정산 지연 p95 ≤ 30초. 정산 2회 실행 시 지갑 반영 1회.
- **테스트**: Vitest — 마켓 타입별 결과 케이스 각 5종, 멱등성, 보이드 환불 100%. Playwright MCP — 정산 후 상태 표시 확인.

### Task 041: 사후 배팅 차단과 침투 테스트를 수행한다 (2차)

- **담당**: 1팀 코어·품질팀 / 지원: 5팀(040 대상 코드)·6팀(RLS 정책 대상)
- **일정**: 75일차 ~ 79일차 (2026-11-02 ~ 2026-11-06) / 추정 4.0인일 / 담당 1팀 코어·품질팀 / **M-5 판정**
- **근거**: FR-BT-008, FR-MT-016, NFR-SEC-004, NFR-DT-006, R-11
- **구현 사항**
  - [ ] 공개 API가 경과 시간 이후 이벤트를 절대 반환하지 않음을 서버에서 강제(클라이언트 시계 미신뢰)
  - [ ] 종료 전 최종 스코어 필드 null 응답 검증
  - [ ] 원시 테이블 직접 조회 RLS 차단 검증
  - [ ] **침투 테스트 시나리오 5종** — 원시 테이블 직접 조회 / 시간 파라미터 조작 / 프리시뮬 결과 역산 / 마감 직후 제출 / 배당 조작 제출
  - [ ] 프리시뮬-본경기 결과 상관계수가 확률적 기대치를 넘지 않음 확인(1,000경기)
- **수락 기준**: 침투 시나리오 5종 전건 차단. 킥오프 T+1분 시점 응답에 T+2분 이후 이벤트 0건.
- **테스트**: Playwright MCP + API 직접 호출 — 시간 필터 우회 시도 전건 차단 확인.

### Task 042: 성능·캐싱·데이터 볼륨 대응을 최적화한다

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀 / 지원: 2팀 시뮬레이션엔진팀(엔진 병목 분석)
- **일정**: 58일차 ~ 62일차 (2026-10-08 ~ 2026-10-14) / 추정 4.0인일 / 담당 6팀 DB·인프라팀
- **근거**: NFR-PF-008~014, NFR-SC-001·002·005, NFR-CFG-006, R-12, DC-06
- **구현 사항**
  - [ ] 10시즌 데이터(이벤트 75만·스탯 35만) 적재 후 API 응답 기준 재검증
  - [ ] `match_event` 파티셔닝 또는 아카이브 전략 구현 (3시즌 초과분 콜드 스토리지)
  - [ ] 공통코드 캐시 — 히트 < 1ms / 미스 < 50ms, 무효화 경로 검증
  - [ ] 라이브 폴링 부하 — 동시 500명 기준 CPU ≤ 70%, 필요 시 Realtime 전환 검토
  - [ ] 상수 스냅샷 저장 오버헤드 ≤ 5ms/경기
  - [ ] 성능 회귀 테스트를 CI에 편입 — 기준 대비 20% 저하 시 실패
- **수락 기준**: NFR-PF 14개 항목 전건 충족. 10시즌 적재 후에도 p95 ≤ 300ms 유지.

### Task 043: 관측성·밸런스 리포트·이상 탐지를 구축한다

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀 / 지원: 6팀 DB·인프라팀
- **일정**: 39일차 ~ 42일차 (2026-09-11 ~ 2026-09-16) / 추정 3.5인일 / 담당 3팀 데이터·밸런싱·배당팀
- **근거**: NFR-OB-001~005, FR-AD-007·009, KPI-1·8
- **구현 사항**
  - [~] 구조적 JSON 로깅 — 레벨·타임스탬프·상관 ID(`season`/`match_id`) *(39일차 — `src/lib/obs/logger.ts`(신규) `createLogger(correlation, options?)`. **무맥락 로그 경로를 타입에 두지 않아** 상관 ID 보유를 API로 강제하고, 빈 `correlation`은 **로거 생성 시점에** throw(로그 시점이 아니라 — 원인 추적 용이). `child()`로 시즌→경기 컨텍스트 확장(부모 병합, 자식 우선). `Clock` 주입 가능 — `obs`는 NFR-DT-001 대상이 아니지만 sim이 실수로 import했을 때의 피해 반경을 줄이려는 안전판이며 **"sim에서 import 금지"를 주석에 명시**. `"use client"` 미부착 — 서버 컴포넌트가 client 모듈의 *값*을 import하면 조용히 빈 값이 되는 38일차 함정 회피. 테스트 7건)*
    - ⚠️ **소비처 배선 미이행 → I-202.** 11일차 `fallback.ts`가 남긴 "39일차 `obs/logger.ts` 생기면 교체" 인계 메모가 미이행이라 여전히 `console.warn` 직접 호출이다. 수락 기준 "전 로그가 상관 ID 보유"는 **API 차원에서는 충족, 저장소 전체 호출부 기준으로는 미충족** — 배선 팀·일차 지정 필요
  - [~] 6개 핵심 메트릭 수집 및 `/admin` 대시보드 노출 *(40일차 — `src/lib/obs/metrics.ts`(신규). NFR-OB-002 6종을 **원문 나열 순서 그대로** 고정하고, `createMetricsRecorder()`가 종류별 링버퍼(기본 500)로 수집 → `snapshot()`이 6필드 고정 `MetricsSnapshot` 반환. `count === 0`이면 통계 필드 전부 `null`이라 "빈 상태"와 "0값"이 구분된다. `Clock` 주입형(logger와 동일 패턴). 테스트 9건)*
    - ⚠️ **계약만 고정, 실 계측 호출부·`/admin` 대시보드 모두 미착수.** 소비처가 2팀(sim 소요)·6팀(크론·정산)·라우트(API 지연)·5팀(대시보드)로 갈려 **일차·팀 지정 필요**
  - [~] 시즌 종료 시 밸런스 리포트 자동 생성 — 승점 분포·부상률·이적률·부도율·OVR 분포·재정 건전성·평균 득점 *(41일차 — `src/lib/obs/balance-report.ts`(신규) `generateBalanceReport` 순수함수. 승점·OVR 히스토그램, 부상률·이적률(분모 = 팀 `squadSize` 합), 부도율·재정 건전성(`balance`/`net`/`wageRatio`), 평균 득점(매치 정규화)에 **KPI-8 4지표**(부도율·재강등률·평균 득점·홈 승률) 밴드 판정까지 포함. 재강등률은 호출자가 `TeamSeason × Season` 조인 투영(`PromotionRecord`)을 넘기는 구조로 **순수성 유지**. 테스트 9건)*
    - ⚠️ **"시즌 종료 시 자동 생성" 배선 미이행 → I-208.** `metrics.ts`와 같은 함정을 피하려 파일 상단 주석에 소비처 4곳을 명시해 뒀으나, **시즌 종료 이벤트에서 실제로 호출하는 코드가 없다.** 수락 기준 "시즌마다 리포트 1건"은 **함수 차원 충족, 자동 생성 기준 미충족**
  - [~] 이상 탐지 알림 — 라운드 누락, 시뮬 지연, 부도율 초과, 정산 실패 *(42일차 — `src/lib/obs/alert.ts`(신규, 테스트 21건). 4종 순수 detect + `evaluateAlerts` 조합기, 시즌별 `AlertHistory.compare()`(→ 수락 기준 "시즌 간 비교 조회" 충족), `computeSystemHealth()`가 `{status: 'ok'|'degraded', reasons}` 반환(→ "크론 중단 시 degraded" 계약 확정))*
    - ⚠️ **입력 3종을 아직 아무도 공급하지 않는다 → I-218.** 크론 하트비트(6팀)·실계측 metrics·KPI-8 실산출이 전부 미배선이고, 소비처인 `/api/health`(6팀)·`/admin` 대시보드(5팀)도 없다. **`/admin`이 없는 한 관측 결과를 볼 곳 자체가 없어 5팀 일차 배정이 선행 조건**
  - [x] 공통코드 폴백 발생 시 WARN + 콘솔 카운터 — 42일차 3팀이 `alert.ts`의 `createFallbackWarnRecorder`를 만들고 **`config/fallback.ts`에 직접 배선까지 완료**(그룹별 최초 1회만 `console.warn`, 이후 카운트만 누적). 계약만 만들고 호출부를 남기지 않은 39~41일차 패턴(I-208)을 스스로 끊은 사례
    - ✅ **전제였던 I-206이 42일차에 해소됐다** — 41일차엔 이 경고가 dev 로그에 45건씩 쏟아져 카운터가 상시 노이즈를 세는 상태였다. 1팀(등록 배선 `registerConstantSource`+`bootstrapApp` 승격)·3팀(mock 소스, 순환 회피)·6팀(supabase 소스) **세 팀이 조각을 나눠 하루에 닫았고**, 팀장 실측으로 **경고 45건 → 0건**, `loadConstants('UI_PARAM')`이 안전망 30000이 아닌 **시드값 5000** 반환을 확인했다(폴링 5초 실적용)
- **수락 기준**: 시즌마다 리포트 1건 자동 생성, 시즌 간 비교 조회 가능. 헬스 체크가 크론 중단 시 `degraded` 표시.

### Task 044: 배포 파이프라인과 CI 게이트를 구축한다

- **담당**: 1팀 코어·품질팀 / 지원: 6팀 DB·인프라팀(요금제·크론 비용 입력)
- **일정**: 20일차 ~ 23일차 (2026-08-17 ~ 2026-08-20) / 추정 3.5인일 / 담당 1팀 코어·품질팀
- **근거**: NFR-QA-001·010, NFR-MT-005, NFR-SEC-011, D-18, KPI-11
- **구현 사항**
  - [ ] CI 파이프라인 — `tsc --noEmit` + `lint` + `test` + coverage 임계 + 시드 스냅샷 검증 + **번역 키 누락 검사**
    - [x] **3단 게이트 CI 실행 — 20일차 완료(1팀)**: `.github/workflows/ci.yml` 신규. push·PR(master) → ubuntu-latest → `checkout@v4` → `setup-node@v4`(node 20, npm 캐시) → `npm ci` → **`npm run gate` 단일 호출**. 로컬 게이트와 CI가 갈라지지 않도록 스텝을 개별 나열하지 않고 `scripts/gate.sh`(I-117)를 그대로 재사용한다. WSL EPERM(I-62) 때문에 `next build`는 미포함. 로컬 `npm run gate` 통과 확인 — tsc 0 error / lint 0 error(경고 111건은 D-18 기지 상태, I-116) / coverage **lines 98.05%·branches 92.14%**(임계 80/70 상회)
      - **팀장 검증 결함 A — `check:literals` 게이트 미연결(해소)**: Task 024 수락 기준이 "숫자 리터럴 0건 **(CI 검증)**"인데 `gate.sh`·`ci.yml` 어디에도 `npm run check:literals`가 없어, **19일차에 막 해소한 I-117과 같은 결함 계열**(스크립트는 있는데 게이트가 안 부름)이었다. 다만 현재 exit 1·후보 55건이 **전부 기존 파일**이고 스크립트 자신이 휴리스틱 후보라고 명시하므로 blocking은 오답 — `ci.yml`에 **비차단 advisory 스텝**(`check literals (advisory)`, `continue-on-error: true`)으로 추가하고 **`gate.sh`는 미변경**(로컬 머지 게이트는 fail-fast 3단이 정본). I-115 allowlist 정리 후 blocking 승격이 최종 목표임을 주석에 명시. **⚠️ CI는 아직 GitHub Actions 러너에서 실행된 적이 없다** — 로컬 검증은 YAML 파싱 + `npm run gate`까지이며 첫 실행 결과 확인은 21일차 몫
    - [x] **시드 스냅샷 갱신 차단 + 번역 키 누락 검사 — 21일차 완료(1팀). 스크립트 신설 없이 기존 게이트 강화로 충족**
      - **번역 키 누락 검사: 별도 스크립트를 만들지 않았다.** 4팀 `keys.ts`의 재귀 조건부 타입 + en 8파일의 `: XMessages` 타입 주석 덕분에 **`tsc`가 이미 missing/excess 키를 잡는다**는 것을 실측으로 확인했다(en에서 키 삭제 → **TS2741**, 없는 키 추가 → **TS2353**). gate 1단계(`tsc --noEmit`)가 이미 커버하므로 중복 구현을 회피한 판단이다. 다만 이 검사가 "en 파일이 `: XMessages` 주석을 유지한다"는 **관례에만 의존하고 중앙 강제 장치가 없다**는 구멍이 남아 있고, `src/i18n/**`가 4팀 소유라 직접 반영하지 않고 제보만 했다 → **I-120**
      - **시드 스냅샷**: vitest 4.1.10이 std-env `isCI` 감지로 CI에서 이미 `updateSnapshot="none"`이 기본값임을 `node_modules` 소스로 확인하고, 스냅샷을 고의 변조한 뒤 `CI=true npx vitest run`으로 **실패 + 파일 미변경을 재현**했다. 이 **암묵적 기본값에 의존하지 않도록** `ci.yml`의 gate 스텝에 `env: UPDATE_SNAPSHOT: none`을 명시 고정했다(신규 로직이 아니라 기존 동작을 diff로 드러낸 것)
    - [x] **시크릿 스캔 — 22일차 완료(1팀)**. 잔여(Edge Function 배포·롤백 문서화 · 환경 분리)는 23일차
    - [x] **CI 첫 실행 결과 확인 — 23일차 완료(1팀). 3일간의 블로커 해소** — `gh` CLI가 없어도 **repo가 public이라 `curl https://api.github.com/repos/0625chopin/football/actions/runs`로 실행 상태를 조회할 수 있다**(로그 다운로드만 admin 토큰 필요, 403 실측). 확인 결과 **CI가 3회 연속 failure**(`3500814`/`f3d2f47`/`d30da33`)였고, 로컬 `npm run gate` 재현으로 원인을 3단계(`test:coverage`)의 `src/lib/data/supabase/client.ts`·`index.ts` **커버리지 0%**(6팀 22일차 034a 산출물)로 특정했다. 절차는 `deploy-runbook.md` §4.2에 기록
  - [x] 위반 시 머지 차단, 스냅샷 무단 갱신이 diff로 드러나도록 구성 — 스냅샷 부분은 21일차 완료. **머지 차단은 미충족**: 브랜치 보호 규칙이 없어 위 3회 실패가 머지를 막지 못하고 master에 누적됐다 → **I-131(사용자 판단 대기)**. 게이트 자체는 정상 동작했다(회귀를 정확히 지목)
  - [x] 시크릿 스캔(커밋 히스토리 포함) 및 클라이언트 번들 서비스롤 키 grep 검사 — **22일차 완료**(`.github/workflows/secret-scan.yml` 신규, push·PR(master) 트리거 2 job). job1: **gitleaks CLI 바이너리를 직접 설치**해 `detect --source . --log-opts="--all" --redact --exit-code 1` + `fetch-depth: 0`으로 커밋 히스토리 전체 스캔 — 마켓플레이스 액션(`gitleaks-action` v2)은 조직 사용 시 `GITLEAKS_LICENSE`를 요구하나 스캐너 본체는 MIT라 **라이선스 의존을 회피**했다. job2: `npm run build` 후 `.next/static`을 `SUPABASE_SERVICE_ROLE_KEY|service_role`로 grep. 로컬 gitleaks 실행 **35 commits 스캔 0건**(수락 기준 "시크릿 스캔 0건" 충족), `.env.local` gitignore 적용 확인(팀장)
    - **`SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두사가 없어 정상 경로로는 클라이언트에 인라인되지 않는다** — job2는 실수로 접두사를 붙이거나 값을 하드코딩하는 **회귀를 잡는 방어용**이다. WSL은 `next build` 최종 `copyfile`이 EPERM으로 죽지만(I-62) 정적 청크는 그 이전에 생성돼 grep 로직 자체는 로컬 확인했고, 실제 게이트 판정은 ubuntu-latest 러너가 한다
    - **추가(팀장 지시, 21일차 결함 A 재발 방지)**: `eslint.config.mjs`에 `no-restricted-imports`로 **프로덕션 코드의 `@/lib/mock/**` import를 정적 차단**. 예외는 `src/lib/mock/**` 자신·`src/lib/data/mock/**`(DataSource 계약상 Mock 구현)·테스트 파일뿐이다. Mock↔실데이터 교체(Task 034)의 전제가 "Mock을 걷어내도 프로덕션 어댑터가 안 깨진다"이므로 문서가 아니라 룰로 고정했다. 팀장 확인: 프로덕션 코드의 `@/lib/mock` import **잔존 0건**
  - [x] Edge Function 배포·롤백 절차 문서화, Supabase 요금제·크론 주기 비용 산정(팀원 3 예산안 입력) — **23일차 완료(1팀, 6팀 입력)**. `docs/deploy-runbook.md` §3. 요금제는 **Pro $25 + Vercel Hobby $0**로 시작(Free는 DB 500MB가 ~25일차에 소진되고 크론 상시 실행 D-04 때문에 개발 단계에서도 불가), 승급 트리거 3단계, 단계별 총액 $26→$51→$120. **핵심 제약은 요금이 아니라 Edge Function CPU 2초/호출**(요금제 무관 하드 리밋)이며 NFR-PF-003이 이미 75%를 소모해 catch-up 상한 **50→30경기 하향**을 문서에 반영했다(코드 반영 미착수 → **I-134**)
  - [x] 환경 분리(로컬/스테이징/프로덕션) 및 마이그레이션 적용 순서 규약 — **23일차 완료(1팀)**. `deploy-runbook.md` §1·§2. 실측으로 두 가지 전제가 뒤집혔다: **① 스테이징 미구축**(`list_branches` 실패, Supabase 브랜칭 미가용 → I-133)이라 §1.1 임시 규약을 정규 절차로 격상했고, **② 로컬 마이그레이션 2파일 vs 원격 19건 적용**(17건 미커밋)이라 **git으로 스키마 재현이 불가**해 §2 절차의 신뢰 범위를 "신규 마이그레이션 한정"으로 명시했다(→ I-132, 동기화에 자격증명 필요)
- **수락 기준**: CI에서 3단 게이트가 실제로 실패를 잡아낸다. 시크릿 스캔 0건. — **23일차 충족(실측)**. 게이트가 6팀 커버리지 0% 회귀를 실제로 잡아냈고(위 CI 첫 실행 확인 참조), 해소 후 `npm run gate` 전체 통과를 팀장이 재현했다. **Task 044 종료.**

### Task 045: 3차 확장 지점을 준비한다

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 69일차 ~ 71일차 (2026-10-23 ~ 2026-10-27) / 추정 2.0인일 / 담당 6팀 DB·인프라팀
- **근거**: NFR-SC-002·003·004, FR-EC-013(W), D-15, D-18, Q-10~Q-12, 6.2절 3차 범위
- **구현 사항**
  - [ ] 리그4 확장 검증 — 리그 4개 설정으로 월드 생성 성공(코드 리터럴 0건 전제)
  - [ ] 아카이빙 자동화 설계 및 아카이브 경기 조회 폴백
  - [ ] 캐시 충전·지갑 화면 자리 확보(비활성 플래그), 인플레이 배팅 구조 영향 분석 메모
  - [ ] **다중 월드 확장 여지 메모** — D-15로 현재 범위 밖이나, 도입 시 스코핑 컬럼·쿼리 파급 범위를 1페이지로 기록
  - [ ] 3차 로케일 추가 절차 문서화 — 카탈로그 파일 추가만으로 확장되는지 검증 (D-18)
  - [ ] 관중·티켓 수입(Q-12), 컵 추가 보상 트랙(Q-10), 겨울 이적창(Q-11) 도입 시 영향 범위 정리
- **수락 기준**: 3차 착수 시 구조 변경 없이 기능 추가만으로 진행 가능함이 문서로 확인된다.

---

## 병행 트랙: 사업·기획 (팀원 1~3) ✅ 1차 완료

> 개발 Phase와 독립적으로 진행된다. **2026-07-20 3인 전원 1차 조사 완료.** 재검토(M-B3)는 2차 릴리스 착수 전.

| Task | 제목 | 담당 | 산출물 | 개발 접점 | 상태 |
|---|---|---|---|---|---|
| **Task 901** | 시장 규모와 타겟 고객을 조사한다 | 팀원 1 | `docs/business/01-market-research.md` (460줄) | 로케일 우선순위 `ko→en→pt-BR→ja→es`, **zh-CN 제외** → Task 011·015 / PS-3 재정의 권고(I-11) | ✅ 완료 |
| **Task 902** | 경쟁사와 차별화 전략을 분석한다 | 팀원 2 | `docs/business/02-competitor-analysis.md` (502줄) | **시즌 마켓을 간판 상품으로** 승격, 선수 프롭은 3차 이월 → Task 039 / 라운드 오프셋(I-12) → Task 025 | ✅ 완료 |
| **Task 903** | 예산안과 손익 분기점을 수립한다 | 팀원 3 | `docs/business/03-budget-plan.md` (747줄) | 크론 1분 유지·처리상한 30경기(I-09) → Task 033 / `MC_N_SEASON` 1,500 + 5라운드 주기(I-08) → Task 035 / 아카이빙 30시즌(I-07) → Task 042 | ✅ 완료 |

### 조사 결과가 개발에 미치는 변경 — **착수 전 반영 필수**

| 항목 | 내용 | 대상 Task |
|---|---|---|
| ~~**V-01** 차단성 검증~~ | ✅ **통과(37일차 실측)** — 30경기 핸들러 9.5~13.2ms / 게이트웨이 종단 111~162ms, 2초 한도 대비 마진 91.9%+. `D-04`·`AS-14` 유효, R-B 해소. **단 순수 CPU만 측정 → I/O 포함 재실측 I-196** | ~~Task 033 착수 전~~ → **해소** |
| **V-02** 차단성 검증 | 배당 시뮬 1회 ≤3.3ms 경량 모델 가능 여부. 풀 엔진은 `NFR-PF-004`의 **15배**. 실패 시 **배당 기능 불성립** | **Task 035 착수 전** |
| **L-02** 규제 | 시행령 개정(스포츠 베팅 게임 → 웹보드게임)으로 **3차 캐시 충전 비권고**. 2차 착수 전 법률 검토 게이트 | 2차 착수 전 |
| **I-13** 운영 원칙 | **세계를 리셋하지 말 것.** 누적 시즌 히스토리가 유일한 강한 해자이며 시간으로만 쌓인다 | **지금부터** |

> 상세는 `docs/ISSUES.md` 3.1·4·5절 참조.

---

## FR 그룹 ↔ Task 커버리지 매트릭스

| FR 그룹 | 영역 | 커버 Task |
|---|---|---|
| **FR-LG** (17) | 리그·시즌·대진표·순위·승강 | 025, 026, 027, 028 |
| **FR-MT** (16) | 경기 시뮬레이션 엔진 | 023, 024, 026 |
| **FR-PL** (16) | 선수 | 007, 018, 024, 028, 030 |
| **FR-TM** (10) | 클럽·감독·전술·스쿼드 | 007, 018, 024, 029, 030 |
| **FR-TR** (12) | 이적·계약·임대·트레이드 | 019, 030 |
| **FR-EC** (13) | 포인트 경제·스폰서·재정 | 027, 028, 029, 037 |
| **FR-YT** (6) | 유소년·은퇴·세대교체 | 019, 028, 030 |
| **FR-AW** (6) | 수상 | 019, 028 |
| **FR-ST** (5) | 통계/지표 | 018, 019, 026 |
| **FR-BT** (14) | 배팅 | 035, 039, 040, 041 |
| **FR-UI** (26) | 화면 | 005, 011, 012~022 |
| **FR-AD** (22) | 관리·공통코드·크론 | 003, 006, 021, 031, 033, 043 |

---

## 상태 요약

| Phase | Task 수 | 완료 | 진행 | 대기 |
|---|---|---|---|---|
| Phase 1 골격 | 11 (001~011) | 0 | 0 | 11 |
| Phase 2 UI | **14** (012~022, **046~048**) | 0 | 0 | **14** |
| Phase 3 기능 | 14 (023~036) | 0 | 0 | 14 |
| Phase 4 고급 | 9 (037~045) | 0 | 0 | 9 |
| 사업 트랙 | 3 (901~903) | **3** | 0 | 0 |
| **합계** | **51** | **3** | **0** | **48** |

**즉시 착수 Task (- 우선순위)**: 001, 002, 003, 004, 006, 008, 011, 012, 013, 014
**블로킹 게이트**: **없음** — D-15 ~ D-20으로 1차 릴리스 전 단계의 선행 결정이, **D-21 ~ D-26으로 구현 세부 규칙(구 I-01~I-06)이** 전부 해소됐다. 잔여 미결 4건(Q-03·Q-10·Q-11·Q-12)은 2차 릴리스 이후 사항이다.

---

## 일정 요약 (동기화)

> 출처: [`docs/team-schedule/`](docs/team-schedule/README.md) — **일정·배정의 단일 소스**. 아래는 그 반영본이며, 값이 어긋나면 일정 문서가 옳다.
> 동기화 일자 **2026-07-20** / **최종 갱신 2026-09-25(49일차) — I-223 인덱스 화면 3종 정식 배정** / 적용 인원 **N = 6팀** / 시작일 **2026-07-21(화) = 1일차**

### 49일차 갱신분 (I-223 — 인덱스 화면 3종 Task 046~048 신설)

| 일차 | 팀 | 반영 내용 | 추정 | Task |
|---|---|---|---|---|
| **50~51** | 4팀 UI기반·i18n | `/playoffs` 인덱스 신설 + 내비 `playoffs` `pending` 제거 (48~59일차 대기 구간 사용) | 1.0인일 | **048** |
| **≤59** | 4팀 UI기반·i18n | 5팀 047용 `match.list.*` 키 골격 선제 생성(구조 소유 4팀) | 0.1인일 | **048** |
| **60** | 5팀 화면·배팅UX | `/teams` 구단 목록 신설 (021 종료 ~ 039 착수 사이 2일 공백 사용) | 0.75인일 | **046** |
| **61** | 5팀 화면·배팅UX | `/matches` 일정/결과 인덱스 신설(축소 스코프 — 라이브 + 다음 킥오프 + 리그·라운드 폼) | 0.9인일 | **047** |
| **62** | 4팀 UI기반·i18n | H-28 수신 후 `matches`·`teams` `pending` 제거 → **내비 `pending` 잔여 0건** | 0.1인일 | **048** |

- **마일스톤·종료일 불변** — 3종 전부 65일차 이전에 끝나 M-3·M-4·M-5 모두 이동 없음. **크리티컬 패스(74 영업일)에 얹히지 않는다.**
- **왜 5팀에게 60~61일차인가** — `matches`·`teams`는 **5팀 소유 경로**라 다른 팀이 만들 수 없고, 5팀은 49~59일차가 슬랙 0(018→021)이며 62일차부터 039(H-18 대기)다. 그 사이 **2일이 5팀의 유일한 실공백**이다.
- ⚠️ **5팀 60~61일차 가용 1.6인일 대비 배정 1.65인일 — 0.05인일 초과(감수).** 4팀이 i18n 골격을 선제 제공해 0.15 → 0.05로 줄인 결과다. **021(59일차)이 하루라도 밀리면 046·047은 1순위 이월 대상**이며, 아무도 이 두 화면을 기다리지 않으므로 CP 흡수 완충으로 쓴다.
- ⚠️ **4팀 62일차 소급 0.1인일** — 022의 산술 여유가 −0.2 → **−0.3인일**이 된다. 4팀 48~59일차 대기 구간(12일 중 2.1일만 사용, 잔여 약 9.9일)의 선행 감사 버퍼로 흡수하는 전제다.
- **신규 인계 H-28** — 5팀 046·047 완료(61일차) → 4팀 62일차 내비 `pending` 제거. `layout.tsx` 단독 소유가 4팀이라 생긴 인계이며, **D-33 경로 ②(다음 등판이 기한)** 를 적용한다.
- **`/matches`는 계약 신설이 아니라 축소 스코프를 택했다** — 전역·날짜 범위 경기 조회 계약 추가는 타입 동결 배치 반영(1팀 계약 → 3팀 Mock → 6팀 스키마)을 요구하고, 그 실비용은 48일차 D-34·D-35 선례에서 **6팀 하루 부하 1.52인일(가용 0.8)** 로 확인됐다. 화면 하나를 위해 3팀 교차 작업을 다시 여는 것은 균형이 맞지 않는다.

### 47일차 갱신분 (D-34·D-35 / I-238·I-239)

| 일차 | 팀 | 반영 내용 | 추정 | Task |
|---|---|---|---|---|
| **48** | 1팀 코어·품질 | 타입 배치 반영(`avgRating`·`ClubOwnerId`·`ClubOwner`·`signedByOwnerId` + 배럴·타입테스트) + `DataSource` 계약 3종 | 0.75인일 | 002 |
| **48** | 3팀 데이터·밸런싱 | Mock 실값(`avgRating`·`ClubOwner` 60명) + `MockDataSource` 3종 | 0.8인일 | 007 |
| **48 · 51** | 6팀 DB·인프라 | 48일차 `club_owner` 테이블 · `avg_rating` 2컬럼 · `signed_by_owner_id` 마이그레이션 / **51일차 `mapper.ts`·`mapper.test.ts`·타입 재생성(이월 확정)** | 0.75 + 0.5인일 | 032 |
| **49** | 3팀 데이터·밸런싱 | `SponsorContract` mock(**I-231 해소**) + `sponsor.ts` 구단주 축 | 0.8인일 | 029 |
| **50~51** | 3팀 데이터·밸런싱 | **I-229 해소** — 라인업·평점·팀 스탯 어댑터 배선 + 주석 사실 오류 정정 | 1.5인일 | 007 |
| **49~53** | 5팀 화면·배팅UX | 018 본체 편입 — 선수 E1 지표 스트립, 클럽 F3-o 구단주 카드·F6 체결자 | +0.75인일 | 018 |
| **60** | 4팀 UI기반·i18n | `/sponsors` 계약 표 구단주 열(다음 등판, 3팀 I-231 해소 후) | 0.5인일 | 020 |

- **마일스톤·종료일 불변** — M-3(65일차)·M-4·M-5 모두 이동 없음.
- ⚠️ **슬랙 0 구간 2곳이 산술적으로 마이너스가 됐다** — 5팀 018(−0.75인일)·4팀 022(−0.2인일). **일정을 압축하지 않았고**, 5팀 018은 **팀장 승인으로 53일차 유지 확정**이다. **확정 트리거**: 51일차 종료 시 클럽 상세 1/2(F3-o 구단주 카드 포함) 미완이면 5팀이 즉시 팀장에게 보고하고 팀장이 완화 선택지 3종 중 택일한다.
- ✅ **6팀 매퍼분 0.5인일은 51일차 이월 확정**(팀장 판정) — 48일차는 마이그레이션만, `mapper.ts`·`mapper.test.ts`·타입 재생성은 51일차. Mock First라 5팀 018에 무영향이며 실소비는 034b(66~68일차)다. 033은 50일차 SP-4 종료 그대로 유지.
- ✅ **1팀 48일차는 타입 배치 반영 우선 확정** — 5팀 017 완료 판정(리뷰 게이트 9개 조건)은 **49일차로 이월**. 3·6팀이 당일 타입을 기다리는 반면 017은 완료된 작업의 판정이라 차단성이 없다.

### 총량

| 항목 | 값 |
|---|---|
| 총 잔여 공수 | **220.70 인일** (원 211.5 + 47일차 D-34·D-35 반영분 6.35 + **49일차 I-223 인덱스 3종 2.85** — 4팀 1.2 / 5팀 1.65) |
| 투입 팀 | **6팀** (1팀 = 1인 상당) |
| 1인 주당 가용 인일 | 4.0인일/주 = **일 0.8인일** (회의·리뷰·컨텍스트 스위칭 20% 차감) |
| **크리티컬 패스** | **74 영업일** — 인원을 늘려도 줄지 않는 하한선 |
| 계획 기간 (버퍼 제외) | **79 영업일** — 1일차 2026-07-21 ~ 79일차 **2026-11-06(금)** |
| 버퍼 (18%, 15일) | 80~94일차 (2026-11-09 ~ 2026-11-27) |
| **총 기간 / 종료 예정일** | **94 영업일 / 2026-11-27(금)** |
| 미배정 Task | **0건** (**48개** 전량 배정 — 49일차 046~048 신설 반영) |

### 마일스톤

| M | 시점 | 산출물 | 통과 게이트 |
|---|---|---|---|
| **M-1** Phase 1 골격 완료 | **22일차 / 2026-08-19(수)** | 타입 47종, 어댑터 계약, 라우트 골격, PRNG, Mock 팩토리, Vitest, i18n 기반, 스키마 설계서 | `npx tsc --noEmit` 오류 0 · 전 라우트 200 · Mock 동일 시드 2회 100% 일치 · ko/en 전환 동작 · `npm run test` 빈 스위트 통과 |
| **M-2** 엔진 코어 확정 | **37일차 / 2026-09-09(수)** | 023·024·025·026 (틱 엔진·보정 체인·대진표·후처리) | 경기 1건 p95 ≤ 50ms · 시드 스냅샷 100경기 전건 일치 · 스코어=골 이벤트 합 정합 100% |
| **M-3** Phase 2 UI 완료 | **65일차 / 2026-10-19(월)** | 화면 012~022 전량, `/sample` 커버율 100% | 6뷰포트 × 2로케일 가로 스크롤 0 · axe critical/serious 0 · 하드코딩 문자열 0 · 번역 키 누락 0 |
| **M-4** **1차 MVP 릴리스** | **74일차 / 2026-10-30(금)** | Task 036 통합 테스트 통과. 관전 UI + 자동 진행 + 배당 표시 | KPI-1 라운드 누락 0 · KPI-3 재현성 100% · KPI-6 커버율 100% · KPI-12 라인 80%/브랜치 70% · Mock→Supabase 전환 시 **UI diff 0줄** |
| **M-5** 2차 기반 완료 | **79일차 / 2026-11-06(금)** | 인증·지갑·RLS·배팅 화면·정산·침투 테스트·3차 확장 메모 | 침투 시나리오 5종 전건 차단 · 정산 2회 실행 시 지갑 반영 1회 · `get_advisors` 보안 경고 0 |
| **M-6** 버퍼 소진 한계 | **94일차 / 2026-11-27(금)** | — | 이 날짜를 넘기면 재계획 |

### 크리티컬 패스 — **여기가 밀리면 전체가 밀린다**

```
001 ─▶ 002 ─▶ 005 ─▶ 011 ─▶ 012 ─┬─▶ 013A ─┐
                                   └─▶ 013B ─┴─▶ 015 ─▶ 016 ─▶ 017 ─▶ 018 ─▶ 021 ─▶ 022 ─▶ 034b ─▶ 036
```

| Task | 팀 | 종료 일차 | 누적 |
|---|---|---|---|
| 001 → 002 | 코어·품질 | 2 → 8 | 8 |
| 005 → 011 → 012 | UI기반·i18n | 13 → 22 → 27 | 27 |
| 013A / 013B (병렬) | UI기반 / 화면 | 33 | 33 |
| 015 → 016 → 017 → 018 → 021 | 화면·배팅UX | 38 → 42 → 48 → 53 → 59 | 59 |
| 022 | UI기반·i18n | 65 | 65 |
| 034b | DB·인프라 | 68 | 68 |
| 036 | 코어·품질 | 74 | **74** |

- **여유(slack) 0인 팀**: UI기반·i18n팀(4), 화면·배팅UX팀(5). 두 팀의 지연은 100% 전이된다.
- 여유가 있는 팀: 시뮬레이션엔진팀(26일), 데이터·밸런싱·배당팀(13일), DB·인프라팀(11일).
- **순환 의존 0건** 확인.

### 동기화 포인트 — 총 6개

| ID | 일차 / 날짜 | 참여 | 내용 |
|---|---|---|---|
| **SP-1** | **8일차 / 2026-07-30(목)** | **전 6팀** | 도메인 타입 47종 **동결 리뷰**. 이후 타입 변경은 이슈 배치 반영만 |
| **SP-2** | **27일차 / 2026-08-26(수)** | 4 · 5팀 | 디자인 토큰 확정 + 공통 컴포넌트 21종의 팀 간 분할 확정(013A 14종 / 013B 7종) |
| **SP-3** | **37일차 / 2026-09-09(수)** | 2 · 3 · 6팀 | 엔진 반환 계약 리뷰(026 후처리 → 크론·정산 입력). **V-01 실측 결과 공유** |
| **SP-4** | **48일차 / 2026-09-24(목)** | 2 · 6팀 | Edge Function에서 엔진 코어 호출 통합 스모크 |
| **SP-5** | **68일차 / 2026-10-22(목)** | 4 · 5 · 6팀 | **어댑터 전환 동시 검증** — Mock↔Supabase 전환 후 주요 10화면 스냅샷 비교, UI diff 0줄 |
| **SP-6** | **71일차 / 2026-10-27(화)** | **전 6팀** | 1차 릴리스 통합 E2E 입회 — 월드 생성 → 라운드 → 시즌 종료 → 프리시즌 완주 |

### 착수 게이트에 묶인 Task — 일정상 시작 불가 판정

| Task | 게이트 | 판정 | 해소 시점 |
|---|---|---|---|
| **033** 크론 | **V-01** (Edge 30경기 CPU 2초) | ✅ **37일차 실측 통과 — 착수 조건 충족** (단 026 도착 39일차까지 대기) | ~~37일차 SP-3~~ **완료** |
| **035** 배당 | **V-02** (배당 시뮬 3.3ms 경량 모델) | ⚠️ 실측 미완 시 **27일차 착수 불가** | 26일차 |
| **039** 배팅 화면 | **L-02** (규제 법률 검토) | ⚠️ 게이트 미통과 시 **60일차 착수 불가** | 59일차 |

> 1차 릴리스(Task 001~036) 범위에는 결정 대기 블로킹이 없다. V-01·V-02만 실측 게이트다.

### 이 일정이 무효가 되는 조건

1. 6팀 각각이 하루 0.8인일을 내지 못할 때 (겸업·인터럽트 발생)
2. **V-01 또는 V-02 실패** — Task 033·035 재설계, 전 일정 무효
3. Task 002 타입 동결이 **8일차에 실패**했을 때
4. 크리티컬 패스 위 Task(001·002·005·011·012·013·015·016·017·018·021·022·034b·036)가 예정 종료일을 넘겼을 때 — 초과일만큼 M-4 이후 전체 이동
5. 팀 수가 6에서 변동했을 때 (증원은 **화면 트랙에만** 효과 있음)
6. 버퍼 15일 중 **10일 이상 소진**했을 때

**재계산 트리거**: 위 조건 발생 시, 또는 본 ROADMAP에 Task가 추가·삭제되거나 구현 사항 체크박스가 변경됐을 때는 **일정 문서를 먼저 재산출한 뒤** 본 문서의 `**일정**` 줄을 다시 동기화한다. 재산출 없이 날짜만 손대지 않는다.
