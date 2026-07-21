/**
 * `src/lib/sim/standing/playoff-tiebreak.ts`
 *
 * Task 026(36일차) — "승강 경계 동률 시 `competition_type = TIEBREAK` Fixture 자동 생성".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 36일차 행. 근거:
 * `docs/require/03-functional-requirements.md` FR-LG-005 "예외" 문장 —
 * "승격 경계(3위/4위) 또는 강등 경계(N−2위/N−3위)에서 6단계까지 동률이면 → 중립지 단판
 * 플레이오프(연장 30분 → 승부차기)로 결정한다" — 및 그 수용 기준 ③ "승강 경계 동률 발생 시
 * `competition_type = TIEBREAK` Fixture가 자동 생성되고 UI에 노출".
 *
 * ## 왜 별도 파일인가 — `tiebreak.ts`(35일차) 헤더가 이미 예고한 경계
 * `tiebreak.ts`의 "승격/강등 경계 플레이오프 예외는 범위 밖" 절: "이건 7단계(시드 추첨)
 * **대신** 별도 넉아웃 경기를 편성하는 로직이라, 이 파일(팀 단위 스칼라 비교)의 책임이
 * 아니라 시즌 진행 계층(승강 경계 판정 + 플레이오프 편성, `knockout/`·`season/` 소관)의
 * 몫이다." 이 파일이 그 "승강 경계 판정" 절반을 담당한다(실제 넉아웃 대진 편성 전체는
 * 27번 Task `knockout/`이 아직 없다 — 여긴 "동률 시 결정전 Fixture 1건을 만든다"는
 * 좁은 책임만 진다).
 *
 * ## 리그별 경계 순위는 하드코딩하지 않는다 (NFR-CFG-001)
 * "3위/4위"·"N−2위/N−3위"는 리그마다 다른 `PROMOTION_SLOTS`/`RELEGATION_SLOTS`
 * 공통코드(FR-LG-006)에서 파생되는 값이라, 이 엔진 파일이 리터럴로 갖지 않는다(2팀 소유
 * 경로 규약 — 값은 호출자가 `StandingBoundary[]`로 주입한다). 같은 이유로 "리그1은 승격
 * 경계가 없다"·"리그3은 강등 경계가 없다"(리그3은 FR-LG-007 리빌드 제재로 대체, 이
 * 파일의 승강 경계 개념과 다른 메커니즘) 같은 리그별 예외도 이 파일이 알지 못한다 —
 * 호출자가 해당 리그에 적용 가능한 `boundaries`만 골라 넘긴다.
 *
 * ## 6단계까지의 동률 그룹을 어떻게 얻는가
 * `tiebreak.ts`의 `resolveStandings()`는 항상 7단계(시드 추첨)까지 실행해 완전히 갈린
 * 순위를 반환한다 — 그 시점엔 "6단계까지 동률이었다"는 사실 자체가 지워진다. 그래서
 * 36일차에 `tiebreak.ts`에 `groupStandingsBeforeSeedDraw()`를 추가했다(7단계 직전 상태로
 * 멈추는 버전, `resolveStandings()`의 동작은 변경 없음) — 이 파일은 그 결과만 소비한다.
 *
 * ## Fixture "초안"만 만든다 — 브랜드 ID는 여기서 발급하지 않는다
 * `src/types/brand.ts` 헤더: "생성은 이 파일 밖에서 하지 않는다 — 실제 UUID/시드 값을
 * 만드는 단일 지점(Mock 팩토리 007, Supabase 어댑터 034)에서만 캐스트 1회". 그래서 이 파일은
 * `id`/`matchSeed`/`snapshotId`/`kickoffAt`/`attendance` 등 그 단일 지점에서만 채워야 하는
 * 필드를 갖지 않는 `TiebreakFixtureDraft`(=아직 `Fixture`가 아니다)만 반환한다 — 25일차
 * `schedule/berger.ts`의 `BergerFixture`(마찬가지로 `round`/`homeTeamId`/`awayTeamId`만
 * 갖는 초안 타입)와 정확히 같은 패턴이다. 오케스트레이션 계층이 이 초안에 브랜드 ID·
 * `matchSeed`(`rng/derive.ts` 경유)·`kickoffAt`(TIEBREAK 페이즈 킥오프 산출)을 얹어야
 * 비로소 `Fixture` 레코드가 된다.
 *
 * ## 홈/원정 배정 — 중립지라 승부에 영향 없지만 결정론은 지킨다
 * 요구사항이 "중립지 단판"이라 명시해 `isNeutral: true`이고, "중립지 홈 어드밴티지
 * 미적용" 규칙과 정합적이다(43일차 Task 027 완료, I-219). 그 규칙은 두 층으로 나뉜다 —
 * "결승 중립지에서는 홈 계수가 항상 1.0"이라는 **불변식**은 `knockout/seeding.ts`의
 * `assertNeutralHomeAdvantage()`가 값으로 보증하고, 비중립 경기의 홈 계수 **공식**은
 * 여전히 `ability/modifiers.ts`의 `homeModifier`(TODO, 미확정) 소관이다. 이 파일은
 * 그중 어느 쪽도 계산하지 않고 `isNeutral: true`만 보장한다. 그럼에도 스키마가
 * `homeTeamId`/`awayTeamId`를
 * 요구하므로, 동률 팀들을 `teamId` 오름차순으로 정규화해 첫 번째를 home으로 둔다 —
 * `tiebreak.ts`의 7단계 시드 추첨이 셔플 전에 쓰는 것과 같은 정규화(입력 배열 순서에
 * 결과가 우연히 의존하지 않게 하기 위함). 난수는 전혀 쓰지 않는다 — 동률 그룹 자체가
 * 이미 결정돼 있고 정렬만 하면 되므로 이 파일에 `rng/prng.ts`/`derive.ts` 의존이 없다.
 *
 * ## 3팀 이상 동시 동률이 경계에 걸치는 경우는 범위 밖
 * 예: 3위/4위/5위가 전부 6단계까지 동률인데 경계가 3/4이면, "단판 플레이오프 1건"으로는
 * 셋 중 누가 승격하는지 결정할 수 없다(승자/패자 트리가 필요 — 요구사항 문서에 이 다자
 * 대진 규칙이 없다). `tiebreak.ts`의 4단계 승자승 처리와 같은 원칙으로, 규정에 없는 값을
 * 지어내지 않고 명시적 오류로 알린다(호출자가 이슈 후보로 등재할 신호). 완료 판정
 * "동률 시 Fixture 1건 생성"이 다루는 범위는 요구사항 원문·수용 기준 어디에도 다자 대진이
 * 언급되지 않은 통상 케이스(정확히 2팀 동률)다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 타입은 `@/types`
 * 배럴로만 import.
 */

