import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { CartProvider } from "@/components/CartContext";
import OverlayProvider from "@/components/OverlayProvider";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";
import Footer from "@/components/Footer";

// Self-hosted at build time via next/font -- no runtime request to Google
// Fonts, so this doesn't add a third-party network call. Nunito's rounded,
// friendly letterforms suit the community/marketplace tone; the CSS
// variable feeds tailwind's `font-sans` so every existing className picks
// it up with no per-file changes.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mompuffs",
  description: "A social feed with a marketplace attached.",
};

// Was missing entirely -- without it, mobile browsers fall back to a wide
// desktop-style virtual viewport and the whole page scales down and
// horizontally scrolls instead of actually being responsive.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <SessionProviderWrapper>
          <CartProvider>
            <OverlayProvider>
              <PresenceHeartbeat />
              <Navbar />
              <PageShell>{children}</PageShell>
              <Footer />
            </OverlayProvider>
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
