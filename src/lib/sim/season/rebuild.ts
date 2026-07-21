/**
 * `src/lib/sim/season/rebuild.ts` — Task 028(49일차) "리그3 15~16위 리빌드 제재 — 페널티
 * 3종 + 구제 2종(보조금 40%, 유소년 +10%p) (AS-08 death spiral 방지)".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 49일차 행. 근거: FR-LG-007, 결정 D-06,
 * 리스크 AS-08(`docs/require/06-prioritization-and-risks.md`).
 *
 * ## 이 파일이 하는 것 / 하지 않는 것 — "최하위 강등 0건"은 어떻게 성립하는가
 * FR-LG-007은 "리그3은 하위 리그가 없으므로 **강등 대신** 리빌드 제재를 적용한다"고
 * 명시한다. 이 파일은 `promotion.ts`와 달리 리그 소속(`leagueId`) 변경을 계산하는
 * 함수를 아예 두지 않는다 — 반환 타입(`RebuildSanctionOutcome`)에 이동 방향이나
 * 목적지 리그를 나타내는 필드가 없다. "최하위 강등 0건"이라는 완료 판정은 이 파일이
 * 강등 로직을 갖지 않는다는 사실 자체로 성립하며, 별도의 런타임 검증이 필요 없다
 * (리그 탈락·해체도 하지 않는다 — 팀 수 불변은 애초에 아무도 리그를 떠나지 않으므로
 * 자명하다).
 *
 * ## 5개 효과 — 무엇을 계산하고 무엇을 계산하지 않는가
 * FR-LG-007 수용 기준 ①은 "5개 효과가 모두 적용됨"이다. 이 파일이 직접 계산하는 것은
 * ②③④⑤ 4개뿐이다:
 * - **②** 다음 프리시즌 신규 스폰서 협상 명성 보정(1회, 음수) — `REP_PENALTY_NEGOTIATION`
 * - **③** 팀 명성 영구 반영(음수) — `REP_PENALTY_PERMANENT`
 * - **④** 리빌드 보조금 = 리그3 1위 최종 포인트 × `GRANT_PCT`
 * - **⑤** 다음 시즌 유소년 배출 확률 가산(1시즌 한정, %p) — `YOUTH_BONUS_PP`
 *
 * **①** "시즌 종료 포인트 최저 구간 지급(FR-EC-002 표 그대로)"은 이 파일의 계산 대상이
 * 아니다 — FR-EC-002 순위별 포인트 공식(`LEAGUE_FINISH_POINT` 공통코드 그룹)은 리그3
 * 15~16위를 포함한 **전 순위**에 이미 동일하게 적용되는 별도 계산이며(그 공식 자체가
 * 최하위일수록 최저 구간 값을 주도록 설계돼 있다), 리빌드 대상이라고 해서 이 파일이
 * 추가로 감액하지 않는다. `lowestPrizeTierApplied: true`는 "별도 초과 감액 없음, 표준
 * 공식을 그대로 받는다"는 사실을 반환값에 명시하는 표시 필드일 뿐 금액을 만들지 않는다.
 *
 * ## 대상 슬롯 수를 파라미터로 받는 이유 — `League`에 필드가 없다
 * `promotion.ts`는 `League.promotionSlots`/`relegationSlots`(E-02, 8일차 동결)를 읽어
 * 교환 대상 수를 정한다. 리빌드 제재 대상(FR-LG-007 원문 "리그3 15~16위" = 16팀 리그의
 * 최하위 2팀)은 `PROMOTION_RELEGATION_SLOTS` 공통코드(RELEGATION=3, 전 티어 공통)와
 * 다른 수이고, `League` 타입에도 이 값을 담을 필드가 없다(동결 이후 필드 추가 불가).
 * `SANCTION_PARAM`(그룹 32) 4개 키에도 이 개수는 등록돼 있지 않다 — 즉 현재 커밋된
 * 어떤 공통코드 그룹에도 이 값의 등록처가 없다. `tier-b-resim.ts`가 미등록 상수에
 * "안전 기본값 없음, 반드시 주입"으로 처리한 것과 동일하게, 이 파일도 `sanctionSlots`를
 * 기본값 없는 필수 파라미터로 받는다 — 팀 수(NFR-CFG-001 대상, 24/20/16처럼 시즌마다
 * 조정 가능)에 의존해 이 파일 안에 "2"를 직접 하드코딩하지 않기 위해서다.
 *
 * ## 공통코드 주입 (I-83 패턴)
 * `REP_PENALTY_PERMANENT`/`REP_PENALTY_NEGOTIATION`/`GRANT_PCT`/`YOUTH_BONUS_PP` 값은
 * 이 엔진이 `loadConstants()`를 직접 호출하지 않는다(팀 소유 경로 규칙 — `prize.ts`
 * `PLAYOFF_PRIZE_DEFAULT`와 동일 패턴). 오케스트레이션 계층이 `SimConstantSnapshot`의
 * `SANCTION_PARAM` 그룹에서 꺼내 넘기기 전까지는 `REBUILD_SANCTION_PARAM_DEFAULT`
 * 안전 기본값(공통코드 카탈로그 등록값과 동일, `src/lib/config/fallback.ts` 참조 —
 * 그 파일은 3팀 소유이므로 값만 대조하고 import하지 않는다)을 쓴다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 정렬은
 * `rng/sort.ts`의 `stableSortBy()`만 경유한다(NFR-DT-008). 금액 반올림은 확률 비교가
 * 아니므로 `rng/precision.ts` 대상이 아니다(`prize.ts`가 정수 룩업만 하는 것과 달리
 * 이 파일은 결정론적 곱셈·반올림 1회뿐이라 부동소수 비교 자체가 없다). 타입은 `@/types`
 * 배럴로만 import.
 */

