/**
 * 통계 도메인 타입 — **E-19 ~ E-23, E-31, E-32 완성** (4~5일차, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.6절(통계) / 5.9절(명예),
 * FR-ST-001(선수 지표 풀세트) / FR-ST-002(클럽 지표 풀세트)
 *
 * **5일차(07-27) 추가**: E-21 PlayerCareerStat / E-22 TeamSeasonStat / E-23 Standing +
 * E-31 Award / E-32 Trophy(명예, 5.9절). Award/Trophy는 금액 축이 없는 순수 기록이라
 * `economy.ts`(계약·이동·스폰서 등 금액 축 도메인) 대신 통계·기록 성격이 같은 이 파일에 둔다
 * — 4일차 economy.ts 배치 원칙("소비자 기준 금액 축 공유")과 대칭되는 근거다.
 *
 * **48일차(2026-09-24) 추가**: `PlayerSeasonStat`·`PlayerCareerStat`에 `avgRating`(D-34,
 * I-238) — **`PlayerStatCoreValues`에는 넣지 않는다.** 상세 근거는 `PlayerSeasonStat.
 * avgRating` 인라인 주석 참조. `PlayerStatCoreValues` 56필드는 이번 반영으로 변경되지 않는다.
 *
 * **미결 I-19 해소(5일차)** — 승부차기 분리 브랜드 타입의 생성 책임 소재:
 * PSO 스코어(`Fixture.pkHome`/`pkAway`)는 브랜드 타입을 별도로 만들지 않기로 한다(오늘 판단).
 * 대신 **구조적 분리**(별도 필드 + `PlayerStatCoreValues`/`PlayerCareerStat`이 PSO 이벤트를
 * 애초에 집계하지 않는 것)로 오용을 차단한다 — 브랜드가 필요할 만큼 값이 여러 계층을
 * 통과하지 않는다(엔진이 계산한 PSO 스코어는 `Fixture` 갱신 1곳에만 쓰이고, 통계 집계
 * 파이프라인(FR-ST-005)에 재입력되지 않는다). 따라서 "생성 책임"은 **2팀 엔진의 `Fixture`
 * 갱신 단계 단일 지점**이며, 이후 어떤 계층도 PSO 값을 재생성/재계산하지 않는다. 향후 값이
 * 추가 계층(예: 배팅 정산)을 통과하게 되면 그 시점에 브랜드 재검토(이슈 재등록).
 *
 * 착수 전 확인한 원칙 (`docs/devStep/02.타입스키마설계원칙.md`):
 * - **T16 (D-19)**: `goals`(정규+연장)와 **승부차기 기록을 별도 필드/별도 타입으로 분리**한다.
 *   → PSO 골은 이 파일 어디에도 없다. `MatchEvent`가 `PENALTY_SHOOTOUT` 이벤트로,
 *   `Fixture.pkHome`/`pkAway`가 승부차기 스코어로 별도 관리하므로 `goals` 계열 합산 지표는
 *   구조적으로 PSO 값을 받을 수 없다(T17 충족).
 * - **C-23 ④**: 파생 지표(선수 평점·xG·점유율)는 **노출된 이벤트에서 재계산한 값**만 담는다.
 * - **"합산형만 저장, 파생 비율은 계산"(E-19 원문)**: `PlayerStatCoreValues`에는 그룹별
 *   합산 지표만 담고, 비율형 파생 지표(`shot_accuracy`, `conversion_rate`, `pass_accuracy`,
 *   `duel_win_rate`, `save_percentage`)는 필드로 두지 않는다 — 조회 시점에 계산한다.
 *   `TeamSeasonStat`(E-22)에도 동일 원칙을 적용한다(R-03: "TeamSeasonStat은 이벤트에서
 *   파생되며 언제든 재계산 가능해야 한다").
 */

import type { AwardScope, AwardType, CompetitionType, TrophyType } from './enums';
import type {
  AwardId,
  FixtureId,
  LeagueId,
  ManagerId,
  PlayerId,
  Points,
  SeasonId,
  TeamId,
  TrophyId,
} from './brand';

/**
 * 선수 스탯 합산 지표 공유 블록(FR-ST-001, 비율형 파생 지표 제외).
 * `PlayerMatchStat`(E-19)과 `PlayerSeasonStat`(E-20)이 함께 참조해 필드 중복 선언을
 * 만들지 않는다(`PlayerAttributeValues`와 동일한 단일 선언 패턴, 체크리스트 C-6).
 */
