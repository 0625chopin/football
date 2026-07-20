# football4 — 가상 축구 리그 시뮬레이션 & 배팅 플랫폼 개발 로드맵

> **"플레이하지 않고, 지켜보고 예측한다."** — 24/7 자동 진행되는 3티어 가상 축구 세계를 관전하고(1차), 이후 배팅한다(2차).

- 문서 버전: v1.1 / 2026-07-20 (D-15 ~ D-18 결정 반영본)
- 근거 PRD: `docs/require/00~06` (요구사항 253건 / FR 163 · NFR 90 / 엔티티 E-01~E-47)
- 개발 원칙: `CLAUDE.md`(Mock First, `/sample` 쇼케이스, Mock↔DB 동일 타입), `AGENTS.md`(Next.js 16 문서 선확인)
- 팀 구성 상세: `docs/TEAM.md`
- **일정 동기화: 2026-07-20** / 적용 인원 **N = 6팀** / 시작일 **2026-07-21(화) = 1일차**
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

- **담당**: 1팀 코어·품질팀 / 리뷰: 2·3·6팀 (SP-1 타입 동결 리뷰는 전 6팀 참여)
- **일정**: 3일차 ~ 8일차 (2026-07-23 ~ 2026-07-30) / 추정 4.5인일 / 담당 1팀 코어·품질팀 / **8일차 SP-1에서 타입 동결** — 이후 변경은 이슈 배치 반영만
- **근거**: E-01~E-47, D-15, DC-01, DC-10, NFR-MT-002, NFR-MT-009
- **구현 사항**
  - [x] `src/types/` 하위를 도메인별로 분할 (`world.ts`, `person.ts`, `match.ts`, `stat.ts`, `economy.ts`, `betting.ts`, `config.ts`, `ops.ts`, `index.ts`) — **3일차 완료** (+ `brand.ts`·`enums.ts` 참조 기반 2종 추가)
  - [x] E-01~E-32 (1차 범위) 전량 정의 + E-33~E-40(배팅·사용자)은 2차 대비 타입만 선정의. **E-01 World는 단일 레코드 전제**(D-15) — **5일차 완료**(E-21~E-23·E-31·E-32는 `stat.ts`, E-24~E-27은 `ops.ts`, E-28~E-30은 `economy.ts`, E-33~E-40은 `betting.ts`). 부수로 `docs/ISSUES.md` I-19·I-31·I-32 5일차 반영 완료
  - [x] enum성 값 단일 선언: 이벤트 타입 23종(FR-MT-002), 포지션 11군(FR-PL-005), 부상 4등급(FR-PL-009), 전술 성향 6종(FR-MT-009, 3일차 선반영 재확인), 페이즈 6종(FR-LG-010 5종 + `TIEBREAK`, I-33/D-27), 마켓 상태, 국적 코드(D-17, T9에 따라 ISO 3166-1 alpha-2 브랜드 계약) — **6일차 완료**. 부수로 `docs/ISSUES.md` I-33·I-37 6일차 반영 완료(`MatchEvent.relatedEventSequence` 추가)
  - [x] 34속성(FR-PL-002) 타입, 시드 계층 타입(world/season/match), 상수 스냅샷 타입(E-44) — *34속성 **4일차 완료**(기술10·정신10·신체8·GK6). 시드 계층(`WorldSeed`/`SeasonSeed`/`MatchSeed`/`EventSeed`)·상수 스냅샷 타입(E-44 `SimConstantSnapshot`) **7일차 완료**(`src/types/brand.ts`, `config.ts`). 부수로 E-41~43(`CommonCodeGroup`/`CommonCode`/`CommonCodeHistory`)도 7일차에 함께 정의*
  - [x] 브랜드 타입으로 ID 혼용 방지(`TeamId`, `PlayerId` 등), 포인트는 정수 타입으로 고정(DC-08) — **7일차 완료**. ID 27종(+ E-42/43용 2종) 전량을 `Brand<T,TName>` 명목 타입으로 승격, `Points`도 브랜드화. `npx tsc --noEmit` 오류 0 + 서로 다른 브랜드 간 대입이 오류로 검출됨을 확인
  - [x] 각 enum에 **번역 키를 매핑하는 타입 규약** 정의 — 표시명은 타입이 아닌 메시지 카탈로그가 소유 (Task 011과 정합) — **7일차 완료**(`src/types/config.ts` `EnumTranslationCatalog<T>`, 키 문자열은 4팀 H-09 소유이므로 미포함)
  - [x] 타입 ↔ 엔티티 매핑표를 `src/types/README.md`로 남겨 추적성 유지 — **8일차 완료**. 작성 중 **E-45 CronRun / E-46 CronGap / E-47 AuditLog 3종이 6~7일차 어느 항목에도 배정되지 않아 미정의 상태**임을 발견(`docs/ISSUES.md` I-45) — E-33~E-40처럼 2차 선정의 대상으로 지정된 적이 없는 1차 범위 엔티티라 8일차에 `ops.ts`에 반영해 완결
- **수락 기준**: `npx tsc --noEmit` 오류 0. E-01~E-47 중 1차 범위 전 엔티티가 타입으로 존재하며 중복 enum 선언 0건. — **8일차 충족 확인**(E-45~47 포함 전 엔티티 존재, `tsc` 오류 0)
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

