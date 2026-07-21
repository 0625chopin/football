# 48일차 (2026-09-24, 목)

> 참여: **1·2·3·5·6팀** (4팀 미참여)
> 주제: **D-34(선수 평점 4지표) · D-35(구단주 ClubOwner) 배치 반영** + 028 승강 교환 + 017 검증 + 033 크론 약수 검증
> 규모: 25파일 / +1147 −37

이 일차의 D-34·D-35는 **47일차 사용자 요청**에서 왔다. 조사 결과 구단주는 저장소 전체에 0건(완전 신규), 평점은 와이어프레임 05 E6이 이미 `평점` 열을 요구하는데 타입에 필드가 없는 **기존 갭**이었다. 근거는 `docs/require/06-prioritization-and-risks.md` 6.3절 D-34·D-35가 단일 소스다.

---

## 1. 팀별 작업

### 1팀 코어·품질 — Task 002 배치 반영 (동결 후 첫 필드 추가)

- `stat.ts` `avgRating`(Season/Career**만**) / `brand.ts` `ClubOwnerId`(E-48) / `person.ts` `ClubOwner`(Manager 대칭, `teamId: null` 공석) / `economy.ts` `signedByOwnerId`(`teamId` 유지) / `*.type-test.ts` 4종 / `DataSource.ts` 계약 3종
- `index.ts`는 배럴이 이미 도메인 파일을 re-export해 **변경 불필요**(확인 후 미변경)
- `src/types/README.md` 매핑표 갱신 — E-48 행 추가, 검산 47→48, 브랜드 ID 32→33. **05문서 원문은 각주만 부기하고 갱신하지 않음**(I-58 규약 준수)
- 검증: `PlayerStatCoreValues` **56키 불변**, `vitest src/types` 98 tests, eslint 0

### 2팀 시뮬레이션엔진 — Task 028 승강 교환

- `promotion.ts` 신규 — `resolvePromotionExchange` / `resolveSeasonPromotionExchange`. `League.teamCount`/`promotionSlots`/`relegationSlots` 주입만 읽고 **24/20/16 리터럴 하드코딩 0**(NFR-CFG-001)
- 상위 강등 슬롯 ≠ 하위 승격 슬롯이면 팀 수 불변이 깨지므로 **예외로 차단**. rank 연속성·슬롯합 초과도 방어
- `TeamSeason.leagueId` 실제 갱신은 오케스트레이션 계층 몫 — 이 파일은 `PromotionSwap[]`만 반환(헤더 명시)
- 검증: 21 tests. **팀장 피드백으로 `promotion.test.ts` 타입 9건 재수정 후 통과**(아래 2절)

### 3팀 데이터·밸런싱 — Task 007·029 소급 + I-231·I-229

- `mock/world.ts` — `avgRating` 채움, **`ClubOwner` 생성**(이름은 `src/lib/naming/` 공유 생성기 경유, D-17), **`SponsorContract` 실제 생성**(`proposeSponsorContract` 호출, 팀당 ACTIVE ≤ 3)
- `economy/sponsor.ts` — 구단주 축(`wealth`·`negotiation`·`reputation`) 반영. **돈 흐름 무변경**(`teamId` 유지, `'OWNER'` 미추가)
- `MockDataSource` — 신규 3종 구현. `getSponsorContracts`/`getTeamSponsorContracts`가 **이제 파라미터를 실제 반영**(이전엔 무조건 `[]`)
- **I-231 해소** / **I-229 부분 해소** — `getPlayerRecentMatchStats`는 `progress.ts` 선생성(경로 ⓑ)으로 실값화. `getMatchLineups`/`getMatchPlayerRatings`/`getMatchTeamStats` 3곳은 `[]` 잔존하나 **허위 주석("생성기 없음")을 실제 사유로 정정**
- 검증: `economy`+`mock`+`data/mock` 14 files / 148 tests

### 5팀 화면·배팅UX — Task 017 완료

- `/[lang]/matches/[matchId]` D3를 Playwright MCP로 실측. **코드 변경 0건**(검증 전용)
- 3초 폴링 ~23초간 **9회** 요청(간격 일관) / ko·en 라벨·미래경계 문구 전환 정상
- **수락 기준 충족** — 22분 픽스처에서 22분 이후 이벤트 0건, 반복 폴링 후에도 동일
- `browser_close` 완료, 저장소 부산물 0건

### 6팀 DB·인프라 — Task 033 + Task 032 소급

