import { pageMeta } from "@/lib/seo";

// The page itself is a client component, which can't export metadata.
export const metadata = pageMeta({
  title: "Contact Us | MomPuffs",
  description: "Questions, listing corrections or partnership ideas? Send the MomPuffs team a message.",
  path: "/contact",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
