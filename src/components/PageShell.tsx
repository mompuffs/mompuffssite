"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

// The admin area (/admin/*) gets its own full-width chrome (see
// AdminSidebar) instead of the public max-w-6xl/Sidebar layout every other
// page uses -- closer to how a WordPress wp-admin screen is a clean break
// from the public theme rather than the theme's own layout with extra bits
// bolted on.
export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <main className="min-w-0 flex-1">{children}</main>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
