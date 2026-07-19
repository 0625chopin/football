/**
 * 월드 / 리그 도메인 타입 — **E-01 ~ E-05** (3일차 2026-07-23, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.2절
 * 원칙: `docs/devStep/02.타입스키마설계원칙.md` P-15(T1~T3), P-20(T21)
 *
 * ## 단일 월드 전제 (D-15 / T1)
 * **하위 엔티티 타입에 `worldId` 스코핑 필드를 도입하지 않는다.** `World`만 `WorldId`를 가진다.
 * 물리 스키마(6팀 소유)의 `world_id` FK 컬럼은 그대로 유지되며, 조회 계층이 현재 월드를
 * 1회 해석해 사용한다(Task 004, 9일차). 따라서 아래 League/Season/Team에는 `worldId`가 없다.
 *
 * 다중 월드 확장 시: `world_id` FK가 이미 스키마에 있으므로 조회 계층에 스코핑 필터만 추가한다.
 */

import type { SeasonPhase } from './enums';
import type {
  LeagueId,
  Points,
  Seed,
  SeasonId,
  SeasonSeed,
  SnapshotId,
  TeamId,
  Timestamp,
  WorldId,
  WorldSeed,
} from './brand';

/**
 * **E-01 World** — 런타임 상태의 뿌리 타입 (T2).
 * 단일 레코드 전제이므로 컬렉션 조회 API를 정의하지 않는다.
 */
export interface World {
  readonly id: WorldId;
  /**
   * 최상위 시드 — 전 파생의 뿌리. **53비트 안전 정수**(`Number.MAX_SAFE_INTEGER`, T2-a
   * 5일차 개정 / D-28, 구 `docs/ISSUES.md` I-32). 2026-07-21 최초 확정치인 32비트에서
   * 5일차(07-27)에 완화됐다 — 근거는 `Seed`(`brand.ts`) 및 `docs/devStep/02.타입스키마설계원칙.md`
   * T2-a 참조. **6일차(07-28) I-39 해소로 구현도 반영 완료**: `src/lib/sim/rng/**`의
   * `prng.ts`(`createState`가 53비트 전 구간을 hi/lo 두 레인으로 소비)·`derive.ts`
   * (`PAYLOAD_BITS=51`, `assertUint32`→`assertSafeSeed`로 교체)가 더 이상 32비트 규약을
   * 강제하지 않는다(`docs/ISSUES.md` I-39 참조).
   * **7일차**: 시드 계층 브랜드 `WorldSeed`로 승격(`brand.ts`) — `SeasonSeed`/`MatchSeed`와
   * 뒤바뀌어 쓰이면 `tsc`가 잡는다.
   */
  readonly worldSeed: WorldSeed;
  /** 현재 시즌 번호 (1부터 무한 누적) */
  readonly currentSeasonNumber: number;
  readonly currentPhase: SeasonPhase;
  /** 배속 0.25 ~ 20.00 */
  readonly speedMultiplier: number;
  readonly isPaused: boolean;
  /** 누적 정지 시간(분) — 스케줄 오프셋 */
  readonly pausedTotalMinutes: number;
  /**
   * **I-31 해소(5일차)** — 월드시간↔실시간 환산 앵커.
   * 기존 `speedMultiplier`/`isPaused`/`pausedTotalMinutes`만으로는 경과분 적분이 수학적으로
   * 불가능했다(앵커 부재). `speedChangedAt` + `worldMinutesAtSpeedChange` 쌍이 "이 시각부터
   * 이 배속으로 이만큼의 월드 분(分)이 흘렀다"의 기준점이 되어, 이후 경과분은
   * `worldMinutesAtSpeedChange + (실시간경과분 × speedMultiplier)`로 적분 가능해진다.
   * 파생식 자체의 단일 소유는 2팀 H-24(30일차 인계) — 여기서는 입력 필드만 정의한다.
   */
  readonly speedChangedAt: Timestamp;
  /** 위 앵커 시각 시점의 누적 월드 분(分). I-31 쌍 필드 */
  readonly worldMinutesAtSpeedChange: number;
  /**
   * 진행 중인 정지 구간의 시작 시각. `isPaused`가 true일 때만 값을 가지며, 정지 해제 시
   * `pausedTotalMinutes`에 가산되고 null로 리셋된다(I-31 ②, 누적치뿐인 `pausedTotalMinutes`로는
   * "현재 정지 중인 분"을 뺄 수 없었다).
   */
  readonly pausedAt: Timestamp | null;
  /** 배속·정지 변경 감지용 단조 증가 값(I-31 권고 사항 ③) */
  readonly clockRevision: number;
  readonly createdAt: Timestamp;
}

