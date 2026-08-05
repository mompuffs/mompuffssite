import { withAuth } from "next-auth/middleware";

// Everything under these paths requires a signed-in session.
// Marketplace/shop/product pages stay public so visitors can browse before signing up.
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/feed/:path*",
    "/dashboard/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/admin/:path*",
  ],
};
