import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

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

// --- Prisma mocks ---
const findUniqueMock = mock(async () => ({
  id: "user_test_id",
  accessToken: "PLACEHOLDER",
}));

const findManyMock = mock(async () => [
  {
    id: "repo_1",
    githubRepoId: 100,
    fullName: "user/repo-a",
    webhookId: 1001,
    isActive: true,
    createdAt: new Date("2026-04-10"),
  },
]);

const findFirstMock = mock(async () => null as null | Record<string, unknown>);

const createMock = mock(async () => ({
  id: "repo_new",
  githubRepoId: 200,
  fullName: "user/repo-b",
  webhookId: 2001,
  isActive: true,
  createdAt: new Date("2026-04-10"),
}));

const updateMock = mock(async () => ({
  id: "repo_1",
  deletedAt: new Date(),
  isActive: false,
}));

mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUniqueMock },
    repository: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
    },
  },
}));

// --- GitHub API mocks ---
const fetchUserReposMock = mock(async () => [
  {
    id: 100,
    full_name: "user/repo-a",
    name: "repo-a",
    private: false,
    html_url: "https://github.com/user/repo-a",
    description: null,
    language: "TypeScript",
    updated_at: "2026-04-10T00:00:00Z",
  },
]);

const createWebhookMock = mock(async () => 2001);
const deleteWebhookMock = mock(async () => undefined);

mock.module("@/services/github-api", () => ({
  fetchUserRepos: fetchUserReposMock,
  createWebhook: createWebhookMock,
  deleteWebhook: deleteWebhookMock,
}));

const { app } = await import("../index");
const { signJwt } = await import("@/lib/jwt");
const { encryptToken } = await import("@/lib/crypto");

// mock user가 반환할 실제 암호화된 access_token
const MOCK_ENCRYPTED_TOKEN = encryptToken("ghp_mock_access_token");

function authHeader(): Record<string, string> {
  const token = signJwt({
    sub: "user_test_id",
    githubId: 12345,
    username: "octocat",
  });
  return { authorization: `Bearer ${token}` };
}

beforeAll(() => {
  // mock user가 실제 암호화된 accessToken을 반환하도록 설정
  findUniqueMock.mockImplementation(async () => ({
    id: "user_test_id",
    accessToken: MOCK_ENCRYPTED_TOKEN,
  }));
  findManyMock.mockClear();
  findFirstMock.mockClear();
  createMock.mockClear();
  updateMock.mockClear();
  fetchUserReposMock.mockClear();
  createWebhookMock.mockClear();
  deleteWebhookMock.mockClear();
});

beforeEach(() => {
  findFirstMock.mockImplementation(async () => null);
});

afterAll(() => {
  findUniqueMock.mockClear();
  findManyMock.mockClear();
});

// --- Tests ---

describe("GET /api/repositories/github", () => {
  it("인증 없이 호출하면 401을 반환한다", async () => {
    const res = await app.fetch(new Request("http://localhost/api/repositories/github"));
    expect(res.status).toBe(401);
  });

  it("인증된 사용자의 GitHub 레포 목록을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories/github", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { repos: { id: number }[] };
    expect(body.repos).toHaveLength(1);
    expect(body.repos[0]?.id).toBe(100);
  });

  it("page가 0이면 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories/github?page=0", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("page가 문자열이면 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories/github?page=abc", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GitHub API 실패 시 502를 반환한다", async () => {
    fetchUserReposMock.mockImplementationOnce(async () => {
      throw new Error("GitHub 500");
    });
    const res = await app.fetch(
      new Request("http://localhost/api/repositories/github", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(502);
  });
});

describe("GET /api/repositories", () => {
  it("연결된 레포 목록을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      repositories: { fullName: string }[];
    };
    expect(body.repositories).toHaveLength(1);
  });
});

