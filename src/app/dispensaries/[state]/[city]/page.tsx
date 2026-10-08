import { CityPage, cityMetadata } from "@/components/LocationPages";

export const dynamic = "force-dynamic";

type Props = { params: { state: string; city: string } };

export const generateMetadata = ({ params }: Props) => cityMetadata("dispensaries", params.state, params.city);

export default function Page({ params }: Props) {
  return <CityPage segment="dispensaries" state={params.state} city={params.city} />;
}
