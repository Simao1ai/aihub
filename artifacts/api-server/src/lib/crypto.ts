import crypto from "node:crypto";
import { logger } from "./logger";

const ALGO = "aes-256-gcm" as const;
const PREFIX = "v1:";

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (hex.length !== 64) return null;
  try {
    return Buffer.from(hex, "hex");
  } catch {
    return null;
  }
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getKey();
  if (!key) {
    logger.warn("ENCRYPTION_KEY not set (needs 64-char hex) — storing secret unencrypted");
    return plaintext;
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  if (!payload) return payload;
  if (!payload.startsWith(PREFIX)) return payload;
  const key = getKey();
  if (!key) {
    logger.warn("ENCRYPTION_KEY not set — cannot decrypt secret");
    return payload;
  }
  const parts = payload.slice(PREFIX.length).split(":");
  if (parts.length !== 3) return payload;
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch (e) {
    logger.warn({ err: e }, "Failed to decrypt secret — returning raw value");
    return payload;
  }
}