/** **E-02 League** — 티어별 리그. 팀 수·라운드 간격 등은 공통코드 시드값에서 온다(D-26) */
export interface League {
  readonly id: LeagueId;
  readonly name: string;
  /** 1 / 2 / 3 */
  readonly tier: number;
  /** 24 / 20 / 16 (공통코드 시드값) */
  readonly teamCount: number;
  /** 라운드 간격(분): 75 / 90 / 115 (공통코드 시드값) */
  readonly roundIntervalMin: number;
  /** 승격 슬롯 (기본 3) */
  readonly promotionSlots: number;
  /** 강등 슬롯 (기본 3) */
  readonly relegationSlots: number;
  /** 플레이오프 참가 팀 수: 10 / 4 / 2 */
  readonly playoffTeamCount: number;
}

/** **E-03 Season** — 시즌. 시즌 시드는 `hash(worldSeed, seasonNumber)` 파생값 */
export interface Season {
  readonly id: SeasonId;
  /** 1부터 무한 누적 */
  readonly seasonNumber: number;
  /**
   * 시즌 시드 — `hash(worldSeed, seasonNumber)`.
   * **파생 규칙의 단일 소유는 2팀 `src/lib/sim/rng/derive.ts`** 이며 여기서 재구현하지 않는다(T2-b).
   * **7일차**: 시드 계층 브랜드 `SeasonSeed`로 승격(`brand.ts`).
   */
  readonly seasonSeed: SeasonSeed;
  readonly phase: SeasonPhase;
  readonly regularStartedAt: Timestamp | null;
  readonly regularEndsAt: Timestamp | null;
  readonly startedAt: Timestamp | null;
  readonly endedAt: Timestamp | null;
  /** 이 시즌 처리에 적용된 상수 스냅샷 (E-44, 타입 본체는 7일차 `config.ts`) */
  readonly snapshotId: SnapshotId | null;
}

/**
 * **E-04 Team** — 클럽.
 * 리그 소속은 승강으로 매 시즌 바뀌므로 `leagueId`를 두지 않는다. 소속의 단일 근거는 `TeamSeason`.
 * 감독은 팀 속성이 아니라 독립 엔티티이며 참조는 `Manager.teamId` 쪽에 둔다(D-20 / T19).
 */
export interface Team {
  readonly id: TeamId;
  readonly name: string;
  /** 3자 약칭 */
  readonly shortName: string;
  readonly foundedSeason: number;
  readonly stadiumName: string;
  readonly stadiumCapacity: number;
  /** hex 색상 */
  readonly colorPrimary: string;
  /** hex 색상 */
  readonly colorSecondary: string;
  /** 절차적 SVG 엠블럼 시드 — 외부 엠블럼 자산을 쓰지 않는다(D-16 / T4) */
  readonly crestSeed: Seed;
  /** 0~100 */
  readonly reputation: number;
  readonly fanBase: number;
  /** 1~5 */
  readonly academyLevel: number;
  /** 포인트 잔고 — 원장(E-30 PointTransaction)의 파생 캐시 */
  readonly balance: Points;
  readonly financialCrisis: boolean;
  readonly crisisConsecutiveSeasons: number;
}

/**
 * **E-05 TeamSeason** — 팀×시즌 소속·성적. 승강 히스토리와 티어별 재적 시즌의 단일 근거.
 * 복합 키(`teamId` + `seasonId`).
 */
export interface TeamSeason {
  readonly teamId: TeamId;
  readonly seasonId: SeasonId;
  /** 해당 시즌 소속 리그 */
  readonly leagueId: LeagueId;
  /** 정규시즌 최종 순위 — 시즌 종료 전에는 null */
  readonly finalRank: number | null;
  readonly promoted: boolean;
  readonly relegated: boolean;
  /** 적용된 타이브레이커 단계 (1~7). 미적용 시 null */
  readonly tiebreakApplied: number | null;
}
