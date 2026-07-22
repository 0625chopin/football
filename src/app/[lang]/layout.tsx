import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Geist, Geist_Mono, Gothic_A1 } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SeasonPhase } from "@/types";
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "@/i18n/locales";
import { TranslationProvider } from "@/i18n/provider";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { NavLink } from "@/components/ui/NavLink";
import { bootstrapApp } from "@/lib/data/bootstrap";
import "../globals.css";

/**
 * Task 013C(36일차) — 타입 페이스 3역할.
 *
 * | 역할 | 라틴 | 한글 | 쓰는 곳 |
 * |---|---|---|---|
 * | 본문 | Geist | Gothic A1 | 기본 텍스트 |
 * | 디스플레이 | Archivo | Gothic A1 | h1~h3 · `eyebrow` · `scoreboard` |
 * | 데이터 | Geist Mono | (폴백) | ID·코드 등 |
 *
 * 한글은 라틴 페이스에 글리프가 없어 지금까지 OS 기본 폰트(윈도우=맑은 고딕,
 * 리눅스=Noto)로 떨어졌다 — 기본 로케일이 ko인데 플랫폼마다 다른 글자가 나오는 상태였다.
 * Gothic A1을 스택 **뒤쪽**에 두면 라틴은 Geist/Archivo가, 한글은 Gothic A1이 맡아
 * 두 언어가 같은 무게감으로 붙는다(unicode-range 분할 덕에 en 사용자는 한글 청크를
 * 내려받지 않는다).
 *
 * Archivo는 `wdth` 축을 가진 가변 폰트라 `font-stretch`로 폭을 조절할 수 있다 —
 * `eyebrow`(75%)·`scoreboard`(80%)가 이 축을 쓴다(`globals.css` 유틸리티 참조).
 * 가족을 하나만 쓰면서 폭으로 목소리를 나누는 것이 이 디렉션의 타이포 규칙이다.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// `subsets`를 지정하지 않는다 — next/font의 Google 폰트 메타데이터에 Gothic A1의 한글
// 서브셋이 이름으로 등재돼 있지 않아(`latin`/`cyrillic`/`greek`/`vietnamese`만 노출)
// `subsets: ["korean"]`은 빌드 에러가 난다. 서브셋을 생략하면 Google이 내려주는 CSS
// 전체(한글 unicode-range 청크 포함)를 그대로 쓰며, 그 대신 `preload: false`가 필수다
// (프리로드할 서브셋을 특정할 수 없으므로). 한글 청크는 실제로 한글이 그려질 때만
// 내려받으므로 en 사용자에게는 비용이 없다.
//
// 38일차 — CLS 회귀 조사 기록(팀장 실측 CLS 0.1735, 5팀 Task 015 수락 기준 CLS≤0.1,
// ko 320px 한정 — en은 한글 청크를 아예 받지 않아 0). `display`는 이 조사 이후에도
// **지정하지 않는다**(기존 그대로 next/font 기본값 `"swap"`) — 아래가 그 근거다.
//
// **시도 1 — `display: "optional"`.** 스펙상 "블록 구간(~100ms) 안에 폰트가 없으면
// 그 렌더에서는 폴백으로 확정하고 이후 다시 스왑하지 않는다"이지만, 실측 결과 개선폭이
// 오차 수준이었다(ko CLS 0.1642, 원래 0.1735 대비 유의미한 차이 아님 — Playwright
// 재측정 3회 모두 0.1642로 동일 재현). 원인을 원본 SSR HTML까지 내려가 확인한 결과,
// 이 dev 서버는 next/font가 생성한 CSS(Gothic A1 `@font-face` 298개 포함)를 인라인
// `<style>`이 아니라 **별도 `<link rel="stylesheet">`로 외부화**해서 내려준다(실측:
// SSR 원문에 `<style>` 0개, `Gothic A1`/`@font-face` 텍스트 0개, 팀장이 직접 재현해
// 사실 확인). `display` 값은 이미 CSSOM에 존재하는 `@font-face` 규칙에 대해서만
// 적용되는데, 이 규칙 자체가 첫 페인트 이후 늦게 합류하는 구조라 타이밍 옵션만으로는
// 통제가 안 된다 — **font-display로 막을 수 없는 종류의 시프트**라는 뜻이다.
// 프로덕션 빌드는 CSS 인라인 방식이 달라 재현되지 않을 가능성이 있으나, `npm run
// build`가 WSL EPERM으로 판정 수단이 아니라(CLAUDE.md) 이 저장소에서 검증할 방법이
// 없다 — 빌드 가능한 환경이 생기면 재검증 대상(팀장 판정: dev 전용 아티팩트로 취급,
// 오늘은 (a) 채택 — 프로덕션 검증 이월).
//
// **시도 2 — `adjustFontFallback: false`**(폴백 세로 메트릭 보정 끔): CLS 0.371로
// 오히려 악화 — 되돌림.
//
// **시도 3 — `weight: ["400"]`**(298→100 파일로 축소, 네트워크 동시성 가설 검증):
// CLS 0.166으로 개선 없음 — 원인이 파일 개수가 아니라는 근거만 남기고 3종 원복.
//
// 세 시도 모두 순이득이 없거나 손해였고, `optional`을 유지하려면 "첫 방문 시 ~100ms
// 안에 폰트가 안 오면 그 방문 내내 한글이 폴백 글꼴로 남는다"는 확실한 대가를 "프로덕션
// 에선 나아질 것"이라는 미검증 가설과 맞바꿔야 한다 — 한국어가 주 로케일인 제품에서
// 검증 불가능한 가설로 사용자 눈에 보이는 타이포그래피를 바꾸지 않는다(팀장 판정).
// `preload: true`로 되돌리는 방향은 여전히 금지(서브셋 미지정 시 빌드 에러 재발).
const gothicA1 = Gothic_A1({
  variable: "--font-gothic-a1",
  weight: ["400", "500", "700"],
  preload: false,
});

/**
 * **34일차(Task 014) 팀장 검증 후속 갱신** — 이전엔 위 자리에 정적 `metadata` 객체를
 * 두고 `description`에 한글을 하드코딩했다. `/sample`이 오늘 처음 21종을 렌더하면서
 * `/en` 실응답을 직접 확인하는 일이 생겼고, 그 과정에서 `<meta name="description">`에
 * 로케일과 무관하게 한글이 그대로 나가는 것이 드러났다(D-18 위반 — 이 파일은
 * `params.lang`을 읽을 수 있는 자리라 애초에 분기 가능했다, 60~65행 옛 주석이 "Task 011
 * 소관으로 이월"이라 적어 둔 이월 자체가 결함이었다).
 *
 * `generateMetadata`로 바꿔 `params.lang`을 읽고 `common.app.description`(신설 키)을
 * 로케일별로 조회한다. `title`(`"football4"`)은 고유명사라 로케일 분기가 필요 없지만
 * (D-17), 값의 단일 소스를 `common.app.name`으로 통일해 두 곳에 같은 문자열을 따로
 * 하드코딩하지 않는다.
 */
