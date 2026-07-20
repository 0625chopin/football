/**
 * 원형 로테이션(Berger table) 더블 라운드로빈 일정 생성 — Task 025.
 *
 * 팀 하나(인덱스 0)를 고정하고 나머지를 한 칸씩 회전시키는 표준 서클법으로 단일
 * 라운드로빈(`teamCount - 1`라운드)을 만들고, 2차전은 1차전 각 라운드의 홈/원정을
 * 뒤집어 그대로 이어 붙인다(`2 * (teamCount - 1)`라운드, `teamCount * (teamCount - 1)`경기).
 *
 * **NFR-SC-003**: 팀 수는 리그마다 다르며 전부 공통코드 시드값(`LEAGUE_TEAM_COUNT`,
 * `src/lib/config/catalog.ts`)에서 온다 — 이 모듈은 `teamCount`를 호출자로부터 주입받는
 * 순수 함수만 두며, 어떤 팀 수도 리터럴로 갖지 않는다(2팀 소유 경로 규약, CLAUDE.md
 * "값을 함수 파라미터로 주입받는다"). 페어링 순서는 난수를 쓰지 않는 결정론적 고정
 * 알고리즘이다(NFR-DT-001).
 */

import type { TeamId } from '@/types';

export interface BergerFixture {
  /** 1부터 시작하는 전체 라운드 번호(1차전 + 2차전 통합) */
  readonly round: number;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
}

/**
 * `teamIds` 더블 라운드로빈 전체 일정을 생성한다. `teamIds.length`는 2 이상 짝수여야
 * 한다(위반 시 예외 — 홀수 리그는 이 알고리즘의 전제 밖이라 바이(bye) 처리를 하지 않는다).
 */
export function generateBergerDoubleRoundRobin(
  teamIds: readonly TeamId[],
): readonly BergerFixture[] {
  const teamCount = teamIds.length;
  if (teamCount < 2 || teamCount % 2 !== 0) {
    throw new Error(
      `generateBergerDoubleRoundRobin: teamIds 길이는 2 이상 짝수여야 합니다 (받은 값: ${teamCount}).`,
    );
  }

  const firstLeg = bergerSingleRoundRobin(teamIds);
  const secondLegRoundOffset = firstLeg.length;

  const fixtures: BergerFixture[] = [];
  firstLeg.forEach((pairings, roundIndex) => {
    for (const [homeTeamId, awayTeamId] of pairings) {
      fixtures.push({ round: roundIndex + 1, homeTeamId, awayTeamId });
    }
  });
  firstLeg.forEach((pairings, roundIndex) => {
    for (const [homeTeamId, awayTeamId] of pairings) {
      fixtures.push({
        round: secondLegRoundOffset + roundIndex + 1,
        homeTeamId: awayTeamId,
        awayTeamId: homeTeamId,
      });
    }
  });

  return fixtures;
}

/**
 * 단일 라운드로빈(`teamCount - 1`라운드) 페어링을 서클법으로 만든다. 팀0을 고정하고
 * 나머지를 한 칸씩 회전시키며, 라운드 홀/짝에 따라 홈/원정을 번갈아 팀0이 매 라운드
 * 홈으로 고정되는 편향을 막는다.
 */
function bergerSingleRoundRobin(
  teamIds: readonly TeamId[],
): readonly (readonly [TeamId, TeamId])[][] {
  const teamCount = teamIds.length;
  const rotating = [...teamIds];
  const rounds: (readonly [TeamId, TeamId])[][] = [];

  for (let round = 0; round < teamCount - 1; round += 1) {
    const pairings: [TeamId, TeamId][] = [];
    for (let i = 0; i < teamCount / 2; i += 1) {
      const a = rotating[i];
      const b = rotating[teamCount - 1 - i];
      pairings.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairings);

    const last = rotating[teamCount - 1];
    for (let i = teamCount - 1; i > 1; i -= 1) {
      rotating[i] = rotating[i - 1];
    }
    rotating[1] = last;
  }

  return rounds;
}
