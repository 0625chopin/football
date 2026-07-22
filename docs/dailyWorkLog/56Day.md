# 56일차 (2026-10-06, 화)

**참여 팀**: 5팀 화면배팅UX팀 (단독)
**미참여**: 1·2·3·4·6팀 — 일정표에 56일차 행 없음

| 팀 | Task | 산출물 |
|---|---|---|
| 5 | 021 | `/[lang]/admin/config` — 공통코드 그룹 목록(H1) · 코드 목록(H2) · 편집 폼(H3) |

---

## 1. 팀별 작업

### 5팀 — Task 021 `/admin/config` 목록 + 편집 폼

와이어프레임 `docs/wireframe/08-어드민-공통코드-스케줄러.md` Part A(H1~H3) 및
`docs/wireframe/10-어드민공통코드-폼스펙.md`(위젯 유형 매핑)를 단일 소스로 구현했습니다.

- **H1 `ConfigGroupNav`** — 카탈로그 그룹 전량 + 클라이언트 검색 필터, 그룹별 코드 수 ·
  영향 FR · 발효 정책 배지. 그룹 수를 하드코딩하지 않고 `groups.length`를 그대로 표시합니다.
- **H2 `ConfigCodeTable`** — 선택 그룹의 코드 테이블(현재값 / 기본값 / 단위 / 활성).
  JSON형 값은 "JSON 보기" 축약으로 렌더.
- **H3 `ConfigEditForm`** — 그룹 `valueType`별 위젯 분기. `CUP_PARAM.BYE_COUNT`류
  **스칼라 래핑 JSON**(`{ "value": N }`)은 폼스펙 §4.2대로 **파싱 후 shape로 판별**해
  숫자 입력으로 내리고, 저장 시 다시 `{ value: N }`으로 감싸 보냅니다. 사유 입력 필수.
- **저장 경로** — 서버 액션 `updateCommonCodeValue`. 첫 줄에서 `assertAdminSession()`
  재검증(54일차 `../actions.ts`와 동일 패턴, Next.js 16 data-security 가이드 근거).
  값 검증은 3팀 `src/lib/config/schema.ts`의 `validateCommonCodeValue`를 **재사용**하며
  재구현하지 않았습니다(NFR-CFG-004). 결과는 `config-override-store.ts` 인메모리
  오버레이에 반영(`world-override-store.ts`와 동일 패턴).
- **라우팅** — 하위 라우트 없이 `?group=&code=` 쿼리 파라미터. 모바일은 그룹 미선택 시
  H1만 / 선택 시 H2+H3만 보이는 2단계 네비게이션을 `hidden lg:*` 토글로 처리
  (이 화면 한정으로 와이어프레임이 `lg`(1024px)를 명시 — I-184는 `sm`/`xs` 오용 금지이며
  `lg`는 Tailwind 표준값이라 무관).

**57일차 스코프는 손대지 않았습니다** — 범위 검증 인라인 에러 · 발효 시점 지정 ·
H4 변경 이력 diff 전부 미구현(의도).

**변경 파일**
- `src/app/[lang]/admin/config/page.tsx` (재작성)
- `src/app/[lang]/admin/config/{ConfigGroupNav,ConfigCodeTable,ConfigEditForm}.tsx` (신규)
- `src/app/[lang]/admin/config/{actions,config-override-store}.ts` (신규)
- `src/app/[lang]/admin/config/actions.test.ts` (신규, 9 케이스)
- `src/i18n/messages/{ko,en}/admin.ts` (`admin.config.*` 키 40줄 추가)

---

## 2. 팀장 검증

**전역 게이트 3종 통과**

| 명령 | 결과 |
|---|---|
| `npm run typecheck` | 오류 0 (I-254 라우트 산출물 정리 경고 1줄 — 정상 동작) |
| `npm run lint` | 오류 0 |
| `npm run test` | **139 파일 통과 / 1847 통과**, Type Errors none |

**dev 서버 실렌더 검증** — 55일차 인계된 어드민 계정으로 세션 쿠키를 발급해
`/ko/admin/config` · `/en/admin/config`를 직접 조회(HTTP 200, 미인증은 403 확인).

| 확인 항목 | 결과 |
|---|---|
| 그룹 전량 표시 | 그룹 링크 **38개**, 헤더 "38개 그룹 전량" |
| ko / en 로케일 | 「공통코드 관리」/「Common code management」· 「N개 코드」/「N codes」 모두 전환 |
| 코드 0건 그룹 | `?group=WEATHER_EFFECT` → 빈 상태 "해당 그룹에 코드가 없습니다" 정상 |
| INT 그룹 편집 폼 | `?group=MATCH_POINTS&code=WIN` → `groupValueType: "INT"` 숫자 위젯 |
| 스칼라 래핑 JSON | `?group=CUP_PARAM&code=BYE_COUNT` → `valueJson: {value:4}` 숫자 위젯 분기 정상 |
| 코드 미선택 | "코드를 선택하면 편집 폼이 나타납니다" 안내 |

**인가** — `updateCommonCodeValue` 첫 줄 `assertAdminSession()` 확인. 페이지 자체에
가드가 없는 것은 54·55일차 `/admin` 화면과 동일한 기존 구조(프록시 경유)이며 56일차
회귀가 아닙니다. `actions.test.ts`가 비인가 시 **오버레이 미변경**까지 단언합니다.

**수락 기준 판정** — "36그룹 전량 표시"는 **카탈로그 전량 표시**로 읽어 **충족**.
실측 38은 화면 결함이 아니라 문서 숫자가 특정 시점 스냅샷이기 때문입니다(I-280).