import type { CompetitionType, LeagueId, SeasonId, TeamId } from '@/types';
import { stableSortBy } from '../rng/sort';
import {
  groupStandingsBeforeSeedDraw,
  MATCH_POINTS_DEFAULT,
  type HeadToHeadFixtureInput,
  type StandingBasis,
  type TiebreakMatchPoints,
} from './tiebreak';

/** FR-LG-005 예외가 구분하는 경계 종류. */
export type BoundaryKind = 'PROMOTION' | 'RELEGATION';

/**
 * 승강 경계 규칙 하나 — "이 두 순위(반드시 인접) 사이에 동률이 걸치면 결정전이 필요하다".
 * 예: 승격 경계는 `{ kind: 'PROMOTION', upperRank: 3, lowerRank: 4 }`(3위까지 승격),
 * 강등 경계는 리그 규모 N에서 `{ kind: 'RELEGATION', upperRank: N - 3, lowerRank: N - 2 }`
 * (N-3위까지 잔류). 실제 순위 값은 호출자가 `PROMOTION_SLOTS`/`RELEGATION_SLOTS` 공통코드로
 * 계산해 주입한다(이 파일은 리그별 슬롯 수를 모른다, 파일 헤더 참조).
 */
export interface StandingBoundary {
  readonly kind: BoundaryKind;
  /** 경계 상단 — 마지막으로 승격되거나 잔류하는 순위. */
  readonly upperRank: number;
  /** 경계 하단 — 처음으로 승격에 실패하거나 강등되는 순위. `upperRank + 1`이어야 한다. */
  readonly lowerRank: number;
}

/**
 * 아직 `Fixture`가 아닌 초안 — 브랜드 ID·`matchSeed`·`snapshotId`·`kickoffAt`은
 * 오케스트레이션 계층이 채운다(파일 헤더 "Fixture 초안만 만든다" 절 참조).
 */
export interface TiebreakFixtureDraft {
  readonly seasonId: SeasonId;
  readonly leagueId: LeagueId;
  readonly competitionType: CompetitionType;
  /** 이 경계 결정전이 속한 대회(TIEBREAK) 자체의 라운드 — 단판이라 항상 1. */
  readonly round: number;
  /** 표시용 원시 라벨(번역 비대상, T13) — 예: "승격 경계 타이브레이커". */
  readonly roundLabel: string;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly isNeutral: true;
  readonly boundaryKind: BoundaryKind;
  /** 이 동률 그룹이 6단계까지 차지한 순위 구간(양끝 포함) — 디버깅·로그용 메타데이터. */
  readonly tiedRankStart: number;
  readonly tiedRankEnd: number;
}

