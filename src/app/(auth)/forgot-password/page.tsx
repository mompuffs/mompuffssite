"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    // Always shown, whether or not the email matched an account -- see the
    // API route for why.
    setMessage(data.message ?? "If an account exists for that email, we've sent a password reset link.");
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-bold text-brand-600 mb-2">Reset your password</h1>
      {message ? (
        <p className="text-sm text-gray-700">{message}</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">Enter your account email and we'll send you a reset link.</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white rounded py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p className="text-sm text-gray-500 mt-4">
        <Link href="/login" className="text-brand-600 hover:underline">
          ← Back to log in
        </Link>
      </p>
    </div>
  );
}