export async function generateMetadata(props: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await props.params;
  const locale: SupportedLocale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  return {
    title: t(locale, "common.app.name"),
    description: t(locale, "common.app.description"),
  };
}

/**
 * `/[lang]` 루트 레이아웃 — Task 005(10일차 신설), **10일차 2차 검증(팀장 지적)으로
 * 같은 날 구조 변경**.
 *
 * ## 왜 이 파일이 `<html>`/`<body>`를 갖는가 (기존 `src/app/layout.tsx`를 흡수)
 * Next.js 공식 i18n 가이드(`node_modules/next/dist/docs/01-app/02-guides/
 * internationalization.md` "Static Rendering" 절)가 제시하는 정석 구조를 그대로 따른다.
 * 로케일 세그먼트 레이아웃이 `params.lang`을 읽어 `<html lang={lang}>`을 동적으로 설정하려면
 * 그 레이아웃 자신이 **루트 레이아웃**이어야 한다 — 레이아웃은 자기 세그먼트보다 **아래**의
 * 동적 파라미터에 접근할 수 없다(`layout.md` "params" 절: "the root segment down to that
 * layout", 즉 위→아래 방향으로만 흐른다).
 *
 * 오늘 오전 처음 이 세그먼트를 도입했을 때는 진짜 최상단 `src/app/layout.tsx`(`[lang]`보다
 * 위)가 `<html lang="en">`을 하드코딩한 채 `<body>{children}</body>`만 하고 이 파일은
 * children 패스스루만 했다. 이 구조에서는 최상단 레이아웃이 `[lang]` 세그먼트 값을 **절대
 * 읽을 수 없어** 문서 언어가 항상 `en`으로 고정되는 결함이 있었다(D-18 기본 로케일은 ko라
 * `/ko/*` 접근 시에도 `lang="en"`이 선언되는 a11y/SEO 결함 — 10일차 2차 검증에서 발견).
 *
 * ## 조치
 * 종전 `src/app/layout.tsx`의 내용(폰트·`globals.css`·기본 `metadata`)을 전부 이 파일로
 * 옮기고 원본 파일은 삭제했다. `app/` 최상단엔 이제 `[lang]` 외 다른 세그먼트가 없으므로
 * "루트 레이아웃을 생략하면 하위 디렉터리 레이아웃이 그 자리의 루트 레이아웃이 된다"
 * (`layout.md` "Root Layout" 절 — route groups 예시와 동일 원리)는 문서 규칙에 따라 이
 * 파일이 곧 루트 레이아웃이 된다. 헤더/사이드내비/푸터(FR-UI-020)는 여전히 12일차 몫이라
 * 이번엔 추가하지 않는다 — `<body>`는 children 렌더 외 다른 마크업을 아직 갖지 않는다.
 *
 * `lang` 값 자체은 "감지"가 아니라 이미 방문된 URL 세그먼트(`/ko/...`, `/en/...`)를 그대로
 * 읽는 것이므로, `proxy.ts`(로케일 감지·리다이렉트, Task 011 소관) 없이도 정확하다 —
 * 9일차 §7.4 결정("`proxy.ts`는 만들지 않는다")과 충돌하지 않는다.
 *
 * ## `metadata` 변경
 * create-next-app 기본값(`"Create Next App"` / `"Generated by create next app"`)은 이
 * 프로젝트와 무관해 최소한으로만 교체했다 — 실제 사용자向 UI 카피를 새로 만들지 않고
 * 개발 상태를 나타내는 최소한의 기술 설명만 남겨 D-18(번역 카탈로그 경유 원칙) 범위를
 * 넓히지 않는다.
 *
 * **34일차 갱신**: "로케일별 메타데이터 지역화는 Task 011 소관으로 이월한다"고 여기
 * 적어 뒀던 것 자체가 결함이었다 — 이 레이아웃이 이미 `params.lang`을 읽는 자리인데도
 * 정적 `metadata` 객체에 한글 `description`을 하드코딩해 `/en`에도 그대로 노출됐다
 * (Task 014 쇼케이스가 처음으로 `/en` 실응답을 눈으로 확인하면서 팀장이 발견). 정적
 * `metadata` export를 `generateMetadata`로 교체해 `common.app.description`(신설 키)을
 * 로케일별로 조회하도록 고쳤다 — 아래 함수 정의 참조.
 *
 * 참조: `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`,
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`
 */
