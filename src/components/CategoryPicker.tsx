"use client";

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
  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  if (categories.length === 0) return null;

  return (
    <div className="border rounded p-2 max-h-48 overflow-y-auto text-sm space-y-2">
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
                  <input type="checkbox" checked={selectedIds.includes(child.id)} onChange={() => toggle(child.id)} />
                  {child.name}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
