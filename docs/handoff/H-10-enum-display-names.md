# H-10 — 열거형 ko/en 표시명 목록 (텍스트 인계)

> **발신**: 3팀 데이터·밸런싱·배당팀 / **수신**: 4팀 UI기반·i18n팀
> **확정 일차**: 13일차(2026-08-06) / **1차 정정**: 13일차 1차 교차 점검(4팀 검수 반영)
> **소비 시작**: 14일차 (Task 011 i18n 키 규약·카탈로그 구조 반영)
> **근거**: `ROADMAP.md` Task 007 13일차 인계물 H-10 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 3.1절
> **소스**: `src/types/enums.ts` (1팀 8일차 동결, H-01) — 아래 리터럴 값은 전부 이 파일에서 그대로 가져왔으며 임의로 추가·삭제하지 않았다.

## 이 문서의 성격

- **이 문서는 값이 아니라 참고 목록이다.** 실제 i18n 메시지 카탈로그 파일(`src/i18n/messages/{ko,en}/enums.*`)은 4팀이 소유하며, 3팀은 이 파일을 직접 만들지 않는다(CLAUDE.md 소유 경로표).
- 4팀이 **14일차 Task 011**에서 i18n 키 규약·카탈로그 구조를 확정할 때 이 목록을 참고해 골격을 만들고, **23일차 이후** 3팀이 값(문자열)만 채워 넣는다(같은 날 동시 편집 없음, `docs/team-schedule/03-데이터밸런싱배당팀.md` "유일한 교차 지점" 절 참조).
- 아래 한국어/영어 표시명은 **잠정 초안**이다. 통상적인 축구 중계·게임 UI 관례를 따랐으나, 4팀이 011~014에서 UI 톤·글자수 제약에 맞춰 최종 확정할 수 있다.
- `Formation`(포메이션, `src/types/enums.ts`의 `type Formation = string`)과 `NationalityCode`(국적 코드)는 6일차 시점에 "값 목록은 추후 확정"으로 유보된 항목이라 이 문서에 포함하지 않는다.

## 표시명 작성 컨벤션 (4팀 13일차 검수 반영)

> **표시명(한국어/영어) 열에는 괄호·부연설명을 넣지 않는다.** 표시명의 용도는 배지·테이블 셀(Task 013A 공통 컴포넌트, Task 019 랭킹·수상 화면 등)이며, 길이가 곧 레이아웃 제약이다. 부연이 필요한 항목은 표시명을 짧게 유지한 채 별도 **설명** 열로 옮긴다.
>
> 4팀이 13일차 검수에서 `GOLDEN_GLOVE`(`골든글러브(최우수 골키퍼)`), `HIGH_PRESS`(`하이프레스(고강도 압박)`), `SECOND_YELLOW`(`두 번째 경고(퇴장)`) 3건에 괄호 부연설명이 붙어 있음을 지적했다. 전수 조사 결과 이 3건이 전부였다(아래 §6에서 정정). 이 규칙은 **23일차 이후 값을 채울 때와 이후 새 열거형이 추가될 때도 동일하게 적용**한다 — 아래 모든 표에 "설명" 열을 두어 앞으로도 이 형식을 그대로 따르면 된다.

---

## 1. 포지션 11군 (`Position`, E-07 `preferred_position`)

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `GK` | 골키퍼 | Goalkeeper | |
| `CB` | 센터백 | Centre-Back | |
| `LB` | 레프트백 | Left-Back | |
| `RB` | 라이트백 | Right-Back | |
| `DM` | 수비형 미드필더 | Defensive Midfielder | |
| `CM` | 중앙 미드필더 | Central Midfielder | |
| `AM` | 공격형 미드필더 | Attacking Midfielder | |
| `LW` | 레프트윙 | Left Winger | |
| `RW` | 라이트윙 | Right Winger | |
| `ST` | 스트라이커 | Striker | |
| `SS` | 세컨드 스트라이커 | Second Striker | |

