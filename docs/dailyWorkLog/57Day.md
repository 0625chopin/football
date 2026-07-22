# 57일차 (2026-10-07, 수)

**참여 팀**: 5팀 화면배팅UX팀(Task 021) · 6팀 DB인프라팀(Task 038)
**미참여**: 1·2·3·4팀 (일정표에 57일차 행 없음)

---

## 1. 팀별 작업

### 5팀 화면배팅UX팀 — Task 021 `/admin/config` H3 확장 + H4 신규

56일차가 만든 H1(그룹 목록)·H2(코드 목록)·H3(편집 폼) 골격 위에 세 가지를 얹었습니다.

1. **범위 검증 인라인 에러** — `ConfigEditForm`이 3팀 `getNumericRange`(`@/lib/config/schema`)로
   숫자 위젯의 허용 범위를 실시간 판정합니다. 범위 힌트는 평상시 표시하고, 벗어나면 같은
   자리를 `role="alert"` 인라인 에러로 교체하며 `aria-invalid`/`aria-describedby`를 연결합니다.
   순수 JSON 에디터(객체·배열)는 범위 메타데이터가 코드 레벨에 없어 대상이 아닙니다.
2. **I-281 빈 입력 저장 거부** — `computeNumberError()`가 빈 입력을 `valueRequired`로 판정해
   사유 필수 검증과 동일하게 `canSave` 게이트를 막습니다. 서버 측 잔여 한계는 3절 참조.
3. **발효 시점 지정** — `actions.ts`가 저장 시 `applyPolicy === "NEXT_SEASON"`인 그룹에 대해
   `World.currentSeasonNumber + 1`을 `effectiveFromSeason`으로 계산해 오버레이에 함께 기록합니다.
   `IMMEDIATE`/`NEXT_MARKET`은 시즌 개념이 없어 `null`을 유지합니다. H3-p 배지는 여전히
   "표시만" 하며(운영자가 이 값을 입력하지 않음, 08문서 원칙 유지) 실제 시즌 번호만 채웁니다.
4. **H4 변경 이력 diff** — 신규 `config-history-store.ts`(append-only 오버레이) + 신규
   `ConfigHistoryDiff` 컴포넌트. `page.tsx`가 `DataSource.getCommonCodeHistory()`(기저)와
   로컬 오버레이를 `mergeConfigHistory()`로 합쳐 최신순으로 내려줍니다.
   **`audit-log-store.ts`를 재사용하지 않았습니다**(56일차 인계 2번 준수 — E-43은 별도 엔티티).

변경 파일: `ConfigEditForm.tsx` · `actions.ts` · `actions.test.ts` · `config-override-store.ts` ·
`page.tsx` (수정) / `config-history-store.ts` · `ConfigHistoryDiff.tsx` (신규) /
`src/i18n/messages/{ko,en}/admin.ts` (신규 키 8종, 양쪽 동시).

### 6팀 DB인프라팀 — Task 038 배팅 테이블 RLS

`docs/db/schema-design.md` §6.3.1 D그룹(12일차에 "2차 릴리스, 오늘 정책 없음"으로 미뤄둔 8개)
중 남은 5개(E-33~E-37 `bet_market`/`bet_selection`/`odds`/`bet`/`bet_leg`)의 테이블 생성 +
RLS를 로컬 마이그레이션으로 작성했습니다. E-38~E-40은 51~52일차 Task 037에서 처리 완료.

- **`bet`** — `(SELECT auth.uid()) = user_id` SELECT 전용. 수락 기준 "타 사용자 베팅 조회 차단"의 근거.
- **`bet_leg`** — 복합키(betId+selectionId)라 `user_id` 컬럼이 없어 소유 `bet`을 EXISTS 서브쿼리로 간접 판정.
- **`bet_market`/`bet_selection`/`odds`** — 사용자 소유가 아닌 마켓·배당 데이터라 공개 SELECT +
  service_role 쓰기(A그룹 패턴). `user_id` 컬럼 자체가 없어 `auth.uid()` 제한 대상이 아닙니다.
- 전 테이블 쓰기는 **service_role 3분리 정책**(INSERT/UPDATE/DELETE) — `FOR ALL` 대신 분리하는 이유는
  profile/wallet 선례와 동일(`multiple_permissive_policies` 경고 회피).
- `wallet_transaction.ref_bet_id` FK도 52일차 예고대로 이번에 이월 추가.

변경 파일: `supabase/migrations/20260722070511_bet_tables.sql` (신규 1개).

---

## 2. 팀장 검증

전역 게이트 `npm run gate` **통과** — 139 files · 1851 tests, 커버리지 stmt 94.3% / branch 87.19%
/ func 95.04% / line 94.44%.

### 6팀 — 통과 (재수정 0회)

- **원격 DDL 0건 직접 확인** — `pg_class` 조회 결과 FK 대상 3종(`sim_constant_snapshot`·`profile`·
  `wallet_transaction`)은 원격에 실재하고 RLS도 켜져 있으나, **신규 5개 테이블은 원격에 없습니다.**
  I-269 준수 주장이 사실입니다.
