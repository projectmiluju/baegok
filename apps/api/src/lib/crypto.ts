import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";
import { getEnv } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 권장 96비트
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  return Buffer.from(getEnv().TOKEN_ENCRYPTION_KEY, "hex");
}

/**
 * 평문을 AES-256-GCM으로 암호화한다.
 * 저장 형식: `iv:authTag:ciphertext` (모두 hex).
 */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv) as CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * encryptToken으로 만든 문자열을 복호화한다.
 * 형식이 어긋나거나 인증 실패 시 예외를 던진다.
 */
export function decryptToken(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("암호문 형식이 올바르지 않습니다");
  }
  const [ivHex, tagHex, dataHex] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(dataHex, "hex");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("암호문 메타데이터가 손상되었습니다");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv) as DecipherGCM;
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
