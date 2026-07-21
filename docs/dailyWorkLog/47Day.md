# 47일차 (2026-09-23, 수)

**참여 팀**: 2팀(시뮬레이션엔진) · 4팀(UI기반i18n) · 5팀(화면배팅UX) · 6팀(DB인프라)
**미참여**: 1팀 · 3팀 — 3팀은 **45·46·47일차 3연속 미참여**로 I-229·I-231 이월 지속

---

## 1. 팀별 작업

### 2팀 — Task 027 (넉아웃 테스트)

브래킷 구조 불변식 + 연장·승부차기 시드 스냅샷 Vitest 신설.

- 신규: `src/lib/sim/knockout/bracket-invariants.test.ts`, `bracket-penalty-snapshot.test.ts`, `__snapshots__/`
- 불변식: 전 라운드 시드 중복 0건 · 탈락 시드 재등장 0건 · 승자 전략 3종 교차
- 스냅샷: 실제 대진 × 결정론적 `matchSeed` 회귀 고정
- 자체 테스트: 8 files / 120 tests 통과
- **`homeModifier` TODO는 보류** — 확정 D-\* 부재로 임의 공식 삽입 시 NFR-CFG-001 위반 소지. 이슈 등재로 대체(판단 타당)

### 4팀 — Task 020 (브래킷 뷰포트) + I-226 판정

`BracketTree`(5팀 소유, composite)를 **수정하지 않고** 감싸는 `BracketViewport`(domain, 신규)로 확대/축소·모바일 페이징 구현.

- 신규: `src/components/domain/BracketViewport.tsx`
- 수정: `sample/{component-registry.ts,StateToggleSlot.tsx,page.tsx,component-registry.test.ts}`, `playoffs/[leagueId]/page.tsx`, `cup/page.tsx`, `i18n/messages/{ko,en}/match.ts`(bracket 그룹 9키)
- 줌 75~150% 6단계(`transform:scale` + `w-max`로 내장 `overflow-x-auto` 무력화, 바깥 컨테이너 1개만 스크롤)
- 라운드 이동은 `data-slot="bracket-tree"` **공개 속성** 경유 `scrollIntoView` — 내부 상수 결합 없음
- Playwright 실측(320/1024px, ko·en): 320px 바디 가로 스크롤 없음(`scrollWidth===320`), 내부만 976px 스크롤, 줌 100%→113% 시 976→1098px(정확히 1.125배), 1024px에서 라운드 내비 `md:hidden`
- `/sample` domain 섹션 D-33 등록 완료

### 5팀 — Task 017 D2 잔여 (라이브 폴링)

D3 이벤트 타임라인을 3초 라이브 폴링으로 전환.

- 신규: `matches/[matchId]/{LiveEventTimeline.tsx,timeline.ts}`, `api/live/matches/[matchId]/{route.ts,types.ts}`
- 수정: `matches/[matchId]/page.tsx`, `components/composite/EventTimelineItem.tsx`(`emptyVariant` prop), `i18n/messages/{ko,en}/match.ts`
- **폴링 주기 공통코드 경유**: 서버 `page.tsx`가 `resolvePollIntervalMs("live")`로 해석 → prop 주입, 클라이언트는 `usePolling`에 전달만 (I-222 해소 패턴 동일)
- `aria-live` sr-only 안내 영역 분리 배치(NFR-A11Y-004), FINISHED/VOID 시 폴링 중단(I-6)
- `buildTimelineRows`를 순수 함수로 분리해 SSR·폴링 API가 공유

### 6팀 — Task 033 (NFR-SEC-001) + I-234 잔여

- 서비스 롤 키: Edge Function은 `Deno.env.get`(Supabase 기본 시크릿), `/api/health`는 서버 전용 route → 클라이언트 정적 청크 grep **0건**
- `client.ts`에 PostgREST `count=exact` + `head` + `lte` 추가 → `/api/health` 밀린 Fixture 수를 근사 스캔에서 **정확 집계**로 전환(실 프로젝트 curl 검증)
- I-234(a) 일정 문구 정정은 46일차 커밋(6932077)에 이미 반영 — 신규 조치 없음
- I-234(c) `tick_run` cronHeartbeat: SQL↔TS 언어 경계상 코드 공유 불가, 양쪽 모두 `CRON_PARAM` 단일 소스라 드리프트 없음 → **"결함 아님" 판정 권고**(종결은 1팀 소관, 판정 대기)
- 검증은 기존 공유 dev 서버 curl+grep 재사용, 프로세스 무변경

