import { SUPPORTED_LOCALES } from "../locales";
import { common as commonKo } from "./ko/common";
import { league as leagueKo } from "./ko/league";
import { match as matchKo } from "./ko/match";
import { player as playerKo } from "./ko/player";
import { team as teamKo } from "./ko/team";
import { stat as statKo } from "./ko/stat";
import { admin as adminKo } from "./ko/admin";
import { error as errorKo } from "./ko/error";
import { common as commonEn } from "./en/common";
import { league as leagueEn } from "./en/league";
import { match as matchEn } from "./en/match";
import { player as playerEn } from "./en/player";
import { team as teamEn } from "./en/team";
import { stat as statEn } from "./en/stat";
import { admin as adminEn } from "./en/admin";
import { error as errorEn } from "./en/error";

// Task 011(16일차) 메시지 카탈로그 — locale → 8개 도메인 네임스페이스.
// enums.*(3팀 기여)는 여기 포함하지 않는다(별도 인계 예정, H-10/24일차).
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
  },
} as const satisfies Record<(typeof SUPPORTED_LOCALES)[number], unknown>;

export type MessageNamespace = keyof (typeof messages)["ko"];
