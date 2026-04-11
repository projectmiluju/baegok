import { Hono } from "hono";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { authMiddleware, type AuthVariables } from "@/middlewares/auth";

const TEXT = {
  invalidDates: "startDate, endDate는 YYYY-MM-DD 형식이어야 합니다",
  invalidReportType: 'reportType은 "custom" 또는 "weekly_auto"이어야 합니다',
  reportNotFound: "리포트를 찾을 수 없습니다",
  aiServerError: "AI 서버 호출에 실패했습니다",
  serverError: "서버 오류가 발생했습니다",
} as const;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const reportTypeSchema = z.enum(["custom", "weekly_auto"]);

const createReportSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  reportType: reportTypeSchema,
});

export const reportRoute = new Hono<{ Variables: AuthVariables }>();

reportRoute.use("*", authMiddleware);

/**
 * POST /api/reports — 기간별 학습 리포트 생성.
 */
reportRoute.post("/", async (c) => {
  const { sub } = c.get("user");

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: "요청 본문이 올바르지 않습니다" }, 400);
  }

  const parsed = createReportSchema.safeParse(rawBody);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    if (fieldErrors.reportType) {
      return c.json({ error: TEXT.invalidReportType }, 400);
    }
    return c.json({ error: TEXT.invalidDates }, 400);
  }

  const { startDate, endDate, reportType } = parsed.data;

  const startDateObj = new Date(startDate + "T00:00:00.000Z");
  const endDateObj = new Date(endDate + "T00:00:00.000Z");

  if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
    return c.json({ error: TEXT.invalidDates }, 400);
  }

  if (startDateObj > endDateObj) {
    return c.json({ error: "startDate는 endDate보다 이전이어야 합니다" }, 400);
  }

  try {
    // 기간 내 DailySummary 조회
    const dailySummaries = await prisma.dailySummary.findMany({
      where: {
        userId: sub,
        date: {
          gte: startDateObj,
          lte: endDateObj,
        },
      },
      orderBy: { date: "asc" },
    });

    // AI 서버 호출용 데이터 구성
    const summariesForAi = dailySummaries.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      summary_text: s.summaryText ?? "",
      commit_count: s.commitCount,
      tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
    }));

    const env = getEnv();

    // AI 서버에 리포트 생성 요청 (30초 타임아웃)
    let aiResponse: Response;
    try {
      aiResponse = await fetch(`${env.AI_API_URL}/ai/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaries: summariesForAi,
          start_date: startDate,
          end_date: endDate,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (fetchError) {
      console.error("[reports] AI 서버 연결 실패/타임아웃:", fetchError);
      return c.json({ error: TEXT.aiServerError }, 502);
    }

    if (!aiResponse.ok) {
      console.error("[reports] AI 서버 응답 오류:", aiResponse.status);
      return c.json({ error: TEXT.aiServerError }, 502);
    }

    let aiResult: { summary: Record<string, unknown>; roadmap: Record<string, unknown> };
    try {
      aiResult = (await aiResponse.json()) as typeof aiResult;
    } catch {
      console.error("[reports] AI 서버 응답 JSON 파싱 실패");
      return c.json({ error: TEXT.aiServerError }, 502);
    }

    // PeriodReport 저장
    const reportTypeValue = reportType === "weekly_auto" ? "WEEKLY_AUTO" : "CUSTOM";

    const report = await prisma.periodReport.create({
      data: {
        userId: sub,
        startDate: startDateObj,
        endDate: endDateObj,
        reportType: reportTypeValue,
        summary: (aiResult.summary ?? {}) as Prisma.InputJsonValue,
        roadmap: (aiResult.roadmap ?? {}) as Prisma.InputJsonValue,
      },
    });

    return c.json({ report }, 201);
  } catch (error) {
    console.error("[reports] 리포트 생성 실패", error);
    return c.json({ error: TEXT.serverError }, 500);
  }
});

/**
 * GET /api/reports — 사용자의 리포트 목록 조회.
 */
reportRoute.get("/", async (c) => {
  const { sub } = c.get("user");

  try {
    const reports = await prisma.periodReport.findMany({
      where: { userId: sub, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ reports });
  } catch (error) {
    console.error("[reports] 리포트 목록 조회 실패", error);
    return c.json({ error: TEXT.serverError }, 500);
  }
});

/**
 * GET /api/reports/:id — 리포트 상세 조회.
 */
reportRoute.get("/:id", async (c) => {
  const { sub } = c.get("user");
  const reportId = c.req.param("id");

  try {
    const report = await prisma.periodReport.findFirst({
      where: { id: reportId, userId: sub, deletedAt: null },
    });

    if (!report) {
      return c.json({ error: TEXT.reportNotFound }, 404);
    }

    return c.json({ report });
  } catch (error) {
    console.error("[reports] 리포트 상세 조회 실패", error);
    return c.json({ error: TEXT.serverError }, 500);
  }
});