import type { LeagueId, TeamId } from '@/types';
import { stableSortBy } from '../rng/sort';
import type { LeagueFinalStandings } from './promotion';

/** `SANCTION_PARAM` 공통코드(그룹 32, FR-LG-007) 키 구성. */
export interface RebuildSanctionParamTable {
  /** ③ 팀 명성 영구 페널티(양수 크기 — 반영 시 부호를 뒤집어 뺀다) */
  readonly REP_PENALTY_PERMANENT: number;
  /** ② 다음 프리시즌 신규 스폰서 협상 명성 페널티(1회, 양수 크기) */
  readonly REP_PENALTY_NEGOTIATION: number;
  /** ④ 리빌드 보조금 = 리그3 1위 포인트 × 이 비율(0~1) */
  readonly GRANT_PCT: number;
  /** ⑤ 다음 시즌 유소년 배출 확률 가산(%p, 0~1 소수 표현) */
  readonly YOUTH_BONUS_PP: number;
}

/** FR-LG-007/`SANCTION_PARAM` 카탈로그 기본값과 동일한 안전 기본값(I-83 주입 패턴). */
export const REBUILD_SANCTION_PARAM_DEFAULT: RebuildSanctionParamTable = {
  REP_PENALTY_PERMANENT: 3,
  REP_PENALTY_NEGOTIATION: 5,
  GRANT_PCT: 0.4,
  YOUTH_BONUS_PP: 0.1,
};

/** 리빌드 제재 대상 1팀에 적용되는 5개 효과. */
export interface RebuildSanctionEffects {
  /** ① FR-EC-002 표를 그대로 받는다는 표시 — 이 파일이 금액을 만들지 않는다(위 헤더 참조) */
  readonly lowestPrizeTierApplied: true;
  /** ② 다음 프리시즌 신규 스폰서 협상 명성 보정(1회, 음수) */
  readonly negotiationReputationPenalty: number;
  /** ③ 팀 명성 영구 반영(음수) */
  readonly permanentReputationPenalty: number;
  /** ④ 리빌드 보조금(리그3 1위 포인트 × `GRANT_PCT`, 반올림) */
  readonly rebuildGrantAmount: number;
  /** ⑤ 다음 시즌 유소년 배출 확률 가산(1시즌 한정, %p 소수 표현) */
  readonly youthBonusPp: number;
}

