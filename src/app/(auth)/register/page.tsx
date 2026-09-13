"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "" });
  const [website, setWebsite] = useState(""); // honeypot -- real users never see or fill this
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  // Captured once, at mount, so the server can reject submissions that come
  // back faster than a person could plausibly fill the form out.
  const [formRenderedAt] = useState(() => Date.now());

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, website, formRenderedAt }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    // Not signing in here -- the account needs its email verified first
    // (see src/lib/auth.ts and src/app/api/auth/register/route.ts).
    setRegistered(true);
  }

  if (registered) {
    return (
      <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-brand-600 mb-2">Check your email</h1>
        <p className="text-sm text-gray-700">
          We&rsquo;ve sent a verification link to {form.email}. Click it to activate your account,
          then come back and log in.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-brand-600 hover:underline">
            ← Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-bold text-brand-600 mb-4">Join Mompuffs</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required placeholder="Display name" value={form.displayName} onChange={update("displayName")} className="w-full border rounded px-3 py-2" />
        <input required placeholder="Username" value={form.username} onChange={update("username")} className="w-full border rounded px-3 py-2" />
        <input required type="email" placeholder="Email" value={form.email} onChange={update("email")} className="w-full border rounded px-3 py-2" />
        <input required type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={update("password")} className="w-full border rounded px-3 py-2" />
        {/* Honeypot: hidden from sighted and screen-reader users alike, but
            a form-filling bot that scrapes all inputs will fill it in. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ display: "none" }}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