- `20260721161158_club_owner.sql` — `club_owner` 신설(`team_id` nullable = 공석, manager 패턴), `avg_rating` 2컬럼(CHECK 1.0~10.0), `sponsor_contract.signed_by_owner_id`(**`team_id` 유지**)
- `20260721161210_cron_interval_divisor.sql` — 크론 주기 약수 검증 트리거. 실측: 7 거부(75%7≠0), 5 통과, 1 원복 확인
- `mapper.ts` 3건 **최소 컴파일 수정**, `SupabaseDataSource` 3종은 기존 Tier B 관례대로 스텁 — **`database.types.ts` 재생성과 캐스트 제거는 51일차 이월**(팀장 확정)
- 검증: advisors 신규 경고 **0건**, `list_tables`에 `club_owner`, `vitest data/supabase` 135 tests

---

## 2. 팀장 검증

전 팀 완료 후 단독 검증. **최종: 공식 게이트 오류 0건 / 전체 스위트 1683 passed·0 failed.**

### ⚠️ 검증 도중 공식 게이트 자체가 고장 나 있었음을 발견 (오늘 가장 중요한 발견)

1팀 제보 → 팀장이 직접 재현했다. `.next/dev/types/routes.d.ts` 96번 줄이 **torn write로 잘린 조각**(`ndlerRoute extends AppRouteHandlerRoutes> {`, 파일 99줄)으로 굳어 있었고, **tsc는 구문 오류를 만나면 다른 모든 파일의 semantic 진단을 건너뛴다.** 그 결과 게이트 출력엔 `.next/` 오류 3건만 찍히고 `src/**` 오류가 **한 건도 나오지 않았다.**

손상 파일 제거 → 라우트 mtime 갱신 + 3개 라우트 방문으로 dev 서버 재생성(3671B, 정상 종결) → **가려져 있던 `src/**` 오류 15건이 한꺼번에 출현**(3팀 6 · 6팀 5 · 2팀 9 중 예상 밖 2팀분 포함). 이 15건을 팀별로 분류해 각 팀에 원문 그대로 전달하고 "이 목록을 0으로" 를 오늘 목표로 잡았다. → **I-242**

### 피드백 → 재수정 → 재검증

- **2팀** `promotion.test.ts` 타입 9건(TS2783 2 · TS2322 7). **2팀 잘못이 아니다** — `vitest` typecheck 모드는 `*.type-test.ts`만 검사해 런타임 테스트 파일의 타입 오류를 잡지 못한다. 2팀이 스프레드 순서를 재정렬하며 **기존 브랜드 캐스트가 스프레드에 덮여 무효화되던 잠재 버그까지 함께 해소**(그대로였다면 `LeagueId`를 실제로는 검증하지 못한 채 통과하는 테스트였다). 재검증 통과
- **3팀** I-231 테스트의 **팀 축 단언 3개가 공허하게 통과할 수 있는 구멍** — `teamContracts`가 비면 `[].every()`가 `true`. 전역 `all.length > 0`은 단단하나 그건 "월드에 계약이 있다"이지 "이 팀에 있다"가 아니며, **팀 축이 곧 5팀 49일차 소비 축**(클럽 상세 F6)이다. 26일차 회계 항등식 테스트가 같은 형태로 지적된 전례를 근거로 보완 요청
- **1팀** `src/types/README.md` E-48 미반영(생산자 DoD, D-33) → 당일 갱신 완료

### 직접 확인한 핵심 항목

| 항목 | 결과 |
|---|---|
| **회계 항등식(D-35 핵심 전제)** | ✅ `src/lib/economy` **64 tests 무변경 통과** — `teamId` 유지 설계가 지켜졌다는 증거 |
| `PlayerStatCoreValues` 키 수 | ✅ **56 불변**(Task 019 랭킹 회귀 0) |
| Mock 결정론(KPI-3) | ✅ 동일 시드 2인스턴스 **바이트 단위 일치** 단언 실재 |
| I-229 주석 정정 | ✅ 허위 사유 제거 확인 |
| 마이그레이션 채번 | ✅ 원격 `list_migrations`와 **정확히 일치** |

---

## 3. 이슈

**신규 4건** (전부 팀장 등재)

- **I-240** ROADMAP 일정 줄 D-31 순연 미반영 드리프트(033·036·037~042·045, M-4·M-5·SP-6) — 기존 부채, **별도 패스로 처리 확정**
- **I-241** Mock LIVE 픽스처가 `MOCK_NOW` 고정이라 "이벤트 점진 노출"을 실측할 수단이 없음 — **결함 아님**(오히려 컷오프가 생성 시점에 굳어 미래 정보 비노출이 구조적으로 보장). 개선 시 **Mock 결정론(KPI-3)을 깨지 않는 방식**이어야 함. 3팀
- **I-242 ⚠️** `npm run typecheck`이 "`.next/**`만 실패"처럼 보이면서 **`src/**` semantic 진단을 통째로 감출 수 있음**. `scripts/typecheck.mjs`의 재시도 로직이 정반대 전제(`src/**`가 안 섞이면 안전) 위에 있다. **이 상태가 언제부터였는지 알 수 없어, 그 사이 "게이트 통과"로 판정된 일차가 있을 수 있다.** 1팀 소유, **다음 등판 최우선**
- **I-243** 로컬 마이그레이션 파일명 ↔ 원격 적용 버전 3건 불일치(특히 `tick_run_batch_cap` 로컬 맨뒤 / 원격 앞쪽) — **재현 경로에서 프로덕션과 다른 최종 상태**가 나올 수 있음. 48일차 6팀 작업은 규칙을 정확히 지켰고 **이전부터의 누적 부채**. 6팀, 51일차 판정