/** 리빌드 제재 대상 1팀의 계산 결과. */
export interface RebuildSanctionOutcome {
  readonly teamId: TeamId;
  readonly leagueId: LeagueId;
  /** 제재의 근거가 된 이번 시즌 최종 순위 */
  readonly finalRank: number;
  readonly effects: RebuildSanctionEffects;
}

/**
 * `entry.standings`가 `entry.league`의 완전한 최종 순위표인지, 그리고 이 함수의 전제
 * (리그3, 유효한 대상 슬롯 수)를 만족하는지 검증한다. `promotion.ts`의
 * `assertCompleteFinalStandings`와 동일한 불변식(순위 1~teamCount 연속·중복 없음)을
 * 독립적으로 검증한다 — 그 함수는 export되지 않아 재사용할 수 없고, 이 파일은 그 파일의
 * private 구현에 의존하지 않는다(팀 내부 파일 간에도 공개 API로만 결합).
 */
function assertRebuildPrecondition(
  entry: LeagueFinalStandings,
  sanctionSlots: number,
): void {
  const { league, standings } = entry;

  if (league.tier !== 3) {
    throw new RangeError(
      `resolveRebuildSanctions: 리그 ${league.id}의 tier=${league.tier}는 3이어야 합니다 ` +
        `(FR-LG-007은 리그3 전용).`,
    );
  }

  if (standings.length !== league.teamCount) {
    throw new Error(
      `resolveRebuildSanctions: 리그 ${league.id}의 최종 순위 ${standings.length}건이 ` +
        `팀 수(${league.teamCount})와 일치하지 않습니다.`,
    );
  }

  if (!Number.isInteger(sanctionSlots) || sanctionSlots < 1 || sanctionSlots > league.teamCount) {
    throw new RangeError(
      `resolveRebuildSanctions: sanctionSlots=${sanctionSlots}는 1~${league.teamCount} ` +
        `범위의 정수여야 합니다.`,
    );
  }

  const ranked = stableSortBy(standings, [{ get: (s) => s.rank }]);
  ranked.forEach((standing, index) => {
    const expectedRank = index + 1;
    if (standing.rank !== expectedRank) {
      throw new Error(
        `resolveRebuildSanctions: 리그 ${league.id}의 최종 순위가 1~${league.teamCount}를 ` +
          `연속으로 채우지 않습니다 (${expectedRank}번째로 정렬된 항목의 rank=${standing.rank}, ` +
          `teamId=${standing.teamId}).`,
      );
    }
  });
}

/**
 * 리그3 최하위 `sanctionSlots`팀(FR-LG-007 원문 기준 "15~16위")의 리빌드 제재 5개
 * 효과를 계산한다. 강등·리그 탈락·해체는 이 파일의 계산 범위 밖이다(위 헤더 참조) —
 * 반환값은 팀 소속을 바꾸지 않는다.
 */
export function resolveRebuildSanctions(
  tier3: LeagueFinalStandings,
  sanctionSlots: number,
  table: RebuildSanctionParamTable = REBUILD_SANCTION_PARAM_DEFAULT,
): readonly RebuildSanctionOutcome[] {
  assertRebuildPrecondition(tier3, sanctionSlots);

  const { league, standings } = tier3;
  const ranked = stableSortBy(standings, [{ get: (s) => s.rank }]);

  const champion = ranked[0];
  const rebuildGrantAmount = Math.round(champion.points * table.GRANT_PCT);

  const effects: RebuildSanctionEffects = {
    lowestPrizeTierApplied: true,
    negotiationReputationPenalty: -table.REP_PENALTY_NEGOTIATION,
    permanentReputationPenalty: -table.REP_PENALTY_PERMANENT,
    rebuildGrantAmount,
    youthBonusPp: table.YOUTH_BONUS_PP,
  };

  const targeted = ranked.slice(ranked.length - sanctionSlots);

  return targeted.map(
    (standing): RebuildSanctionOutcome => ({
      teamId: standing.teamId,
      leagueId: league.id,
      finalRank: standing.rank,
      effects,
    }),
  );
}