> **일정**: M-3 완료 목표 65일차 (2026-10-19) — 실행 구간 23~65일차 / Task 012~022

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
    - 조치: 색역 밖 토큰은 채도를 낮춰 색역 안으로 넣고, **`--warning`은 배지 채움 전용으로 용도를 확정**한 뒤 짝이 되는 `--warning-foreground`(배지 위 8.2~9.6:1)를 신설했다. 비텍스트 4색은 라이트·다크 모두 **3:1(WCAG 1.4.11) 이상** 확보. 채도를 낮추면서 **ΔE 하한은 15 → 12로 조정**됐다(실측 최소값 기준, 아이콘·라벨 병기 전제와 함께 수용)
    - **회귀 테스트는 `globals.css`를 정규식 파싱**해 값을 하드코딩 복사하지 않는다 — 토큰 값이 바뀌면 반드시 깨진다. 4축(CVD 3종+정상 시야 전 쌍 ΔE / sRGB 색역 / 페이지 배경 3:1 / 배지 쌍 4.5:1)을 모두 단언한다
    - ⚠️ **비텍스트 3:1 기준은 "배지 채움·보더·아이콘 전용"이라는 전제 위에 있다.** 013A(28일차 이후) 소비 시 이 토큰들을 본문 텍스트 전경으로 쓰면 기준 미달이며 **테스트가 소비처 오용은 잡지 못한다**
  - [ ] 라이트/다크 모드 대응 및 대비 4.5:1 검증
  - [x] 타이포·간격·반응형 브레이크포인트(320/375/768/1024/1440/1920) 스케일 확정 — **브레이크포인트 6종 24일차 완료(4팀)**. `@theme inline`에 `--breakpoint-xs`~`--breakpoint-2xl`(20/23.4375/48/64/90/120rem). 값은 `docs/wireframe/00-공통규약.md §5`의 px를 16px 기준 rem 환산해 그대로 반영했고, **`xs`·`sm`·`xl`·`2xl`은 Tailwind v4 기본값과 달라 재정의**했다. `2xl`은 문서상 1920~2560 범위 중 **하한만 브레이크포인트로 쓰고 상단은 최대폭 컨테이너 중앙 정렬로 처리**한다(별도 브레이크포인트를 만들지 않음). 타이포·간격 스케일은 잔여
  - [ ] **로케일별 텍스트 길이 편차(ko↔en) 대응** — 버튼·배지·테이블 헤더의 최소/최대 폭 규약
- **수락 기준**: 신규 의존성이 근거와 함께 최소로 추가되고(NFR-MT-008), 두 테마·두 로케일 모두 레이아웃 깨짐 0.

### Task 013: 공통 컴포넌트 21종을 4상태로 구현한다 - 우선순위

- **담당**: 4팀 UI기반·i18n팀(013A 도메인·상태 14종) + 5팀 화면·배팅UX팀(013B 복합 7종) / 리뷰: 1팀 코어·품질팀
- **일정**: 28일차 ~ 33일차 (2026-08-27 ~ 2026-09-03) / 추정 8.5인일 / 담당 4팀 UI기반·i18n팀 + 5팀 화면·배팅UX팀 / **크리티컬 패스** — 일정상 **2단위 분할(스코프 불변)**: 013A(도메인 표현 8종 + 상태·유틸 6종 = 14종, 4.25인일, 4팀) 28~33일차 / 013B(복합 7종, 4.25인일, 5팀) 28~33일차. 두 팀이 서로 다른 디렉터리에서 병렬 수행
- **근거**: FR-UI-021, FR-UI-000, FR-UI-024, NFR-RS-002, D-18
- **구현 사항**
  - [ ] 도메인 표현 컴포넌트: `TeamBadge`, `PlayerAvatar`, `AbilityRadar`, `ConditionGauge`, `FitnessBar`, `FormStrip`, `PositionMap`, `StatBar`
  - [ ] 복합 컴포넌트: `EventTimelineItem`, `PitchLineup`(7 포메이션), `BracketTree`, `TrophyCase`, `NewsItem`, `GrowthChart`, `InjuryTimeline`
  - [ ] 상태·유틸 컴포넌트: `SkeletonBlock`, `EmptyState`(메시지 키 주입), `ErrorState`(재시도 액션), `CountdownTimer`, `PhaseIndicator`, `OddsButton`(1차 비활성 모드)
  - [ ] 전 컴포넌트는 **도메인 타입 props만 받고 데이터 페칭을 하지 않는다**
  - [ ] 모든 표시 문구는 번역 키 경유, 숫자·시각은 로케일 포맷터 사용 (D-18)
  - [ ] React Compiler 전제 — `useMemo`/`useCallback` 미사용, 예외 시 정당화 주석
  - [ ] 넓은 콘텐츠는 자체 `overflow-x: auto` 컨테이너 적용
- **수락 기준**: 21종 전부가 4상태를 지원하고, ko/en 전환 시 하드코딩 문자열 0건.

### Task 014: `/sample` 컴포넌트 쇼케이스를 구축한다 - 우선순위

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀 / 지원: 5팀 화면·배팅UX팀(013B 등록)
- **일정**: 34일차 ~ 38일차 (2026-09-04 ~ 2026-09-10) / 추정 4.0인일 / 담당 4팀 UI기반·i18n팀
- **근거**: FR-UI-001, FR-UI-000, KPI-6, UC-601, D-18
- **구현 사항**
  - [ ] 카테고리별 섹션 레이아웃(도메인 / 복합 / 상태 / 차트 / 어드민)과 앵커 네비게이션
  - [ ] 컴포넌트별 4상태 토글 컨트롤 + 뷰포트 프리뷰 전환(모바일/태블릿/데스크톱)
  - [ ] **로케일 전환 컨트롤** — 각 컴포넌트를 ko/en으로 즉시 비교 확인 (D-18)
  - [ ] 개별 컴포넌트를 `ErrorBoundary`로 격리해 하나가 깨져도 쇼케이스가 살아있게 구성
  - [ ] 커버리지 체크리스트 자동 표기 — 등록 컴포넌트 수 / 4상태 구현 수 / 번역 키 누락 수 카운터
  - [ ] 어댑터 토글(Mock ↔ Supabase) 스위치 배치 (UC-602)
