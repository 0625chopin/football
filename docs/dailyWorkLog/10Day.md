# 10일차 작업 로그 — 2026-08-03(월) · **화면 코드가 처음 생긴 날**

> 작성: 팀장 / 대상 일차: **10일차 (2026-08-03 월)**
> 이전: [`9Day.md`](./9Day.md)
> 사이클: **작업 → 개별 보고 → 상호 공유·충돌 체크 → 조율 해소 → 마감 검증**

---

## 1. 참여 현황 — **5팀** (5팀 화면·배팅UX 제외)

| 팀 | 배정 | 산출물 | 상태 |
|---|---|---|---|
| **1팀 코어·품질** | Task 004 — 어댑터 선택 팩토리 + 4상태 결과 래퍼 | `src/lib/data/factory.ts` · `result.ts` (신규) | ✅ 완료 |
| **2팀 시뮬엔진** | Task 023 — 이벤트 23종 생성·시간순 정렬 | `src/lib/sim/match/events.ts` (신규) | ✅ 완료 |
| **3팀 데이터·밸런싱** | Task 003 — 상수 로더 인터페이스 | `src/lib/config/loader.ts` · `loader.test.ts` (신규) | ✅ 완료 |
| **4팀 UI기반·i18n** | Task 005 — 라우트 생성 1/2 (8개) | `src/app/[lang]/**` 9파일 (신규) | ✅ 완료(**재작업 1회**) |
| **5팀 화면·배팅UX** | — | — | ⏸ 1~27일차 장기 대기(팀 md §2) |
| **6팀 DB·인프라** | Task 009 — 관계 R-01~R-13 반영 | `docs/db/schema-design.md` (갱신) | ✅ 완료 |

**이 일차의 성격**: `src/app/`에 `layout.tsx`/`page.tsx`/`globals.css`밖에 없던 상태가 오늘 끝났습니다. 동시에 1·3팀이 세운 데이터 접근 계약과 2팀 엔진이 처음으로 **같은 날 서로를 마주 본** 날이기도 합니다 — 그 접합면에서 이슈 3건이 나왔습니다(§4).

---

## 2. 팀별 작업 요약

### 2.1 1팀 — `factory.ts` · `result.ts`

- **`result.ts`**: `Result<T>` 판별 유니온(`LOADING`/`ERROR`/`EMPTY`/`SUCCESS`) + 생성자 4종·타입가드 4종·변환 헬퍼 2종(`fromNullable`/`fromArray`). `@/types` 비의존 범용 유틸.
- **`factory.ts`**: `NEXT_PUBLIC_DATA_SOURCE=mock|supabase` 파싱. 잘못된 값은 **`mock` 안전 폴백**(`@supabase/*` 미설치 상태 근거).
- **설계 판단 — self-registration 레지스트리**: mock(3팀 Task 007)·supabase(6팀 Task 034) 구현체가 아직 없어 `factory.ts`가 `./mock`·`./supabase`를 정적 import하면 `tsc`가 즉시 깨집니다. 그래서 `registerDataSource(kind, provider)`로 **각 팀이 스스로 등록**하고 `getDataSource()`가 조회·캐시하는 구조를 택했습니다. 3팀·6팀 모두 교차 점검에서 자기 Task와 정합함을 확인했습니다.
- **의도적으로 하지 않은 것**: `DataSource.ts`(9일차)를 수정하지 않았습니다. 근거와 후속은 §4.1(I-61).

### 2.2 2팀 — `events.ts`

- `MATCH_EVENT_TYPES` 23종을 `Record<MatchEventType, true>` 리터럴로 선언 — 유니온 멤버가 추가·삭제되면 **컴파일타임에 즉시 실패**합니다.
- `MatchEventDraft = Omit<MatchEvent, 'id'|'matchId'>` — 두 필드는 영속 계층이 부여하므로 순수 함수 산출물에 존재할 수 없다는 판단. 6팀이 스키마와 1:1 대응함을 확인했습니다.
- `assertNoDisplayText` — `detail`에 `label`/`text`/`message` 류 키나 공백 포함 문자열이 섞이면 런타임 거부. 완료 판정 "표시 문자열 0건"(D-18)을 코드로 강제합니다.
- **밸런싱 리터럴 0건** — `occursProbability`·`weights`를 전부 호출자 주입으로 남겼습니다. 팀 md의 "9~12일차는 공통코드 불필요한 구조 부분만" 각주 준수. 이 판단의 전제가 §4.2(I-66)의 미결로 이어집니다.
- **시드 충돌 사전 회피**: `tick.ts`(9일차)가 경계분 45/90에서 `deriveEventSeed(matchSeed, boundaryMinute, 0)`을 호출합니다. `MatchTick.tick`을 그대로 넘기면서 `eventIndex=0`을 쓰면 `tick===45` 슬롯에서 스토피지 추첨과 **동일 시드**가 나옵니다. 2팀이 착수 전에 발견해 `eventIndex`를 1·2로 옮겨 회피했고, `tick.ts`(타 일차 산출물)는 건드리지 않았습니다.

