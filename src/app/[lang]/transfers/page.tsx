import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { Card, CardContent } from "@/components/ui/card";
import { NewsItem } from "@/components/composite/NewsItem";
import type { NewsItemData } from "@/components/composite/NewsItem";
import type { NewsFeedItem, NewsFeedItemType } from "@/types";

/** 피드에 노출할 최대 건수. 무한정 렌더하지 않는다(순위표 `RANK_LIMIT`과 동일 판단). */
const TRANSFER_FEED_LIMIT = 30;

/**
 * `/transfers`가 다루는 뉴스 유형 6종(와이어프레임 지시: 영입·임대·은퇴·유소년·감독교체·
 * 스폰서 부도). `NewsFeedItemType`(E-26, `src/types/enums.ts`) 10종 중 수상(AWARD)·
 * 부상(INJURY)·마일스톤(MILESTONE)·제재(SANCTION)는 다른 화면(시상식/선수상세/아카이브)
 * 몫이라 이 화면 스코프 밖 — 필터 체크박스에도, 조회 파라미터에도 넣지 않는다.
 */
const TRANSFER_NEWS_TYPES: readonly NewsFeedItemType[] = [
  "TRANSFER",
  "LOAN",
  "RETIREMENT",
  "YOUTH_DEBUT",
  "MANAGER_CHANGE",
  "SPONSOR_BANKRUPT",
];

/**
 * 체크박스 GET 폼(`name="type"`, 다중 값)으로 넘어온 `searchParams.type`을 유효한 유형만
 * 남겨 해석한다. 파라미터가 없으면(최초 진입) 6종 전체, 체크를 전부 해제해 빈 배열이
 * 되면(사용자가 실수로 전부 해제) 빈 목록을 보여주는 대신 전체로 되돌린다 — `getNewsFeed`는
 * `types: []`를 "전 타입 없음"과 "필터 없음(전체)"으로 구분하는 계약이 아니므로 화면
 * 쪽에서 방어한다.
 */
function resolveSelectedTypes(raw: string | string[] | undefined): readonly NewsFeedItemType[] {
  if (raw === undefined) return TRANSFER_NEWS_TYPES;
  const requested = new Set(Array.isArray(raw) ? raw : [raw]);
  const selected = TRANSFER_NEWS_TYPES.filter((type) => requested.has(type));
  return selected.length > 0 ? selected : TRANSFER_NEWS_TYPES;
}

/**
 * `NewsFeedItem`(E-26) → `NewsItemData`(`NewsItem` 표시용 로컬 타입) 변환. 홈 페이지
 * (`src/app/[lang]/page.tsx`)의 `buildNewsItemData`와 동일한 매핑이다 — `headline`/`body`는
 * 데이터 계층이 이미 템플릿 + 고유명사 변수 주입을 마친 표시 문자열이라(D-17/D-18,
 * `src/lib/mock/progress.ts` 생성 로직 참조) 이 화면이 다시 조립하지 않고 그대로 옮긴다
 * (뉴스 문구 하드코딩 0 — 이 파일에 이적 문구 리터럴이 없다). `category`도 원시 enum 값
 * 그대로 넘기고 번역은 `NewsItem` 컴포넌트 자신이 `locale` prop으로 한다.
 */
function buildNewsItemData(item: NewsFeedItem): NewsItemData {
  return {
    id: item.id,
    title: item.headline,
    summary: item.body,
    publishedAt: item.occurredAt,
    category: item.type,
  };
}

/**
 * `/[lang]/transfers` 이적/뉴스 피드 — Task 019(40일차, 4팀).
 *
 * 영입·임대·은퇴·유소년 데뷔·감독 교체·스폰서 부도 소식을 `getNewsFeed`(1팀 `DataSource`,
 * FR-UI-011)로 최신순 조회해 `NewsItem`(5팀 복합 컴포넌트, Task 013B)으로 나열한다.
 * `/stats`(39일차, 같은 팀)가 세운 패턴을 그대로 따른다 — 상호작용이 필터 하나뿐이라
 * `<form method="get">` + 네이티브 입력만으로 처리하고, 클라이언트 컴포넌트 경계를
 * 새로 열지 않는다.
 *
 * ## 타입 필터 — 체크박스 다중값, 유효 집합은 화면이 6종으로 좁힌다
 * `NewsFeedItemType`은 10종이지만 이 화면 스코프는 6종뿐이다(위 `TRANSFER_NEWS_TYPES`
 * 주석 참조). 체크박스 라벨은 `enums.newsFeedItemType.*`(3팀 소유, `NewsItem`이 배지에
 * 쓰는 것과 동일 카탈로그)을 그대로 재사용한다 — 유형 이름을 이 파일에 다시 문자열로
 * 선언하지 않는다.
 *
 * ## 빈 목록 — 페이지 전용 빈 상태를 새로 만들지 않는다
 * 홈 페이지 A4 섹션과 동일하게 `NewsItem` 자신의 `{status: "empty"}`를 그대로 쓴다
 * (`match.news.empty` 키, `NewsItem` 헤더 주석 참조) — 목록류 빈 상태를 화면마다 별도
 * 컴포넌트로 다시 만들지 않는다는 원칙을 따른다.
 *
 * ## 뉴스 문구 — 템플릿 + 고유명사 변수 주입은 데이터 계층 책임(D-17/D-18)
 * `headline`/`body`는 `NewsFeedItem`(`src/types/ops.ts`) 정의부터 "고유명사·구체 수치가
 * 섞인 표시 텍스트 — 번역 대상 아님"으로 명시돼 있다. 이 화면은 그 값을 그대로 옮기기만
 * 하고 별도로 조립하지 않는다 — 수락 기준("뉴스 문구 하드코딩 0")은 화면이 이적 관련
 * 리터럴 문자열을 전혀 갖지 않는 것으로 충족한다.
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (`searchParams`는 Promise, 값은 `string | string[] | undefined` — 체크박스 다중값 대응)
 */
export default async function Page(props: PageProps<"/[lang]/transfers">) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const selectedTypes = resolveSelectedTypes(searchParams.type);

  const newsFeed = await dataSource.getNewsFeed({
    types: selectedTypes,
    limit: TRANSFER_FEED_LIMIT,
  });

  const newsItems = newsFeed.map(buildNewsItemData);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="eyebrow text-lg text-foreground">{t(locale, "transfers.feed.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, "transfers.feed.caption")}</p>
      </div>

      <Card>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="eyebrow text-muted-foreground">
                {t(locale, "transfers.filters.typeLegend")}
              </legend>
              <div className="flex flex-wrap gap-3">
                {TRANSFER_NEWS_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="type"
                      value={type}
                      defaultChecked={selectedTypes.includes(type)}
                      className="size-4"
                    />
                    {t(locale, `enums.newsFeedItemType.${type}` as TranslationKey)}
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              {t(locale, "transfers.filters.apply")}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {newsItems.length === 0 ? (
            <NewsItem locale={locale} state={{ status: "empty" }} />
          ) : (
            <div className="flex flex-col">
              {newsItems.map((data) => (
                <NewsItem key={data.id} locale={locale} state={{ status: "ready", data }} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
