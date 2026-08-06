import { NextResponse } from "next/server";
import { sendContactMessage } from "@/lib/email";

const MAX_LENGTH = { name: 200, email: 320, subject: 300, message: 5000 };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  // Deliberately loose -- just enough to catch obviously-malformed input,
  // not full RFC 5322 validation.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (
    name.length > MAX_LENGTH.name ||
    email.length > MAX_LENGTH.email ||
    subject.length > MAX_LENGTH.subject ||
    message.length > MAX_LENGTH.message
  ) {
    return NextResponse.json({ error: "One of the fields is too long." }, { status: 400 });
  }

  await sendContactMessage({ name, email, subject, message });

  return NextResponse.json({ ok: true });
}
