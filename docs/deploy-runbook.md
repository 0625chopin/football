# 배포 런북 (환경 분리 · 마이그레이션 순서 · Edge Function 배포/롤백)

**Task 044, 23일차(2026-08-20), 1팀 코어·품질팀.** 소유: 1팀(`.github/**`와 함께 이 팀 소유 경로). 갱신은 이 팀이 하되, Edge Function 요금제·크론 비용 수치는 6팀 DB·인프라팀 입력을 인용한다.

## 0. 현재 상태 요약 (문서를 믿기 전에 먼저 볼 것)

- Supabase 프로젝트는 **`damruradpliktkrlkakl` 1개뿐**이다. `list_branches` 호출 시 `"Project reference is missing when validating permissions"` 에러(23일차 실측) — **6팀 확인 결과 이 프로젝트는 Supabase 브랜칭(스테이징)이 미구성/미가용**이다. 이 문서는 스테이징이 존재한다고 전제하지 않는다.
- Edge Function은 **아직 0개 배포**(`list_edge_functions` 실측, 23일차). 이 문서의 §3은 첫 배포 전에 확정해 두는 **사전 절차**다.
- **원격↔로컬 마이그레이션 이력 불일치(6팀 발견, 23일차)**: `supabase/migrations/`에는 파일 2개뿐인데 원격(`list_migrations`)엔 19건이 적용돼 있다 — `task032_*` 계열, `rls_hardening_*`, `reduce_security_definer_exposure` 등 **17건이 로컬에 커밋되지 않았다**. **현재 git만으로는 스키마를 재현할 수 없다.** §2.0에서 이를 마이그레이션 규약의 선행 과제로 다룬다.
- 6팀이 요금제·크론 비용 입력을 전달했다(23일차) — §3.3에 반영 완료.

## 1. 환경 분리 (로컬 / 스테이징 / 프로덕션)

| 환경 | 현재 실체 | 접근 수단 | 비고 |
|---|---|---|---|
| **로컬** | 개발자 머신, `.env.local`(이미 존재) | `npm run dev`(webpack 고정, I-62) | 기본 `NEXT_PUBLIC_DATA_SOURCE=mock` — 로컬에서 실 DB를 켤 때만 아래 "프로덕션" 자원에 연결된다는 점을 개발자가 인지해야 한다(스테이징 부재로 인한 임시 상태) |
| **스테이징** | **미구축 — 6팀 확인 완료(23일차).** 이 Supabase 프로젝트는 브랜칭 미구성/미가용(`list_branches` 에러). Supabase Branching(`create_branch`/`merge_branch`/`reset_branch`) 대체안은 **가용성 자체가 확정되지 않아 보류** | — | 브랜칭 활성화(요금제 상향 등) 여부가 확정되면 §1.1 대체 절차를 정규 절차로 전환 |
| **프로덕션** | Supabase 프로젝트 `damruradpliktkrlkakl` (유일) | `mcp__supabase__apply_migration`, Vercel(또는 미정 호스팅)의 `NEXT_PUBLIC_SUPABASE_*` 환경변수 | **13일차(Task 032)부터 지금까지의 모든 `apply_migration` 호출이 사실상 이 프로덕션 프로젝트에 직접 적용되어 왔다** — 별도 스테이징이 없었기 때문이다. 지금까지 문제가 없었던 것은 시드 데이터 투입 전(§9.1 "13~14일차 사이 INSERT 금지선" 등 빈 테이블 전제) 단계였기 때문이지, 안전장치가 있어서가 아니다 |

### 1.1 스테이징 확정 전까지의 임시 규약

스테이징이 없는 동안에도 마이그레이션·Edge Function은 계속 나갈 수 있으므로, 아래를 **임시 대체 절차**로 삼는다:

1. 마이그레이션 SQL은 `apply_migration` 호출 전에 반드시 로컬에서 문법 검토(`docs/db/schema-design.md`의 해당 절과 대조)를 마친다 — 실제 스테이징 dry-run이 없으므로 이 문서 검토가 유일한 사전 검증이다.
2. 시드/샘플 데이터를 넣는 작업(3팀 Task 031a 등)은 **프로덕션에 직접 들어간다는 것을 작업자가 명시적으로 인지**한 상태로 진행한다. "스테이징에서 먼저 해봤다"는 전제를 깔지 않는다.
3. 브랜칭 가용성이 이미 "미구성/미가용"으로 확인됐으므로(§1), 별도 결정(요금제 상향 등)이 없는 한 이 임시 규약을 **정규 절차로 간주하고 운영**한다. 상황이 바뀌면(브랜칭 활성화) §1의 "스테이징" 행을 갱신하고 마이그레이션을 브랜치 → 프로덕션 순서로 전환한다.

