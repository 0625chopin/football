# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 프로젝트 개요

`create-next-app`에서 출발한 Next.js 프로젝트입니다 (Next.js 16.2.10 / React 19.2.4 / App Router). **구현이 진행 중입니다 — 35일차 완료(2026-09-07 기준).** 일차별 상세는 `docs/dailyWorkLog/NDay.md`가 단일 소스이며, 이 절에는 **"새로 만들기 전에 알아야 할 현재 구조"만** 적습니다.

- **라우트 골격과 전역 레이아웃은 완성돼 있습니다.** `src/app/[lang]/`에 루트 레이아웃 1개 + 라우트 20개(각각 `page.tsx` + `loading`/`error`/`not-found` 3종 = 4상태 파일 60개)가 있습니다.
  - **`page.tsx` 20개 중 18개는 아직 `params`를 JSON으로 출력만 하는 자리표시자입니다.** 실제 화면이 들어간 것은 홈(`[lang]/page.tsx`)과 `[lang]/sample/page.tsx` 둘뿐이며(34일차), 나머지는 5팀이 35일차 이후 Task 015~021로 채웁니다. **임의로 채우지 마세요.**
  - 헤더 4개 자리 중 **로케일 스위처만 실동작**(`src/components/ui/LocaleSwitcher.tsx`)이고, 리그 스위처·시즌/페이즈 인디케이터·다음 킥오프 타이머는 여전히 **비활성 placeholder**입니다. 데이터소스가 붙는 시점에 교체되니 임의로 채우지 마세요.
  - `SiteHeader`/`SideNav`/`SiteFooter`는 아직 **루트 레이아웃의 로컬 함수**입니다(23일차 이후 분리 예정이 34일차까지 미이행 — 4팀 소유).
  - **최상단 `src/app/layout.tsx`는 없습니다.** `src/app/[lang]/layout.tsx`가 루트 레이아웃이며 `<html lang>`을 `params.lang`으로 동적 설정합니다. 레이아웃은 자기보다 상위 세그먼트의 `params`를 읽을 수 없어, 분리하면 로케일을 반영할 수 없기 때문입니다(10일차 결정). **최상단에 `layout.tsx`를 다시 만들지 마세요.**
