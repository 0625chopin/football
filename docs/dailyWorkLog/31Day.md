# 31일차 (2026-09-01, 화)

## 1. 참여 팀

| 팀 | Task | 결과 |
|---|---|---|
| **2팀** 시뮬레이션엔진 | 023 | 완료 — Tier B 26필드 재시뮬레이션 구현 + 구조 마커 보정(I-65) |
| **3팀** 데이터밸런싱배당 | 035 (+ I-160, 추가 요청 1건) | 완료 — 토너먼트 브래킷 마켓 · `MANAGER_STYLE_XG` 신설 · `enums.injuryStatus` 신설 |
| **4팀** UI기반i18n | 013A | 완료 — 상태·유틸 2/2 (CountdownTimer·PhaseIndicator·OddsButton) |
| **5팀** 화면배팅UX | 013B | 완료 — GrowthChart·InjuryTimeline. **I-152 판정 확정** |

1팀·6팀은 31일차 배정 없음(팀 md에 해당 행 없음).

## 2. 최종 게이트 (팀장 직접 실행)

| 게이트 | 결과 |
|---|---|
| `npx tsc --noEmit` | exit 0 — **`tsconfig.tsbuildinfo` 삭제 후 클린 재실행분**(I-163 절차) |
| `npm run lint` | 오류 0건 |
| `npm run test` | **83 files passed / 6 skipped**, **1208 tests passed / 6 todo**, Type Errors none (14.62s) |

프로덕션 빌드는 WSL 환경 제약(I-62)으로 판정 수단에서 제외.

## 3. 팀별 산출물

### 2팀 — Task 023 (Tier B 재시뮬레이션 + I-65)

- `src/lib/sim/match/tier-b-resim.ts` (+test, 신규) — `deriveTierBMatchStats`. 11일차 계약 `tier-b-resim-contract.ts`는 **미수정**, 새 파일에 구현체만.
  - 기댓값 테이블(포지션그룹별 기준치)을 **리터럴로 두지 않고 전량 주입**(NFR-CFG-001) — `events.ts` weights, `xg-manager-tendency.ts` table과 동일 패턴.
  - `attempted`만 지터를 주고 `completed = round(attempted × rate)`로 파생시켜 `completed ≤ attempted`를 구조적으로 보장.
- `src/lib/sim/match/events.ts` (+test) — `ensureStructuralMarkers` 추가. `KICKOFF`/`EXTRA_TIME_START`는 구간 개시라 같은 슬롯 앞, `HALF_TIME`/`FULL_TIME`은 구간 종료라 뒤로 정렬.

### 3팀 — Task 035 + I-160 + 추가 요청

- `src/lib/odds/tournament-market.ts` (+test, 신규) — 30일차 `season-market.ts` 패턴 재사용. 우승 라운드는 `normalizeWeights`(합 = `PROBABILITY_UNIT_MAX`), 그 앞 라운드는 승격/강등과 같은 **독립 이진 마켓**(`count/totalRuns` → `toUnits`). 라운드별 시뮬레이션 러너는 범위 밖(`TournamentBracketOutcome[]` 입력부터).
- **I-160 해소** — `catalog.ts`에 38번째 그룹 `MANAGER_STYLE_XG`(`valueType=JSON`, `applyPolicy=NEXT_SEASON` — `MANAGER_MATCHUP`과 동일 근거), `fallback.ts` 실값 6종, `fallback.test.ts` 37→38 갱신. `xg-manager-tendency.ts`는 **읽기만** 하고 미수정(2팀 소유).
  - 실값 근거: `ATTACKING={1.12/1.10}`만 FR-MT-009 명시값이고 **나머지 5종은 이 값 기준의 대칭·비대칭 설계 잠정값** — 031b 밸런싱 튜닝 대상임이 파일 헤더에 기재됨.
- **`enums.injuryStatus` 신설**(팀장 추가 요청) — `src/i18n/messages/{ko,en}/enums.ts`. 소유 경로상 이 파일은 4팀 디렉터리 안이나 **값 채우기는 3팀 기여분**이며, 당일 4팀은 `format.ts`/`common.ts`만 편집해 충돌 없음.

### 4팀 — Task 013A 상태·유틸 2/2

- `src/components/state/{CountdownTimer,PhaseIndicator,OddsButton}.tsx` (신규)
  - `CountdownTimer` — client. `Date.now()`를 **렌더 중에 직접 호출하지 않고** `useEffect`로 미뤄 SSR/하이드레이션 mismatch를 회피. `isPaused` 시 정지 표기, 재동기화는 props 갱신에 위임.
  - `OddsButton` — `disabled` 고정 + **`onClick`/`onSelect` prop 자체를 타입에 노출하지 않음**. FR-BT-014를 관례가 아니라 타입으로 차단.
- `src/i18n/format.ts`(+test) `formatCountdownClock` 추가, `src/i18n/messages/{ko,en}/common.ts` `phase.*`·`countdown.*` 키 추가.

### 5팀 — Task 013B