- **수락 기준**: 등록 컴포넌트 4상태 커버율 100%. 이후 모든 신규 컴포넌트는 `/sample` 등록 + ko/en 확인이 완료 조건에 포함된다.
- **테스트**: Playwright MCP — `/sample` 진입 후 4상태·로케일 토글 조작, 콘솔 에러 0건, 스크린샷 확보.

### Task 015: 홈/라이브 센터와 전역 레이아웃을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀
- **일정**: 34일차 ~ 38일차 (2026-09-04 ~ 2026-09-10) / 추정 4.0인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-002, FR-UI-020, FR-UI-022, NFR-PF-009, NFR-RS-001
- **구현 사항**
  - [ ] 3리그 진행 중 경기 카드 그리드 — 실시간 스코어·경과분·LIVE 배지
  - [ ] 다음 킥오프 카운트다운, 시즌·페이즈 인디케이터, 주요 뉴스 요약, 로케일 스위처
  - [ ] 폴링 훅 적용(기본 5초, 공통코드 주기, 탭 비활성 시 중단)
  - [ ] 4상태 — 카드 스켈레톤 6개 / "진행 중 경기 없음 + 다음 킥오프 시각" 빈 상태 / 재시도 에러
  - [ ] 킥오프 시각은 UTC 저장값을 로케일 로컬 시각으로 변환 표기 (DC-07, D-18)
  - [ ] 모바일 세로 우선 레이아웃, LCP ≤ 2.5s / CLS ≤ 0.1 목표
- **수락 기준**: 접속 3초 내 진행 중 경기와 스코어 파악 가능(PS-1 성공 신호). 320px에서 가로 스크롤 0.
- **테스트**: Playwright MCP — 폴링 네트워크 요청 관찰, 탭 비활성 시 중단 확인, 6개 뷰포트 × 2로케일 스냅샷.

### Task 016: 리그 순위표와 일정/결과 화면을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀
- **일정**: 39일차 ~ 42일차 (2026-09-11 ~ 2026-09-16) / 추정 3.0인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-003, FR-UI-004, FR-LG-004, FR-LG-005, NFR-A11Y-002·005, NFR-PF-011
- **구현 사항**
  - [ ] 순위표 — 순위·팀·경기·승무패·득실·승점·최근 5경기(`FormStrip`)
  - [ ] 승격/플레이오프/강등 존 시각 구분 + 아이콘·라벨 병기, 타이브레이커 적용 단계 표시
  - [ ] 일정/결과 — 라운드별 그룹, 킥오프 시각, 스코어/LIVE/예정 배지, 라운드 네비게이션
  - [ ] 리그 스위처(리그1/2/3)와 시즌 선택기 연동
  - [ ] 테이블 시맨틱 마크업(`<caption>`, `scope`) 및 모바일 가로 스크롤 컨테이너
- **수락 기준**: 3개 리그 전부 렌더. 색맹 시뮬레이션 3종에서 존 구분 가능. ko/en 헤더 폭 깨짐 0.

### Task 017: 경기 상세 / 라이브 중계 화면을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀 / 지원: 3팀 데이터·밸런싱·배당팀(배당 패널)
- **일정**: 43일차 ~ 48일차 (2026-09-17 ~ 2026-09-24) / 추정 4.5인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-007, FR-MT-002, FR-MT-016, FR-BT-014, UC-002
- **구현 사항**
  - [ ] 스코어보드(경과분·추가시간·페이즈) + 분 단위 이벤트 타임라인
  - [ ] **이벤트 23종의 중계 문구 템플릿을 번역 카탈로그로 관리** — 선수·팀 이름은 변수로 주입(번역 대상 아님, D-17/D-18)
  - [ ] 라인업 피치 뷰(`PitchLineup`), 팀 스탯 비교바, 선수별 평점 테이블
  - [ ] 날씨·구장 정보, **배당 패널(표시 전용, 베팅 버튼 비활성)** (FR-BT-014)
  - [ ] 라이브 폴링 3초 + 신규 이벤트 `aria-live="polite"` 안내 (NFR-A11Y-004)
  - [ ] 4상태 — "아직 이벤트가 없습니다 (킥오프 대기)" 빈 상태 포함
- **수락 기준**: 경과 시간 이후 이벤트가 화면에 나타나지 않는다(UI 레벨 검증, 서버 강제는 Task 041).
- **테스트**: Playwright MCP — 라이브 Mock에서 이벤트 점진 노출, 3초 폴링, 중계 문구 ko/en 전환 확인.

