/**
 * `src/lib/sim/knockout/playoff.ts` — Task 027(40일차) "리그별 플레이오프 브래킷 생성".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 40일차 행. 근거:
 * `docs/require/03-functional-requirements.md` FR-LG-011(리그1 10팀)·FR-LG-012(리그2
 * 4팀)·FR-LG-013(리그3 2팀) — 세 조문 모두 [확정].
 *
 * ## 완료 판정 — "경기 수 정확"
 * 리그1 = WC 2 + 8강 4 + 4강 2 + 결승 1 = **9경기**, 리그2 = 준결승 2 + 결승 1 = **3경기**,
 * 리그3 = 결승 1 = **1경기**(FR-LG-011~013 수용 기준 ①). 이 파일의 각 라운드 생성 함수가
 * 반환하는 배열 길이가 그 경기 수와 정확히 일치해야 한다 — `*.test.ts`가 이를 값으로 증명한다.
 *
 * ## `knockout/` 신설 — 이 파일이 첫 입주자
 * `standing/playoff-tiebreak.ts`(36일차) 헤더가 이미 "실제 넉아웃 대진 편성 전체는 27번
 * Task `knockout/`가 아직 없다"고 예고했다 — 여기서 그 디렉터리가 생긴다. 승강 경계
 * 결정전(`TIEBREAK`)과는 **다른 대회**(`competitionType = 'PLAYOFF'`)이므로 그 파일과
 * 로직을 공유하지 않는다. 다만 "아직 `Fixture`가 아닌 초안만 반환한다"는 패턴은 그대로
 * 물려받는다(`PlayoffFixtureDraft` — 브랜드 ID·`matchSeed`·`snapshotId`·`kickoffAt`은
 * 오케스트레이션 계층이 채운다, `src/types/brand.ts` "생성은 이 파일 밖에서 하지 않는다"
 * 원칙 및 `berger.ts`의 `BergerFixture`와 동일 패턴).
 *
 * ## 라운드 사이 의존성 — 왜 함수가 라운드별로 분리되어 있는가
 * 넉아웃은 다음 라운드 대진이 **이전 라운드 결과**(누가 이겼는가)에 좌우된다. 이 모듈은
 * 순수 함수 계층이라 경기를 직접 시뮬레이션하지 않으므로(그건 `match/`의 몫), 각 라운드는
 * "이전 라운드 승자"를 오케스트레이션 계층으로부터 **시드 번호로** 주입받는다(팀 ID가 아니라
 * 시드 번호인 이유는 아래 "왜 시드 번호인가" 절 참조). 승자 판정 자체(스코어→승자)는
 * `resolveKnockoutWinnerSeed()`가 제공한다(D-19: 승부차기 골은 판정에만 쓰고 `goals`
 * 누적에는 포함하지 않는다 — `match/penalty.ts`의 `winnerTeamId` 계산과 동일 원칙).
 *
 * ## 왜 승자를 팀 ID가 아니라 시드 번호로 주입받는가
 * FR-LG-011의 8강 대진 "1 vs WC저순위승자, 2 vs WC고순위승자"는 **원 시드 순위 비교**로
 * 정의된다 — 어느 팀이 이겼는지가 아니라 "이긴 팀의 원래 시드가 몇 번이었는가"가 다음
 * 라운드 대진을 결정한다. 시드 번호를 받으면 해당 팀 ID는 `seeds[seed - 1]`로 항상 복원
 * 가능하므로(팀 ID 중복 전달 없이) 호출자는 "어느 시드가 이겼는지"만 넘기면 된다.
 *
 * ## 4강 대진(리그1) — 요구사항 원문에 없는 설계 결정
 * FR-LG-011 원문은 8강까지만 대진을 명시하고 4강은 "단판(홈=상위 순위)"이라고만 적혀
 * 브래킷의 어느 쪽이 어느 쪽과 만나는지는 규정하지 않는다. 이 파일은 **표준 싱글엘리미네이션
 * 브래킷 반대편 배치**(스포츠 대회의 통상 관행 — 1번 시드와 2번 시드가 결승 전에는 만나지
 * 않도록 대진 양쪽을 분리)를 채택한다: 8강을 생성 순서 `[1위 vs WC저순위, 2위 vs WC고순위,
 * 3위 vs 6위, 4위 vs 5위]`로 고정하고, 4강은 `(0번 승자 vs 3번 승자)`·`(1번 승자 vs 2번
 * 승자)`로 짝짓는다 — 1위 쪽과 4위/5위 쪽이 한 편, 2위 쪽과 3위/6위 쪽이 다른 편이 되어
 * 1위·2위(결승 전까지 최상위 두 시드)가 4강에서 이미 만나는 불균형을 피한다. **요구사항에
 * 명시되지 않은 추론이므로 이슈 후보로 등재 대상.**
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 타입은 `@/types`
 * 배럴로만 import. 정수 스코어 비교만 하므로 `rng/precision.ts`(확률 소수 비교용) 대상이
 * 아니다.
 */

