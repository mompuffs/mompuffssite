import { NextResponse } from "next/server";
import { socratesConfig, upsertFromSocrates, verifySocratesSignature, type SocratesPost } from "@/lib/socrates";

export const dynamic = "force-dynamic";

// Receiving address for the mompuffs profile in Socrates ("Custom website"
// publisher). Socrates signs the raw body with the profile's webhook secret
// in X-Socrates-Signature (sha256=<hex>). Events:
//   ping            -- the profile form's Test connection button
//   post.published  -- a publish, or an edit to an already-published article
// Socrates reads `url` from the reply as the article's live link.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!socratesConfig().webhookSecret) {
    return NextResponse.json({ error: "SOCRATES_WEBHOOK_SECRET is not set." }, { status: 503 });
  }
  if (!verifySocratesSignature(raw, req.headers.get("x-socrates-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: { event?: string; siteId?: string; post?: SocratesPost };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const expectedSite = socratesConfig().siteId;
  if (expectedSite && payload.siteId !== expectedSite) {
    return NextResponse.json({ error: "wrong siteId" }, { status: 403 });
  }
  if (payload.event === "ping") return NextResponse.json({ ok: true });
  if (payload.event !== "post.published") return NextResponse.json({ ok: true, ignored: payload.event });
  if (!payload.post?.id || !payload.post.slug || !payload.post.title) {
    return NextResponse.json({ error: "missing post" }, { status: 400 });
  }

  const { article, created } = await upsertFromSocrates(payload.post, payload.siteId ?? "");
  const origin = new URL(req.url).origin;
  return NextResponse.json({ ok: true, action: created ? "created" : "updated", url: `${origin}/blog/${article.slug}` });
}
