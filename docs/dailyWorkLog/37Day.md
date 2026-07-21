# 37일차 (2026-09-09, 수)

**참여 팀**: 2·3·4·5·6팀 (1팀 해당 행 없음 — 미참여) / **SP-3**(엔진 계약 리뷰 · V-01 공유, 2·3·6팀) 실시.
최종 게이트: `typecheck` 통과 · `lint` 클린 · `test` **98 files / 1377 tests 전건 통과, Type Errors 0**.

---

## 1. 착수 전 판정 — I-187 (36일차 인계 1순위)

36일차 인계는 "`RATING_WEIGHT` 값 정의 주체·시점이 사라졌고 2팀 37일차를 막는다"였으나, 착수 전 확인 결과 **전제가 틀렸다** — `docs/require/03-functional-requirements.md` **FR-ST-003 절에 구체 수치가 이미 있었다**(기본 6.0, 골 +1.0 / 도움 +0.7 / 키패스 +0.1 / 실책-실점 −1.0 / 경고 −0.3 / 퇴장 −1.0, `[1.0,10.0]` 클램프, GK 별도표). 값이 없던 곳은 05문서(5.12.1)뿐이고 3팀이 근거로 삼은 문서가 그쪽이라 억측 금지로 비운 것이다.

→ **ⓐ안 확정**: 3팀이 `RATING_WEIGHT`만 선(先) 정의, 2팀은 로더 경유 소비(NFR-CFG-001 준수). 규모가 큰 `OVR_WEIGHT`·`MANAGER_MATCHUP`·`WEATHER_EFFECT`는 별도 산정 대상 존치.

---

## 2. 팀별 작업

### 2팀 시뮬레이션엔진 — Task 026
- `standing/aggregate.ts`(신규) — `advanceStandingRound()`(직전 스냅샷 + 이번 라운드 → `StandingBasis` 누적 → `resolveStandings()`), `buildStandingHistory()`(시즌 배치 재생·캐치업).
- `standing/rating.ts`(신규) — `computeMatchRating()`(FR-ST-003), `parseRatingWeightConstant()`/`resolveRatingWeights()`(I-66 경계 검증 어댑터). `tiebreak.ts`/`stats.ts`를 재사용하고 "누적"·"산식" 레이어만 신설. 테스트 2종 신규.
- `fairPlayScore`는 카드→점수 산식이 문서에 없어 **계산하지 않고 호출자 주입**으로 열어 둠.

### 3팀 데이터밸런싱배당 — Task 031a + I-187
- `config/fallback.ts` — `RATING_WEIGHT` 채움(§3 결함 반영 후 최종 형태).
- `config/schema.ts`(신규) — 코드별 숫자 min/max 카탈로그 + 자체 JSON 스키마 서브셋(외부 의존성 미추가) + `validateCommonCodeValue`(저장 전 거부 게이트). 범위는 **문서에 단위가 명시된 코드만** 채우고 나머지는 의도적 무제한(억측 금지 유지).

### 4팀 UI기반i18n — Task 014
- `components/state/ErrorBoundary.tsx`(신규) — Next 16.2 `unstable_catchError`(`next/error`) 기반. `/sample`의 `ComponentSlot` 22개 전량 배선 → 1개 크래시 시 나머지 21종 생존(임시 크래시 컴포넌트로 실측 후 제거).
- `DataSourceToggle.tsx` + `data-source-actions.ts`(신규) — 어댑터 토글(UC-602). `resetDataSourceCache()`(1팀이 핫스왑 용도로 문서화한 API) 경유, 전환 후 헬스체크 → 실패 시 자동 복귀. `factory.ts`/`bootstrap.ts` 무수정.

