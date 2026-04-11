import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authMiddleware, type AuthVariables } from "@/middlewares/auth";

const TEXT = {
  invalidDate: "date는 YYYY-MM-DD 형식이어야 합니다",
  summaryNotFound: "요약을 찾을 수 없습니다",
} as const;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const summaryRoute = new Hono<{ Variables: AuthVariables }>();

summaryRoute.use("*", authMiddleware);

/**
 * GET /api/summaries/daily?date=YYYY-MM-DD
 * 특정 날짜의 일일 요약 조회.
 */
summaryRoute.get("/daily", async (c) => {
  const { sub } = c.get("user");
  const dateParam = c.req.query("date");

  const parsed = dateSchema.safeParse(dateParam);
  if (!parsed.success) {
    return c.json({ error: TEXT.invalidDate }, 400);
  }

  const targetDate = new Date(parsed.data + "T00:00:00.000Z");

  try {
    const summary = await prisma.dailySummary.findUnique({
      where: {
        userId_date: { userId: sub, date: targetDate },
      },
    });

    if (!summary) {
      return c.json({
        summary: {
          summary_text: "오늘은 커밋 기록이 없습니다",
          commit_count: 0,
          tags: [],
        },
      });
    }

    return c.json({ summary });
  } catch (error) {
    console.error("[summaries] 일일 요약 조회 실패", error);
    return c.json({ error: "서버 오류가 발생했습니다" }, 500);
  }
});

/**
 * GET /api/summaries/daily/:id
 * 특정 ID의 일일 요약 상세 조회 + 해당 날짜 커밋 분석 목록 포함.
 */
summaryRoute.get("/daily/:id", async (c) => {
  const { sub } = c.get("user");
  const summaryId = c.req.param("id");

  try {
    const summary = await prisma.dailySummary.findFirst({
      where: { id: summaryId, userId: sub },
    });

    if (!summary) {
      return c.json({ error: TEXT.summaryNotFound }, 404);
    }

    // 해당 날짜의 커밋 분석 목록 조회
    const commitAnalyses = await prisma.commitAnalysis.findMany({
      where: {
        repository: { userId: sub, deletedAt: null },
        committedAt: {
          gte: summary.date,
          lt: new Date(summary.date.getTime() + 24 * 60 * 60 * 1000),
        },
        deletedAt: null,
      },
      orderBy: { committedAt: "asc" },
      select: {
        id: true,
        commitSha: true,
        commitMessage: true,
        diffSummary: true,
        tags: true,
        committedAt: true,
      },
    });

    return c.json({ summary, commitAnalyses });
  } catch (error) {
    console.error("[summaries] 요약 상세 조회 실패", error);
    return c.json({ error: "서버 오류가 발생했습니다" }, 500);
  }
});