---

## 2. 팀장 검증

전 팀 완료 후 단독 검증. **전 게이트 통과**:

| 항목 | 결과 |
|---|---|
| `npm run typecheck` | 오류 0건 |
| `npm run lint` | 0 error |
| `npm run test` | 123 files / **1664 tests 통과**, 6 todo, Type Errors no errors |

교차 확인 항목:

1. **폴링 하드코딩 0건** — `LiveEventTimeline.tsx`에 주기 리터럴·직접 조회 없음, 서버 `page.tsx:130`이 유일한 해석 지점. I-222 재발 아님
2. **서비스 롤 키 노출 0건** — `.next/dev/static` grep 0건, 소스에서 `SUPABASE_SERVICE_ROLE_KEY` 참조는 `api/health/route.ts`(서버 전용) 1곳뿐. ⚠️ 단 **프로덕션 번들이 아닌 dev 산출물 기준**(I-62로 프로덕션 빌드 불가) — 한계 명시
3. **D-33 등록** — `BracketViewport` `/sample` 등록·i18n 키 등재 확인. `LiveEventTimeline`은 `src/components/**`가 아닌 라우트 로컬이라 비대상(정상)
4. **소유 경계 준수** — `BracketTree`는 수정 목록에 없음(4팀이 감싸는 방식 선택). `EventTimelineItem.tsx`는 composite=5팀 소유로 적법
5. **5팀 보고 flake 미재현** — `lint-guardrails.integration.test.ts` 훅 타임아웃은 전량 실행에서 재현되지 않음(동시 부하 flake 확정)

### 피드백 반영 2건

- **4팀의 `client.ts` 문법 오류 주장 → 오탐 확정.** 팀장이 typecheck/lint/test 3종 직접 재현, 전부 클린. 6팀 편집 도중 상태를 읽은 것. 보고 처리 방향(이슈 등재 보류·병합 전 확인 요청)은 옳았고 결과만 오탐 → 동시 편집 트리에서는 판단 없이 사실만 보고하도록 지시
- **저장소 루트 검증 부산물 2건 정리** — `cup-320.png`, `cup-320-snapshot.md`(Playwright 산출물)가 `.gitignore` 미포함 상태로 방치돼 커밋에 딸려갈 뻔함. 스크래치패드로 이동(삭제 아님)

---

## 3. 이슈

### 신규

- **I-235** 공유 워킹트리 `git stash` 사고 — 2팀이 전역 typecheck의 스코프 밖 오류를 격리하려 `git stash` 실행, 5팀 `matches/[matchId]/page.tsx`와 6팀 `client.ts`가 함께 말려 들어감. **최종 손실 0이나 그 이유는 조작이 안전해서가 아니라 두 팀이 각자 복구했기 때문.** 2팀의 자체 판정("되돌렸다"·"손실 흔적 없음")은 둘 다 사실과 달랐음(`git stash list` 1건 잔존, `reflog stash`에 복원 기록 0건)
- **I-236** `homeModifier`(`ability/modifiers.ts`) 홈 어드밴티지 공식 미확정 — 확정 D-\* 부재로 Task 027 잔여. 2팀 제보
- **I-237** D1 스코어보드 서버 1회 렌더 — LIVE 진행 중 스코어·경과분이 D3(타임라인)만큼 실시간이 아님. 5팀 제보, 오늘 스코프 밖 판단 타당

### 갱신

- **I-226** 판정 확정 — **ⓑ 병기**(4팀). 근거: 와이어프레임 04번 §4 D3(줄106)이 D3 프리픽스를 `match.event.*`로 명시 + `match.ts` 5팀 주석이 "`enums.matchEvent.*`=뱃지 단어 라벨 / `event` 그룹=문장형 캡션, 용도가 달라 재사용 안 함"으로 설계 의도 기재. ⓐ 전환은 배지를 없애는 것이라 이 주석과 배치됨. **구현은 5팀 소유 경로**(`EventTimelineItem.tsx` + `matches/[matchId]/page.tsx`) 데이터 배선 확장 필요 → D-33 경로 ②로 5팀 다음 등판 최우선
- **I-234** (a) 완료 확인 · (b) `count=exact` **해소** · (c) "결함 아님" 판정 권고 접수 → 1팀 확인 대기

---

## 4. 다음 일차 인계