export interface PlayerStatCoreValues {
  // 출전
  readonly appearances: number;
  readonly starts: number;
  readonly subAppearances: number;
  readonly minutesPlayed: number;
  // 공격 (shotAccuracy·conversionRate는 파생 — 미포함)
  readonly goals: number;
  readonly assists: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly xg: number;
  readonly xa: number;
  readonly bigChancesCreated: number;
  readonly bigChancesMissed: number;
  readonly penaltiesTaken: number;
  readonly penaltiesScored: number;
  readonly freeKickGoals: number;
  readonly headedGoals: number;
  readonly ownGoals: number;
  // 패스 (passAccuracy는 파생 — 미포함)
  readonly passesAttempted: number;
  readonly passesCompleted: number;
  readonly keyPasses: number;
  readonly longBallsAttempted: number;
  readonly longBallsCompleted: number;
  readonly crossesAttempted: number;
  readonly crossesCompleted: number;
  readonly throughBalls: number;
  // 드리블
  readonly dribblesAttempted: number;
  readonly dribblesCompleted: number;
  readonly dispossessed: number;
  readonly touches: number;
  // 수비 (duelWinRate는 파생 — 미포함)
  readonly tacklesAttempted: number;
  readonly tacklesWon: number;
  readonly interceptions: number;
  readonly clearances: number;
  readonly blocks: number;
  readonly aerialDuelsAttempted: number;
  readonly aerialDuelsWon: number;
  readonly groundDuelsAttempted: number;
  readonly groundDuelsWon: number;
  readonly errorsLeadingToShot: number;
  readonly errorsLeadingToGoal: number;
  // 규율
  /**
   * **파생 규칙(I-60, 9일차, 2팀 판정 + 1팀 SSOT 승인, I-43 준용)**: `MatchEventType`
   * `'FOUL'` **과** `'PENALTY_AWARDED'` **양쪽을 폴드 합산**한다 — 박스 안 파울은 엔진이
   * `PENALTY_AWARDED` 하나만 생성하고 별도 `FOUL`을 내보내지 않으므로(I-60 (A) 확정,
   * `GOAL`/`OWN_GOAL`/`PENALTY_SCORED` 득점 3계열 fold와 동일 메커니즘), 이 필드 쪽에서
   * `PENALTY_AWARDED`를 빼면 박스 파울이 규율 통계에서 누락되는 언더카운트가 발생한다.
   * 생성·집계 로직 구현은 2팀 11일차(`stats.ts`) 소관 — 여기서는 파생 규칙만 명시.
   */
  readonly foulsCommitted: number;
  /** 위 `foulsCommitted`와 동일한 폴드 규칙(I-60) — 상대 팀 기준으로 귀속 방향만 반대 */
  readonly foulsDrawn: number;
  readonly yellowCards: number;
  readonly secondYellows: number;
  readonly redCards: number;
  readonly offsides: number;
  // GK (savePercentage는 파생 — 미포함)
  readonly saves: number;
  readonly shotsFaced: number;
  readonly goalsConceded: number;
  readonly cleanSheets: number;
  readonly penaltiesFaced: number;
  readonly penaltiesSaved: number;
  readonly punches: number;
  readonly catches: number;
  readonly sweeperActions: number;
  readonly xgPrevented: number;
}

/** **E-19 PlayerMatchStat** — 경기 단위 선수 스탯. 복합 키(`matchId` + `playerId`) */
export interface PlayerMatchStat extends PlayerStatCoreValues {
  readonly matchId: FixtureId;
  readonly playerId: PlayerId;
  readonly teamId: TeamId;
  /** 경기 평점 1.0 ~ 10.0 */
  readonly matchRating: number;
  readonly isMotm: boolean;
}

/**
 * **E-20 PlayerSeasonStat** — 시즌 단위 선수 집계 스탯.
 * 복합 키(`playerId` + `seasonId` + `competitionType`) — **H: 대회 구분 축**.
 * 024(카드 누적 정지)의 리그·컵 분리 집계가 이 축을 전제로 한다.
 */
