import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiCall } from "../api-client.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface DailySummaryResponse {
  summary: {
    summaryText: string;
    commitCount: number;
    tags: string[];
  };
}

function formatSummary(date: string, data: DailySummaryResponse["summary"]): string {
  const tags = data.tags.length > 0 ? data.tags.join(", ") : "없음";
  return [
    `📅 ${date} 학습 요약`,
    "━━━━━━━━━━━━━━━━━━━━",
    `커밋 ${data.commitCount}건 · ${tags}`,
    "",
    data.summaryText,
  ].join("\n");
}

export function registerDailySummaryTool(server: McpServer): void {
  server.tool(
    "get_daily_summary",
    "특정 날짜의 학습 요약을 조회합니다",
    {
      date: z
        .string()
        .regex(DATE_REGEX, "YYYY-MM-DD 형식이어야 합니다")
        .describe("조회할 날짜 (YYYY-MM-DD 형식)"),
    },
    async ({ date }) => {
      const { summary } = await apiCall<DailySummaryResponse>(
        `/api/summaries/daily?date=${encodeURIComponent(date)}`,
      );
      return { content: [{ type: "text" as const, text: formatSummary(date, summary) }] };
    },
  );
}
