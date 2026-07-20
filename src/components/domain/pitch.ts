import type { Position } from "@/types";

export interface PitchPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * 포지션 11군(E-07) → 단순화된 피치 다이어그램 좌표(0~100 x, 0~150 y, y=150이 자기 골문
 * 쪽·y=0이 상대 골문 쪽). 값은 통상적인 포메이션 배치를 참고한 시각화용 근사치일 뿐, 실제
 * 전술 좌표(person.ts `positionSlot` 등)와는 무관하다.
 *
 * `Record<Position, PitchPoint>`로 선언해 `Position` 유니온 멤버가 늘거나 줄면 tsc가
 * 이 테이블의 누락을 즉시 컴파일 오류로 잡는다(radar.ts `RADAR_CATEGORY_ORDER` 선례와
 * 동일한 "전 멤버 강제" 원칙).
 */
export const POSITION_COORDINATES: Readonly<Record<Position, PitchPoint>> = {
  GK: { x: 50, y: 140 },
  CB: { x: 50, y: 115 },
  LB: { x: 15, y: 108 },
  RB: { x: 85, y: 108 },
  DM: { x: 50, y: 90 },
  CM: { x: 50, y: 70 },
  AM: { x: 50, y: 50 },
  LW: { x: 15, y: 38 },
  RW: { x: 85, y: 38 },
  SS: { x: 50, y: 30 },
  ST: { x: 50, y: 16 },
};

/** 포지션 하나의 피치 좌표를 조회한다. */
export function coordinatesFor(position: Position): PitchPoint {
  return POSITION_COORDINATES[position];
}