export interface PlayerSeasonStat extends PlayerStatCoreValues {
  readonly playerId: PlayerId;
  readonly seasonId: SeasonId;
  /** H — 리그/플레이오프/컵 분리 집계 축 */
  readonly competitionType: CompetitionType;
  readonly teamId: TeamId;
  readonly leagueId: LeagueId;
  /** 리그 기여도 점수 — 성장 보정(FR-PL-011) 입력. 파생값이지만 원문 스키마상 저장 컬럼 */
  readonly contributionScore: number;
  /** 시즌 평균 컨디션 */
  readonly avgCondition: number;
  /**
   * 시즌 평균 평점 1.0~10.0(D-34 결정①, 48일차, I-238) — **`PlayerStatCoreValues`에는
   * 넣지 않는다**(`PlayerStatRankingMetric = keyof PlayerStatCoreValues`가 조용히 바뀌어
   * 완료된 Task 019 통계 랭킹 회귀를 유발하므로). 저장형 평균을 집계 인터페이스에 두는
   * 선례는 위 `avgCondition`과 동일하다. 지난 시즌 평점도 `getPlayerSeasonStats`가 전
   * 시즌 행을 반환하므로 이 필드 하나로 해결된다(신규 필드·메서드 불필요, 결정②).
   */
  readonly avgRating: number;
  /** 맨 오브 더 매치 수상 횟수(경기별 `isMotm` 합) */
  readonly motmAwards: number;
  readonly injuriesCount: number;
  readonly roundsInjured: number;
  readonly matchesSuspended: number;
}

/**
 * **E-21 PlayerCareerStat** — 선수 통산 집계. `playerId` PK(1:1).
 * `PlayerStatCoreValues`를 재사용해 시즌/경기 집계와 필드 중복 선언을 만들지 않는다(C-6).
 */
export interface PlayerCareerStat extends PlayerStatCoreValues {
  readonly playerId: PlayerId;
  readonly totalSeasons: number;
  readonly totalAwards: number;
  readonly totalInjuries: number;
  /** 통산 평균 평점 1.0~10.0(D-34, 48일차, I-238) — `PlayerSeasonStat.avgRating`과 동일 근거 */
  readonly avgRating: number;
}

/** 홈/원정 세부 기록 블록(E-22 `home_record`/`away_record`) — 단일 선언, `TeamSeasonStat`만 참조 */
export interface TeamSplitRecord {
  readonly played: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
}

/** 최다 점수차 승/패 기록 블록(E-22 `biggest_win`/`biggest_loss`) */
export interface TeamMarginResult {
  readonly opponentTeamId: TeamId;
  readonly fixtureId: FixtureId;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
}

/**
 * **E-22 TeamSeasonStat** — 클럽 시즌 단위 집계(FR-ST-002 지표 전량).
 * 복합 키(`teamId` + `seasonId` + `competitionType`) — E-20과 동일하게 대회 구분 축을 둔다.
 *
 * **저장분/파생분 구분(E-19 "합산형만 저장" 원칙을 팀 스탯에도 동일 적용)**:
 * - `goal_difference`·`ppg`·`goals_per_game`·`goals_conceded_per_game`·`xg_diff`·`net`·
 *   `net_spend`·`wage_to_income_ratio`·`shot_accuracy`는 이 레코드의 다른 필드만으로
 *   산술 도출 가능해 필드로 두지 않는다(조회 시점 계산).
 * - `pass_accuracy`·`tackles_won_rate`·`interceptions_per_game`은 클럽 단위 원시값이
 *   요구사항에 없고 `PlayerSeasonStat`(E-20) 스쿼드 합계에서 파생 가능하므로 여기 저장하지
 *   않는다(중복 저장 시 R-03 회귀 추적이 두 곳으로 갈라짐).
 * - `possession_avg`는 대체 원시 소스가 없어(선수 단위 점유율 필드 부재) 그대로 저장한다.
 * - `manager_name`/`style`/`tactical_skill`/`tenure`는 `Manager.teamId` 역참조로 조회
 *   계층에서 조인한다(D-20 원칙 — 감독은 독립 엔티티, person.ts 참조). 여기 중복 저장 안 함.
 */
export interface TeamSeasonStat {
  readonly teamId: TeamId;
  readonly seasonId: SeasonId;
  readonly competitionType: CompetitionType;
  readonly leagueId: LeagueId;

