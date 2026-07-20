/**
 * `PlayerState.fitness`(0~100, person.ts)를 Progress 표시 범위로 clamp한다.
 *
 * `FitnessBar`/`ConditionGauge`가 각자 로컬로 들고 있던 동일 수식을 여기로 추출했다(I-159 —
 * "사소한 로컬 헬퍼라 공유 유틸 추출은 하지 않는다"던 32일차 판단을 33일차에 뒤집음. 두
 * 소비처가 정확히 같은 공식을 쓰는 이상 중복이 드리프트 위험을 만드므로 단일 소스로 통일).
 */
export function clampFitness(fitness: number): number {
  return Math.min(Math.max(fitness, 0), 100);
}
