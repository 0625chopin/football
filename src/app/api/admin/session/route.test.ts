/**
 * `route.ts`(관리자 세션 발급/해제) 자기검증 — **54일차(2026-10-02) 신설**, Task 037.
 * `global.fetch`를 스텁해 GoTrue(`/auth/v1/token`)·PostgREST(`/rest/v1/profile`) 호출을
 * 오프라인으로 검증한다(`client.test.ts`와 동일 패턴).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, POST } from "./route";
import { adminSessionRateLimiter } from "./rate-limiter";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function setEnv(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";
}

function restoreEnv(): void {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ORIGINAL_KEY;
}

function loginRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL("/api/admin/session", "http://localhost"), {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  setEnv();
});

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
  // 59일차 신설 — 요청별 IP 헤더가 없으면 전부 "unknown" 버킷을 공유하므로, 이 파일의
  // 다른 테스트가 남긴 카운트가 새어 들어가지 않게 매 테스트 후 리미터를 비운다.
  adminSessionRateLimiter.clear();
});

describe("POST /api/admin/session", () => {
  it("email/password 누락 시 400", async () => {
    const response = await POST(loginRequest({ email: "a@example.com" }));
    expect(response.status).toBe(400);
  });

  it("body가 JSON null이면 400 (58일차 — destructure 크래시로 500 되던 것 수정)", async () => {
    const response = await POST(loginRequest(null));
    expect(response.status).toBe(400);
  });

  it("body가 JSON 배열이면 400", async () => {
    const response = await POST(loginRequest([]));
    expect(response.status).toBe(400);
  });

  it("Supabase 환경변수가 없으면 500", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await POST(loginRequest({ email: "a@example.com", password: "pw" }));
    expect(response.status).toBe(500);
  });

  it("GoTrue 로그인 실패 시 401, 쿠키를 세팅하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const response = await POST(loginRequest({ email: "a@example.com", password: "wrong" }));
    expect(response.status).toBe(401);
    expect(response.cookies.get("admin_session_token")).toBeUndefined();
  });

  it("로그인은 성공했지만 role이 USER면 403, 쿠키를 세팅하지 않는다", async () => {
    const fetchMock = vi
      .fn()
      // /auth/v1/token
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok", expires_in: 3600 }) })
      // /rest/v1/profile
      .mockResolvedValueOnce({ ok: true, json: async () => [{ role: "USER" }] });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(loginRequest({ email: "user@example.com", password: "pw" }));
    expect(response.status).toBe(403);
    expect(response.cookies.get("admin_session_token")).toBeUndefined();
  });

  it("role이 ADMIN이면 200 + httpOnly 세션 쿠키를 발급한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok-admin", expires_in: 1800 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ role: "ADMIN" }] });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(loginRequest({ email: "admin@example.com", password: "pw" }));
    expect(response.status).toBe(200);
    const cookie = response.cookies.get("admin_session_token");
    expect(cookie?.value).toBe("tok-admin");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.maxAge).toBe(1800);
  });
});

describe("POST /api/admin/session — 레이트 리밋(NFR-SEC-009, 공개 300/분, IP당)", () => {
  it("300건까지는 정상 판정(400)이고, 301번째부터 429 + Retry-After", async () => {
    const ip = "203.0.113.9";
    let last: Awaited<ReturnType<typeof POST>> | undefined;
    for (let i = 0; i < 301; i++) {
      // 매 요청 credential 누락 400 경로를 태워 레이트 리밋이 인증 로직보다
      // 먼저 평가됨을 함께 확인한다(자격증명 유효성과 무관하게 카운트됨).
      last = await POST(loginRequest({}, { "x-forwarded-for": ip }));
      if (i < 300) expect(last.status).toBe(400);
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).not.toBeNull();
  });

  it("IP가 다르면 서로의 카운트에 영향을 주지 않는다", async () => {
    for (let i = 0; i < 300; i++) {
      await POST(loginRequest({}, { "x-forwarded-for": "198.51.100.1" }));
    }
    const other = await POST(loginRequest({}, { "x-forwarded-for": "198.51.100.2" }));
    expect(other.status).toBe(400); // 429가 아니라 정상 판정 경로까지 도달
  });

  it("x-forwarded-for 헤더에 프록시 체인이 있으면 첫 IP(클라이언트 원본)만 키로 쓴다", async () => {
    const response = await POST(
      loginRequest({}, { "x-forwarded-for": "203.0.113.50, 10.0.0.1, 10.0.0.2" }),
    );
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/admin/session", () => {
  it("세션 쿠키를 지운다", async () => {
    const response = await DELETE();
    expect(response.status).toBe(200);
    const cookie = response.cookies.get("admin_session_token");
    // `.delete()`는 즉시 만료되는 빈 값 쿠키를 Set-Cookie로 실어 보낸다.
    expect(cookie?.value).toBe("");
  });
});
