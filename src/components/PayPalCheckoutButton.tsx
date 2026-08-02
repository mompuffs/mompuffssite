"use client";

import { useEffect, useRef, useState } from "react";

export default function PayPalCheckoutButton({
  items,
  couponCode,
  clientId,
  onSuccess,
  onError,
}: {
  items: any[];
  couponCode?: string;
  clientId: string;
  onSuccess: (order: any) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(Boolean((window as any).paypal));

  useEffect(() => {
    if ((window as any).paypal) {
      setSdkReady(true);
      return;
    }
    const existing = document.getElementById("paypal-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setSdkReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
    script.onload = () => setSdkReady(true);
    script.onerror = () => onError("Could not load PayPal.");
    document.body.appendChild(script);
  }, [clientId, onError]);

  useEffect(() => {
    const paypal = (window as any).paypal;
    if (!sdkReady || !containerRef.current || !paypal) return;

    containerRef.current.innerHTML = "";
    const buttons = paypal.Buttons({
      createOrder: async () => {
        const res = await fetch("/api/checkout/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, couponCode }),
        });
        const data = await res.json();
        if (!res.ok) {
          onError(data.error ?? "Could not start checkout.");
          throw new Error(data.error ?? "create-order failed");
        }
        return data.paypalOrderId;
      },
      onApprove: async (data: { orderID: string }) => {
        const res = await fetch("/api/checkout/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypalOrderId: data.orderID, items, couponCode }),
        });
        const order = await res.json();
        if (!res.ok) {
          onError(order.error ?? "Payment could not be completed.");
          return;
        }
        onSuccess(order);
      },
      onError: (err: any) => {
        onError(err?.message ?? "PayPal checkout failed.");
      },
    });
    buttons.render(containerRef.current);

    return () => {
      try {
        buttons.close();
      } catch {
        // already unmounted
      }
    };
  }, [sdkReady, items, couponCode, onSuccess, onError]);

  return <div ref={containerRef} className="mt-2" />;
}
