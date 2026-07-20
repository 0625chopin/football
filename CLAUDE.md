# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 프로젝트 개요

`create-next-app`에서 출발한 Next.js 프로젝트입니다 (Next.js 16.2.10 / React 19.2.4 / App Router). **구현이 시작됐습니다 — 12일차 진행 완료(2026-08-05 기준).**

- **화면 코드가 생겼습니다(10~12일차).** `src/app/[lang]/`에 **루트 레이아웃 1개 + 빈 라우트 17개**(정규 14 + 2차 예약 3)가 있고, **전역 레이아웃 골격(헤더·사이드 내비·푸터)은 12일차에 루트 레이아웃 안에 들어갔습니다**(Task 005, 4팀). 남은 것은 각 라우트의 `loading`/`error`/`not-found` 3종(13일차)입니다.
  - 헤더의 4개 자리(리그 스위처·시즌/페이즈 인디케이터·다음 킥오프 타이머·로케일 스위처)는 전부 **비활성 placeholder**입니다. 데이터소스·i18n이 붙는 시점(013A 28일차 이후 / 011 22일차)에 교체되니 임의로 채우지 마세요.
  - `SiteHeader`/`SideNav`/`SiteFooter`는 `src/components/`가 아직 없어 **루트 레이아웃의 로컬 함수**로 두었습니다(4팀 23일차 이후 분리 예정).
  - **최상단 `src/app/layout.tsx`는 없습니다.** `src/app/[lang]/layout.tsx`가 루트 레이아웃이며 `<html lang>`을 `params.lang`으로 동적 설정합니다. 레이아웃은 자기보다 상위 세그먼트의 `params`를 읽을 수 없어, 분리하면 로케일을 반영할 수 없기 때문입니다(10일차 결정). **최상단에 `layout.tsx`를 다시 만들지 마세요.**
  - 각 `page.tsx`는 `params`를 JSON으로 출력만 하는 **자리표시자**입니다. 화면 본문은 5팀이 28일차 이후 채웁니다.
- **⚠️ WSL 마운트(`/mnt/...`)에서 Turbopack이 실패합니다(I-62).** dev는 **`npm run dev`가 `next dev --webpack`으로 고정돼 있어 그대로 쓰면 됩니다**(13일차 조치). Turbopack으로 직접 띄우면(`npx next dev`) 청크 쓰기가 EPERM으로 죽어 모든 페이지가 500이 되니 쓰지 마세요. **프로덕션 빌드는 번들러와 무관하게 실패**하므로(webpack 경로도 최종 `copyfile`에서 EPERM) 빌드 성공을 검증 수단으로 쓰지 말고 `npx tsc --noEmit` / `npm run lint` / `npm run test`로 판정하세요.
- **이미 만들어진 코드가 있습니다. 새로 만들기 전에 반드시 확인하세요.**
  - `src/types/**` — 도메인 타입 **단일 소스**(1팀 소유). 11파일, E-01~E-08 정의 완료. **8일차(2026-07-30)에 동결**되며 이후 변경은 이슈 배치 반영만 가능합니다. **여기 있는 타입을 다른 곳에 다시 선언하지 마세요.** import는 배럴(`@/types`)로만 하고, `@/types/match` 같은 서브경로 직접 import는 쓰지 않습니다(체크리스트 C-5·C-6).
  - `src/lib/sim/rng/**` — 시드 PRNG·결정론 유틸(2팀 소유). `prng.ts`(xoshiro128\*\*) / `derive.ts`(시드 계층 파생) / `precision.ts`(확률 6자리 정수 비교). **난수와 확률 비교는 전부 이 모듈을 경유합니다.**
    - **PRNG는 순수 함수입니다.** 모든 함수가 `{ state, value }`를 반환하며, 호출자가 `state`를 다음 호출로 **반드시 이어받아야** 합니다. 같은 `state`를 재사용하면 같은 값이 나옵니다.
    - `src/lib/sim/**`에서 `Math.random()` / `Date.now()` / `react` / `@supabase/*` 사용 금지 (NFR-DT-001).
    - 확률은 소수 6자리 정수 단위로만 비교합니다(`precision.ts`). 부동소수 `<` / `===` 직접 비교 금지.
- 만들려는 제품(가상 축구 리그 시뮬레이션 / 승부 예측)의 기획은 `docs/devStep/01.초기기획.md`를 읽으세요. 기획 내용은 이 파일에 복제하지 않습니다.
- 개발 단계별 문서는 `docs/devStep/`에 `NN.제목.md` 형식으로 누적합니다. 타입·스키마 설계 원칙은 `02.*`, 결정↔Task 매핑표와 코드 리뷰 체크리스트는 `03.*`에 있습니다.
- 일차별 작업 로그는 `docs/dailyWorkLog/NDay.md`, 화면 와이어프레임은 `docs/wireframe/`에 있습니다.

