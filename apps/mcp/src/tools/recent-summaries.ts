import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiCall } from "../api-client.js";

interface DailySummaryResponse {
  summary: {
    summaryText: string;
    commitCount: number;
    tags: string[];
  };
}

interface ParsedSummary {
  date: string;
  summaryText: string;
  commitCount: number;
  tags: string[];
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatSummaries(summaries: ParsedSummary[]): string {
  if (summaries.length === 0) {
    return "조회된 학습 요약이 없습니다.";
  }

  const lines = [`📋 최근 ${summaries.length}일 학습 요약`, "━━━━━━━━━━━━━━━━━━━━"];

  for (const s of summaries) {
    const tags = s.tags.length > 0 ? s.tags.join(", ") : "없음";
    lines.push(`\n📅 ${s.date} — 커밋 ${s.commitCount}건 · ${tags}`);
    lines.push(s.summaryText);
  }

  return lines.join("\n");
}

export function registerRecentSummariesTool(server: McpServer): void {
  server.tool(
    "list_recent_summaries",
    "최근 N일간의 학습 요약 목록을 조회합니다",
    {
      days: z.number().int().min(1).max(30).default(7).describe("조회할 일수 (1~30, 기본값: 7)"),
    },
    async ({ days }) => {
      const count = days;
      const today = new Date();
      const summaries: ParsedSummary[] = [];

      for (let i = 0; i < count; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        try {
          const { summary } = await apiCall<DailySummaryResponse>(
            `/api/summaries/daily?date=${encodeURIComponent(dateStr)}`,
          );
          if (summary.commitCount > 0) {
            summaries.push({
              date: dateStr,
              summaryText: summary.summaryText,
              commitCount: summary.commitCount,
              tags: summary.tags,
            });
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("401")) {
            throw error;
          }
          // 개별 날짜 조회 실패는 건너뜀 (네트워크 일시 오류 등)
        }
      }

      return {
        content: [{ type: "text" as const, text: formatSummaries(summaries) }],
      };
    },
  );
}