1. **I-226은 5팀 다음 등판 최우선.** 판정(ⓑ 병기)은 끝났고 남은 건 배선뿐이다. `event.*` 템플릿이 요구하는 변수 10종(blockerName/foulerName/keeperName/victimName/shooterName/score/reason/severity/kickIndex/result)이 현재 `EventTimelineItemData`(teamName/primaryPlayerName/secondaryPlayerName 3종)에 없어 **데이터 배선 확장이 실제 작업량**이다.
2. **3팀이 3연속 미참여다**(45·46·47). I-229·I-231·I-228/I-227 소유팀인데 창구가 계속 안 열린다. `src/lib/data/mock/**`·`src/lib/mock/**` 단일 소유라 대체 불가 — **schedule-planner 배정이 선행돼야 한다.**
3. **I-235에 따라 공유 트리 git 조작 금지를 4팀 전원에 공지 완료.** 재발 시 팀별 worktree 분리를 검토해야 한다. 근본 원인은 "본인 범위만 검증" 원칙인데 전역 게이트를 돌리려 한 것이므로, **검증 스코프 지침(`vitest run <경로>` / `eslint <파일>`)을 팀 md에 명문화할지 판정 필요.**
4. **Task 017은 D2까지 완료, 탭 자체 배선은 여전히 스코프 밖**(46일차 인계 그대로). **Task 020은 47일차 행까지 완료.** **Task 027은 `homeModifier`(I-236) 잔여.** **Task 033은 47일차 행 완료.**
5. **I-234(c) 종결 여부는 1팀 판정 대기** — 6팀은 "설계상 불가피한 중복, 결함 아님"으로 권고했다. 1팀 미참여가 이어지면 이 판정도 계속 밀린다.
6. **I-214 크론 점등 금지 유지** — 해제 조건(2팀 실엔진 연동 + 후처리 배선) 미충족. **I-230(넉아웃 오케스트레이터 소유팀 미정)이 그 조건의 일부**이며 여전히 배정 안 됨.
7. **I-225 · I-223 잔여 4종 변동 없음** — 담당·일차 미배정.
8. **서비스 롤 키 grep 0건은 dev 산출물 기준**이라는 한계가 남는다. 프로덕션 빌드가 가능해지는 시점(I-200 계열)에 재검증 필요.

---

## 5. 미해결·판정 대기

- **I-230** 넉아웃 ET 판정 오케스트레이터 부재 — **소유팀 미정, I-214 해제 조건의 일부(가장 급함)**
- **I-226** 판정 완료(ⓑ 병기), **구현 5팀 다음 등판 최우선** / **I-229 · I-231**(3팀) — 3연속 미참여로 이월
- **I-235** 공유 트리 git 조작 사고 — 검증 스코프 지침 명문화 여부 판정 필요
- **I-236** `homeModifier` 공식 미확정(2팀) / **I-237** D1 스코어보드 실시간성(5팀)
- **I-234(c)** "결함 아님" 판정 — **1팀 확인 대기**
- **I-192 규약 판정**(경계를 넘는 값에 접점 테스트 의무화) — 39일차부터 9일 이월
- **I-228 · I-227** `floorPow2` 절삭에 따른 컵·플레이오프 대진 축소 — **I-50 종속**, 3팀
- **I-225** 컵 슬롯 창 ↔ 페이즈 전이 접점 / **I-223** 인덱스 4종 무배정 — 담당·일차 미배정(schedule-planner)
- **I-224** stale `.next/types` — 1팀 / **I-215 · I-217** 1팀 소관(테스트 인프라 / 동결 타입 배치)
- **I-214** 크론 점등 금지 — **차단성 있음** / **I-218** `/admin` 선행 배정 / **I-208** 소비처 배선 팀·일차 배정
- **I-232 · I-216 · I-220** 표기·구조 정합(3팀 계열, 묶어 처리 권장) / **I-233** 중립지 구장 표기 — 소유 미정
- **I-212**(mock 라이브 점수 + FINISHED 이벤트 로그 — **I-229·I-231과 함께 처리 권장**) / **I-209** 마이그레이션 백필 / **I-211** 시즌 경로 승격 / **I-204** 4강 대진 / **I-205** en 뉴스 한국어 — 전부 비차단
- **I-200 · I-201 · I-202 · I-203** 프로덕션 빌드 불가가 병목이거나 배정 대기(변동 없음)
- **I-189 · I-190 · I-191 · I-194** 값·규칙·표기 정합(변동 없음) / **I-193 · I-197** 031b 밸런싱 루프(66~68일차)
- **I-195** mock 킥오프 시각 / **I-196** 재실측 **8일 연속 미이행** / **I-198** `/sample` 격리 / **I-199** 사용자 조치 대기