export async function generateStaticParams() {
  return [{ lang: "ko" }, { lang: "en" }];
}

/**
 * 12일차(2026-08-05) Task 005 산출물 — 전역 레이아웃 골격(FR-UI-020).
 *
 * `docs/team-schedule/04-UI기반i18n팀.md` 12일차 표는 산출물을 `src/app/layout.tsx`로
 * 표기하지만, 10일차 결정(위 JSDoc)에 따라 최상단 `layout.tsx`는 만들지 않으므로 헤더/
 * 사이드 내비/푸터를 이 루트 레이아웃(`[lang]/layout.tsx`)의 `<body>`에 둔다.
 *
 * `src/components/**`는 아직 없다(4팀 23일차 이후 생성 — `docs/team-schedule/
 * 04-UI기반i18n팀.md` 소유 경로 절). 그래서 `SiteHeader`/`SideNav`/`SiteFooter`는 별도
 * 파일로 분리하지 않고 이 파일의 로컬 함수로 둔다 — 013A(28~33일차)에서 실제 도메인
 * 컴포넌트가 생기면 이 자리들을 교체한다.
 *
 * 헤더의 4개 자리(리그 스위처·시즌/페이즈 인디케이터·다음 킥오프 타이머·로케일 스위처)는
 * 아직 데이터소스도 i18n도 없어 전부 비활성 placeholder다. 실제 구현 시점: 리그 스위처·
 * 킥오프 타이머는 013A/019~020 화면 연결(28일차 이후), 로케일 스위처는 011의 22일차
 * (`LocaleSwitcher.tsx`), 여기 하드코딩된 한국어 라벨도 그때 번역 키로 교체된다.
 *
 * **22일차 갱신**: 위 문단이 예고한 교체를 실제로 했다. 로케일 스위처는 실컴포넌트로
 * 바뀌었고(데이터소스가 필요 없는 유일한 자리라 오늘 바로 활성화), 나머지 3개 자리는
 * 여전히 `disabled` placeholder지만 하드코딩 라벨은 전부 `common.ts` 번역 키로
 * 교체했다(D-18 경고 해소 — 데이터소스 연결과 라벨의 i18n 경유는 별개 축이다). 이 파일
 * 전체를 `TranslationProvider`로 감싸 SiteHeader/SideNav/SiteFooter가 `useTranslation()`
 * 없이도(전부 로컬 함수라 서버 컴포넌트로 남아 있다) `t(lang, key)`를 직접 호출한다 —
 * Provider는 013A 이후 생길 클라이언트 리프 컴포넌트(`LocaleSwitcher`가 이미 그 예)를
 * 위한 것이지 이 파일 자신에게 필요한 건 아니지만, 그 컴포넌트들이 트리에 들어올 자리에
 * 미리 감싸 둔다.
 *
 * **22일차 — `bootstrapApp()` 배선(1팀 인계, I-72/13일차 지시 이월분)**: `getDataSource()`/
 * `loadConstants()`를 처음 쓰기 전 반드시 끝나야 하는 앱 부트스트랩(공통코드 폴백 등록 +
 * 어댑터 등록)의 유일한 호출처가 이 루트 레이아웃이다(`src/lib/data/bootstrap.ts` "호출
 * 시점" 절). `bootstrapDataSource()`를 따로 부르지 않는다 — `bootstrapApp()` 하나가 순서를
 * 책임진다(1팀 절충 설계). 이미 실행됐으면 아무 것도 하지 않는 멱등 함수라 매 요청 호출
 * 비용이 없다.
 */