### Task 018: 선수 상세와 클럽 상세 화면을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀
- **일정**: 49일차 ~ 53일차 (2026-09-25 ~ 2026-10-01) / 추정 4.0인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-005, FR-UI-006, FR-PL-016, FR-TM-009, FR-ST-001, FR-ST-002
- **구현 사항**
  - [ ] 선수 상세 — 프로필, 능력치 레이더(4카테고리), 컨디션·피로 게이지, 포지션 맵(숙련도 5단계), 몸값·계약, 시즌별/통산 스탯, 성장 곡선, 부상 타임라인, 트로피, 이적 이력
  - [ ] 34속성·포지션·부상 등급 등 열거형 표시명은 카탈로그 경유 (Task 011)
  - [ ] PA 원값 비노출 — 스카우트 등급 ★1~5 범위 표기만 (FR-PL-004)
  - [ ] 클럽 상세 — 헤더(엠블럼·명성·팬), 스쿼드 테이블(부상·정지 배지), 감독/전술 카드, 시즌 지표, 재정 패널, 스폰서 3슬롯, 트로피, 최근/예정 경기
  - [ ] 섹션 단위 로딩·에러 격리 + 섹션별 빈 상태 문구
- **수락 기준**: 특정 선수의 5시즌 성장 궤적과 이적 이력을 한 화면에서 추적 가능(PS-2 성공 신호).

### Task 019: 통계 랭킹·수상·아카이브·이적 피드 화면을 완성한다

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 39일차 ~ 43일차 (2026-09-11 ~ 2026-09-17) / 추정 4.0인일 / 담당 4팀 UI기반·i18n팀
- **근거**: FR-UI-008, FR-UI-011, FR-UI-012, FR-UI-013, FR-ST-004, FR-AW-005, FR-YT-006
- **구현 사항**
  - [ ] 통계 랭킹 — 리그/통합 필터, 지표 드롭다운 10종 이상, 최소 출전 필터 표기(공통코드 기본 30%)
  - [ ] 이적/뉴스 피드 — 영입·임대·은퇴·유소년·감독교체·스폰서 부도 타임라인, 타입 필터. **뉴스 문구는 템플릿 + 고유명사 변수 주입**
  - [ ] 수상/명예의 전당 — 시즌별 수상, 베스트11 피치 뷰, 통산 다관왕 랭킹
  - [ ] 시즌 아카이브 — 시즌 선택기, 최종 순위·우승·승강·수상 요약
  - [ ] 각 화면 4상태 + 무한 스크롤 또는 페이지네이션 규약 통일
- **수락 기준**: 4개 화면 모두 Mock 데이터로 완결 동작하고 `/sample`에 관련 컴포넌트가 등록된다.

### Task 020: 플레이오프·컵 브래킷과 스폰서 현황 화면을 완성한다

- **담당**: 4팀 UI기반·i18n팀 / 리뷰: 1팀 코어·품질팀 / 지원: 5팀 화면·배팅UX팀(`BracketTree`)
- **일정**: 44일차 ~ 47일차 (2026-09-18 ~ 2026-09-23) / 추정 3.5인일 / 담당 4팀 UI기반·i18n팀
- **근거**: FR-UI-009, FR-UI-010, FR-UI-014, FR-LG-011~013, FR-LG-015, FR-EC-011
- **구현 사항**
  - [ ] 플레이오프 브래킷 — 리그1 10팀(WC→8강→4강→결승), 리그2 4팀, 리그3 1경기
  - [ ] 컵 브래킷 — 60팀 6라운드 59경기 트리, 티어 배지, bye 4팀 표기, 자이언트킬링 하이라이트
  - [ ] 승부차기 스코어 별도 표기(`pk_home`/`pk_away`)
  - [ ] 스폰서 현황 — 목록(잔고·계약 팀 수·부도 위험 배지), 계약 상세
  - [ ] 브래킷 가로 스크롤·확대 축소, 모바일 라운드 단위 페이징
- **수락 기준**: 6라운드 브래킷이 320px에서도 가로 스크롤 컨테이너 내에서 탐색 가능.

### Task 021: 운영 콘솔 3종을 완성한다

- **담당**: 5팀 화면·배팅UX팀 / 리뷰: 4팀 UI기반·i18n팀 / 지원: 3팀(공통코드 스키마)·6팀(크론 지표)
- **일정**: 54일차 ~ 59일차 (2026-10-02 ~ 2026-10-09) / 추정 5.0인일 / 담당 5팀 화면·배팅UX팀 / **크리티컬 패스**
- **근거**: FR-UI-019, FR-UI-025, FR-UI-026, FR-AD-001~005·012·015·022, NFR-SEC-007
- **구현 사항**
  - [ ] `/admin` — 시뮬 상태(페이즈·다음 킥오프), 배속 슬라이더(0.25×~20×), 정지/재개, 시드 조회, 월드 리셋(2단계 확인), 로그 뷰어
  - [ ] `/admin/config` — 37개 그룹별 상수 목록(현재값·기본값·설명·영향 FR), 편집 폼, 범위 검증 인라인 에러, 발효 시점 지정, 변경 이력 diff (사전 설계: `docs/wireframe/10-어드민공통코드-폼스펙.md`, 13일차 5팀. **37개로 갱신 — 14일차 I-88 결정**)
  - [ ] `/admin/scheduler` — 마지막 실행 시각, 성공/실패 이력, 밀린 라운드 수, 중단 구간(`cron_gap`), 잠금 상태
  - [ ] 1차는 비공개 경로 + 환경 플래그로 보호 (NFR-SEC-007)
  - [ ] 위험 조작(리셋·강제 정산)은 2단계 확인 + 사유 입력 필수
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
  - [ ] 리그별 라운드 간격 75/90/115분(공통코드) 기반 킥오프 시각 산출, 최종 라운드 T+3,450분 강제 정렬
  - [ ] 시즌 페이즈 상태머신 `REGULAR ⇄ CUP_SLOT → PLAYOFF → (TIEBREAK) → SETTLEMENT → PRESEASON → REGULAR` (멱등 전이). **`TIEBREAK`는 승강 경계 동률 시에만 진입하는 조건부 페이즈**(D-27 / I-33, 6일차 `SeasonPhase`에 반영 완료) — 동률 판정 자체는 Task 026 소관이고 025가 026보다 먼저 끝나므로, **025는 동률 여부를 인자로 주입받는 순수 함수 인터페이스로 먼저 확정**한다
  - [ ] 배속(0.25×~20×) 비례 재계산 및 정지/재개 오프셋 처리 — 동시 종료 정렬 유지