describe("POST /api/repositories", () => {
  it("invalid JSON body는 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories", {
        method: "POST",
        headers: { ...authHeader(), "content-type": "application/json" },
        body: "not json{{{",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("레포를 연결하고 Webhook을 생성한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories", {
        method: "POST",
        headers: { ...authHeader(), "content-type": "application/json" },
        body: JSON.stringify({ githubRepoId: 200, fullName: "user/repo-b" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { repository: { webhookId: number } };
    expect(body.repository.webhookId).toBe(2001);
    expect(createWebhookMock).toHaveBeenCalled();
  });

  it("이미 연결된 레포는 409를 반환한다", async () => {
    findFirstMock.mockImplementationOnce(async () => ({
      id: "existing",
      githubRepoId: 200,
    }));
    const res = await app.fetch(
      new Request("http://localhost/api/repositories", {
        method: "POST",
        headers: { ...authHeader(), "content-type": "application/json" },
        body: JSON.stringify({ githubRepoId: 200, fullName: "user/repo-b" }),
      }),
    );
    expect(res.status).toBe(409);
  });

  it("잘못된 body는 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories", {
        method: "POST",
        headers: { ...authHeader(), "content-type": "application/json" },
        body: JSON.stringify({ githubRepoId: "not-a-number" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("Webhook 생성 실패 시 502를 반환한다", async () => {
    createWebhookMock.mockImplementationOnce(async () => {
      throw new Error("GitHub Webhook 생성 실패");
    });
    const res = await app.fetch(
      new Request("http://localhost/api/repositories", {
        method: "POST",
        headers: { ...authHeader(), "content-type": "application/json" },
        body: JSON.stringify({ githubRepoId: 300, fullName: "user/repo-c" }),
      }),
    );
    expect(res.status).toBe(502);
  });
});

describe("POST /api/repositories — 재연결", () => {
  it("soft-delete된 레포를 재연결하면 재활성화해야 한다", async () => {
    // soft-deleted 행이 존재
    findFirstMock
      .mockImplementationOnce(async () => null) // active 확인 → 없음
      .mockImplementationOnce(async () => ({
        id: "repo_soft_deleted",
        githubRepoId: 400,
        deletedAt: new Date("2026-04-09"),
      }));
    updateMock.mockClear();
    const res = await app.fetch(
      new Request("http://localhost/api/repositories", {
        method: "POST",
        headers: { ...authHeader(), "content-type": "application/json" },
        body: JSON.stringify({
          githubRepoId: 400,
          fullName: "user/repo-reactivate",
        }),
      }),
    );
    expect(res.status).toBe(201);
    // update가 호출되어야 함 (create 아님)
    expect(updateMock).toHaveBeenCalled();
  });
});

describe("DELETE /api/repositories/:id", () => {
  it("레포를 soft delete하고 Webhook을 삭제한다", async () => {
    findFirstMock.mockImplementationOnce(async () => ({
      id: "repo_1",
      userId: "user_test_id",
      fullName: "user/repo-a",
      webhookId: 1001,
      deletedAt: null,
    }));
    const res = await app.fetch(
      new Request("http://localhost/api/repositories/repo_1", {
        method: "DELETE",
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
    expect(deleteWebhookMock).toHaveBeenCalled();
  });

  it("Webhook 삭제 실패해도 soft delete는 진행해야 한다", async () => {
    findFirstMock.mockImplementationOnce(async () => ({
      id: "repo_1",
      userId: "user_test_id",
      fullName: "user/repo-a",
      webhookId: 1001,
      deletedAt: null,
    }));
    deleteWebhookMock.mockImplementationOnce(async () => {
      throw new Error("GitHub API 500");
    });
    updateMock.mockClear();
    const res = await app.fetch(
      new Request("http://localhost/api/repositories/repo_1", {
        method: "DELETE",
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });

  it("존재하지 않는 레포는 404를 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/repositories/nonexistent", {
        method: "DELETE",
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(404);
  });
});
