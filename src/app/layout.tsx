import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { CartProvider } from "@/components/CartContext";
import OverlayProvider from "@/components/OverlayProvider";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

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
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <CartProvider>
            <OverlayProvider>
              <Navbar />
              <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
                <Sidebar />
                <main className="flex-1 min-w-0">{children}</main>
              </div>
            </OverlayProvider>
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