export default async function RootLayout(props: LayoutProps<"/[lang]">) {
  await bootstrapApp();

  const { lang } = await props.params;

  // 15일차 2차 수정(팀장 검증) — `proxy.ts`의 matcher는 일부 경로(`_next`/`api`/확장자
  // 있는 파일)를 의도적으로 매치하지 않고, 그런 경로는 정규화 없이 라우터에 그대로
  // 도달해 `[lang]`에 임의 문자열이 바인딩될 수 있다(`/nonexistent.txt` 등). 프록시가
  // 무엇을 매치하든/안 하든 무효 lang이 렌더되지 않도록 여기서 2중으로 검증한다.
  //
  // `notFound()`는 이 함수(루트 레이아웃 자신) 최상단에서 직접 던지지 않는다 — 그러면
  // `<html>`을 반환하기 전에 렌더가 통째로 중단돼, 그 세그먼트를 감싸줄 상위 레이아웃이
  // 없는 루트에서는 Next가 `[lang]/not-found.tsx`도 `global-not-found`도 거치지 못하고
  // 내부 최소 폴백(`__next_error__`, lang 속성 없음)으로 떨어진다(직접 실측 확인). 대신
  // `<html lang>`엔 항상 유효한 값(무효 시 기본 로케일)을 쓰고, `notFound()` 호출은
  // `{children}` 자리에 배치한 `LocaleGate`로 옮겨 — 그 슬롯을 감싸는 세그먼트 경계가
  // `[lang]/not-found.tsx`를 정상적으로 띄우게 한다.
  const htmlLang = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  return (
    <html
      lang={htmlLang}
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${gothicA1.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TranslationProvider locale={htmlLang}>
          {/* `flex-1`이 필요하다 — `min-h-full`(=부모 높이의 100%)만으로는 부모(`body`)의
              높이가 auto라 백분율이 해석되지 않아, 내용이 짧은 화면에서 푸터가 화면 하단이
              아니라 본문 바로 밑에 붙는다(36일차 모바일 검증에서 확인). 이 요소가 body의
              남은 높이를 차지해야 푸터의 `mt-auto`가 동작한다. */}
          <div className="flex min-h-full flex-1 flex-col">
            <SiteHeader lang={htmlLang} />
            <MobileNav lang={htmlLang} />
            {/* `items-start` + 사이드바 `sticky`로 내비가 본문 스크롤을 따라온다.
                `min-w-0`은 본문 안의 넓은 표·그리드가 사이드바를 밀어내지 못하게 막는다. */}
            <div className="flex flex-1">
              <SideNav lang={htmlLang} />
              <main className="min-w-0 flex-1">
                <LocaleGate lang={lang}>{props.children}</LocaleGate>
              </main>
            </div>
            <SiteFooter lang={htmlLang} />
          </div>
        </TranslationProvider>
      </body>
    </html>
  );
}

function LocaleGate({ lang, children }: { lang: string; children: ReactNode }) {
  if (!isSupportedLocale(lang)) {
    notFound();
  }
  return <>{children}</>;
}

// mock — 시즌/페이즈 인디케이터 자리. 실제 값은 DataSource 연결(28일차 이후) 시 교체.
const mockSeasonPhase: SeasonPhase = "REGULAR";

/**
 * 헤더의 비활성 자리(리그 스위처·시즌 페이즈·다음 킥오프)를 표시하는 칩.
 *
 * 36일차 판단: 이 세 자리는 여전히 데이터소스가 없어 placeholder지만, 종전처럼 본문과
 * 같은 실선 테두리를 두르면 "누를 수 있는 컨트롤"로 읽힌다. 점선 테두리 + 낮은 명도로
 * "아직 아님"을 시각적으로도 말하게 한다(라벨 문자열의 "(준비 중)"과 이중 전달).
 */
function HeaderSlot({ children, as = "span" }: { children: ReactNode; as?: "span" | "button" }) {
  const className =
    "hidden items-center rounded-md border border-dashed border-board-line px-2.5 py-1 text-xs text-board-muted lg:inline-flex";

  if (as === "button") {
    return (
      <button type="button" disabled className={className}>
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}

function SiteHeader({ lang }: { lang: SupportedLocale }) {
  // `enums.seasonPhase.${SeasonPhase}` 형태의 캐스트 — `EnumTranslationCatalog<SeasonPhase>`
  // (enums.ts)가 SeasonPhase 전 멤버 커버를 tsc로 강제하므로 이 형태의 경로는 항상
  // 존재한다. 템플릿 리터럴 표현식은 기본적으로 `string`으로 넓혀져 `TranslationKey`
  // 유니온과 바로 맞지 않아 단언이 필요하다 — mock 값 하나짜리라 여기 국소적으로만 쓴다
  // (일반화된 enum→키 헬퍼는 013A 도메인 컴포넌트가 실제로 enum을 소비하기 시작할 때 판단).
  const seasonPhaseKey = `enums.seasonPhase.${mockSeasonPhase}` as TranslationKey;

  return (
    // 36일차 — 헤더는 중계 표면(`board`)이다. 라이트 모드에서도 어둡다(globals.css의
    // `--board-*` 주석 참조). `sticky`로 스크롤 중에도 세계 상태가 화면에 남는다.
    <header className="board pitch-stripes sticky top-0 z-40 border-b">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link
          href={`/${lang}`}
          className="flex items-center gap-2.5 rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {/* 터치라인 — 활성 표시에 쓰는 것과 같은 3px 초크 바. 워드마크 앞에 한 번 더
              놓아 이 장치가 이 제품의 구조 기호임을 처음부터 알린다. */}
          <span aria-hidden className="h-5 w-[3px] rounded-full bg-primary" />
          <span className="eyebrow text-[0.95rem] tracking-[0.2em]">
            {t(lang, "common.app.name")}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <HeaderSlot as="button">{t(lang, "common.header.leagueSwitcherPlaceholder")}</HeaderSlot>
          <HeaderSlot>
            {t(lang, "common.header.seasonPhaseLabel", { phase: t(lang, seasonPhaseKey) })}
          </HeaderSlot>
          <HeaderSlot>{t(lang, "common.header.nextKickoffPlaceholder")}</HeaderSlot>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}

/**
 * 11일차까지 생성된 실제 라우트만 연결한다. admin/bet/my는 2차 대비 예약(플래그 비활성)이라 제외.
 *
 * 36일차 — 평평한 11개 목록을 성격별 3그룹으로 묶었다. 그룹 머리말은 장식이 아니라
 * 라우트가 무엇에 대한 것인지(대회 / 구성원 / 기록)를 말한다. 홈은 어느 그룹에도 속하지
 * 않는 진입점이라 그룹 밖 맨 위에 단독으로 둔다.
 */
interface NavItem {
  readonly labelKey: TranslationKey;
  readonly path: string;
  /**
   * 36일차(I-186 확정) — **목록(인덱스) 화면이 아직 없어 404가 나는 라우트**를 표시한다.
   *
   * `leagues`/`matches`/`players`/`teams`/`playoffs` 다섯은 `leagues/[leagueId]`처럼 동적
   * 자식만 있고 `page.tsx`가 없다. 12일차에 `NAV_ITEMS`를 만들 때부터 그랬으나 34일차까지
   * 홈 외 화면을 실제로 열어 본 적이 없어 드러나지 않았다(36일차 Playwright 검증에서 발견).
   *
   * 화면 신설은 Task 016~021 스코프라 여기서 만들지 않는다(임의 생성 금지 규약). 대신
   * **헤더의 placeholder 3종과 같은 관례**로 비활성 표시한다 — 감추면 제품의 전체 지도가
   * 보이지 않고, 그대로 두면 11개 중 5개가 앱 밖으로 튕겨 낸다. 해당 Task가 화면을 채우면
   * 이 플래그만 지운다.
   */
  readonly pending?: true;
}

const NAV_GROUPS: {
  readonly sectionKey: TranslationKey;
  readonly items: readonly NavItem[];
}[] = [
  {
    sectionKey: "common.nav.sectionCompetition",
    items: [
      // 44일차(I-223) — `leagues/page.tsx` 신설로 인덱스가 생겨 `pending`을 뗐다.
      // 50일차(I-223, 사용자 지시) — `players/page.tsx` 신설로 선수도 뗐다.
      // 50일차(I-223) — Task 048 인덱스 신설로 playoffs도 `pending` 해제.
      // 남은 1종(matches)은 여전히 인덱스가 없어 그대로 둔다(Task 047, 61일차).
      { labelKey: "common.nav.leagues", path: "leagues" },
      { labelKey: "common.nav.matches", path: "matches", pending: true },
      { labelKey: "common.nav.playoffs", path: "playoffs" },
      { labelKey: "common.nav.cup", path: "cup" },
    ],
  },
  {
    sectionKey: "common.nav.sectionSquad",
    items: [
      // 60일차(I-223) — Task 046 인덱스 신설로 teams도 `pending` 해제.
      { labelKey: "common.nav.teams", path: "teams" },
      { labelKey: "common.nav.players", path: "players" },
      { labelKey: "common.nav.transfers", path: "transfers" },
    ],
  },
  {
    sectionKey: "common.nav.sectionRecords",
    items: [
      { labelKey: "common.nav.stats", path: "stats" },
      { labelKey: "common.nav.awards", path: "awards" },
      { labelKey: "common.nav.archive", path: "archive" },
      { labelKey: "common.nav.sponsors", path: "sponsors" },
    ],
  },
];

/**
 * 목록 화면이 아직 없는 내비 항목. 링크가 아니므로 `<a>`로 내지 않는다 — 누를 수 없는 것을
 * 링크로 두면 키보드 사용자가 탭으로 도달한 뒤 아무 일도 일어나지 않는다.
 *
 * 상태는 세 경로로 함께 전달한다(NFR-A11Y-002 — 흐린 색 단독 금지):
 * ① 낮은 명도 ② `aria-disabled` ③ 스크린 리더 전용 "(준비 중)" 접미. 시각 사용자에게는
 * 흐린 명도 + 커서 변화가 신호이고, 그 신호를 못 받는 사용자에게는 ③이 같은 말을 한다.
 */
function PendingNavItem({
  lang,
  labelKey,
  orientation = "vertical",
}: {
  lang: SupportedLocale;
  labelKey: TranslationKey;
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <span
      aria-disabled="true"
      title={t(lang, "common.action.comingSoon")}
      className={
        orientation === "horizontal"
          ? "block shrink-0 cursor-not-allowed px-3 py-3 text-sm whitespace-nowrap text-sidebar-foreground/30"
          : "block cursor-not-allowed py-1.5 pr-2 pl-3.5 text-sm text-sidebar-foreground/30"
      }
    >
      {t(lang, labelKey)}
      <span className="sr-only"> ({t(lang, "common.action.comingSoon")})</span>
    </span>
  );
}

/**
 * 모바일 가로 내비 레일 — `md`(768px) 미만에서 `SideNav`를 대신한다.
 *
 * 36일차 1차 작업에서 좁은 폭의 사이드바를 감추기만 하고 대체 내비를 두지 않아, 모바일에서
 * 헤더 워드마크(홈) 외에는 어디로도 갈 수 없었다 — 그 구멍을 메운다.
 *
 * ## 왜 서랍(drawer)이 아니라 가로 레일인가
 * 서랍은 열기 전까지 무엇이 있는지 감추므로 상태 표시(지금 어디인가)를 못 한다. 이 제품은
 * 스코어 서비스처럼 화면을 자주 오가며 훑는 성격이라, 항목이 늘 보이고 현재 위치가 밑줄로
 * 드러나는 레일이 맞다. 열고 닫는 상태도 필요 없어 클라이언트 상태가 늘지 않는다.
 *
 * 그룹(대회/구성원/기록)은 가로로 머리말을 세울 자리가 없어 **얇은 구분선**으로만 남긴다 —
 * 순서는 사이드바와 동일하므로 묶음 자체는 보존된다.
 *
 * 알려진 한계: 활성 항목이 레일 오른쪽 끝에 있으면 스크롤해야 보인다(자동 스크롤은
 * 클라이언트 스크립트가 필요해 이번 스코프에서 제외).
 */
function MobileNav({ lang }: { lang: SupportedLocale }) {
  return (
    <nav
      aria-label={t(lang, "common.nav.primaryLabel")}
      className="sticky top-14 z-30 overflow-x-auto border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden"
    >
      <ul className="flex w-max items-stretch px-1">
        <li>
          <NavLink href={`/${lang}`} exact orientation="horizontal">
            {t(lang, "common.nav.home")}
          </NavLink>
        </li>
        {NAV_GROUPS.flatMap((group) => [
          <li key={`${group.sectionKey}-divider`} aria-hidden className="my-2.5 w-px bg-sidebar-border" />,
          ...group.items.map((item) => (
            <li key={item.path}>
              {item.pending ? (
                <PendingNavItem lang={lang} labelKey={item.labelKey} orientation="horizontal" />
              ) : (
                <NavLink href={`/${lang}/${item.path}`} orientation="horizontal">
                  {t(lang, item.labelKey)}
                </NavLink>
              )}
            </li>
          )),
        ])}
      </ul>
    </nav>
  );
}

function SideNav({ lang }: { lang: SupportedLocale }) {
  return (
    // 종전엔 320px 뷰포트에서도 192px 사이드바가 그대로 남아 본문이 128px로 찌그러졌다
    // (NFR-RS-001 위반). `md`(768px) 미만에서는 감추고, 그 아래에서는 본문 상단의
    // 가로 스크롤 내비(각 화면 몫)로 대체한다 — 헤더 워드마크가 홈으로 가는 경로를
    // 유지하므로 모바일에서 내비게이션이 완전히 사라지지는 않는다.
    // 바깥 래퍼가 열 전체 높이를 채우고(부모 flex의 기본 stretch), 안쪽 `nav`가 그 안에서
    // sticky로 붙는다. 래퍼 없이 `nav` 자신에게 고정 높이 + sticky를 주면 페이지가 뷰포트보다
    // 길 때 사이드바 아래로 본문 배경이 그대로 드러난다(36일차 1차 렌더에서 확인).
    <div className="hidden w-56 shrink-0 bg-sidebar text-sidebar-foreground md:block">
      <nav
        aria-label={t(lang, "common.nav.primaryLabel")}
        className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto px-3 py-5"
      >
        <ul className="flex flex-col gap-0.5">
          <li>
            <NavLink href={`/${lang}`} exact>
              {t(lang, "common.nav.home")}
            </NavLink>
          </li>
        </ul>

        {NAV_GROUPS.map((group) => (
          <div key={group.sectionKey} className="mt-6">
            <h2 className="eyebrow px-3.5 pb-2 text-sidebar-foreground/45">
              {t(lang, group.sectionKey)}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  {item.pending ? (
                    <PendingNavItem lang={lang} labelKey={item.labelKey} />
                  ) : (
                    <NavLink href={`/${lang}/${item.path}`}>{t(lang, item.labelKey)}</NavLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function SiteFooter({ lang }: { lang: SupportedLocale }) {
  return (
    <footer className="board mt-auto border-t">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span aria-hidden className="h-3.5 w-[3px] rounded-full bg-primary/70" />
        <span className="eyebrow text-board-muted">{t(lang, "common.footer.devStatus")}</span>
      </div>
    </footer>
  );
}
