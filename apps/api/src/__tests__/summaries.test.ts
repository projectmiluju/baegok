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
const findUniqueMock = mock(async () => null as unknown);
const dailySummaryFindUniqueMock = mock(async () => null as unknown);
const dailySummaryFindFirstMock = mock(async () => null as unknown);
const commitAnalysisFindManyMock = mock(async () => [] as unknown[]);

mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUniqueMock },
    dailySummary: {
      findUnique: dailySummaryFindUniqueMock,
      findFirst: dailySummaryFindFirstMock,
    },
    commitAnalysis: {
      findMany: commitAnalysisFindManyMock,
    },
    repository: {
      findMany: mock(async () => []),
      findFirst: mock(async () => null),
      create: mock(async () => ({})),
      update: mock(async () => ({})),
    },
  },
}));

// Mock github-api to prevent import errors
mock.module("@/services/github-api", () => ({
  fetchUserRepos: mock(async () => []),
  createWebhook: mock(async () => 1),
  deleteWebhook: mock(async () => undefined),
}));

const { app } = await import("../index");
const { signJwt } = await import("@/lib/jwt");
const { encryptToken } = await import("@/lib/crypto");

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
  findUniqueMock.mockImplementation(async () => ({
    id: "user_test_id",
    accessToken: MOCK_ENCRYPTED_TOKEN,
  }));
});

beforeEach(() => {
  dailySummaryFindUniqueMock.mockImplementation(async () => null);
  dailySummaryFindFirstMock.mockImplementation(async () => null);
  commitAnalysisFindManyMock.mockImplementation(async () => []);
});

afterAll(() => {
  findUniqueMock.mockClear();
  dailySummaryFindUniqueMock.mockClear();
  dailySummaryFindFirstMock.mockClear();
  commitAnalysisFindManyMock.mockClear();
});

// --- Tests ---

describe("GET /api/summaries/daily", () => {
  it("인증 없이 호출하면 401을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily?date=2026-04-10"),
    );
    expect(res.status).toBe(401);
  });

  it("date 파라미터가 없으면 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("YYYY-MM-DD");
  });

  it("date 형식이 잘못되면 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily?date=2026-4-10", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("유효하지 않은 날짜(예: 2026-99-99)이면 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily?date=2026-99-99", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("요약이 없으면 빈 상태 응답을 반환한다", async () => {
    dailySummaryFindUniqueMock.mockImplementationOnce(async () => null);
    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily?date=2026-04-10", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: { summaryText: string; commitCount: number; tags: unknown[] };
    };
    expect(body.summary.summaryText).toBe("오늘은 커밋 기록이 없습니다");
    expect(body.summary.commitCount).toBe(0);
    expect(body.summary.tags).toEqual([]);
  });

  it("요약이 있으면 데이터를 반환한다", async () => {
    const mockSummary = {
      id: "summary_1",
      userId: "user_test_id",
      date: new Date("2026-04-10"),
      summaryText: "React와 TypeScript를 학습했습니다.",
      commitCount: 3,
      tags: ["React", "TypeScript"],
      createdAt: new Date("2026-04-10T23:00:00Z"),
      updatedAt: new Date("2026-04-10T23:00:00Z"),
    };
    dailySummaryFindUniqueMock.mockImplementationOnce(async () => mockSummary);

    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily?date=2026-04-10", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { summary: { id: string; commitCount: number } };
    expect(body.summary.id).toBe("summary_1");
    expect(body.summary.commitCount).toBe(3);
  });
});

describe("GET /api/summaries/daily/:id", () => {
  it("인증 없이 호출하면 401을 반환한다", async () => {
    const res = await app.fetch(new Request("http://localhost/api/summaries/daily/summary_1"));
    expect(res.status).toBe(401);
  });

  it("존재하지 않는 ID는 404를 반환한다", async () => {
    dailySummaryFindFirstMock.mockImplementationOnce(async () => null);
    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily/nonexistent", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("요약 상세 + 커밋 분석 목록을 반환한다", async () => {
    const mockSummary = {
      id: "summary_1",
      userId: "user_test_id",
      date: new Date("2026-04-10"),
      summaryText: "학습 요약",
      commitCount: 2,
      tags: ["React"],
      createdAt: new Date("2026-04-10T23:00:00Z"),
      updatedAt: new Date("2026-04-10T23:00:00Z"),
    };
    const mockCommits = [
      {
        id: "ca_1",
        commitSha: "abc123",
        commitMessage: "feat: 기능",
        diffSummary: "요약1",
        tags: ["React"],
        committedAt: new Date("2026-04-10T12:00:00Z"),
      },
    ];
    dailySummaryFindFirstMock.mockImplementationOnce(async () => mockSummary);
    commitAnalysisFindManyMock.mockImplementationOnce(async () => mockCommits);

    const res = await app.fetch(
      new Request("http://localhost/api/summaries/daily/summary_1", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: { id: string };
      commitAnalyses: { id: string }[];
    };
    expect(body.summary.id).toBe("summary_1");
    expect(body.commitAnalyses).toHaveLength(1);
    expect(body.commitAnalyses[0]?.id).toBe("ca_1");
  });
});
