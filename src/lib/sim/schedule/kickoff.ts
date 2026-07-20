/**
 * 리그별 라운드 킥오프 시각 산출 — Task 025 (27일차).
 *
 * `berger.ts`가 만드는 라운드 번호(`BergerFixture.round`)에 실제 킥오프 시각을 입힌다.
 * 리그별 라운드 간격(`ROUND_INTERVAL_MIN` 공통코드, 예: LEAGUE_1=75/LEAGUE_2=90/LEAGUE_3=115)과
 * REGULAR 페이즈 총 길이(`PHASE_DURATION_MIN.REGULAR` 공통코드, 예: 3,450분)는 전부
 * **호출자가 주입**한다 — 이 파일은 어떤 간격·팀 수·페이즈 길이도 리터럴로 갖지 않는다
 * (CLAUDE.md "값을 함수 파라미터로 주입받는다", NFR-CFG-001, `berger.ts`와 동일 규약).
 *
 * ## I-12 라운드 오프셋 — 리그별 라운드를 어긋나게 배치해 공백 축소
 * 모든 리그의 1라운드가 같은 시각에 몰리면 그 이후 라운드도 리그 간격 배수 시각에 뭉치기
 * 쉽다(예: 75분 간격 리그와 115분 간격 리그가 우연히 같은 시각에 겹치는 라운드가 반복).
 * `computeLeagueRoundOffsetsMin`이 리그 배열 순서에 따라 **가장 촘촘한 간격(최소값)을
 * 리그 수로 나눈 만큼** 각 리그의 시작을 어긋나게 만든다 — 리그 수는 입력 배열의 길이에서
 * 구조적으로 얻으므로(`leagues.length`) "리그가 3개"라는 리터럴을 두지 않는다.
 *
 * ## 최종 라운드 강제 정렬
 * 리그별 라운드 수 × 간격은 자연스럽게 REGULAR 페이즈 길이와 맞아떨어지지 않는다(예:
 * 46라운드×75분=3,375분, 38라운드×90분=3,330분 — 목표 3,450분과 다름). 그래서 1라운드는
 * I-12 오프셋에 고정하고, 그 뒤 라운드 간격을 **선형으로 균등 신장/압축**해 마지막 라운드가
 * 정확히 `regularPhaseDurationMin`에 오도록 강제한다(`scaleFactor`). 리그별 간격 값은
 * 이 신장의 기준(가중치)으로만 쓰이고, 정렬 지점(마지막 라운드)은 항상 고정된다.
 */

import type { LeagueId, Timestamp } from '@/types';
import type { BergerFixture } from './berger';

/** 킥오프 산출에 필요한 리그 1개분 입력. 값은 전부 호출자가 공통코드에서 꺼내 주입한다. */
export interface LeagueKickoffInput {
  readonly leagueId: LeagueId;
  /** 해당 리그 전체 라운드 수(1차전+2차전 통합, 예: `generateBergerDoubleRoundRobin` 결과의 최대 `round`). 1 이상 정수. */
  readonly totalRounds: number;
  /** `ROUND_INTERVAL_MIN.LEAGUE_N` 등 공통코드에서 주입되는 라운드 간격(분). 0보다 커야 한다. */
  readonly roundIntervalMin: number;
}

/** 리그 1개분 킥오프 산출 결과. */
export interface LeagueKickoffSchedule {
  readonly leagueId: LeagueId;
  /** I-12로 실제 적용된 1라운드 오프셋(분, 앵커 기준). */
  readonly roundOffsetMin: number;
  /** 라운드 번호(1부터) → 킥오프 시각. */
  readonly kickoffByRound: ReadonlyMap<number, Timestamp>;
}

/**
 * 리그별 1라운드 시작을 어긋나게 하는 오프셋(분)을 계산한다(I-12). 입력 배열의 **순서**가
 * 곧 오프셋 배정 순서다 — 몇 번째 리그인지는 호출자가 정한다(이 함수는 정렬하지 않는다).
 * 가장 촘촘한 간격(최소값)을 리그 수로 나눈 값을 기본 스텝으로 써서, 그 스텝만큼씩 뒤로
 * 밀며 리그 간 1라운드 킥오프가 겹치지 않게 한다. 리그가 1개 이하이면 오프셋은 전부 0이다.
 */
export function computeLeagueRoundOffsetsMin(
  roundIntervalsMin: readonly number[],
): readonly number[] {
  if (roundIntervalsMin.length <= 1) {
    return roundIntervalsMin.map(() => 0);
  }
  for (const interval of roundIntervalsMin) {
    if (!(interval > 0)) {
      throw new Error(
        `computeLeagueRoundOffsetsMin: roundIntervalsMin은 전부 0보다 커야 합니다 (받은 값: ${interval}).`,
      );
    }
  }

  const leagueCount = roundIntervalsMin.length;
  const baseCycleMin = Math.min(...roundIntervalsMin);
  const stepMin = baseCycleMin / leagueCount;

  return roundIntervalsMin.map((_, index) => Math.round(index * stepMin));
}

