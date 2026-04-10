import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";
import { encryptToken } from "@/lib/crypto";
import { signJwt } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME } from "@/lib/session";
import { authMiddleware, type AuthVariables } from "@/middlewares/auth";
import { buildAuthorizeUrl, exchangeCodeForToken, fetchGithubUser } from "@/services/github-oauth";

const TEXT = {
  oauthStateMissing: "OAuth state가 누락되었습니다",
  oauthStateMismatch: "OAuth state가 일치하지 않습니다 — 재시도해주세요",
  oauthCodeMissing: "OAuth code가 누락되었습니다",
  oauthFailed: "GitHub 로그인에 실패했습니다",
  loggedOut: "로그아웃 되었습니다",
  notFound: "사용자를 찾을 수 없습니다",
} as const;

const STATE_COOKIE_NAME = "baegok_oauth_state";
const STATE_COOKIE_MAX_AGE = 10 * 60; // 10분

export const authRoute = new Hono<{ Variables: AuthVariables }>();

/**
 * GitHub OAuth 인증 페이지로 리다이렉트.
 * CSRF 방지용 state를 쿠키에 저장한다.
 */
authRoute.get("/github", (c) => {
  const env = getEnv();
  const state = randomBytes(16).toString("hex");
  setCookie(c, STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE,
  });
  return c.redirect(buildAuthorizeUrl(state));
});

/**
 * GitHub OAuth 콜백.
 * code → access_token 교환 → 사용자 upsert → JWT 발급 → 프론트로 리다이렉트.
 */
authRoute.get("/github/callback", async (c) => {
  const env = getEnv();
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieState = getCookie(c, STATE_COOKIE_NAME);
  deleteCookie(c, STATE_COOKIE_NAME, { path: "/" });

  if (!state || !cookieState) {
    return c.json({ error: TEXT.oauthStateMissing }, 400);
  }
  if (state !== cookieState) {
    return c.json({ error: TEXT.oauthStateMismatch }, 400);
  }
  if (!code) {
    return c.json({ error: TEXT.oauthCodeMissing }, 400);
  }

  let user;
  try {
    const accessToken = await exchangeCodeForToken(code);
    const githubUser = await fetchGithubUser(accessToken);
    const encryptedToken = encryptToken(accessToken);

    user = await prisma.user.upsert({
      where: { githubId: githubUser.id },
      update: {
        githubUsername: githubUser.login,
        avatarUrl: githubUser.avatarUrl,
        accessToken: encryptedToken,
      },
      create: {
        githubId: githubUser.id,
        githubUsername: githubUser.login,
        avatarUrl: githubUser.avatarUrl,
        accessToken: encryptedToken,
      },
    });
  } catch (error) {
    console.error("[auth/callback] OAuth 처리 실패", error);
    return c.json({ error: TEXT.oauthFailed }, 502);
  }

  const jwtToken = signJwt({
    sub: user.id,
    githubId: user.githubId,
    username: user.githubUsername,
  });

  setCookie(c, SESSION_COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  return c.redirect(`${env.WEB_BASE_URL}/auth/callback`);
});

/**
 * 로그아웃 — 세션 쿠키 제거.
 */
authRoute.post("/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ message: TEXT.loggedOut });
});

/**
 * 현재 사용자 정보.
 */
authRoute.get("/me", authMiddleware, async (c) => {
  const payload = c.get("user");
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      githubId: true,
      githubUsername: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  if (!user) {
    return c.json({ error: TEXT.notFound }, 404);
  }
  return c.json({ user });
});
