import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) throw new Error("FIELD_ENCRYPTION_KEY is not configured");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return buf;
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(":");
}

export function decryptField(ciphertext: string): string {
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted value");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function encryptNumber(n: number): string {
  return encryptField(String(n));
}

export function decryptNumber(ciphertext: string): number {
  return Number(decryptField(ciphertext));
}

export function encryptNullableNumber(n: number | null): string | null {
  return n === null ? null : encryptNumber(n);
}

export function decryptNullableNumber(ciphertext: string | null): number | null {
  return ciphertext === null ? null : decryptNumber(ciphertext);
}
