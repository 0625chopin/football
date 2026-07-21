# 41일차 (2026-09-15 화)

**참여 팀**: 2팀(시뮬레이션엔진) · 3팀(데이터밸런싱배당) · 4팀(UI기반i18n) · 5팀(화면배팅UX) · 6팀(DB인프라)
**미참여**: 1팀(코어품질) — 41일차 배정 행 없음

**게이트**: `npm run typecheck` 0 errors · `npm run lint` 0 · `npm run test` **1508 passed / 6 todo**(109 파일, 6 skipped)

---

## 1. 팀별 작업

### 2팀 — Task 027 컵대회 60팀 브래킷

3개 리그 통합 단일 넉아웃(60팀) 브래킷 생성 계층 신설. 전역 시드 1~60(리그1 1~24 · 리그2 25~44 · 리그3 45~60)으로 통합해 **"홈 = 더 큰 시드" 한 규칙**으로 전 라운드 대진을 결정한다. 1라운드는 D-24 우선순위(리그1↔3 → 1↔2 → 2↔3 → 동일 티어 교차)로 결정론 생성하고, 2라운드~결승은 신설한 `LAYER_TAG.CUP_DRAW` 기반 Fisher-Yates 추첨(참가 구성 정렬 해시 → 항상 재현 가능)을 쓴다.

- `src/lib/sim/knockout/cup.ts`(신규) — `generateCupRound1`/`RoundOf32`/`RoundOf16`/`QuarterfinalRound`/`SemifinalRound`/`FinalRound`, `resolveCupWinnerSeed`
- `src/lib/sim/knockout/cup.test.ts`(신규)
- `src/lib/sim/rng/derive.ts` — `LAYER_TAG.CUP_DRAW` + `deriveCupDrawSeed()` **순수 추가**(기존 함수·태그 불변)

수락 기준 충족: bye 4 · 1라운드 28경기 · **총 6라운드 59경기**(28+16+8+4+2+1) · 시드 1~60 중복 없이 전량 소진 · 우승 1팀. 전체 회귀 없음(1495 → 이후 1508).

### 3팀 — Task 043 밸런스 리포트 + (추가 배정) mock 수상 데이터

`generateBalanceReport` 순수함수 신설. 승점·OVR 분포(히스토그램), 부상률·이적률(분모 = 팀 `squadSize` 합), 부도율·재정 건전성(`balance`/`net`/`wageRatio`), 평균 득점(매치 정규화), **KPI-8 4지표**(부도율·재강등률·평균 득점·홈 승률) 밴드 판정. 재강등률은 호출자가 `TeamSeason × Season` 조인 투영(`PromotionRecord`)을 넘기는 구조로 **순수성 유지**.

- `src/lib/obs/balance-report.ts` · `balance-report.test.ts`(신규, 9 tests)

**추가 배정(팀장)** — 4팀 수상 화면이 mock 스텁 때문에 전 섹션 empty로만 뜨는 것이 확인돼, 같은 일차 안에서 `MockDataSource.getAwards`/`getMultiAwardRanking`을 실구현했다. **판단 3건 모두 "값을 지어내지 않음"으로 회신**한 것이 옳았다 — ①다중 시즌은 D-15에 막혀 미반영 ②`getMultiAwardRanking('TEAM')`은 팀 수상 타입이 도메인상 없어 `[]`가 정확 ③`managerId` 역조회는 인터페이스 확장 없이 불가(→ I-213).

### 4팀 — Task 019 수상/명예의 전당

- `src/app/[lang]/awards/page.tsx` · `src/i18n/messages/{ko,en}/awards.ts`(신규) · `messages/index.ts`(등록 줄)

