"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CUSTOM_PAYMENT_FIELDS } from "@/lib/payments/providers";

type FieldDef = { key: string; label: string; placeholder?: string; password?: boolean };
type ProcessorStatus = {
  slug: string;
  provider: string;
  label: string;
  fields: FieldDef[];
  builtin: boolean;
  connected: boolean;
  preview?: string;
  updatedAt: string | null;
};

export default function PaymentsPage() {
  const [builtins, setBuiltins] = useState<ProcessorStatus[] | null>(null);
  const [customs, setCustoms] = useState<ProcessorStatus[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/payments/connections")
      .then((r) => r.json())
      .then((data) => {
        setBuiltins(data.builtins);
        setCustoms(data.customs);
      });
  }

  useEffect(load, []);

  function startEditing(slug: string) {
    setEditingSlug(slug);
    setFormValues({});
    setError(null);
  }

  async function handleSaveBuiltin(slug: string) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/payments/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, values: formValues }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save.");
      return;
    }
    setEditingSlug(null);
    setFormValues({});
    load();
  }

  async function handleSaveCustom(existingSlug?: string, existingDisplayName?: string) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/payments/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: existingSlug,
        displayName: existingDisplayName ?? customName,
        values: formValues,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save.");
      return;
    }
    setAddingCustom(false);
    setEditingSlug(null);
    setCustomName("");
    setFormValues({});
    load();
  }

  async function handleDisconnect(slug: string) {
    if (!confirm(`Disconnect this processor? You'll need to re-enter credentials to use it again.`)) return;
    await fetch(`/api/payments/connections/${slug}`, { method: "DELETE" });
    load();
  }

  function renderFields(fields: FieldDef[]) {
    return fields.map((field) => (
      <input
        key={field.key}
        type={field.password ? "password" : "text"}
        placeholder={field.placeholder ?? field.label}
        value={formValues[field.key] ?? ""}
        onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
        className="w-full border rounded px-3 py-2 text-sm"
      />
    ));
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Payment processors</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Connect your own payment processor. Credentials are yours alone -- other shops on Mompuffs never see or
        use them.
      </p>

      {!builtins ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {builtins.map((p) => (
            <div key={p.slug} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{p.label}</p>
                  {p.connected ? (
                    <p className="text-xs text-green-700">Connected · {p.preview}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Not connected</p>
                  )}
                </div>
                <div className="flex gap-3">
                  {p.connected && (
                    <button
                      onClick={() => handleDisconnect(p.slug)}
                      className="text-red-500 text-xs hover:underline"
                    >
                      Disconnect
                    </button>
                  )}
                  <button onClick={() => startEditing(p.slug)} className="text-brand-600 text-xs hover:underline">
                    {p.connected ? "Update" : "Connect"}
                  </button>
                </div>
              </div>

              {editingSlug === p.slug && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {renderFields(p.fields)}
                  {error && <p className="text-red-600 text-xs">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveBuiltin(p.slug)}
                      disabled={saving}
                      className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingSlug(null)}
                      className="text-gray-500 text-sm hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {customs.map((p) => (
            <div key={p.slug} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className="text-xs text-green-700">Connected · {p.preview}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDisconnect(p.slug)}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Disconnect
                  </button>
                  <button onClick={() => startEditing(p.slug)} className="text-brand-600 text-xs hover:underline">
                    Update
                  </button>
                </div>
              </div>

              {editingSlug === p.slug && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {renderFields(p.fields)}
                  {error && <p className="text-red-600 text-xs">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveCustom(p.slug, p.label)}
                      disabled={saving}
                      className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingSlug(null)}
                      className="text-gray-500 text-sm hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="bg-white rounded-xl shadow p-4">
            {!addingCustom ? (
              <button
                onClick={() => {
                  setAddingCustom(true);
                  setEditingSlug(null);
                  setFormValues({});
                  setCustomName("");
                  setError(null);
                }}
                className="text-brand-600 text-sm hover:underline"
              >
                + Add another processor (e.g. Authorize.net)
              </button>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Add a processor</p>
                <input
                  placeholder="Processor name (e.g. Authorize.net)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                {renderFields(CUSTOM_PAYMENT_FIELDS)}
                {error && <p className="text-red-600 text-xs">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveCustom()}
                    disabled={saving || !customName.trim()}
                    className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setAddingCustom(false)}
                    className="text-gray-500 text-sm hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
