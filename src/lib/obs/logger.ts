/**
 * 구조적 JSON 로거 — 39일차(2026-09-11), Task 043
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 39일차 행 "구조적 JSON 로깅 —
 * 레벨·타임스탬프·상관 ID(`season`/`match_id`)" / 수락 기준 "전 로그가 상관 ID 보유".
 * 소유: 3팀 데이터·밸런싱·배당팀(`src/lib/obs/**`).
 *
 * ## "전 로그가 상관 ID 보유"를 API로 강제하는 방식
 * 최상위에 `log(message)` 같은 무맥락 함수를 노출하지 않는다. 로그를 남기려면 먼저
 * `createLogger(correlation)`으로 상관 컨텍스트를 주입해야 하며, 그렇게 얻은
 * `Logger`의 `debug/info/warn/error`만 호출할 수 있다 — 컨텍스트 없이 로그를 낼 수
 * 있는 경로 자체가 타입 레벨에 없다. `correlation`이 빈 객체로 호출되는 사례(오타·복붙
 * 실수)까지 막기 위해 **런타임에도** 키가 하나도 없으면 생성 시점에 던진다(로그를 내는
 * 시점이 아니라 로거를 만드는 시점에 실패해야 원인 추적이 쉽다).
 * 여러 단계(시즌 → 경기)를 거치며 컨텍스트가 넓어지는 흐름은 `child()`로 표현한다 —
 * 상위 컨텍스트를 그대로 물려받고 겹치는 키만 덮어쓴다.
 *
 * ## 타임스탬프: 주입 가능한 `Clock`
 * `src/lib/sim/**`은 `Date.now()` 금지(NFR-DT-001, 결정론 보존)이지만 이 모듈은 sim
 * 밖(`src/lib/obs/`)이라 규칙 대상이 아니다. 그런데도 시각 함수를 인자로 받게 설계했다 —
 * 이유는 규칙 준수가 아니라 **이 로거를 sim이 실수로 import했을 때의 피해 반경**과
 * **테스트 용이성** 두 가지다. sim이 언젠가 진행 상황 로깅을 위해 이 모듈을 끌어다
 * 쓰더라도 `Clock`을 결정론적 값(예: 시뮬레이션 틱 카운터)으로 주입하면 로그 자체가
 * sim의 재현성을 깨지 않는다. 기본값은 실제 벽시계(`() => new Date().toISOString()`)이며
 * 별도 주입이 없는 한 실운영 동작은 그대로다. 이 기본값 자체가 `Date.now()`/`new Date()`를
 * 호출하므로 **이 모듈을 `src/lib/sim/**`에서 import하지 않는다** — 결정론 검증
 * (`derive.ts`/`prng.ts` 계열)과는 무관한 관측 전용 모듈로 남긴다.
 *
 * ## 서버/클라이언트 경계
 * 이 파일은 `"use client"`를 붙이지 않는다 — RSC 경계에서 `"use client"`가 붙은 모듈의
 * **값**(함수·상수, 컴포넌트가 아닌 것)을 서버 컴포넌트가 import하면 번들러가 조용히
 * 빈 값으로 치환하는 함정이 38일차에 실측됐다. `createLogger`는 컴포넌트가 아니라 값이므로,
 * 이 파일이 클라이언트 전용으로 표시되면 서버 컴포넌트/서버 액션에서 쓸 때 그 함정을 그대로
 * 밟는다. `console.*` 호출만 쓰므로 Node(서버)·브라우저(클라이언트) 양쪽에서 동작한다 —
 * 어느 한쪽 전용 API(예: `window`, `process.stdout` 직접 제어)는 쓰지 않았다.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 상관 컨텍스트. `season`/`matchId`는 자주 쓰는 키를 타입으로 드러낸 것일 뿐 — 그
 * 외 임의 키(`leagueId`, `cronRunId` 등)도 그대로 실어 나를 수 있다. 필수 제약은
 * 타입이 아니라 `createLogger`의 런타임 가드("키 0개 금지")로 건다.
 */
export interface LogCorrelation {
  readonly season?: string;
  readonly matchId?: string;
  readonly [key: string]: unknown;
}

export interface LogRecord {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly correlation: LogCorrelation;
  readonly data?: Readonly<Record<string, unknown>>;
}

/** 현재 시각을 ISO 문자열로 반환. 기본은 실제 벽시계, 테스트/결정론 문맥에서 교체 가능. */
export type Clock = () => string;

/** 완성된 로그 레코드를 실제로 내보내는 지점. 기본은 레벨별 `console.*` + JSON 직렬화. */
export type LogSink = (record: LogRecord) => void;

export interface Logger {
  debug(message: string, data?: Readonly<Record<string, unknown>>): void;
  info(message: string, data?: Readonly<Record<string, unknown>>): void;
  warn(message: string, data?: Readonly<Record<string, unknown>>): void;
  error(message: string, data?: Readonly<Record<string, unknown>>): void;
  /** 기존 상관 컨텍스트에 `extra`를 병합한 자식 로거를 만든다(겹치는 키는 `extra`가 이긴다). */
  child(extra: LogCorrelation): Logger;
}

export interface CreateLoggerOptions {
  readonly clock?: Clock;
  readonly sink?: LogSink;
}

const defaultClock: Clock = () => new Date().toISOString();

const CONSOLE_BY_LEVEL: Record<LogLevel, (line: string) => void> = {
  debug: (line) => console.debug(line),
  info: (line) => console.info(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

const defaultSink: LogSink = (record) => {
  CONSOLE_BY_LEVEL[record.level](JSON.stringify(record));
};

/**
 * 상관 컨텍스트가 바인딩된 로거를 만든다. `correlation`은 키가 하나 이상이어야 한다 —
 * 빈 객체(`{}`)를 넘기면 "상관 ID 없는 로거"가 생성되는 셈이라 이 시점에 즉시 던진다.
 */
export function createLogger(
  correlation: LogCorrelation,
  options: CreateLoggerOptions = {},
): Logger {
  if (Object.keys(correlation).length === 0) {
    throw new Error(
      "createLogger: correlation 컨텍스트가 비어 있습니다 — season/matchId 등 상관 ID를 최소 1개 지정하세요.",
    );
  }

  const clock = options.clock ?? defaultClock;
  const sink = options.sink ?? defaultSink;

  function emit(
    level: LogLevel,
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ): void {
    sink({
      level,
      message,
      timestamp: clock(),
      correlation,
      ...(data !== undefined ? { data } : {}),
    });
  }

  return {
    debug: (message, data) => emit("debug", message, data),
    info: (message, data) => emit("info", message, data),
    warn: (message, data) => emit("warn", message, data),
    error: (message, data) => emit("error", message, data),
    child: (extra) => createLogger({ ...correlation, ...extra }, options),
  };
}
