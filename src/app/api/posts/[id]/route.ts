import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { extractFirstUrl, fetchLinkPreview } from "@/lib/linkPreview";

// Same reason as /api/groups/top etc: no auth check to force dynamic
// rendering, so without this a post fetched once gets cached at that exact
// URL and edits/deletes wouldn't show up on refetch.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const post = await db.post.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, title: true, priceCents: true, currency: true, imageUrl: true } },
      group: { select: { id: true, name: true, slug: true } },
      likes: { select: { userId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { username: true, displayName: true } } },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  return NextResponse.json(post);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const post = await db.post.findUnique({
    where: { id: params.id },
    select: { authorId: true, imageUrl: true, videoUrl: true, productId: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.authorId !== (user as any).id) {
    return NextResponse.json({ error: "You can only edit your own posts." }, { status: 403 });
  }

  const { body } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Post body is required." }, { status: 400 });
  }

  // Same rule as creation: only a plain-text post (no attached photo/video/
  // product) gets a link preview. Re-pulled from the edited body's first
  // URL every time -- cheap enough, and avoids a stale preview if the link
  // changed or was removed.
  let linkPreview = null;
  if (!post.imageUrl && !post.videoUrl && !post.productId) {
    const firstUrl = extractFirstUrl(body);
    if (firstUrl) linkPreview = await fetchLinkPreview(firstUrl);
  }

  const updated = await db.post.update({
    where: { id: params.id },
    data: {
      body: body.trim(),
      editedAt: new Date(),
      linkUrl: linkPreview?.url ?? null,
      linkTitle: linkPreview?.title ?? null,
      linkDescription: linkPreview?.description ?? null,
      linkImageUrl: linkPreview?.imageUrl ?? null,
      linkVideoUrl: linkPreview?.videoUrl ?? null,
      linkSiteName: linkPreview?.siteName ?? null,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, title: true, priceCents: true, currency: true, imageUrl: true } },
      group: { select: { id: true, name: true, slug: true } },
      likes: { select: { userId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { username: true, displayName: true } } },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const post = await db.post.findUnique({ where: { id: params.id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.authorId !== (user as any).id) {
    return NextResponse.json({ error: "You can only delete your own posts." }, { status: 403 });
  }

  await db.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