### 2.3 3팀 — `loader.ts`

- `loadConstants<G extends CommonCodeGroupCode>(group: G)` — 36개 그룹코드를 리터럴 유니온으로 **컴파일타임 강제**(오탈자·미등록 그룹은 `tsc` 오류). 반환 타입은 그룹의 `valueType`에서 자동 유도(`INT`/`DECIMAL`→`number`, `STRING`→`string`, `BOOL`→`boolean`, `JSON`→`Readonly<Record<string, unknown>>`).
- 이것이 수락 기준 **"엔진이 리터럴 대신 로더를 쓰는 경로가 타입으로 강제된다"**의 실체입니다.
- 해석 우선순위(전역 기본값 → 하드코딩 폴백)는 `ConstantSource` 주입 방식(`setGlobalDefaultSource`/`setFallbackSource`)으로 확장 지점만 확정 — 11일차 `fallback.ts`가 연결합니다. 그룹 단위 `Map` 캐시 + `invalidateConstants(group?)`/`onConstantsInvalidated` 포함.
- **동기 함수**입니다. 2팀이 교차 점검에서 이 점을 명시적으로 확인했습니다 — 비동기였다면 엔진 호출 체인 전체가 `async`로 오염될 뻔했습니다.
- 테스트 10케이스(우선순위·캐시·무효화·소스 미등록 에러·`@ts-expect-error`로 타입 강제 검증).

### 2.4 4팀 — `src/app/[lang]/**`

- 9일차 §7.4 결정(팀장 승인: `app/[lang]/` 조기 배치)을 실제 코드로 옮겼습니다. 8개 라우트 전부 빈 `page.tsx`(params JSON echo만), `PageProps<'/[lang]/...'>` 헬퍼로 타입 지정.
- create-next-app 데모 `src/app/page.tsx` 삭제.
- 참조 문서: `01-app/01-getting-started/03-layouts-and-pages.md`, `03-file-conventions/layout.md`, `03-file-conventions/page.md`, `03-file-conventions/dynamic-routes.md`, `02-guides/internationalization.md`.
- **재작업 1건** — §5.1 참조.

### 2.5 6팀 — `schema-design.md`

- R-01~R-13 13개 관계 전량 반영. R-01/R-07/R-13은 9일차에 §3에 이미 있어 짧게, 나머지 10건은 "05문서 정의 → TS 재확인 근거(파일:라인) → 물리 표현 → 삭제정책(16일차 이월 각주)" 4단으로 전개. 13/13 자기검증표 첨부.
- **9일차본 오류 자체 발견·정정**: `fixture.snapshot_id NOT NULL` 관계를 §3.4와 §6.1 두 곳에서 `R-06`으로 표기했으나, 05문서 §5.14 정본 대조 결과 **R-04**(Fixture → SimConstantSnapshot)이고 `R-06`은 별개(Sponsor↔Team, SponsorContract 경유)였습니다. 두 곳 정정 + §6.1에 정정 로그 기록.

---

## 3. 1차 교차 점검 (팀원 간) — 결과

5팀 전원이 서로의 산출물을 직접 열람했습니다. **차단성 충돌 0건.**

