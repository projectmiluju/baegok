import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";

// 모듈 임포트 전에 환경변수 세팅 (env.ts 검증 통과용)
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.GITHUB_CLIENT_ID = "test-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
process.env.GITHUB_OAUTH_REDIRECT_URI = "http://localhost:4000/api/auth/github/callback";
process.env.JWT_SECRET = "test-jwt-secret-must-be-16-chars";
process.env.SESSION_MAX_AGE_SECONDS = "3600";
process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.WEBHOOK_BASE_URL = "https://test.ngrok.io";
process.env.KAFKA_BROKERS = "localhost:9092";

// Prisma·GitHub 서비스 모킹 — 실제 DB/외부 호출 없이 핸들러 동작 검증
const upsertMock = mock(async (args: { create: { githubId: number } }) => ({
  id: "user_test_id",
  githubId: args.create.githubId,
  githubUsername: "octocat",
  avatarUrl: "https://avatars.example.com/octocat.png",
  accessToken: "encrypted-token-stub",
  createdAt: new Date("2026-04-10T00:00:00.000Z"),
  updatedAt: new Date("2026-04-10T00:00:00.000Z"),
}));

const findUniqueMock = mock(async () => ({
  id: "user_test_id",
  githubId: 12345,
  githubUsername: "octocat",
  avatarUrl: "https://avatars.example.com/octocat.png",
  createdAt: new Date("2026-04-10T00:00:00.000Z"),
}));

mock.module("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: upsertMock,
      findUnique: findUniqueMock,
    },
  },
}));

const exchangeCodeForTokenMock = mock(async () => "github-access-token-stub");
const fetchGithubUserMock = mock(async () => ({
  id: 12345,
  login: "octocat",
  avatarUrl: "https://avatars.example.com/octocat.png" as string | null,
}));

mock.module("@/services/github-oauth", () => ({
  GITHUB_OAUTH_SCOPES: ["read:user", "repo", "admin:repo_hook"],
  buildAuthorizeUrl: (state: string) => `https://github.com/login/oauth/authorize?state=${state}`,
  exchangeCodeForToken: exchangeCodeForTokenMock,
  fetchGithubUser: fetchGithubUserMock,
}));

const { app } = await import("../index");
const { signJwt } = await import("@/lib/jwt");
const { encryptToken, decryptToken } = await import("@/lib/crypto");
const { SESSION_COOKIE_NAME } = await import("@/lib/session");
const jwt = (await import("jsonwebtoken")).default;

beforeAll(() => {
  // 모킹 호출 카운터 초기화
  upsertMock.mockClear();
  findUniqueMock.mockClear();
});

afterAll(() => {
  upsertMock.mockClear();
  findUniqueMock.mockClear();
});

