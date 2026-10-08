import { CityPage, cityMetadata } from "@/components/LocationPages";

export const dynamic = "force-dynamic";

type Props = { params: { state: string; city: string } };

export const generateMetadata = ({ params }: Props) => cityMetadata("smoke-shops", params.state, params.city);

export default function Page({ params }: Props) {
  return <CityPage segment="smoke-shops" state={params.state} city={params.city} />;
}
