import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
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
 */
export const authMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
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
