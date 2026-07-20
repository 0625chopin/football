# 28일차 (2026-08-27, 목)

## 1. 참여 팀

| 팀 | Task | 산출물 |
|---|---|---|
| **2팀** 시뮬레이션엔진 | 025 | 시즌 페이즈 상태머신(멱등 전이) |
| **3팀** 데이터밸런싱배당 | 035 | 경기 마켓 N=3,000 프리시뮬 → 결과 분포 → 확률 산출 |
| **4팀** UI기반i18n | 013A | 도메인 표현 컴포넌트 1/2 — 4종 |
| **5팀** 화면배팅UX | 013B | 복합 컴포넌트 1/2 — 2종 (**013B 착수 일차**) |

1팀·6팀은 28일차 행이 없어 미참여. 4팀·5팀이 컴포넌트 카탈로그(SP-2 22종)를 동시에 나눠 만든 첫 일차라 **팀 간 규약 정렬이 검증의 핵심**이었다.

## 2. 최종 게이트

`npx tsc --noEmit` 0 / `npm run lint` 0 / `npm run test` **69 files · 1025 passed** (6 skipped, 6 todo, Type Errors none). 프로덕션 빌드는 I-62로 판정 수단에서 제외(WSL 마운트 EPERM).

일차 시작 시점 대비 신규 테스트 25건(2팀 12 · 3팀 16 · 4팀 5 — 5팀은 I-151로 렌더 테스트 미실행).

## 3. 팀별 산출물

### 2팀 — Task 025 시즌 페이즈 상태머신

- `src/lib/sim/season/phase.ts` (신규), `phase.test.ts` (신규 12건)
- `REGULAR ⇄ CUP_SLOT → PLAYOFF → (TIEBREAK?) → SETTLEMENT → PRESEASON → REGULAR`. 이벤트→`{from,to}` 전이 테이블 기반 순수 함수 `transitionSeasonPhase(phase, event)`.
- **멱등 전이**: 이미 목표 페이즈면 그대로 반환(no-op), 시작 페이즈가 아니면 예외. 수락 기준 "동일 전이 2회 호출 시 1회 효과" 충족.
- `SeasonPhase`는 `src/types/enums.ts`에 이미 6종(TIEBREAK 포함, D-27) 확정돼 있어 재선언 없이 사용. TIEBREAK는 `ENTER_TIEBREAK`/`RESOLVE_TIEBREAK` 대 `COMPLETE_PLAYOFF` 직행으로 갈리는 조건부 경로이며, 동률 판정 자체는 이 모듈 책임이 아니다(호출자가 이벤트 선택).

### 3팀 — Task 035 경기 마켓 확률 산출

- `src/lib/odds/match-market.ts` (신규), `match-market.test.ts` (신규 16건)
- 27일차 `runner.ts`(`runOddsPresimMatch`, 엔진 호출만)를 이어받아 1X2 계층 추가: `tallyMatchOutcomes`(결과 분포) → `computeMatchOutcomeProbabilities`(확률) → `computeMatchOutcomeMarket`(원스톱).
- 수락 기준 "확률 합 = 1"은 `rng/precision.ts`의 `normalizeWeights`로 충족 — 부동소수 누적합이 아니라 **6자리 정수 잔차 흡수**라 합계가 근사가 아니라 항상 정확히 `PROBABILITY_UNIT_MAX`(1,000,000).
- 기본 N은 공통코드 `ODDS_PARAM.MC_N_MATCH`(3,000, 27일차 I-08 해소분)를 `runner.ts`가 읽는다.
- **잔여**: 실제 배당률 변환(`OVERROUND`/`MIN_ODDS`/`MAX_ODDS`, FR-BT-005 ①②)은 오늘 범위 밖.

### 4팀 — Task 013A 도메인 표현 4종