import type { CompetitionType, LeagueId, SeasonId, TeamId } from '@/types';

/** 이 파일이 다루는 넉아웃 스테이지 4종. 리그마다 부분집합만 쓴다(리그3 = FINAL만). */
export type PlayoffStage = 'WILDCARD' | 'QUARTERFINAL' | 'SEMIFINAL' | 'FINAL';

const PLAYOFF: CompetitionType = 'PLAYOFF';

/**
 * 아직 `Fixture`가 아닌 초안. 브랜드 ID·`matchSeed`·`snapshotId`·`kickoffAt`·`attendance`는
 * 오케스트레이션 계층이 채운다(`standing/playoff-tiebreak.ts`의 `TiebreakFixtureDraft`와
 * 동일 패턴).
 */
export interface PlayoffFixtureDraft {
  readonly seasonId: SeasonId;
  readonly leagueId: LeagueId;
  readonly competitionType: CompetitionType;
  /** 대회 전체를 관통하는 연속 라운드 번호(리그1: WC=1·8강=2·4강=3·결승=4). */
  readonly round: number;
  /** 표시용 원시 라벨(번역 비대상, T13) — 예: "와일드카드". */
  readonly roundLabel: string;
  readonly stage: PlayoffStage;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  /** 홈팀의 원 시드 번호(1부터) — 다음 라운드 대진 계산·디버깅용 메타데이터. */
  readonly homeSeed: number;
  /** 원정팀의 원 시드 번호(1부터). */
  readonly awaySeed: number;
  /** 결승만 true(FR-LG-011~013 "결승 중립지 단판", 수용 기준 "결승에서 홈 어드밴티지 미적용"). */
  readonly isNeutral: boolean;
}

/** 이전 라운드 한 경기의 승자 — 팀 ID가 아니라 원 시드 번호로 표현한다(파일 헤더 참조). */
export interface PlayoffAdvancement {
  readonly winnerSeed: number;
}

function assertSeedCount(seeds: readonly TeamId[], expected: number, fnName: string): void {
  if (seeds.length !== expected) {
    throw new RangeError(
      `${fnName}: seeds.length는 ${expected}이어야 합니다 (받은 값: ${seeds.length}).`,
    );
  }
  if (new Set(seeds).size !== seeds.length) {
    throw new RangeError(`${fnName}: seeds에 중복된 teamId가 있습니다.`);
  }
}

function teamOfSeed(seeds: readonly TeamId[], seed: number, fnName: string): TeamId {
  const team = seeds[seed - 1];
  if (team === undefined) {
    throw new RangeError(`${fnName}: seed=${seed}는 유효 범위(1~${seeds.length}) 밖입니다.`);
  }
  return team;
}

