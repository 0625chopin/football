# 51일차 (2026-09-29 화)

**참여**: 2팀 · 3팀 · 4팀 · 5팀 · 6팀 (1팀은 50~68일차 상시 리뷰 게이트 구간, 미소환)
**핵심**: 3팀 I-229 배선 해소(경기 상세 D4/D5 정상 상태 최초 실측). 사용자 지시로 착수.

---

## 1. 팀별 작업

### 3팀 — I-229 해소 (007 소급, `MockDataSource` 3종 배선)

- `getMatchLineups`·`getMatchPlayerRatings`·`getMatchTeamStats`가 `return []` 고정이던 것을 배선.
  `deriveMatchDetail()` 헬퍼 하나로 셋을 함께 파생(라인업이 평점·팀스탯의 전제라 `selectLineup()` 3중 호출 방지).
- **ⓐ/ⓑ 혼합 판정**: 라인업=ⓐ(`selectLineup()` 직접 호출, LIVE/FINISHED 무관 항상 채움, 4-4-2 고정).
  평점/팀스탯=ⓑ(`progress.ts`의 `generatePlayerStatCore` export 재사용) + LIVE는 실이벤트 우선 덮어씀.
  matchRating은 LIVE 중립고정, FINISHED는 기존 `computeMatchRating()`(2팀 37일차) 재발견·재사용.
- 3개 주석의 사실 오류("라인업 생성기 없음") 정정.
- 변경: `src/lib/data/mock/MockDataSource.ts`(+239/-24), `src/lib/mock/progress.ts`(+21, export만).
- 자체 테스트: typecheck·eslint 클린, `vitest MockDataSource/progress` 46/46.

### 2팀 — Task 028 능력치 성장·하락 보정

- `growth.ts` 신설. 나이대 4구간(≤21/22~29/30~33/≥34, 경계는 `world.ts` 시장가치 배율 재사용) 계수 +
  진테 ±2 → ±6 클램프로 속성별 델타, OVR 재계산 후 PA 초과 시 최대 성장 속성부터 1씩 되돌림.
- 변경: `src/lib/sim/season/growth.ts`·`growth.test.ts`(둘 다 신규).
- 자체 테스트: typecheck·eslint 클린, `vitest src/lib/sim` 47파일 746건(growth 10건 포함, OVR≤PA 다시즌·±6·GK 분리·결정론).

### 4팀 — Task 048 잔여 3항목

- ① `/playoffs`·`/cup`·브래킷 하드코딩 실사(ko·en) 0건 ② `/ko|en/playoffs` 200 + 320px 가로 스크롤 0 실측(신규)
  ③ 5팀 047용 `match.list.roundForm.*` 키 골격 신설(값은 5팀 61일차, 축소 스코프 준수 — 날짜 필터·통합 타임라인 키 미생성).
- 변경: `src/i18n/messages/{ko,en}/match.ts`. 자체 테스트: typecheck·eslint 클린, Playwright 320px 실측.

### 5팀 — Task 018 클럽 상세 1/2

- `/teams/[teamId]`에 F1(헤더)·F2(스쿼드 테이블: 포지션 필터·상태 배지·OVR)·F3(감독/전술)·F3-o(구단주 카드, D-35, 공석 폴백) 실렌더.
- 진입 동선 확인: `StandingsTable`이 이미 `/teams/[teamId]`로 링크(49일차 선수 상세 "링크 0건" 재발 아님).
- 변경: `teams/[teamId]/page.tsx`, `SquadTable.tsx`(신규), `i18n/messages/{ko,en}/team.ts`.
- 자체 테스트: typecheck·eslint·vitest(1730) 통과, dev 실측(ko/en, 1280·375·320px).

### 6팀 — Task 037 + 032 소급

- auth.users INSERT 트리거로 profile/wallet 자동생성 마이그레이션 2건 적용(advisors 경고 REVOKE 해소).
  `database.types.ts` 재생성, `mapper.ts` 캐스트 3곳 제거 + `mapClubOwnerRow` 신설.
- **이메일 인증 활성화는 SQL 밖**(Dashboard/Management API 필요, MCP 툴셋에 기능 없음) — 미수행, 수동 조치 필요(부분 완료).
- I-256(ⓑ 재수행)·I-243(실위험 확증)·I-246(무정책 확정) 판정 + **신규 발견 I-263**(초기 RLS 18건 로컬 미문서).
- 변경: `supabase/migrations/{...auth,...restrict_execute}.sql`(신규), `database.types.ts`, `mapper.ts`, `mapper.test.ts`, `SupabaseDataSource.test.ts`.
- 자체 테스트: typecheck·eslint 클린, `vitest src/lib/data/supabase` 137건.

---

## 2. 팀장 검증

