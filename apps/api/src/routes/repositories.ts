import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { authMiddleware, type AuthVariables } from "@/middlewares/auth";
import { fetchUserRepos, createWebhook, deleteWebhook } from "@/services/github-api";

const TEXT = {
  userNotFound: "사용자를 찾을 수 없습니다",
  repoNotFound: "레포를 찾을 수 없습니다",
  alreadyConnected: "이미 연결된 레포입니다",
  webhookFailed: "GitHub Webhook 등록에 실패했습니다",
  githubApiFailed: "GitHub API 호출에 실패했습니다",
  invalidBody: "요청 본문이 올바르지 않습니다",
  invalidPage: "page는 1 이상의 정수여야 합니다",
} as const;

const connectBodySchema = z.object({
  githubRepoId: z.number().int().positive(),
  fullName: z.string().min(1),
});

const pageSchema = z.coerce.number().int().min(1).default(1);

export const repositoryRoute = new Hono<{ Variables: AuthVariables }>();

repositoryRoute.use("*", authMiddleware);

/**
 * GitHub에서 내 레포 목록 조회 (프록시).
 * 사용자의 access_token을 복호화해 GitHub API에 전달한다.
 */
repositoryRoute.get("/github", async (c) => {
  const { sub } = c.get("user");
  const pageResult = pageSchema.safeParse(c.req.query("page") ?? "1");
  if (!pageResult.success) {
    return c.json({ error: TEXT.invalidPage }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { accessToken: true },
  });
  if (!user) {
    return c.json({ error: TEXT.userNotFound }, 404);
  }

  try {
    const accessToken = decryptToken(user.accessToken);
    const repos = await fetchUserRepos(accessToken, pageResult.data);
    return c.json({ repos });
  } catch (error) {
    console.error("[repositories] GitHub 레포 목록 조회 실패", error);
    return c.json({ error: TEXT.githubApiFailed }, 502);
  }
});

/**
 * 배곡에 연결된 레포 목록 조회.
 */
repositoryRoute.get("/", async (c) => {
  const { sub } = c.get("user");
  const repositories = await prisma.repository.findMany({
    where: { userId: sub, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      githubRepoId: true,
      fullName: true,
      webhookId: true,
      isActive: true,
      createdAt: true,
    },
  });
  return c.json({ repositories });
});

/**
 * 레포 연결 + GitHub Webhook 자동 등록.
 */
repositoryRoute.post("/", async (c) => {
  const { sub } = c.get("user");
  const env = getEnv();

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: TEXT.invalidBody }, 400);
  }

  const body = connectBodySchema.safeParse(rawBody);
  if (!body.success) {
    return c.json({ error: body.error.flatten().fieldErrors }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { accessToken: true },
  });
  if (!user) {
    return c.json({ error: TEXT.userNotFound }, 404);
  }

  // 활성 상태의 동일 레포가 있으면 중복
  const active = await prisma.repository.findFirst({
    where: { userId: sub, githubRepoId: body.data.githubRepoId, deletedAt: null },
  });
  if (active) {
    return c.json({ error: TEXT.alreadyConnected }, 409);
  }

  const accessToken = decryptToken(user.accessToken);
  const webhookSecretRaw = randomBytes(32).toString("hex");
  const callbackUrl = `${env.WEBHOOK_BASE_URL}/api/webhooks/github`;

  let webhookId: number;
  try {
    webhookId = await createWebhook(accessToken, body.data.fullName, callbackUrl, webhookSecretRaw);
  } catch (error) {
    console.error("[repositories] Webhook 생성 실패", error);
    return c.json({ error: TEXT.webhookFailed }, 502);
  }

  // soft-delete된 동일 레포가 있으면 재활성화 (unique 제약 대응)
  const softDeleted = await prisma.repository.findFirst({
    where: {
      userId: sub,
      githubRepoId: body.data.githubRepoId,
      deletedAt: { not: null },
    },
  });

  const selectFields = {
    id: true,
    githubRepoId: true,
    fullName: true,
    webhookId: true,
    isActive: true,
    createdAt: true,
  } as const;

  const repository = softDeleted
    ? await prisma.repository.update({
        where: { id: softDeleted.id },
        data: {
          fullName: body.data.fullName,
          webhookId,
          webhookSecret: encryptToken(webhookSecretRaw),
          isActive: true,
          deletedAt: null,
        },
        select: selectFields,
      })
    : await prisma.repository.create({
        data: {
          userId: sub,
          githubRepoId: body.data.githubRepoId,
          fullName: body.data.fullName,
          webhookId,
          webhookSecret: encryptToken(webhookSecretRaw),
          isActive: true,
        },
        select: selectFields,
      });

  return c.json({ repository }, 201);
});

/**
 * 레포 연결 해제 + Webhook 삭제 + soft delete.
 */
repositoryRoute.delete("/:id", async (c) => {
  const { sub } = c.get("user");
  const repoId = c.req.param("id");

  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId: sub, deletedAt: null },
  });
  if (!repo) {
    return c.json({ error: TEXT.repoNotFound }, 404);
  }

  // GitHub Webhook 삭제 시도 (실패해도 soft delete는 진행)
  try {
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { accessToken: true },
    });
    if (user && repo.webhookId) {
      const accessToken = decryptToken(user.accessToken);
      await deleteWebhook(accessToken, repo.fullName, repo.webhookId);
    }
  } catch (error) {
    console.error("[repositories] Webhook 삭제 실패 (무시하고 진행)", error);
  }

  await prisma.repository.update({
    where: { id: repoId, userId: sub },
    data: { deletedAt: new Date(), isActive: false },
  });

  return c.json({ message: "레포 연결이 해제되었습니다" });
});