### 5팀 화면배팅UX — Task 015
- `MatchCard` 4상태 완성 — 로딩 스켈레톤을 실제 카드 구조로 재구성(CLS 축소), Empty에 `emptyNextKickoffAt`(DC-07 변환), Error에 `onRetry` + 재시도 버튼. **기존 empty/error가 board 표면에서 페이지 토큰을 써 대비가 역전돼 있던 버그를 지시 없이 발견·수정.**
- `LiveMatchGrid` — 최초 로딩 6장 스켈레톤, `nextKickoffAt` prop 신설. 재시도는 1팀 소유 폴링 훅을 건드리지 않고 `key` 리마운트로 구현.

### 6팀 DB인프라 — V-01 실측 (SP-3 공유 마감)
- **19~36일차 로그 전수 확인 결과 실측 자체가 전무**했음(사전 설계만 존재). 35일차 로그의 "self-consistency 추정치"는 KPI-4(3팀 Brier) 건으로 V-01과 무관 — 혼동 분리 기록.
- 2팀 엔진을 Deno 이식, 16일차 `perf-bench.test.ts` 동일 파라미터로 신규 Edge Function 배포 후 실호출.
- **결과: 30경기 핸들러 동기구간 웜 9.5~13.2ms / 게이트웨이 종단 111~162ms(콜드 제외). 한도 2000ms 대비 마진 91.9~99.3%. 300경기(10배)도 42ms. 콜드스타트 1회 1116ms.**
- 산출물 `docs/db/37Day-V01실측결과-SP3공유.md`(벤치 원본·재배포 절차 포함).

---

## 3. 팀장 검증 — 결함 3건 적발·해소

전원 본인 범위 테스트는 통과했으나 **경계에서 새는 결함 2건**과 **가정이 코드로 강제되지 않은 결함 1건**이 나왔다.

### ① `RATING_WEIGHT` 키 공간 불일치 (2·3팀 접점) — 최중대
`fallback.ts`는 `{FIELD, GK}` + `MatchEventType` 키로, `rating.ts` 파서는 `{base,min,max,field,gk}` + `keyof PlayerStatCoreValues` 키로 만들어졌다. 파서가 `base` 부재 시점에 `null`을 반환해 **엔진이 공통코드를 전혀 못 읽고 하드코딩 테이블로 조용히 폴백**했다 — I-187 해소 목적(NFR-CFG-001)이 무산되고 FR-ST-003 수용 기준 ④도 미충족인 무증상 상태였다.

**판정: stat-keyed로 통일.** 근거 — FR-ST-003 예시 6개 중 "키패스"·"실책-실점" 2개가 `MatchEventType` 23종으로 **표현 불가**(3팀도 `OWN_GOAL` 대체를 자인하며 같은 문제를 이슈로 제보), `PENALTY_SHOOTOUT`은 득실이 `detail`에만 있어 type 단위로 안 갈림. 반대 근거인 05문서 646행 "이벤트별"은 I-58(05문서는 갱신하지 않는 초안, 충돌 시 TS가 옳음)로 구속력 없음.

**팀장 1차 지시 오류 → 3팀이 착수 전 재현으로 차단.** flat `{base,min,max,field,gk}`를 요구했으나 `ConstantGroupValues`가 "그룹 → **코드** → JSON object"를 강제해 순수 number인 `base`가 저장 불가(`TS2322`). 3팀이 구현 전 재현해 A(캐스팅)/B(loader 완화)/C(`{value:n}` 래핑) 3안과 함께 보고. → **최종 D안**: `{FIELD, GK, SCALE:{base,min,max}}` 3코드 — 래핑 불필요 · 코드명 UPPER_SNAKE 일관 · 정규화 계층 1단(2팀 파서) 유지.

**재발 방지**: 2팀이 `rating.test.ts`에 접점 통합 테스트 2건 추가 — `SAFE_DEFAULT_VALUES.RATING_WEIGHT`를 파서에 넣어 ①non-null ②FR-ST-003 명시 6개 값 일치를 단언. **테스트 전용 import이며 프로덕션 엔진은 `src/lib/config/**`에 의존하지 않는다(I-83 유지).**

