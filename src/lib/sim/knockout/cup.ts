/**
 * `src/lib/sim/knockout/cup.ts` — Task 027(41일차) "컵대회 60팀 — bye 4, 1라운드 28경기,
 * 총 6라운드 59경기". `docs/team-schedule/02-시뮬레이션엔진팀.md` 41일차 행. 근거:
 * `docs/require/03-functional-requirements.md` FR-LG-015(컵대회 포맷, [확정])·
 * `docs/require/06-prioritization-and-risks.md` D-08(포맷 결정)·D-24(시딩 폴백).
 *
 * ## 완료 판정 — "참가 60팀·59경기·우승 1팀"
 * 1라운드(리그1 1~4위 bye 4 + 나머지 56팀 → 28경기) → 32강(16) → 16강(8) → 8강(4) →
 * 4강(2) → 결승(1) = **59경기**. 결승 승자가 60팀 중 유일한 우승팀이다. 이 파일의 각
 * 라운드 생성 함수가 반환하는 배열 길이가 그 경기 수와 정확히 일치해야 한다 —
 * `*.test.ts`가 이를 값으로 증명한다.
 *
 * ## `playoff.ts`와의 관계 — 같은 패턴, 다른 대회
 * 리그별 승강 플레이오프(`playoff.ts`, `competitionType = 'PLAYOFF'`)와는 다른 대회
 * (`competitionType = 'CUP'`)이므로 로직을 공유하지 않지만, 다음 패턴은 그대로 물려받는다:
 * - "아직 `Fixture`가 아닌 초안만 반환한다" — 브랜드 ID·`matchSeed`·`snapshotId`·
 *   `kickoffAt`·`attendance`는 오케스트레이션 계층이 채운다.
 * - "승자는 팀 ID가 아니라 원 시드 번호로 다음 라운드에 주입한다" — 대진 규칙이
 *   원 시드 비교로 정의되기 때문이다(`playoff.ts` 헤더 "왜 시드 번호인가" 절과 동일 이유).
 * - 라운드 사이 의존성 때문에 라운드별로 함수가 분리돼 있고, 완료된 경기의 승자 판정
 *   (`resolveKnockoutWinnerTeamId`)은 대회 무관 공통 로직이라 `playoff.ts`에서 그대로
 *   재사용한다(중복 구현 금지).
 *
 * ## 전역 시드 번호(1~60) — 3개 리그를 하나의 시드 공간으로
 * 컵은 3개 리그 통합 대회라 `playoff.ts`처럼 리그 하나의 순위 배열만으로는 시드를 표현할
 * 수 없다. 이 파일은 `CupSeedPools`(리그1 24 + 리그2 20 + 리그3 16, 각 리그 내부는 정규시즌
 * 최종 순위 1위→꼴찌 순)를 **이어붙인 전역 시드 1~60**으로 다룬다 — 시드 1~24 = 리그1,
 * 25~44 = 리그2, 45~60 = 리그3. 이 번호매김 자체에 티어 서열이 그대로 인코딩되므로(리그1
 * 시드 < 리그2 시드 < 리그3 시드), "홈 = 하위 티어, 동일 티어면 낮은 순위"(FR-LG-015)
 * 규칙이 **모든 라운드·모든 매치업에서 "두 시드 중 더 큰 쪽이 홈"** 한 줄로 통일된다
 * (`pairToDraft()` 참조) — 리그 간 교차인지 리그 내부인지 분기할 필요가 없다.
 *
 * ## 1라운드 시딩 — 42일차부터 `seeding.ts`로 분리
 * D-24 우선순위(① 리그1↔리그3 우선, ② 리그1↔리그2, ③ 리그2↔리그3, ④ 그래도 남으면
 * 동일 티어 시드 순 상하위 교차)와 그것을 60/20/16 특정 숫자에 하드코딩하지 않는
 * `crossPair()` 일반화는 **41일차에 이 파일에서 구현**했으나, 42일차 Task 027(2회차,
 * `seeding.ts`)에서 재사용 가능한 순수 시딩 모듈로 옮겼다 — 규칙 자체는 그대로이고
 * 중복 구현하지 않는다(`seeding.ts` 헤더 "41일차 인계" 절 참조). 이 파일은 이제
 * `seedCupRound1()`이 반환한 시드 쌍을 `pairToDraft()`로 `Fixture` 초안으로 감싸는
 * 일만 한다. `CupSeedPools`/`assertCupSeedPools`/`teamOfGlobalSeed`도 같은 이유로
 * `seeding.ts`가 소유하며, 이 파일은 그 타입을 재노출(`export type { CupSeedPools }`)
 * 할 뿐이다.
 *
 * ## 홈 결정 — 43일차부터 `seeding.ts`의 `decideCupHomeAway()` 재사용
 * "두 시드 중 더 큰 쪽이 홈" 규칙(아래 "홈 어드밴티지" 절)은 41일차엔 이 파일의 지역
 * 함수 `homeAwayOf()`였으나, 43일차에 시딩(전역 시드 해석) 관심사로 분류해
 * `seeding.ts`로 옮겼다(`crossPair()`와 같은 이유·같은 패턴). 이 파일은 이제
 * `decideCupHomeAway()`를 그대로 호출할 뿐 재정의하지 않는다.
 *
 * ## 2라운드 이후 "시드 기반 무작위" — `derive.ts`가 시드를 소유, 이 파일은 셔플만
 * FR-LG-015 원문 "2라운드 이후 시드 기반 무작위"를 각 라운드(32강~결승)마다 잔여 참가
 * 시드를 다시 뽑는 방식(실제 다수 컵대회의 라운드별 재추첨 관행)으로 해석한다 — 요구사항
 * 원문에 라운드별 재추첨인지 최초 1회 배치인지 명시가 없어 **추론이며 이슈 후보로 등재
 * 대상**이다. 무작위 추첨 자체는 `rng/derive.ts`의 `deriveCupDrawSeed(seasonSeed, round,
 * participantsKey)`가 시드를 파생하고(신설 `LAYER_TAG.CUP_DRAW`), 이 파일은 그 시드로
 * `stateForSeed()` → `nextIntBelow()` 기반 Fisher–Yates(`standing/tiebreak.ts`의
 * `resolveSeedDrawStage()`와 동일 패턴)를 실행할 뿐이다. `PrngState`를 호출자가 라운드
 * 사이에 직접 이어받지 않아도 되므로(각 라운드가 `seasonSeed`+`round`+참가자 구성에서
 * 자기 시드를 스스로 파생) `playoff.ts`류의 상태 threading보다 호출부 부담이 적다.
 *
 * ## 홈 어드밴티지 — 결승만 예외
 * 결승(`FINAL`)은 중립지 단판(FR-LG-015 "결승은 중립지")이라 `isNeutral: true`. 그 외
 * 라운드는 전부 "두 시드 중 더 큰 쪽이 홈"(자이언트킬링 연출).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 난수는
 * `rng/derive.ts`·`rng/prng.ts`만 경유하며 `PrngState`는 이 파일 밖으로 노출하지 않는다.
 * 타입은 `@/types` 배럴로만 import. 정수 스코어·시드 비교만 하므로 `rng/precision.ts`
 * (확률 소수 비교용) 대상이 아니다.
 *
 * ## 범위 밖 — 시즌 타임라인 삽입
 * FR-LG-015의 "정규시즌 병행"(리그1 라운드 6/12/18/24/32/40 직후 컵 슬롯 삽입,
 * `CUP_PARAM.INSERT_ROUNDS`)은 이 파일의 몫이 아니다. 이 파일은 순수 브래킷 생성 계층
 * (`playoff.ts`와 동일 계층)이고, 슬롯 삽입은 다른 두 계층이 나눠 맡는다 — **이산 페이즈
 * 전이**(`REGULAR`→`CUP_SLOT`→`REGULAR`)는 `season/phase.ts`의 `ENTER_CUP_SLOT`/
 * `EXIT_CUP_SLOT` 이벤트가, **슬롯의 실제 시작/끝 시각 산출**(리그별 킥오프를 밀어 슬롯
 * 구간에 리그 경기가 0건이 되도록 하는 계산)은 `schedule/cup-slot.ts`(44일차 완료)가
 * 담당한다.
 */

