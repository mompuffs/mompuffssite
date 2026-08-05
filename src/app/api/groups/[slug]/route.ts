import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const VISIBILITIES = ["PUBLIC", "PRIVATE"];
const JOIN_POLICIES = ["OPEN", "APPROVAL"];

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();

  const group = await db.group.findUnique({
    where: { slug: params.slug },
    include: {
      owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const isOwner = user ? group.ownerId === (user as any).id : false;
  const membership = user
    ? await db.groupMembership.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: (user as any).id } },
        select: { status: true },
      })
    : null;

  const canView = group.visibility === "PUBLIC" || isOwner || membership?.status === "ACTIVE";

  const pendingRequests =
    isOwner && group.joinPolicy === "APPROVAL"
      ? await db.groupMembership.findMany({
          where: { groupId: group.id, status: "PENDING" },
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          orderBy: { joinedAt: "asc" },
        })
      : [];

  return NextResponse.json({
    id: group.id,
    name: group.name,
    slug: group.slug,
    topic: group.topic,
    description: group.description,
    avatarUrl: group.avatarUrl,
    visibility: group.visibility,
    joinPolicy: group.joinPolicy,
    owner: group.owner,
    isOwner,
    memberCount: group._count.members,
    membershipStatus: membership?.status ?? null,
    canView,
    pendingRequests: pendingRequests.map((r) => ({ user: r.user, requestedAt: r.joinedAt })),
  });
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const group = await db.group.findUnique({ where: { slug: params.slug } });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (group.ownerId !== (user as any).id) {
    return NextResponse.json({ error: "Only the group owner can edit this." }, { status: 403 });
  }

  const { topic, description, avatarUrl, visibility, joinPolicy } = await req.json();
  const data: Record<string, unknown> = {};
  if (topic !== undefined) data.topic = topic || null;
  if (description !== undefined) data.description = description || null;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
  if (visibility !== undefined) {
    if (!VISIBILITIES.includes(visibility)) {
      return NextResponse.json({ error: `visibility must be one of: ${VISIBILITIES.join(", ")}.` }, { status: 400 });
    }
    data.visibility = visibility;
  }
  if (joinPolicy !== undefined) {
    if (!JOIN_POLICIES.includes(joinPolicy)) {
      return NextResponse.json({ error: `joinPolicy must be one of: ${JOIN_POLICIES.join(", ")}.` }, { status: 400 });
    }
    data.joinPolicy = joinPolicy;
  }

  const updated = await db.group.update({ where: { id: group.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const group = await db.group.findUnique({ where: { slug: params.slug } });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (group.ownerId !== (user as any).id) {
    return NextResponse.json({ error: "Only the group owner can delete this." }, { status: 403 });
  }

  await db.group.delete({ where: { id: group.id } });
  return NextResponse.json({ ok: true });
}
