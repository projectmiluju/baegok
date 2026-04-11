import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { getProducer, TOPIC_COMMIT_ANALYSIS } from "@/lib/kafka";

const TEXT = {
  missingSignature: "X-Hub-Signature-256 헤더가 누락되었습니다",
  invalidSignature: "Webhook 서명이 올바르지 않습니다",
  repoNotFound: "등록되지 않은 레포의 Webhook입니다",
  eventIgnored: "push 이외의 이벤트는 무시합니다",
} as const;

interface PushEventPayload {
  repository?: {
    id?: number;
    full_name?: string;
  };
  commits?: Array<{
    id?: string;
    message?: string;
    timestamp?: string;
  }>;
}

export const webhookRoute = new Hono();

/**
 * GitHub Webhook push 이벤트 수신.
 *
 * 1. push 이외 이벤트 → 200 (무시)
 * 2. X-Hub-Signature-256 서명 검증
 * 3. Kafka commit-analysis 토픽으로 발행 (fire-and-forget)
 * 4. 즉시 200 응답 (타임아웃 회피)
 */
webhookRoute.post("/github", async (c) => {
  // 1. 이벤트 타입 확인
  const event = c.req.header("x-github-event");
  if (event !== "push") {
    return c.json({ message: TEXT.eventIgnored }, 200);
  }

  // 2. 서명 검증
  const signature = c.req.header("x-hub-signature-256");
  if (!signature) {
    return c.json({ error: TEXT.missingSignature }, 401);
  }

  const rawBody = await c.req.text();
  let payload: PushEventPayload;
  try {
    payload = JSON.parse(rawBody) as PushEventPayload;
  } catch {
    return c.json({ error: "잘못된 JSON 본문입니다" }, 400);
  }

  const githubRepoId = payload.repository?.id;
  const fullName = payload.repository?.full_name;
  if (!githubRepoId || !fullName) {
    return c.json({ error: TEXT.repoNotFound }, 400);
  }

  // DB에서 해당 레포의 webhook_secret 조회
  const repo = await prisma.repository.findFirst({
    where: { githubRepoId, deletedAt: null },
    select: { id: true, webhookSecret: true },
  });
  if (!repo?.webhookSecret) {
    return c.json({ error: TEXT.repoNotFound }, 404);
  }

  const secret = decryptToken(repo.webhookSecret);
  const expectedSig = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");

  // timing-safe 비교
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return c.json({ error: TEXT.invalidSignature }, 401);
  }

  // 3. Kafka 발행 (fire-and-forget)
  const kafkaMessage = {
    repository_id: repo.id,
    github_repo_id: githubRepoId,
    full_name: fullName,
    commits: (payload.commits ?? []).map((c) => ({
      sha: c.id ?? "",
      message: c.message ?? "",
      timestamp: c.timestamp ?? "",
    })),
    received_at: new Date().toISOString(),
  };

  // 즉시 200 응답 — Kafka 실패는 로그만 (PRD §4: 재시도 없음)
  getProducer()
    .then((producer) =>
      producer.send({
        topic: TOPIC_COMMIT_ANALYSIS,
        messages: [{ value: JSON.stringify(kafkaMessage) }],
      }),
    )
    .catch((error) => {
      console.error("[webhooks] Kafka 발행 실패 (다음 push에서 누적 처리)", error);
    });

  return c.json({ message: "accepted" }, 200);
});