import type { CompetitionType, SeasonId, TeamId } from '@/types';
import { deriveCupDrawSeed, hashKey, stateForSeed } from '../rng/derive';
import { nextIntBelow } from '../rng/prng';
import {
  assertCupSeedPools,
  decideCupHomeAway,
  seedCupRound1,
  teamOfGlobalSeed,
  type CupSeedPools,
} from './seeding';

export type { CupSeedPools } from './seeding';

const CUP: CompetitionType = 'CUP';

/** 컵 대진 6라운드의 스테이지. 1라운드만 결정론(D-24), 나머지는 시드 기반 무작위. */
export type CupStage =
  | 'ROUND_1'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTERFINAL'
  | 'SEMIFINAL'
  | 'FINAL';

/**
 * 아직 `Fixture`가 아닌 초안. 브랜드 ID·`matchSeed`·`snapshotId`·`kickoffAt`·`attendance`는
 * 오케스트레이션 계층이 채운다(`playoff.ts`의 `PlayoffFixtureDraft`와 동일 패턴).
 * `leagueId`는 컵이 3개 리그 통합 대회라 항상 `null`(`Fixture.leagueId` 주석 "컵은 null").
 */
export interface CupFixtureDraft {
  readonly seasonId: SeasonId;
  readonly competitionType: CompetitionType;
  readonly leagueId: null;
  /** 대회 전체를 관통하는 연속 라운드 번호(1라운드=1 ~ 결승=6). */
  readonly round: number;
  /** 표시용 원시 라벨(번역 비대상, T13) — 예: "32강", "결승". */
  readonly roundLabel: string;
  readonly stage: CupStage;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  /** 홈팀의 전역 시드 번호(1~60, 파일 헤더 "전역 시드 번호" 참조). */
  readonly homeSeed: number;
  /** 원정팀의 전역 시드 번호(1~60). */
  readonly awaySeed: number;
  /** 결승만 true(FR-LG-015 "결승은 중립지"). */
  readonly isNeutral: boolean;
}

