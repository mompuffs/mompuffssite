import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import TaxRatesTable from "@/components/TaxRatesTable";

export const dynamic = "force-dynamic";

export default async function TaxRatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) redirect("/dashboard/shop");

  const rates = await db.taxRate.findMany({
    where: { shopId: shop.id },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return <TaxRatesTable initial={rates} />;
}
