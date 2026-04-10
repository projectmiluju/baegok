import { z } from "zod";
import { getEnv } from "@/lib/env";

const GITHUB_OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_API_URL = "https://api.github.com/user";

export const GITHUB_OAUTH_SCOPES = ["read:user", "repo", "admin:repo_hook"];

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  scope: z.string().optional(),
});

const githubUserSchema = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
});

export interface GithubUser {
  id: number;
  login: string;
  avatarUrl: string | null;
}

/**
 * GitHub OAuth 인증 페이지 URL을 생성한다.
 */
export function buildAuthorizeUrl(state: string): string {
  const env = getEnv();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
    scope: GITHUB_OAUTH_SCOPES.join(" "),
    state,
    allow_signup: "true",
  });
  return `${GITHUB_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * code를 access_token으로 교환한다.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const env = getEnv();
  const res = await fetch(GITHUB_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub 토큰 교환 실패: HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  const parsed = tokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("GitHub 토큰 응답 형식이 올바르지 않습니다");
  }
  return parsed.data.access_token;
}

/**
 * access_token으로 GitHub 사용자 프로필을 조회한다.
 */
export async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
  const res = await fetch(GITHUB_USER_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "baegok-api",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub 사용자 조회 실패: HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  const parsed = githubUserSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("GitHub 사용자 응답 형식이 올바르지 않습니다");
  }
  return {
    id: parsed.data.id,
    login: parsed.data.login,
    avatarUrl: parsed.data.avatar_url ?? null,
  };
}
