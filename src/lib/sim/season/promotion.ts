/**
 * `src/lib/sim/season/promotion.ts` — Task 028(48일차) "순위 확정 → 승강 교환(리그1
 * 22~24위 ↔ 리그2 1~3위 / 리그2 18~20위 ↔ 리그3 1~3위), 팀 수 24/20/16 불변".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 48일차 행.
 *
 * ## 완료 판정 "승강 후 팀 수 불변"은 어떻게 성립하는가
 * 이 파일은 `24/20/16`·`3`(승격/강등 슬롯) 같은 숫자를 어디에도 하드코딩하지 않는다
 * (NFR-CFG-001). 대신 호출자가 `LeagueFinalStandings.league`에 담아 넘기는
 * `League.teamCount`/`promotionSlots`/`relegationSlots`(E-02, 이미 도메인 데이터로 존재)만
 * 읽는다. 팀 수 불변은 "상위 리그 강등 슬롯 수 === 하위 리그 승격 슬롯 수"일 때만
 * 성립하는 등가 관계라서(강등 3팀이 나가고 승격 3팀이 들어와야 총원이 유지된다),
 * `resolvePromotionExchange()`가 이 등가를 명시적으로 검증하고 어긋나면 예외를 던진다 —
 * 값을 지어내거나 조용히 잘라내지 않는다(`standing/tiebreak.ts`·`playoff-tiebreak.ts`가
 * 세운 "요구사항에 없는 케이스는 추측 대신 명시적 오류" 원칙과 동일).
 *
 * ## 입력 — 이미 확정된 최종 순위
 * `LeagueFinalStandings.standings`는 시즌 최종 라운드의 `Standing[]`(E-23, `rank` 필드가
 * 이미 `standing/tiebreak.ts` 7단계를 통과해 확정돼 있다고 가정)이다. 이 파일은 순위를
 * 다시 매기지 않고 `rank` 값을 그대로 읽어 상/하위 슬롯을 자른다.
 *
 * ## 이 파일이 하지 않는 것
 * - 실제 `TeamSeason`(E-05) 레코드 갱신(`leagueId` 필드 반영)은 하지 않는다 — 오케스트레이션
 *   계층이 이 파일의 반환값(`PromotionSwap[]`)을 읽어 다음 시즌 `TeamSeason`을 만든다.
 * - 승격 경계 동률 플레이오프 편성은 `standing/playoff-tiebreak.ts` 소관이며, 이 파일은
 *   이미 동률이 해소된(=순위가 유일한) 최종 순위만 받는다는 전제다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 정렬은
 * `rng/sort.ts`의 `stableSortBy()`만 경유한다(NFR-DT-008). 타입은 `@/types` 배럴로만
 * import.
 */

import type { League, LeagueId, Standing, TeamId } from '@/types';
import { stableSortBy } from '../rng/sort';

export type PromotionDirection = 'PROMOTED' | 'RELEGATED';

/** 승강 교환 결과 1건 — 한 팀이 다음 시즌 어느 리그로 옮기는지. */
export interface PromotionSwap {
  readonly teamId: TeamId;
  readonly fromLeagueId: LeagueId;
  readonly toLeagueId: LeagueId;
  readonly direction: PromotionDirection;
  /** 교환의 근거가 된 이번 시즌 최종 순위 */
  readonly finalRank: number;
}

/** 한 리그의 시즌 최종 순위 — `league`는 `teamCount`/`promotionSlots`/`relegationSlots` 원천. */
export interface LeagueFinalStandings {
  readonly league: League;
  readonly standings: readonly Standing[];
}

/**
 * `entry.standings`가 `entry.league`의 완전한 최종 순위표인지 검증한다.
 * - 팀 수가 `league.teamCount`와 일치해야 한다.
 * - `rank`가 1~`teamCount`를 중복·결측 없이 채워야 한다(교환 대상 슬롯이 정확히 갈리려면
 *   순위가 유일해야 하므로 — 동률 미해소 입력을 여기서 걸러낸다).
 * - `promotionSlots + relegationSlots`가 `teamCount`를 넘지 않아야 한다(넘으면 같은 팀이
 *   승격 대상이면서 동시에 강등 대상이 되는 모순이 발생한다).
 */