- **수락 기준**: 세 리그 최종 라운드 킥오프 차이 ≤ 30분. 동일 시드 재생성 시 대진표 100% 동일. 리터럴 `24/20/16` 0건(NFR-SC-003).
- **테스트**: Vitest — 대진 완전성(모든 팀 쌍 홈·원정 각 1), 배속 변경 시 정렬 유지, 4리그 확장 설정 성공.

### Task 026: 경기 후처리·순위·타이브레이커를 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 6팀 DB·인프라팀(트랜잭션 경계)
- **일정**: 31일차 ~ 37일차 (2026-09-01 ~ 2026-09-09) / 추정 5.5인일 / 담당 2팀 시뮬레이션엔진팀 / **준크리티컬 · M-2 게이트**
- **근거**: FR-MT-010, FR-LG-004~006, FR-ST-001~005, NFR-PF-011, NFR-CR-002
- **구현 사항**
  - [ ] 후처리 7종을 단일 트랜잭션으로 — 스코어 확정 / 순위 갱신 / 스탯 누적 / 컨디션·피로 / 부상 판정 / 카드·정지 / 정산 트리거
  - [ ] 실패 시 전체 롤백 + 최대 3회 재시도 + 알림, 재실행 멱등(중복 누적 0)
  - [ ] 7단계 타이브레이커 — 승점 → 골득실 → 다득점 → 승자승 미니리그 → 다승 → 페어플레이 → 시드 추첨
  - [ ] 승강 경계 동률 시 `competition_type = TIEBREAK` Fixture 자동 생성
  - [ ] 사전 집계 `standing` 테이블 갱신(라운드별 스냅샷), 경기 평점 산출(FR-ST-003)
  - [ ] 선수·팀 지표 풀세트 집계 및 이벤트 로그 기반 재계산 함수 (FR-ST-005)
- **수락 기준**: 순위표 조회가 실시간 계산 없이 p95 ≤ 120ms 경로로 동작. 7단계 각각이 단독으로 순위를 가르는 시나리오 통과.
- **테스트**: Vitest — 타이브레이커 7 시나리오, 멱등성(재처리 시 스탯 이중 누적 0), 이벤트→스탯 재계산 일치.

### Task 027: 플레이오프와 컵대회 넉아웃을 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀
- **일정**: 38일차 ~ 45일차 (2026-09-10 ~ 2026-09-21) / 추정 6.5인일 / 담당 2팀 시뮬레이션엔진팀
- **근거**: FR-LG-011~015, FR-EC-003·004, I-04
- **구현 사항**
  - [ ] 리그1 플레이오프 10팀 9경기(WC 2 + 8강 4 + 4강 2 + 결승 1), 리그2 3경기, 리그3 1경기
  - [ ] 컵대회 60팀 — bye 4, 1라운드 28경기, 총 6라운드 59경기
  - [ ] 컵 시딩 — 1라운드 리그1↔리그3 우선 매칭, 잔여 매칭 폴백 규칙 확정 후 I-04 해소
  - [ ] 홈 결정 규칙(하위 티어 홈 / 동일 티어는 낮은 순위 / 결승 중립지) 및 중립지 홈 어드밴티지 미적용
  - [ ] 정규시즌 라운드 6/12/18/24/32/40 직후 컵 슬롯 6회 삽입 — 슬롯 중 리그 킥오프 0건
  - [ ] 상금 지급(공통코드 `PLAYOFF_PRIZE`, `CUP_PRIZE`, 자이언트킬링 보너스) → 원장 기록
  - [ ] 플레이오프 우승은 별도 트로피이며 승격 권한 없음 (FR-LG-014)
- **수락 기준**: 컵 참가 60팀·59경기·우승 1팀. 무승부 발생 시 반드시 승자 확정.
- **테스트**: Vitest — 브래킷 구조 불변식, 연장·승부차기 시드 스냅샷, 컵 슬롯 중 리그 경기 0건.

### Task 028: 시즌 정산·승강·성장·수상을 구현한다

- **담당**: 2팀 시뮬레이션엔진팀 / 리뷰: 1팀 코어·품질팀 / 지원: 3팀 데이터·밸런싱·배당팀(성장·수상 파라미터)
- **일정**: 46일차 ~ 53일차 (2026-09-22 ~ 2026-10-01) / 추정 6.5인일 / 담당 2팀 시뮬레이션엔진팀
- **근거**: FR-LG-006·007·016, FR-EC-002, FR-PL-011·012·015, FR-AW-001~003·005·006, NFR-PF-006
- **구현 사항**
  - [ ] 순위 확정 → 승강 교환(리그1 22~24위 ↔ 리그2 1~3위 / 리그2 18~20위 ↔ 리그3 1~3위), 팀 수 24/20/16 불변
  - [ ] 리그3 15~16위 **리빌드 제재** — 페널티 3종 + 구제 2종(보조금 40%, 유소년 +10%p)
  - [ ] 시즌 종료 순위 포인트 — 지수 1.8 곡선(L1 1500+1500 / L2 850+950 / L3 400+600) 원장 지급
  - [ ] 능력치 성장·하락 보정 — 나이대 계수 4구간, PA 초과 금지, 시즌 변동 ±6 이내
  - [ ] 명성 갱신(선수·팀), 은퇴 판정(34세부터 확률 상승, 40세 강제)
  - [ ] 수상 — 리그별 개인 수상, 월드 통합 수상, 대회 수상, 베스트11, 클럽 트로피
  - [ ] 시즌 아카이브 확정 및 `season_number` 누적