  // 성적
  readonly played: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly points: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly homeRecord: TeamSplitRecord;
  readonly awayRecord: TeamSplitRecord;
  readonly cleanSheets: number;
  readonly failedToScore: number;
  /** 없으면(무승) null */
  readonly biggestWin: TeamMarginResult | null;
  /** 없으면(무패) null */
  readonly biggestLoss: TeamMarginResult | null;
  /** 최근 5경기 "WWDLW" 등 */
  readonly currentForm: string;
  readonly longestWinStreak: number;
  readonly longestUnbeaten: number;

  // 공격
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly xgFor: number;
  readonly xgAgainst: number;
  /** 시간대별 득점 분포(0-15 … 76-90+) — 구간 키·스키마는 소비 시점 확정 */
  readonly scoringByPeriod: Readonly<Record<string, number>>;
  /** 시간대별 실점 분포 */
  readonly concedingByPeriod: Readonly<Record<string, number>>;
  readonly setPieceGoals: number;
  readonly openPlayGoals: number;
  readonly penaltyGoals: number;

  // 패스·점유(대체 소스 없어 저장 — 위 파일 헤더 주석 참조)
  readonly possessionAvg: number;

  // 규율
  readonly fouls: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly fairPlayScore: number;

  // 스쿼드
  readonly squadSize: number;
  readonly avgAge: number;
  readonly avgOvr: number;
  readonly avgCondition: number;
  readonly squadMarketValue: Points;
  readonly injuriesActive: number;
  readonly suspensionsActive: number;
  /** 출전시간 분포(로테이션 지표) — 구간 키·스키마는 소비 시점 확정 */
  readonly minutesDistribution: Readonly<Record<string, number>>;

  // 재정
  readonly balance: Points;
  readonly seasonIncome: Points;
  readonly seasonExpense: Points;
  readonly wageBill: Points;
  readonly transferSpend: Points;
  readonly transferIncome: Points;
  readonly sponsorIncome: Points;
  readonly sponsorPayout: Points;

  // 위상
  readonly reputation: number;
  readonly fanBase: number;
  readonly academyLevel: number;
  readonly trophiesLeague: number;
  readonly trophiesPlayoff: number;
  readonly trophiesCup: number;
  readonly seasonsInTier1: number;
  readonly seasonsInTier2: number;
  readonly seasonsInTier3: number;
}

/**
 * **E-23 Standing** — 라운드별 순위 스냅샷. 복합 키(`seasonId` + `leagueId` + `round` + `teamId`).
 * 최신 순위는 `round = MAX(round)` 조회로 얻는다(원문 설계 근거, 05:339). 시즌 마켓 배당
 * 산출(FR-BT-003) 입력으로도 쓰인다.
 */
export interface Standing {
  readonly seasonId: SeasonId;
  readonly leagueId: LeagueId;
  readonly round: number;
  readonly teamId: TeamId;
  readonly rank: number;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly gf: number;
  readonly ga: number;
  readonly gd: number;
  readonly points: number;
  /** 최근 5경기 "WWDLW" 등 */
  readonly form: string;
  readonly fairPlayScore: number;
  /** 적용된 타이브레이커 단계(1~7). 미적용 시 null. `TeamSeason.tiebreakApplied`(E-05)와 동일 축 */
  readonly tiebreakApplied: number | null;
}

/**
 * **E-31 Award** — 개인/팀 수상. `playerId`/`managerId`/`teamId`는 수상 대상에 따라
 * 하나만 채워지고 나머지는 null이다(수상 유형별 배타 — 예: `GOLDEN_BOOT`는 `playerId`만).
 */
export interface Award {
  readonly id: AwardId;
  readonly seasonId: SeasonId;
  readonly type: AwardType;
  readonly scope: AwardScope;
  /** LEAGUE 범위가 아니면 null */
  readonly leagueId: LeagueId | null;
  readonly playerId: PlayerId | null;
  readonly managerId: ManagerId | null;
  readonly teamId: TeamId | null;
  /** 선정 근거 수치(jsonb) — 구체 스키마는 소비 시점 확정 */
  readonly criteria: Readonly<Record<string, unknown>>;
}

/** **E-32 Trophy** — 팀 트로피 획득 기록. 복합 키(`seasonId` + `teamId`) */
export interface Trophy {
  readonly id: TrophyId;
  readonly seasonId: SeasonId;
  readonly teamId: TeamId;
  readonly type: TrophyType;
  /** LEAGUE/PLAYOFF 계열이 아니면(CUP_TITLE 등) null */
  readonly leagueId: LeagueId | null;
}
