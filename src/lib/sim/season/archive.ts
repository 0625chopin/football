/**
 * `src/lib/sim/season/archive.ts` — Task 028(54일차) "시즌 아카이브 확정 및
 * `season_number` 누적. 월드 리셋 금지 원칙 반영(I-13)".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 54일차 행. 근거: `docs/ISSUES.md` I-13
 * "세계를 리셋하지 말 것 — 누적 시즌 히스토리가 유일한 강한 해자이며 시간으로만 쌓인다."
 *
 * ## 이 파일이 하는 것 / 하지 않는 것
 * `awards.ts`(53일차)·`retire.ts`(52일차)·`rebuild.ts`(49일차)·`promotion.ts`(48일차)는
 * 각자 시즌 정산의 한 조각(수상/은퇴·명성/리빌드 제재/승강)만 계산하고 그 결과를
 * 그대로 반환한다 — 이 파일은 그 결과들을 다시 계산하거나 합치지 않는다. 이 파일의
 * 책임은 오직 셋이다: ① 이미 확정된 시즌을 불변 아카이브 레코드로 봉인
 * (`archiveSeason`) ② 다음 시즌 번호를 히스토리 기반으로 계산(`computeNextSeasonNumber`)
 * ③ 오케스트레이션 계층이 만든 다음 `World` 상태 후보가 "월드 리셋"에 해당하지
 * 않는지 검증(`assertNoWorldReset`). 실제 영속화(DB `INSERT`, `World` 레코드 갱신)는
 * 이 파일 밖 오케스트레이션 계층 몫이다 — `promotion.ts`가 `PromotionSwap[]`만
 * 반환하고 `TeamSeason.leagueId` 갱신을 하지 않는 것과 동일한 책임 분리.
 *
 * ## I-13 월드 리셋 금지 원칙 — 이 파일이 강제하는 3가지
 * - **시즌 히스토리는 덮어쓰지 않고 누적한다.** `archiveSeason()`은 이미 `SETTLEMENT`
 *   단계를 거쳐 `endedAt`이 확정된 시즌만 받아 그대로 봉인한다 — 값을 다시 계산하거나
 *   지어내지 않는다(`promotion.ts`가 순위를 다시 매기지 않고 그대로 읽는 태도와 동일).
 * - **`season_number`는 감소·재사용 없이 단조 증가한다.** `computeNextSeasonNumber()`는
 *   지금까지 아카이브된 전 시즌 번호 히스토리의 최댓값 + 1만 반환하며, 히스토리가
 *   손상(중복·비정수·0 이하)돼 있으면 조용히 이어 붙이지 않고 예외를 던진다 — 손상된
 *   히스토리를 못 본 척 이어가는 것 자체가 "리셋을 감지하지 못한 리셋"이기 때문이다.
 * - **`World` 레코드 자체는 시즌이 넘어가도 새로 만들어지지 않는다.**
 *   `assertNoWorldReset()`은 다음 `World` 후보가 이전과 같은 `id`/`worldSeed`를
 *   유지하는지, `currentSeasonNumber`가 정확히 증가했는지 검증한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건 — 아카이브 시각은
 * `season.endedAt`(호출자가 이미 확정해 넘긴 값)을 그대로 쓰며 이 파일이 새 타임스탬프를
 * 만들지 않는다. 타입은 `@/types` 배럴로만 import.
 */

import type { Season, TeamSeason, World } from '@/types';

/**
 * 봉인된 시즌 1건 — `Season` 본체와 그 시즌의 전 팀 최종 성적(`TeamSeason[]`)을 함께
 * 묶은 불변 히스토리 엔트리. 이후 시즌이 몇 번을 더 진행해도 이 레코드는 갱신되지
 * 않는다(I-13, "누적 시즌 히스토리가 유일한 강한 해자").
 */
export interface SeasonArchive {
  readonly season: Season;
  readonly teamSeasons: readonly TeamSeason[];
}

/**
 * `season`이 아카이브 가능한 상태인지 검증한다.
 * - `phase`가 `SETTLEMENT`여야 한다(정산 완료 전 아카이브 금지 — `PRESEASON`으로 넘어가기
 *   직전 시점에만 봉인한다).
 * - `endedAt`이 확정돼 있어야 한다(진행 중인 시즌은 아카이브 대상이 아니다).
 * - 전달된 `teamSeasons`가 전부 이 시즌 소속(`seasonId` 일치)이어야 한다.
 * - 전달된 `teamSeasons`가 전부 최종 순위(`finalRank`)를 확정하고 있어야 한다
 *   (미확정 순위로 히스토리를 봉인하면 이후 "그 시즌에 실제로 무슨 일이 있었는지"를
 *   영구히 알 수 없게 된다 — 아카이브는 되돌릴 수 없는 연산이므로 입력을 엄격히 검증한다).
 */