- **수락 기준**: 시즌 종료 처리 ≤ 20초(60팀 ≈1,700선수). 20시즌 시뮬에서 평균 OVR 곡선이 22~29세 피크 종형.
- **테스트**: Vitest — 시즌 스냅샷 3시즌 일치, 구조 불변식 10시즌(팀 수·40세 이상 0명·OVR ≤ PA), 승강 후 팀 수 불변.

### Task 029: 포인트 경제·스폰서·재정 시스템을 구현한다

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀(회계 항등식)
- **일정**: 20일차 ~ 26일차 (2026-08-17 ~ 2026-08-25) / 추정 5.5인일 / 담당 3팀 데이터·밸런싱·배당팀
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
- **수락 기준**: 3시즌 시뮬에서 회계 항등식 오차 0 (수입 − 지출 = 잔고 변화). 이적료·스폰서 분배 zero-sum.
- **테스트**: Vitest — 회계 항등식 5종(NFR-QA-005), 스폰서 부도율 ≤ 15% 밴드(KPI-8).

### Task 030: 프리시즌 10단계 처리를 구현한다

- **담당**: 3팀 데이터·밸런싱·배당팀 / 리뷰: 1팀 코어·품질팀 / 지원: 2팀 시뮬레이션엔진팀(엔진 호출)
- **일정**: 54일차 ~ 62일차 (2026-10-02 ~ 2026-10-14) / 추정 7.5인일 / 담당 3팀 데이터·밸런싱·배당팀
- **근거**: FR-TR-001~012, FR-YT-001~006, FR-TM-004·005·007·010, D-17, **D-20**, NFR-PF-007, I-01
- **구현 사항**
  - [ ] 10단계 순차 처리 — 은퇴 → 계약만료 → 유소년 배출 → 재계약 → 강제매각 → 영입/트레이드 → 임대 → FA 충원 → 스폰서 협상 → 검증
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
  - [ ] 타입·범위 메타데이터 및 DB 제약, JSON 스키마 검증 (NFR-CFG-004)
  - [ ] 발효 정책 적용 — `NEXT_SEASON` 그룹이 진행 중 시즌에 영향 0
  - [ ] 상수 스냅샷 기록·해시 중복 제거 (시즌당 ≤ 20건, ≤ 1MB)
  - [ ] 변경 이력 append-only 기록 및 롤백(기본값 복원) 경로
  - [ ] **밸런싱 튜닝 루프** — 20시즌 장기 시뮬 → 밸런스 리포트 생성 → 상수 조정 → 재검증 (I-05 해소)
- **수락 기준**: 공통코드 커버리지 ≥ 90%(KPI-10). `src/lib/sim/`에 대상 상수 숫자 리터럴 잔존 0건. KPI-8 밸런스 4지표 밴드 충족.
- **테스트**: Vitest — 공통코드 주입 시 시뮬 결과 변화, 폴백 경고, 발효 정책 3종.

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
    - **✅ I-110 해소(18일차)** — 아래 권장 조치대로 `add_team_season_stat_biggest_pairing_check` 마이그레이션을 적용해 `team_season_stat_biggest_win_pairing_check` / `_biggest_loss_pairing_check` 2건을 추가했다(`num_nonnulls(...) IN (0, 4)`). 매퍼의 캐스트는 이제 DB가 보장하는 전제 위에 선다. 팀장이 `list_migrations`로 오늘 신규 적용임을 확인(같은 팀 재검증 인스턴스의 "이미 존재하므로 실결함 아님" 주장은 순서 착시로 기각). **이하 원문**:
    - **⚠️ I-110(17일차 제보, 18일차 판정)** — 매퍼가 `team_season_stat`의 "`biggest_win_fixture_id`가 null이면 동반 3컬럼도 null"이라는 **불변식을 캐스트로 가정**하는데, **팀장이 `pg_constraint`를 직접 조회한 결과 이 테이블의 CHECK는 금액 범위 8건 + `competition_type` 1건뿐이고 동반 null을 강제하는 제약이 없다**(`biggest_loss_*` 동일). 부분 null 행이 들어오면 타입은 통과하되 런타임에 `undefined` 필드를 가진 도메인 객체가 만들어진다. 권장 조치는 `CHECK (num_nonnulls(...) IN (0, 4))` 마이그레이션(DB가 불변식을 보장해 경계를 하나로 유지)