/** `anchor`(ISO 문자열)에 `minutes`(분, 소수 가능)를 더한 새 `Timestamp`를 반환한다. */
function addMinutes(anchor: Timestamp, minutes: number): Timestamp {
  const anchorMs = new Date(anchor).getTime();
  if (Number.isNaN(anchorMs)) {
    throw new Error(`addMinutes: anchor가 유효한 ISO 타임스탬프가 아닙니다 (받은 값: "${anchor}").`);
  }
  return new Date(anchorMs + Math.round(minutes) * 60_000).toISOString();
}

/**
 * 리그 하나의 라운드별 킥오프 시각을 산출한다. 1라운드는 `roundOffsetMin`에 고정하고,
 * 마지막 라운드는 항상 `anchor + regularPhaseDurationMin`에 강제 정렬한다(완료 판정).
 * 그 사이 라운드는 `roundIntervalMin`을 기준 가중치로 선형 보간한다.
 *
 * `totalRounds === 1`이면 유일한 라운드가 곧 마지막 라운드이므로 오프셋과 무관하게
 * `regularPhaseDurationMin`에 정렬된다(강제 정렬이 오프셋보다 우선).
 */
function computeSingleLeagueKickoffs(
  input: LeagueKickoffInput,
  anchor: Timestamp,
  regularPhaseDurationMin: number,
  roundOffsetMin: number,
): ReadonlyMap<number, Timestamp> {
  const { totalRounds, roundIntervalMin } = input;
  if (!Number.isInteger(totalRounds) || totalRounds < 1) {
    throw new Error(
      `computeSingleLeagueKickoffs: totalRounds는 1 이상 정수여야 합니다 (받은 값: ${totalRounds}).`,
    );
  }
  if (!(roundIntervalMin > 0)) {
    throw new Error(
      `computeSingleLeagueKickoffs: roundIntervalMin은 0보다 커야 합니다 (받은 값: ${roundIntervalMin}).`,
    );
  }
  if (!(regularPhaseDurationMin > roundOffsetMin)) {
    throw new Error(
      'computeSingleLeagueKickoffs: regularPhaseDurationMin은 roundOffsetMin보다 커야 최종 라운드 ' +
        `강제 정렬이 가능합니다 (regularPhaseDurationMin=${regularPhaseDurationMin}, roundOffsetMin=${roundOffsetMin}).`,
    );
  }

  const kickoffByRound = new Map<number, Timestamp>();

  if (totalRounds === 1) {
    kickoffByRound.set(1, addMinutes(anchor, regularPhaseDurationMin));
    return kickoffByRound;
  }

  const naiveLastOffsetMin = (totalRounds - 1) * roundIntervalMin;
  const scaleFactor = (regularPhaseDurationMin - roundOffsetMin) / naiveLastOffsetMin;

  for (let round = 1; round <= totalRounds; round += 1) {
    const offsetMin = roundOffsetMin + (round - 1) * roundIntervalMin * scaleFactor;
    kickoffByRound.set(round, addMinutes(anchor, offsetMin));
  }

  return kickoffByRound;
}

/**
 * 여러 리그의 라운드별 킥오프 시각을 한 번에 산출한다. `leagues` 순서가 I-12 오프셋
 * 배정 순서다(오프셋은 `computeLeagueRoundOffsetsMin` 참조). 리그마다 최종 라운드는
 * 항상 `anchor + regularPhaseDurationMin`에 강제 정렬된다.
 */
export function planLeagueKickoffs(
  leagues: readonly LeagueKickoffInput[],
  anchor: Timestamp,
  regularPhaseDurationMin: number,
): readonly LeagueKickoffSchedule[] {
  const roundOffsetsMin = computeLeagueRoundOffsetsMin(leagues.map((l) => l.roundIntervalMin));

  return leagues.map((league, index) => {
    const roundOffsetMin = roundOffsetsMin[index];
    return {
      leagueId: league.leagueId,
      roundOffsetMin,
      kickoffByRound: computeSingleLeagueKickoffs(league, anchor, regularPhaseDurationMin, roundOffsetMin),
    };
  });
}

/** `BergerFixture`에 킥오프 시각을 붙인 결과. */
export interface ScheduledFixture extends BergerFixture {
  readonly kickoffAt: Timestamp;
}

/**
 * `berger.ts`가 만든 대진표에 라운드별 킥오프 시각을 입힌다. `kickoffByRound`에 없는
 * 라운드가 하나라도 있으면 예외를 던진다(스케줄 산출과 대진표 생성이 어긋난 상태를 조용히
 * 넘기지 않기 위함).
 */
export function attachKickoffTimes(
  fixtures: readonly BergerFixture[],
  kickoffByRound: ReadonlyMap<number, Timestamp>,
): readonly ScheduledFixture[] {
  return fixtures.map((fixture) => {
    const kickoffAt = kickoffByRound.get(fixture.round);
    if (kickoffAt === undefined) {
      throw new Error(
        `attachKickoffTimes: ${fixture.round}라운드에 대한 킥오프 시각이 kickoffByRound에 없습니다.`,
      );
    }
    return { ...fixture, kickoffAt };
  });
}