function assertArchivable(season: Season, teamSeasons: readonly TeamSeason[]): void {
  if (season.phase !== 'SETTLEMENT') {
    throw new Error(
      `archiveSeason: 시즌 ${season.id}의 phase='${season.phase}'는 'SETTLEMENT'여야 ` +
        `아카이브할 수 있습니다.`,
    );
  }

  if (season.endedAt === null) {
    throw new Error(`archiveSeason: 시즌 ${season.id}는 아직 endedAt이 확정되지 않았습니다.`);
  }

  teamSeasons.forEach((teamSeason) => {
    if (teamSeason.seasonId !== season.id) {
      throw new Error(
        `archiveSeason: teamSeason(teamId=${teamSeason.teamId})의 seasonId=` +
          `'${teamSeason.seasonId}'가 아카이브 대상 시즌 '${season.id}'와 다릅니다.`,
      );
    }

    if (teamSeason.finalRank === null) {
      throw new Error(
        `archiveSeason: teamSeason(teamId=${teamSeason.teamId})의 finalRank가 아직 ` +
          `확정되지 않았습니다 — 미확정 순위는 아카이브할 수 없습니다.`,
      );
    }
  });
}

/**
 * 종료된 시즌을 불변 `SeasonArchive` 레코드로 봉인한다. `season`/`teamSeasons`를
 * 다시 계산하지 않고 이미 확정된 값을 그대로 실어 반환한다 — 이 함수가 하는 일은
 * "봉인 가능 상태인지 검증"뿐이다(위 `assertArchivable` 참조).
 */
export function archiveSeason(
  season: Season,
  teamSeasons: readonly TeamSeason[],
): SeasonArchive {
  assertArchivable(season, teamSeasons);

  return { season, teamSeasons };
}

/**
 * 지금까지 아카이브된 전 시즌 번호로부터 다음 시즌 번호를 계산한다(I-13 핵심 강제 지점).
 *
 * - 히스토리가 비어 있으면(월드 최초 시즌) `1`을 반환한다.
 * - 그 외에는 히스토리 최댓값 + 1만 반환한다 — 항상 1씩 단조 증가하며, 감소·재사용은
 *   허용하지 않는다.
 * - 히스토리에 0 이하·정수가 아닌 값이 섞여 있거나 같은 번호가 중복돼 있으면 히스토리
 *   자체가 손상된 것이므로(=리셋 흔적일 수 있으므로) 다음 번호를 추측하지 않고 예외를
 *   던진다.
 */
export function computeNextSeasonNumber(archivedSeasonNumbers: readonly number[]): number {
  if (archivedSeasonNumbers.length === 0) {
    return 1;
  }

  const seen = new Set<number>();
  let max = 0;

  archivedSeasonNumbers.forEach((seasonNumber) => {
    if (!Number.isInteger(seasonNumber) || seasonNumber < 1) {
      throw new RangeError(
        `computeNextSeasonNumber: seasonNumber=${seasonNumber}는 1 이상의 정수여야 합니다 ` +
          `(히스토리 손상 — I-13 월드 리셋 금지 위반 의심).`,
      );
    }

    if (seen.has(seasonNumber)) {
      throw new Error(
        `computeNextSeasonNumber: seasonNumber=${seasonNumber}가 히스토리에 중복 등장합니다 ` +
          `(I-13 월드 리셋 금지 위반 — season_number는 재사용될 수 없습니다).`,
      );
    }

    seen.add(seasonNumber);
    max = Math.max(max, seasonNumber);
  });

  return max + 1;
}

/**
 * 다음 `World` 상태 후보가 "월드 리셋"에 해당하지 않는지 검증한다(I-13). 이 함수는
 * `World` 레코드를 만들지 않는다 — 오케스트레이션 계층이 만든 후보를 검증만 한다.
 *
 * - `id`/`worldSeed`가 이전과 같아야 한다(시즌이 넘어가도 같은 월드가 이어져야 하며,
 *   새 `World` 레코드를 만드는 것 자체가 리셋이다).
 * - `currentSeasonNumber`는 이전보다 커야 한다(감소·유지는 리셋 또는 정체이며 둘 다
 *   허용하지 않는다 — 정확히 몇 씩 증가해야 하는지는 강제하지 않는다. 그 계산은
 *   `computeNextSeasonNumber()`의 책임이고, 이 함수는 그 결과가 반영된 후보를
 *   최종적으로 재검증하는 별도의 방어선이다).
 */
export function assertNoWorldReset(
  previous: Pick<World, 'id' | 'worldSeed' | 'currentSeasonNumber'>,
  next: Pick<World, 'id' | 'worldSeed' | 'currentSeasonNumber'>,
): void {
  if (next.id !== previous.id) {
    throw new Error(
      `assertNoWorldReset: World.id가 '${previous.id}' → '${next.id}'로 바뀌었습니다 — ` +
        `월드 리셋 금지(I-13) 위반.`,
    );
  }

  if (next.worldSeed !== previous.worldSeed) {
    throw new Error(
      `assertNoWorldReset: World.worldSeed가 ${previous.worldSeed} → ${next.worldSeed}로 ` +
        `바뀌었습니다 — 월드 리셋 금지(I-13) 위반.`,
    );
  }

  if (next.currentSeasonNumber <= previous.currentSeasonNumber) {
    throw new Error(
      `assertNoWorldReset: currentSeasonNumber가 ${previous.currentSeasonNumber} → ` +
        `${next.currentSeasonNumber}로 감소하거나 그대로입니다 — season_number는 단조 ` +
        `증가해야 합니다(I-13).`,
    );
  }
}
