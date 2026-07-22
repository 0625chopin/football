import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";

import { CronStatusSummary } from "./CronStatusSummary";
import { CronMetricCards } from "./CronMetricCards";
import { CronGapList } from "./CronGapList";
import { CronRunTable } from "./CronRunTable";
import { countConsecutiveFailures } from "./scheduler-elapsed";
import { isAdminConsoleEnabled } from "../console-flag";

const DEFAULT_CRON_INTERVAL_MIN = 1;

/**
 * `/[lang]/admin/scheduler` — Task 021(58일차, 5팀), 와이어프레임
 * `docs/wireframe/08-어드민-공통코드-스케줄러.md` Part B(J1~J4). Task 005(11일차)의 빈
 * 골격을 이번 일차가 채운다 — 골격만 있던 형태는 커밋 히스토리 참조.
 *
 * ## 읽기 전용 — I-214 크론 점등 금지(차단성)
 * 이 화면은 `DataSource`(1팀 계약)의 J1~J4 조회 4종(`getLatestCronRun`/`getCronRuns`/
 * `getCronRunMetrics`/`getCronGaps`)만 호출한다. 실제 크론을 켜거나 스케줄러를 기동하는
 * 코드는 이 화면 범위 밖이며(그런 쓰기 조작 자체가 계약에 없다 — 파일 헤더 "9일차 스코프"
 * 참조), `MockDataSource`(3팀)는 현재 전부 빈 값/0을 반환한다(월드가 실제로 크론을 한 번도
 * 돌리지 않았다는 정직한 초기 상태) — 그래서 이 페이지는 지금 대부분 Empty 상태로 보인다.
 *
 * ## "다음 예정" 추정 — `CRON_PARAM.INTERVAL_MIN`
 * J1의 "다음 예정" 배지는 마지막 실행 시작 시각 + 크론 주기(분)다(와이어프레임 J1 비고,
 * "추정치"임을 라벨에 명시). 주기는 공통코드 `CRON_PARAM.INTERVAL_MIN`(기본값 1분,
 * `src/lib/config/catalog.ts` 참조)에서 읽는다 — 하드코딩하지 않고 그룹 코드로 조회하므로
 * 운영자가 `/admin/config`에서 주기를 바꾸면 이 화면도 같이 반영된다.
 *
 * ## 폴링 미도입 — W-48(미확정)
 * 와이어프레임이 폴링 주기 자체를 팀장 판정 대기로 남겨 두었다(W-48). 이번 일차는 수동
 * 새로고침(브라우저 새로고침 = 서버 컴포넌트 재조회)만 제공하고, 자동 폴링은 W-48 해소
 * 이후로 미룬다.
 *
 * ## 접근 제어 — NFR-SEC-007 1차(환경 플래그), 59일차 신규
 * `../console-flag.ts` 참조 — 다른 두 콘솔과 동일하게 플래그 비활성 시 `notFound()`.
 */
export default async function Page(props: PageProps<"/[lang]/admin/scheduler">) {
  if (!isAdminConsoleEnabled()) {
    notFound();
  }

  const { lang } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const [latestRun, runs, metrics, gaps, cronParamCodes] = await Promise.all([
    dataSource.getLatestCronRun(),
    dataSource.getCronRuns(),
    dataSource.getCronRunMetrics(),
    dataSource.getCronGaps(),
    dataSource.getCommonCodes("CRON_PARAM"),
  ]);

  const intervalMin = cronParamCodes.find((code) => code.code === "INTERVAL_MIN")?.valueNum ?? DEFAULT_CRON_INTERVAL_MIN;
  const consecutiveFailures = countConsecutiveFailures(runs);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
      <h1 className="text-xl font-semibold">{t(locale, "admin.scheduler.title")}</h1>

      {/* 모바일은 J1→J3 단일 컬럼, md(768px)부터 2컬럼(와이어프레임 3B-2) — sm은 이
          프로젝트에서 320px과 동일 취급이라 전환점으로 쓰지 않는다(I-184). */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        <CronStatusSummary
          locale={locale}
          latestRun={latestRun}
          intervalMin={intervalMin}
          consecutiveFailures={consecutiveFailures}
        />
        <CronMetricCards locale={locale} metrics={metrics} />
      </div>

      {gaps.length > 0 && <CronGapList locale={locale} gaps={gaps} />}

      <CronRunTable locale={locale} runs={runs} />
    </div>
  );
}
