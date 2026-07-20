/**
 * Tier B(`NO_EVENT_TYPE` 26필드) matchSeed 재시뮬레이션 — **계약(타입)만**, 구현 없음.
 *
 * 11일차(2026-08-04) 팀장 결정("Tier B 40필드 소유 배정")의 후속 조치. 설계 배경·산출 방식·
 * 시드 네임스페이스 예약(tick=0)·일정 제안은 `./TIER_B_RESIM_DESIGN.md` 참조.
 *
 * ## 왜 함수 구현이 없는가
 * 이 컴포넌트는 Task 024(17~24일차)의 능력치 계수를 입력으로 쓰도록 설계됐다(설계 메모
 * §2) — 아직 그 계수가 존재하지 않아 "동작하는 척"만 하는 스텁 함수(예: 예외를 던지거나
 * 임의값을 반환하는 껍데기)를 만들면 오해를 부른다. 오늘은 **6팀 스키마 마이그레이션이
 * "이 26개 컬럼이 언젠가 실제로 채워진다"는 근거로 참조할 타입 계약**만 고정한다.
 *
 * ## 26개 vs 56개 — 왜 `PlayerStatCoreValues` 전체가 아닌가
 * `PLAYER_STAT_FIELD_CLASSIFICATION`(`./stats.ts`)의 Tier B 40개 중, `blockedReason`이
 * `NEEDS_ROSTER_CONTEXT`(9개)·`DETAIL_SCHEMA_UNDEFINED`(5개)인 필드는 12~24일차 인계
 * (로스터·GK 타임라인·detail 스키마)가 끝나면 **이벤트 폴드**(재시뮬레이션이 아님)로
 * Tier A 재분류될 예정이다(설계 메모 §1 표 참조). 이 컴포넌트가 영구적으로 책임지는
 * 대상은 `blockedReason === 'NO_EVENT_TYPE'`인 26개뿐이다 — 40개용으로 설계했다가
 * 12~24일차에 다시 걷어내는 낭비를 피한다.
 *
 * ## import 규약
 * `@/types` 배럴만 참조한다. 이 파일 자체는 `./stats`를 import하지 않는다 — 아래 26개
 * 필드 목록이 `stats.ts`의 `PLAYER_STAT_FIELD_CLASSIFICATION`(`blockedReason ===
 * 'NO_EVENT_TYPE'`)과 어긋나지 않는지는 `tier-b-resim-contract.test.ts`가 별도로
 * 교차 검증한다(런타임 드리프트 감지 — 이 파일은 손으로 쓴 목록의 단일 소스로 남는다).
 */

import type { PlayerStatCoreValues } from '@/types';

/**
 * `MatchEventType`(23종, 폐쇄 집합) 안에 대응 이벤트 타입이 구조적으로 없어(볼륨 문제 포함,
 * 설계 메모 §1) 이벤트 폴드로는 영원히 채울 수 없는 26개 필드. `blockedReason ===
 * 'NO_EVENT_TYPE'`인 필드와 정확히 같은 집합이어야 한다(`tier-b-resim-contract.test.ts`가
 * `stats.ts`와의 드리프트를 런타임에 검증).
 */
export type TierBResimStatField =
  | 'passesAttempted'
  | 'passesCompleted'
  | 'keyPasses'
  | 'longBallsAttempted'
  | 'longBallsCompleted'
  | 'crossesAttempted'
  | 'crossesCompleted'
  | 'throughBalls'
  | 'dribblesAttempted'
  | 'dribblesCompleted'
  | 'dispossessed'
  | 'touches'
  | 'tacklesAttempted'
  | 'tacklesWon'
  | 'interceptions'
  | 'clearances'
  | 'blocks'
  | 'aerialDuelsAttempted'
  | 'aerialDuelsWon'
  | 'groundDuelsAttempted'
  | 'groundDuelsWon'
  | 'errorsLeadingToShot'
  | 'errorsLeadingToGoal'
  | 'punches'
  | 'catches'
  | 'sweeperActions';

/** Tier B 재시뮬레이션 결과 부분 스탯. Tier A/재분류 대기 필드는 구조적으로 포함할 수 없다. */
export type PlayerMatchStatTierBResimFold = Pick<PlayerStatCoreValues, TierBResimStatField>;

/** 런타임 검증·향후 구현에서 순회할 수 있도록 위 유니온과 이름을 동기화한 배열. */
export const TIER_B_RESIM_FIELD_NAMES: readonly TierBResimStatField[] = [
  'passesAttempted',
  'passesCompleted',
  'keyPasses',
  'longBallsAttempted',
  'longBallsCompleted',
  'crossesAttempted',
  'crossesCompleted',
  'throughBalls',
  'dribblesAttempted',
  'dribblesCompleted',
  'dispossessed',
  'touches',
  'tacklesAttempted',
  'tacklesWon',
  'interceptions',
  'clearances',
  'blocks',
  'aerialDuelsAttempted',
  'aerialDuelsWon',
  'groundDuelsAttempted',
  'groundDuelsWon',
  'errorsLeadingToShot',
  'errorsLeadingToGoal',
  'punches',
  'catches',
  'sweeperActions',
];

/**
 * `deriveEventSeed(matchSeed, tick, eventIndex)`(`../rng/derive.ts`)에서 이 컴포넌트 전용으로
 * 예약한 `tick` 값. `tick.ts`/`events.ts`는 `MatchTick.tick`이 1부터 시작해 `tick=0`을 쓴 적이
 * 없다(설계 메모 §3) — `derive.ts` 코드 변경 없이 안전하게 재사용 가능한 예약값이다. 실제
 * 구현 시 `deriveEventSeed(matchSeed, TIER_B_RESIM_RESERVED_TICK, playerIndex)`로 선수별
 * 독립 스트림을 얻는다(playerIndex는 결정론적 순번 — 구체 정의는 구현 착수 일차에 확정).
 */
export const TIER_B_RESIM_RESERVED_TICK = 0;

/**
 * 향후 구현이 따라야 할 시그니처(문서 목적, 아직 정의되지 않음 — 위 "왜 함수 구현이 없는가"
 * 참조). `matchSeed`와 선수별 컨텍스트(능력치 스냅샷·Tier A 사실)를 받아 26필드 부분 스탯을
 * 선수별로 반환하는 순수 함수가 될 예정이다.
 *
 * ```ts
 * function deriveTierBMatchStats(
 *   matchSeed: MatchSeed,
 *   context: readonly TierBResimPlayerContext[], // Task 024 능력치 계수 + Tier A 사실
 * ): ReadonlyMap<PlayerId, PlayerMatchStatTierBResimFold>
 * ```
 */