시즌별 수상 표 + 베스트11 피치 뷰(`PitchLineup` 재사용, TEAM_OF_SEASON/WORLD_XI) + 통산 다관왕 랭킹 3부문. 시즌 선택은 GET 링크(`?season=N`, `touchline` 활성 표시)라 **클라이언트 컴포넌트 0개**. `/stats`·`/transfers`(39·40일차) 패턴을 그대로 따랐고 **신규 컴포넌트를 만들지 않아** `/sample` 등록 대상이 없다. `NAV_GROUPS`의 awards는 이미 `pending`이 없어 변경 불필요.

### 5팀 — Task 016 일정/결과 + 40일차 잔여 전량

B1(리그 헤더 + 탭)을 `leagues/[leagueId]/layout.tsx`로 분리해 순위표·일정 두 화면이 공유하도록 했다(W-16 확정).

- `leagues/[leagueId]/layout.tsx`(신규, B1+탭) · `fixtures/page.tsx`(전면 구현) · `[leagueId]/page.tsx`(헤더 제거 + B4 필터 + B5)
- `composite/RoundNav.tsx` · `composite/SeasonSelect.tsx`(신규)
- `composite/MatchCard.tsx`(row 밀도 4상태 배지 + 팀 엠블럼) · `standings-zone.ts`(`isZoneBoundaryAdjacent` 추가, 유닛 7건)
- i18n `league`/`match` 확장 + **`fixtures.ts` 신규 네임스페이스**(4팀 통지, `bet.ts` 전례)

**40일차 인계 1번(B4 노이즈) 결론**: 전량 나열이 아니라 **존 경계 인접 블록만 노출**(중위권 순수 동률 제외). 실렌더에서 7줄 → 2줄로 축소됐고 남은 2줄이 전부 경계 인접임을 확인했다. B1-t 탭 · B5 리그3 리빌드 제재 · 시즌 선택기도 함께 완료. (TIEBREAK Fixture 안내는 mock에 재경기 생성기가 없어 계속 제외.)

### 6팀 — Task 033 어드바이저리 락 + 공통코드 시드

40일차 tick 골격이 **실제로는 없었음**을 확인(40일차 6팀 배정 행 없음과 일치)해 골격과 락을 함께 구현했다. `tick_run()` DB 함수가 락·본작업·해제를 **트랜잭션 하나로** 묶어 `pg_try_advisory_xact_lock`을 쓰고, `CRON_PARAM.LOCK_TIMEOUT_MIN`(5분)을 조회해 `SET LOCAL statement_timeout`을 건다(폴백 5분). **락 실패는 에러가 아니라 `cron_run(NOOP)`만 남기고 200 정상 종료.** `get_advisors` 경고(anon/authenticated의 RPC 직접 호출)도 REVOKE/GRANT로 해소.

- `supabase/migrations/20260721100204_tick_advisory_lock.sql` · `20260721100722_tick_run_restrict_execute.sql`(신규)
- `supabase/functions/tick/index.ts`(신규) · `tsconfig.json`(exclude에 `supabase/functions/**` — Deno 코드)

**검증 방식이 좋았다**: 단위 테스트가 아니라 **REST RPC 병렬 curl(다른 PID)로 true/false 분기를 실증**했다. 공통코드 시드도 38그룹/155코드 적재 완료.

---

## 2. 팀장 검증

전원 개발 완료 후 단독 검증. 게이트(typecheck/lint/test)는 1차부터 전부 그린이었고, **결함 3건은 전부 실렌더·실로그에서만 드러났다.**

| 대상 | 결함 | 발견 수단 | 결과 |
|---|---|---|---|
| 6팀 | 시드를 적재해도 앱이 읽지 않음 | dev 로그 `config/fallback` **45건 잔존** | **I-206** 등재(오늘 해소 불가) |
| 3팀 | `awardScope` 표시명이 enum 리터럴("LEAGUE") 그대로 | `/ko/awards` 실렌더 | 수정 완료 |
| 3팀 | 베스트11 두 세트가 **11명 전원 동일** | `/ko/awards` 실렌더 | 수정 완료(WORLD_XI 티어별 분산 선발) |
| 4팀 | 같은 수상명 3회 반복인데 리그 구분 열 없음 | `/ko/awards` 실렌더 | 수정 완료(리그 열 추가) |
| 4팀 | 감독 부문 랭킹이 「감독 정보 없음」 3행 | `/ko/awards` 실렌더 | 수정 완료(안내 문구로 대체) |