| 점검 축 | 판정 |
|---|---|
| 2팀 `MatchEventDraft` ↔ 6팀 `match_event` 테이블 | ✅ 완전 정합 — 10필드 1:1 대응, `id`/`match_id` 제외 근거가 양쪽 동일. `detail jsonb NOT NULL` ↔ `EMPTY_DETAIL = {}`(null 아님) 일치. 23종 리터럴 목록 대조 완료 |
| 3팀 `catalog.ts`/`loader.ts` ↔ 6팀 `common_code_group`(E-42) | ✅ 완전 정합 — `value_type` 5종 ↔ `ScalarForValueType` 조건부 타입 1:1. `Pick`으로 제외한 `isActive`/`createdAt`/`updatedAt`이 정확히 "DB 생성 시점 컬럼"과 일치 |
| 1팀 `factory.ts` ↔ 3팀 Task 007 / 6팀 Task 034 | ✅ 양 팀 모두 자기 구현 계획과 정합 확인. `provider`가 동기 함수라 2팀 RNG(순수·동기) 기반 결정론 Mock과도 맞음 |
| 1팀 `result.ts` ↔ 4팀 FR-UI-000 | ✅ 충족. 섹션별 Empty 문구(FR-UI-005/006)는 `DataSource` 메서드가 이미 섹션 단위로 분리돼 있어 각 컴포넌트가 메시지 키를 주입하면 됨 — `EmptyResult`에 사유 필드 불필요 |
| 2팀 `events.ts` ↔ 4팀 19일차 `enums.ts` 카탈로그 | ✅ 23개 리터럴을 카탈로그 키로 그대로 사용 가능. 다만 4팀은 `@/types`의 `MatchEventType`에서 파생시키고 `src/lib/sim/**`의 런타임 상수는 import하지 않을 계획(소유 경계 유지) |
| 3팀 `loader.ts` sim 순수성(NFR-DT-001) | ✅ `Math.random`/`Date.now`/`react`/`@supabase` 0건, IO 없음, 전부 인메모리 |
| 4팀 라우트 식별자 ↔ 6팀 스키마 | ✅ `leagueId`/`playerId`/`teamId` 브랜드 타입 대응. `matchId`는 엔티티가 `Fixture`지만 6팀 스키마도 `match_event`/`match_seed`/`match_rating`으로 "match" 접두를 관례로 써 자연스럽게 정합 |
| 4팀 라우트 D-18 위반 여부 | ✅ 빈 골격이라 표시 문자열 0건 |

---

## 4. 이날의 핵심 발견 — **접합면 3건**

1·3팀의 계약과 2팀 엔진이 처음 같은 날 만나면서, **각 팀 안에서는 옳지만 팀 사이에서는 미결**인 지점이 드러났습니다.

### 4.1 `Result<T>`를 어디에 적용하는가 (I-61)

`DataSource.ts` 헤더(9일차)가 "10일차에 56개 메서드를 `Promise<Result<T>>`로 감싼다"고 예고했으나, 1팀은 오늘 **감싸지 않기로** 판단했습니다. 근거: ① ROADMAP Task 004 체크박스 문언이 `factory.ts`·`result.ts` **정의**만 요구 ② FR-UI-000 원문이 "화면/컴포넌트" 단위 요구사항이라 소비 지점이 `DataSource`보다 상위 계층일 가능성 ③ 56개를 기계적으로 감싸면 `T|null`(단일)/`readonly T[]`(컬렉션) 반환에서 EMPTY와 값 자체의 `null`/빈 배열이 **의미를 이중으로 갖는 설계 모호성**이 생기고, 이는 3팀·6팀 구현에 큰 영향.

**팀장 확정**: 11일차 `polling.ts` 설계 시점에 적용 위치를 못박는다. 교차 점검에서 나온 두 제약을 I-61에 함께 기재했습니다.

- **[4팀 요구, 채택]** `Result<T>` 생성 헬퍼를 **폴링 훅 전용으로 좁게 만들지 말 것.** 오늘 만든 8개 라우트는 서버 컴포넌트라 초기 렌더가 폴링이 아니라 **1회성 await**다. "단발 조회 → Result 변환"과 "폴링 훅"이 동일 헬퍼를 공유해야 RSC 초기 페치에서 재사용된다.
- **[3팀 의견, 해소 기한 조건부화]** `DataSource.ts` 시그니처를 **유지**하고 상위에서 감싸는 방향이면 11일차 확정으로 충분(3팀 Task 007 무영향). 반대로 `DataSource.ts` 자체를 바꾸는 결론이면 **3팀 Task 007 반환 타입에 직접 영향**이므로 13일차 착수 전 확정 필수.

### 4.2 이벤트 확률·가중치는 누구 것인가 (I-66)

2팀이 "밸런싱 수치는 3팀 공통코드 몫"이라 판단해 리터럴을 만들지 않았는데, **2·3팀이 각각 독립적으로** `catalog.ts` 36그룹을 전수 확인한 결과 **대응 그룹이 없습니다**(`WEATHER_PROBABILITY`는 날씨 전용, `CARD_PARAM`·`RATING_WEIGHT`는 용도 다름).

