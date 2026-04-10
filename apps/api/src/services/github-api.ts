import { z } from "zod";

const GITHUB_API_BASE = "https://api.github.com";

const githubRepoSchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
  name: z.string(),
  private: z.boolean(),
  html_url: z.string().url(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  updated_at: z.string(),
});

export type GithubRepo = z.infer<typeof githubRepoSchema>;

const webhookResponseSchema = z.object({
  id: z.number().int(),
});

function headers(accessToken: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "baegok-api",
  };
}

/**
 * 인증된 사용자의 GitHub 레포 목록을 조회한다.
 * per_page=100, sort=updated. 페이지네이션은 page 파라미터로.
 */
export async function fetchUserRepos(accessToken: string, page = 1): Promise<GithubRepo[]> {
  const url = `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated&page=${page}`;
  const res = await fetch(url, { headers: headers(accessToken) });
  if (!res.ok) {
    throw new Error(`GitHub 레포 목록 조회 실패: HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  const parsed = z.array(githubRepoSchema).safeParse(json);
  if (!parsed.success) {
    throw new Error("GitHub 레포 목록 응답 형식이 올바르지 않습니다");
  }
  return parsed.data;
}

/**
 * 레포에 push 이벤트 Webhook을 등록한다.
 * 반환: GitHub Webhook ID.
 */
export async function createWebhook(
  accessToken: string,
  repoFullName: string,
  callbackUrl: string,
  secret: string,
): Promise<number> {
  const url = `${GITHUB_API_BASE}/repos/${repoFullName}/hooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["push"],
      config: {
        url: callbackUrl,
        content_type: "json",
        secret,
        insecure_ssl: "0",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub Webhook 생성 실패: HTTP ${res.status} — ${body}`);
  }
  const json: unknown = await res.json();
  const parsed = webhookResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("GitHub Webhook 응답 형식이 올바르지 않습니다");
  }
  return parsed.data.id;
}

/**
 * 레포의 Webhook을 삭제한다.
 * 이미 삭제된 경우(404)는 무시한다.
 */
export async function deleteWebhook(
  accessToken: string,
  repoFullName: string,
  hookId: number,
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${repoFullName}/hooks/${hookId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: headers(accessToken),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitHub Webhook 삭제 실패: HTTP ${res.status}`);
  }
}