## 2. 마이그레이션 적용 순서 규약

**단일 소스는 `docs/db/schema-design.md` §9(13일차)·§10(14일차)이며, 이 절은 그 규약을 요약·재확인하고 로컬→프로덕션 승격 순서를 덧붙인다.** 규약 자체를 이 문서에서 다시 정의하지 않는다.

### 2.0 선행 과제 — 원격↔로컬 마이그레이션 이력 동기화 (6팀 발견, 23일차)

아래 §2의 절차는 **"로컬 파일 = 원격 적용 이력"이 항상 성립한다는 전제**로 쓰여 있다. 그런데 23일차 실측 결과 이 전제가 이미 깨져 있다:

- `list_migrations` 원격 19건 vs `supabase/migrations/` 로컬 2개 파일.
- 미커밋 17건: `task032_*` 계열(코어 인덱스·RLS 1차·하드닝 등), `fix_rls_initplan_standalone_policies`, `split_service_role_write_policies_no_select_overlap`, `add_team_season_stat_biggest_pairing_check`, `reduce_security_definer_exposure` 등.
- **영향**: 지금 이 저장소를 클론해 `git`만으로 스키마를 재현하면 실제 프로덕션과 다른(훨씬 뒤처진) 스키마가 나온다. §2의 "파일명은 원격 채번 버전을 따른다" 규약이 지켜지지 않았다는 뜻이기도 하다.
- **선행 조치(필요, 아직 미실행)**: `npx supabase`(2.109.1, 로컬에 npx로 설치 확인됨)로 프로젝트를 링크한 뒤 `supabase db pull` 또는 `supabase migration list --linked`로 원격 이력을 로컬 파일로 채워 넣는다. 링크에는 액세스 토큰/DB 비밀번호가 필요해 **자격 증명 보유자(6팀 또는 사용자)가 직접 실행**해야 한다 — 이 팀은 문서화만 하고 실행은 위임한다(§5에 후속 과제로 등재).
- 동기화 전까지는 §2의 아래 절차를 **신규 마이그레이션에 한해서만** 신뢰하고, "로컬 파일 이력이 곧 원격 이력"이라는 가정은 §2.0이 해소되기 전까지 보류한다.

### 2.1 적용 절차

1. **작성**: `supabase/migrations/`에 SQL을 로컬로 작성한다. 이 시점 파일명은 임시(인게임 날짜 등)여도 된다.
2. **적용**: `mcp__supabase__apply_migration`으로 실행한다(현재 유일한 프로젝트 = 사실상 프로덕션, §1 참조).
3. **파일명 확정**: `list_migrations`로 원격이 자동 채번한 버전을 확인하고, **그 값으로 파일명을 짓는다**(인게임 날짜 아님 — `schema-design.md` §9.2, 13일차 확정 규칙). 인게임 일차 정보는 파일 헤더 주석에만 남긴다.
4. **직후 점검**: `mcp__supabase__get_advisors`를 즉시 호출해 신규 security/performance 이슈가 없는지 확인하고 결과를 `schema-design.md`의 해당 일차 절에 기록한다(14일차 전례).
5. **의존 관계 FK 이월 시 금지선**: 참조 대상 테이블이 아직 없어 FK를 나중 마이그레이션으로 미루는 경우, **그 사이 구간에는 관련 테이블에 행을 INSERT하지 않는다**(§9.1 lesson — 사후 FK 추가는 기존 행 전체를 검증하므로 무효 참조가 하나라도 있으면 실패한다). FK를 이행하는 마이그레이션 착수 직전 `SELECT count(*)`로 0건을 재확인한다.
6. **순서**: 마이그레이션 파일은 발급된 원격 버전 순으로만 읽는다 — 이미 적용된 파일의 재정렬·수정 금지. 되돌릴 일이 생기면 새 마이그레이션으로 되돌린다(§2.2).

