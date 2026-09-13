"use client";

import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot -- real users never see or fill this
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // Captured once, at mount, so the server can reject submissions that come
  // back faster than a person could plausibly fill the form out.
  const [formRenderedAt] = useState(() => Date.now());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message, website, formRenderedAt }),
    });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong -- please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-brand-600 mb-2">Contact us</h1>

      {sent ? (
        <p className="text-gray-700">
          Thanks for reaching out! We&rsquo;ve received your message and will get back to you
          soon.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Have a question or need help with something? Send us a message below.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="text"
              required
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              required
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full border rounded px-3 py-2 resize-none"
            />
            {/* Honeypot: hidden from sighted and screen-reader users alike,
                but a form-filling bot that scrapes all inputs will fill it
                in. Never made visible via CSS a bot could trivially detect
                (display:none is fine here -- simplicity wins over the
                marginal bot that specifically checks for it). */}
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
              {loading ? "Sending…" : "Send message"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
