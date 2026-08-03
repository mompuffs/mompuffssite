import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const PROFILE_SELECT = {
  displayName: true,
  avatarUrl: true,
  email: true,
  username: true,
  bio: true,
  work: true,
  location: true,
  birthdate: true,
  links: true,
  contactEmail: true,
  contactPhone: true,
  showWork: true,
  showLocation: true,
  showBirthdate: true,
  showLinks: true,
  showContact: true,
};

// Reads straight from the database rather than the session token, which
// only carries what was true at sign-in and can go stale after an edit.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const fresh = await db.user.findUnique({ where: { id: (user as any).id }, select: PROFILE_SELECT });
  if (!fresh) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  return NextResponse.json({
    ...fresh,
    birthdate: fresh.birthdate ? fresh.birthdate.toISOString().slice(0, 10) : null,
    links: fresh.links ? JSON.parse(fresh.links) : [],
  });
}

function stringField(value: unknown, name: string) {
  if (value === undefined) return { present: false as const };
  if (value !== null && typeof value !== "string") {
    throw new Error(`${name} must be a string.`);
  }
  return { present: true as const, value: value ? String(value).trim() || null : null };
}

function boolField(value: unknown, name: string) {
  if (value === undefined) return { present: false as const };
  if (typeof value !== "boolean") throw new Error(`${name} must be a boolean.`);
  return { present: true as const, value };
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json();
  const { displayName, avatarUrl, birthdate, links } = body;

  if (displayName !== undefined && (typeof displayName !== "string" || !displayName.trim())) {
    return NextResponse.json({ error: "displayName must be a non-empty string." }, { status: 400 });
  }

  let data: Record<string, unknown> = {};
  try {
    const fields: [string, unknown][] = [
      ["avatarUrl", body.avatarUrl],
      ["bio", body.bio],
      ["work", body.work],
      ["location", body.location],
      ["contactEmail", body.contactEmail],
      ["contactPhone", body.contactPhone],
    ];
    for (const [key, value] of fields) {
      const result = stringField(value, key);
      if (result.present) data[key] = result.value;
    }

    const boolFields: [string, unknown][] = [
      ["showWork", body.showWork],
      ["showLocation", body.showLocation],
      ["showBirthdate", body.showBirthdate],
      ["showLinks", body.showLinks],
      ["showContact", body.showContact],
    ];
    for (const [key, value] of boolFields) {
      const result = boolField(value, key);
      if (result.present) data[key] = result.value;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (displayName !== undefined) data.displayName = displayName.trim();

  if (birthdate !== undefined) {
    if (birthdate === null || birthdate === "") {
      data.birthdate = null;
    } else {
      const parsed = new Date(birthdate);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "birthdate is not a valid date." }, { status: 400 });
      }
      data.birthdate = parsed;
    }
  }

  if (links !== undefined) {
    if (!Array.isArray(links)) {
      return NextResponse.json({ error: "links must be an array." }, { status: 400 });
    }
    const cleaned = links
      .filter((l: any) => l && typeof l === "object" && (l.url || "").trim())
      .slice(0, 10)
      .map((l: any) => {
        let url = String(l.url).trim().slice(0, 500);
        // Only allow http(s) links -- reject anything else (e.g. a
        // javascript:/data: URI smuggled in) instead of rendering it as a
        // clickable link on the public profile.
        if (!/^https?:\/\//i.test(url)) {
          url = url.includes("://") ? "" : `https://${url}`;
        }
        return { label: String(l.label || "").trim().slice(0, 60), url };
      })
      .filter((l) => l.url);
    data.links = cleaned.length > 0 ? JSON.stringify(cleaned) : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: (user as any).id },
    data,
    select: PROFILE_SELECT,
  });

  return NextResponse.json({
    ...updated,
    birthdate: updated.birthdate ? updated.birthdate.toISOString().slice(0, 10) : null,
    links: updated.links ? JSON.parse(updated.links) : [],
  });
}
