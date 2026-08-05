import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AdminSidebar from "@/components/AdminSidebar";

// Every /admin/* page depends on the current user's role, and the isAdmin
// flag can change between requests (another admin can revoke it) -- so this
// can't be statically rendered.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(user as any).isAdmin) redirect("/feed");

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 min-w-0 p-6 md:p-8">{children}</div>
    </div>
  );
}
