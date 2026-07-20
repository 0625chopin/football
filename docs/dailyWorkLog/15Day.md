# 15일차 작업 로그 (2026-08-10, 월)

## 1. 참여 팀

| 팀 | Task | 작업 | 결과 |
|---|---|---|---|
| 1팀 코어품질 | 008 | 3단 머지 게이트 스크립트화 + 인계 결정 3건 | 완료(팀장 지적 2건 수정 후) |
| 2팀 시뮬엔진 | 023 | 시드 스냅샷 100경기 + 이벤트↔스탯 재계산 | 완료 |
| 3팀 데이터밸런싱 | 007 | Mock 월드 팩토리 | 완료(무결함) |
| 4팀 UI기반i18n | 011 | 로케일 라우팅 전략 확정 | 완료(팀장 지적 2회 수정 후) |
| 6팀 DB인프라 | 032 | 인덱스 + RLS 1차 | 완료(팀장 지적 1건 수정 후) |

**5팀(화면배팅UX) 미참여** — 15일차 배정 행 없음.

## 2. 최종 게이트

`npm run gate` (tsc → lint → test:coverage) **exit 0**
- 433 tests passed / 0 failed, Type Errors 0
- coverage aggregate lines **98.05%** / branches **90.7%**, perFile 전 파일 통과
- DB: `pg_tables.rowsecurity` **39/39**, `pg_indexes` non-pkey **20개**

## 3. 팀별 산출물

**1팀** — `scripts/gate.sh`(신규), `package.json`(`gate` 스크립트), `vitest.config.ts`, `src/lib/data/{bootstrap,factory,fetch-result,result}.test.ts`(신규)
**2팀** — `src/lib/sim/match/snapshot-pipeline.ts`·`match-snapshot.test.ts`·`events.test.ts`(신규), `__snapshots__/match-snapshot.test.ts.snap`(806줄), `stats.ts`(v8 ignore)
**3팀** — `src/lib/mock/world.ts`(930줄)·`world.test.ts`(신규)
**4팀** — `src/proxy.ts`·`src/app/global-not-found.tsx`·`src/i18n/locales.ts`(신규), `next.config.ts`, `src/app/[lang]/layout.tsx`
**6팀** — 마이그레이션 7건(`task032_core_indexes`, RLS A/B/C 3건, hardening 2건, `task032_carryover_indexes`)

상세는 `docs/team-schedule/outputs/` 및 ROADMAP Task 007·008·011·023·032 참조.

## 4. 결정 사항

| 건 | 결정 |
|---|---|
| **I-94** perFile | **채택** — 임계 80/70 유지, 실패 파일 0건 |
| **I-89** global-not-found | **채택** — `experimental.globalNotFound: true` |
| 세그먼트명 | **`[lang]` 유지** — `[locale]` 개명 안 함(17라우트 이동 비용 대비 이득 0) |
| 커버리지 범위 | `sim`/`data`(polling 제외)/`config`/`naming`/`mock` 5개 디렉터리 |
| UI 테스트 전략 | 컴포넌트 = Vitest + Testing Library(jsdom 파일별 오버라이드) / E2E = Playwright MCP(Task 036) |
| 스냅샷 방식 | **다이제스트**(`hashState()` SHA-256, 경기당 hex 2개) — 원본 배열은 수만 줄로 리뷰 불가 |
| **I-97** `world` 1행 생성 | **⑥팀 034a 시드 스크립트로 배정** (§7 참조) |

## 5. 팀장 검증에서 발견된 결함

전원 개발 완료 후 팀장 단독 검증. **5팀 중 3팀에서 결함 4건**(4팀은 동일 계열 2회).

### 5.1 1팀 — 게이트가 커버리지를 실행하지 않음 (치명)
`scripts/gate.sh` 3단계가 `npm run test`(= `vitest run`, `--coverage` 없음)라 **커버리지 임계가 한 번도 평가되지 않았다.** 수락 기준 "임계 미달 시 실패"는 별도 수동 실행으로 시연됐을 뿐 게이트 동작이 아니었고, 커버리지 0%인 PR도 exit 0으로 통과했다. → `npm run test:coverage`로 교체. 팀장이 `--coverage.thresholds.lines=99.9` 강제 시 exit 1 / 정상 시 exit 0을 독립 재현.

### 5.2 1팀 — 커버리지 범위 보류 근거가 사실과 다름
"회계·배당 모듈이 없어 include 확장이 무의미"라고 보류했으나, 팀장이 `src/lib/**`로 넓혀 실측하니 `config` 97.18% / `naming` 96.18% / `mock` 98.74%로 전부 임계를 상회했고 **0%로 미달하는 건 1팀 자기 소유 `src/lib/data/**` 4파일**뿐이었다. → 해당 4파일 테스트 신규 작성. `polling.ts`만 React 훅 의존으로 조건부 제외(I-99).

### 5.3 4팀 — matcher 제외가 무효 lang 렌더를 만듦 (치명, 2회)
1차: `/admin` 배제 → `GET /admin`이 `<html lang="admin">`으로 **홈 화면 200 응답**. I-89 채택 근거를 정면으로 무너뜨림.
2차 수정 후에도 확장자 제외(`.*\..*`)가 남아 `GET /nonexistent.txt` → `<html lang="nonexistent.txt">` 200.
**근본 원인**: matcher는 설계상 일부 경로를 의도적으로 매치하지 않으므로 "프록시가 모든 요청을 정규화한다"는 전제가 성립하지 않음. 제외 목록을 좁히는 방식으로는 닫히지 않음. → `[lang]/layout.tsx`의 `LocaleGate` 2중 방어로 전환, `SUPPORTED_LOCALES`를 `src/i18n/locales.ts`로 단일화. 팀장 클린 재기동 검증에서 무효 lang 렌더 **0건** 확인.

