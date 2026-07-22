import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { PhaseIndicator } from "@/components/state/PhaseIndicator";
import { CountdownTimer } from "@/components/state/CountdownTimer";

import { StatusBadge } from "./StatusBadge";
import { SpeedControlPanel } from "./SpeedControlPanel";
import { PauseResumeControl } from "./PauseResumeControl";
import { SeedInspectorPanel } from "./SeedInspectorPanel";
import { WorldResetPanel } from "./WorldResetPanel";
import { AuditLogViewer } from "./AuditLogViewer";
import { applyWorldOverride } from "./world-override-store";
import { mergeAuditLogs } from "./audit-log-store";

/**
 * `/[lang]/admin` 운영 콘솔 — Task 021(54~55일차, 5팀), 와이어프레임
 * `docs/wireframe/07-어드민-운영콘솔.md` G1~G6(시뮬 상태 요약·배속 제어·정지/재개·시드
 * 조회·**월드 리셋**·**로그 뷰어**). G5·G6은 55일차 배정분 — G5는 2단계 확인 없이는
 * 리셋이 절대 불가하고(I-13), **이 화면 자체가 실제 리셋을 실행하지 않는다**(`WorldResetPanel`
 * 주석 참조).
 *
 * ## 쓰기 조작 — Server Action + 화면 로컬 오버레이(이슈 후보로 보고, 54일차)
 * `DataSource`(1팀 계약)는 어드민 조회를 읽기 전용으로 못박았고("쓰기 조작은 이 계약
 * 범위 밖" — `src/lib/data/DataSource.ts` 파일 헤더 "9일차 스코프"), 같은 문서가 "화면
 * 소유 팀이 별도 경로(Server Action 등)로 구현"하도록 명시적으로 위임했다. `./actions.ts`
 * + `./world-override-store.ts`가 그 경로다 — 3팀 소유 `MockDataSource`의 내부 상태는
 * 건드리지 않고 module-level in-memory 오버레이만 얹는다. 실제 엔진·DB 영속화(2팀 H-24
 * 계약, 6팀 Supabase 쓰기 경로)가 붙기 전까지는 이 프로세스 한정 데모다 — 정확한 한계는
 * `world-override-store.ts` 파일 헤더 참조.
 *
 * ## 접근 제어 — 이 화면 범위 밖
 * NFR-SEC-007(비공개 경로 + 환경 플래그)은 미들웨어 영역이라 이 파일이 다루지 않는다 —
 * 같은 일차에 6팀이 `src/proxy.ts`에 `/admin/**` 인증·역할 확인을 붙인다(팀장 조율).
 */
export default async function Page(props: PageProps<"/[lang]/admin">) {
  const { lang } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const [baseWorld, nextKickoff, currentSeason] = await Promise.all([
    dataSource.getWorldStatus(),
    dataSource.getNextKickoff(),
    dataSource.getCurrentSeason(),
  ]);
  // G2/G3 쓰기 오버레이를 기저 World 위에 얹는다 — 위 파일 헤더 "쓰기 조작" 절 참조.
  const world = applyWorldOverride(baseWorld);

  // G3 "경과 표시" 앵커 — 정지 중이면 정지 진입 시각, 진행 중이면 마지막 배속 변경 시각.
  // "지금"과의 차를 재는 계산 자체는 `PauseResumeControl`(클라이언트)의 `useEffect`로
  // 미룬다 — 서버 컴포넌트 렌더 본문에서 `Date.now()`를 직접 부르면 순수성 규칙
  // (react-hooks/purity, React Compiler)에 걸린다. `CountdownTimer`와 동일한 패턴.
  const elapsedAnchor = world.isPaused ? world.pausedAt : world.speedChangedAt;

  // G6 초기 조회 — G1~G4처럼 `dataSource`를 직접 호출한다(어드민 세션 게이트를 거치지
  // 않음). `fetchAuditLogs` 서버 액션(`./actions.ts`)은 어드민 전용 노출이라 인가를
  // 재검증하는데, 그걸 페이지 렌더 경로에 그대로 쓰면 이 서버 컴포넌트 렌더 자체가
  // 인가 실패로 통째로 던진다 — G4 시드 조회와 동일하게 "초기 렌더는 무가드 직접 조회,
  // 이후 상호작용(필터·검색)만 게이트된 액션 경유"로 나눈다(I-274와 같은 함정 회피).
  const auditLogs = mergeAuditLogs(await dataSource.getAuditLogs());

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
      <h1 className="text-xl font-semibold">{t(locale, "admin.console.title")}</h1>

      {/* G1 — 시뮬 상태 요약(전폭, 와이어프레임 3-1·3-2절 공통) */}
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:p-6">
        {currentSeason && (
          <PhaseIndicator
            locale={locale}
            season={{ seasonNumber: currentSeason.seasonNumber, phase: currentSeason.phase }}
          />
        )}
        <div className="flex flex-wrap items-center gap-4">
          {nextKickoff ? (
            <CountdownTimer locale={locale} targetAt={nextKickoff.kickoffAt} isPaused={world.isPaused} />
          ) : (
            <p className="text-sm text-muted-foreground">{t(locale, "admin.status.noNextKickoff")}</p>
          )}
          <span className="scoreboard text-sm text-muted-foreground">
            {t(locale, "admin.speed.multiplierFormat", { value: world.speedMultiplier })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t(locale, "admin.status.stateLabel")}</span>
          <StatusBadge locale={locale} isPaused={world.isPaused} />
        </div>
      </section>

      {/* 모바일은 단일 컬럼 스택(G2→G4), md(768px)부터 좌(G2+G3)/우(G4) 2컬럼(와이어프레임
          3-2절). sm(375px)은 이 프로젝트에서 320px과 동일 취급이라 레이아웃 전환에 쓰지
          않는다(I-184) — 전환점은 md 하나만 쓴다. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-6">
          <SpeedControlPanel locale={locale} lang={lang} initialSpeedMultiplier={world.speedMultiplier} />
          <PauseResumeControl
            locale={locale}
            lang={lang}
            initialIsPaused={world.isPaused}
            elapsedAnchor={elapsedAnchor}
          />
        </div>
        <div className="flex flex-col gap-6">
          <SeedInspectorPanel
            locale={locale}
            worldSeed={world.worldSeed}
            seasonSeed={currentSeason?.seasonSeed ?? null}
            seasonNumber={currentSeason?.seasonNumber ?? null}
          />
          <WorldResetPanel locale={locale} lang={lang} />
          <AuditLogViewer locale={locale} initialLogs={auditLogs} />
        </div>
      </div>
    </div>
  );
}
