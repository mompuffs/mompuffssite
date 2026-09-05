import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { extractFirstUrl, fetchLinkPreview } from "@/lib/linkPreview";

export async function GET() {
  const user = await getCurrentUser();

  // Same group-visibility rule as the feed page and profile page: a group
  // post only shows here if the group is public, or the viewer is an
  // active member of that private group.
  const groupVisibilityOr: object[] = [{ groupId: null }, { group: { visibility: "PUBLIC" } }];
  if (user) {
    groupVisibilityOr.push({ group: { members: { some: { userId: (user as any).id, status: "ACTIVE" } } } });
  }

  const posts = await db.post.findMany({
    where: { OR: groupVisibilityOr },
    orderBy: { createdAt: "desc" },
    take: 50,
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
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { body, imageUrl, videoUrl, videoThumbnailUrl, productId, groupId } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Post body is required." }, { status: 400 });
  }

  if (groupId) {
    const membership = await db.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: (user as any).id } },
      select: { status: true },
    });
    if (membership?.status !== "ACTIVE") {
      return NextResponse.json({ error: "You need to be a member of this group to post there." }, { status: 403 });
    }
  }

  // Only pull a link preview for a plain-text post -- a manually attached
  // photo/video/product already gives the post visual content, so don't
  // crowd it with an unrelated link's preview underneath.
  let linkPreview = null;
  if (!imageUrl && !videoUrl && !productId) {
    const firstUrl = extractFirstUrl(body);
    if (firstUrl) linkPreview = await fetchLinkPreview(firstUrl);
  }

  const post = await db.post.create({
    data: {
      authorId: user.id,
      body: body.trim(),
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      videoThumbnailUrl: videoThumbnailUrl || undefined,
      productId: productId || undefined,
      groupId: groupId || undefined,
      linkUrl: linkPreview?.url,
      linkTitle: linkPreview?.title ?? undefined,
      linkDescription: linkPreview?.description ?? undefined,
      linkImageUrl: linkPreview?.imageUrl ?? undefined,
      linkVideoUrl: linkPreview?.videoUrl ?? undefined,
      linkSiteName: linkPreview?.siteName ?? undefined,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
