# 24일차 (2026-08-21 금)

## 1. 참여 팀

| 팀 | Task | 결과 |
|---|---|---|
| **2팀** 시뮬엔진 | 024 | 계수 체인 통합 검증 + `ability/README.md` 신규 — **H-14 3팀 인계 완료** |
| **3팀** 데이터·밸런싱 | 029 | 스폰서 부도 판정 + 계약 일괄 VOIDED + 뉴스 피드 (26일차까지 계속) |
| **4팀** UI기반·i18n | 012 | 브레이크포인트 6종 토큰 + **I-135 해소** (27일차까지 계속) |
| **6팀** DB·인프라 | 034a | **코드 변경 0건** — 22~23일차 완료분과 중복 배정 확인(I-139) |
| **1팀** 코어·품질 | — | **라운드 중 추가 소환** — 팀장 검증에서 발견된 CI 차단 결함 수정(I-138) |

5팀 미참여(6일 연속). 1팀은 당초 미배정이었으나 팀장 검증 중 발견된 차단 결함으로 추가 소환.

## 2. 최종 게이트

`bash scripts/gate.sh` **4단 전체 통과** — typegen / tsc 0건 / lint 0건 / 822 tests(60 files, 6 skipped, 6 todo) / 커버리지 Stmt 96.3%·Branch 88.69%·Func 98.38%·Line 96.26%, perFile 임계 전건 충족.

**CI는 4일 연속 레드였고 오늘 원인이 확정·수정됐습니다(I-138).** 23일차의 "CI 복구" 판정은 로컬 게이트만 보고 내린 오판이었습니다.

**✅ 24일차 커밋(`9b78769`)의 CI가 러너에서 실제로 success입니다**(Secret Scan도 success). 로컬 게이트가 아니라 **GitHub Actions 실행 결과로 확인**했으며, 이것이 23일차 판정과 다른 점입니다 — 5일 만의 실질 복구입니다.

## 3. 팀별 산출물

### 2팀 — Task 024 (종료)
- `src/lib/sim/ability/modifier-chain.test.ts` — "실 공통코드 로더 경로 통합 검증" describe 추가. 23일차 테스트는 weather/manager에 **테스트 전용 리터럴 테이블을 주입**해 실제 로더 경로를 타지 않았음을 스스로 진단하고, `installHardcodedFallback()` 등록 후 오버라이드 없이 `WEATHER_EFFECT`/`MANAGER_MATCHUP` 빈 객체에서 `NEUTRAL_MODIFIER`(1.0) 폴백 → 합성 결과 base 1.0 유지를 고정.
- `src/lib/sim/ability/README.md`(신규) — 9개 계수 함수 표(입력/공식/반환타입/클램프), 체인 조립이 소비자별 부분집합 방식임을 명시(`lineup/select.ts`는 3개만 사용), 미배선 지점 명시(`match/**` 엔진 미연결, `penalty.ts`의 `resolveScoreProbability`가 유일한 명시적 연결점).
- **H-14 인계 절**: Fixture/MatchEvent 필드별 3팀 유의사항(OWN_GOAL teamId 귀속, xg 승격 필드, PK 골 미포함 D-19, `relatedEventSequence`는 표시 전용) + `PenaltyShootoutResult`/`MatchEventDraft`는 3팀이 직접 참조 불필요.

### 3팀 — Task 029 (계속)
- `src/lib/economy/sponsor.ts` — `judgeSponsorBankruptcy` 추가. `Sponsor.balance < 0`을 부도로 판정하되 `bankruptAtSeason`이 이미 있으면 `null` 반환(중복 판정 방지). 확정 시 해당 스폰서의 **ACTIVE 계약만** VOIDED로 전환하고 `SPONSOR_BANKRUPT` 뉴스 피드 아이템 1건 생성.
- 판단 근거: `EXPIRED`/`VOIDED` 계약까지 덮어쓰면 "왜 만료 계약이 부도 시점에 VOIDED가 됐나"라는 이력 왜곡이 생김. 중복 판정은 `salary.ts`의 이중 지급과 달리 **정상 흐름**이라 throw가 아닌 null. 원장 미변경(잔고 변경은 `ledger.ts` 단일 경로 원칙 유지). 부도는 스폰서 축 전역이라 여러 팀 계약이 한 번에 대상이 될 수 있음.
- `src/lib/economy/sponsor.test.ts` — 4케이스(부도 확정/전건 VOIDED, EXPIRED·VOIDED 제외, 정상 잔고 null, 중복 판정 null).

