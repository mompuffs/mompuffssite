import { CategoryHub, hubMetadata } from "@/components/LocationPages";

export const dynamic = "force-dynamic";
export const generateMetadata = () => hubMetadata("dispensaries");

export default function Page() {
  return <CategoryHub segment="dispensaries" />;
}