- **수락 기준**: `list_tables`로 전 테이블 확인. `get_advisors`에서 보안·성능 경고 해소. 도메인 타입 ↔ DB 타입 매퍼 컴파일 통과.
  - **✅ advisors 마감(18일차, Task 032 종료).** 팀장이 `get_advisors` 양쪽을 직접 재실행해 확인했다. **performance**: `auth_rls_initplan` **41→0**, `multiple_permissive_policies` **170→0** — 원인은 34개 테이블의 `_service_role_write`(ALL)가 `_public_select`(SELECT)와 **중첩**된 구조였고, SELECT를 public_select 하나만 담당하게 하고 write를 INSERT/UPDATE/DELETE 3개로 분리해 해소했다(`split_service_role_write_policies_no_select_overlap`). 나머지 5테이블은 `auth.role()`을 `(select auth.role())`로 래핑(`fix_rls_initplan_standalone_policies`). `unindexed_foreign_keys`는 16일차에 65→0. `unused_index`는 73건 유지 — **데이터 0행의 당연한 결과라 Task 042(58~62일차) 회수 검토로 이관**, 오늘 미터치. **security**: 5건 → **1건**. 헬퍼 2종(`current_world_minute()`·`is_event_elapsed()`)은 SECURITY INVOKER 전환으로 WARN 4건 해소(전자는 대상 `world`가 이미 공개 SELECT라 무영향, 후자는 현재 테이블 접근이 없는 `select true` 스텁이라 DEFINER가 애초에 불필요 — I-102). 잔존 ERROR 1건 `match_event_visible`은 **`match_event`의 정책이 `service_role` 전용 1개뿐이라 invoker 전환 시 anon/authenticated에게 완료 경기 이벤트까지 전부 0건이 되어 기능이 깨진다**는 SQL 근거로 예외 승인하고 `security_barrier=true` 하드닝만 적용(`reduce_security_definer_exposure`) — **I-112**. 인증 도입 시 재검토
    - **⚑ 팀장 반려 이력(18일차)**: 1차 보고가 성능만 처리하고 보안 5건을 "스코프 밖"으로 남겨 반려했다. 수락 기준 문구가 "보안·성능 경고 해소"이고 오늘이 종료일이므로, 해소 또는 SQL 근거를 갖춘 정당화 중 하나를 요구해 위 결과로 마감
  - **(이하 15~17일차 시점의 잔여 기록 — 위 항목으로 마감됨)** security: `match_event_visible` SECURITY DEFINER ERROR 1건(뷰가 RLS를 우회하는 것이 설계 의도라 **인정**), 헬퍼 2종의 anon/authenticated EXECUTE WARN 4건(뷰 동작에 필수 + STABLE 읽기전용이라 **인정**). performance: `auth_rls_initplan` 41건(`auth.role()`/`auth.uid()`가 행마다 재평가 — `(select …)` 래핑으로 해소되는 정형 수정, 시드 투입 전 처리 권장), `multiple_permissive_policies` 170건(A그룹 정책 2개 병존 구조의 부산물 — 통합 가능성 판단 필요), `unindexed_foreign_keys` 65건(설계서 21개 인덱스가 FK 전량을 덮지 않음 — 조회 경로 없는 FK를 둘지 판단 필요), `unused_index` 13건(데이터 0행 상태의 당연한 결과 — 시드 후 재평가). **16~18일차 잔여 작업으로 이월 배정**

### Task 033: Supabase Edge Function 크론으로 자동 진행을 구현한다

- **담당**: 6팀 DB·인프라팀 / 리뷰: 1팀 코어·품질팀 / 지원: 2팀 시뮬레이션엔진팀(SP-4 엔진 호출 스모크)
- **일정**: 38일차 ~ 48일차 (2026-09-10 ~ 2026-09-24) / 추정 8.5인일 / 담당 6팀 DB·인프라팀 / ⚠️ **V-01 실측 게이트 미통과 시 38일차 착수 불가**
- **근거**: FR-AD-017~022, NFR-CR-001~009, E-45, E-46, D-04, DC-15, DC-16, R-08, R-09
- **구현 사항**
  - [ ] `supabase/functions/tick/` — 잠금 획득 → 킥오프 도래 Fixture 탐지 → 경기 시뮬 → 후처리 → 잠금 해제
  - [ ] 어드바이저리 락 + 타임아웃 5분, 락 실패는 에러가 아닌 no-op
  - [ ] 멱등성 — 동시 호출 10건에도 중복 시뮬 0건, `FINISHED` 재처리 시 스탯 이중 누적 0
  - [ ] 1회 실행 처리 상한 50경기, 초과분 다음 틱 이월 (Edge Function 시간 제한 대응)
  - [ ] 지수 백오프 3회 재시도, 밀린 라운드 catch-up(폴백 경로 구분 기록)
  - [ ] 중단 감지 — 주기 3배 초과 시 `cron_gap` 기록 및 경고
  - [ ] `cron_run`에 no-op 포함 전 실행 기록, `/api/health` 엔드포인트(NFR-OB-004)
  - [ ] 서비스 롤 키는 Edge Function 시크릿에서만 로드 — 클라이언트 번들 grep 0건
  - [ ] 크론 주기(기본 1분)가 최소 라운드 간격 75분의 약수인지 저장 전 검증
