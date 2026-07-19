/**
 * 통계 도메인 타입 — **E-19 ~ E-20 완성** (4일차 2026-07-24, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.6절, FR-ST-001(선수 지표 풀세트)
 * 나머지 범위(**E-21 PlayerCareerStat / E-22 TeamSeasonStat / E-23 Standing**)는
 * 여전히 **5일차(07-27)**. 오늘은 ROADMAP.md:172 "E-09~E-20은 4일차"에 따라 E-19·E-20만 완성한다.
 * 3일차 변경요청 H(E-20 대회 구분 축)를 오늘 반영했다 — 요구사항 원문에 이미 있던 복합 PK의
 * `competitionType`을 빠뜨리지 않는 것으로 충족된다.
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
 * - **미결 I-19**: 승부차기 브랜드 생성 책임 확정 — **5일차 판단 지점**(변경 없음).
 */

import type { CompetitionType } from './enums';
import type { FixtureId, LeagueId, PlayerId, SeasonId, TeamId } from './brand';

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
  readonly foulsCommitted: number;
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
  /** 맨 오브 더 매치 수상 횟수(경기별 `isMotm` 합) */
  readonly motmAwards: number;
  readonly injuriesCount: number;
  readonly roundsInjured: number;
  readonly matchesSuspended: number;
}