- 채번 `20260722070511`이 기존 타임스탬프 규칙의 뒤를 정상적으로 잇습니다(I-263·I-243 준수).
- DDL 컬럼이 `src/types/betting.ts` E-33~E-37과 1:1로 일치합니다(타입·nullable·CHECK 범위 포함).
- `bet_leg`의 EXISTS 서브쿼리는 참조 대상 `bet`의 SELECT 정책과 조건이 동일해 중첩 RLS가
  정합하게 합성되며, `bet` 정책이 `bet_leg`를 참조하지 않아 순환도 없습니다.
- `database.types.ts` 재생성·`mapper.ts` 추가를 보류한 판단이 옳습니다 — 원격에 테이블이 없는
  상태에서 타입을 생성하면 허위 타입이 됩니다.

### 5팀 — 재수정 1회 후 통과

**지적**: `ConfigHistoryDiff.tsx`에서 이전값↔신규값 구분이 **시각 표현 전용**이었습니다.
`→`가 `aria-hidden`이라 보조기술에서 제거되고, 남은 구분 수단이 `line-through`와 폰트 두께뿐이라
스크린리더에는 값 두 개가 관계 표시 없이 나열됩니다(NFR-A11Y-002 계열 — 의미를 시각 표현 단독으로
전달 금지).

**조치**: 각 값에 `sr-only` 라벨 병기(`admin.config.history.{oldValueLabel,newValueLabel}`, ko/en
동시 추가). `→`는 중복 낭독 방지를 위해 `aria-hidden` 유지. 재검증 통과.

**재수정 아님으로 판정한 4건** (5팀에 근거 공유 완료):

1. **I-281 클라이언트 한정 차단 승인** — 3절 참조.
2. `changedAt` 원시 ISO 표기 — 같은 어드민 영역 `AuditLogViewer.tsx`(55일차)와 동일한 기존 관례.
3. `UNKNOWN_ADMIN_ACTOR` 자리표시자 — 계약 한계가 맞아 **I-282로 신규 등재**.
4. `previous`가 없을 때 이력 append를 건너뛰는 분기 — `commonCodeId`가 non-null이라 불가피하며
   실경로에서 도달 불가.

**브라우저 실측 미수행** — `/admin`이 실제 Supabase ADMIN 세션 쿠키를 요구하는데 로그인 플로우가
아직 없어(I-277) 로컬 접근이 403입니다. 코드 리뷰 + 3단 게이트로 대체했으며, 이 한계는 56일차와
동일합니다.

---

## 3. 이슈

**신규 1건 · 상태 변경 1건.**

- **I-282 신규 OPEN** (5·6팀, 비차단) — `CommonCodeHistory.changedBy`에 채울 실제 사용자 식별자가
  없어 상수 자리표시자 `"unknown-admin"`을 씁니다. **I-276(감사 로그 `actorId` null)과 같은 뿌리**
  (세션→액터 식별 배선 부재)이므로 한 패스로 처리합니다. 그때까지 H4 화면의 변경자 표기를
  실사용자로 읽으면 안 됩니다.
- **I-281 → 5팀 조치 완료(57일차), 서버 측 잔여 한계는 설계상 수용** — 빈 입력은 이제 저장 버튼
  단계에서 막힙니다. 다만 **서버 액션은 이 판정을 재현하지 못합니다**: 와이어 타입이
  `{ kind: "NUMBER"; raw: number }`라 "빈 입력"과 "명시적 0"을 원리적으로 구분할 수 없습니다.
  범위가 있는 코드는 서버 `validateCommonCodeValue`가 계속 거부하고, 범위 없는 코드에 ADMIN이
  직접 `0`을 넣는 것은 정당한 입력이므로 **UI 계층 차단으로 종결**합니다. 서버까지 막으려면
  원시 문자열을 실어 보내도록 계약을 바꿔야 하며, 그 시점은 I-273 실영속화와 한 패스입니다.

---

## 4. 다음 일차 인계

1. **Task 038은 "로컬 마이그레이션 작성"까지만 끝났습니다.** 원격 적용(`apply_migration`) →
   `database.types.ts` 재생성 → `mapper.ts` 배팅 매퍼 추가가 **잔여 3단계**이며, 착수 조건은
   **I-269 원격 마이그레이션 절차 정비**입니다. 적용 직전에 마이그레이션 파일 24~26행이 지시하는
   `SELECT count(*) FROM wallet_transaction WHERE ref_bet_id IS NOT NULL` 확인을 반드시 수행하세요
   (0이 아니면 기존 값이 신규 `bet.id`와 정합하는지 먼저 확인 — 13일차 `fixture.snapshot_id` 금지선과 같은 이유).
2. **I-282는 I-276과 반드시 한 패스로 처리하세요.** 둘 다 `assertAdminSession()`이 인가 여부만
   반환하는 계약 한계에서 나옵니다. 계약을 넓히는 것은 **5·6팀 조율 대상이며 파괴적 변경 절차**를
   따릅니다(판단만 먼저 회신 → 조율 후 반영).
