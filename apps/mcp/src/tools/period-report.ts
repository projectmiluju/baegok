import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiCall } from "../api-client.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface ReportResponse {
  report: {
    id: string;
    startDate: string;
    endDate: string;
    summary: {
      strengths: string[];
      weaknesses: string[];
      stats: {
        totalCommits: number;
        activeDays: number;
        topTags: string[];
      };
    };
    roadmap: {
      recommended_topics: string[];
      reasoning: string;
      next_steps: string[];
    };
  };
}

function formatReport(report: ReportResponse["report"]): string {
  const { summary, roadmap } = report;
  const lines = [
    `📊 학습 리포트 (${report.startDate} ~ ${report.endDate})`,
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    `📈 통계`,
    `  총 커밋: ${summary.stats.totalCommits}건`,
    `  활동일: ${summary.stats.activeDays}일`,
    `  주요 태그: ${summary.stats.topTags.join(", ") || "없음"}`,
    "",
    `💪 강점`,
    ...summary.strengths.map((s) => `  • ${s}`),
    "",
    `🔧 개선점`,
    ...summary.weaknesses.map((w) => `  • ${w}`),
    "",
    `🗺️ 로드맵`,
    ...(roadmap.recommended_topics ?? []).map((t) => `  • ${t}`),
  ];

  return lines.join("\n");
}

export function registerPeriodReportTool(server: McpServer): void {
  server.tool(
    "get_period_report",
    "기간별 학습 리포트를 생성합니다",
    {
      startDate: z
        .string()
        .regex(DATE_REGEX, "YYYY-MM-DD 형식이어야 합니다")
        .describe("시작 날짜 (YYYY-MM-DD 형식)"),
      endDate: z
        .string()
        .regex(DATE_REGEX, "YYYY-MM-DD 형식이어야 합니다")
        .describe("종료 날짜 (YYYY-MM-DD 형식)"),
    },
    async ({ startDate, endDate }) => {
      const { report } = await apiCall<ReportResponse>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          startDate,
          endDate,
          reportType: "custom",
        }),
      });
      return {
        content: [{ type: "text" as const, text: formatReport(report) }],
      };
    },
  );
}