두 갈래가 남습니다 — ① 공통코드 그룹 신설 대상인지, ② 애초에 2팀 Task 024 **계수 체인이 실시간 산출**하는 값이라 정적 테이블 자체가 불필요한지. 후자라면 "갭"이 아니라 "공통코드 대상 아님"이 맞는 판단입니다. **Task 024 착수(17일차) 전 2·3팀 협의로 확정**합니다.

부가로, 3팀 `ConstantGroupValues<G>`의 키 타입은 `Record<string, ...>`로 열려 있고(그룹 내부 코드가 카탈로그에 구조화돼 있지 않음) 2팀 `weights`는 `Record<MatchEventType, number>`(23키 강제)라, 접합 시 **검증·변환 어댑터가 한 단계 필요**합니다.

### 4.3 메타 이벤트가 확률 추첨 대상 (I-65)

2팀이 **자기 산출물의 결함을 스스로 찾아** 보고했습니다. `KICKOFF`/`HALF_TIME`/`FULL_TIME`/`EXTRA_TIME_START`처럼 "경기당 정확히 1회 반드시 발생"해야 하는 메타 이벤트를 골·파울과 **동일하게 매 틱 가중치 추첨** 대상으로 취급하고 있습니다.

이게 왜 중요한지는 1팀 `result.ts`와 붙여 봐야 보입니다 — `weights`/`occursProbability` 조합에 따라 **FINISHED 경기인데 이벤트 0건**이 가능하고, `fromArray()`가 이를 SCHEDULED(미실시)와 **동일한 `EMPTY`로 접어** UI가 "경기 예정"과 "경기 끝났는데 로그가 빈 버그"를 구분하지 못합니다. `result.ts` 쪽 결함이 아니라 생성 측에서 메타 이벤트를 고정 틱에 결정론적으로 발생시켜야 합니다. **2팀, 11~16일차 `stats.ts` 작업 시 해소.**

---

## 5. 2차 교차 점검 (팀장) — 발견 2건

### 5.1 루트 `layout.tsx`의 `lang="en"` — **1차에서 5팀 전원이 놓침**

`[lang]` 세그먼트가 오늘 도입되면서, 그 **위에 있는** `src/app/layout.tsx`가 `<html lang="en">`을 하드코딩한 채 남았습니다. D-18상 기본 로케일은 **ko**이므로 `/ko/*` 접근 시 문서 언어가 잘못 선언됩니다(스크린리더 발음·번역 힌트에 직접 영향). `metadata`도 `title: "Create Next App"` 그대로였습니다.

4팀의 "12일차 전엔 손댈 이유 없음"이라는 판단은 `[lang]` 도입 **전** 기준으로는 맞았지만, 오늘 도입으로 전제가 바뀐 것을 아무도 다시 보지 않았습니다.

**4팀 재작업 — 최소 대응을 넘어 정식 구조로**: 팀장은 "방법이 없으면 `ko`로 하드코딩하고 근거를 남기라"고 지시했으나, 4팀이 `internationalization.md`의 "Static Rendering" 절에서 **정석 구조**를 찾아왔습니다 — 레이아웃은 "root segment down to that layout" 방향으로만 `params`에 접근 가능하므로(`layout.md`), `[lang]`보다 위의 별도 최상단 레이아웃은 **구조적으로 `lang`을 절대 읽을 수 없습니다.** 하드코딩이 불가피한 완화책인 게 아니라 **분리된 두 레이아웃 구조 자체가 문제**였습니다.

- `src/app/layout.tsx` **삭제**, 그 내용(Geist 폰트·`globals.css`·metadata)을 `src/app/[lang]/layout.tsx`로 이관.
- 이 파일이 이제 `LayoutProps<'/[lang]'>`로 `lang`을 받아 `<html lang={lang}>`을 **동적 설정**하는 루트 레이아웃입니다(`app/` 최상단에 `[lang]` 외 세그먼트가 없어 "루트 레이아웃 생략 시 하위 레이아웃이 그 자리의 루트가 된다" 규칙에 부합).
- `metadata`는 `{ title: "football4", description: "가상 축구 리그 시뮬레이션 · 개발 진행 중" }`으로 최소 교체. 로케일별 지역화는 Task 011 이월.
- 검증: `/ko` → `<html lang="ko">`, `/en` → `<html lang="en">` 응답 HTML 직접 확인.

### 5.2 I-62의 실제 범위가 등재보다 넓음 — **`npm run build`도 실패**

4팀은 Turbopack **dev 서버** 실패만 보고했고 프로덕션 빌드는 "별도 확인 필요"로 남겼습니다. 팀장이 직접 실측했습니다.

