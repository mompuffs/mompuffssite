import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import AdminSettingsForm from "@/components/AdminSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) redirect("/dashboard/shop");

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { displayName: true },
  });

  return (
    <AdminSettingsForm
      shop={{ name: shop.name, description: shop.description ?? "", bannerUrl: shop.bannerUrl ?? "" }}
      account={{ displayName: account?.displayName ?? user.name ?? "" }}
    />
  );
}
