"use client";

import { useEffect, useState } from "react";

export type Category = { id: string; name: string; parentId: string | null };

export default function CategoryPicker({
  categories,
  selectedIds,
  onChange,
}: {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [localCategories, setLocalCategories] = useState(categories);
  useEffect(() => setLocalCategories(categories), [categories]);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topLevel = localCategories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => localCategories.filter((c) => c.parentId === id);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function createCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), parentId: newParentId || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not create category.");
      return;
    }
    const created: Category = await res.json();
    setLocalCategories((prev) => [...prev, created]);
    onChange([...selectedIds, created.id]);
    setNewName("");
    setNewParentId("");
    setAdding(false);
  }

  return (
    <div className="border rounded p-2 text-sm">
      {localCategories.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-2">
          {topLevel.map((top) => (
            <div key={top.id}>
              <label className="flex items-center gap-1.5 font-medium">
                <input type="checkbox" checked={selectedIds.includes(top.id)} onChange={() => toggle(top.id)} />
                {top.name}
              </label>
              {childrenOf(top.id).length > 0 && (
                <div className="pl-5 mt-1 space-y-1">
                  {childrenOf(top.id).map((child) => (
                    <label key={child.id} className="flex items-center gap-1.5 text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(child.id)}
                        onChange={() => toggle(child.id)}
                      />
                      {child.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={localCategories.length > 0 ? "mt-2 pt-2 border-t" : ""}>
        {!adding ? (
          <button type="button" onClick={() => setAdding(true)} className="text-brand-600 hover:underline text-xs">
            + New category
          </button>
        ) : (
          // Not a <form>: this picker can render inside another <form> (e.g.
          // AddProductForm), and nested <form> elements are invalid HTML --
          // the browser silently breaks out of the outer form's submit handling.
          <div className="space-y-1.5">
            <input
              autoFocus
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createCategory();
                }
              }}
              className="w-full border rounded px-2 py-1 text-xs"
            />
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
            >
              <option value="">— Top level —</option>
              {topLevel.map((top) => (
                <option key={top.id} value={top.id}>
                  Under {top.name}
                </option>
              ))}
            </select>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createCategory}
                disabled={saving || !newName.trim()}
                className="bg-brand-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setError(null);
                }}
                className="text-gray-500 text-xs hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
