import crypto from "crypto";

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Same pattern as src/lib/passwordReset.ts: only the hash is ever stored,
// the raw token only ever exists in the emailed link.
export function generateVerificationToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashVerificationToken(raw) };
}

export function hashVerificationToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