- **컴포넌트 33종이 `src/components/`에 이미 있습니다**(`ui/` 11 · `domain/` 8 · `composite/` 7 · `state/` 6 + 순수 로직 파일). **새로 만들기 전에 반드시 목록부터 확인하세요.** 소유는 `ui`/`domain`/`state` = 4팀, `composite` = 5팀입니다.
- **⚠️ WSL 마운트(`/mnt/...`)에서 Turbopack이 실패합니다(I-62).** dev는 **`npm run dev`가 `next dev --webpack`으로 고정돼 있어 그대로 쓰면 됩니다**(13일차 조치). Turbopack으로 직접 띄우면(`npx next dev`) 청크 쓰기가 EPERM으로 죽어 모든 페이지가 500이 되니 쓰지 마세요. **프로덕션 빌드는 번들러와 무관하게 실패**하므로(webpack 경로도 최종 `copyfile`에서 EPERM) 빌드 성공을 검증 수단으로 쓰지 말고 `npm run typecheck`(35일차부터 — 이전엔 `npx tsc --noEmit`, I-181로 대체됨) / `npm run lint` / `npm run test`로 판정하세요.
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
npm run lint      # ESLint (eslint.config.mjs, flat config)
npm run test      # Vitest 1회 실행 (vitest run)
npm run typecheck # tsc --noEmit 재시도 래퍼 (35일차, I-181 — 아래 참조)
```

- **Vitest는 5일차에 선도입**됐고(2팀 PRNG 결정론 검증용), **12일차에 `vitest.config.ts`가 생겼습니다**(1팀 Task 008). 정식 정비(coverage 임계·`test:watch`/`test:coverage` 스크립트)는 15일차까지 이어집니다.
  - **`@/*` 별칭이 테스트에서도 해석됩니다** (`resolve.tsconfigPaths: true` — Vite 8 네이티브 옵션, `tsconfig.json`이 단일 소스). 기존 테스트의 상대경로 import도 그대로 유효하니 일괄 전환하지 마세요.
  - **타입 레벨 테스트(`*.type-test.ts`)는 런타임 `include`가 아니라 `typecheck` 모드로 실행됩니다.** vitest는 esbuild 트랜스폼만 하므로 런타임 include에 넣으면 `expectTypeOf` 단언이 소거돼 **항상 통과하는 무의미한 테스트**가 됩니다(I-46·I-84). `test.typecheck.enabled: true`가 실제 `tsc`를 띄워 검증하며, 이 때문에 `npm run test`가 약 5초 느립니다. **`*.type-test.ts`를 `test.include`에 추가하지 마세요.**
- **Prettier / pre-commit 훅 없습니다.** (Husky, lint-staged 미설치)
  - **타입체크는 `npx tsc --noEmit`을 직접 실행하지 말고 `npm run typecheck`을 쓰세요**(35일차, I-181). `tsconfig.json`의 `.next/dev/types/**` include는 Next.js 16이 dev/build 전환 시 tsconfig가 흔들리지 않도록 **의도적으로 관리하는 것**이라(지워도 다음 `next dev`/`next build`가 되살림) 손댈 수 없는데, 그 경로가 로컬에서 dev 서버가 띄워진 채로 있을 때 **계속 재생성되는 휘발성 산출물**이라 raw `npx tsc --noEmit`이 그 파일을 쓰는 도중에 읽어 무작위로 실패한다(WSL DrvFs torn write, I-62 계열). `npm run typecheck`(`scripts/typecheck.mjs`)은 오류가 전부 `.next/` 아래에서만 났을 때만 재시도하고, `src/**` 등 실제 오류가 하나라도 섞이면 재시도 없이 그대로 실패시킨다 — CI(dev 서버가 없어 이 경합 자체가 없음)에서도 안전하게 동일 명령을 쓸 수 있다. `npm run gate`(`scripts/gate.sh`)도 내부적으로 이 명령을 쓴다.

## 실제 구성

### 디렉터리 / 경로 별칭

- **`src/` 디렉터리를 사용합니다.** App Router는 `src/app/`.
- `tsconfig.json`의 경로 별칭: `@/*` → `./src/*`. 예: `@/components/...`, `@/lib/...`
- `src/types/`(도메인 타입)·`src/lib/sim/`(엔진)·`src/lib/data/`(어댑터)·`src/components/`(33종)·`src/i18n/`은 **전부 이미 존재합니다.** 만들기 전에 목록부터 확인하세요.
- 새 코드는 `src/` 하위에 두되, **팀별 소유 경로를 먼저 확인하세요** — `docs/team-schedule/<팀>.md`의 "소유 경로" 절에 어느 디렉터리를 어느 팀이 커밋하는지 갈라 두었습니다. 남의 경로를 고치면 병렬 작업이 충돌합니다.

### 빌드 / 툴링

- `next.config.ts`: **`reactCompiler: true`** (`babel-plugin-react-compiler` 설치됨). React Compiler가 메모이제이션을 처리하므로 `useMemo` / `useCallback` 수동 최적화는 지양하세요.
- ESLint: flat config (`eslint.config.mjs`), `eslint-config-next`의 core-web-vitals + typescript 프리셋.

### 스타일링

- **TailwindCSS v4** (CSS-first). 설정은 `src/app/globals.css`의 `@import "tailwindcss"` + `@theme inline`에 있습니다. **`tailwind.config.ts`는 없습니다.**
- PostCSS는 `@tailwindcss/postcss` (`postcss.config.mjs`). autoprefixer는 v4 내장이라 미사용.
- **테마 토큰은 24~26일차(Task 012)에 확장되고 36일차(Task 013C)에 값이 전면 교체됐습니다. 새로 만들지 마세요.** `src/app/globals.css`에 shadcn 표준 토큰 전량(oklch, `--background`~`--sidebar-*`·`--chart-1~5`·`--radius-*`), **시맨틱 컬러 5종**(`--promotion`/`--playoff`/`--relegation`/`--live`/`--warning` + `--warning-foreground`), **반응형 브레이크포인트 6종**(320/375/768/1024/1440/1920px)이 들어 있습니다.
- **비주얼 디렉션은 "Floodlit(야간 조명)"입니다** (36일차). 근거와 실측치는 `globals.css` 상단 주석이 단일 소스이며, 아래 3개 규칙만 지키면 됩니다.
  - **`--primary`(조명 호박색)는 "조작 가능 / 지금 진행 중"에만 씁니다.** 데이터 시각화(막대·레이더·점)는 `--chart-1~5`를 쓰세요 — 데이터에 브랜드색을 칠하면 강조가 강조를 잃습니다(36일차 `/sample`에서 실제로 발생, `progress.tsx` 주석 참조).
  - **`--board-*` 4종은 라이트/다크 공통으로 항상 어두운 "중계 표면"입니다.** 헤더·푸터·홈 라이브 보드가 씁니다. 이 표면 위 컴포넌트는 `--border`/`--muted-foreground` 같은 페이지 토큰을 쓰면 안 되고(대비 방향이 반대), `--board-line`/`--board-muted` 또는 `currentColor` 파생만 씁니다 — `MatchCard`의 `surface` prop이 그 패턴의 참조 구현입니다.
  - **커스텀 유틸리티 6종이 이 디렉션의 전부입니다**: `board` / `pitch-stripes` / `eyebrow`(초소형 대문자 라벨) / `scoreboard`(점수·시간·배당 숫자) / `touchline`+`touchline-on`(활성 표시 3px 초크 바) / `live-dot`. 새 화면은 임의의 색·그림자를 직접 쓰지 말고 이것들을 조합하세요.
  - 폰트는 3역할입니다 — 본문 Geist, 디스플레이 Archivo(`wdth` 가변축), 데이터 Geist Mono, **한글은 세 스택 모두 Gothic A1이 뒤에서 받습니다**. 역할 분담표는 `src/app/[lang]/layout.tsx` 상단 주석이 단일 소스입니다.
  - 시맨틱 5종은 **색상 단독 사용 금지**입니다(NFR-A11Y-002) — 아이콘·라벨을 반드시 병기하세요. `--warning`은 라이트 배경 대비가 1.34:1이라 **단독 채움 금지**, 항상 `--warning-foreground`와 함께 씁니다.
  - 토큰 값을 바꾸면 `src/lib/a11y/contrast.test.ts`가 `globals.css`를 직접 파싱해 CVD ΔE·색역·대비를 단언합니다. **ΔE 하한 12 대비 실측 최소치가 12.56이라 여유가 0.56뿐입니다**(I-144) — 토큰을 건드리면 먼저 이 테스트를 돌리세요.
  - 타이포·간격은 Tailwind v4 기본 스케일을 **채택 결정**한 것입니다(오버라이드 없음). 그 결정 기록은 `globals.css` 주석이 단일 소스입니다.
  - 다크모드는 `@media (prefers-color-scheme: dark)` 기반이며 클래스 기반 토글은 없습니다(`.dark` 셀렉터 0건).
- 폰트: `next/font/google`의 Geist / Geist_Mono (**`src/app/[lang]/layout.tsx`**에서 CSS 변수로 주입). 최상단 `src/app/layout.tsx`는 존재하지 않습니다(위 "10일차 결정" 참조).

### Next.js 16 주의

이 버전은 학습 데이터와 다를 수 있습니다. 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 읽으세요 (AGENTS.md 규칙).

## 아직 도입되지 않은 것

다음은 **설치/작성되어 있지 않습니다.** 있는 것처럼 가정하고 코드를 작성하지 마세요. 필요해지면 그때 새로 도입합니다.

- **`@supabase/*` 패키지** — 미설치가 맞습니다. 단 **Supabase 어댑터 자체는 있습니다**(`src/lib/data/supabase/`, REST 브리지 방식). DB 타입도 **`src/lib/data/database.types.ts`에 이미 생성돼 있습니다**(경로 주의 — `lib/database.types.ts`가 아닙니다).
- 인증 라우트 (2차 릴리스, Task 037)
- `next-themes` 다크모드 Provider

### ✅ 이미 도입된 것 (23일차 — 위 목록에서 빠졌던 항목)

**shadcn/ui와 `cn()`은 23일차에 도입됐습니다.** 이 문서가 30일차까지 "미설치"로 잘못 적고 있었습니다(30일차 팀장 검증에서 적발). 다시 만들지 마세요.

- `components.json` **있음**, `cn()` 헬퍼는 **`src/lib/utils.ts`**에 있습니다 — `@/lib/utils`에서 import 하세요.
- 런타임 의존성은 3개가 아니라 **8개**입니다: `next`, `react`, `react-dom`, `clsx`, `tailwind-merge`, `class-variance-authority`, `radix-ui`, `tw-animate-css`.

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
  - **`/sample` 쇼케이스는 34일차에 실렌더되기 시작했습니다** — `src/app/[lang]/sample/page.tsx`에 5개 카테고리 섹션 + 앵커 내비가 있고 **컴포넌트 22종이 실제로 렌더**됩니다(4팀 Task 014, 38일차까지 계속). 35일차에 **4상태 토글(`StateToggleSlot`)과 뷰포트 프리뷰(`ViewportFrame`)**가 추가됐습니다 — 프리뷰는 Tailwind `sm:`/`lg:`가 뷰포트 기준이라 컨테이너 폭만 바꾸면 재배치되지 않으므로 **컨테이너 쿼리(`@container` + `@sm:`/`@lg:`)를 씁니다.** **4팀 소유이므로 임의로 채우지 마세요.** 신규 컴포넌트를 만들면 여기 등록해야 KPI-6 커버율이 유지됩니다.
  - 접근 경로는 `/ko/sample`·`/en/sample`이며, **로케일 없는 `/sample`도 `src/proxy.ts`가 기본 로케일로 리다이렉트합니다**(더 이상 404가 아닙니다). 단 `matcher`가 `_next`·`api`·확장자 경로를 의도적으로 제외하므로, 무효 `lang` 차단은 `[lang]/layout.tsx`의 `notFound()`가 2중 방어합니다.
- 개발은 더미 데이터(Mock Data)로 화면(UI)부터 구현합니다.
- Database 설계 및 연결 전에 화면, 컴포넌트 구조, 사용자 경험(UX)을 먼저 완성합니다.
- Mock 데이터와 실제 Database 데이터는 **동일한 TypeScript 타입**을 사용합니다.
- 화면 개발이 완료되면 Supabase Database를 설계 및 연결합니다.
- Database 연결 후 실제 데이터를 생성하여 CRUD, 인증(Authentication), 권한(RLS)을 포함한 통합 테스트를 진행합니다.
- 실제 데이터로 전환할 때 UI 컴포넌트는 수정하지 않고 **데이터 조회 부분만 교체**할 수 있도록 구현합니다.

### 개발중 이슈 관련사항 (결정 X, 개선사항)

- `docs/ISSUES.md`에 기록합니다. **최신 이슈 번호는 이 파일에 적지 않습니다 — `docs/ISSUES.md`가 단일 소스입니다**(번호를 여기 박아 두면 매 일차 갱신이 필요해 반드시 stale해집니다. 실제로 I-129로 43건 뒤처진 채 방치됐습니다). **제보는 전원, 반영(파일 편집)은 1팀 코어·품질팀**이 합니다(일차 마감 교차 점검에서 나온 항목은 팀장이 직접 등재하기도 합니다).
- **확정된 결정**은 ISSUES가 아니라 `docs/require/06-prioritization-and-risks.md` 6.3절 결정 기록(D-\*)이 단일 소스입니다. 결정과 미결을 같은 곳에 쓰지 마세요.

### 테스트계정 (계정/비밀번호)

인증 도입 후 사용할 계정입니다. 현재는 인증 기능이 없어 사용처가 없습니다.

- chopin0625/qwer1234
- 0625chopin/qwer1234