- **전역 게이트**: `npm run typecheck`·`lint`·`test` 전부 클린, **test 1730 passed**(50일차 1718 → +12).
- **I-229 정합성 실측**(dev 재컴파일 우회, MockDataSource 직접 조회): LIVE `eff66a09`·FINISHED `bc7494ec` 양쪽에서
  라인업 36(선발 11+11/벤치 7+7)·평점 22(선발 전원, 라인업 밖 고아 0)·팀스탯 2팀 전 필드 렌더. **D-33 기준 충족**.
  단 LIVE에서 이벤트 주선수 17명 중 **4명이 라인업 밖** → 3팀 이슈 후보 ② 실측 확인 → **I-261 등재**.
- **음수 시즌 재수정 검증**: 3팀 재수정으로 `foundedSeason<1` 0건 확인. **그러나 60팀 전부 `foundedSeason`(5~84) > `currentSeason`(1) = 미래 창단**으로 방향만 뒤집힘.
  근본이 도메인 축 문제(`currentSeason=1`과 충돌)라 값으로 못 품 → **사용자 승인으로 5팀이 화면 잠정 숨김**(`SHOW_SEASON_ORIGIN_FIELDS=false`) → **I-260 등재, 값·표시 규약 판정 이월**.
- **재수정 지시 2건**: ③팀 음수 시즌(주간 한도 종료 전 반영 완료) / ⑤팀 창단·재임 숨김 + 주석 일차 오기(52→51) 정정. 전부 재검증 통과.

---

## 3. 이슈

- **신규 4건**: I-260(음수→미래 창단, 도메인 축) · I-261(I-229 라인업↔이벤트 독립 표본) · I-262(OVR 산출식 중복, I-257 계열) · I-263(초기 RLS 18건 로컬 미문서, 위험 중~상).
- **갱신 4건**: I-229 ✅ 해소 / I-243 판정(ⓐ rename, 미실행) / I-246 무정책 확정 / I-256 ⓑ 채택(3/4 PASS).
- **3팀 주간 한도 종료**: I-229·음수 시즌 재수정은 종료 전 반영·검증 완료. 잔여(I-260 값 재수정, I-261)는 다음 등판 이월.

---

## 4. 다음 일차 인계

1. **I-260 표시/값 규약 판정**이 최우선 — 화면 숨김은 임시 우회다. ⓐ상대 표기 / ⓑ 미표시 규약화 / ⓒ `currentSeason` 조정(D-15 재검토) 중 택일. 3팀 한도 리셋(2pm KST) 후 3·5팀 조율.
2. **I-243 + I-263을 한 패스로** — 둘 다 마이그레이션 이력 조작(rename·복원)이라 되돌리기 어렵다. 6팀 단독 판정 + 팀장 조율, 실DB 전환(034b) 전 필수.
3. **I-257 + I-262를 한 패스로** — 순위 포인트·OVR 산출식 둘 다 `sim`↔다른 계층 중복. I-262는 `sim→mock` import 불가라 "타입/순수 계층 단일 소스"가 유력. 계층 규약을 함께 정한다.
4. **I-261**(라인업↔이벤트 독립 표본)은 라인업을 이벤트 생성 입력으로 삼으면 ②③ 동시 해소 — 3팀 다음 등판 검토.
5. **I-256 잔여**: 크론 성공률 정의 확정(NOOP 제외안 유력) + 킥오프 p95는 스키마 확장 별건 분리.
6. **Task 037 이메일 인증**은 SQL 밖 수동 조치(Dashboard/Management API) 미완 — 6팀 다음 등판 또는 사용자 직접.

---

## 5. 미해결·판정 대기

- **I-260** 창단·재임 시즌 도메인 축 — 3·5팀, 규약 판정(화면 숨김으로 임시 우회 중)
- **I-263** 초기 RLS 18건 로컬 미문서 — 6팀, **I-243과 한 패스**(위험 중~상)
- **I-262** OVR 산출식 중복 — 2·3팀, **I-257과 한 패스**
- **I-261** I-229 라인업↔이벤트 독립 표본 — 3팀, 다음 등판
- **I-257 · I-258** 순위 포인트 중복·리빌드 보조금 단위 — 2·3팀 조율
- **I-259** 선수 상세 잔여 4건 — 5팀, ⓑ는 I-249와 동시 판정
- **I-256** SP-4 잔여 2건(성공률 정의·킥오프 p95 스키마) — 팀장/6팀
- **I-255** 전역 경기 조회 계약 — 1팀, 034b 이후
- **I-252 · I-251 · I-250 · I-248 · I-247 · I-245** 49일차 신규 — 변동 없음
- **I-223** 종결은 62일차 `pending` 0건 확인 시 / **I-241**(MOCK_NOW 고정) — 3팀
- **I-230** 넉아웃 ET 판정 / **I-236** `homeModifier` 공식(2팀) / **I-214** 크론 점등 금지(차단성, 51일차 준수 재확인)
- **I-235** 공유 트리 git 조작 — 48~51일차 연속 사고 0건
- **I-233 · I-232 · I-228 · I-227 · I-225 · I-220 · I-217 · I-216 · I-215 · I-212 · I-211 · I-209 · I-208 · I-205 · I-204 · I-192** 비차단·배정 대기