재검증(실렌더): 수상 표 열이 `수상 | 수상자 | 리그 | 범위`로 바뀌고 첫 행이 `리그 MVP | 田中悠真 | Ascension League`로 뜬다. 베스트11 두 세트는 겹침 6명 + 각자 고유 선수를 갖는다. `/en/awards`도 World/Cup/Playoff 번역 확인. 소유 경로 위반 0건, ko/en 키 패리티 일치, **en 한글 누출 0건**(`"한국어"` 로케일 라벨과 주석은 정상).

**6팀 보고 정정**: "정상 폴링 5초 이제 가능"은 성립하지 않는다. `setGlobalDefaultSource()`(`loader.ts:124`) 호출처가 프로덕션 코드에 **0건**이라 DB 값이 있어도 조회되지 않는다. 6팀은 Option B(구현하지 않고 소유 경계만 회신)로 정확히 판단했다 — 등록 지점 `bootstrapApp()`이 1팀 소유이고 41일차에 1팀 배정이 없다.

---

## 3. 이슈

신규 **8건**(I-206 ~ I-213). 상세는 `docs/ISSUES.md`.

- **I-206** 공통코드 전역 기본값 소스 미배선 — 6팀 + 1팀 걸침, **36일차부터 이월된 폴링 문제의 진짜 원인**
- **I-207** FR-LG-015 "2라운드 이후 시드 기반 무작위" 해석(재추첨 vs 최초 고정) — 1팀 판정 요청
- **I-208** 엔진·관측 모듈 4건이 소비처 배선 없이 누적(`cup`·`playoff`·`balance-report`·`metrics`) — **팀·일차 지정 필요**
- **I-209** `supabase/migrations/` 로컬-원격 이력 괴리
- **I-210** 경기 목록 C2를 `<ul>`로 마크업(NFR-A11Y-005 편차)
- **I-211** `leagues/[leagueId]/layout.tsx`가 `searchParams` 미접근 → 헤더가 라이브 시즌 고정
- **I-212** LIVE 경기 행 점수가 항상 `null`(`schedule.ts` ↔ `progress.ts` 미연결)
- **I-213** `DataSource`에 `managerId` 단건 역조회 부재 → 감독 이름 해석 불가

---

## 4. 다음 일차 인계

