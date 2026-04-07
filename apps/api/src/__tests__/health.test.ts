import { describe, expect, it } from "bun:test";
import { app } from "../index";

describe("헬스체크", () => {
  it("GET /health 요청 시 200과 ok 상태를 반환해야 한다", async () => {
    const res = await app.fetch(new Request("http://localhost/health"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});