/** 이전 라운드 한 경기의 승자 — 팀 ID가 아니라 전역 시드 번호로 표현한다(파일 헤더 참조). */
export interface CupAdvancement {
  readonly winnerSeed: number;
}

function pairToDraft(
  seasonId: SeasonId,
  pools: CupSeedPools,
  round: number,
  roundLabel: string,
  stage: CupStage,
  pair: readonly [number, number],
  isNeutral: boolean,
  fnName: string,
): CupFixtureDraft {
  const [homeSeed, awaySeed] = decideCupHomeAway(pair[0], pair[1]);
  return {
    seasonId,
    competitionType: CUP,
    leagueId: null,
    round,
    roundLabel,
    stage,
    homeTeamId: teamOfGlobalSeed(pools, homeSeed, fnName),
    awayTeamId: teamOfGlobalSeed(pools, awaySeed, fnName),
    homeSeed,
    awaySeed,
    isNeutral,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 1라운드 — FR-LG-015 / D-24: bye 4 + 28경기
// ─────────────────────────────────────────────────────────────────────────

/** `generateCupRound1()` 결과 — bye 4팀의 시드와 28경기 초안. */
export interface CupRound1Result {
  /** 부전승 4팀의 전역 시드(항상 1~4 — 리그1 1~4위). */
  readonly byeSeeds: readonly [number, number, number, number];
  readonly fixtures: readonly CupFixtureDraft[];
}

/**
 * 1라운드 — 리그1 1~4위 bye, 나머지 56팀 28경기. 시딩 규칙(D-24 우선순위 계산) 자체는
 * `seeding.ts`의 `seedCupRound1()`이 소유한다(파일 헤더 "1라운드 시딩" 절 참조) — 이
 * 함수는 그 결과(시드 쌍)를 `Fixture` 초안으로 감싸기만 한다.
 */
export function generateCupRound1(seasonId: SeasonId, pools: CupSeedPools): CupRound1Result {
  const { byeSeeds, pairs } = seedCupRound1(pools);

  const fixtures = pairs.map((pair) =>
    pairToDraft(seasonId, pools, 1, '1라운드', 'ROUND_1', pair, false, 'generateCupRound1'),
  );

  return { byeSeeds, fixtures };
}

// ─────────────────────────────────────────────────────────────────────────
// 2라운드 이후 — FR-LG-015: "시드 기반 무작위" (32강 → 16강 → 8강 → 4강 → 결승)
// ─────────────────────────────────────────────────────────────────────────

interface RoundMeta {
  readonly round: number;
  readonly roundLabel: string;
  readonly stage: CupStage;
  readonly expectedCount: number;
  readonly isNeutral: boolean;
}

const ROUND_OF_32: RoundMeta = { round: 2, roundLabel: '32강', stage: 'ROUND_OF_32', expectedCount: 32, isNeutral: false };
const ROUND_OF_16: RoundMeta = { round: 3, roundLabel: '16강', stage: 'ROUND_OF_16', expectedCount: 16, isNeutral: false };
const QUARTERFINAL: RoundMeta = { round: 4, roundLabel: '8강', stage: 'QUARTERFINAL', expectedCount: 8, isNeutral: false };
const SEMIFINAL: RoundMeta = { round: 5, roundLabel: '4강', stage: 'SEMIFINAL', expectedCount: 4, isNeutral: false };
const FINAL_ROUND: RoundMeta = { round: 6, roundLabel: '결승', stage: 'FINAL', expectedCount: 2, isNeutral: true };

function assertUniqueSeeds(seeds: readonly number[], expected: number, fnName: string): void {
  if (seeds.length !== expected) {
    throw new RangeError(`${fnName}: entrantSeeds.length는 ${expected}이어야 합니다 (받은 값: ${seeds.length}).`);
  }
  if (new Set(seeds).size !== seeds.length) {
    throw new RangeError(`${fnName}: entrantSeeds에 중복된 시드가 있습니다.`);
  }
}

/**
 * `entrantSeeds`(그 라운드 진출 팀들의 전역 시드)를 `seasonSeed` 기반 결정론적
 * Fisher–Yates로 셔플한 뒤 순서대로 짝짓는다("시드 기반 무작위", 파일 헤더 참조).
 * 참가 구성이 같으면(순서 무관) 항상 같은 대진이 나온다 — `deriveCupDrawSeed()`의
 * `participantsKey`가 정렬된 시드 집합의 해시이기 때문이다.
 */
function drawRandomRound(
  seasonId: SeasonId,
  pools: CupSeedPools,
  meta: RoundMeta,
  entrantSeeds: readonly number[],
  seasonSeed: number,
  fnName: string,
): readonly CupFixtureDraft[] {
  assertCupSeedPools(pools, fnName);
  assertUniqueSeeds(entrantSeeds, meta.expectedCount, fnName);

  // 오름차순으로 먼저 정규화 — 입력 배열이 어떤 순서로 들어오든 같은 참가 구성이면
  // 항상 같은 순서로 셔플을 시작한다(`standing/tiebreak.ts`의 `resolveSeedDrawStage()`
  // "canonical" 정규화와 동일 이유 — 결과가 우연히 호출부의 배열 순서에 의존하지 않게 함).
  const canonical = [...entrantSeeds].sort((x, y) => x - y);
  const participantsKey = hashKey(canonical.join('-'));
  const drawSeed = deriveCupDrawSeed(seasonSeed, meta.round, participantsKey);

  const shuffled = [...canonical];
  let state = stateForSeed(drawSeed);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const step = nextIntBelow(state, i + 1);
    state = step.state;
    const j = step.value;
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const fixtures: CupFixtureDraft[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    fixtures.push(
      pairToDraft(
        seasonId,
        pools,
        meta.round,
        meta.roundLabel,
        meta.stage,
        [shuffled[i], shuffled[i + 1]],
        meta.isNeutral,
        fnName,
      ),
    );
  }
  return fixtures;
}

/**
 * 32강 — `entrantSeeds`는 1라운드 bye 4팀 + 1라운드 승자 28팀의 시드를 순서 무관하게
 * 정확히 32개 담아야 한다(`generateCupRound1()`의 `byeSeeds` + 승자 판정 결과).
 */
export function generateCupRoundOf32(
  seasonId: SeasonId,
  pools: CupSeedPools,
  entrantSeeds: readonly number[],
  seasonSeed: number,
): readonly CupFixtureDraft[] {
  return drawRandomRound(seasonId, pools, ROUND_OF_32, entrantSeeds, seasonSeed, 'generateCupRoundOf32');
}

/** 16강 — `entrantSeeds`는 32강 승자 16팀의 시드. */
export function generateCupRoundOf16(
  seasonId: SeasonId,
  pools: CupSeedPools,
  entrantSeeds: readonly number[],
  seasonSeed: number,
): readonly CupFixtureDraft[] {
  return drawRandomRound(seasonId, pools, ROUND_OF_16, entrantSeeds, seasonSeed, 'generateCupRoundOf16');
}

/** 8강 — `entrantSeeds`는 16강 승자 8팀의 시드. */
export function generateCupQuarterfinalRound(
  seasonId: SeasonId,
  pools: CupSeedPools,
  entrantSeeds: readonly number[],
  seasonSeed: number,
): readonly CupFixtureDraft[] {
  return drawRandomRound(seasonId, pools, QUARTERFINAL, entrantSeeds, seasonSeed, 'generateCupQuarterfinalRound');
}

/** 4강 — `entrantSeeds`는 8강 승자 4팀의 시드. */
export function generateCupSemifinalRound(
  seasonId: SeasonId,
  pools: CupSeedPools,
  entrantSeeds: readonly number[],
  seasonSeed: number,
): readonly CupFixtureDraft[] {
  return drawRandomRound(seasonId, pools, SEMIFINAL, entrantSeeds, seasonSeed, 'generateCupSemifinalRound');
}

/**
 * 결승 — `entrantSeeds`는 4강 승자 2팀의 시드. 중립지 단판(`isNeutral: true`)이라
 * 홈/away 시드 구분은 기록용일 뿐 어드밴티지에 영향이 없다.
 */
export function generateCupFinalRound(
  seasonId: SeasonId,
  pools: CupSeedPools,
  entrantSeeds: readonly number[],
  seasonSeed: number,
): readonly CupFixtureDraft[] {
  return drawRandomRound(seasonId, pools, FINAL_ROUND, entrantSeeds, seasonSeed, 'generateCupFinalRound');
}

// ─────────────────────────────────────────────────────────────────────────
// 공통 — 완료된 경기의 승자를 다음 라운드용 시드로 판정
// ─────────────────────────────────────────────────────────────────────────

/**
 * `homeScore`/`awayScore`(정규+연장 합산 우세 팀, 동률이면 `pkHome`/`pkAway` 승부차기)로
 * 완료된 경기의 승자를 **전역 시드 번호**로 판정한다. 스코어 판정 로직 자체는 대회
 * 무관 공통 로직이라 `playoff.ts`의 `resolveKnockoutWinnerTeamId()`를 그대로 재사용하고
 * (중복 구현 금지), 이 함수는 그 결과(팀 ID)를 이 경기의 `homeSeed`/`awaySeed` 중 어느
 * 쪽인지로 되돌려 매핑할 뿐이다.
 */
export function resolveCupWinnerSeed(
  fixture: CupFixtureDraft,
  winnerTeamId: TeamId,
): CupAdvancement {
  if (winnerTeamId === fixture.homeTeamId) {
    return { winnerSeed: fixture.homeSeed };
  }
  if (winnerTeamId === fixture.awayTeamId) {
    return { winnerSeed: fixture.awaySeed };
  }
  throw new RangeError(
    `resolveCupWinnerSeed: winnerTeamId(${String(winnerTeamId)})가 이 경기의 홈/원정 어느 쪽도 아닙니다.`,
  );
}
