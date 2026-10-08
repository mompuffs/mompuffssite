import { CategoryHub, hubMetadata } from "@/components/LocationPages";

export const dynamic = "force-dynamic";
export const generateMetadata = () => hubMetadata("mmj-doctors");

export default function Page() {
  return <CategoryHub segment="mmj-doctors" />;
}
