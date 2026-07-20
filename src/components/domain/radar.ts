import type { PlayerAttributeValues } from "@/types";

/**
 * `PlayerAttributeValues`(34속성, 기술10/정신10/신체8/GK6 — person.ts 파일 헤더 주석의
 * 분류를 그대로 재사용) → AbilityRadar 4축 평균. 새 분류 체계를 발명하지 않는다.
 */
export interface RadarCategoryAverages {
  readonly technical: number;
  readonly mental: number;
  readonly physical: number;
  readonly goalkeeping: number;
}

/** 축 이름과 순서 — AbilityRadar 렌더와 좌표 계산이 동일 순서를 공유한다. */
export const RADAR_CATEGORY_ORDER = ["technical", "mental", "physical", "goalkeeping"] as const;

function average(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeCategoryAverages(attrs: PlayerAttributeValues): RadarCategoryAverages {
  return {
    technical: average([
      attrs.finishing,
      attrs.passing,
      attrs.crossing,
      attrs.dribbling,
      attrs.firstTouch,
      attrs.tackling,
      attrs.marking,
      attrs.heading,
      attrs.longShots,
      attrs.setPieces,
    ]),
    mental: average([
      attrs.composure,
      attrs.decisions,
      attrs.vision,
      attrs.positioning,
      attrs.workRate,
      attrs.aggression,
      attrs.leadership,
      attrs.teamwork,
      attrs.anticipation,
      attrs.determination,
    ]),
    physical: average([
      attrs.pace,
      attrs.acceleration,
      attrs.stamina,
      attrs.strength,
      attrs.agility,
      attrs.balance,
      attrs.jumping,
      attrs.naturalFitness,
    ]),
    goalkeeping: average([
      attrs.reflexes,
      attrs.handling,
      attrs.oneOnOnes,
      attrs.aerialReach,
      attrs.kicking,
      attrs.commandOfArea,
    ]),
  };
}

export interface RadarPoint {
  readonly x: number;
  readonly y: number;
}

export interface RadarLayout {
  readonly cx: number;
  readonly cy: number;
  readonly maxRadius: number;
  /** 속성값 상한(능력치는 1~30, person.ts PlayerAttributeValues 참고) */
  readonly maxValue: number;
}

function axisAngle(index: number, count: number): number {
  // 12시 방향(-90°)에서 시작해 시계방향으로 axisCount 등분한다.
  return -Math.PI / 2 + (index * (2 * Math.PI)) / count;
}

/** 각 축의 최대 반지름 지점(축 안내선 끝점) 좌표. */
export function computeAxisEndpoints(axisCount: number, layout: RadarLayout): readonly RadarPoint[] {
  const { cx, cy, maxRadius } = layout;
  return Array.from({ length: axisCount }, (_, i) => {
    const angle = axisAngle(i, axisCount);
    return { x: cx + maxRadius * Math.cos(angle), y: cy + maxRadius * Math.sin(angle) };
  });
}

/** 값 배열(순서 = 축 순서)을 방사형 좌표로 변환한다. 0 이하/상한 초과 값은 clamp한다. */
export function computeRadarPoints(values: readonly number[], layout: RadarLayout): readonly RadarPoint[] {
  const { cx, cy, maxRadius, maxValue } = layout;
  return values.map((value, i) => {
    const clamped = Math.min(Math.max(value, 0), maxValue);
    const radius = (clamped / maxValue) * maxRadius;
    const angle = axisAngle(i, values.length);
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

export function pointsToSvgPolygon(points: readonly RadarPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}
