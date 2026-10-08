import { CategoryHub, hubMetadata } from "@/components/LocationPages";

export const dynamic = "force-dynamic";
export const generateMetadata = () => hubMetadata("smoke-shops");

export default function Page() {
  return <CategoryHub segment="smoke-shops" />;
}
