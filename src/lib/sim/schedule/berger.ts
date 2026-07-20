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
 *
 * ## 3연속 동일 장소 방지 — FR-LG-003 ② (26일차)
 * `detectVenueStreaks`가 생성된 대진표를 팀별 홈/원정 시퀀스(1차전 이어 2차전)로 펼쳐
 * 3연속 이상 동일 장소 스트릭을 찾는다. 이 서클법 알고리즘은 실전 규모(16/20/24팀)에서는
 * 항상 최장 스트릭 2를 만든다(전수 검증, 아래 `berger.test.ts`) — 회전 라운드마다 홈/원정을
 * 반전하는 페어링 규칙(`round % 2`) 자체가 팀0을 제외한 모든 팀의 홈/원정을 매 라운드
 * 교차시키기 때문이다. 다만 `teamCount = 4`처럼 1차전이 3라운드뿐인 극단적으로 작은
 * 리그는 **수학적으로 회피 불가능**하다 — 6개 페어(고정된 라운드 배정)의 홈/원정을
 * 어떻게 선택해도(2^6 = 64가지 전수 탐색 완료) 최장 스트릭이 3 미만으로 내려가지 않는다.
 * 이런 경우 대진표 자체를 거부하지 않고 `detectVenueStreaks`가 위반을 반환하며, **로그를
 * 남기는 주체는 호출자(오케스트레이션 계층)다** — `gk-fallback.ts` 14일차 결정과 같은
 * 근거로, 이 파일은 `console.*` 부작용 0건을 유지해 순수성(NFR-DT-001)과 테스트 용이성을
 * 지킨다(문맥 없는 엔진의 로그보다 시즌/리그 id를 아는 호출자의 로그가 더 유용하다).
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

/** 한 팀의 특정 라운드 경기 장소. */
export type FixtureVenue = 'HOME' | 'AWAY';

/**
 * FR-LG-003 ② 위반 1건 — 어떤 팀이 몇 라운드부터 몇 경기 연속으로 같은 장소(홈 또는
 * 원정)에서 뛰는지. `length`는 항상 3 이상만 담긴다(2 이하는 정상 범위, 위반 아님).
 */
export interface VenueStreak {
  readonly teamId: TeamId;
  readonly venue: FixtureVenue;
  /** 스트릭이 시작하는 라운드(1부터 시작하는 전체 라운드 번호). */
  readonly startRound: number;
  /** 연속 라운드 수(3 이상). */
  readonly length: number;
}

/**
 * `fixtures`를 팀별 라운드 순 홈/원정 시퀀스로 펼쳐 3연속 이상 동일 장소 스트릭을
 * 찾는다(FR-LG-003 ②). 위반이 없으면 빈 배열을 반환한다 — 위반 발견 시 **로그를 남기지
 * 않고 반환값으로만 알린다**(파일 상단 주석 참조, `console.*` 부작용을 두지 않는 이 파일의
 * 순수성 규약).
 *
 * **집계 기준 — "연속 경기"가 아니라 "연속 라운드"다(I-146).** 어떤 팀이 특정 라운드에
 * 경기가 없으면(결번) 그 라운드는 `venueByRound`에 항목이 없고, 위 순회는 이를
 * `undefined`로 보아 **스트릭을 끊는다**(진행 중 스트릭을 배열에 커밋하고 초기화). 즉
 * "홈 · (결번) · 홈 · 홈"은 결번 라운드에서 끊겨 3연속으로 잡히지 않는다 — 결번을 건너뛰고
 * 실제 치른 경기만 이어 세는 "연속 경기" 해석이 아니다.
 *
 * 이 함수가 받는 `fixtures`는 임의의 대진표(공개 함수)이므로, 이 파일의 현재 유일한
 * 호출부(`generateBergerDoubleRoundRobin`, 홀수 팀 입력을 예외로 거부해 결번이 원천
 * 발생하지 않음)를 벗어나 **결번이 있는 대진(컵 라운드·연기 경기 등)에 재사용할 경우** 위
 * "연속 라운드" 기준이 원하는 답(연속 경기 기준)과 다를 수 있다는 점에 주의해야 한다.
 * 그런 재사용이 필요해지면 "연속 경기" 해석을 별도 옵션/함수로 추가할지는 I-107(브래킷
 * 부전승 처리)과 함께 검토 대상으로 남긴다 — 오늘은 문서화만 하고 분기 구현은 하지 않는다.
 */
export function detectVenueStreaks(
  teamIds: readonly TeamId[],
  fixtures: readonly BergerFixture[],
): readonly VenueStreak[] {
  if (fixtures.length === 0) return [];

  const totalRounds = Math.max(...fixtures.map((f) => f.round));
  const venueByTeamRound = new Map<TeamId, Map<number, FixtureVenue>>(
    teamIds.map((teamId) => [teamId, new Map<number, FixtureVenue>()]),
  );
  for (const fixture of fixtures) {
    venueByTeamRound.get(fixture.homeTeamId)?.set(fixture.round, 'HOME');
    venueByTeamRound.get(fixture.awayTeamId)?.set(fixture.round, 'AWAY');
  }

  const streaks: VenueStreak[] = [];
  for (const teamId of teamIds) {
    const venueByRound = venueByTeamRound.get(teamId);
    if (!venueByRound) continue;

    let streakVenue: FixtureVenue | null = null;
    let streakStart = 0;
    let streakLength = 0;

    for (let round = 1; round <= totalRounds + 1; round += 1) {
      const venue = round <= totalRounds ? venueByRound.get(round) : undefined;
      if (venue !== undefined && venue === streakVenue) {
        streakLength += 1;
        continue;
      }

      if (streakVenue !== null && streakLength >= 3) {
        streaks.push({ teamId, venue: streakVenue, startRound: streakStart, length: streakLength });
      }

      streakVenue = venue ?? null;
      streakStart = round;
      streakLength = venue === undefined ? 0 : 1;
    }
  }

  return streaks;
}