1. **I-206이 오늘 최우선 인계다.** 6팀이 시드를 넣었는데도 폴링 5초가 안 되는 이유가 밝혀졌다 — ①`common_code`를 읽는 `ConstantSource` 구현(6팀) ②`bootstrapApp()`에 `setGlobalDefaultSource()` 등록 한 줄(**1팀**). **둘 다 필요하고 1팀 배정이 있어야 한다.** mock 모드가 기본값이므로 mock 쪽 소스 공급도 함께 판단할 것. 판정은 dev 로그의 `config/fallback` 감소로 한다.
2. **I-208 — 소비처 없는 모듈이 4건으로 늘었다.** 40일차 인계 3·4번이 해소되지 않고 오히려 2건 추가됐다. `/admin` 대시보드(5팀)가 아직 없다는 것도 그대로다. **다음 일차에 팀·일차를 명시 배정하지 않으면 계속 쌓인다.**
3. **1팀 판정 대기가 3건 쌓였다** — I-207(컵 재추첨 해석) · I-213(`getManager` 추가 여부) · I-206의 ②. 41일차에 1팀 배정 행이 없었던 것이 원인이므로 **다음 1팀 참여 일차에 묶어 처리할 것.**
4. **인덱스 화면**: `/ko/leagues`는 여전히 404다(상세 `[leagueId]`만 존재). 5팀이 오늘 채운 것은 상세뿐이라 `NAV_GROUPS`의 리그 `pending` 플래그는 **유지가 맞다**(5팀 판단, 팀장 동의). 경기·플레이오프·팀·선수도 동일.
5. **SP-3 계약서에 대한 6팀 관점 검토 — 3일 연속 미이행.** 39일차부터 이월 중이며 오늘도 Task 033 + 시드에 시간이 소진됐다. **다음 6팀 일차에 이것부터 배정할 것.**
6. **H-15 크론 배선 미착수** — `tick_run()` 함수는 생겼으나 **pg_cron 스케줄을 걸지 않았다.** 3팀 정산 연동과 함께 별도 일차 배정 필요.
7. **I-201 방침 결정이 계속 미뤄지고 있다** — 오늘도 `/ko/leagues/1/fixtures`(무효 id)가 404 화면을 그리면서 HTTP 200을 반환하는 것을 확인했다. 프로덕션 재현 확인이 선행이나 **프로덕션 빌드 불가가 병목**(I-200과 동일).
8. **셸 컴포넌트 분리**(I-186) 36일차부터 미이행. **I-188**(트리 전역 git 조작 금지)은 소환 지시문에 계속 포함할 것 — 오늘도 5팀 전원 준수.
9. **1팀 — 라이브 API 응답 타입 계약** 확정 시 `api/live/matches/types.ts`의 임시 `LiveMatchesApiResponse` 교체(이월).
10. **오늘의 교훈이 40일차와 정확히 같다.** 게이트 3종이 1차부터 전부 그린이었는데 실렌더에서 결함 4건, 실로그에서 1건이 나왔다. 특히 I-206은 **6팀이 "적재했고 값도 확인했다"고 정확히 보고했는데도 앱 관점에서는 거짓**이었다 — 경계를 넘는 값은 **소비 지점에서 관측**해야 판정된다(I-192 계열 근거 추가).

---

## 5. 미해결·판정 대기

- **I-192 규약 판정**(경계를 넘는 값 공유에 접점 테스트 의무화 여부) — 39일차에 "주석·인계 의무화"로 좁히는 선택지가 제시된 상태. **오늘 I-206이 세 번째 근거를 추가했다. 가장 급함**
- **I-206** 전역 기본값 소스 미배선 — **1팀 배정 필요, 최우선**
- **I-207 · I-213** 1팀 판정 대기(컵 재추첨 해석 / `DataSource` 확장) / **I-208** 소비처 배선 팀·일차 배정
- **I-209** 마이그레이션 이력 백필 / **I-210** C2 시맨틱 판단 / **I-211** 시즌 경로 승격 여부 / **I-212** mock 라이브 점수 미연결
- **I-204** 4강 대진 미명세 / **I-205** en 뉴스 한국어 — 둘 다 40일차 신규, 비차단
- **I-201** `notFound()` 200 — 오늘 재확인, 프로덕션 재현 여부 확인 후 방침 / **I-202** 로거 배선 팀 배정 / **I-203** 스켈레톤 시프트 실측
- **I-200** ko CLS — 프로덕션 검증 환경 확보 시 재실측
- **I-194** `fairPlayScore` 산식 부재 / **I-189** 다자 경계 동률 대진 규칙 / **I-190** 잠정값·`PLAYOFF_PRIZE` 누락 / **I-191** 36 vs 38그룹 표기
- **I-193 · I-197** 031b 밸런싱 루프(66~68일차) 대상 / **I-195** mock 킥오프 시각 분산 — **오늘 실렌더에서 전 경기 "오전 12:00" 재확인** / **I-196** 재실측 **2일 연속 미이행, 이월** / **I-198** `/sample` 조회 단계 격리 / **I-199** 사용자 조치 대기
