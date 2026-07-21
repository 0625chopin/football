---
name: component-conventions
description: football4(가상 축구 리그 시뮬레이션) 프로젝트에서 화면·UI 컴포넌트를 만들거나 고칠 때의 규약 — 4상태 계약, i18n 키 경유, 소유 경로, 접근성, 미래정보 비노출. 카드·섹션·테이블·배지·차트 등 무엇이든 `src/components/**` 또는 `src/app/[lang]/**`에 JSX를 새로 쓰거나 수정하려 한다면 반드시 먼저 이 스킬을 읽으세요. "선수 카드 만들어줘", "순위표 화면 채워줘", "이 컴포넌트에 로딩 상태 추가", "스쿼드 테이블", "프로필 헤더" 같은 요청은 물론, 사용자가 규약을 언급하지 않아도 적용됩니다. 이 프로젝트는 팀별 소유 경로와 도메인 제약(PA 비노출·미래정보 차단)이 있어, 모르고 만들면 리뷰에서 머지 거부되거나 남의 병렬 작업을 깨뜨립니다.
---

# football4 컴포넌트 제작 규약

이 프로젝트는 6개 팀이 **경로를 갈라서 병렬로** 커밋합니다. 그래서 "동작하는 컴포넌트"만으로는
부족하고, 규약을 벗어나면 남의 작업을 깨거나 리뷰에서 되돌아옵니다. 아래는 전부 실제 코드와
`docs/devStep/03.*`(코드 리뷰 체크리스트 C-1~C-23)에서 확인된 항목입니다.

## 0. 코드를 쓰기 전에 — 3분 확인

이 순서를 건너뛰면 대개 "이미 있는 걸 또 만들었거나, 남의 파일을 고쳤거나, 기획서와 다른 걸
만든" 셋 중 하나가 됩니다.

1. **이미 있는지 본다.** `src/components/`에 33종이 있습니다. `ls src/components/{ui,domain,composite,state}/`
   먼저 확인하세요. 특히 `PlayerAvatar`·`TeamBadge`·`AbilityRadar`·`ConditionGauge`·`FitnessBar`·
   `FormStrip`·`PositionMap`·`StatBar`가 있으므로, 선수/클럽 화면 조각은 새로 그리기 전에
   조합으로 되는지 먼저 따져보세요.
2. **기획서를 본다.** 화면 작업이면 `docs/wireframe/NN-*.md`에 영역 명세(필드·번역키 프리픽스·
   데이터 출처·제약)가 이미 있습니다. 여기 없는 걸 만들면 신규 스코프이고, `docs/ISSUES.md`
   등재 대상입니다. 임의로 늘리지 마세요.
3. **누가 커밋하는 경로인지 본다.** `docs/team-schedule/<팀>.md`의 "소유 경로" 절이 단일 소스입니다.

   | 경로 | 소유 |
   |---|---|
   | `src/components/ui/**` · `domain/**` · `state/**` | **4팀** |
   | `src/components/composite/**` | **5팀** |
   | `src/app/[lang]/sample/**`, `stats`·`awards`·`archive`·`transfers`·`playoffs`·`cup`·`sponsors` | **4팀** |
   | 그 외 `src/app/[lang]/**` 화면 | **5팀** |
   | `src/lib/sim/**` | **2팀** |
   | `src/types/**` | **1팀 (8일차 동결)** |

   남의 경로를 고쳐야 하면 **판단만 먼저 회신하고 조율 후 반영**합니다. 조용히 고치면 병렬 작업이 충돌합니다.
4. **Next.js 16 API를 쓰면** `node_modules/next/dist/docs/`의 해당 가이드를 읽고 참조 경로를
   커밋 메시지에 남깁니다(C-20). 이 버전은 학습 데이터와 다릅니다.

## 1. 컴포넌트 골격

본보기는 `src/components/composite/MatchCard.tsx`(복합)와
`src/components/domain/PlayerAvatar.tsx`(도메인)입니다. 새 컴포넌트는 이 형태를 따릅니다.