### 2.2 롤백 규약

Supabase MCP에는 마이그레이션 되돌리기 도구가 없다(`apply_migration`만 존재, down-migration 개념 없음). 따라서:

- **적용된 마이그레이션 파일을 편집·삭제하지 않는다.** 원격 상태와 로컬 파일이 어긋나면 `list_migrations`가 유일한 진실이 된다(§9.2 규칙의 근거이기도 하다).
- 되돌려야 할 변경은 **역방향 SQL을 담은 새 마이그레이션**으로 적용한다(예: `ALTER TABLE ... DROP COLUMN`으로 추가했던 컬럼 제거). 파일명 헤더에 "N번 마이그레이션 롤백"이라고 명시한다.
- 데이터 손실 위험(컬럼 삭제, `NOT NULL` 강화 등)이 있는 롤백은 적용 전 `execute_sql`로 영향 행 수를 먼저 센다.

## 3. Edge Function 배포·롤백 절차

Edge Function은 23일차 기준 0개 배포 상태다. D-04(`docs/require/06-prioritization-and-risks.md`)에 따라 크론 실행의 정규 경로이므로, 첫 배포 전에 아래 절차를 확정해 둔다.

### 3.1 배포

1. `supabase/functions/<이름>/`에 함수 소스를 작성한다.
2. `mcp__supabase__deploy_edge_function`으로 배포한다.
3. 배포 직후 커밋 SHA를 기록해 둔다(예: 함수 디렉터리에 `# deployed@<sha>` 헤더 주석) — Supabase 대시보드가 버전 히스토리를 노출하지 않는 한, **git 커밋 SHA가 유일한 "이전 버전" 참조 수단**이다.
4. 서비스 롤 키는 Edge Function 내부에서만 사용한다(D-04 필수 항목 ⑤, `NEXT_PUBLIC_*` 접두사 절대 금지 — 클라이언트 노출 시 즉시 회전).

### 3.2 롤백

- Edge Function도 되돌리기 API가 없다 — **직전 정상 커밋의 함수 소스로 `deploy_edge_function`을 다시 호출하는 것이 롤백**이다. 배포마다 SHA를 남겨야 하는 이유가 이것이다.
- 크론이 걸린 함수가 잘못 배포됐을 때 **가장 빠른 완화는 재배포가 아니라 크론 트리거 비활성화**다(D-04 "크론 중단 구간 감지"·catch-up 폴백 설계와 일관 — 중단은 이미 감내 가능하도록 설계돼 있다). 코드를 되돌리는 동안 데이터가 잘못 쓰이는 것을 막는 것이 우선이다.
- 재배포 후 `get_logs`(edge function 카테고리)로 첫 실행 결과를 확인하기 전까지는 "롤백 완료"로 간주하지 않는다.

### 3.3 요금제·크론 비용 (6팀 상세 입력 반영, 23일차. 출처: `docs/business/03-budget-plan.md`)

**시작 구성(확정)**: Supabase **Pro $25/월** + Vercel **Hobby $0/월**. Free 불가 — DB 500MB가 개발 페이스 기준 25일에 소진되고, 크론 상시 실행(D-04) 자체가 개발 단계에서부터 Free로 버틸 수 없게 만든다.

**크론 운영**:
- 주기: **1분 유지**(주기를 늘려도 절감액 $0 — 목적은 비용 절감이 아니라 NFR-CR-001 충족).
- 틱당 처리 상한: **30경기**(CPU 1.5초, 마진 25%) — **기존 50경기 상한에서 하향 확정**. 근거: Edge Function CPU 2초/호출 한도는 요금제로 해제 불가능한 하드 리밋이며, NFR-PF-003(30경기 ≤ 1.5초, V-01 실측 전 추정치)이 이미 한도의 75%를 소모한다.

**승급 트리거**:

| 조건 | 승급 | 추가 비용 |
|---|---|---|
| DB > 2GB 또는 `event` 테이블 > 200만 행 | Small | +$5 |
| DB > 5GB 또는 순위표 조회 p95 > 120ms | Medium | +$50 |
| 상업 서비스 개시 | Vercel Pro | +$20 |

**단계별 총액**: 개발 $26/월 → 1차 릴리스 $51/월 → 2차 릴리스 $120/월.

