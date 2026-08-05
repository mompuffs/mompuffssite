import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const VISIBILITIES = ["PUBLIC", "PRIVATE"];
const JOIN_POLICIES = ["OPEN", "APPROVAL"];

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const groups = await db.group.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { topic: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      topic: true,
      description: true,
      avatarUrl: true,
      visibility: true,
      joinPolicy: true,
      ownerId: true,
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
      members: user ? { where: { userId: (user as any).id }, select: { status: true } } : false,
    },
  });

  const result = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    topic: g.topic,
    description: g.description,
    avatarUrl: g.avatarUrl,
    visibility: g.visibility,
    joinPolicy: g.joinPolicy,
    isOwner: user ? g.ownerId === (user as any).id : false,
    memberCount: g._count.members,
    membershipStatus: user && "members" in g && g.members?.[0] ? g.members[0].status : null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { name, topic, description, avatarUrl, visibility, joinPolicy } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  }
  const resolvedVisibility = VISIBILITIES.includes(visibility) ? visibility : "PUBLIC";
  const resolvedJoinPolicy = JOIN_POLICIES.includes(joinPolicy) ? joinPolicy : "OPEN";

  let slug = slugify(String(name));
  let suffix = 0;
  while (await db.group.findUnique({ where: { slug: suffix ? `${slug}-${suffix}` : slug } })) {
    suffix += 1;
  }
  if (suffix) slug = `${slug}-${suffix}`;

  const group = await db.group.create({
    data: {
      name: String(name).trim(),
      slug,
      topic: topic || undefined,
      description: description || undefined,
      avatarUrl: avatarUrl || undefined,
      visibility: resolvedVisibility,
      joinPolicy: resolvedJoinPolicy,
      ownerId: (user as any).id,
      members: { create: { userId: (user as any).id, status: "ACTIVE" } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
