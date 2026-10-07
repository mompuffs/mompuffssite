"use client";

import { useEffect, useState } from "react";
import { DAYS, formatDayHours, type Hours } from "@/lib/directory";

// Bolds today's row. "Today" comes from the viewer's clock, so it's set
// after mount to avoid a server/client mismatch.
export default function DirectoryHours({ hours }: { hours: Hours }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(DAYS[(new Date().getDay() + 6) % 7].key);
  }, []);

  return (
    <table className="w-full text-sm">
      <tbody>
        {DAYS.map(({ key, label }) => (
          <tr key={key} className={today === key ? "font-bold text-brand-800" : "text-gray-600"}>
            <td className="py-1 pr-3">{label}</td>
            <td className="py-1 text-right">{formatDayHours(hours[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
