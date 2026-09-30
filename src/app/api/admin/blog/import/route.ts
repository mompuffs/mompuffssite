import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { importAllFromSocrates } from "@/lib/socrates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls every published article from the Socrates feed into the blog.
export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    return NextResponse.json(await importAllFromSocrates());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