## 2. 매치 이벤트 23종 (`MatchEventType`, E-16 `type`, FR-MT-002)

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `KICKOFF` | 킥오프 | Kickoff | |
| `SHOT_ON` | 유효슈팅 | Shot on Target | |
| `SHOT_OFF` | 빗나간 슈팅 | Shot off Target | |
| `SHOT_BLOCKED` | 블록된 슈팅 | Blocked Shot | |
| `GOAL` | 골 | Goal | |
| `ASSIST` | 어시스트 | Assist | |
| `OWN_GOAL` | 자책골 | Own Goal | |
| `PENALTY_AWARDED` | 페널티킥 선언 | Penalty Awarded | |
| `PENALTY_SCORED` | 페널티킥 성공 | Penalty Scored | 정규·연장 PK 득점 시 단독 발생, 같은 골에 `GOAL` 중복 발생 없음(I-43) |
| `PENALTY_MISSED` | 페널티킥 실패 | Penalty Missed | |
| `YELLOW_CARD` | 경고 | Yellow Card | |
| `SECOND_YELLOW` | 두 번째 경고 | Second Yellow Card | 옐로카드 두 장 누적으로 즉시 퇴장 처리됨 |
| `RED_CARD` | 퇴장 | Red Card | |
| `FOUL` | 파울 | Foul | |
| `OFFSIDE` | 오프사이드 | Offside | |
| `CORNER` | 코너킥 | Corner Kick | |
| `SAVE` | 선방 | Save | |
| `INJURY` | 부상 | Injury | |
| `SUBSTITUTION` | 선수 교체 | Substitution | |
| `HALF_TIME` | 전반 종료 | Half Time | |
| `FULL_TIME` | 경기 종료 | Full Time | |
| `EXTRA_TIME_START` | 연장전 시작 | Extra Time Start | |
| `PENALTY_SHOOTOUT` | 승부차기 킥 | Penalty Shootout Kick | 킥마다 별도 레코드로 반복 발생(같은 리터럴, 다른 `sequence`), 리터럴 1종 ≠ 인스턴스 1건(I-44) |

## 3. 부상 강도 4등급 (`InjurySeverity`, E-24 `severity`, FR-PL-009)

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `KNOCK` | 경미한 타박상 | Knock | |
| `MINOR` | 경상 | Minor | |
| `MODERATE` | 중등도 부상 | Moderate | |
| `SEVERE` | 중상 | Severe | |

## 4. 감독 전술 성향 6종 (`ManagerStyle`, E-06 `style`, FR-MT-009)

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `ATTACKING` | 공격적 | Attacking | |
| `BALANCED` | 균형 | Balanced | |
| `DEFENSIVE` | 수비적 | Defensive | |
| `COUNTER` | 역습 | Counter-Attacking | |
| `POSSESSION` | 점유율 중시 | Possession-Based | |
| `HIGH_PRESS` | 하이프레스 | High Press | 고강도 압박 전술 |

## 5. 시즌 페이즈 6종 (`SeasonPhase`, E-01/E-03, FR-LG-010 + I-33/D-27)

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `REGULAR` | 정규 시즌 | Regular Season | |
| `CUP_SLOT` | 컵대회 슬롯 | Cup Slot | |
| `PLAYOFF` | 플레이오프 | Playoff | |
| `TIEBREAK` | 동률 해소전 | Tiebreak | 승강 경계 동률 발생 시에만 진입하는 조건부 페이즈 |
| `SETTLEMENT` | 시즌 정산 | Settlement | |
| `PRESEASON` | 프리시즌 | Preseason | |

