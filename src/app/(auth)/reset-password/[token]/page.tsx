"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-bold text-brand-600 mb-4">Choose a new password</h1>
      {done ? (
        <p className="text-sm text-green-700">
          Password updated! Taking you to the login page…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            required
            placeholder="New password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          {error && (
            <p className="text-red-600 text-sm">
              {error}{" "}
              {error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid") ? (
                <Link href="/forgot-password" className="underline font-medium">
                  Request a new link →
                </Link>
              ) : null}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
