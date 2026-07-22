import Link from "next/link";
import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

import { ConfigGroupNav } from "./ConfigGroupNav";
import { ConfigCodeTable } from "./ConfigCodeTable";
import { ConfigEditForm } from "./ConfigEditForm";
import { ConfigHistoryDiff } from "./ConfigHistoryDiff";
import { applyConfigOverrides } from "./config-override-store";
import { mergeConfigHistory } from "./config-history-store";
import { isAdminConsoleEnabled } from "../console-flag";
import { fetchCommonCodeHistoryForAdminConsole } from "../service-role-audit";

/**
 * `/[lang]/admin/config` — Task 021(56~57일차, 5팀), 와이어프레임
 * `docs/wireframe/08-어드민-공통코드-스케줄러.md` Part A(H1~H5) /
 * `docs/wireframe/10-어드민공통코드-폼스펙.md`(위젯 유형 매핑).
 *
 * ## 스코프 — 57일차: 범위 검증 인라인 에러 + 발효 시점 지정 + H4 변경 이력 diff
 * 56일차가 만든 H1(그룹 목록)·H2(코드 목록)·H3(편집 폼) 골격에 이번 일차가 더한 것 —
 * ① `ConfigEditForm`이 3팀 `getNumericRange`로 실시간 범위 검증(+ I-281 빈 입력 거부)
 * ② `./actions.ts`가 저장 시 `effectiveFromSeason`을 계산해 오버레이에 채움
 * ③ 이 파일이 `DataSource.getCommonCodeHistory()`(1팀 계약, 기저)와
 * `config-history-store.ts`(이 화면 저장 오버레이)를 합쳐 `ConfigHistoryDiff`(H4, 신규
 * 화면 로컬 컴포넌트)에 내려준다. 선택된 코드가 있을 때만 조회한다(코드 미선택 시
 * `commonCodeId`가 없어 조회 자체가 무의미).
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
 *
 * ## 접근 제어 — NFR-SEC-007 1차(환경 플래그), 59일차 신규
 * `../console-flag.ts` 참조 — `/admin`과 동일하게 플래그 비활성 시 `notFound()`.
 */
export default async function Page(props: PageProps<"/[lang]/admin/config">) {
  if (!isAdminConsoleEnabled()) {
    notFound();
  }

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

  // H3-p "발효 시점 지정"(57일차) — NEXT_SEASON 배지에 채울 실제 다음 시즌 번호.
  const world = await dataSource.getWorldStatus();

  // H4 — 선택된 코드가 있을 때만 조회한다(commonCodeId가 없으면 조회 자체가 무의미).
  const historyEntries =
    activeGroup && selectedCodeEntry
      ? mergeConfigHistory(
          await fetchCommonCodeHistoryForAdminConsole(selectedCodeEntry.id),
          activeGroup.groupCode,
          selectedCodeEntry.code,
        )
      : [];

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
                <>
                  <ConfigEditForm
                    key={selectedCodeEntry.id}
                    locale={locale}
                    lang={lang}
                    groupCode={activeGroup.groupCode}
                    groupValueType={activeGroup.valueType}
                    applyPolicy={activeGroup.applyPolicy}
                    currentSeasonNumber={world.currentSeasonNumber}
                    code={selectedCodeEntry}
                  />
                  <ConfigHistoryDiff locale={locale} entries={historyEntries} />
                </>
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
