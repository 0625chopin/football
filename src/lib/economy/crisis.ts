/**
 * 재정 위기 상태 — **25일차(2026-08-24), Task 029**
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 25일차 행("재정 위기 상태 — 음수
 * 잔고 팀의 프리시즌 강제 매각 트리거", 수락 "음수 잔고 팀 탐지") / `docs/require/
 * 03-functional-requirements.md` FR-EC-012("팀 잔고가 음수인 채 프리시즌에 진입하면
 * `FINANCIAL_CRISIS` 플래그를 설정하고 강제 매각(FR-TR-008)을 발동한다. 2시즌 연속 위기
 * 시 팀 명성 −5.") / `src/types/world.ts` `Team.financialCrisis`·`crisisConsecutiveSeasons`
 * (E-04, 이미 존재하는 필드 — 이 파일이 처음 채운다). 소유: 3팀 데이터·밸런싱·배당팀
 * (`src/lib/economy/**`).
 *
 * ## 20~24일차 관례 승계
 * `@/types` 배럴 import(서브경로 금지), `Math.random()`/`Date.now()` 미사용(NFR-DT-001).
 * 잔고 자체는 건드리지 않는다 — 잔고를 바꾸는 유일한 경로는 `ledger.ts`이고, 이 파일은
 * 이미 계산된 `Team.balance`를 **읽기만** 한다.
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * FR-EC-012가 말하는 "강제 매각 발동"은 FR-TR-008(매각 리스트 상위부터 순차 매각, 매수자
 * 없으면 방출)의 실행이며, 이는 스쿼드·이적 시장을 아는 프리시즌 5단계(030, 55일차 이후
 * H-16 수신 뒤 착수 — `src/lib/preseason/`는 아직 빈 디렉터리)의 몫이다. 오늘 이 파일은
 * "트리거"까지만 담당한다 — 음수 잔고 팀을 탐지하고, `financialCrisis`/
 * `crisisConsecutiveSeasons` 상태를 갱신하고, 030이 강제 매각을 실행해야 하는지
 * (`forcedSaleTriggered`) 알려주는 순수 판정 함수. 실제 선수 매각·방출·뉴스 피드 생성은
 * 여기서 하지 않는다(뉴스 피드도 마찬가지로 미룬다 — `NewsFeedItemType`은 8일차 동결된
 * 10종 확정값이라 `FINANCIAL_CRISIS`류 타입이 없고, FR-TR-008 수락 기준 ③의 "강제 매각·
 * 방출이 뉴스 피드에 표시"는 실제 매각이 일어나는 030 시점에 기존 `'TRANSFER'` 타입으로
 * 표현하는 것이 자연스럽다).
 *
 * ## 상태 전이 — 부도(`judgeSponsorBankruptcy`)와 다르게 매 시즌 회복 가능
 * 스폰서 부도는 영구 상태라 재판정하지 않지만, 재정 위기는 프리시즌마다 그 시점 잔고로
 * 다시 판정한다(FR-EC-012 "프리시즌에 진입하면"). `balance < 0`이면 위기 진입/지속으로
 * `crisisConsecutiveSeasons`를 1 늘리고, `balance >= 0`이면 즉시 회복으로 플래그와 연속
 * 카운트를 0으로 리셋한다 — 회복에 유예 기간을 두지 않는다(FR 원문에 회복 조건 별도 명시
 * 없음, 위기 판정과 대칭으로 처리).
 *
 * ## 명성 −5 — "2시즌 연속 위기 시" 해석
 * FR-EC-012 원문은 단발 조건문("2시즌 연속 위기 시")이라 3·4·...시즌째까지 매번 −5씩
 * 누적되는지는 명시하지 않는다. 이 파일은 연속 카운트가 정확히 2에 도달하는 시즌
 * **한 번만** 적용한다(그 이후 연속 위기가 계속돼도 추가 차감 없음) — 무제한 누적은
 * `Team.reputation`(0~100) 하한을 빠르게 바닥내 다른 시스템(스폰서 제안액이 명성에
 * 비례 — `sponsor.ts`)에 과도한 연쇄 효과를 준다고 판단했다. 이 해석은 확정 결정이
 * 아니므로 팀장 보고에 이슈 후보로 남긴다. 명성은 `Math.max(0, ...)`로 하한만 방어한다
 * (상한은 차감만 하므로 초과할 수 없다).
 *
 * ## 강제 매각 트리거 — 위기 진입/지속 시 항상 true
 * FR-EC-012는 "프리시즌에 진입하면 ... 강제 매각을 발동한다"고 하므로, 최초 진입이든
 * 연속 2시즌째든 상관없이 `balance < 0`인 모든 프리시즌 진입 시점에 `forcedSaleTriggered:
 * true`다(FR-TR-008 자체도 매 시즌 급여 총액 초과 여부로 재판정하는 구조라 최초 1회성이
 * 아니다).
 */

import type { Team } from '@/types';

/** 잔고가 음수인 팀만 걸러낸다(수락 기준 "음수 잔고 팀 탐지"). */
export function detectNegativeBalanceTeams(teams: readonly Team[]): readonly Team[] {
  return teams.filter((team) => team.balance < 0);
}

export interface JudgeFinancialCrisisResult {
  /** `financialCrisis`/`crisisConsecutiveSeasons`/(해당 시) `reputation`이 갱신된 팀. */
  readonly team: Team;
  /** true면 030(프리시즌 5단계)이 FR-TR-008 강제 매각을 실행해야 한다. */
  readonly forcedSaleTriggered: boolean;
}

/**
 * 프리시즌 진입 시점의 잔고로 재정 위기 상태를 재판정한다(FR-EC-012). 잔고가 음수면
 * 위기 진입/지속, 그 외에는 즉시 회복으로 처리한다 — 파일 상단 "상태 전이" 참조.
 */
export function judgeFinancialCrisis(team: Team): JudgeFinancialCrisisResult {
  if (team.balance < 0) {
    const crisisConsecutiveSeasons = team.crisisConsecutiveSeasons + 1;
    const reputation =
      crisisConsecutiveSeasons === 2 ? Math.max(0, team.reputation - 5) : team.reputation;

    return {
      team: { ...team, financialCrisis: true, crisisConsecutiveSeasons, reputation },
      forcedSaleTriggered: true,
    };
  }

  return {
    team: { ...team, financialCrisis: false, crisisConsecutiveSeasons: 0 },
    forcedSaleTriggered: false,
  };
}