```
npm run build (Turbopack)   →  실패. .next/build/*.js 쓰기 시 Operation not permitted (os error 1)
                                globals.css PostCSS용 webpack loader 평가 풀 생성에서 터짐
npx next build --webpack    →  ✓ Compiled 9.9s / TypeScript 4.9s / static pages 9/9 성공
                                그러나 마지막에 EPERM: copyfile
                                .next/server/app/_not-found.html → .next/server/pages/404.html
```

**webpack 경로에서도 EPERM이 납니다.** 즉 원인은 Turbopack 고유가 아니라 **WSL DrvFs/9P 마운트의 파일 연산 제약**일 가능성이 높습니다. `--webpack`은 **dev만** 우회 가능하고, **프로덕션 빌드는 번들러와 무관하게 실패**합니다.

**영향이 4팀 13일차 스모크를 넘습니다** — `npm run build` 성공을 수락 기준·CI 게이트로 삼는 **모든 Task**가 현재 이 환경에서 통과 불가입니다. 1팀 Task 008(테스트 정비)·Task 010(ESLint 룰)에서 "빌드 실패로 검증" 류 기준을 세울 때 이 제약이 전제입니다.

**유력한 근본 해소책은 리포지토리를 WSL 네이티브 파일시스템(`~/` 하위)으로 이전**하는 것이나, 이는 팀장/사용자 결정 사항이라 이슈에 **선택지로만** 기재했습니다.

---

## 6. 이슈 등재 — 신규 6건 + 갱신 1건

전부 1팀이 `docs/ISSUES.md`에 반영했습니다(제보는 전원, 반영은 1팀 원칙).

| 번호 | 내용 | 담당 | 해소 기한 |
|---|---|---|---|
| **I-61**(갱신) | `Result<T>` 적용 위치 미확정 + 4팀 공용 헬퍼 요구 + 3팀 조건부 기한 | 1팀 | 11일차 `polling.ts`(조건부 13일차) |
| **I-62** | WSL 마운트에서 dev·**build 모두** 실패 (§5.2) | 팀장 | 13일차 스모크 전 |
| **I-63** | `06-DB인프라팀.md` 16일차 행 `R-06`→`R-04` 오표기 | 팀장 | 16일차 착수 전 |
| **I-64** | shrimp-task-manager 팀 간 공유로 계획 상호 덮어쓰기 | 팀장 | 운영 규칙 검토 |
| **I-65** | 메타 이벤트 결정론 미보장 (§4.3) | 2팀 | 11~16일차 `stats.ts` |
| **I-66** | 이벤트 확률·가중치 소유 계층 미확정 (§4.2) | 2·3팀 | Task 024 착수(17일차) 전 |
| **I-67** | 어댑터 등록 모듈 부트스트랩 소유자 미지정 | 1팀 | 11일차 `polling.ts` |

**I-63 처리 방침**: `docs/db/schema-design.md` 본문은 6팀이 오늘 정정 완료했으나, `docs/team-schedule/06-DB인프라팀.md` 16일차 행에는 오표기가 남아 있습니다. team-schedule은 "일정·팀 배정·소유 경로"의 단일 소스라 다른 팀이 임의로 고치지 않는다는 원칙에 따라 **이슈로만 등재**했습니다. 팀장이 16일차 착수 전에 정정합니다.

### 이슈로 등재하지 않은 기록 2건

둘 다 "지금은 문제가 아니지만 특정 시점에 반드시 짚어야 하는" 성격이라 여기에만 남깁니다.

1. **`loadConstants`의 snapshot 시점 스코핑 범위** — `fixture.snapshot_id`가 결정론 필수 축(DC-14)인데, 현재 `loadConstants`는 "지금 등록된 소스"만 조회하는 전역 캐시라 시점 스코핑이 없습니다. 12일차 `snapshot.ts`가 이 간극을 메울 예정이라고 `loader.ts` 헤더에 이미 명시돼 있으나, 그 산출물이 **"직렬화만" 하는지 "특정 `snapshot_id`로 과거 상수를 재조회하는 기능까지" 포함하는지**는 확인이 필요합니다 — 과거 경기 재시뮬레이션 시 그 시점 상수를 정확히 복원해야 바이트 동일성이 유지됩니다. (2팀 제기, 12일차 확인)
2. **`fixture` INSERT 시 `snapshot_id` 생성 책임 주체** — `NOT NULL` 제약은 "Fixture row를 INSERT하는 시점에 이미 `snapshot_id`를 갖고 있어야 한다"는 뜻인데, 그 INSERT를 수행하는 주체(일정 생성 로직 / 엔진 후처리 / 6팀 Task 033 크론)가 명시되지 않았습니다. 지금은 부딪힐 코드가 없고(`tick.ts`/`events.ts` 모두 `snapshot` 참조 0건), **H-15 인계(38일차)나 그 전 Fixture 생성 로직 설계 시점**에 짚어야 합니다. (6팀 제기)

