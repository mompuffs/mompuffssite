import { withAuth } from "next-auth/middleware";

// Everything under these paths requires a signed-in session: the community
// side (feed, groups, member profiles, friends, messages, account) plus
// selling/buying/admin. The home page, marketplace/shop/product pages, blog,
// directory and help stay public so visitors can browse before signing up.
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/feed/:path*",
    "/groups/:path*",
    "/profile/:path*",
    "/friends/:path*",
    "/messages/:path*",
    "/account/:path*",
    "/dashboard/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/admin/:path*",
  ],
};