## 6. 수상 종류 12종 (`AwardType`, E-31 `type`)

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `LEAGUE_MVP` | 리그 MVP | League MVP | |
| `GOLDEN_BOOT` | 득점왕 | Golden Boot | |
| `GOLDEN_PLAYMAKER` | 도움왕 | Golden Playmaker | |
| `GOLDEN_GLOVE` | 골든글러브 | Golden Glove | 시즌 최소 실점 골키퍼에게 수여 |
| `BEST_YOUNG_PLAYER` | 영플레이어상 | Best Young Player | |
| `MANAGER_OF_SEASON` | 올해의 감독 | Manager of the Season | |
| `TEAM_OF_SEASON` | 올해의 팀 | Team of the Season | |
| `BALLON_DOR` | 발롱도르 | Ballon d'Or | |
| `WORLD_XI` | 월드 일레븐 | World XI | |
| `CUP_MVP` | 컵대회 MVP | Cup MVP | |
| `PLAYOFF_MVP` | 플레이오프 MVP | Playoff MVP | |
| `PLAYER_OF_THE_ROUND` | 라운드 MVP | Player of the Round | |

### 6-1. 수상 범위 4종 (`AwardScope`, E-31 `scope`)

`AwardType`과 별개 축이라 별도 절로 분리했다. ROADMAP 13일차 원문의 "수상" 항목에는 명시돼 있지 않으나, `AwardType` 단독으로는 "어느 범위(리그/월드/컵/플레이오프)의 수상인지" 표시가 불가능해 함께 인계한다.

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `LEAGUE` | 리그 | League | |
| `WORLD` | 월드 | World | |
| `CUP` | 컵대회 | Cup | |
| `PLAYOFF` | 플레이오프 | Playoff | |

## 7. 배팅 마켓 상태 4종 (`BetMarketStatus`, E-33 `status`)

| 코드 | 한국어 표시명 | 영어 표시명 | 설명 |
|---|---|---|---|
| `OPEN` | 진행중 | Open | |
| `CLOSED` | 마감 | Closed | |
| `SETTLED` | 정산완료 | Settled | |
| `VOIDED` | 무효 | Voided | |

---

## 8. 후속 대상 열거형 목록 (미착수 — 인계 명확화용, 오늘 값 미작성)

> **범위 확대가 아니다.** `docs/team-schedule/03-데이터밸런싱배당팀.md` 19일차 표가 H-10을 "포지션 11군·이벤트 23종·부상 4등급·전술 6종·페이즈 6종·수상·마켓 상태" 7그룹(+`AwardScope`)으로 못박아 뒀고, 오늘 그 범위만 값(잠정 표시명)까지 채웠다. 아래는 `src/types/enums.ts`에 이미 존재하지만 H-10 범위 밖이라 **표시명을 만들지 않은** 나머지 열거형이다 — 어떤 화면·일차가 이 값을 필요로 하는지만 정리해, 해당 Task 착수 전에 값 작성이 빠지지 않게 한다. 값 작성 시점·담당은 3팀 029/031 또는 4팀 011 후속 배치가 될 것으로 예상하나, 오늘 확정하지 않는다.