describe("암호화 유틸", () => {
  it("AES-256-GCM 암호화/복호화는 원문을 복원해야 한다", () => {
    const original = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    const encrypted = encryptToken(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.split(":")).toHaveLength(3);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it("손상된 암호문은 복호화 시 예외를 던진다", () => {
    expect(() => decryptToken("invalid")).toThrow();
  });

  it("AuthTag가 변조되면 복호화는 실패해야 한다", () => {
    const encrypted = encryptToken("ghp_secret_token_value");
    const parts = encrypted.split(":") as [string, string, string];
    // AuthTag의 첫 바이트만 뒤집기
    const firstByte = parseInt(parts[1].slice(0, 2), 16);
    const flipped = (firstByte ^ 0xff).toString(16).padStart(2, "0");
    const tampered = `${parts[0]}:${flipped}${parts[1].slice(2)}:${parts[2]}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("Ciphertext가 변조되면 복호화는 실패해야 한다", () => {
    const encrypted = encryptToken("ghp_secret_token_value");
    const parts = encrypted.split(":") as [string, string, string];
    const firstByte = parseInt(parts[2].slice(0, 2), 16);
    const flipped = (firstByte ^ 0xff).toString(16).padStart(2, "0");
    const tampered = `${parts[0]}:${parts[1]}:${flipped}${parts[2].slice(2)}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("IV 길이가 잘못되면 복호화는 실패해야 한다", () => {
    const encrypted = encryptToken("ghp_secret_token_value");
    const parts = encrypted.split(":") as [string, string, string];
    const shortIv = parts[0].slice(0, 10); // 5바이트로 잘라냄
    const tampered = `${shortIv}:${parts[1]}:${parts[2]}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("빈 문자열도 라운드트립할 수 있어야 한다", () => {
    const encrypted = encryptToken("");
    expect(decryptToken(encrypted)).toBe("");
  });

  it("한글이 포함된 토큰도 UTF-8 라운드트립이 보장되어야 한다", () => {
    const original = "토큰_한글_😀_안녕하세요";
    expect(decryptToken(encryptToken(original))).toBe(original);
  });

  it("매번 다른 IV가 사용되어 동일 평문도 다른 암호문이 되어야 한다", () => {
    const a = encryptToken("same-plaintext");
    const b = encryptToken("same-plaintext");
    expect(a).not.toBe(b);
  });
});

describe("JWT 검증", () => {
  it("만료된 JWT는 401을 반환한다", async () => {
    const expiredToken = jwt.sign(
      { sub: "user_test_id", githubId: 12345, username: "octocat" },
      process.env.JWT_SECRET as string,
      { expiresIn: "-1s" },
    );
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: `Bearer ${expiredToken}` },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("다른 시크릿으로 서명된 JWT는 401을 반환한다", async () => {
    const foreignToken = jwt.sign(
      { sub: "user_test_id", githubId: 12345, username: "octocat" },
      "completely-different-secret-key",
      { expiresIn: "1h" },
    );
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: `Bearer ${foreignToken}` },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("페이로드 형식이 잘못된 JWT는 401을 반환한다", async () => {
    // sub가 숫자, githubId가 누락
    const malformedToken = jwt.sign({ sub: 12345 }, process.env.JWT_SECRET as string, {
      expiresIn: "1h",
    });
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: `Bearer ${malformedToken}` },
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("auth 미들웨어 — 헤더 파싱", () => {
  it("Bearer 외 다른 인증 스킴(Basic 등)은 거부한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("Authorization 헤더가 'Bearer ' 만 있고 토큰이 비면 401을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: "Bearer " },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("쿠키로 전달된 유효한 JWT도 인증을 통과해야 한다", async () => {
    const token = signJwt({
      sub: "user_test_id",
      githubId: 12345,
      username: "octocat",
    });
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("세션 만료 동기화", () => {
  it("쿠키 max-age와 JWT exp는 SESSION_MAX_AGE_SECONDS 단일 소스에서 파생되어야 한다", async () => {
    // Arrange — 콜백을 통과시켜 쿠키와 JWT 둘 다 발급받는다
    const res = await app.fetch(
      new Request("http://localhost/api/auth/github/callback?code=abc&state=valid-state", {
        headers: { cookie: "baegok_oauth_state=valid-state" },
      }),
    );
    expect(res.status).toBe(302);

    const setCookie = res.headers.get("set-cookie") ?? "";
    const cookieMaxAgeMatch = setCookie.match(/baegok_session=[^;]+;.*?Max-Age=(\d+)/i);
    expect(cookieMaxAgeMatch).not.toBeNull();
    const cookieMaxAge = Number(cookieMaxAgeMatch?.[1]);

    // 쿠키 토큰을 디코드해 exp를 확인 (서명 검증은 verifyJwt가 따로 함)
    const tokenMatch = setCookie.match(/baegok_session=([^;]+)/);
    const decoded = jwt.decode(tokenMatch?.[1] ?? "") as {
      iat: number;
      exp: number;
    } | null;
    expect(decoded).not.toBeNull();
    const jwtTtl = (decoded?.exp ?? 0) - (decoded?.iat ?? 0);

    // Assert — 둘이 정확히 같아야 한다 (현재 테스트 env: 3600)
    expect(cookieMaxAge).toBe(Number(process.env.SESSION_MAX_AGE_SECONDS));
    expect(jwtTtl).toBe(Number(process.env.SESSION_MAX_AGE_SECONDS));
    expect(cookieMaxAge).toBe(jwtTtl);
  });
});

describe("GET /api/auth/github", () => {
  it("GitHub OAuth 페이지로 302 리다이렉트하고 state 쿠키를 설정한다", async () => {
    const res = await app.fetch(new Request("http://localhost/api/auth/github"));
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("github.com/login/oauth/authorize");
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("baegok_oauth_state=");
  });
});

describe("GET /api/auth/github/callback", () => {
  it("state 누락 시 400을 반환한다", async () => {
    const res = await app.fetch(new Request("http://localhost/api/auth/github/callback?code=abc"));
    expect(res.status).toBe(400);
  });

  it("state 불일치 시 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/github/callback?code=abc&state=xxx", {
        headers: { cookie: "baegok_oauth_state=yyy" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("정상 콜백 시 사용자 upsert 후 세션 쿠키와 함께 리다이렉트한다", async () => {
    upsertMock.mockClear();
    const res = await app.fetch(
      new Request("http://localhost/api/auth/github/callback?code=abc&state=valid-state", {
        headers: { cookie: "baegok_oauth_state=valid-state" },
      }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/auth/callback");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("code 누락 + state 일치인 경우에도 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/github/callback?state=valid-state", {
        headers: { cookie: "baegok_oauth_state=valid-state" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GitHub 토큰 교환 실패 시 502를 반환한다", async () => {
    exchangeCodeForTokenMock.mockImplementationOnce(async () => {
      throw new Error("GitHub 토큰 교환 실패: HTTP 401");
    });
    const res = await app.fetch(
      new Request("http://localhost/api/auth/github/callback?code=abc&state=valid-state", {
        headers: { cookie: "baegok_oauth_state=valid-state" },
      }),
    );
    expect(res.status).toBe(502);
  });

  it("GitHub 사용자 조회 실패 시 502를 반환한다", async () => {
    fetchGithubUserMock.mockImplementationOnce(async () => {
      throw new Error("GitHub 사용자 조회 실패: HTTP 500");
    });
    const res = await app.fetch(
      new Request("http://localhost/api/auth/github/callback?code=abc&state=valid-state", {
        headers: { cookie: "baegok_oauth_state=valid-state" },
      }),
    );
    expect(res.status).toBe(502);
  });

  it("DB upsert 실패 시 502를 반환한다", async () => {
    upsertMock.mockImplementationOnce(async () => {
      throw new Error("DB 연결 실패");
    });
    const res = await app.fetch(
      new Request("http://localhost/api/auth/github/callback?code=abc&state=valid-state", {
        headers: { cookie: "baegok_oauth_state=valid-state" },
      }),
    );
    expect(res.status).toBe(502);
  });
});

describe("POST /api/auth/logout", () => {
  it("세션 쿠키를 제거한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/logout", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=;`);
  });
});

describe("GET /api/auth/me", () => {
  it("토큰 없이 호출하면 401을 반환한다", async () => {
    const res = await app.fetch(new Request("http://localhost/api/auth/me"));
    expect(res.status).toBe(401);
  });

  it("잘못된 토큰은 401을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: "Bearer not-a-real-token" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("유효한 JWT로 사용자 정보를 반환한다", async () => {
    const token = signJwt({
      sub: "user_test_id",
      githubId: 12345,
      username: "octocat",
    });
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { githubUsername: string } };
    expect(body.user.githubUsername).toBe("octocat");
    expect(findUniqueMock).toHaveBeenCalled();
  });

  it("JWT는 유효하지만 DB에 사용자가 없으면 404를 반환한다", async () => {
    findUniqueMock.mockImplementationOnce(
      async () => null as unknown as ReturnType<typeof findUniqueMock>,
    );
    const token = signJwt({
      sub: "user_deleted",
      githubId: 99999,
      username: "ghost",
    });
    const res = await app.fetch(
      new Request("http://localhost/api/auth/me", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(res.status).toBe(404);
  });
});
