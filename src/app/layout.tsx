import type { Metadata } from "next";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { CartProvider } from "@/components/CartContext";
import OverlayProvider from "@/components/OverlayProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Mompuffs",
  description: "A social feed with a marketplace attached.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <CartProvider>
            <OverlayProvider>
              <Navbar />
              <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
            </OverlayProvider>
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
