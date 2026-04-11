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
process.env.AI_API_URL = "http://localhost:8000";

// --- Prisma mocks ---
const userFindUniqueMock = mock(async () => null as unknown);
const dailySummaryFindManyMock = mock(async () => [] as unknown[]);
const periodReportCreateMock = mock(async () => ({}) as unknown);
const periodReportFindManyMock = mock(async () => [] as unknown[]);
const periodReportFindFirstMock = mock(async () => null as unknown);

mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    dailySummary: {
      findUnique: mock(async () => null),
      findFirst: mock(async () => null),
      findMany: dailySummaryFindManyMock,
    },
    commitAnalysis: {
      findMany: mock(async () => []),
    },
    repository: {
      findMany: mock(async () => []),
      findFirst: mock(async () => null),
      create: mock(async () => ({})),
      update: mock(async () => ({})),
    },
    periodReport: {
      create: periodReportCreateMock,
      findMany: periodReportFindManyMock,
      findFirst: periodReportFindFirstMock,
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

// Mock fetch for AI server calls
const originalFetch = globalThis.fetch;

beforeAll(() => {
  userFindUniqueMock.mockImplementation(async () => ({
    id: "user_test_id",
    accessToken: MOCK_ENCRYPTED_TOKEN,
  }));
});

beforeEach(() => {
  dailySummaryFindManyMock.mockImplementation(async () => []);
  periodReportCreateMock.mockImplementation(async () => ({
    id: "report_1",
    userId: "user_test_id",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2026-04-07"),
    reportType: "CUSTOM",
    summary: {},
    roadmap: {},
    createdAt: new Date("2026-04-10T00:00:00Z"),
    deletedAt: null,
  }));
  periodReportFindManyMock.mockImplementation(async () => []);
  periodReportFindFirstMock.mockImplementation(async () => null);

  // Restore fetch
  globalThis.fetch = originalFetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  userFindUniqueMock.mockClear();
  dailySummaryFindManyMock.mockClear();
  periodReportCreateMock.mockClear();
  periodReportFindManyMock.mockClear();
  periodReportFindFirstMock.mockClear();
});

// --- Tests ---

describe("POST /api/reports", () => {
  it("인증 없이 호출하면 401을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2026-04-01",
          endDate: "2026-04-07",
          reportType: "custom",
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("날짜 형식이 잘못되면 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          startDate: "2026-4-1",
          endDate: "2026-04-07",
          reportType: "custom",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("YYYY-MM-DD");
  });

  it("reportType이 잘못되면 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          startDate: "2026-04-01",
          endDate: "2026-04-07",
          reportType: "invalid",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("리포트를 생성하고 201을 반환한다", async () => {
    dailySummaryFindManyMock.mockImplementationOnce(async () => [
      {
        id: "ds_1",
        userId: "user_test_id",
        date: new Date("2026-04-01"),
        summaryText: "React 학습",
        commitCount: 3,
        tags: ["React"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const aiResult = {
      summary: {
        strengths: ["꾸준한 학습"],
        weaknesses: ["테스트 부족"],
        stats: { totalCommits: 3, activeDays: 1, topTags: ["React"] },
      },
      roadmap: {
        recommended_topics: ["TDD"],
        reasoning: "테스트 학습 권장",
        next_steps: ["Jest 배우기"],
      },
    };

    globalThis.fetch = mock((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("/ai/generate-report")) {
        return Promise.resolve(new Response(JSON.stringify(aiResult), { status: 200 }));
      }
      return originalFetch(url, init);
    }) as unknown as typeof fetch;

    const res = await app.fetch(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          startDate: "2026-04-01",
          endDate: "2026-04-07",
          reportType: "custom",
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { report: { id: string } };
    expect(body.report.id).toBe("report_1");
  });

  it("AI 서버 오류 시 502를 반환한다", async () => {
    dailySummaryFindManyMock.mockImplementationOnce(async () => []);

    globalThis.fetch = mock((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("/ai/generate-report")) {
        return Promise.resolve(new Response("Internal Server Error", { status: 500 }));
      }
      return originalFetch(url, init);
    }) as unknown as typeof fetch;

    const res = await app.fetch(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          startDate: "2026-04-01",
          endDate: "2026-04-07",
          reportType: "custom",
        }),
      }),
    );

    expect(res.status).toBe(502);
  });
});

describe("GET /api/reports", () => {
  it("인증 없이 호출하면 401을 반환한다", async () => {
    const res = await app.fetch(new Request("http://localhost/api/reports"));
    expect(res.status).toBe(401);
  });

  it("리포트 목록을 반환한다", async () => {
    const mockReports = [
      {
        id: "report_1",
        userId: "user_test_id",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-04-07"),
        reportType: "CUSTOM",
        summary: {},
        roadmap: {},
        createdAt: new Date(),
        deletedAt: null,
      },
    ];
    periodReportFindManyMock.mockImplementationOnce(async () => mockReports);

    const res = await app.fetch(
      new Request("http://localhost/api/reports", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reports: { id: string }[] };
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0]?.id).toBe("report_1");
  });
});

describe("GET /api/reports/:id", () => {
  it("인증 없이 호출하면 401을 반환한다", async () => {
    const res = await app.fetch(new Request("http://localhost/api/reports/report_1"));
    expect(res.status).toBe(401);
  });

  it("존재하지 않는 ID는 404를 반환한다", async () => {
    periodReportFindFirstMock.mockImplementationOnce(async () => null);
    const res = await app.fetch(
      new Request("http://localhost/api/reports/nonexistent", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("리포트 상세를 반환한다", async () => {
    const mockReport = {
      id: "report_1",
      userId: "user_test_id",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-07"),
      reportType: "CUSTOM",
      summary: { strengths: ["꾸준한 학습"] },
      roadmap: { recommended_topics: ["TDD"] },
      createdAt: new Date(),
      deletedAt: null,
    };
    periodReportFindFirstMock.mockImplementationOnce(async () => mockReport);

    const res = await app.fetch(
      new Request("http://localhost/api/reports/report_1", {
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { report: { id: string; summary: Record<string, unknown> } };
    expect(body.report.id).toBe("report_1");
    expect(body.report.summary).toBeDefined();
  });
});
