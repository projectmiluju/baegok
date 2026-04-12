const DEFAULT_BASE_URL = "http://localhost:4000";

export async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = process.env["BAEGOK_API_BASE_URL"] ?? DEFAULT_BASE_URL;
  const token = process.env["BAEGOK_API_TOKEN"];

  if (!token) {
    throw new Error("BAEGOK_API_TOKEN 환경 변수가 설정되지 않았습니다. JWT 토큰을 설정해 주세요.");
  }

  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const status = response.status;
    const statusText = response.statusText;
    let detail = "";
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const msg = body["error"] ?? body["message"];
      detail = typeof msg === "string" ? `: ${msg}` : "";
    } catch {
      // body가 JSON이 아닌 경우 무시
    }
    throw new Error(`API 요청 실패 (${status} ${statusText})${detail} — ${url}`);
  }

  return (await response.json()) as T;
}
