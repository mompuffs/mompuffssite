"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-bold text-brand-600 mb-4">Join Mompuffs</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required placeholder="Display name" value={form.displayName} onChange={update("displayName")} className="w-full border rounded px-3 py-2" />
        <input required placeholder="Username" value={form.username} onChange={update("username")} className="w-full border rounded px-3 py-2" />
        <input required type="email" placeholder="Email" value={form.email} onChange={update("email")} className="w-full border rounded px-3 py-2" />
        <input required type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={update("password")} className="w-full border rounded px-3 py-2" />
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