### 5.4 6팀 — §6.2.2 이월분 인덱스 7개 누락
1차 보고는 §6.2.1만 다뤘으나 설계서 §6.2.4가 Task 032 범위를 **21개**(§6.2.1 14 + §6.2.2 7)로 명시. 누락 7개 중 4개는 성능 인덱스가 아니라 **무결성 UNIQUE 제약**이었고, 특히 `player_state_squad_number_uq`는 **3팀이 같은 날 만든 Mock 팩토리가 코드 레벨에서 전제하는 등번호 유일 불변식**인데 DB 방어가 없었다. → `task032_carryover_indexes`로 7건 적용(사전 위반 점검: 대상 5테이블 0행).

### 5.5 팀장 오판 1건
6팀에 "인덱스 19개 도달 확인"을 지시했으나 사전 존재 `world_singleton_uq`를 빠뜨린 계산이었다. 6팀이 맞추지 않고 차이의 출처를 규명해 회신 → **20개가 정답**. 팀장이 정정.

## 6. 신규/갱신 이슈

| 건 | 내용 |
|---|---|
| **I-89** | **해소** — global-not-found 채택(단독으로는 목적 미달성, LocaleGate 병행 필요했음) |
| **I-94** | **해소** — perFile 채택 |
| **I-99** | `polling.ts` 커버리지 조건부 제외 — 4팀 23일차 의존성 도입 시 재포함 |
| **I-100** | `bet`/`bet_market` 인덱스 2건 — 테이블 생성 Task에 재적용 명시 필요 |
| **I-101** | 확장자 경로가 프로젝트 404 UI 아닌 Next 내부 폴백 — 비차단 |
| **I-102** | `is_event_elapsed()` 플레이스홀더 — LIVE 이벤트 즉시 노출(NFR-SEC-004), 2팀 H-24(30일차) |
| **I-103** | `stats.ts` 참가자 미배정 분기 15개 테스트 부채 — 16일차 이후 2팀 |
| **I-104** | 병렬 팀 세션의 실행 환경 간섭 3건(pkill / `tsconfig.json` 오염 / dev 서버 배타) |

## 7. 팀장 조치 기록

- **I-97 소유자 배정 — ⓑ 6팀 034a 시드 스크립트로 확정.** 3팀은 ⓐ(자기 팩토리 확장)를, 6팀은 ⓑ를 지지해 의견이 갈렸다. **6팀 근거를 채택**한 이유: `world`는 `world_singleton_uq`로 단일 레코드가 **DB 제약으로 이미 강제**되고 있어 최초 1행 생성은 스키마 소유팀의 시드 단계에 속하는 부트스트랩이며, Mock 팩토리는 어댑터 전환 전까지 실제 DB에 쓰지 않는 경로라 생성 책임을 두면 "쓰지 않는 코드"가 남는다. **다만 3팀 우려(결정론 로직 이중화)는 타당하므로 조건을 단다** — 034a는 `generateMockWorld` 출력을 INSERT로 매핑하는 **얇은 어댑터**로 구현하고 이름·엠블럼·능력치 생성 로직을 재구현하지 않는다. 20일차 착수 전 확정 완료.
- `tsconfig.json` 원복(4팀 검증 부산물, I-104 ⑵) — `git checkout` 후 `tsc` 통과 확인.
- ROADMAP Task 007·008·011·023·032 일괄 갱신. Task 032 인덱스 항목은 `[~]` 부분 완료.
- 검증용 dev 서버 전량 종료 확인.

## 8. 다음 일차(16일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | Task 008 종료. 다음 Task 착수 시 **I-99 재포함 조건**(4팀 23일차) 캘린더에 유지. `docs/ISSUES.md` 반영 담당이나 15일차분은 팀장이 이미 등재 완료 |
| **2팀** | **I-103** — `stats.ts` 참가자 미배정 분기 15개 테스트. 성능 벤치(Task 023 수락 기준 p95 ≤ 50ms / p99 ≤ 120ms)는 아직 미착수 |
| **3팀** | Task 007 계속 — 진행 상태 Mock(라이브 경기·타임라인·순위표·스탯·뉴스·브래킷). `TasteTag`/`Formation` 확정값이 나오면 `world.ts`의 로컬 풀 교체 |
| **4팀** | Task 011 계속 — 메시지 카탈로그 구조, 번역 키 네이밍 규약. **I-104 운영 규칙 준수**(dev 서버 옵션·타 팀 프로세스) |
| **6팀** | **advisors 성능 4종 이월**(`auth_rls_initplan` 41 / `multiple_permissive_policies` 170 / `unindexed_foreign_keys` 65 / `unused_index` 13) — Task 032 종료(18일차)까지. **I-97 확정 사항**(034a는 3팀 팩토리 출력의 얇은 어댑터) 인지 |
| **팀장** | 소환 지시문에 **I-104 운영 규칙 3종** 포함(I-96 shrimp 규칙과 함께). 5팀은 16일차에도 배정 없으면 계속 미참여 |

## 9. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **I-100** | `bet` 계열 인덱스 2건 | 해당 테이블 생성 Task |
| **I-102** | `is_event_elapsed()` 실판정 로직 | 2팀 H-24(30일차) |
| **I-103** | `stats.ts` 분기 15개 테스트 | 16일차 이후 |
| **Task 032 advisors** | 성능 4종 이월 | **18일차(Task 032 종료)** |
| **I-101** | 확장자 경로 404 UI 통일 여부 | Task 014(34~38일차) 재평가 |
| **SKILL.md 교체** | 14일차부터 이월, 사용자 판단 대기 | — |
| **Playwright 콘솔 스모크** | Chrome 확보 필요, 13일차부터 이월 | — |