```tsx
import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { Player } from "@/types";          // 배럴로만 import
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types"; // composite면 CompositeViewState

export interface XxxCardData {
  readonly id: string;
  readonly name: string;
}

export interface XxxCardProps {
  readonly locale: SupportedLocale;
  readonly state: DomainViewState<XxxCardData>;
  readonly className?: string;
}

export function XxxCard({ locale, state, className }: XxxCardProps) {
  if (state.status === "loading") return /* Skeleton */;
  if (state.status === "empty")   return /* EmptyState */;
  if (state.status === "error")   return /* ErrorState */;
  const { data } = state;
  return <div className={cn("...", className)}>…</div>;
}
```

핵심은 **4상태를 별도 prop으로 쪼개지 않고 판별 유니온 하나로 받는 것**입니다
(`state: DomainViewState<T>` / `CompositeViewState<T>`). `loading`/`error`/`empty` prop을 따로
두면 소비처가 컴포넌트마다 다른 분기 로직을 새로 익혀야 하고, 불가능한 조합(`loading && error`)이
타입으로 표현돼 버립니다. 28일차에 두 계약을 동형으로 맞춘 이유가 이것입니다(I-156).

- **named export**만 씁니다. default export 없음.
- **서버 컴포넌트가 기본**입니다. `"use client"`는 상호작용이 실제로 필요할 때만.
- **컴포넌트 안에서 데이터를 가져오지 않습니다.** 도메인 타입 props만 받습니다(C-5, 4팀 32일차
  수락 기준: 컴포넌트 내 fetch 0건). 계산도 가능하면 호출부로 밀어냅니다 — `MatchCard`가
  경과분을 직접 계산하지 않고 `computeElapsedMinutes`를 내보내 호출부가 채워 넣게 한 이유입니다.
- 상태·유틸 프리미티브(`SkeletonBlock`·`EmptyState`·`ErrorState`)는 **4상태를 구현하는 도구
  자체**라 4상태 대상이 아닙니다(I-168).

### 이미 있는 계약을 먼저 찾으세요

컴포넌트를 직접 짜기 전에 **데이터 계층이 이미 정의해 둔 표시용 타입**이 있는지 보세요. 새로
`XxxData` 모양을 발명하면 어댑터가 내려주는 것과 미묘하게 어긋나고, 실 데이터 전환 때 드러납니다.

`src/lib/data/DataSource.ts`가 화면 단위 조회 메서드를 이미 갖고 있습니다 — `getPlayerProfile`,
`getTeamSquad`, `getStandings`, `getLiveFixtures`, `getNextKickoff`, `getMatchEvents`,
`getMatchTeamStats`, `getPlayerSeasonStats`, `getPlayerInjuries` 등. **컴포넌트 props는 이
메서드들의 반환 타입에서 출발하는 게 기본**입니다.

특히 이런 것들은 다시 만들지 마세요:

| 이미 있음 | 위치 | 쓰임 |
|---|---|---|
| `PublicPlayerProfile` | `@/lib/data/DataSource` | 선수 표시용 — `pa` 제외 + `scoutRating` 포함 |
| `toPublicProfile()` | `@/lib/data/player-profile` | `Player` → 위 타입 변환(등급 환산 포함) |
| `MatchTeamStatComparison` | `@/lib/data/DataSource` | 경기 팀 스탯 비교(경과분 컷오프 포함) |
| `computeElapsedMinutes()` | `@/components/composite/MatchCard` | 경과분 — UI가 직접 계산하지 않음 |
| `DomainViewState` / `CompositeViewState` | `components/{domain,composite}/types` | 4상태 판별 유니온 |

## 2. 타입

- 도메인 타입은 `src/types/`가 **단일 소스**이고 8일차에 **동결**됐습니다. 로컬 재정의 금지(C-5).
- import는 **배럴 `@/types`로만**. `@/types/match` 같은 서브경로 직접 import는 쓰지 않습니다.
- enum성 값(이벤트·포지션·부상·전술·페이즈·마켓 상태·국적)을 **재선언하지 마세요**(C-6).
  화면에서만 쓰는 표시용 데이터 모양(`XxxCardData`)은 컴포넌트 파일에 두어도 되지만,
  도메인 개념을 다시 정의하는 건 다릅니다.