### ② 어댑터 토글 서버 액션에 dev 가드 부재 (4팀)
4팀이 "동시 접속 시 재검토" 수준으로 제보했으나 위협은 한 단계 위였다. `"use server"` 액션은 액션 ID로 **외부에서 직접 POST 호출**이 가능하고 `/sample`은 프로덕션 빌드에 포함되는 일반 라우트라, 배포 시 **인증 없이 서버 프로세스 전역의 데이터 소스를 뒤집을 수 있는 엔드포인트**가 된다. 헬스체크·자동복귀는 "전환 실패"만 막지 "전환 자체"를 막지 않는다. "로컬 전용" 전제가 주석에만 있고 코드로 강제되지 않았다.

→ `setDataSourceKindAction` **최상단**(`data-source-actions.ts:80`, `applyEnv`/`resetDataSourceCache`보다 앞)에 `NODE_ENV !== 'development'` 조기 반환. `page.tsx` 토글 렌더도 동일 조건이나 **UI 숨김은 보조일 뿐 서버측 거부가 본체**임을 주석 명시.

### ③ V-01 임시 Edge Function의 무인증 CPU 소모 벡터 (6팀)
`verify_jwt: true`여도 anon key는 공개값이라 사실상 외부 호출 가능하고, `matches` 파라미터 무상한이라 비용 증폭 벡터였다(6팀이 `matches=999999`로 실증). MCP에 `delete_edge_function`이 없고 Management API 토큰도 없어 **삭제 불가** → 같은 슬러그에 410만 반환하는 스텁 재배포로 **무효화**. 6팀이 "삭제"가 아니라 "무효화"임을 정확히 구분 보고. 벤치 원본은 문서 §7에 보존.

### 교차 확인한 것
- **5팀 킥오프 판정 직접 재현** — `world.ts:182` `MOCK_EPOCH_NOW`(KST 정각 00:00) + `progress.ts:917` 등 오프셋이 전부 1440분 배수라 time-of-day 불변. **DC-07 변환 무죄**, mock 생성기 문제 확정.
- **5팀 Floodlit 규칙** — board 표면의 페이지 토큰 사용을 diff 전수 검색, 유일 히트가 설명 주석.
- **4팀 `unstable_catchError` 실재 확인** — `node_modules/next/dist/client/components/catch-error.d.ts` 공식 예시와 사용 형태 일치.

---

## 4. 이슈

| 번호 | 상태 | 요약 |
|---|---|---|
| **I-187** | **CLOSED** | FR-ST-003 문서 근거 확인 → ⓐ안으로 `RATING_WEIGHT` 정의 완료. 나머지 3그룹은 I-71에 존치 |
| **I-192** | 신규 OPEN — 1팀(프로세스) | **팀 간 JSON 계약이 각자 단위테스트 초록불인 채 갈라져도 아무도 못 잡는다** — 37일차 실발생(①). 이번 건은 접점 테스트로 고정했으나 다른 공통코드 소비 지점에 같은 함정이 남아 있다. **그룹마다 접점 테스트 의무화 여부 규약 판정 필요** |
| **I-193** | 신규 OPEN — 2·3팀, 031b | GK `saves`·`penaltiesSaved` 가중치는 FR-ST-003이 "별도 가중치표"만 요구하고 수치가 없어 **잠정 부여값** |
| **I-194** | 신규 OPEN — 2팀 | `Standing.fairPlayScore` **카드→점수 산식이 어느 문서에도 없다**(05:336에 필드만). `aggregate.ts`는 주입값 합산만 하며 값의 출처가 없다 |
| **I-195** | 신규 OPEN — 3팀 | **mock 킥오프가 1440분 배수 오프셋이라 전 경기 time-of-day 동일**(`progress.ts:917`). 36일차 "다음 킥오프 전부 오전 12:00"의 확정 원인. DC-07은 정상 |
| **I-196** | 신규 OPEN — 6팀, 40일차 | V-01은 **순수 CPU만** 측정 — DB I/O·024 계수체인 미포함. Task 033 골격 후 **I/O 포함 종단 재실측** 필요. 콜드스타트(1116ms) 빈도도 미확인 |
| **I-197** | 신규 OPEN — 3팀, 031b | `schema.ts` 숫자 범위가 **문서에 단위가 명시된 코드만** 채워진 부분 커버리지. 억측 금지상 옳으나 실측 보강 필요 |
| **I-198** | 신규 OPEN — 4팀, 비차단 | `ErrorBoundary`는 **컴포넌트 렌더 단계만** 보호. `Page()` 상단 데이터 조회가 던지면 라우트 전체가 `error.tsx`로 떨어진다(기존 구조). 토글 경로는 헬스체크+자동복귀로 방어됨 |
| **I-199** | 신규 OPEN — 사용자 조치 | V-01 임시 Edge Function `v01-cpu-bench-37d` **슬러그 잔존**(410 스텁으로 무효화, 기능적 위험 없음). MCP·CLI로 삭제 불가 — 대시보드 권한 필요 |