### 4팀 — Task 012 + I-135 (계속)
- `src/i18n/messages/{ko,en}/enums.ts` — `awardScope` 그룹 골격 4종 추가(**I-135 해소**). 값은 19일차 관례대로 enum 리터럴 echo 자리표시자이며 실값은 3팀 몫.
- `src/i18n/messages/ko/enums.test.ts` — `EXPECTED_LITERAL_COUNT` 66 → 70(H-10 문서치와 일치).
- `src/app/globals.css` — `@theme inline`에 NFR-RS-001 브레이크포인트 6종(`--breakpoint-xs`~`2xl`). 값은 `docs/wireframe/00-공통규약.md §5`의 px(320/375/768/1024/1440/1920)를 rem 환산. 2xl은 1920~2560 중 하한만 브레이크포인트로 쓰고 상단은 최대폭 컨테이너 처리. `tailwind.config.ts` **미생성 확인**.
- 시맨틱 컬러 토큰은 같은 문서가 "4팀 H-11(28일차) 전 미정"이라 명시해 미착수 — W-06 각주의 "25일차 시맨틱 토큰"으로 이월.

### 6팀 — Task 034a (코드 변경 없음)
- 조사만 수행. 오늘 지시된 "플래그 전환 + 폴링 훅 실데이터 연결"이 **22~23일차에 이미 완료**됨을 확인: `factory.ts` 레지스트리 전환, `bootstrap.ts` kind 리터럴 분기 동적 import(I-75), `supabase/index.ts` self-registration, `supabase/index.test.ts`의 `NEXT_PUBLIC_DATA_SOURCE=supabase` → `SupabaseDataSource` 반환 실검증.
- `polling.ts`는 `fetcher: () => Promise<T>` 콜백만 받는 **어댑터 비의존 설계**라 Realtime 교체 여지가 이미 확보돼 있고, 소비처인 화면이 28일차 이후라 6팀이 연결할 지점이 없음.
- 팀장이 전 항목을 직접 재현해 주장 타당성 확인 → **I-139 등재**.

### 1팀 — CI 차단 결함 수정 (추가 소환)
- `scripts/gate.sh` — 앞단에 `npx next typegen` 추가(3단 → **4단 게이트**), 근거 주석 기록. `ci.yml`은 미수정(“`npm run gate` 단일 호출” 설계 의도 유지).
- 자체 검증에서 `.next`를 같은 디렉터리 안에 리네임했다가 ESLint 무시 패턴 불일치로 가짜 오류 8,700여 건이 난 사실을 **숨기지 않고 보고** → 팀장 재현 시 처음부터 스크래치패드 밖으로 이동해 회피.

## 4. 팀장 검증에서 발견된 결함

### 4.1 CI 4일 연속 레드 — 23일차 "복구" 판정이 오판 (I-138, 해소)

23일차 인계에 따라 CI 상태를 `curl`로 실측한 결과, 23일차 커밋(`3270015`)과 22일차 커밋(`d30da33`) 모두 CI **failure**였습니다(Secret Scan은 success).

- **원인 확정 경로**: 로그 다운로드는 admin 토큰이 필요해 403이지만, **check-run annotations는 공개 조회가 가능**합니다 — `/repos/{owner}/{repo}/check-runs/{job_id}/annotations`. 여기서 실패 10건의 파일·행·메시지를 전부 확보했습니다. **이 조회 경로가 23일차에 확보된 `curl` 수단의 실질적 확장이며, 이후 CI 실패 진단의 기본 수단입니다.**
- **실패 내용**: `[gate 1/3] tsc --noEmit`에서 6초 만에 실패. `Cannot find name 'PageProps'` 9건 + `Cannot find name 'LayoutProps'` 1건(`layout.tsx:108`).
- **근본 원인**: 두 타입은 Next.js **생성물**(`.next/types` + `next-env.d.ts`)이며 `.gitignore` 대상. 로컬은 이전 `next dev` 산출물이 남아 tsc가 **우연히** 통과했습니다.
- **조치**: `scripts/gate.sh` 앞단 `npx next typegen`. Next 16 공식 문서가 이 CI 시나리오에 정확히 이 처방을 명시합니다.
- **재현 검증 2회**: 1팀 실측 + **팀장 독립 재현** — `.next`·`next-env.d.ts`를 스크래치패드로 완전 이동해 CI 체크아웃 직후와 동일한 상태를 만든 뒤 `bash scripts/gate.sh` **exit 0, 4단 전부 통과** 확인.

### 4.2 검증에서 결함 아님으로 판정한 항목

- **3팀 뉴스 헤드라인 한국어 하드코딩** — 기존 `src/lib/mock/progress.ts`(이적·은퇴·데뷔 헤드라인)와 동일 관례라 신규 결함으로 잡지 않음. 뉴스 피드 i18n은 별도 일정 사안.
- **4팀이 보고한 unstaged 타 팀 파일** — `sponsor.*`(3팀), `modifier-chain.test.ts`·`ability/README.md`(2팀)의 정상 산출물. 손대지 않고 보고만 한 판단이 정확.

## 5. 신규/갱신 이슈

