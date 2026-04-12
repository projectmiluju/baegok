import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiCall } from "../api-client.js";

interface ReportDetail {
  id: string;
  roadmap: {
    recommendedTopics: string[];
    reasoning: string;
    nextSteps: string[];
  };
}

function formatRoadmap(data: ReportDetail): string {
  const { roadmap } = data;
  const lines = [
    `🗺️ 학습 로드맵 (리포트 ${data.id})`,
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    `📚 추천 학습 주제`,
    ...roadmap.recommendedTopics.map((t) => `  • ${t}`),
    "",
    `💡 추천 이유`,
    roadmap.reasoning,
    "",
    `👣 다음 단계`,
    ...roadmap.nextSteps.map((s) => `  • ${s}`),
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
      const data = await apiCall<ReportDetail>(`/api/reports/${encodeURIComponent(reportId)}`);
      return {
        content: [{ type: "text" as const, text: formatRoadmap(data) }],
      };
    },
  );
}