### 문서별 단일 소스 (충돌 시 이 표를 따르세요)

| 대상 | 단일 소스 |
|---|---|
| Task 스코프·수락 기준·테스트 | `ROADMAP.md` (Task 001~045) |
| 일정·팀 배정·소유 경로 | `docs/team-schedule/` (README + 팀별 6종) — ROADMAP의 일정 줄과 어긋나면 **이쪽이 옳음** |
| 확정된 결정(D-\*) | `docs/require/06-prioritization-and-risks.md` 6.3절 |
| 미결·개선 제안(I-\*) | `docs/ISSUES.md` |
| 엔티티 필드·타입 | `src/types/**` (8일차 동결). `docs/require/05-data-requirements.md`는 **동기화하지 않는 초기 초안**이며 이미 뒤처져 있습니다 — 충돌 시 **TS가 옳고, 05문서는 갱신하지 않습니다**(9일차 결정, I-58) |

### 일차(Day) 운영

- **1일차 = 2026-07-21(화)**, 이후 영업일 기준으로 증가합니다(3일차 = 07-23, 8일차 = 07-30). 문서의 날짜는 이 계획 캘린더 기준이며 커밋 날짜와 다를 수 있습니다.
- 한 일차의 사이클: **작업 → 개별 보고 → 상호 공유·충돌 체크 → 조율 해소 → 마감 검증**. 결과는 그 일차의 `docs/dailyWorkLog/NDay.md`에 기록합니다.

## 명령어

```bash
npm run dev     # 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint (eslint.config.mjs, flat config)
npm run test    # Vitest 1회 실행 (vitest run)
```

- **Vitest는 5일차에 선도입**됐고(2팀 PRNG 결정론 검증용), **12일차에 `vitest.config.ts`가 생겼습니다**(1팀 Task 008). 정식 정비(coverage 임계·`test:watch`/`test:coverage` 스크립트)는 15일차까지 이어집니다.
  - **`@/*` 별칭이 테스트에서도 해석됩니다** (`resolve.tsconfigPaths: true` — Vite 8 네이티브 옵션, `tsconfig.json`이 단일 소스). 기존 테스트의 상대경로 import도 그대로 유효하니 일괄 전환하지 마세요.
  - **타입 레벨 테스트(`*.type-test.ts`)는 런타임 `include`가 아니라 `typecheck` 모드로 실행됩니다.** vitest는 esbuild 트랜스폼만 하므로 런타임 include에 넣으면 `expectTypeOf` 단언이 소거돼 **항상 통과하는 무의미한 테스트**가 됩니다(I-46·I-84). `test.typecheck.enabled: true`가 실제 `tsc`를 띄워 검증하며, 이 때문에 `npm run test`가 약 5초 느립니다. **`*.type-test.ts`를 `test.include`에 추가하지 마세요.**
- **Prettier / typecheck 스크립트 / pre-commit 훅 없습니다.** (Husky, lint-staged 미설치)
  - 타입체크가 필요하면 `npx tsc --noEmit`을 직접 실행하세요.

## 실제 구성

### 디렉터리 / 경로 별칭

- **`src/` 디렉터리를 사용합니다.** App Router는 `src/app/`.
- `tsconfig.json`의 경로 별칭: `@/*` → `./src/*`. 예: `@/components/...`, `@/lib/...`
- `src/types/`(도메인 타입)와 `src/lib/sim/rng/`(시드 PRNG)는 **이미 존재합니다.** `src/components/`는 아직 없습니다(4팀 23일차 이후 생성).
- 새 코드는 `src/` 하위에 두되, **팀별 소유 경로를 먼저 확인하세요** — `docs/team-schedule/<팀>.md`의 "소유 경로" 절에 어느 디렉터리를 어느 팀이 커밋하는지 갈라 두었습니다. 남의 경로를 고치면 병렬 작업이 충돌합니다.

### 빌드 / 툴링

- `next.config.ts`: **`reactCompiler: true`** (`babel-plugin-react-compiler` 설치됨). React Compiler가 메모이제이션을 처리하므로 `useMemo` / `useCallback` 수동 최적화는 지양하세요.
- ESLint: flat config (`eslint.config.mjs`), `eslint-config-next`의 core-web-vitals + typescript 프리셋.

