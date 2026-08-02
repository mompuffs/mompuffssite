import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { PodCredentials } from "./types";

export async function getShopCredentials(shopId: string, provider: string): Promise<PodCredentials> {
  const connection = await db.podConnection.findUnique({
    where: { shopId_provider: { shopId, provider: provider.toUpperCase() } },
  });
  if (!connection) return {};

  const creds: PodCredentials = { apiKey: decrypt(connection.apiKey) };
  if (connection.extra) {
    try {
      Object.assign(creds, JSON.parse(decrypt(connection.extra)));
    } catch {
      // malformed extra data -- ignore, fall back to just apiKey
    }
  }
  return creds;
}