function draft(
  seasonId: SeasonId,
  leagueId: LeagueId,
  round: number,
  roundLabel: string,
  stage: PlayoffStage,
  homeSeed: number,
  homeTeamId: TeamId,
  awaySeed: number,
  awayTeamId: TeamId,
  isNeutral: boolean,
): PlayoffFixtureDraft {
  return {
    seasonId,
    leagueId,
    competitionType: PLAYOFF,
    round,
    roundLabel,
    stage,
    homeTeamId,
    awayTeamId,
    homeSeed,
    awaySeed,
    isNeutral,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 리그1 (10팀) — FR-LG-011: WC 2 + 8강 4 + 4강 2 + 결승 1 = 9경기
// ─────────────────────────────────────────────────────────────────────────

const LEAGUE1_SEED_COUNT = 10;

/**
 * 와일드카드 라운드 — 7위 vs 10위, 8위 vs 9위(홈 = 상위 순위). `seeds`는 정규시즌 최종
 * 순위 1~10위 순으로 정렬된 팀 ID 배열이어야 한다.
 */
export function generateLeague1WildcardRound(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
): readonly PlayoffFixtureDraft[] {
  assertSeedCount(seeds, LEAGUE1_SEED_COUNT, 'generateLeague1WildcardRound');
  return [
    draft(seasonId, leagueId, 1, '와일드카드', 'WILDCARD', 7, seeds[6], 10, seeds[9], false),
    draft(seasonId, leagueId, 1, '와일드카드', 'WILDCARD', 8, seeds[7], 9, seeds[8], false),
  ];
}

/**
 * 8강 — 1~6위 + WC 승자 2팀. 대진 = 1 vs WC저순위승자, 2 vs WC고순위승자, 3 vs 6, 4 vs 5
 * (홈 = 상위 순위). `wildcardWinners`는 `generateLeague1WildcardRound()`가 만든 두 경기
 * (7v10, 8v9) 각각의 승자 시드를 순서 무관하게 정확히 2개 담아야 한다.
 */
export function generateLeague1QuarterfinalRound(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
  wildcardWinners: readonly PlayoffAdvancement[],
): readonly PlayoffFixtureDraft[] {
  assertSeedCount(seeds, LEAGUE1_SEED_COUNT, 'generateLeague1QuarterfinalRound');
  if (wildcardWinners.length !== 2) {
    throw new RangeError(
      `generateLeague1QuarterfinalRound: wildcardWinners는 정확히 2건이어야 합니다 ` +
        `(받은 값: ${wildcardWinners.length}).`,
    );
  }
  const winnerSeeds = wildcardWinners.map((w) => w.winnerSeed);
  const validWinnerSeeds = new Set([7, 8, 9, 10]);
  for (const seed of winnerSeeds) {
    if (!validWinnerSeeds.has(seed)) {
      throw new RangeError(
        `generateLeague1QuarterfinalRound: winnerSeed=${seed}는 와일드카드 참가 시드(7~10) 밖입니다.`,
      );
    }
  }
  const [pair1, pair2] = [
    winnerSeeds.filter((s) => s === 7 || s === 10),
    winnerSeeds.filter((s) => s === 8 || s === 9),
  ];
  if (pair1.length !== 1 || pair2.length !== 1) {
    throw new RangeError(
      'generateLeague1QuarterfinalRound: wildcardWinners는 (7 또는 10) 중 1개, (8 또는 9) 중 1개여야 합니다.',
    );
  }

  // 두 승자 중 시드 번호가 작은 쪽(=원 순위가 높은 쪽)이 "WC고순위승자", 큰 쪽이 "WC저순위승자".
  const higherWinnerSeed = Math.min(pair1[0], pair2[0]);
  const lowerWinnerSeed = Math.max(pair1[0], pair2[0]);

  const seed1 = teamOfSeed(seeds, 1, 'generateLeague1QuarterfinalRound');
  const seed2 = teamOfSeed(seeds, 2, 'generateLeague1QuarterfinalRound');
  const seed3 = teamOfSeed(seeds, 3, 'generateLeague1QuarterfinalRound');
  const seed4 = teamOfSeed(seeds, 4, 'generateLeague1QuarterfinalRound');
  const seed5 = teamOfSeed(seeds, 5, 'generateLeague1QuarterfinalRound');
  const seed6 = teamOfSeed(seeds, 6, 'generateLeague1QuarterfinalRound');
  const lowerWinnerTeam = teamOfSeed(seeds, lowerWinnerSeed, 'generateLeague1QuarterfinalRound');
  const higherWinnerTeam = teamOfSeed(seeds, higherWinnerSeed, 'generateLeague1QuarterfinalRound');

  return [
    draft(seasonId, leagueId, 2, '8강', 'QUARTERFINAL', 1, seed1, lowerWinnerSeed, lowerWinnerTeam, false),
    draft(seasonId, leagueId, 2, '8강', 'QUARTERFINAL', 2, seed2, higherWinnerSeed, higherWinnerTeam, false),
    draft(seasonId, leagueId, 2, '8강', 'QUARTERFINAL', 3, seed3, 6, seed6, false),
    draft(seasonId, leagueId, 2, '8강', 'QUARTERFINAL', 4, seed4, 5, seed5, false),
  ];
}

/**
 * 4강 — `quarterfinalWinners`는 `generateLeague1QuarterfinalRound()`가 반환한 배열의
 * **순서 그대로**(인덱스 0~3 = "1위 쪽"·"2위 쪽"·"3위 쪽"·"4위 쪽" 경기) 승자 시드 4개를
 * 담아야 한다. 표준 브래킷 반대편 배치(파일 헤더 참조)로 0번↔3번, 1번↔2번을 묶는다.
 */
export function generateLeague1SemifinalRound(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
  quarterfinalWinners: readonly [
    PlayoffAdvancement,
    PlayoffAdvancement,
    PlayoffAdvancement,
    PlayoffAdvancement,
  ],
): readonly PlayoffFixtureDraft[] {
  assertSeedCount(seeds, LEAGUE1_SEED_COUNT, 'generateLeague1SemifinalRound');
  if (quarterfinalWinners.length !== 4) {
    throw new RangeError('generateLeague1SemifinalRound: quarterfinalWinners는 정확히 4건이어야 합니다.');
  }

  const pairSeeds = (aIdx: number, bIdx: number): readonly [number, number] => {
    const a = quarterfinalWinners[aIdx].winnerSeed;
    const b = quarterfinalWinners[bIdx].winnerSeed;
    return a <= b ? [a, b] : [b, a];
  };

  const [home1, away1] = pairSeeds(0, 3);
  const [home2, away2] = pairSeeds(1, 2);

  return [
    draft(
      seasonId,
      leagueId,
      3,
      '4강',
      'SEMIFINAL',
      home1,
      teamOfSeed(seeds, home1, 'generateLeague1SemifinalRound'),
      away1,
      teamOfSeed(seeds, away1, 'generateLeague1SemifinalRound'),
      false,
    ),
    draft(
      seasonId,
      leagueId,
      3,
      '4강',
      'SEMIFINAL',
      home2,
      teamOfSeed(seeds, home2, 'generateLeague1SemifinalRound'),
      away2,
      teamOfSeed(seeds, away2, 'generateLeague1SemifinalRound'),
      false,
    ),
  ];
}

/** 결승 — 중립지 단판, 홈 어드밴티지 미적용(`isNeutral: true`). */
export function generateLeague1FinalRound(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
  semifinalWinners: readonly [PlayoffAdvancement, PlayoffAdvancement],
): readonly PlayoffFixtureDraft[] {
  assertSeedCount(seeds, LEAGUE1_SEED_COUNT, 'generateLeague1FinalRound');
  return [buildFinalDraft(seasonId, leagueId, seeds, semifinalWinners, 4, 'generateLeague1FinalRound')];
}

function buildFinalDraft(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
  finalists: readonly [PlayoffAdvancement, PlayoffAdvancement],
  round: number,
  fnName: string,
): PlayoffFixtureDraft {
  if (finalists.length !== 2) {
    throw new RangeError(`${fnName}: 결승 진출자는 정확히 2팀이어야 합니다.`);
  }
  const [a, b] = finalists;
  const homeSeed = Math.min(a.winnerSeed, b.winnerSeed);
  const awaySeed = Math.max(a.winnerSeed, b.winnerSeed);
  if (homeSeed === awaySeed) {
    throw new RangeError(`${fnName}: 결승 진출자 두 시드가 동일합니다(${homeSeed}).`);
  }
  return draft(
    seasonId,
    leagueId,
    round,
    '결승',
    'FINAL',
    homeSeed,
    teamOfSeed(seeds, homeSeed, fnName),
    awaySeed,
    teamOfSeed(seeds, awaySeed, fnName),
    true,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 리그2 (4팀) — FR-LG-012: 준결승 2 + 결승 1 = 3경기
// ─────────────────────────────────────────────────────────────────────────

const LEAGUE2_SEED_COUNT = 4;

/** 준결승 — 1 vs 4, 2 vs 3(홈 = 상위 순위). */
export function generateLeague2SemifinalRound(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
): readonly PlayoffFixtureDraft[] {
  assertSeedCount(seeds, LEAGUE2_SEED_COUNT, 'generateLeague2SemifinalRound');
  const [seed1, seed2, seed3, seed4] = seeds;
  return [
    draft(seasonId, leagueId, 1, '준결승', 'SEMIFINAL', 1, seed1, 4, seed4, false),
    draft(seasonId, leagueId, 1, '준결승', 'SEMIFINAL', 2, seed2, 3, seed3, false),
  ];
}

/** 결승 — 중립지 단판. */
export function generateLeague2FinalRound(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
  semifinalWinners: readonly [PlayoffAdvancement, PlayoffAdvancement],
): readonly PlayoffFixtureDraft[] {
  assertSeedCount(seeds, LEAGUE2_SEED_COUNT, 'generateLeague2FinalRound');
  return [buildFinalDraft(seasonId, leagueId, seeds, semifinalWinners, 2, 'generateLeague2FinalRound')];
}

// ─────────────────────────────────────────────────────────────────────────
// 리그3 (2팀) — FR-LG-013: 결승 1경기
// ─────────────────────────────────────────────────────────────────────────

const LEAGUE3_SEED_COUNT = 2;

/** 결승 — 1위 vs 2위, 중립지 단판(라운드가 이것 하나뿐이라 홈/원정은 시드 순으로 고정). */
export function generateLeague3FinalRound(
  seasonId: SeasonId,
  leagueId: LeagueId,
  seeds: readonly TeamId[],
): readonly PlayoffFixtureDraft[] {
  assertSeedCount(seeds, LEAGUE3_SEED_COUNT, 'generateLeague3FinalRound');
  const [seed1, seed2] = seeds;
  return [draft(seasonId, leagueId, 1, '결승', 'FINAL', 1, seed1, 2, seed2, true)];
}

// ─────────────────────────────────────────────────────────────────────────
// 공통 — 완료된 넉아웃 경기의 승자 판정 (D-19)
// ─────────────────────────────────────────────────────────────────────────

/**
 * 완료된 넉아웃 경기 1건의 스코어. 정규+연장(D-19: 연장 득점 포함)이 같으면 승부차기로
 * 판정한다(D-19: 승부차기 득점은 판정 전용, `goals` 등 통산 집계에 포함하지 않는다 —
 * 그 원칙은 `match/penalty.ts`가 이미 지키므로 여기서는 최종 스코어만 받는다).
 */
export interface KnockoutFixtureScore {
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly etHomeScore: number | null;
  readonly etAwayScore: number | null;
  readonly pkHome: number | null;
  readonly pkAway: number | null;
}

/**
 * 완료된 넉아웃 경기의 승자 팀 ID를 판정한다. 정규+연장 합산이 갈리면 그 결과로, 같으면
 * 승부차기 스코어로 판정한다(무승부로 끝날 수 없는 대회이므로 정규+연장+PK가 모두
 * 동률이면 입력 오류로 간주해 예외를 던진다).
 */
export function resolveKnockoutWinnerTeamId(fixture: KnockoutFixtureScore): TeamId {
  const homeTotal = fixture.homeScore + (fixture.etHomeScore ?? 0);
  const awayTotal = fixture.awayScore + (fixture.etAwayScore ?? 0);
  if (homeTotal !== awayTotal) {
    return homeTotal > awayTotal ? fixture.homeTeamId : fixture.awayTeamId;
  }
  if (fixture.pkHome === null || fixture.pkAway === null) {
    throw new RangeError(
      'resolveKnockoutWinnerTeamId: 정규+연장이 동률인데 승부차기 스코어가 없습니다 ' +
        '(넉아웃 경기는 반드시 승자가 확정돼야 합니다).',
    );
  }
  if (fixture.pkHome === fixture.pkAway) {
    throw new RangeError(
      `resolveKnockoutWinnerTeamId: 승부차기 스코어가 동률입니다(${fixture.pkHome}:${fixture.pkAway}) — ` +
        '서든데스로 반드시 갈려야 합니다.',
    );
  }
  return fixture.pkHome > fixture.pkAway ? fixture.homeTeamId : fixture.awayTeamId;
}
