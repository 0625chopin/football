"use client";

import { useState, type ComponentType } from "react";

import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

import { AbilityRadar } from "@/components/domain/AbilityRadar";
import { ConditionGauge } from "@/components/domain/ConditionGauge";
import { FitnessBar } from "@/components/domain/FitnessBar";
import { FormStrip } from "@/components/domain/FormStrip";
import { PlayerAvatar } from "@/components/domain/PlayerAvatar";
import { PositionMap } from "@/components/domain/PositionMap";
import { StatBar } from "@/components/domain/StatBar";
import { TeamBadge } from "@/components/domain/TeamBadge";

import { BracketTree } from "@/components/composite/BracketTree";
import { EventTimelineItem } from "@/components/composite/EventTimelineItem";
import { GrowthChart } from "@/components/composite/GrowthChart";
import { InjuryTimeline } from "@/components/composite/InjuryTimeline";
import { MatchCard } from "@/components/composite/MatchCard";
import { MatchScoreboard } from "@/components/composite/MatchScoreboard";
import { NewsItem } from "@/components/composite/NewsItem";
import { PitchLineup } from "@/components/composite/PitchLineup";
import { StandingsTable } from "@/components/composite/StandingsTable";
import { TrophyCase } from "@/components/composite/TrophyCase";

/**
 * Task 014(35일차, 4팀) — 컴포넌트별 4상태(loading/empty/error/ready) 토글.
 *
 * `domain`·`composite` 16종은 서버 전용 API를 쓰지 않는 순수 프레젠테이션 함수라
 * 클라이언트 바운더리 안에서 직접 import해도 안전하게 렌더된다(4팀 확인). 컴포넌트
 * 참조 자체는 서버→클라이언트로 prop 전달이 불가능하므로(함수는 RSC 경계를 못 건넌다)
 * 문자열 `componentKey`로 받아 이 파일 내부 레지스트리에서 해석한다 — 서버(`page.tsx`)는
 * 이미 계산한 직렬화 가능한 `readyData`만 넘긴다.
 *
 * 4상태 판별 유니온은 `DomainViewState<T>`/`CompositeViewState<T>`(28일차, I-156 동형
 * 통일)를 새로 선언하지 않고 그대로 재사용한다 — 두 타입이 구조적으로 동일해 레지스트리의
 * 컴포넌트 종류에 관계없이 같은 `state` 값을 그대로 전달할 수 있다.
 */

export type ComponentKey =
  | "AbilityRadar"
  | "ConditionGauge"
  | "FitnessBar"
  | "FormStrip"
  | "PlayerAvatar"
  | "PositionMap"
  | "StatBar"
  | "TeamBadge"
  | "BracketTree"
  | "EventTimelineItem"
  | "GrowthChart"
  | "InjuryTimeline"
  | "MatchCard"
  | "MatchScoreboard"
  | "NewsItem"
  | "PitchLineup"
  | "StandingsTable"
  | "TrophyCase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 16종이 서로 다른 데이터 모양을 가진 동적 디스패치 레지스트리(쇼케이스 전용 리프 파일).
const COMPONENT_REGISTRY: Record<ComponentKey, ComponentType<any>> = {
  AbilityRadar,
  ConditionGauge,
  FitnessBar,
  FormStrip,
  PlayerAvatar,
  PositionMap,
  StatBar,
  TeamBadge,
  BracketTree,
  EventTimelineItem,
  GrowthChart,
  InjuryTimeline,
  MatchCard,
  MatchScoreboard,
  NewsItem,
  PitchLineup,
  StandingsTable,
  TrophyCase,
};

// Task 014(38일차) — 커버리지 체크리스트가 "4상태 구현 수"를 세는 근거로 이 배열을 그대로
// 가져다 쓴다(`component-registry.ts`). 위 `COMPONENT_REGISTRY`가 실제 렌더 디스패치에
// 쓰이는 유일한 레지스트리이므로, 여기서 키 목록을 파생하면 카운터가 별도로 손 유지하는
// 목록과 어긋날 일이 없다(하드코딩 숫자 대신 실제 레지스트리를 세는 방식, I-168 참고).
export const FOUR_STATE_COMPONENT_KEYS = Object.keys(COMPONENT_REGISTRY) as ComponentKey[];

const TOGGLE_STATUSES = ["loading", "empty", "error", "ready"] as const;
type ToggleStatus = (typeof TOGGLE_STATUSES)[number];

const STATUS_LABEL_KEY: Record<ToggleStatus, TranslationKey> = {
  loading: "sample.state.loading",
  empty: "sample.state.empty",
  error: "sample.state.error",
  ready: "sample.state.ready",
};

export interface StateToggleSlotProps {
  readonly name: string;
  readonly componentKey: ComponentKey;
  readonly locale: SupportedLocale;
  /** 서버가 이미 조회해 둔 ready 데이터. 없으면(빈 목록 등) null — ready 토글을 비활성화한다. */
  readonly readyData: unknown | null;
  /** StatBar의 `label`, PlayerAvatar/TeamBadge의 `size`, MatchCard의 `density` 등 컴포넌트별 추가 prop. */
  readonly extraProps?: Record<string, unknown>;
}

export function StateToggleSlot({
  name,
  componentKey,
  locale,
  readyData,
  extraProps,
}: StateToggleSlotProps) {
  const [status, setStatus] = useState<ToggleStatus>(readyData !== null ? "ready" : "empty");
  const Component = COMPONENT_REGISTRY[componentKey];

  const state =
    status === "ready"
      ? readyData !== null
        ? ({ status: "ready", data: readyData } as const)
        : ({ status: "empty" } as const)
      : ({ status } as const);

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={`${name} ${t(locale, "sample.state.toggleLabel")}`}
        className="flex flex-wrap gap-1"
      >
        {TOGGLE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            disabled={s === "ready" && readyData === null}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              status === s
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(locale, STATUS_LABEL_KEY[s])}
          </button>
        ))}
      </div>
      <Component locale={locale} state={state} {...extraProps} />
    </div>
  );
}
