import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, title: true, priceCents: true, currency: true, imageUrl: true } },
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

  const { body, imageUrl, videoUrl, videoThumbnailUrl, productId } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Post body is required." }, { status: 400 });
  }

  const post = await db.post.create({
    data: {
      authorId: user.id,
      body: body.trim(),
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      videoThumbnailUrl: videoThumbnailUrl || undefined,
      productId: productId || undefined,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
