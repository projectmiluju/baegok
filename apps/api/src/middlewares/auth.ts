import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { getEnv } from "@/lib/env";
import { verifyJwt, type JwtPayload } from "@/lib/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export interface AuthVariables {
  user: JwtPayload;
}

const TEXT = {
  unauthorized: "로그인이 필요합니다",
  invalidToken: "세션이 만료되었거나 유효하지 않습니다",
} as const;

function extractToken(c: Context): string | null {
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  if (cookieToken) return cookieToken;

  const header = c.req.header("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

/**
 * 보호된 라우트용 JWT 인증 미들웨어.
 * 성공 시 c.set('user', payload), 실패 시 401.
 *
 * 환경변수 검증 실패는 401로 위장하지 않도록 try/catch 밖에서 미리 호출한다.
 * (zod validation 에러는 500으로 자연스럽게 propagate되어 운영자가 원인 파악 가능)
 */
export const authMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  // 환경변수 검증을 try 밖에서 먼저 트리거 — 실패 시 500으로 표면화
  getEnv();

  const token = extractToken(c);
  if (!token) {
    return c.json({ error: TEXT.unauthorized }, 401);
  }
  try {
    const payload = verifyJwt(token);
    c.set("user", payload);
  } catch {
    return c.json({ error: TEXT.invalidToken }, 401);
  }
  await next();
};
