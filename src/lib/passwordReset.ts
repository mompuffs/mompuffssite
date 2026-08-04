import crypto from "crypto";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// The raw token goes in the emailed link; only its hash is ever stored, the
// same principle as a password hash -- see PasswordResetToken in schema.prisma.
export function generateResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashResetToken(raw) };
}

export function hashResetToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
