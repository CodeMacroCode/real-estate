import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getEncryptionKey(): Buffer {
  const secret = `${process.env.AUTH_SECRET}`;
  // Derive deterministic 32-byte key using sha256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * Output format: iv:tag:ciphertext (base64 encoded)
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string back into plaintext.
 */
export function decryptPassword(cipherText: string): string {
  if (
    !cipherText ||
    typeof cipherText !== "string" ||
    !cipherText.includes(":")
  ) {
    return "";
  }

  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return "";

    const [ivB64, tagB64, encryptedB64] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const encrypted = Buffer.from(encryptedB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("Password decryption failed:", err);
    return "";
  }
}
