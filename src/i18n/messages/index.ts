import { SUPPORTED_LOCALES } from "../locales";
import { common as commonKo } from "./ko/common";
import { league as leagueKo } from "./ko/league";
import { match as matchKo } from "./ko/match";
import { player as playerKo } from "./ko/player";
import { team as teamKo } from "./ko/team";
import { stat as statKo } from "./ko/stat";
import { admin as adminKo } from "./ko/admin";
import { error as errorKo } from "./ko/error";
import { enums as enumsKo } from "./ko/enums";
import { common as commonEn } from "./en/common";
import { league as leagueEn } from "./en/league";
import { match as matchEn } from "./en/match";
import { player as playerEn } from "./en/player";
import { team as teamEn } from "./en/team";
import { stat as statEn } from "./en/stat";
import { admin as adminEn } from "./en/admin";
import { error as errorEn } from "./en/error";
import { enums as enumsEn } from "./en/enums";

// Task 011(16일차) 메시지 카탈로그 — locale → 9개 네임스페이스.
// enums.*(3팀 기여, 값은 전부 자리표시자 echo)는 22일차에 합류했다 — Provider 실배선과
// 함께 팀장이 오늘 지시한 인계 항목이다(enums.ts 자체 상단 주석의 "H-10/24일차" 메모는
// 그 지시 이전 계획 시점 기록이며, 구조적 합류(이 파일)와 콘텐츠 채움(3팀, enums.ts 값)은
// 별개다 — 이 커밋은 전자만 한다). `enums.ts` 파일 자체는 여전히 3팀 소유라 값은 건드리지
// 않는다.
export const messages = {
  ko: {
    common: commonKo,
    league: leagueKo,
    match: matchKo,
    player: playerKo,
    team: teamKo,
    stat: statKo,
    admin: adminKo,
    error: errorKo,
    enums: enumsKo,
  },
  en: {
    common: commonEn,
    league: leagueEn,
    match: matchEn,
    player: playerEn,
    team: teamEn,
    stat: statEn,
    admin: adminEn,
    error: errorEn,
    enums: enumsEn,
  },
} as const satisfies Record<(typeof SUPPORTED_LOCALES)[number], unknown>;

export type MessageNamespace = keyof (typeof messages)["ko"];
