/**
 * `proxy.ts` 자기검증 — **54일차(2026-10-02) 신설**, Task 037 (`/admin/**` 인증+역할 확인
 * 가드) 회귀 방지. 기존 로케일 리다이렉트 동작(무관 경로)이 이번 변경으로 깨지지 않는지도
 * 함께 확인한다 — 팀 지시 "기존 로케일 리다이렉트 동작을 깨뜨리지 마세요" 대응.
 *
 * `global.fetch`를 스텁해 PostgREST 호출을 오프라인으로 검증한다(`client.test.ts`와
 * 동일 패턴).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

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

function requestFor(pathname: string, cookie?: string): NextRequest {
  const init = cookie ? { headers: { cookie } } : undefined;
  return new NextRequest(new URL(pathname, "http://localhost"), init);
}

beforeEach(() => {
  setEnv();
});

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
});

describe("proxy — 기존 로케일 리다이렉트 회귀 방지", () => {
  it("로케일 프리픽스가 없는 무관 경로는 여전히 기본 로케일로 리다이렉트한다", async () => {
    const response = await proxy(requestFor("/sample"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/ko/sample");
  });

  it("이미 지원 로케일이 붙은 무관 경로는 그대로 통과한다", async () => {
    const response = await proxy(requestFor("/ko/sample"));
    expect(response.status).not.toBe(403);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy — /admin 가드 (NFR-SEC-007, 54일차)", () => {
  it("로케일 없이 /admin에 쿠키 없이 접근하면 403", async () => {
    const response = await proxy(requestFor("/admin"));
    expect(response.status).toBe(403);
  });

  it("/ko/admin에 쿠키 없이 접근하면 403", async () => {
    const response = await proxy(requestFor("/ko/admin"));
    expect(response.status).toBe(403);
  });

  it("/ko/admin/scheduler 같은 하위 경로도 가드된다", async () => {
    const response = await proxy(requestFor("/ko/admin/scheduler"));
    expect(response.status).toBe(403);
  });

  it("'admin'으로 시작만 하는 무관 세그먼트는 가드 대상이 아니다(세그먼트 단위 비교)", async () => {
    const response = await proxy(requestFor("/ko/administrator"));
    expect(response.status).not.toBe(403);
  });

  it("쿠키는 있지만 role 조회가 USER면 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ role: "USER" }],
      }),
    );
    const response = await proxy(requestFor("/ko/admin", "admin_session_token=valid-token"));
    expect(response.status).toBe(403);
  });

  it("쿠키가 있고 role 조회가 ADMIN이면 통과한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ role: "ADMIN" }],
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await proxy(requestFor("/ko/admin", "admin_session_token=valid-token"));
    expect(response.status).not.toBe(403);
    // PostgREST에 본인 role만 물어봤는지 확인 — Authorization에 쿠키 토큰이 실렸는지.
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer valid-token");
  });

  it("PostgREST 응답이 실패(!ok)면 fail-closed로 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => [] }));
    const response = await proxy(requestFor("/ko/admin", "admin_session_token=expired"));
    expect(response.status).toBe(403);
  });

  it("네트워크 에러가 나도 fail-closed로 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const response = await proxy(requestFor("/ko/admin", "admin_session_token=any"));
    expect(response.status).toBe(403);
  });

  it("Supabase 환경변수가 없으면 쿠키가 있어도 fail-closed로 403", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const response = await proxy(requestFor("/ko/admin", "admin_session_token=any"));
    expect(response.status).toBe(403);
  });
});
