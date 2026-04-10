import jwt, { type SignOptions } from "jsonwebtoken";
import { getEnv } from "./env";

export interface JwtPayload {
  /** 내부 User.id (cuid) */
  sub: string;
  /** GitHub 숫자 ID */
  githubId: number;
  /** GitHub username */
  username: string;
}

/**
 * 사용자 페이로드로 JWT를 발급한다.
 * 만료는 SESSION_MAX_AGE_SECONDS(쿠키와 동일 소스)를 사용한다.
 */
export function signJwt(payload: JwtPayload): string {
  const env = getEnv();
  const options: SignOptions = {
    expiresIn: env.SESSION_MAX_AGE_SECONDS,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * JWT를 검증·디코드한다. 실패 시 예외를 던진다.
 */
export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, getEnv().JWT_SECRET);
  if (typeof decoded === "string") {
    throw new Error("JWT 페이로드가 객체가 아닙니다");
  }
  const { sub, githubId, username } = decoded as Record<string, unknown>;
  if (typeof sub !== "string" || typeof githubId !== "number" || typeof username !== "string") {
    throw new Error("JWT 페이로드 형식이 올바르지 않습니다");
  }
  return { sub, githubId, username };
}