**I-71** — `WEATHER_EFFECT`/`OVR_WEIGHT`/`MANAGER_MATCHUP` 3그룹은 빈 객체로 존치(팀장 확정). `RATING_WEIGHT`만 해소.

---

## 5. 다음 일차 인계

1. **`RATING_WEIGHT` 소비 배선은 아직 없다** — 파서·값·접점 테스트는 완비됐으나, `loadConstants('RATING_WEIGHT')`를 실제로 호출해 엔진에 주입하는 **오케스트레이션 지점이 아직 어느 팀에도 배정되지 않았다.** FR-ST-003 수용 기준 ④는 그 배선이 생겨야 종단으로 충족된다. **소비자(정산·크론)가 생기는 시점에 소유 팀을 지정할 것.**
2. **Task 033 착수 조건 충족** — V-01 통과로 `D-04`·`AS-14` 유효. 단 착수는 026 도착(2팀 **39일차**)까지 대기이며 **6팀은 38~39일차에 자체 작업이 없다.**
3. **키패스·실책-실점은 값만 있고 오늘은 곱해지지 않는다** — Tier B라 폴드에 키가 없다. Tier A 승격 시 `rating.ts` 수정 없이 자동 활성화된다.
4. **정상 폴링 5초 여전히 미적용** — `UI_PARAM` 미적재로 안전망 30초 동작. **6팀의 3팀 시드 적재가 선행 조건**(36일차 이월).
5. **1팀 — 라이브 API 응답 타입 계약** 확정 시 `api/live/matches/types.ts`의 임시 `LiveMatchesApiResponse` 교체.
6. **인덱스 화면 5종(Task 016~021)** 채울 때 `NAV_GROUPS`의 `pending` 플래그 함께 제거.
7. **셸 컴포넌트 분리** — 4팀 권고 상태로 36일차부터 미이행(I-186). **I-188**(트리 전역 git 조작 금지)은 소환 지시문에 계속 포함.

---

## 6. 미해결·판정 대기

- **I-192 규약 판정**(공통코드 소비 계약마다 접점 테스트 의무화 여부) — 같은 결함이 재발할 그룹이 남아 **가장 급함**
- **I-194** `fairPlayScore` 산식 부재 — 값의 출처가 없어 순위표 필드가 무의미
- **I-189** 다자 경계 동률 대진 규칙(명시적 오류로 방어 중) / **I-190** 잠정값·`PLAYOFF_PRIZE` 누락 / **I-191** 36 vs 38그룹 표기
- **I-193 · I-197** 031b 밸런싱 루프(66~68일차) 대상 / **I-196** 40일차 재실측 / **I-199** 사용자 조치 대기
- **뉴스 헤드라인이 `/en`에서도 한국어** — mock 생성기(3팀) 데이터 자체가 한국어. i18n 카탈로그가 아니라 데이터 계층 문제, 실데이터 전환 시 재검토
