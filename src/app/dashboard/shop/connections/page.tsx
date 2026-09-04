"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FieldDef = { key: string; label: string; placeholder?: string };
type ConnectionStatus = {
  provider: string;
  label: string;
  fields: FieldDef[];
  connected: boolean;
  source: "shop" | "none";
  preview?: string;
  updatedAt: string | null;
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionStatus[] | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/pod/connections")
      .then((r) => r.json())
      .then(setConnections);
  }

  useEffect(load, []);

  function startEditing(provider: string) {
    setEditingProvider(provider);
    setFormValues({});
    setError(null);
  }

  async function handleSave(provider: string) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/pod/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, values: formValues }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save connection.");
      return;
    }
    setEditingProvider(null);
    setFormValues({});
    load();
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`Disconnect ${provider}? You'll need to re-enter credentials to import from it again.`)) return;
    await fetch(`/api/pod/connections/${provider.toLowerCase()}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Connections</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Connect the catalogs you import from. Credentials are yours alone -- other shops on Mompuffs never see or
        use them. After you save a source, load it from Import products.
      </p>
      <p className="text-sm mb-4">
        <Link href="/dashboard/shop/help/connections" className="text-brand-600 hover:underline">
          Where to copy each key →
        </Link>
      </p>

      {!connections ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <div key={c.provider} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{c.label}</p>
                  {c.source === "shop" ? (
                    <p className="text-xs text-green-700">Connected · {c.preview}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Not connected</p>
                  )}
                </div>
                <div className="flex gap-3">
                  {c.source === "shop" && (
                    <button
                      onClick={() => handleDisconnect(c.provider)}
                      className="text-red-500 text-xs hover:underline"
                    >
                      Disconnect
                    </button>
                  )}
                  <button
                    onClick={() => startEditing(c.provider)}
                    className="text-brand-600 text-xs hover:underline"
                  >
                    {c.source === "shop" ? "Update" : "Connect"}
                  </button>
                </div>
              </div>

              {editingProvider === c.provider && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {c.fields.map((field) => (
                    <input
                      key={field.key}
                      type={field.key === "apiKey" ? "password" : "text"}
                      placeholder={field.placeholder ?? field.label}
                      value={formValues[field.key] ?? ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  ))}
                  {error && <p className="text-red-600 text-xs">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(c.provider)}
                      disabled={saving}
                      className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingProvider(null)}
                      className="text-gray-500 text-sm hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
