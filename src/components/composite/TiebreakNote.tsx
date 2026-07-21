import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { TranslationKey } from "@/i18n/keys";
import { cn } from "@/lib/utils";
import type { TiebreakNoteBlock } from "./tiebreak-note";

/**
 * `/leagues/[leagueId]` B4 타이브레이커 주석 — Task 016(40일차, 5팀), 화면 로컬.
 *
 * 와이어프레임 §4 B4: "어느 순위 구간이 몇 단계에서 갈렸는지" 표시(FR-LG-005 수락 기준
 * ③, `Standing.tiebreakApplied`). 오늘 스코프는 이 "적용 단계 표시" 문장뿐이다 — B4의
 * 두 번째 줄("TIEBREAK Fixture 존재 시" 단판 플레이오프 예정 안내)은 승강 경계 동률
 * 재경기 생성기가 Mock 계층에 아직 없어(`MockDataSource.getFixturesByRound` TIEBREAK
 * 분기 주석 참조) Task 016 잔여 스코프로 남긴다.
 *
 * **블록(원 승점 동률) vs 하위구간(실제 갈린 단계)** — `tiebreak-note.ts` 헤더가 근거를
 * 설명한다: 같은 승점 블록 안에서도 팀마다 다른 단계에서 갈릴 수 있어(40일차 실렌더
 * 회귀 케이스), 블록을 항상 2명 이상 단위로 유지하고 그 안의 하위구간만 단계별로
 * 나눈다. 하위구간이 1개면(블록 전체가 한 단계로 갈림) 기존 단문(`decidedBy`), 2개
 * 이상이면 블록 전체를 명시한 뒤 절을 나열하는 복문(`decidedByMulti`)을 쓴다 — 이래서
 * "N위는 … 갈렸습니다"처럼 상대 없는 단독 문장이 구조적으로 나오지 않는다.
 *
 * `ZoneLegend`와 같은 이유로 `CompositeViewState`를 쓰지 않는다 — 이 컴포넌트는 이미
 * 로드된 순위표에서 파생된 값만 받고, 자체적으로 로딩/에러 상태를 가지지 않는다.
 * 블록이 없으면(동률 없음) `null`을 반환한다 — B4는 조건부 영역이라 빈 박스를 그리지
 * 않는다(와이어프레임 §5 Success 기준).
 */

const STAGE_SUFFIX_KEY: Record<number, TranslationKey> = {
  2: "league.tiebreak.stage2Suffix",
  3: "league.tiebreak.stage3Suffix",
  4: "league.tiebreak.stage4Suffix",
  5: "league.tiebreak.stage5Suffix",
  6: "league.tiebreak.stage6Suffix",
  7: "league.tiebreak.stage7Suffix",
};

export interface TiebreakNoteProps {
  readonly locale: SupportedLocale;
  readonly blocks: readonly TiebreakNoteBlock[];
  readonly className?: string;
}

function stageSuffix(locale: SupportedLocale, stage: number): string | null {
  const key = STAGE_SUFFIX_KEY[stage];
  // 계약상 2~7 외 값은 들어오지 않지만(엔진 `stageLabel` 산출 범위), 매핑이 없으면
  // 빈 문자열을 노출하지 않기 위해 방어적으로 null을 돌려준다.
  return key ? t(locale, key) : null;
}

export function TiebreakNote({ locale, blocks, className }: TiebreakNoteProps) {
  if (blocks.length === 0) return null;

  return (
    <ul
      aria-label={t(locale, "league.tiebreak.title")}
      className={cn("space-y-1 text-sm text-muted-foreground", className)}
    >
      {blocks.map((block) => {
        if (block.subRuns.length === 1) {
          const suffix = stageSuffix(locale, block.subRuns[0].stage);
          if (!suffix) return null;

          return (
            <li key={block.blockRanks.join("-")} className="flex items-start gap-1.5">
              <span aria-hidden="true">ⓘ</span>
              <span>
                {t(locale, "league.tiebreak.decidedBy", {
                  ranks: block.blockRanks.join("·"),
                  stage: suffix,
                })}
              </span>
            </li>
          );
        }

        const clauses = block.subRuns
          .map((subRun) => {
            const suffix = stageSuffix(locale, subRun.stage);
            if (!suffix) return null;
            return t(locale, "league.tiebreak.clause", { ranks: subRun.ranks.join("·"), stage: suffix });
          })
          .filter((clause): clause is string => clause !== null);

        if (clauses.length === 0) return null;

        return (
          <li key={block.blockRanks.join("-")} className="flex items-start gap-1.5">
            <span aria-hidden="true">ⓘ</span>
            <span>
              {t(locale, "league.tiebreak.decidedByMulti", {
                blockRanks: block.blockRanks.join("·"),
                clauses: clauses.join(t(locale, "league.tiebreak.clauseSeparator")),
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