**재수정 0회** — 피드백 사유가 발생하지 않았습니다.

---

## 3. 이슈

신규 3건. 모두 **비차단**이며 56일차 수락을 막지 않습니다.

| ID | 대상 | 요지 |
|---|---|---|
| **I-279** | 3팀 | 38그룹 중 4그룹(`WEATHER_EFFECT`·`OVR_WEIGHT`·`MANAGER_MATCHUP`·`NATIONALITY_WEIGHT`)이 **코드 0건** — Mock 시드 공백, 화면은 빈 상태로 정상 처리 |
| **I-280** | 문서 | 일정표·ROADMAP의 "36개 그룹"이 실측 **38**과 불일치 — 화면이 `groups.length`를 쓰므로 기능 영향 없음, 숫자를 다시 박지 말 것 |
| **I-281** | 5팀 | H3 값 입력란을 비우고 저장하면 `Number("") === 0`이 통과 — 범위 없는 코드는 `0`이 저장됨. **57일차 범위 검증과 한 패스** |

---

## 4. 다음 일차 인계

1. **I-281을 57일차 Task 021 착수 조건에 포함** — "범위 검증 인라인 에러"를 만들 때
   **빈 입력 자체를 저장 전 거부**하는 처리를 사유 필수 검증과 같은 위치에 함께 넣습니다.
   지금은 `minValue`가 있는 코드만 3팀 `validateCommonCodeValue`가 막고 있습니다.
2. **57일차 H4(변경 이력 diff)는 `audit-log-store.ts`를 재사용하지 않습니다** — 코드값
   변경 이력은 별도 엔티티(E-43 `CommonCodeHistory`) 소관이라 월드 리셋 감사 로그와
   저장소가 다릅니다. 56일차 `actions.ts` 헤더에 그 판단 근거가 적혀 있습니다.
3. **`config-override-store.ts`는 인메모리 오버레이입니다** — `world-override-store.ts`와
   같은 한계(프로세스 재시작 시 휘발)를 공유하므로 **I-273 실 영속화 교체 대상에 이 파일도
   포함**됩니다. I-273 처리 시 두 스토어를 한 패스로 보세요.
4. **5팀 신규 컴포넌트 `/sample` 등록 대기가 10종으로 늘었습니다**(4팀 소유) — 54일차 4종
   (`SpeedControlPanel`·`PauseResumeControl`·`SeedInspectorPanel`·`StatusBadge`) +
   55일차 3종(`WorldResetPanel`·`DangerConfirmDialog`·`AuditLogViewer`) + **56일차 3종
   (`ConfigGroupNav`·`ConfigCodeTable`·`ConfigEditForm`)**. KPI-6 커버율 유지를 위해
   4팀 등판 시 일괄 반영.
5. **I-271은 여전히 58~59일차 6팀 어드민 조회 라우트 완료 조건** — matcher를 넓히지 말고
   각 Route Handler가 `assertAdminSession()`을 직접 호출. 56일차 서버 액션은 이 규칙을
   그대로 지켰습니다.
6. **I-275·I-276·I-273 한 패스**, **H-16(2팀→3팀 프리시즌)**, **I-272 4팀 60일차
   `proxy.ts` 소유 판정**, **PS-2 수락 판정(3팀 생성기 대기)** — 55일차 인계 그대로 유효.
7. **어드민 계정은 상시 존재**(`0625chopin@gmail.com` / `qwer1234`, `profile.role='ADMIN'`).
   ⚠️ 비밀번호가 저장소에 평문으로 있으므로 **외부 배포 전 반드시 회수**.

---

## 5. 미해결·판정 대기

- **I-281** H3 빈 입력 → `0` 저장 — 5팀, 57일차 범위 검증과 한 패스
- **I-280** "36그룹" 문서 표기 vs 실측 38 — 문서, 숫자 재기입 금지
- **I-279** 공통코드 4그룹 코드 0건 — 3팀 Mock 시드
- **I-278** 시즌 종료 ≤20초 실측이 축소 스케일 — 2팀, 3팀 생성기 붙는 시점 재측정
- **I-277** 일반 사용자 인증 UI 0건 — 5팀, 039(62일차~) 스코프 확인
- **I-276** 감사 로그 `actorId` null — 5·6팀 계약 조율(파괴적 변경)
- **I-275** G2·G3 조작 감사 로그 미기록 — 5팀, I-273과 한 패스
- **I-273** `/admin` 배속·정지 + G6 로그 오버레이 휘발 — 5·2·6팀, **`config-override-store`도 포함**
- **I-272** `proxy.ts` 소유 공백 — 4팀 60일차 인계
- **I-271** `matcher` api 제외 → `api/admin/**` 무방비 — 6팀, 58~59일차 완료 조건
- **I-269** 원격 마이그레이션 절차 — 6팀, 56일차 DDL·DML 0건(준수)
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
- **I-236** `homeModifier` 공식(2팀) / **I-214** 크론 점등 금지(차단성, 56일차 준수)
- **I-235** 공유 트리 git 조작 — 48~56일차 연속 사고 0건
- **I-142** `lint-guardrails` 동시 부하 flake — 56일차 재발 없음
- **I-233 · I-232 · I-230 · I-228 · I-227 · I-225 · I-220 · I-217 · I-216 · I-215 · I-212 · I-211 · I-209 · I-208 · I-205 · I-204 · I-192** 비차단·배정 대기
