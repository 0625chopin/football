# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 프로젝트 개요

`create-next-app`에서 출발한 Next.js 프로젝트입니다 (Next.js 16.2.10 / React 19.2.4 / App Router). **구현이 시작됐습니다 — 3일차 진행 완료(2026-07-23 기준).**

- **화면 코드는 아직 없습니다.** `src/app/`에는 `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`만 있습니다. 라우트 골격은 9~13일차(Task 005) 예정입니다.
- **이미 만들어진 코드가 있습니다. 새로 만들기 전에 반드시 확인하세요.**
  - `src/types/**` — 도메인 타입 **단일 소스**(1팀 소유). 11파일, E-01~E-08 정의 완료. **8일차(2026-07-30)에 동결**되며 이후 변경은 이슈 배치 반영만 가능합니다. 여기 있는 타입을 다른 곳에 다시 선언하지 마세요.
  - `src/lib/sim/rng/**` — 시드 PRNG·결정론 유틸(2팀 소유). `prng.ts`(xoshiro128\*\*) / `derive.ts`(시드 계층 파생) / `precision.ts`(확률 6자리 정수 비교). **난수와 확률 비교는 전부 이 모듈을 경유합니다.**
- 만들려는 제품(가상 축구 리그 시뮬레이션 / 승부 예측)의 기획은 `docs/devStep/01.초기기획.md`를 읽으세요. 기획 내용은 이 파일에 복제하지 않습니다.
- 개발 단계별 문서는 `docs/devStep/`에 `NN.제목.md` 형식으로 누적합니다. 타입·스키마 설계 원칙은 `02.*`, 결정↔Task 매핑표와 코드 리뷰 체크리스트는 `03.*`에 있습니다.
- 일차별 작업 로그는 `docs/dailyWorkLog/NDay.md`, 화면 와이어프레임은 `docs/wireframe/`에 있습니다.

## 명령어

```bash
npm run dev     # 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint (eslint.config.mjs, flat config)
```

- **테스트 러너 없습니다.**
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
  - **`/sample` 라우트는 아직 없습니다.** 4팀이 Task 005(10일차)에서 생성하고 Task 014(34~38일차)에서 쇼케이스로 완성합니다. 임의로 만들지 말고 해당 팀 일정에 따르세요.
- 개발은 더미 데이터(Mock Data)로 화면(UI)부터 구현합니다.
- Database 설계 및 연결 전에 화면, 컴포넌트 구조, 사용자 경험(UX)을 먼저 완성합니다.
- Mock 데이터와 실제 Database 데이터는 **동일한 TypeScript 타입**을 사용합니다.
- 화면 개발이 완료되면 Supabase Database를 설계 및 연결합니다.
- Database 연결 후 실제 데이터를 생성하여 CRUD, 인증(Authentication), 권한(RLS)을 포함한 통합 테스트를 진행합니다.
- 실제 데이터로 전환할 때 UI 컴포넌트는 수정하지 않고 **데이터 조회 부분만 교체**할 수 있도록 구현합니다.

### 개발중 이슈 관련사항 (결정 X, 개선사항)

- `docs/ISSUES.md`에 기록합니다. 현재 I-35까지 등재되어 있으며 **제보는 전원, 반영(파일 편집)은 1팀 코어·품질팀**이 합니다.
- **확정된 결정**은 ISSUES가 아니라 `docs/require/06-prioritization-and-risks.md` 6.3절 결정 기록(D-\*)이 단일 소스입니다. 결정과 미결을 같은 곳에 쓰지 마세요.

### 테스트계정 (계정/비밀번호)

인증 도입 후 사용할 계정입니다. 현재는 인증 기능이 없어 사용처가 없습니다.

- chopin0625/qwer1234
- 0625chopin/qwer1234
