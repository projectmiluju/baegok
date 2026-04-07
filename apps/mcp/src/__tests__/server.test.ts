import { describe, expect, it } from "bun:test";

describe("MCP 서버 모듈", () => {
  it("서버 모듈이 정상적으로 로드되어야 한다", async () => {
    const mod = await import("../index");
    expect(mod).toBeDefined();
  });
});
