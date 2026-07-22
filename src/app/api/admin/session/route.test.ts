/**
 * `route.ts`(관리자 세션 발급/해제) 자기검증 — **54일차(2026-10-02) 신설**, Task 037.
 * `global.fetch`를 스텁해 GoTrue(`/auth/v1/token`)·PostgREST(`/rest/v1/profile`) 호출을
 * 오프라인으로 검증한다(`client.test.ts`와 동일 패턴).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, POST } from "./route";

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

function loginRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/admin/session", "http://localhost"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  setEnv();
});

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
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

describe("DELETE /api/admin/session", () => {
  it("세션 쿠키를 지운다", async () => {
    const response = await DELETE();
    expect(response.status).toBe(200);
    const cookie = response.cookies.get("admin_session_token");
    // `.delete()`는 즉시 만료되는 빈 값 쿠키를 Set-Cookie로 실어 보낸다.
    expect(cookie?.value).toBe("");
  });
});