**해소**: I-231(스폰서 계약 mock 생성) / I-229 **부분**(주석 정정 + `getPlayerRecentMatchStats` 실값화, 3곳 `[]`는 잔존)

---

## 4. 다음 일차 인계

1. **49일차 5팀 Task 018 착수 조건은 충족됐다.** 타입·계약·Mock 실값·마이그레이션 전부 도착했고, `avgRating`·`ClubOwner`·`SponsorContract`가 실제로 생성돼 **빈 상태가 아닌 실값으로 소비 가능**하다. 5팀은 배선만 하면 된다.
2. **1팀 49일차는 017 완료 판정(리뷰 게이트 9개 조건) 이월분**이 먼저다(48일차 타입 우선 확정에 따른 이월). **I-242 게이트 조치도 1팀 최우선.**
3. **51일차 6팀** — `database.types.ts` 재생성 + `mapper.ts` 로컬 캐스트 3곳 제거 + `SupabaseDataSource` 스텁 3종 정리 + **I-243 판정**을 함께.
4. **5팀 018은 53일차 유지가 팀장 승인 확정**이며, **51일차 종료 시점에 클럽 상세 1/2(F3-o 구단주 카드 포함)이 미완이면 즉시 보고** → 팀장이 완화 3종 중 택일. 5팀 자체 판단으로 일정·스코프를 바꾸지 않는다.
5. **I-229 잔여** — `getMatchLineups`/`getMatchPlayerRatings`/`getMatchTeamStats` 3곳의 `selectLineup()` 연결과 I-34 LIVE 컷오프 배선은 **Task·일차 미배정**. 3팀이 판정만 남겼다.
6. **Task 030(3팀, 56일차~) 9단계 스폰서 협상은 구단주 경유**로 구현한다(D-35). 오늘 `sponsor.ts`에 들어간 구단주 계수는 근거 수치가 없어 중립값 처리했으므로 **031b 실값 정렬 대상**이다.
7. **4팀은 48일차 미참여** — `/sponsors` 구단주 열 소급은 60일차 배정이며 **I-231이 해소된 지금은 실값 실측이 가능**하다.
8. 47일차 인계 중 **I-226(5팀)·I-230·I-225·I-223·I-235 판정**은 변동 없이 이월.

---

## 5. 미해결·판정 대기

- **I-242** 게이트 오탐 모드 — **1팀, 다음 등판 최우선. 검증 신뢰성 문제라 다른 개선보다 앞선다**
- **I-230** 넉아웃 ET 판정 오케스트레이터 부재 — 소유팀 미정, I-214 해제 조건의 일부
- **I-229 잔여**(3곳 `[]`) · **I-241**(MOCK_NOW 고정) — 3팀, Task·일차 배정 필요
- **I-243** 마이그레이션 채번 불일치 — 6팀, 51일차 판정
- **I-240** ROADMAP 일정 드리프트 — 별도 동기화 패스
- **I-226** 중계 문구 배선(5팀 다음 등판) / **I-237** D1 스코어보드 실시간성(5팀)
- **I-235** 공유 트리 git 조작 — 검증 스코프 지침 명문화 여부 판정 필요(48일차에는 전 팀 지시문에 스코프를 명시해 사고 0건)
- **I-236** `homeModifier` 공식 미확정(2팀) / **I-234(c)** 1팀 확인 대기
- **I-192** 규약 판정 / **I-228·I-227** I-50 종속 / **I-225·I-223** 담당·일차 미배정
- **I-224 · I-215 · I-217** 1팀 소관 / **I-214** 크론 점등 금지(차단성) / **I-218 · I-208** 배정 대기
- **I-232 · I-216 · I-220** 표기·구조 정합 / **I-233** 중립지 구장 / **I-212 · I-209 · I-211 · I-204 · I-205** 비차단
- **I-200~I-203** 프로덕션 빌드 병목 / **I-189~I-191 · I-194** 값·규칙 정합 / **I-193 · I-197** 031b
- **I-195 · I-196**(재실측 9일 연속 미이행) · **I-198 · I-199** 변동 없음
