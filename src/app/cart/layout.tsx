import { privateMeta } from "@/lib/seo";

// The page itself is a client component, which can't export metadata.
export const metadata = privateMeta("Your cart");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