| 타입 (개수) | 근거 | 필요 화면/Task | 우선순위 메모 |
|---|---|---|---|
| `NewsFeedItemType`(10) | E-26, `enums.ts:181` | Task 019 이적/뉴스 피드 (4팀, 39~43일차) | **팀장 지목 — 019 착수 전 필요** |
| `TrophyType`(4) | E-32, `enums.ts:247` | Task 018 클럽상세 트로피(5팀, 49~53일차) / Task 019 수상·아카이브(4팀, 39~43일차) | **팀장 지목 — 019 착수 전 필요** |
| `FixtureStatus`(4) | E-15, `enums.ts:98` | Task 016 일정/결과 스코어·LIVE·예정 배지(5팀, 39~42일차) | 019와 같은 스프린트 구간, 함께 준비 권장 |
| `CompetitionType`(4) | E-15/E-20, `enums.ts:92` | Task 016/017 일정·경기상세, Task 020 플레이오프·컵(4·5팀, 39~47일차) | |
| `WeatherType`(9) | E-18, `enums.ts:142` | Task 017 경기상세 "날씨·구장 정보"(5팀, 43~48일차) | |
| `PreferredFoot`(3) | E-07, `enums.ts:69` | Task 018 선수상세 프로필(5팀, 49~53일차) | |
| `ContractStatus`(3) | E-12, `enums.ts:157` | Task 018 클럽상세 계약 / Task 019 이적피드 | |
| `TransferType`(4) | E-13, `enums.ts:163` | Task 019 이적/뉴스 피드(4팀) | |
| `LoanStatus`(2) | E-14, `enums.ts:169` | Task 019 이적/뉴스 피드(4팀) | |
| `InjuryStatus`(2) | E-24, `enums.ts:178` | Task 018 선수상세 부상 타임라인(5팀) | |
| `SanctionType`(1) | E-27, `enums.ts:198` | Task 019 이적/뉴스 피드(4팀, 리그3 리빌드 제재) | 현재 값 1종뿐 |
| `SponsorContractStatus`(3) | E-29, `enums.ts:201` | Task 020 스폰서 현황(4팀, 44~47일차) | |
| `PointTransactionOwnerType`(2) | E-30, `enums.ts:204` | Task 021 운영콘솔 로그(5팀, 54~59일차) | 사용자 노출 여부 미확정 — 어드민 전용일 수 있음 |
| `PointTransactionReasonCode`(12) | E-30, FR-EC-001, `enums.ts:214` | Task 018 클럽상세 재정 패널 / Task 021 운영콘솔 로그 | |
| `BetMarketScope`(3) | E-33, `enums.ts:250` | Task 039 배팅 마켓(2차, 5팀) | 2차 릴리스, 급하지 않음 |
| `BetSelectionResult`(6) | E-34, `enums.ts:259` | Task 039/040(2차) | 2차 릴리스 |
| `BetType`(2) | E-36, `enums.ts:268` | Task 039(2차) | 2차 릴리스 |
| `BetStatus`(6) | E-36, `enums.ts:271` | Task 039/040(2차) | 2차 릴리스 |
| `UserRole`(2) | E-38, `enums.ts:274` | Task 037 인증(2차) | 2차 릴리스, UI 표시 필요성 낮음(권한 판정용) |
| `WalletCurrency`(1) | E-39, `enums.ts:277` | Task 037/039(2차) | 값 1종(`POINT`)뿐이라 번역 실익 낮음 |
| `WalletTransactionReason`(4) | E-40, `enums.ts:280` | Task 039/040(2차) | 2차 릴리스 |
| `CommonCodeValueType`(5) | E-41, `enums.ts:304` | Task 021 `/admin/config`(5팀, 54~59일차) | 운영자 전용, ko 우선(CLAUDE.md 021 구현 사항 참조) |
| `CommonCodeApplyPolicy`(3) | E-41, `enums.ts:311` | Task 021 `/admin/config`(5팀) | 운영자 전용 |
| `CommonCodeHistoryAction`(4) | E-43, `enums.ts:314` | Task 021 `/admin/config` 변경 이력(5팀) | 운영자 전용 |
| `CronRunStatus`(4) | E-45, `enums.ts:325` | Task 021 `/admin/scheduler`(5팀) | 운영자 전용 |
| `AuditActorType`(4) | E-47, `enums.ts:333` | Task 021 `/admin` 로그 뷰어(5팀) | 운영자 전용 |

---

## 각주

- **수신**: 4팀 UI기반·i18n팀
- **소비 시점**: 14일차(Task 011에 골격 반영) / 값 채우기는 23일차 이후(3팀 029 소관, `src/i18n/messages/{ko,en}/enums.*`)
- 위 7개 대분류(+`AwardScope` 별도 절 포함 8절)는 `src/types/enums.ts`가 8일차 동결 시점에 확정한 리터럴과 1:1 대응한다. 이후 타입이 이슈 배치로 변경되면(예: enum 멤버 추가) 이 문서도 갱신 대상이다.
- **13일차 1차 정정**: 4팀 검수로 괄호 부연설명 3건(`GOLDEN_GLOVE`/`HIGH_PRESS`/`SECOND_YELLOW`)을 표시명/설명 2열로 분리했고, 표시명 작성 컨벤션 문단과 §8 후속 대상 열거형 목록을 추가했다.
