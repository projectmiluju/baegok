import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerDailySummaryTool } from "./tools/daily-summary.js";
import { registerRecentSummariesTool } from "./tools/recent-summaries.js";
import { registerPeriodReportTool } from "./tools/period-report.js";
import { registerRoadmapTool } from "./tools/roadmap.js";

const server = new McpServer({
  name: "baegok-mcp",
  version: "0.1.0",
});

registerDailySummaryTool(server);
registerRecentSummariesTool(server);
registerPeriodReportTool(server);
registerRoadmapTool(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
