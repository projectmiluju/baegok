import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiCall } from "../api-client.js";

interface DailySummary {
  date: string;
  summary: string;
  commitCount: number;
  tags: string[];
}

function formatSummary(data: DailySummary): string {
  const tags = data.tags.length > 0 ? data.tags.join(", ") : "없음";
  return [
    `📅 ${data.date} 학습 요약`,
    "━━━━━━━━━━━━━━━━━━━━",
    `커밋 ${data.commitCount}건 · ${tags}`,
    "",
    data.summary,
  ].join("\n");
}

export function registerDailySummaryTool(server: McpServer): void {
  server.tool(
    "get_daily_summary",
    "특정 날짜의 학습 요약을 조회합니다",
    {
      date: z.string().describe("조회할 날짜 (YYYY-MM-DD 형식)"),
    },
    async ({ date }) => {
      const data = await apiCall<DailySummary>(
        `/api/summaries/daily?date=${encodeURIComponent(date)}`,
      );
      return { content: [{ type: "text" as const, text: formatSummary(data) }] };
    },
  );
}
