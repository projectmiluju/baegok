import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_OAUTH_REDIRECT_URI: z.string().url(),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // 64자 hex (32 bytes) — AES-256-GCM 키
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "TOKEN_ENCRYPTION_KEY는 64자 hex여야 합니다"),

  // OAuth 콜백 후 프론트엔드로 리다이렉트할 베이스 URL
  WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * 환경변수 파싱·검증.
 * 테스트 환경에서는 임시 값으로 통과시키기 위해 첫 호출 시점에만 검증한다.
 * 검증 실패 시 명확한 메시지로 즉시 종료한다.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`환경변수 검증 실패:\n${issues}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

/** 테스트 전용: 캐시 초기화 */
export function resetEnvCache(): void {
  cachedEnv = null;
}
