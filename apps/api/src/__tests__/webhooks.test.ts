import { beforeEach, describe, expect, it, mock } from "bun:test";
import { createHmac } from "node:crypto";

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

// --- Prisma mock ---
const findFirstMock = mock(async () => ({
  id: "repo_1",
  webhookSecret: "mock-encrypted-secret",
}));

mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mock(async () => null) },
    repository: {
      findFirst: findFirstMock,
      findMany: mock(async () => []),
      create: mock(async () => ({})),
      update: mock(async () => ({})),
    },
  },
}));

// --- Kafka mock ---
const sendMock = mock(async () => undefined);
mock.module("@/lib/kafka", () => ({
  TOPIC_COMMIT_ANALYSIS: "commit-analysis",
  getProducer: async () => ({ send: sendMock }),
  disconnectProducer: async () => undefined,
}));

const { app } = await import("../index");
const { encryptToken } = await import("@/lib/crypto");

const WEBHOOK_SECRET = "test-webhook-secret-hex";
const ENCRYPTED_WEBHOOK_SECRET = encryptToken(WEBHOOK_SECRET);

function makeSignature(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

const PUSH_PAYLOAD = JSON.stringify({
  repository: { id: 12345, full_name: "user/repo" },
  commits: [{ id: "abc123", message: "feat: 기능 추가", timestamp: "2026-04-10T00:00:00Z" }],
});

beforeEach(() => {
  sendMock.mockClear();
  findFirstMock.mockImplementation(async () => ({
    id: "repo_1",
    webhookSecret: ENCRYPTED_WEBHOOK_SECRET,
  }));
});

describe("POST /api/webhooks/github", () => {
  it("push 이외 이벤트는 200으로 무시한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "ping",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("무시");
  });

  it("서명 헤더 누락 시 401을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "content-type": "application/json",
        },
        body: PUSH_PAYLOAD,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("서명 불일치 시 401을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": "sha256=invalid",
          "content-type": "application/json",
        },
        body: PUSH_PAYLOAD,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("등록되지 않은 레포는 404를 반환한다", async () => {
    findFirstMock.mockImplementationOnce(
      async () => null as unknown as ReturnType<typeof findFirstMock>,
    );
    const sig = makeSignature(PUSH_PAYLOAD, WEBHOOK_SECRET);
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": sig,
          "content-type": "application/json",
        },
        body: PUSH_PAYLOAD,
      }),
    );
    expect(res.status).toBe(404);
  });

  it("유효한 push 이벤트 시 200을 반환하고 Kafka에 발행한다", async () => {
    const sig = makeSignature(PUSH_PAYLOAD, WEBHOOK_SECRET);
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": sig,
          "content-type": "application/json",
        },
        body: PUSH_PAYLOAD,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("accepted");

    // fire-and-forget이라 약간의 지연 후 확인
    await new Promise((r) => setTimeout(r, 50));
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("repository.id가 누락된 payload는 400을 반환한다", async () => {
    const body = JSON.stringify({ repository: { full_name: "user/repo" }, commits: [] });
    const sig = makeSignature(body, WEBHOOK_SECRET);
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": sig,
          "content-type": "application/json",
        },
        body,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("Kafka 발행 실패해도 200을 반환한다 (fire-and-forget)", async () => {
    sendMock.mockImplementationOnce(async () => {
      throw new Error("Kafka down");
    });
    const sig = makeSignature(PUSH_PAYLOAD, WEBHOOK_SECRET);
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": sig,
          "content-type": "application/json",
        },
        body: PUSH_PAYLOAD,
      }),
    );
    expect(res.status).toBe(200);
  });

  it("commits가 빈 배열인 push도 정상 200을 반환한다", async () => {
    const body = JSON.stringify({
      repository: { id: 12345, full_name: "user/repo" },
      commits: [],
    });
    const sig = makeSignature(body, WEBHOOK_SECRET);
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": sig,
          "content-type": "application/json",
        },
        body,
      }),
    );
    expect(res.status).toBe(200);
  });

  it("잘못된 JSON 본문은 400을 반환한다", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": "sha256=dummy",
          "content-type": "application/json",
        },
        body: "not-json{{{",
      }),
    );
    expect(res.status).toBe(400);
  });
});