| 이슈 | 내용 |
|---|---|
| **I-138** | **해소(2026-08-21)** — 로컬 게이트가 CI를 보장하지 않은 위양성. `next typegen` 4단 게이트로 수정 |
| **I-139** | **OPEN(비차단)** — 24일차 6팀 행이 22~23일차 완료분과 중복 배정. I-130과 같은 계열의 일정 문서 오류 |
| **I-135** | **해소(2026-08-21)** — 4팀이 `awardScope` 골격 추가, 리터럴 66→70 |

## 6. 다음 일차(25일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **1팀** | CI 게이트는 이제 4단(typegen 포함), **24일차 커밋 CI success 실측 확인됨**. **일차 마감 CI 확인은 `curl .../actions/runs`로 결론만 보지 말고, failure면 반드시 check-run annotations까지 조회할 것**(§4.1 경로). 그리고 **push 후 러너 결과가 나올 때까지 확인해야 마감이다** — 로컬 게이트 통과는 마감 근거가 아니다(I-138의 교훈) |
| **2팀** | **Task 024 종료.** `WEATHER_EFFECT`/`MANAGER_MATCHUP`이 36일차(031a)에 실제 구조로 채워지면 README·통합테스트의 "1.0 유지" 전제 갱신 필요(README에 명시됨). I-123 판정·감독 폴백 파일 분리는 025/026 착수 시점 |
| **3팀** | Task 029 계속(26일차까지) — 잔여: **재정 위기**(`crisis.ts`, 음수 잔고 팀 프리시즌 강제 매각, 25일차). **`AwardScope` 실값 기입 가능해짐**(4팀 골격 완료) |
| **4팀** | Task 012 계속(25~27일차). **25일차는 시맨틱 컬러 토큰**(W-06 각주). 프리미티브 소비는 28일차(013A)부터. `SiteHeader`/`SideNav`/`SiteFooter` 로컬 함수 분리 미착수 |
| **5팀** | 6일 연속 미참여. H-06 ESLint 가드레일 인수 상태 유지 |
| **6팀** | **I-139 — 24일차 행에 잔여 스코프가 정말 없는지 팀장과 재확인 필요.** ROADMAP 727행(`match_event` 필터)은 30일차 확정 대상. I-132 마이그레이션 동기화는 자격증명 필요(사용자) |
| **팀장** | ⓐ **I-139 — `06-DB인프라팀.md` 24일차 행 실효성 재검토** ⓑ I-131 브랜치 보호 사용자 판단(오늘 CI 레드 4일 누적으로 위험 재확인) ⓒ I-121 태그 규약 36일차 전 확정 ⓓ **I-119·I-111 배정 미이행(4일째)** ⓔ I-134 담당 팀 배정 |

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **I-131 브랜치 보호** | CI 실패가 머지를 못 막음 — **4일 연속 레드가 master에 누적된 것으로 위험 실증됨** | **사용자 판단 대기** |
| **I-132 마이그레이션 드리프트** | 원격 19 vs 로컬 2 — 액세스 토큰·DB 비밀번호 필요 | **사용자 판단 대기** |
| **I-128** | Playwright Chromium 미설치 — UI 실측 검증 차단 | **사용자 판단 대기** |
| **I-139** | 6팀 24일차 행 중복 배정 | 팀장, 25일차 |
| **I-134** | catch-up 50→30경기 코드 반영 | 담당 팀 배정 필요, 팀장 |
| **I-121** | 공통코드 키 선확정 태그 규약 | **36일차(031a) 전, 팀장** |
| **I-136** · **I-118** | 시드 상수 실값 정렬 | 36일차(031a) |
| **I-123** · **D-23 폴백 파일 분리** | 판정 시점 예약 | 025/026 착수 시점 |
| **I-119** | xG 배율·숙련도 실현율 Task 행 누락 | **팀장 배정, 30일차 전** |
| **I-111** | 미커버 화면 10종 중 6종 소관 미배정 | 5팀 착수 역산, 팀장 배정 |
| **I-102** | `is_event_elapsed()` 실판정(현재 스텁) | 2팀 H-24(30일차) |
| **I-137** | `match_event_visible` 의도적 수용 문서화 | 6팀 |
| **I-130** · **I-129** · **I-115** | 비차단 | 별도 일정 |
| **I-107** | 브래킷 부전승·컵 라운드 축소 | 5팀 브래킷 화면 착수 전 |
| **I-101** | 확장자 경로 404 UI 통일 | Task 014(34~38일차) |
| **I-100** · **unused_index 73** | 인덱스 관련 | 해당 Task / 042(58~62일차) |
| **I-112** 승인됨 · **I-109** 낮음 · **관계 R-06** 미확정 · **I-120·I-122·I-124·I-125·I-126** | 비차단 | 별도 일정 |
| **SKILL.md 교체**(14일차~) | 이월 | 사용자 판단 대기 |