## 4. CI 3단 게이트 검증

### 4.1 게이트 구성

`scripts/gate.sh`(I-117, 로컬·CI 공용) = `tsc --noEmit` → `lint` → `test:coverage`(fail-fast, 3단). `.github/workflows/ci.yml`이 `npm run gate` 하나만 호출해 로컬·CI가 같은 정의를 쓴다. `check:literals`는 advisory(`continue-on-error`)로 별도.

### 4.2 CI 실행 결과 확인 수단 (3일간 미확인 블로커 해소)

`gh` CLI가 여전히 미설치라 22일차까지 "CI 첫 실행 결과 미확인 3일째"로 남아 있었다. **이 저장소는 public이므로 GitHub REST API를 인증 없이 호출해 실행 목록·상태를 확인할 수 있다**(`gh` 설치가 필수 조건이 아니었다):

```bash
curl -s "https://api.github.com/repos/0625chopin/football/actions/runs?per_page=20"
```

단, 개별 job의 **로그 다운로드**(`/actions/jobs/{id}/logs`)는 public repo라도 admin 권한 토큰을 요구한다(23일차 실측, 403 "Must have admin rights to Repository"). 실패 원인 진단은 로그 대신 **로컬에서 `npm run gate`를 그대로 재현**하는 방식으로 한다 — 어차피 CI도 같은 스크립트를 실행하므로 로컬 재현이 곧 원인 규명이다.

### 4.3 23일차 실측 — 게이트가 실제 실패를 잡아내는지 확인

```
curl -s "https://api.github.com/repos/0625chopin/football/actions/runs?per_page=20"
```
결과: `CI` 워크플로우 3회 실행(커밋 `3500814`·`f3d2f47`·`d30da33`) **전부 `failure`**. `Secret Scan`은 `success`.

로컬 `npm run gate` 재현 결과, **3단계(test:coverage)에서 실패**:

```
ERROR: Coverage for lines (0%) does not meet global threshold (80%) for src/lib/data/supabase/client.ts
ERROR: Coverage for branches (0%) does not meet global threshold (70%) for src/lib/data/supabase/client.ts
ERROR: Coverage for lines (0%) does not meet global threshold (80%) for src/lib/data/supabase/index.ts
```

**판정: 게이트가 정상 동작 중이다(수락 기준 충족).** `src/lib/data/supabase/client.ts`(PostgREST fetch 브리지)·`index.ts`(자기등록 진입점)는 22일차 6팀 Task 034a 산출물로 신규 추가됐으나 대응하는 `*.test.ts`가 없어 vitest perFile 커버리지 임계(lines 80%/branches 70%, `vitest.config.ts`)를 트립한다 — **설정 오류가 아니라 실제 커버리지 공백을 정확히 잡아낸 사례**다.

**알려진 공백**: 현재 브랜치 보호 없음 → CI 실패가 머지를 막지 못해 3일째 `master`에 그대로 쌓였다. 도입 여부는 사용자 판단 사항으로 이슈 등재됨(§5).

## 5. 후속 과제

| 항목 | 필요 조치 | 담당 |
|---|---|---|
| **원격↔로컬 마이그레이션 이력 불일치(17건 미커밋)** | `supabase` CLI 링크 + `db pull`로 로컬 파일 복원(§2.0). 자격 증명 필요 | 6팀 또는 사용자 |
| 스테이징 미구축(확인됨, 미가용) | 브랜칭 활성화(요금제 상향 등) 여부 결정 필요 시 재논의 | 팀장 판단 |
| `src/lib/data/supabase/client.ts`·`index.ts` 커버리지 0% | `*.test.ts` 작성(각 팀 자기 소유 디렉터리 테스트 원칙 — CLAUDE.md) | 6팀 |
| CI 실패가 머지를 막지 않음(알려진 공백) | 브랜치 보호 규칙 도입 여부 — 사용자 판단, 이슈 등재됨 | 팀장(이슈 등록) |
| catch-up 1회 상한 50→30경기 하향(확정, §3.3) | 실제 코드(`supabase/functions/tick/` 등) 반영 필요 | 해당 소유 팀 |
| Edge Function 배포 이력 추적 | 첫 배포 시 §3.1의 SHA 기록 관행을 실제로 지키는지 1회 확인 | 배포 담당 팀(추후 확정) |
