import type { Points, Timestamp } from "@/types";
import type { SupportedLocale } from "./locales";

// Task 011(20일차) — 날짜·시각·숫자 서식의 단일 소스.
//
// DC-07: 킥오프 등 모든 시각은 UTC(`Timestamp` = ISO-8601 문자열)로 저장하고, 표시
// 시점에만 로케일 로컬로 변환한다(R-9). 변환 자체는 `Intl.*` 표준 API에 위임하되,
// 화면이 각자 `toLocaleString`/`toLocaleDateString`을 직접 부르면 로케일별 옵션이
// 흩어져 표기가 어긋난다 — 그래서 이 파일이 유일한 경유지다. 포인트 천단위 구분,
// 배당 소수 2자리 표기도 같은 이유로 여기서만 다룬다.
//
// `t()`(t.ts)와 마찬가지로 React를 참조하지 않는 순수 함수라 서버·클라이언트 양쪽에서
// 그대로 호출할 수 있다.

const INTL_LOCALE: Record<SupportedLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
};

/** 배당(`Odds.decimalOdds`) 표기 자릿수 — "1.01 ~ 500.00"(betting.ts 주석) 규약과 일치 */
const ODDS_FRACTION_DIGITS = 2;

export type KickoffFormatStyle = "time" | "dateTime" | "date";

const KICKOFF_FORMAT_OPTIONS: Record<KickoffFormatStyle, Intl.DateTimeFormatOptions> = {
  /** 와이어프레임 R-9 표기(`HH:MM (로컬)`)에 대응 — 같은 날짜 안에서만 의미 있는 문맥용 */
  time: { hour: "2-digit", minute: "2-digit" },
  /** 일정/결과 목록 등 날짜 구분이 필요한 기본값 */
  dateTime: { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" },
  date: { year: "numeric", month: "2-digit", day: "2-digit" },
};

/**
 * 킥오프 등 UTC로 저장된 `Timestamp`를 로케일 로컬 시각 문자열로 변환한다(DC-07).
 * `style`은 표시 문맥에 맞춰 고른다 — 기본값 `"dateTime"`.
 */
export function formatKickoff(
  kickoffAt: Timestamp,
  locale: SupportedLocale,
  style: KickoffFormatStyle = "dateTime",
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], KICKOFF_FORMAT_OPTIONS[style]).format(
    new Date(kickoffAt),
  );
}

/** 포인트(`Points`)를 로케일 천단위 구분 기호로 표기한다 */
export function formatPoints(points: Points, locale: SupportedLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(points);
}

/** 배당(`Odds.decimalOdds`)을 로케일 소수 2자리로 표기한다 */
export function formatOdds(decimalOdds: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: ODDS_FRACTION_DIGITS,
    maximumFractionDigits: ODDS_FRACTION_DIGITS,
  }).format(decimalOdds);
}
