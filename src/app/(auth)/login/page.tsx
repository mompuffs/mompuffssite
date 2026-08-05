"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Safety net for an already-authenticated session landing here -- e.g. the
  // browser back button after logging in, or a stale /login render caught
  // mid-navigation right after a fresh sign-in. Without this the page just
  // sits showing the form forever instead of continuing on to the feed.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/feed");
    }
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    // Just push -- a trailing router.refresh() here used to race the
    // navigation's own RSC fetch for /feed and could get it cancelled
    // (net::ERR_ABORTED), leaving the login form on screen. It isn't
    // needed anyway: /feed is a fresh navigation, so it already reads the
    // just-set session cookie server-side, and the header/sidebar update
    // on their own via useSession() the moment the cookie changes. The
    // useSession()-driven redirect effect above is a second safety net in
    // case this push is ever lost for some other reason.
    router.push("/feed");
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-bold text-brand-600 mb-4">Log in to Mompuffs</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-right -mt-1">
          <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        No account?{" "}
        <Link href="/register" className="text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
