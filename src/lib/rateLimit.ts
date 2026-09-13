import { db } from "@/lib/db";

// Best-effort per-IP throttle for public, spam-prone endpoints (registration,
// contact form). Backed by Postgres rather than an in-memory Map because the
// app runs on Vercel serverless -- separate invocations don't share memory,
// so an in-process counter would reset constantly and protect almost
// nothing. This has a small race window under concurrent requests (two
// requests can both read the same count before either writes it back), but
// that's an acceptable tradeoff for slowing down spam, not a security
// boundary that needs to be exact.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = new Date();
  const bucket = await db.rateLimitBucket.findUnique({ where: { key } });

  if (!bucket || now.getTime() - bucket.windowStart.getTime() > windowMs) {
    // No bucket yet, or the previous window has expired -- start a fresh one.
    await db.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  await db.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return true;
}

// Vercel puts the real client IP first in x-forwarded-for. Falls back to a
// constant so a missing header buckets all such requests together instead of
// bypassing the limit entirely.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