- `src/components/domain/{TeamBadge,PlayerAvatar,AbilityRadar,ConditionGauge}.tsx`, `radar.ts`, `radar.test.ts`(5건), `types.ts` (전부 신규)
- `src/components/ui/{avatar,progress}.tsx` — shadcn 신규 도입 2종(H-11 "미도입" 목록에서 승격). 프리미티브는 이제 **10종**.
- `src/i18n/messages/{ko,en}/{team,player}.ts` 키 추가
- `TeamBadge`는 기존 `src/lib/naming/emblem.ts`의 `generateTeamEmblem(crestSeed)`를 소비(신규 생성기 발명 없음). `AbilityRadar`는 34속성 → 기술/정신/신체/GK 4축 평균을 순수 SVG로 그리며, 분류는 `person.ts` 헤더 주석 것을 그대로 재사용하고 좌표 계산만 `radar.ts`로 분리해 유닛 테스트했다.
- `PlayerAvatar`는 시드 기반 생성기 부재로 이니셜 + `id` 해시 배경색 플레이스홀더(→ I-155).

### 5팀 — Task 013B 복합 2종 (착수)

- `src/components/composite/{EventTimelineItem,NewsItem}.tsx`, `types.ts` (전부 신규)
- `src/i18n/messages/{ko,en}/match.ts`에 `timeline`·`news` 그룹 추가
- `EventTimelineItem`은 `MatchEventType` **23종 전수**를 배지 variant에 매핑하고 `satisfies Record<MatchEventType, …>`로 누락을 `tsc`가 잡게 했다 — 이벤트가 늘면 컴파일이 깨진다.
- 팀·선수를 ID로만 들고 있는 `MatchEvent` 특성상 이름 해석과 `relatedEventSequence`(ASSIST→GOAL 연결)는 리스트 컨테이너 책임으로 두고 표시명은 prop으로 받는다 — 단일 아이템 컴포넌트 범위 밖이라는 판단, 타당.
- 뉴스 도메인 타입이 없어 `NewsItemData`는 로컬 선언(→ I-154).
- shadcn 추가 도입 없음(필요 없었음).

## 4. 팀장 검증에서 발견된 결함

게이트는 4팀 모두 자체 통과 상태로 보고했고 실제로도 그린이었다. **결함은 전부 "팀 하나만 보면 보이지 않는" 팀 간 규약 발산**이었고, 둘 다 5팀 재수정으로 해소했다.

### ① 4상태 판별 규약 불일치 — 해소

같은 일차에 4팀은 `state: DomainViewState<T>` **단일 prop** + 정상 리터럴 `"ready"`로, 5팀은 props에 status를 펼친 형태 + `"success"`로 갔다. 게이트로는 절대 잡히지 않는다(양쪽 다 타입 정합).

**팀장 판정: 5팀이 4팀 규약으로 정렬.** 근거 ⓐ SP-2 카탈로그 22종이 한 화면에서 함께 소비되는데 소비처가 컴포넌트마다 다른 분기 규약을 익히게 된다 ⓑ 지금은 5팀 2파일, 잔여 16종이 나온 뒤면 20종 수정 ⓒ `state` 단일 prop이 표현 prop과 데이터 상태를 섞지 않아 리스트 `map` 안 타입 좁히기가 단순하다.

단 **`domain/types.ts`를 import하지는 말라고 명시**했다 — H-12가 34일차/015 인계라 인계 전 크로스 의존을 만들면 안 된다. 5팀은 `composite/types.ts`에 동형 `CompositeViewState<T>`를 두고 리터럴·prop 형태만 맞췄다(의도적 중복 → I-156).

### ② 불필요한 클라이언트 경계 — 해소

5팀 두 컴포넌트가 `"use client"` + `useTranslation()`이었는데 `onClick`/`useState`/`useEffect`가 **0건인 순수 표현 컴포넌트**였다. 011 규약(`src/i18n/README.md` 13행)은 "`provider.tsx`는 클라이언트 트리 전용, 서버 컴포넌트는 `t()` 직접 호출"이고 4팀 4종은 전부 그 경로를 쓴다.

