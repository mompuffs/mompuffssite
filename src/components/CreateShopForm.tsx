"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateShopForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not create shop.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-md">
      <h2 className="text-lg font-bold mb-3">Open your shop</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Shop name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border rounded px-3 py-2 resize-none"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-600 text-white px-4 py-2 rounded font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create shop"}
        </button>
      </form>
    </div>
  );
}