- `src/components/composite/{GrowthChart,InjuryTimeline}.tsx` (+test 2건) — **자체 SVG**. 좌표 계산을 순수 함수로 분리(BracketTree·PitchLineup 선례 동일), 4상태(loading/empty/error/ready) 전부 구현.
- `src/i18n/messages/{ko,en}/player.ts` — `growthChart`·`injuryTimeline` 그룹 추가.
- 013B 진척: **6/7종 완료**, `TrophyCase`만 32일차 잔여.

## 4. 팀장 검증

게이트 3종이 전부 통과했으므로 **산출물 직접 대조**를 별도로 수행했다(28~30일차 3일 연속으로 이 단계가 게이트 미검출 결함을 잡았다).

| 대조 항목 | 결과 |
|---|---|
| NFR-DT-001 — `src/lib/sim/**` 금지 API | 위반 0건 (검출된 매치는 전부 주석·가드 테스트) |
| C-5/C-6 — `@/types/*` 서브경로 import | 위반 0건 |
| Tier B 26필드 | `tier-b-resim.test.ts:104` 드리프트 가드가 **11일차 계약 목록과 정확히 일치** 검증(독립 12 + 쌍 7개 14 = 26), 반환 행 키 수 26 확인 |
| 구조 마커 4종 | `events.ts`에 4종 전량 정의·정렬 앵커 존재 확인 |
| FR-BT-014 — OddsButton | `onClick` prop 미노출 확인 |
| FR-PL-004 — GrowthChart | 읽는 필드가 `seasonNumber`/`ovr`뿐, `pa` 구조적 미노출 확인 |
| 카탈로그 38그룹 | `catalog.ts:504` / `fallback.ts:293` 양측 등재 확인 |

**결함 1건 발견 → I-164로 등재**(아래). 그 외 반려·재수정 없음.

### 진행 중 상태로 인한 오탐 2건 (실결함 아님)

병렬 편집 중 스냅샷을 본 팀원들의 보고다. **둘 다 최종 상태에서 자동 해소됐고 재현되지 않는다.**

- 4팀이 관찰한 `fallback.test.ts` 실패(`MANAGER_STYLE_XG` 누락) — 3팀이 I-160으로 카탈로그를 편집하던 중간 상태. 3팀이 37→38 카운트를 함께 갱신하며 해소.
- 2팀이 관찰한 `enums.test.ts` 실패(72≠70) — 3팀이 `injuryStatus`를 추가하던 중간 상태. 팀장 재실행 시 11 passed.

두 팀 모두 **"내 변경과 무관"이라고 단정하지 않고 팀장 확인을 요청**했다. 병렬 일차에서 옳은 처리다.

### 교차 제보가 실제로 잡은 건 1건

5팀이 lint 중 4팀 미커밋 파일 `CountdownTimer.tsx`의 `react-hooks/set-state-in-effect` 오류 1건을 발견해 "내 범위 아님, 참고용"으로 보고했고, 4팀이 헬퍼 함수 리팩터로 해소한 뒤 보고했다. 본인 범위만 테스트하는 규칙 아래서도 **부수적으로 눈에 띈 타 팀 결함을 판단 없이 전달**하는 것이 유효함을 보여준다.

## 5. 신규/갱신 이슈

| 건 | 처리 |
|---|---|
| **I-152** 차트 라이브러리 | **해소 — ⓐ 자체 SVG 확정, recharts 미도입.** 5팀이 GrowthChart를 실제 구현한 결과에 근거해 판정(폴리라인·rect 좌표 계산으로 완결, 줌·범례·다중시리즈 요구 없음). 27일차 방침의 ⓑ 폴백 미발동. **런타임 의존성 8개 유지.** |
| **I-160** `MANAGER_STYLE_XG` | **해소** — 3팀 신설 완료. 다만 실값 5종은 잠정치로 031b 튜닝 대상 |
| **I-164** (신규) | 31일차 신규 함수 2종 **소비처 0건** — 파이프라인 미배선 + 호출 순서 제약이 JSDoc에만 존재. **2팀**, 오케스트레이션 계층 착수 시 |
| **I-165** (신규) | `InjuryTimeline` 부상 상태 표시명이 로컬 키에 잔존(정본 `enums.injuryStatus` 신설로 이중화). **5팀**, 32일차 이후 소비처 교체 |

## 6. 다음 일차(32일차) 인계

