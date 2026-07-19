/**
 * 인물 도메인 타입 — **E-06 ~ E-08 초안** (3일차 2026-07-23, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.3절
 * 원칙: `docs/devStep/02.타입스키마설계원칙.md` P-16(T4~T6), P-17(T8~T10), P-20(T19~T22)
 *
 * ⚠️ **4일차(2026-07-24) 범위**: E-09~E-20 정의 및 34속성(FR-PL-002) 전건 타입.
 *    오늘은 E-08의 34속성 블록을 `PlayerAttributeValues` 자리표시자로만 남긴다.
 *
 * ## 적용 원칙
 * - **D-15**: 하위 엔티티에 `worldId`를 두지 않는다.
 * - **D-16**: 외부(FM 등) 데이터 스키마를 모사한 임포트 DTO 타입을 만들지 않는다(T4).
 *   능력치는 **1~30 정수 스케일**을 따른다(T5). 범위 강제는 7일차 브랜드/런타임 검증 소관.
 * - **D-17**: 국적은 `NationalityCode`(단일 선언, `enums.ts`)를 쓴다. 이름 생성 로직은
 *   3팀 공유 생성기(Task 007) 단일 소유이며 여기서 생성 계약을 재정의하지 않는다(T10).
 * - **D-18**: 선수·감독 이름은 **번역 비대상**(고유명사)이다(T14). 표시 문자열을 담지 않는다.
 * - **D-20**: 감독은 팀 속성이 아닌 **독립 엔티티**이며 팀과 N:1이다(T19). 공석 허용(T21).
 *   협상·계약·이적료 타입은 감독에 대해 만들지 않는다(T22).
 */

import type {
  Formation,
  ManagerStyle,
  NationalityCode,
  Position,
  PreferredFoot,
  TasteTag,
} from './enums';
import type { ManagerId, PlayerId, Points, TeamId } from './brand';

/**
 * **E-06 Manager** — 감독. 팀과 N:1(교체 이력 추적 가능, T19).
 * `teamId`가 null이면 공석이며, 이때 전술 폴백은 `BALANCED`다(T21 / D-23은 3팀 Task 030 소관).
 */
export interface Manager {
  readonly id: ManagerId;
  /** null = 공석 */
  readonly teamId: TeamId | null;
  /** 고유명사 — 번역 대상 아님(T14) */
  readonly name: string;
  readonly age: number;
  readonly style: ManagerStyle;
  /** 1~30 정수 스케일(T5) */
  readonly tacticalSkill: number;
  readonly preferredFormation: Formation;
  /** 0~100 */
  readonly reputation: number;
  readonly contractUntilSeason: number;
  readonly tenureSeasons: number;
}

/**
 * **E-07 Player** — 선수.
 * 이름·능력치·국적은 전량 시드 기반 절차적 생성 결과다(D-16). 생성 함수 계약은 시드를
 * 명시 인자로 받으며(T6), 타입에 `Date`·난수 기반 암묵 기본값을 두지 않는다.
 */
export interface Player {
  readonly id: PlayerId;
  /** 고유명사 — 번역 대상 아님(T14) */
  readonly name: string;
  /** 국적 코드 — 표시명은 번역 대상이나 코드값 자체는 단일 선언(T8·T14) */
  readonly nationality: NationalityCode;
  readonly birthSeason: number;
  readonly age: number;
  readonly preferredFoot: PreferredFoot;
  /** 11군 중 1 */
  readonly preferredPosition: Position;
  /**
   * 잠재 능력치 1~30. **공개 API 미노출 필드** —
   * 조회 계층(Task 004)에서 공개 응답 타입에 포함하지 않는다.
   */
  readonly pa: number;
  /** 0~100 */
  readonly reputation: number;
  readonly marketValue: Points;
  /** 1~2개 */
  readonly tasteTags: readonly TasteTag[];
  /** 은퇴 시즌. 현역이면 null */
  readonly retiredAtSeason: number | null;
}

/**
 * 34속성 값 블록 (FR-PL-002) — 기술 10 / 정신 10 / 신체 8 / GK 6, 각 1~30 정수.
 *
 * ⚠️ **4일차 채움 예정.** 오늘은 골격만 둔다. 확정 후 `PlayerAttribute`와
 *    E-09 `PlayerAttributeHistory`가 이 블록을 함께 참조하여 필드가 두 곳에 중복 선언되지
 *    않게 한다(단일 선언 원칙 / 체크리스트 C-6).
 */
export interface PlayerAttributeValues {
  /**
   * TODO(4일차): 기술 10 / 정신 10 / 신체 8 / GK 6 = 34개 필드로 교체한다.
   * 이 자리표시자 필드는 4일차에 삭제된다(값을 넣을 수 없는 `never` 옵셔널이므로
   * 어떤 구현체도 이 필드에 의존할 수 없다).
   */
  readonly __unfilled34Attributes?: never;
}

/** **E-08 PlayerAttribute** — 선수 능력치 현재값. Player와 1:1 */
export interface PlayerAttribute extends PlayerAttributeValues {
  readonly playerId: PlayerId;
  /** 선호 포지션 기준 파생 캐시 */
  readonly ovrCached: number;
  readonly updatedAtSeason: number;
}
