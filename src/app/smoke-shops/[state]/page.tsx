import { StatePage, stateMetadata } from "@/components/LocationPages";

export const dynamic = "force-dynamic";

type Props = { params: { state: string }; searchParams: { page?: string } };

export const generateMetadata = ({ params, searchParams }: Props) => stateMetadata("smoke-shops", params.state, searchParams.page);

export default function Page({ params, searchParams }: Props) {
  return <StatePage segment="smoke-shops" state={params.state} pageRaw={searchParams.page} />;
}