- **수락 기준**: KPI-1 — 라운드 누락 0건, 크론 성공률 ≥ 99.5%. 킥오프 지연 p95 ≤ 60초. no-op 실행 ≤ 200ms.
- **테스트**: 통합 — 크론 30분 중단 후 재개 시 catch-up 완주, 동시 호출 부하. Playwright MCP — `/admin/scheduler`에서 실행 이력·중단 구간·밀린 라운드 표시 확인.

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
- **일정**: 27일차 ~ 35일차 (2026-08-26 ~ 2026-09-07) / 추정 7.5인일 / 담당 3팀 데이터·밸런싱·배당팀 / ⚠️ **V-02 실측 게이트 미통과 시 27일차 착수 불가**
- **근거**: FR-BT-005·006·014, NFR-DT-006, NFR-PF-004·005, NFR-SC-004, R-10, Q-03
- **구현 사항**
  - [ ] `src/lib/odds/` — 엔진을 호출하는 프리시뮬 러너, **본경기와 독립된 시드 네임스페이스**
  - [ ] 경기 마켓 N=3,000 프리시뮬 → 결과 분포 → 확률 → 오버라운드 1.06 적용, 배당 1.01~500.00 클램프
  - [ ] 시즌 마켓 N=300(우승·승격·강등·득점왕), 토너먼트 마켓 브래킷 기반
  - [ ] 킥오프 T−30분 산출, 라인업 확정·부상 발생 시 재산출(킥오프 이후 미수행)
  - [ ] 워커·큐로 분리 가능한 인터페이스 구조 (NFR-SC-004)
  - [ ] 1차 표시 전용 모드 — 경기 카드·상세에 1X2 배당 표시, 베팅 버튼 비활성 (FR-BT-014)
  - [ ] 표시 형식은 decimal 고정(Q-03 기본 가정) + **로케일 숫자 서식 적용**(D-18), 2차 착수 전 Q-03 재확인
- **수락 기준**: 경기당 산출 ≤ 10초, 라운드 전체 ≤ 60초. KPI-4 — 1X2 Brier Score ≤ 0.21(1,000경기 누적).
- **테스트**: Vitest — 프리시뮬 시드 ≠ 본경기 시드, 확률 합 = 1, 오버라운드 검증. Playwright MCP — 경기 상세 배당 패널 표시 및 버튼 비활성 확인.

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
  - [ ] Supabase Auth 이메일 인증, 회원가입 시 프로필 + 지갑 자동 생성
  - [ ] `User` / `Wallet` / `WalletTransaction` 테이블 및 도메인 타입 활성화 (사용자 선호 로케일 필드 포함)
  - [ ] 지갑 차감·증액을 DB 트랜잭션 + 낙관적 잠금으로 처리 (이중 지출 방지)
  - [ ] 관리자 라우트 `/admin/**` 인증 + 역할 확인으로 전환 (NFR-SEC-007)
  - [ ] 테스트 계정 2종으로 로그인·지갑 생성 검증
- **수락 기준**: 동시 100건 부하에서 잔액 불일치 0건.
- **테스트**: Playwright MCP — 회원가입 → 로그인 → 지갑 조회 플로우, 비인가 `/admin` 접근 차단.

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
  - [ ] 구조적 JSON 로깅 — 레벨·타임스탬프·상관 ID(`season`/`match_id`)
  - [ ] 6개 핵심 메트릭 수집 및 `/admin` 대시보드 노출
  - [ ] 시즌 종료 시 밸런스 리포트 자동 생성 — 승점 분포·부상률·이적률·부도율·OVR 분포·재정 건전성·평균 득점
  - [ ] 이상 탐지 알림 — 라운드 누락, 시뮬 지연, 부도율 초과, 정산 실패
  - [ ] 공통코드 폴백 발생 시 WARN + 콘솔 카운터
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
| **V-01** 차단성 검증 | Edge 런타임 30경기 CPU 시간 실측. **2초 한도는 어떤 요금제로도 못 푼다** | **Task 033 착수 전** |
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
| Phase 2 UI | 11 (012~022) | 0 | 0 | 11 |
| Phase 3 기능 | 14 (023~036) | 0 | 0 | 14 |
| Phase 4 고급 | 9 (037~045) | 0 | 0 | 9 |
| 사업 트랙 | 3 (901~903) | **3** | 0 | 0 |
| **합계** | **48** | **3** | **0** | **45** |

**즉시 착수 Task (- 우선순위)**: 001, 002, 003, 004, 006, 008, 011, 012, 013, 014
**블로킹 게이트**: **없음** — D-15 ~ D-20으로 1차 릴리스 전 단계의 선행 결정이, **D-21 ~ D-26으로 구현 세부 규칙(구 I-01~I-06)이** 전부 해소됐다. 잔여 미결 4건(Q-03·Q-10·Q-11·Q-12)은 2차 릴리스 이후 사항이다.

---

## 일정 요약 (동기화)

> 출처: [`docs/team-schedule/`](docs/team-schedule/README.md) — **일정·배정의 단일 소스**. 아래는 그 반영본이며, 값이 어긋나면 일정 문서가 옳다.
> 동기화 일자 **2026-07-20** / 적용 인원 **N = 6팀** / 시작일 **2026-07-21(화) = 1일차**

### 총량

| 항목 | 값 |
|---|---|
| 총 잔여 공수 | **211.5 인일** (완료 체크박스 1건 제외) |
| 투입 팀 | **6팀** (1팀 = 1인 상당) |
| 1인 주당 가용 인일 | 4.0인일/주 = **일 0.8인일** (회의·리뷰·컨텍스트 스위칭 20% 차감) |
| **크리티컬 패스** | **74 영업일** — 인원을 늘려도 줄지 않는 하한선 |
| 계획 기간 (버퍼 제외) | **79 영업일** — 1일차 2026-07-21 ~ 79일차 **2026-11-06(금)** |
| 버퍼 (18%, 15일) | 80~94일차 (2026-11-09 ~ 2026-11-27) |
| **총 기간 / 종료 예정일** | **94 영업일 / 2026-11-27(금)** |
| 미배정 Task | **0건** (45개 전량 배정) |

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
| **033** 크론 | **V-01** (Edge 30경기 CPU 2초) | ⚠️ 실측 미완 시 **38일차 착수 불가** | 37일차 SP-3 |
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