- 타입을 바꿔야 하면 직접 고치지 말고 **이슈 등재 → 주 1회 배치 반영**입니다(C-7).

## 3. i18n — 하드코딩 0

- JSX 텍스트 리터럴은 전부 `t(locale, key)`를 경유합니다(C-10). ko/en 하드코딩 문자열 0이
  4팀 33일차 수락 기준입니다.
- `t()`는 React를 참조하지 않는 순수 함수라 서버 컴포넌트에서 그냥 호출하면 됩니다. 클라이언트
  트리 깊은 곳이라 `locale`을 내리기 곤란할 때만 `useTranslation()`(`@/i18n/provider`)을 씁니다.
- **선수·클럽·구장 이름은 번역 대상이 아닙니다**(D-17). 변수로 주입합니다.
  반대로 **국적·포지션·부상 등급 같은 enum은 반드시 번역키를 경유**합니다.
- **키 이름을 임의로 확정하지 마세요.** 원칙은 4팀 소유였고, 35일차 개정으로 **화면을 소유한
  팀이 자기 키 파일을 소유**합니다. 남의 화면 키를 예측해 만들면 이름이 틀려 재작업이 납니다.
- 없는 키를 `as TranslationKey`로 우회하면 런타임에 던집니다. 우회하지 말고 키를 먼저 추가하세요.

## 4. 스타일

- **TailwindCSS v4 CSS-first.** `tailwind.config.ts`는 없습니다. 토큰은 `src/app/globals.css`의
  `@theme inline`에 있고 24~26일차에 확장 완료됐습니다 — **새로 만들지 말고 있는 걸 쓰세요.**
- 클래스 병합은 `cn()`(`@/lib/utils`). shadcn 프리미티브는 `src/components/ui/`에 이미 있습니다
  (`card`·`badge`·`button`·`avatar`·`progress`·`separator`·`skeleton`·`table`·`tabs`·`tooltip`).
- **`useMemo`/`useCallback`을 쓰지 마세요.** `next.config.ts`에 `reactCompiler: true`라 컴파일러가
  메모이제이션을 처리합니다. 정말 필요한 예외라면 왜 필요한지 주석으로 남기세요.
- 동적 클래스 문자열을 조립하지 마세요. Tailwind가 정적으로 못 읽습니다 — `PlayerAvatar`의
  `PALETTE` 배열처럼 완성된 클래스 문자열을 나열합니다.
- 넓은 콘텐츠(표·차트)는 **자체적으로 `overflow-x: auto`** 를 갖습니다(R-6). 320px에서 페이지
  본문이 가로로 밀리면 안 됩니다.
- 다크모드는 `prefers-color-scheme` 기반입니다. `.dark` 클래스 토글은 이 프로젝트에 없습니다.

## 5. 접근성 — 색 단독 사용 금지

시맨틱 컬러 5종(`--promotion`/`--playoff`/`--relegation`/`--live`/`--warning`)은 **색만으로
의미를 전달하면 안 됩니다**(NFR-A11Y-002, R-4). 아이콘·라벨을 반드시 병기하세요. 승격/강등,
부상/정지, 증가/감소가 색으로만 구분되면 색각 이상 사용자에게는 같은 화면입니다.

- `--warning`은 라이트 배경 대비가 1.34:1이라 **단독 채움 금지** — 항상 `--warning-foreground`와 함께.
- 토큰 값을 건드리면 `src/lib/a11y/contrast.test.ts`가 `globals.css`를 파싱해 단언합니다.
  **ΔE 하한 12 대비 실측 최소가 12.56, 여유가 0.56뿐**이라(I-144) 토큰을 만졌으면 먼저 이 테스트를 돌리세요.
- 표에는 `<caption>`, 열 헤더에 `scope="col"`.

## 6. 도메인 제약 — 여기서 머지가 막힙니다

이 프로젝트에는 "보이면 안 되는 정보"가 있습니다. UI에서 숨기는 게 아니라 **애초에 데이터가
오지 않아야** 합니다. 자세한 규칙과 화면별 적용은 `references/domain-constraints.md`를 읽으세요.
요약하면:

