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

  // Single source of truth for the post-login redirect. next-auth's
  // signIn() (below) internally awaits a session re-fetch before it
  // resolves, so by the time handleSubmit finished awaiting it, this
  // status is already (or about to be) "authenticated" -- calling
  // router.push()/refresh() from handleSubmit too raced this effect's own
  // navigation and could get cancelled (net::ERR_ABORTED), leaving the
  // login form on screen despite a valid new session. Routing the
  // redirect through this one effect covers both that case AND an
  // already-authenticated visitor landing here directly (browser back
  // button, stale /login render mid-navigation, etc).
  useEffect(() => {
    if (status !== "authenticated") return;
    router.replace("/feed");
    // Belt-and-suspenders: reported live (2026-08-05) that after a
    // successful sign-in the header/sidebar correctly flip to the
    // authenticated state (they read the session directly, independent of
    // routing) but the page never actually leaves /login -- router.replace()
    // above not completing for reasons that didn't reproduce in testing.
    // If we're still sitting on /login a beat later, force a real browser
    // navigation instead of a client-side one; that always works since it's
    // just a fresh GET with the now-valid session cookie, no Next.js
    // client-router involved at all. Cleared as soon as the soft nav wins.
    const fallback = setTimeout(() => {
      if (window.location.pathname === "/login") {
        window.location.href = "/feed";
      }
    }, 1000);
    return () => clearTimeout(fallback);
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Read straight from the DOM via FormData rather than trusting the
    // `email`/`password` React state. Some browser password-manager
    // autofill paths set the input's value without firing the events
    // React listens for, so the controlled state can stay "" even though
    // the field visually shows the filled-in credentials -- submitting
    // that silently sends empty credentials, fails auth, and looks
    // exactly like the form "just sitting there" after clicking Log in.
    const formData = new FormData(e.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "");
    const submittedPassword = String(formData.get("password") ?? "");

    const res = await signIn("credentials", {
      email: submittedEmail,
      password: submittedPassword,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }
    // Success: leave loading=true and let the effect above redirect once
    // useSession() picks up the new session -- no navigation call here.
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-bold text-brand-600 mb-4">Log in to Mompuffs</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          name="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          name="password"
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