방치했을 때의 실제 손해: 013B 컴포넌트를 쓰는 소비처가 자동으로 클라이언트 경계에 들어가고, 그 안에서 4팀 서버 컴포넌트를 조합하면 메시지 카탈로그가 번들에 딸려 올라간다. 22종의 서버/클라이언트 경계가 컴포넌트마다 갈리면 소비처가 예측할 수 없다.

→ 5팀이 `"use client"` 삭제, `locale: SupportedLocale` prop + `t(locale, key)`로 전환. prop 순서·이름도 4팀과 동일(`locale`, `state`, `className`)하게 맞췄다. (`readonly` 수식어 유무만 남았고 소비처 영향이 없어 수용.)

### 검증 진행상 특기사항

**1차 피드백 2건 중 ①만 반영되고 ②·③이 누락된 채 완료 보고가 왔다.** 팀장이 파일을 직접 확인해 미반영을 발견하고 재요청했다. 보고 문구가 아니라 산출물로 판정한 것이 맞았다(I-150 계열 교훈의 연장). 재수정 중 일시적으로 `tsc` 2건 오류가 관측됐으나 편집 진행 중 상태였고 최종 그린.

### 그 외 직접 확인 (전부 이상 없음)

`@/types` 서브경로 import 0건(C-5·C-6) / ko·en 키 대칭 3파일 / `domain`↔`composite` 역참조 없음 / `MatchEventType` 23종 전수 / `SeasonPhase` 6종 일치 / `MC_N_MATCH` 공통코드 경유 / 2·3팀 모듈 NFR-DT-001 준수.

## 5. 신규/갱신 이슈

| 건 | 처리 |
|---|---|
| **I-154** (신규) | `news` 번역 그룹이 `match.ts`에 임시 거주 — 뉴스 전용 네임스페이스 부재. 5팀 자진 보고, 4팀 013A(33일차) 구간 판정 |
| **I-155** (신규) | `PlayerAvatar` 시드 기반 절차적 아바타 생성기 부재(`Player.avatarSeed` 없음, `emblem.ts`와 비대칭). 4팀 제보 → 3팀 필요 여부 판정, 필요 시 1팀 타입 배치 반영 |
| **I-156** (신규) | 4상태 계약이 `domain/types.ts`·`composite/types.ts`에 동형 중복 — 의도적(H-12 인계 전 결합 방지). 015(34일차) 합류 판정 |
| **I-151** | OPEN 유지 — 4팀·5팀 모두 렌더 테스트 미실행. 33일차 전 도입 기한 그대로 |
| **I-152** | 미해당 — 오늘 범위에 차트 없음 |
| **I-142** | 1팀 28일차 행 없음 — **26·27·28일차 3일 연속 미착수** |

**운영 메모**: 27일차 잔여 팀 패널 4개가 28일차 착수 직후 뒤늦게 종료 통보됐다 — I-147 재발이며 **2일차 연속**. `git status`로 유실 0 확인했고, 이름이 `d28-*`와 갈려 실제 충돌은 없었다. 접두사 규칙(`d{N}-`)이 이 사고를 무해하게 만들고 있으니 유지할 것.