3. **`config-history-store.ts`도 I-273 실영속화 대상에 추가**됩니다 — 56일차 인계 3번이 지목한
   `config-override-store.ts`와 같은 인메모리 한계를 공유합니다. **I-273 처리 시 세 스토어**
   (`world-override-store` · `config-override-store` · `config-history-store`)를 한 패스로 보세요.
4. **5팀 신규 컴포넌트 `/sample` 등록 대기가 11종으로 늘었습니다**(4팀 소유) — 54일차 4종 +
   55일차 3종 + 56일차 3종 + **57일차 1종(`ConfigHistoryDiff`)**. KPI-6 커버율 유지를 위해
   4팀 등판 시 일괄 반영.
5. **I-271은 여전히 58~59일차 6팀 어드민 조회 라우트 완료 조건** — matcher를 넓히지 말고 각
   Route Handler가 `assertAdminSession()`을 직접 호출. 57일차에도 준수됐습니다.
6. **I-275·I-276·I-273 한 패스**, **H-16(2팀→3팀 프리시즌)**, **I-272 4팀 60일차 `proxy.ts` 소유
   판정**, **PS-2 수락 판정(3팀 생성기 대기)**, **H-28 4팀 62일차 `pending` 제거** — 인계 그대로 유효.
7. **어드민 계정은 상시 존재**(`0625chopin@gmail.com` / `qwer1234`, `profile.role='ADMIN'`).
   ⚠️ 비밀번호가 저장소에 평문으로 있으므로 **외부 배포 전 반드시 회수**.

---

## 5. 미해결·판정 대기

- **I-282** `CommonCodeHistory.changedBy` 자리표시자 — 5·6팀, **I-276과 한 패스**(신규)
- **I-280** "36그룹" 문서 표기 vs 실측 38 — 문서, 숫자 재기입 금지
- **I-279** 공통코드 4그룹 코드 0건 — 3팀 Mock 시드
- **I-278** 시즌 종료 ≤20초 실측이 축소 스케일 — 2팀, 3팀 생성기 붙는 시점 재측정
- **I-277** 일반 사용자 인증 UI 0건 — 5팀, 039(62일차~). **어드민 화면 브라우저 실측 차단 원인이기도 함**
- **I-276** 감사 로그 `actorId` null — 5·6팀 계약 조율(파괴적 변경), **I-282와 동계열**
- **I-275** G2·G3 조작 감사 로그 미기록 — 5팀, I-273과 한 패스
- **I-273** `/admin` 배속·정지 + G6 로그 오버레이 휘발 — 5·2·6팀, **스토어 3종**(`world-override` ·
  `config-override` · `config-history`)
- **I-272** `proxy.ts` 소유 공백 — 4팀 60일차 인계
- **I-271** `matcher` api 제외 → `api/admin/**` 무방비 — 6팀, 58~59일차 완료 조건
- **I-269** 원격 마이그레이션 절차 — 6팀, **Task 038 잔여 3단계의 착수 조건**. 57일차 원격 DDL 0건(준수)
- **I-268** 수상 계수 미등록 — 3팀, I-265·I-121·I-136과 031b 한 패스(4건)
- **I-267** 지갑 멱등성 키 부재 — 6팀, Task 037 잔여(비차단, 호출자 0건)
- **I-266** 클럽 상세 2/2 데이터 계약 공백 4건 — 5팀 발견, 계약은 1·3팀
- **I-264** `User` 선호 로케일 도메인 필드 부재 — 1팀 배치(비차단, 소비처 0)
- **I-263**(17건) · **I-243** 마이그레이션 로컬 미문서·채번 불일치 — 6팀 한 패스, 034b 전 필수
- **I-262** OVR 산출식 중복 — 2·3팀, I-257과 한 패스
- **I-261** I-229 라인업↔이벤트 독립 표본 — 3팀, 다음 등판
- **I-260** 창단·재임 시즌 도메인 축 — 3·5팀, 화면 숨김 우회 중
- **I-259** 선수 상세 잔여 4건 — 5팀, ⓑ는 I-249와 동시 판정
- **I-257 · I-258** 순위 포인트 중복·리빌드 보조금 단위 — 2·3팀 조율
- **I-256** SP-4 잔여 2건(성공률 정의·킥오프 p95 스키마) — 팀장/6팀
- **I-255** 전역 경기 조회 계약 — 1팀, 034b 이후
- **I-252 · I-251 · I-250 · I-248 · I-247 · I-245** 49일차 신규 — 변동 없음
- **I-223** 종결은 62일차 `pending` 0건 확인 시 / **I-241**(MOCK_NOW 고정) — 3팀
- **I-236** `homeModifier` 공식(2팀) / **I-214** 크론 점등 금지(차단성, 57일차 준수)
- **I-235** 공유 트리 git 조작 — 48~57일차 연속 사고 0건
- **I-142** `lint-guardrails` 동시 부하 flake — 57일차 재발 없음
- **I-233 · I-232 · I-230 · I-228 · I-227 · I-225 · I-220 · I-217 · I-216 · I-215 · I-212 · I-211 · I-209 · I-208 · I-205 · I-204 · I-192** 비차단·배정 대기