**3팀 관찰 1건**: 36그룹 중 `BOOL`·`STRING` 타입 그룹이 실존하지 않아(`INT`/`DECIMAL`/`JSON`만 존재) 해당 두 매핑은 아직 실전 검증되지 않았습니다. 이슈는 아니고 기록입니다.

---

## 7. 마감 검증

```
npx tsc --noEmit   →  오류 0
npm run lint       →  오류·경고 0
npm run test       →  8 files / 142 tests 전부 통과
```

9일차 132 → 10일차 142 (3팀 `loader.test.ts` 10케이스 추가). 기존 회귀 없음.

**빌드 검증은 §5.2 사유로 이 환경에서 수행 불가** — `next build --webpack` 기준 컴파일·타입체크·정적 페이지 생성(9/9)까지는 성공했고 최종 파일 복사 단계에서만 EPERM으로 실패했다는 사실을 기록합니다.

**수락 기준 충족**

| 팀 | 기준 | 결과 |
|---|---|---|
| 1팀 | 4상태가 타입으로 표현됨 | ✅ `Result<T>` 판별 유니온 + 타입가드 4종 |
| 2팀 | 이벤트에 표시 문자열 0건 | ✅ `assertNoDisplayText`로 **런타임 강제**까지 |
| 3팀 | 엔진이 리터럴 대신 로더를 쓰는 경로가 **타입으로 강제** | ✅ 36 그룹코드 리터럴 유니온 + `valueType` 유도 반환 타입 |
| 4팀 | 8개 라우트 200 | ✅ `/ko`·`/en` 하위 전부 200(`next dev --webpack` 기준, I-62) |
| 6팀 | 13개 관계 반영 | ✅ 13/13 자기검증표 + 9일차 오표기 자체 정정 |

---

## 8. 총평

**오늘 가장 값진 것은 2팀이 자기 코드의 결함을 스스로 들고 온 것입니다.** I-65는 남이 지적한 게 아니라, 2팀이 1팀 `result.ts`의 `fromArray()`를 읽다가 "그럼 내 `events.ts`가 이벤트 0건을 만들 수 있으면 어떻게 되지?"로 스스로 이어붙여 찾아낸 것입니다. 교차 점검이 "남의 코드 검사"가 아니라 "남의 코드에 비춰 내 코드를 다시 보는 것"으로 작동한 사례입니다.

**주의할 패턴 — 전제가 바뀐 것을 아무도 다시 보지 않았습니다.** §5.1의 루트 `layout.tsx`는 어제까지는 아무 문제가 없었고, 오늘 `[lang]`이 생기면서 비로소 틀린 상태가 됐습니다. 5팀 전원이 1차 교차 점검을 했는데 **아무도 "오늘 변경으로 기존 파일의 전제가 깨지지 않았나"를 묻지 않았습니다.** 9일차 총평의 "부분 정정" 패턴과 같은 뿌리입니다 — 그때는 고쳐야 할 곳을 다 안 고쳤고, 오늘은 **새로 만든 것이 기존 것을 어떻게 무효화하는지**를 안 봤습니다. 다음 일차부터 교차 점검 항목에 "이번 변경으로 전제가 깨진 기존 파일"을 명시적으로 넣습니다.

**환경 리스크가 실체화됐습니다.** I-62는 어제까진 4팀 로컬의 불편이었지만, 팀장 실측으로 **프로덕션 빌드 자체가 이 워크스페이스에서 불가능**하다는 게 확인됐습니다. 수락 기준에 빌드를 거는 Task가 앞으로 여럿이라, 리포지토리 위치 이전 여부는 미룰수록 비싸집니다.

**이슈 유무: 있음** — 신규 6건(I-62~I-67), 갱신 1건(I-61), 재작업 1건(4팀 루트 레이아웃 구조), 6팀 자체 정정 1건(R-06→R-04), 미등재 기록 2건. **차단성 충돌 0건, 전부 담당·시점 확정.**