## 6. 다음 일차(29일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **4팀** | 013A 잔여 **10종**(FitnessBar, FormStrip, PositionMap, StatBar / SkeletonBlock, EmptyState, ErrorState, CountdownTimer, PhaseIndicator, OddsButton)은 33일차 구간. 그 전에 **I-151(jsdom)**, **I-148·I-143·I-144**(토큰 전수 재점검·소비 규약·ΔE) 처리 필요. 신규 **I-154**(뉴스 네임스페이스 판정) 추가. 4상태 계약을 바꾸면 **`composite/types.ts`도 함께** 바꿀 것(I-156) |
| **5팀** | 013B 잔여 **6종**(PitchLineup, BracketTree, TrophyCase, GrowthChart, InjuryTimeline + **MatchCard**). MatchCard는 `density:"card"\|"row"` 단일 통합 + LIVE 배지·경과분(H-24) 조건부 렌더, 공수 **+0.6~0.7인일 증분** 별도 산정분. 차트류는 자체 SVG 1차(I-152, 31일차 판정). **새 컴포넌트는 처음부터 서버 컴포넌트 + `t(locale, …)` + `state` 단일 prop**으로 — 오늘 두 번 고친 지점이다 |
| **2팀** | Task 025 계속(~30일차). 잔여: 배속 재계산. I-145는 소비 계층 생성 시점, I-119는 Task 026(30일차) |
| **3팀** | Task 035 잔여 — **배당률 변환(OVERROUND/MIN_ODDS/MAX_ODDS, FR-BT-005 ①②)**. 신규 **I-155**(아바타 생성기 필요 여부) 판정 추가. I-149는 Task 030 이후, I-136은 36일차 |
| **1팀** | **I-142 3일 연속 미착수** — 다음 배정 구간에서 우선 처리 |
| **팀장** | ⓐ I-131 브랜치 보호 사용자 판단 ⓑ I-121 태그 규약 36일차 전 확정 ⓒ 마감 CI는 러너 결과까지 확인 ⓓ **팀 간 병렬 일차에는 "규약 발산"을 게이트가 못 잡으므로 산출물 직접 대조 필수**(오늘 2건 다 여기서 나왔다) ⓔ 팀원 완료 보고의 미반영 항목은 파일로 확인 후 재요청 |

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **I-131 브랜치 보호** | CI 실패가 머지를 못 막음 | **사용자 판단 대기** |
| **I-132 마이그레이션 드리프트** | 원격 19 vs 로컬 2 | **사용자 판단 대기** |
| **I-128** | Playwright Chromium 미설치 — UI 실측 차단 | **사용자 판단 대기** |
| **V-01** | Edge 런타임 30경기 CPU 2초 이내 | **Task 033 착수 전** |
| **I-151** | jsdom·testing-library 도입 | 4팀, 013A(33일차) 전 |
| **I-153** | Task 012 수락 기준 실측 | 4팀, 013A/013B 실사용 시 |
| **I-152** | 차트 라이브러리(자체 SVG → recharts 폴백) | 5팀, 31일차 |
| **I-148** · **I-143** · **I-144** | 토큰 전수 재점검 · 소비 규약 강제 · ΔE 여유 0.56 | 4팀, 013A(33일차) |
| **I-154** | 뉴스 i18n 네임스페이스 판정 | 4팀, 013A(33일차) |
| **I-155** | 선수 아바타 생성기 필요 여부 | 3팀 판정 → (필요 시) 1팀 타입 |
| **I-156** | 4상태 계약 동형 중복 합류 여부 | 4팀·5팀, 015(34일차) |
| **I-145** | 경고 소비처 | 2팀, 오케스트레이션 계층 생성 시 |
| **I-149** | KPI-8 계약 밀도 재측정 | 3팀, Task 030 이후 |
| **I-142** | 가드레일 자동 검증 | 1팀 (3일 연속 미착수) |
| **I-147** | 중복 기동 재발 방지 | 팀장, 상시 (2일 연속 재발) |
| **I-121** | 공통코드 키 선확정 태그 규약 | **36일차(031a) 전, 팀장** |
| **I-136** · **I-118** | 시드 상수 실값 정렬 | 36일차(031a) |
| **I-123** · **D-23 폴백 파일 분리** | 판정 시점 예약 | 026 착수 시점 |
| **I-119** | 2팀 배정 완료 | Task 026(30일차) 내 |
| **I-111** | 3팀·6팀 배정 완료 | 각 팀 해당 구간 |
