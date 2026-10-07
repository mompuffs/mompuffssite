"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageInput from "@/components/ImageInput";
import { DAYS, DIRECTORY_CATEGORIES, US_STATES, type DayKey } from "@/lib/directory";

type DayState = { mode: "" | "open" | "closed" | "24h"; open: string; close: string };

export type ListingFormValues = {
  name: string;
  category: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  menuUrl: string;
  imageUrl: string;
  about: string;
  specials: string;
  hours: Record<string, any> | null;
};

const EMPTY: ListingFormValues = {
  name: "",
  category: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  website: "",
  menuUrl: "",
  imageUrl: "",
  about: "",
  specials: "",
  hours: null,
};

function initialDays(hours: Record<string, any> | null): Record<DayKey, DayState> {
  const out = {} as Record<DayKey, DayState>;
  for (const { key } of DAYS) {
    const d = hours?.[key];
    if (d?.closed) out[key] = { mode: "closed", open: "09:00", close: "21:00" };
    else if (d?.open === "00:00" && d?.close === "23:59") out[key] = { mode: "24h", open: "09:00", close: "21:00" };
    else if (d?.open) out[key] = { mode: "open", open: d.open, close: d.close };
    else out[key] = { mode: "", open: "09:00", close: "21:00" };
  }
  return out;
}

const input = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const label = "block text-sm font-semibold text-gray-700 mb-1";

export default function DirectoryListingForm({
  listingId,
  initial,
  isAdmin = false,
}: {
  listingId?: string;
  initial?: ListingFormValues;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<ListingFormValues>(initial ?? EMPTY);
  const [days, setDays] = useState(() => initialDays(initial?.hours ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ListingFormValues>(k: K, value: ListingFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: value }));
  }

  function setDay(key: DayKey, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function copyMondayToAll() {
    setDays((prev) => {
      const next = { ...prev };
      for (const { key } of DAYS) next[key] = { ...prev.mon };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const hours: Record<string, any> = {};
    for (const { key } of DAYS) {
      const d = days[key];
      hours[key] =
        d.mode === "closed"
          ? { closed: true }
          : d.mode === "24h"
            ? { open: "00:00", close: "23:59" }
            : d.mode === "open"
              ? { open: d.open, close: d.close }
              : null;
    }

    const res = await fetch(listingId ? `/api/directory/${listingId}` : "/api/directory", {
      method: listingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, hours }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(data.status === "APPROVED" ? `/directory/${data.slug}` : "/directory/mine?submitted=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">The business</h2>
        <div>
          <label className={label} htmlFor="name">Business name *</label>
          <input id="name" required maxLength={120} value={v.name} onChange={(e) => set("name", e.target.value)} className={input} />
        </div>
        <div>
          <span className={label}>Category *</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DIRECTORY_CATEGORIES.map((c) => (
              <label
                key={c.slug}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  v.category === c.slug ? "border-brand-500 bg-brand-50 font-semibold" : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c.slug}
                  checked={v.category === c.slug}
                  onChange={() => set("category", c.slug)}
                  className="accent-brand-600"
                  required
                />
                <span>{c.icon}</span>
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="about">About *</label>
          <textarea
            id="about"
            required
            rows={5}
            maxLength={5000}
            value={v.about}
            onChange={(e) => set("about", e.target.value)}
            placeholder="What they offer, what makes them worth a visit…"
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="specials">Specials <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea
            id="specials"
            rows={3}
            maxLength={2000}
            value={v.specials}
            onChange={(e) => set("specials", e.target.value)}
            placeholder="e.g. 20% off pre-rolls every Wednesday"
            className={input}
          />
        </div>
        <div>
          <span className={label}>Photo or logo <span className="font-normal text-gray-400">(optional)</span></span>
          <ImageInput value={v.imageUrl} onChange={(url) => set("imageUrl", url)} placeholder="Image URL" />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">Address</h2>
        <div>
          <label className={label} htmlFor="street">Street address *</label>
          <input id="street" required maxLength={160} value={v.street} onChange={(e) => set("street", e.target.value)} placeholder="123 Main St, Suite 4" className={input} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-3">
            <label className={label} htmlFor="city">City *</label>
            <input id="city" required maxLength={80} value={v.city} onChange={(e) => set("city", e.target.value)} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="state">State *</label>
            <select id="state" required value={v.state} onChange={(e) => set("state", e.target.value)} className={input}>
              <option value="">Choose…</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="zip">ZIP *</label>
            <input id="zip" required inputMode="numeric" maxLength={10} value={v.zip} onChange={(e) => set("zip", e.target.value)} className={input} />
          </div>
        </div>
        <p className="text-xs text-gray-500">We use the address to place the business on the map.</p>
      </section>

      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">Contact &amp; links <span className="text-sm font-normal text-gray-400">(all optional)</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="phone">Phone</label>
            <input id="phone" type="tel" maxLength={30} value={v.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="website">Website</label>
            <input id="website" maxLength={500} value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="example.com" className={input} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="menuUrl">Link to menu</label>
          <input id="menuUrl" maxLength={500} value={v.menuUrl} onChange={(e) => set("menuUrl", e.target.value)} placeholder="https://…" className={input} />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-lg">Hours <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
          <button type="button" onClick={copyMondayToAll} className="text-sm text-brand-600 hover:underline">
            Copy Monday to every day
          </button>
        </div>
        <div className="space-y-2">
          {DAYS.map(({ key, label: dayLabel }) => {
            const d = days[key];
            return (
              <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 font-medium">{dayLabel}</span>
                <select
                  value={d.mode}
                  onChange={(e) => setDay(key, { mode: e.target.value as DayState["mode"] })}
                  className="border rounded-lg px-2 py-1.5"
                  aria-label={`${dayLabel} hours`}
                >
                  <option value="">Not listed</option>
                  <option value="open">Open</option>
                  <option value="24h">Open 24 hours</option>
                  <option value="closed">Closed</option>
                </select>
                {d.mode === "open" && (
                  <span className="flex items-center gap-1">
                    <input type="time" value={d.open} onChange={(e) => setDay(key, { open: e.target.value })} className="border rounded-lg px-2 py-1" aria-label={`${dayLabel} opens`} />
                    <span className="text-gray-400">to</span>
                    <input type="time" value={d.close} onChange={(e) => setDay(key, { close: e.target.value })} className="border rounded-lg px-2 py-1" aria-label={`${dayLabel} closes`} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-full hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : listingId ? "Save changes" : "Submit business"}
        </button>
        {!isAdmin && (
          <p className="text-xs text-gray-500">
            {listingId
              ? "Edits are reviewed by our team before they go live."
              : "Listings are reviewed by our team before they appear in the directory."}
          </p>
        )}
      </div>
    </form>
  );
}
