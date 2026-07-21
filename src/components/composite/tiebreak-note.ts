/**
 * 순위표 B4 "타이브레이커 적용 단계 표시" 로직 — Task 016(40일차, 5팀).
 * 와이어프레임 `02-리그-순위표.md` §4 B4, 예시: "2·3위는 골득실로 순위가 갈렸습니다".
 *
 * ## 재현된 결함(팀장 40일차 실렌더 검증) — 왜 "points"로 먼저 묶어야 하는가
 * 최초 구현은 인접 행을 `tiebreakApplied` 값이 같을 때만 병합했다. 그런데 2팀 엔진
 * (`sim/standing/tiebreak.ts`)의 `resolveGroup()`은 "같은 승점 그룹"을 stage0에서 한
 * 번에 묶은 뒤 재귀적으로 갈라낸다 — 그 결과 **같은 승점 그룹 안에서도 팀마다 다른
 * 단계에서 확정될 수 있다**(예: 5·6·7위가 전부 승점 동률이어도, 5위는 골득실만으로
 * 유일하게 갈리고<tiebreakApplied=2>, 6·7위는 그 다음에도 계속 동률이라 페어플레이까지
 * 내려가서 갈릴<tiebreakApplied=6> 수 있다). `tiebreakApplied` 일치만으로 묶으면 5위가
 * 이웃 없이 홀로 남아 "5위는 … 순위가 갈렸습니다"라는 말이 안 되는 문장이 나온다(단독
 * 순위는 "갈릴" 상대가 없다) — 40일차 실데이터에서 실제로 발생 확인.
 *
 * `Standing.gd`/`gf`/`won`/`fairPlayScore`가 있어도 4단계(승자승 미니리그, 상호 경기
 * 필요)·7단계(시드 추첨, 시즌 시드 필요)는 이 화면 계층 데이터만으로 재현할 수 없다
 * (페이지 자체 주석 "순위 규칙이 여기서 다시 구현되면 두 곳의 판정이 어긋날 수 있다"와
 * 같은 이유로 재구현하지 않는다). 그래서 각 팀이 "정확히 어느 이웃과 몇 단계에서
 * 갈렸는지"까지는 복원하지 않고, 대신 **"애초에 승점이 같았던 원 동률 블록"**(`points`
 * 값이 같은 인접 구간, 2명 이상)을 진짜 단위로 삼는다. 블록 전체가 한 단계로 갈렸으면
 * 기존 문장 그대로("2·3위는 골득실로 순위가 갈렸습니다"), 블록 내부가 단계별로 더
 * 갈렸으면 블록을 명시하고 하위 절을 나열한다("5·6·7위 동률 — 5위는 골득실로, 6·7위는
 * 페어플레이로 순위가 갈렸습니다"). 이러면 단독 순위가 문장 주어로 홀로 남는 일이
 * 구조적으로 없어진다(블록 크기가 항상 2 이상이라 최소한 나머지 구성원과 함께 언급됨).
 *
 * 순위가 오름차순으로 이미 정렬돼 들어온다는 전제다(호출부가 `StandingRowData`를
 * 만들 때 쓰는 정렬과 동일 소스) — 이 파일은 재정렬하지 않는다.
 */

export interface TiebreakNoteSourceRow {
  readonly rank: number;
  readonly points: number;
  readonly tiebreakApplied: number | null;
}

/** 한 블록 안에서 같은 단계로 갈린 연속 구간 — 항상 1개 이상 존재한다(동률 블록은
 *  최소 GD 단계를 거치므로 `tiebreakApplied`가 null인 구성원이 있을 수 없다). */
export interface TiebreakNoteSubRun {
  readonly ranks: readonly number[];
  /** 적용된 타이브레이커 단계(2~7). */
  readonly stage: number;
}

export interface TiebreakNoteBlock {
  /** 원래 승점이 전부 같았던 구간의 순위 전체(오름차순, 2개 이상). */
  readonly blockRanks: readonly number[];
  /** `blockRanks`를 단계별로 다시 쪼갠 하위 구간. 길이 1이면 블록 전체가 한 단계로 갈린 것. */
  readonly subRuns: readonly TiebreakNoteSubRun[];
}

export function buildTiebreakNoteBlocks(
  rows: readonly TiebreakNoteSourceRow[],
): readonly TiebreakNoteBlock[] {
  const blocks: TiebreakNoteBlock[] = [];
  let i = 0;

  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1].points === rows[i].points) {
      j++;
    }

    if (j > i) {
      // [i, j] 구간 전체가 원래 승점 동률이었던 블록(2명 이상).
      const blockRows = rows.slice(i, j + 1);
      const subRuns: TiebreakNoteSubRun[] = [];
      let k = 0;

      while (k < blockRows.length) {
        const stage = blockRows[k].tiebreakApplied;
        let m = k;
        while (m + 1 < blockRows.length && blockRows[m + 1].tiebreakApplied === stage) {
          m++;
        }
        // 방어적 분기: 승점 동률 블록의 구성원은 계약상 항상 tiebreakApplied != null이다
        // (엔진이 최소 GD 단계까지는 반드시 거친다). null이 섞여 들어오면 그 구간은
        // 표시하지 않는다 — 근거 없는 단계를 지어내지 않는다.
        if (stage !== null) {
          subRuns.push({ ranks: blockRows.slice(k, m + 1).map((row) => row.rank), stage });
        }
        k = m + 1;
      }

      if (subRuns.length > 0) {
        blocks.push({ blockRanks: blockRows.map((row) => row.rank), subRuns });
      }
    }

    i = j + 1;
  }

  return blocks;
}
