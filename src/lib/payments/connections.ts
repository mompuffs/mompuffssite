import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function getShopPaymentCreds(shopId: string, slug: string): Promise<Record<string, string> | null> {
  const conn = await db.paymentConnection.findUnique({ where: { shopId_slug: { shopId, slug } } });
  if (!conn) return null;

  const creds: Record<string, string> = { apiKey: decrypt(conn.apiKey) };
  if (conn.extra) {
    try {
      Object.assign(creds, JSON.parse(decrypt(conn.extra)));
    } catch {
      // malformed extra data -- ignore, fall back to just apiKey
    }
  }
  return creds;
}
