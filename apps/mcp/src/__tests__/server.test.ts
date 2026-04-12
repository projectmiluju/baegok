import { describe, expect, it } from "bun:test";

describe("MCP 서버 도구 모듈", () => {
  it("daily-summary 모듈이 정상적으로 로드되어야 한다", async () => {
    const mod = await import("../tools/daily-summary");
    expect(mod.registerDailySummaryTool).toBeFunction();
  });

  it("recent-summaries 모듈이 정상적으로 로드되어야 한다", async () => {
    const mod = await import("../tools/recent-summaries");
    expect(mod.registerRecentSummariesTool).toBeFunction();
  });

  it("period-report 모듈이 정상적으로 로드되어야 한다", async () => {
    const mod = await import("../tools/period-report");
    expect(mod.registerPeriodReportTool).toBeFunction();
  });

  it("roadmap 모듈이 정상적으로 로드되어야 한다", async () => {
    const mod = await import("../tools/roadmap");
    expect(mod.registerRoadmapTool).toBeFunction();
  });
});

describe("API 클라이언트", () => {
  it("토큰 미설정 시 에러를 발생시켜야 한다", async () => {
    const originalToken = process.env["BAEGOK_API_TOKEN"];
    delete process.env["BAEGOK_API_TOKEN"];

    const { apiCall } = await import("../api-client");
    await expect(apiCall("/test")).rejects.toThrow("BAEGOK_API_TOKEN");

    if (originalToken) {
      process.env["BAEGOK_API_TOKEN"] = originalToken;
    }
  });
});
