import { describe, expect, it } from "vitest";
import { buildTiebreakNoteBlocks } from "./tiebreak-note";

describe("buildTiebreakNoteBlocks", () => {
  it("모든 순위의 승점이 다르면 블록이 없다(동률 자체가 없음)", () => {
    const rows = [
      { rank: 1, points: 60, tiebreakApplied: null },
      { rank: 2, points: 55, tiebreakApplied: null },
    ];
    expect(buildTiebreakNoteBlocks(rows)).toEqual([]);
  });

  it("연속된 두 순위가 같은 승점·같은 단계면 한 블록·한 하위구간(와이어프레임 예시: 2·3위 골득실)", () => {
    const rows = [
      { rank: 1, points: 60, tiebreakApplied: null },
      { rank: 2, points: 50, tiebreakApplied: 2 },
      { rank: 3, points: 50, tiebreakApplied: 2 },
      { rank: 4, points: 45, tiebreakApplied: null },
    ];
    expect(buildTiebreakNoteBlocks(rows)).toEqual([
      { blockRanks: [2, 3], subRuns: [{ ranks: [2, 3], stage: 2 }] },
    ]);
  });

  it("회귀 케이스 — 같은 승점 3인 블록에서 1명만 먼저 갈리고 나머지는 더 깊게 갈려도 단독 순위가 남지 않는다", () => {
    // 40일차 실렌더에서 재현된 결함: 5·6·7위가 전부 승점 동률인데 5위는 골득실만으로
    // 유일하게 갈리고(stage=2), 6·7위는 그 뒤로도 계속 동률이라 페어플레이(stage=6)까지
    // 내려가서 갈린 경우. 이전 구현은 "5위는 골득실로 순위가 갈렸습니다"라는 상대 없는
    // 단독 문장을 만들었다 — 이제는 블록(5~7위) 하나로 묶이고 하위구간만 갈린다.
    const rows = [
      { rank: 5, points: 40, tiebreakApplied: 2 },
      { rank: 6, points: 40, tiebreakApplied: 6 },
      { rank: 7, points: 40, tiebreakApplied: 6 },
    ];
    const blocks = buildTiebreakNoteBlocks(rows);
    expect(blocks).toEqual([
      {
        blockRanks: [5, 6, 7],
        subRuns: [
          { ranks: [5], stage: 2 },
          { ranks: [6, 7], stage: 6 },
        ],
      },
    ]);
    // 어떤 하위구간도 "블록 전체보다 큰" 범위를 벗어나지 않는다(단독 subRun이 있어도
    // blockRanks가 항상 2개 이상이라 UI가 "N위 홀로" 문장을 만들 근거가 없다).
    expect(blocks[0].blockRanks.length).toBeGreaterThanOrEqual(2);
  });

  it("3팀 동률이 같은 단계로 전부 갈리면 블록 하나에 하위구간도 하나다", () => {
    const rows = [
      { rank: 5, points: 40, tiebreakApplied: 4 },
      { rank: 6, points: 40, tiebreakApplied: 4 },
      { rank: 7, points: 40, tiebreakApplied: 4 },
    ];
    expect(buildTiebreakNoteBlocks(rows)).toEqual([
      { blockRanks: [5, 6, 7], subRuns: [{ ranks: [5, 6, 7], stage: 4 }] },
    ]);
  });

  it("승점이 다른 두 블록이 인접해도(우연히 같은 단계값이라도) 별개 블록으로 분리된다", () => {
    const rows = [
      { rank: 5, points: 50, tiebreakApplied: 2 },
      { rank: 6, points: 50, tiebreakApplied: 2 },
      { rank: 7, points: 49, tiebreakApplied: 2 },
      { rank: 8, points: 49, tiebreakApplied: 2 },
    ];
    expect(buildTiebreakNoteBlocks(rows)).toEqual([
      { blockRanks: [5, 6], subRuns: [{ ranks: [5, 6], stage: 2 }] },
      { blockRanks: [7, 8], subRuns: [{ ranks: [7, 8], stage: 2 }] },
    ]);
  });

  it("승점이 유일한(동률 없는) 순위는 tiebreakApplied가 있어도 블록으로 취급하지 않는다", () => {
    // 계약상 발생하지 않아야 하는 방어적 케이스(동률 없이는 엔진이 null 이외를 주지
    // 않는다) — 그래도 길이 1짜리 "블록"을 만들어 단독 문장을 재생산하지 않는다.
    const rows = [
      { rank: 1, points: 60, tiebreakApplied: null },
      { rank: 2, points: 55, tiebreakApplied: 3 },
      { rank: 3, points: 50, tiebreakApplied: null },
    ];
    expect(buildTiebreakNoteBlocks(rows)).toEqual([]);
  });
});