| 팀 | 인계 사항 |
|---|---|
| **2팀** | Task 023 31일차분 종결. **I-164** — 배선은 오케스트레이션 계층(H-15 이후) 몫이나, 그때 **호출 순서 위반을 잡는 테스트를 반드시 함께** 넣을 것. 배선 전까지 "구조 마커 누락 0건"을 파이프라인 산출물의 속성으로 인용 금지. **I-145**(경고 소비처)도 같은 시점 |
| **3팀** | Task 035 종결(시즌 + 토너먼트). **시즌 MC 러너 호출부는 여전히 미배정** — 팀장이 배정 일차를 정해야 함. `MANAGER_STYLE_XG` 실값 5종은 **031b 밸런싱 튜닝 대상**으로 넘어감. **I-149**(KPI-8 재측정)는 Task 030 이후 |
| **4팀** | 013A 상태·유틸 2/2 완료. 잔여 이슈 묶음 **I-151(jsdom) · I-148 · I-143 · I-144 · I-154**가 그대로 남아 있다 — 013A 종료 구간에 처리. **I-159**(fitness clamp 유틸)는 경미. **I-161**은 020 착수 시 4팀 주도 |
| **5팀** | 013B **6/7종**, `TrophyCase`만 32일차 잔여. **I-165**(injuryStatus 로컬 키 제거) 함께 처리 권장. **I-156·I-157**은 015(34일차)에 4팀과 함께 |
| **1팀** | **I-142 6일 연속 미착수** — 다음 배정 구간 최우선. **I-163**(tsc 증분 캐시) 신규 소관. 동결 타입 배치 2건 대기: `Player.avatarSeed`(I-155, 접수 단계) · `Position` 코드 추가 여부(I-158, 판정 미착수) |
| **팀장** | ⓐ I-131 브랜치 보호 사용자 판단 ⓑ I-121 태그 규약 36일차 전 확정 ⓒ **`gh` 부재로 CI 러너 결과 4일 연속 미확인** — 확인 수단 확보 필요 ⓓ **산출물 직접 대조가 4일 연속으로 결함을 잡았다**(31일차 I-164). 병렬 일차 상시 유지 ⓔ **시즌 MC 러너 배정 일차 결정** |

### 30일차 대비 개선 — 중복 기동 0건

30일차에 4개 팀 전원이 중복 기동된 원인(종료 통보 직후의 빈 `git status`를 "작업 없음"으로 오판)에 대해 개정한 절차가 31일차에 실제로 작동했다. 3팀이 idle 통보를 두 차례 보냈으나 **재소환 대신 초경량 질의**로 처리했고, 두 번 모두 **통보와 팀장 지시가 교차한 것**이었지 유휴가 아니었다. **31일차 중복 기동 0건.**

## 7. 미해결·판정 대기

| 건 | 상태 | 기한 |
|---|---|---|
| **I-131 브랜치 보호** | CI 실패가 머지를 못 막음 | **사용자 판단 대기** |
| **I-132 마이그레이션 드리프트** | 원격 19 vs 로컬 2 | **사용자 판단 대기** |
| **I-128** | Playwright Chromium 미설치 — UI 실측 차단 | **사용자 판단 대기** |
| **V-01** | Edge 런타임 30경기 CPU 2초 이내 | Task 033 착수 전 |
| **I-164** | 구조 마커·Tier B 파이프라인 미배선 | **2팀**, 오케스트레이션 계층 착수 시 |
| **I-165** | InjuryTimeline 상태 표시명 이중화 | 5팀, 32일차 이후 |
| **I-163** | tsc 증분 캐시 거짓 통과 위험 | 1팀 (게이트 소유) |
| **I-151** | jsdom·testing-library 도입 | 4팀, 013A 종료 전 |
| **I-153** | Task 012 수락 기준 실측 | 4팀, 013A/013B 실사용 시 |
| **I-148** · **I-143** · **I-144** | 토큰 전수 재점검 · 소비 규약 강제 · ΔE 여유 0.56 | 4팀, 013A |
| **I-154** | 뉴스 i18n 네임스페이스 판정 | 4팀, 013A |
| **I-161** | 브래킷 i18n 네임스페이스 분리 | 4팀 주도·5팀, 020 착수 시 |
| **I-155** | 아바타 생성기 — 판정 완료(필요) | **1팀** 타입 배치 접수 → 3팀 구현 |
| **I-156** · **I-157** | 4상태 계약 중복 · 피치 좌표계 발산 | 4팀·5팀, 015(34일차) — 함께 처리 |
| **I-158** | `Position` 측면MF·윙백 코드 추가 여부 | **1팀** 판정 (미착수) |
| **I-159** | fitness clamp 공유 유틸 추출 | 4팀, 013A 종료 후 (경미) |
| **I-145** | 경고 소비처 | 2팀, 오케스트레이션 계층 생성 시 |
| **I-149** | KPI-8 계약 밀도 재측정 | 3팀, Task 030 이후 |
| **I-142** | 가드레일 자동 검증 | 1팀 (**6일 연속 미착수**) |
| **I-147** | 중복 기동 재발 방지 | 팀장 상시 — **31일차 0건, 개정 절차 작동 확인** |
| **I-121** | 공통코드 키 선확정 태그 규약 | 36일차(031a) 전, 팀장 |
| **I-136** · **I-118** | 시드 상수 실값 정렬 | 36일차(031a) |
| **I-123** · **D-23 폴백 파일 분리** | 판정 시점 예약 | 026 착수 시점 |
| **I-111** | 3팀·6팀 배정 완료 | 각 팀 해당 구간 |
| **`MANAGER_STYLE_XG` 실값** | 5종 잠정치 | 031b 밸런싱 튜닝 |
| **시즌 MC 러너** | 시즌·토너먼트 마켓 호출부 미배정 | 팀장 — 배정 일차 결정 필요 |