### 스타일링

- **TailwindCSS v4** (CSS-first). 설정은 `src/app/globals.css`의 `@import "tailwindcss"` + `@theme inline`에 있습니다. **`tailwind.config.ts`는 없습니다.**
- PostCSS는 `@tailwindcss/postcss` (`postcss.config.mjs`). autoprefixer는 v4 내장이라 미사용.
- 현재 테마 토큰은 create-next-app 기본형(`--background` / `--foreground` hex 2색)이며, 다크모드는 `@media (prefers-color-scheme: dark)` 기반입니다. 클래스 기반 다크모드 토글은 없습니다.
- 폰트: `next/font/google`의 Geist / Geist_Mono (`src/app/layout.tsx`에서 CSS 변수로 주입).

### Next.js 16 주의

이 버전은 학습 데이터와 다를 수 있습니다. 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 읽으세요 (AGENTS.md 규칙).

## 아직 도입되지 않은 것

다음은 **설치/작성되어 있지 않습니다.** 있는 것처럼 가정하고 코드를 작성하지 마세요. 필요해지면 그때 새로 도입합니다.

- Supabase 클라이언트 코드 (`@supabase/*` 패키지 자체가 미설치), 인증 라우트, 미들웨어(`proxy.ts`), DB 타입(`lib/database.types.ts`)
- shadcn/ui (`components.json` 없음), `cn()` 헬퍼 (clsx / tailwind-merge 미설치)
- `next-themes` 다크모드 Provider
- 현재 `package.json` 런타임 의존성은 `next`, `react`, `react-dom` **3개뿐**입니다.

다만 **`.env.local`에는 Supabase 값이 이미 있고**, supabase MCP도 연결되어 있습니다:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 클라이언트에 노출 금지)
- 그 외 `NOTION_API_KEY`, `SMTP_*` (로컬 메일 테스트용)

## MCP 서버

`.mcp.json`에 supabase, playwright, context7, sequential-thinking, shadcn, shrimp-task-manager가 구성되어 있습니다.

- Supabase 스키마 조회/마이그레이션은 supabase MCP 도구를 사용하세요 (project ref: `damruradpliktkrlkakl`).
- DB 타입은 `mcp__supabase__generate_typescript_types`로 생성합니다.

## 개발 원칙

### 화면 우선 개발 (Mock First Development)

- 화면은 모두 component 단위로 만듭니다.
- 화면의 모든 컴포넌트는 `http://localhost:3000/sample`에 보이도록 배치합니다.
  - **`/sample` 라우트는 10일차에 생겼습니다** — `src/app/[lang]/sample/page.tsx`(빈 자리표시자). 쇼케이스 본문은 4팀 Task 014(34~38일차)에서 채웁니다. 임의로 채우지 말고 해당 팀 일정에 따르세요. 접근 경로는 `/ko/sample`·`/en/sample`입니다(로케일 없는 `/sample`은 `proxy.ts` 도입 전까지 404).
- 개발은 더미 데이터(Mock Data)로 화면(UI)부터 구현합니다.
- Database 설계 및 연결 전에 화면, 컴포넌트 구조, 사용자 경험(UX)을 먼저 완성합니다.
- Mock 데이터와 실제 Database 데이터는 **동일한 TypeScript 타입**을 사용합니다.
- 화면 개발이 완료되면 Supabase Database를 설계 및 연결합니다.
- Database 연결 후 실제 데이터를 생성하여 CRUD, 인증(Authentication), 권한(RLS)을 포함한 통합 테스트를 진행합니다.
- 실제 데이터로 전환할 때 UI 컴포넌트는 수정하지 않고 **데이터 조회 부분만 교체**할 수 있도록 구현합니다.

### 개발중 이슈 관련사항 (결정 X, 개선사항)

- `docs/ISSUES.md`에 기록합니다. 현재 **I-129**까지 등재되어 있으며 **제보는 전원, 반영(파일 편집)은 1팀 코어·품질팀**이 합니다(일차 마감 교차 점검에서 나온 항목은 팀장이 직접 등재하기도 합니다).
- **확정된 결정**은 ISSUES가 아니라 `docs/require/06-prioritization-and-risks.md` 6.3절 결정 기록(D-\*)이 단일 소스입니다. 결정과 미결을 같은 곳에 쓰지 마세요.

### 테스트계정 (계정/비밀번호)

인증 도입 후 사용할 계정입니다. 현재는 인증 기능이 없어 사용처가 없습니다.

- chopin0625/qwer1234
- 0625chopin/qwer1234
