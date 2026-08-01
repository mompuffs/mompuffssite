import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Convenience wrapper for reading the current session in Server Components
// and Route Handlers.
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
