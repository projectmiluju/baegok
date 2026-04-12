import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiCall } from "../api-client.js";

interface ReportResponse {
  report: {
    id: string;
    roadmap: {
      recommended_topics?: string[];
      reasoning?: string;
      next_steps?: string[];
    };
  };
}

function formatRoadmap(report: ReportResponse["report"]): string {
  const { roadmap } = report;
  const topics = roadmap.recommended_topics ?? [];
  const reasoning = roadmap.reasoning ?? "";
  const nextSteps = roadmap.next_steps ?? [];

  const lines = [
    `🗺️ 학습 로드맵 (리포트 ${report.id})`,
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    `📚 추천 학습 주제`,
    ...(topics.length > 0 ? topics.map((t) => `  • ${t}`) : ["  (없음)"]),
    "",
    `💡 추천 이유`,
    reasoning || "(없음)",
    "",
    `👣 다음 단계`,
    ...(nextSteps.length > 0 ? nextSteps.map((s) => `  • ${s}`) : ["  (없음)"]),
  ];

  return lines.join("\n");
}

export function registerRoadmapTool(server: McpServer): void {
  server.tool(
    "get_roadmap",
    "특정 리포트의 학습 로드맵을 조회합니다",
    {
      reportId: z.string().describe("리포트 ID"),
    },
    async ({ reportId }) => {
      const { report } = await apiCall<ReportResponse>(
        `/api/reports/${encodeURIComponent(reportId)}`,
      );
      return {
        content: [{ type: "text" as const, text: formatRoadmap(report) }],
      };
    },
  );
}