export interface DetectBoundaryTiebreaksInput {
  /** 순위를 매길 팀 전체 — `tiebreak.ts`의 `resolveStandings()`와 같은 스코프 제약. */
  readonly teams: readonly StandingBasis[];
  /** 4단계 승자승 계산용 개별 경기 — `resolveStandings()`와 동일 계약. */
  readonly headToHeadFixtures: readonly HeadToHeadFixtureInput[];
  /** 미지정 시 `MATCH_POINTS_DEFAULT`(I-83 주입 패턴, `tiebreak.ts`와 동일). */
  readonly matchPoints?: TiebreakMatchPoints;
  /** 이번 순위표에 적용할 경계 규칙(리그마다 다름, 위 `StandingBoundary` 참조). */
  readonly boundaries: readonly StandingBoundary[];
}

const BOUNDARY_KIND_LABEL: Record<BoundaryKind, string> = {
  PROMOTION: '승격',
  RELEGATION: '강등',
};

/** 단판 결정전은 그 자체가 하나뿐인 대회 구조라 라운드 수가 리그 규모에 좌우되지 않는다. */
const SINGLE_LEG_ROUND = 1;

function assertValidBoundary(boundary: StandingBoundary): void {
  if (boundary.lowerRank !== boundary.upperRank + 1) {
    throw new RangeError(
      `detectBoundaryTiebreaks: boundary(${boundary.kind})는 인접한 두 순위여야 합니다 ` +
        `(upperRank=${boundary.upperRank}, lowerRank=${boundary.lowerRank}).`,
    );
  }
  if (boundary.upperRank < 1) {
    throw new RangeError(
      `detectBoundaryTiebreaks: boundary(${boundary.kind}).upperRank는 1 이상이어야 합니다 (받은 값: ${boundary.upperRank}).`,
    );
  }
}

/** `group`(6단계까지 동률인 팀들)이 `boundary`의 두 순위에 모두 걸치는지 판정한다. */
function straddlesBoundary(rankStart: number, rankEnd: number, boundary: StandingBoundary): boolean {
  return rankStart <= boundary.upperRank && rankEnd >= boundary.lowerRank;
}

/**
 * 6단계까지 동률인 팀 묶음이 승강 경계에 걸치는지 탐지하고, 걸치는 경우 중립지 단판
 * 결정전 `Fixture` 초안을 1건 생성한다(완료 판정 "동률 시 Fixture 1건 생성"). 걸치지
 * 않는 동률(예: 안전권 안에서만 동률)은 정상적으로 7단계 시드 추첨으로 넘어가면 되므로
 * 이 함수는 아무것도 반환하지 않는다 — 그 7단계 실행은 여전히 `tiebreak.ts`의
 * `resolveStandings()` 몫이다(이 함수는 순위를 확정하지 않는다).
 */
export function detectBoundaryTiebreaks(
  input: DetectBoundaryTiebreaksInput,
): readonly TiebreakFixtureDraft[] {
  const { teams, headToHeadFixtures, boundaries } = input;
  const matchPoints = input.matchPoints ?? MATCH_POINTS_DEFAULT;

  boundaries.forEach(assertValidBoundary);
  if (teams.length === 0 || boundaries.length === 0) return [];

  const groups = groupStandingsBeforeSeedDraw(teams, { headToHeadFixtures, matchPoints });

  const drafts: TiebreakFixtureDraft[] = [];
  let rankStart = 1;

  for (const group of groups) {
    const rankEnd = rankStart + group.length - 1;

    if (group.length > 1) {
      for (const boundary of boundaries) {
        if (!straddlesBoundary(rankStart, rankEnd, boundary)) continue;

        if (group.length !== 2) {
          throw new RangeError(
            `detectBoundaryTiebreaks: ${group.length}개 팀이 동시에 ${boundary.kind} 경계` +
              `(${boundary.upperRank}위/${boundary.lowerRank}위)에 걸쳐 6단계까지 동률입니다 — ` +
              '3팀 이상 동시 동률의 다자 결정전 편성 규칙은 요구사항에 없어 이 파일의 범위 밖입니다' +
              '(파일 헤더 참조, 이슈 후보로 등재하세요).',
          );
        }

        const [home, away] = stableSortBy(group, [{ get: (team) => String(team.teamId) }]);
        drafts.push({
          seasonId: home.seasonId,
          leagueId: home.leagueId,
          competitionType: 'TIEBREAK',
          round: SINGLE_LEG_ROUND,
          roundLabel: `${BOUNDARY_KIND_LABEL[boundary.kind]} 경계 타이브레이커`,
          homeTeamId: home.teamId,
          awayTeamId: away.teamId,
          isNeutral: true,
          boundaryKind: boundary.kind,
          tiedRankStart: rankStart,
          tiedRankEnd: rankEnd,
        });
      }
    }

    rankStart = rankEnd + 1;
  }

  return drafts;
}
