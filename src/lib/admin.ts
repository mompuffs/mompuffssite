import { getCurrentUser } from "@/lib/session";

// Convenience guard for admin-only Server Components and Route Handlers.
// Mirrors getCurrentUser(), but also checks the isAdmin flag on the
// session's JWT (set in src/lib/auth.ts from User.isAdmin at sign-in / on
// session update). Returns null instead of throwing so callers can redirect
// or 403 as fits the context.
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) return null;
  return user;
}
