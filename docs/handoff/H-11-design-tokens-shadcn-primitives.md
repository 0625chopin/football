# H-11 — 디자인 토큰 + shadcn 프리미티브 + cn() (코드 인계)

> **발신**: 4팀 UI기반·i18n팀 / **수신**: 5팀 화면·배팅UX팀
> **확정 일차**: 27일차(2026-08-26)
> **소비 시작**: 28일차 (Task 013B 복합 컴포넌트 7종)
> **근거**: `ROADMAP.md` Task 012 27일차 인계물 H-11 / `docs/team-schedule/04-UI기반i18n팀.md` §3.1
> **소스**: `src/app/globals.css`, `components.json`, `src/components/ui/**`, `src/lib/utils.ts` — 아래는 이 파일들을 그대로 요약한 것이며 임의로 값을 바꾸지 않았다.

## 이 문서의 성격

- 코드가 이미 리포지토리에 있으므로 이 문서는 **값 자체가 아니라 어디에 무엇이 있는지, 무엇이 없는지의 지도**다. 최신 값은 항상 소스 파일이 우선한다.
- `src/components/ui/**`는 4팀 소유 경로이지만, shadcn CLI로 표준 프리미티브를 추가하는 정도는 5팀이 직접 해도 충돌 위험이 낮다(§2 참고). 커스텀 로직이 들어가는 편집은 사전 협의할 것.

## 1. 디자인 토큰 (`src/app/globals.css`)

| 항목 | 값 | 확정 일차 |
|---|---|---|
| 브레이크포인트 6종 | xs 320 / sm 375 / md 768 / lg 1024 / xl 1440 / 2xl 1920(px, `docs/wireframe/00-공통규약.md` §5가 단일 소스) | 24일차 |
| 타이포·간격 스케일 | Tailwind v4 기본 스케일 그대로 사용, 커스텀 오버라이드 없음(`text-*`, 4px 그리드 `spacing` 그대로 소비) | 26일차 결정 |
| 시맨틱 컬러 5종 | `--color-promotion/playoff/relegation/live/warning`(+`warning-foreground`). CVD 시뮬레이션 3종 + WCAG 대비 검증 완료(`src/lib/a11y/contrast.test.ts`가 이 CSS를 직접 파싱해 회귀 검증) | 25일차 |
| radius 스케일 | `--radius-sm` ~ `--radius-4xl` 7단계 | — |
| 다크모드 | `@media (prefers-color-scheme: dark)` 기반 — **클래스 토글 없음**, OS 설정을 따른다 | — |

**주의(NFR-A11Y-002)**: `--warning`은 라이트 배경 대비가 낮아(1.34:1) 단독 채움 금지 — 반드시 `--warning-foreground`(텍스트·아이콘·보더)와 함께 쓴다. 색상만으로 의미를 전달하지 않는다(모든 시맨틱 컬러 공통).

## 2. shadcn 프리미티브 (`src/components/ui/**`, 8종 + 커스텀 1종)

`Button`, `Badge`, `Card`, `Separator`, `Skeleton`, `Table`(+`Header`/`Body`/`Footer`/`Row`/`Head`/`Cell`/`Caption`), `Tabs`, `Tooltip` — 전부 `data-slot` 속성 부여됨(테스트 셀렉터로 활용 가능).
`LocaleSwitcher`는 shadcn 프리미티브가 아니라 011(i18n) 산출물이 이 폴더에 같이 있는 것.

`components.json`: `style: radix-nova`, `baseColor: neutral`, `iconLibrary: lucide`, aliases `@/components` · `@/lib/utils` · `@/components/ui` 확인됨.

**미도입 프리미티브**: `Avatar`, `Dialog`/`Sheet`, `Select`, `Popover`, `Progress`, `Accordion`, `Alert` 등은 아직 없다. wireframe 8절 감사에서 명시적 수요가 없어 선제 도입하지 않았다(과잉 설계 방지). 013B 진행 중 실제로 필요해지면 shadcn MCP/`npx shadcn add <name>`으로 바로 추가하면 된다 — 4팀 승인 대기 없이 진행 가능, 다만 dailyWorkLog에 추가 사실만 남길 것.

⚠️ **차트 라이브러리는 포함되어 있지 않다.** `GrowthChart`(013B, 31일차)처럼 실제 시계열/분포 시각화가 필요한 컴포넌트는 shadcn 레지스트리 범위 밖이라 별도 라이브러리 도입 검토가 필요하다(현재 `package.json` 런타임 의존성에 차트 라이브러리 없음) — 이슈 후보로 별도 보고.

## 3. `cn()` 헬퍼 (`src/lib/utils.ts`)

```ts
import { cn } from "@/lib/utils" // clsx + tailwind-merge, 마지막 인자가 우선 적용됨
```

## 4. 로케일별 텍스트 길이 편차(ko↔en) 대응 규약 (27일차 신규, Task 012 최종일)

| 컴포넌트 | 규약 |
|---|---|
| `Button` | `size`별 `min-w-[Nch]` 적용(ch 단위라 폰트 크기 변화에도 비율 유지). **max-w는 의도적으로 미지정** — 버튼은 내용에 따라 자라는 게 기본이며, 고정폭 그리드가 필요하면(예: 013A `OddsButton`) 소비처가 className으로 직접 덮어쓴다. |
| `Badge` | `max-w-[14ch]` 기본 적용, `shrink-0` 유지. ⚠️ `truncate` 클래스가 붙어 있지만 `inline-flex` 컨테이너라 **말줄임(…)은 나오지 않는다**(`text-overflow: ellipsis`는 flex item에 적용되지 않음) — 실제로는 **말줄임 없는 하드 클립**이다(27일차 팀장 검증). 말줄임이 꼭 필요하면 소비처가 children을 `<span className="min-w-0 truncate">`로 직접 감쌀 것. **긴 표시명이 들어갈 수 있는 소비처는 `title` 속성을 함께 전달할 것**(클립 시 접근성 보완, 하드 클립이라 더 중요). |
| `TableHead` / `TableCell` | `numeric` prop 추가 → 우측 정렬 + `tabular-nums`(자릿수 정렬 안정화). 컬럼별 실제 최소 폭은 013A/013B 실사용 시점에 소비처가 `min-w-[Nch]`(두 로케일 중 더 긴 라벨 길이 + 여유 1ch)로 직접 지정한다 — 이 프리미티브는 값을 하드코딩하지 않는다. 헤더가 넘치면 `Table`이 이미 제공하는 `overflow-x-auto` 컨테이너가 가로 스크롤을 처리한다(행이 강제로 줄바꿈되며 높이가 깨지는 것을 방지). |

## 5. 알려진 공백 / 후속 확인

- `@testing-library/react` + `jsdom` 미설치로 위 규약을 실제 DOM 렌더 테스트로 검증하지 못했다(`vitest.config.ts` 주석에 "4팀 UI 착수 시점 도입 예정"으로 이미 명시돼 있던 항목, I-90 관련). 오늘은 `tsc --noEmit` / `lint` / 기존 유닛테스트(1000건) 통과만 확인했다 — 013B 실사용 시 실제 화면에서 두 로케일 오버플로우 여부를 직접 확인할 것.
- 컴포넌트 21종 카탈로그 자체(`MatchCard` W-02, F4-p 차트 W-31 처리)는 SP-2 분할 초안으로 팀장에게 별도 보고했다 — 이 문서와는 독립된 안건이다.