- **PA(잠재능력) 원값 비노출** — 선수 컴포넌트의 props는 `Player`가 아니라
  **`PublicPlayerProfile`**(`@/lib/data/DataSource`)입니다. `Omit<Player, 'pa'> & { scoutRating: 1|2|3|4|5 }`라
  타입이 이미 PA를 막아 줍니다. `Player`를 받아 놓고 화면에서 안 그리는 방식은 원값이 네트워크에
  실려 위반입니다. 등급 환산은 데이터 계층의 `toPublicProfile()`(`@/lib/data/player-profile`)이
  이미 하므로 **컴포넌트에서 다시 계산하지 마세요.**
- **미래 정보 비노출(C-23)** — 진행 중 경기의 결과·이벤트·누적 스탯을 전량 받아 클라이언트에서
  숨기는 구현(`display:none`, 조건부 렌더, 클라이언트 필터)은 **머지 거부**입니다. 서버가 경과분
  범위만 응답하고, 종료 전 결과 필드는 `null`입니다.
- **승부차기 골은 득점에 합산하지 않습니다**(D-19, 연장 골은 포함). 스코어는 `2-2 (승부차기 4-3)`로 분리 표기.
- **금액 단위는 pt**입니다. 원화 기호·"원" 표기 금지(L-03).

한편 **UI에서 현재 시각을 읽는 건 위반이 아닙니다.** 카운트다운·폴링·로컬 시각 변환은 정상
동작이고 리뷰에서 지적 대상이 아닙니다(C-2 단서). `Math.random()`/`Date.now()` 금지는
`src/lib/sim/**` 한정입니다.

## 7. 데이터 연결

Mock으로 화면을 먼저 만들되, **`src/lib/mock/**`를 직접 import하지 마세요.** 항상
`getDataSource()`(`@/lib/data/factory`) 경유입니다 — ESLint가 막습니다(Task 044). 이래야 실
데이터로 전환할 때 UI를 고치지 않고 조회부만 교체할 수 있습니다. Mock과 실 데이터는 **동일한
TypeScript 타입**을 씁니다.

## 8. 만들었으면 등록

새 컴포넌트는 `/sample` 쇼케이스에 등록해야 KPI-6 커버율이 유지됩니다
(`src/app/[lang]/sample/page.tsx`, 카테고리 섹션 + 앵커 내비). **이 파일은 4팀 소유**이므로,
5팀이 만든 컴포넌트라면 등록을 4팀에 인계합니다. 접근 경로는 `/ko/sample`·`/en/sample`.

## 9. 검증

```bash
npx tsc --noEmit     # 타입 (typecheck 스크립트 없음, 직접 실행)
npm run lint
npm run test         # vitest run
npm run dev          # next dev --webpack 고정
```

3단 게이트 통과가 완료 판정입니다(C-22).

- **`npm run build`로 판정하지 마세요.** WSL 마운트(`/mnt/...`)에서 번들러와 무관하게 최종
  `copyfile`이 EPERM으로 실패합니다(I-62). 빌드 실패는 코드 문제가 아닙니다.
- dev는 `npm run dev`를 그대로 쓰세요. `npx next dev`(Turbopack)는 청크 쓰기가 죽어 전 페이지 500입니다.
- `*.type-test.ts`를 `test.include`에 넣지 마세요. esbuild가 `expectTypeOf`를 소거해 **항상
  통과하는 무의미한 테스트**가 됩니다(I-46·I-84). typecheck 모드가 이미 처리합니다.
- 눈으로 볼 땐 `/ko/sample`과 `/en/sample`을 **둘 다** 확인하세요. 하드코딩 문자열은 로케일을
  바꿔야 드러납니다.

## 10. 기록

작업 결과는 그 일차의 `docs/dailyWorkLog/NDay.md`에 남깁니다. 결정이 아니라 미결·개선이면
`docs/ISSUES.md`(제보는 전원, 파일 편집은 1팀), 확정된 결정은
`docs/require/06-prioritization-and-risks.md` 6.3절입니다. 둘을 같은 곳에 쓰지 마세요.