function assertCompleteFinalStandings(entry: LeagueFinalStandings): void {
  const { league, standings } = entry;

  if (standings.length !== league.teamCount) {
    throw new Error(
      `resolvePromotionExchange: 리그 ${league.id}의 최종 순위 ${standings.length}건이 ` +
        `팀 수(${league.teamCount})와 일치하지 않습니다.`,
    );
  }

  if (league.promotionSlots + league.relegationSlots > league.teamCount) {
    throw new Error(
      `resolvePromotionExchange: 리그 ${league.id}의 승격+강등 슬롯 합(` +
        `${league.promotionSlots + league.relegationSlots})이 팀 수(${league.teamCount})를 ` +
        `초과합니다.`,
    );
  }

  const ranked = stableSortBy(standings, [{ get: (s: Standing) => s.rank }]);
  ranked.forEach((standing, index) => {
    const expectedRank = index + 1;
    if (standing.rank !== expectedRank) {
      throw new Error(
        `resolvePromotionExchange: 리그 ${league.id}의 최종 순위가 1~${league.teamCount}를 ` +
          `연속으로 채우지 않습니다 (${expectedRank}번째로 정렬된 항목의 rank=${standing.rank}, ` +
          `teamId=${standing.teamId}).`,
      );
    }
  });
}

/**
 * 인접한 두 리그(`higherTier`가 상위 티어) 사이의 승강 교환을 계산한다 — 상위 리그
 * 하위 `relegationSlots`팀과 하위 리그 상위 `promotionSlots`팀을 맞바꾼다.
 *
 * 두 슬롯 수가 다르면 팀 수 불변이 깨지므로(강등/승격 인원이 어긋나면 어느 한쪽 리그의
 * 총원이 변한다) 예외를 던진다 — 슬롯을 임의로 잘라 맞추지 않는다.
 */
export function resolvePromotionExchange(
  higherTier: LeagueFinalStandings,
  lowerTier: LeagueFinalStandings,
): readonly PromotionSwap[] {
  assertCompleteFinalStandings(higherTier);
  assertCompleteFinalStandings(lowerTier);

  const relegationSlots = higherTier.league.relegationSlots;
  const promotionSlots = lowerTier.league.promotionSlots;

  if (relegationSlots !== promotionSlots) {
    throw new Error(
      `resolvePromotionExchange: 리그 ${higherTier.league.id}의 강등 슬롯(${relegationSlots})과 ` +
        `리그 ${lowerTier.league.id}의 승격 슬롯(${promotionSlots})이 달라 팀 수 불변이 ` +
        `깨집니다.`,
    );
  }

  const rankKey = { get: (s: Standing) => s.rank };
  const rankedHigher = stableSortBy(higherTier.standings, [rankKey]);
  const rankedLower = stableSortBy(lowerTier.standings, [rankKey]);

  const relegated =
    relegationSlots > 0 ? rankedHigher.slice(rankedHigher.length - relegationSlots) : [];
  const promoted = rankedLower.slice(0, promotionSlots);

  const swaps: PromotionSwap[] = [
    ...relegated.map(
      (standing): PromotionSwap => ({
        teamId: standing.teamId,
        fromLeagueId: higherTier.league.id,
        toLeagueId: lowerTier.league.id,
        direction: 'RELEGATED',
        finalRank: standing.rank,
      }),
    ),
    ...promoted.map(
      (standing): PromotionSwap => ({
        teamId: standing.teamId,
        fromLeagueId: lowerTier.league.id,
        toLeagueId: higherTier.league.id,
        direction: 'PROMOTED',
        finalRank: standing.rank,
      }),
    ),
  ];

  return swaps;
}

/**
 * 3부 리그 전체(리그1↔리그2, 리그2↔리그3)의 승강 교환을 한 번에 계산한다.
 * `resolvePromotionExchange()`를 경계마다 호출해 합친 것뿐이며, 리그2가 양쪽 경계에
 * 동시에 걸쳐도 `assertCompleteFinalStandings()`가 `promotionSlots + relegationSlots ≤
 * teamCount`를 보장하므로 승격 대상 상위 슬롯과 강등 대상 하위 슬롯이 겹치지 않는다.
 */
export function resolveSeasonPromotionExchange(
  tier1: LeagueFinalStandings,
  tier2: LeagueFinalStandings,
  tier3: LeagueFinalStandings,
): readonly PromotionSwap[] {
  return [...resolvePromotionExchange(tier1, tier2), ...resolvePromotionExchange(tier2, tier3)];
}
