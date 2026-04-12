import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiCall } from "../api-client.js";

interface PeriodReport {
  id: string;
  startDate: string;
  endDate: string;
  strengths: string[];
  weaknesses: string[];
  stats: {
    totalCommits: number;
    activeDays: number;
    topTags: string[];
  };
  roadmap: string;
}

function formatReport(data: PeriodReport): string {
  const lines = [
    `📊 학습 리포트 (${data.startDate} ~ ${data.endDate})`,
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    `📈 통계`,
    `  총 커밋: ${data.stats.totalCommits}건`,
    `  활동일: ${data.stats.activeDays}일`,
    `  주요 태그: ${data.stats.topTags.join(", ") || "없음"}`,
    "",
    `💪 강점`,
    ...data.strengths.map((s) => `  • ${s}`),
    "",
    `🔧 개선점`,
    ...data.weaknesses.map((w) => `  • ${w}`),
    "",
    `🗺️ 로드맵`,
    data.roadmap,
  ];

  return lines.join("\n");
}

export function registerPeriodReportTool(server: McpServer): void {
  server.tool(
    "get_period_report",
    "기간별 학습 리포트를 생성합니다",
    {
      startDate: z.string().describe("시작 날짜 (YYYY-MM-DD 형식)"),
      endDate: z.string().describe("종료 날짜 (YYYY-MM-DD 형식)"),
    },
    async ({ startDate, endDate }) => {
      const data = await apiCall<PeriodReport>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          startDate,
          endDate,
          reportType: "custom",
        }),
      });
      return {
        content: [{ type: "text" as const, text: formatReport(data) }],
      };
    },
  );
}
