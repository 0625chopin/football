/**
 * 레이트 리밋 — NFR-SEC-009(59일차, Task 038), 6팀 DB·인프라팀 소유.
 *
 * `docs/db/schema-design.md` §6.3.1(1169행)이 "레이트 리밋은 애플리케이션/인프라 계층,
 * DB 스키마 범위 밖"이라 명시해 뒀다 — 그래서 마이그레이션이 아니라 순수 TS 모듈로 둔다.
 *
 * NFR-SEC-009 두 버킷: 배팅 제출 **사용자당** 분당 30건, 공개 API **IP당** 분당 300건
 * (`docs/require/04-non-functional-requirements.md:125`). 두 버킷은 키 공간이 달라
 * 버킷별로 별도 리미터 인스턴스를 둔다(같은 limit을 anon IP와 authenticated user가
 * 나눠 쓰면 안 됨).
 *
 * 슬라이딩 윈도우 로그 방식(고정 윈도우가 아님) — 경계에서 2배 버스트를 허용하는
 * 고정 윈도우의 결함을 피한다. 시간은 호출자가 주입한다(`now: number`, ms epoch) —
 * `src/lib/sim/**`의 `Date.now()` 금지 규약(NFR-DT-001)과 같은 이유로 테스트
 * 결정성을 위함이며, 이 모듈은 sim 밖이라 규약 대상은 아니다.
 *
 * Deno(Edge Function, `supabase/functions/wallet/index.ts`)와 Node(Next.js API Route)
 * 양쪽에서 상대 경로로 그대로 import한다 — Deno 전용 API(`Deno.*`)·Node 전용 API
 * (`node:*`)·React·Supabase 클라이언트를 일절 쓰지 않는 순수 TS로 유지해야 한다.
 *
 * 인메모리 상태라 인스턴스가 여러 개면(멀티 리전/멀티 프로세스) 카운트가 인스턴스별로
 * 나뉜다 — 이 단계(1차 릴리스, 단일 Edge Function 인스턴스 가정)에서는 허용 가능한
 * 근사치이고, 영구 저장이 필요해지면 별도 이슈로 다룬다.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  /** 현재 윈도우에서 남은 허용 건수(거부 시 0). */
  readonly remaining: number;
  /** 거부 시 다음 시도까지 남은 ms(허용 시 0). */
  readonly retryAfterMs: number;
}

export interface RateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimiter {
  /** `key`(사용자 ID 또는 IP)의 이번 호출을 판정하고, 허용이면 즉시 기록한다. */
  check(key: string, now: number): RateLimitResult;
  /** 특정 키의 기록을 지운다(테스트 격리용). */
  reset(key: string): void;
  /** 전 키의 기록을 지운다(테스트 격리용). */
  clear(): void;
}

export function createSlidingWindowRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options;
  const hits = new Map<string, number[]>();

  return {
    check(key: string, now: number): RateLimitResult {
      const windowStart = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, remaining: 0, retryAfterMs: recent[0] + windowMs - now };
      }

      recent.push(now);
      hits.set(key, recent);
      return { allowed: true, remaining: limit - recent.length, retryAfterMs: 0 };
    },
    reset(key: string): void {
      hits.delete(key);
    },
    clear(): void {
      hits.clear();
    },
  };
}

/** NFR-SEC-009 — 배팅 제출, 사용자당 분당 30건. */
export const BETTING_RATE_LIMIT: RateLimiterOptions = { limit: 30, windowMs: 60_000 };

/** NFR-SEC-009 — 공개 API, IP당 분당 300건. */
export const PUBLIC_RATE_LIMIT: RateLimiterOptions = { limit: 300, windowMs: 60_000 };

/** IP당 리미터 키 추출 — Next.js Route Handler(`NextRequest`)·표준 `Request` 양쪽에서
 * 쓸 수 있게 `Headers`만 요구한다(59일차 재수정 — `admin/session/route.ts`와
 * `api/live/**` 두 곳이 중복 구현하지 않도록 여기로 뽑음).
 *
 * `x-forwarded-for`의 첫 항목(클라이언트 원본 IP) → 없으면 `x-real-ip` → 둘 다 없으면
 * `"unknown"` 고정 키로 묶는다(로컬 개발/테스트 환경 — 실 배포 호스팅 프록시는 이
 * 헤더를 항상 채운다). */
export function getClientIp(headers: { readonly get: (name: string) => string | null }): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
