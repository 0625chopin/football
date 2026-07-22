import Link from "next/link";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

import { ConfigGroupNav } from "./ConfigGroupNav";
import { ConfigCodeTable } from "./ConfigCodeTable";
import { ConfigEditForm } from "./ConfigEditForm";
import { applyConfigOverrides } from "./config-override-store";

/**
 * `/[lang]/admin/config` — Task 021(56~57일차, 5팀), 와이어프레임
 * `docs/wireframe/08-어드민-공통코드-스케줄러.md` Part A(H1~H5) /
 * `docs/wireframe/10-어드민공통코드-폼스펙.md`(위젯 유형 매핑).
 *
 * ## 스코프 — 56일차: 목록 표시 + 편집 폼
 * H1(그룹 목록)·H2(코드 목록)·H3(편집 폼, 값+사유+저장)까지만 만든다. **H3의 범위 검증
 * 인라인 에러·발효 시점 지정, H4(변경 이력 diff)는 57일차 스코프라 이 파일에 없다**
 * (`ConfigEditForm`/`actions.ts` 파일 헤더 참조).
 *
 * ## 그룹 수 — 36이 아니라 38
 * 와이어프레임 작성 시점(4~13일차)엔 카탈로그가 36종이었지만, 14일차·31일차에 각 1종씩
 * 추가되어 `src/lib/config/catalog.ts` 기준 오늘(56일차)은 **38종**이다(`NATIONALITY_WEIGHT`,
 * `MANAGER_STYLE_XG` — 카탈로그 파일 헤더 "37번째/38번째 그룹 추가" 절 참조). "36개 그룹
 * 전량 표시"라는 수락 기준 문구는 그대로 두되, 실제로는 **카탈로그가 반환하는 그룹 수
 * 전량**(오늘 38개)을 표시한다 — 숫자를 하드코딩하지 않고 `groups.length`를 그대로 쓰므로
 * 카탈로그가 다시 늘어나도 이 파일은 고칠 필요가 없다.
 *
 * ## 라우팅 — 쿼리 파라미터로 그룹·코드 선택 (하위 라우트 없음)
 * `?group=<groupCode>&code=<code>`. 모바일(<1024)은 그룹 미선택 시 H1만, 선택 시 H2+H3만
 * 보이는 2단계 네비게이션(와이어프레임 3A-1) — 별도 JS 없이 쿼리 파라미터 유무로 `hidden
 * lg:*` 클래스만 토글한다. 데스크톱(1024+)은 둘 다 보이는 master-detail(3A-2). 이 페이지만
 * `lg`(1024px) 브레이크포인트를 쓰는 이유는 와이어프레임이 이 화면 한정으로 그 값을
 * 명시했기 때문이다(I-184는 `sm`/`xs` 오용을 금지할 뿐, `lg` 자체는 Tailwind 표준값).
 */
export default async function Page(props: PageProps<"/[lang]/admin/config">) {
  const { lang } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;
  const searchParams = (await props.searchParams) ?? {};
  const selectedGroupCode = typeof searchParams.group === "string" ? searchParams.group : undefined;
  const selectedCode = typeof searchParams.code === "string" ? searchParams.code : undefined;

  await bootstrapApp();
  const dataSource = getDataSource();

  const rawGroups = await dataSource.getCommonCodeGroups();
  const groups = [...rawGroups].sort((a, b) => a.sortOrder - b.sortOrder);

  // H1 카드별 "N개 코드" 표시(와이어프레임 H1 비고) — Mock 조회는 순수 인메모리 계산이라
  // 38회 호출도 비용이 없다(실 DB 연결 후 비용이 문제되면 이슈로 보고).
  const codeCounts = await Promise.all(groups.map((group) => dataSource.getCommonCodes(group.groupCode)));
  const groupNavEntries = groups.map((group, index) => ({
    groupCode: group.groupCode,
    groupName: group.groupName,
    applyPolicy: group.applyPolicy,
    relatedFr: group.relatedFr,
    codeCount: codeCounts[index].length,
  }));

  const activeGroup = selectedGroupCode ? groups.find((group) => group.groupCode === selectedGroupCode) : undefined;
  const activeGroupIndex = activeGroup ? groups.indexOf(activeGroup) : -1;
  const rawCodes = activeGroupIndex >= 0 ? codeCounts[activeGroupIndex] : [];
  const codes = applyConfigOverrides(rawCodes);
  const selectedCodeEntry = selectedCode ? codes.find((entry) => entry.code === selectedCode) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t(locale, "admin.config.title")}</h1>
        <p className="text-xs text-muted-foreground">
          {t(locale, "admin.config.group.totalFormat", { count: groups.length })}
        </p>
      </div>

      {activeGroup && (
        <Link
          href={`/${lang}/admin/config`}
          className="text-sm text-muted-foreground underline underline-offset-2 lg:hidden"
        >
          {t(locale, "admin.config.group.backToList")}
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[28%_1fr] lg:items-start">
        <ConfigGroupNav
          locale={locale}
          lang={lang}
          groups={groupNavEntries}
          selectedGroupCode={activeGroup?.groupCode}
          className={cn(activeGroup && "hidden lg:flex")}
        />

        <div className={cn("flex flex-col gap-6", !activeGroup && "hidden lg:flex")}>
          {activeGroup ? (
            <>
              <ConfigCodeTable
                locale={locale}
                lang={lang}
                groupCode={activeGroup.groupCode}
                groupName={activeGroup.groupName}
                codes={codes}
                selectedCode={selectedCodeEntry?.code}
              />
              {selectedCodeEntry ? (
                <ConfigEditForm
                  key={selectedCodeEntry.id}
                  locale={locale}
                  lang={lang}
                  groupCode={activeGroup.groupCode}
                  groupValueType={activeGroup.valueType}
                  applyPolicy={activeGroup.applyPolicy}
                  code={selectedCodeEntry}
                />
              ) : (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t(locale, "admin.config.edit.selectPrompt")}
                </p>
              )}
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t(locale, "admin.config.code.selectPrompt")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
