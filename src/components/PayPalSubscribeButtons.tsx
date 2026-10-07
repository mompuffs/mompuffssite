"use client";

import { useEffect, useRef, useState } from "react";

// PayPal subscription checkout for directory premium, rendered the same way
// as the store checkout: PayPal's standard button stack, where "PayPal"
// opens the PayPal popup and "Debit or Credit Card" opens card entry -- no
// PayPal account needed. The money lands in the MomPuffs PayPal account.
//
// Loaded under its own namespace: the store checkout loads PayPal's SDK
// with one-time-capture options, and the two can't share one script.
const NAMESPACE = "paypalSubscriptions";

function useSubscriptionSdk(clientId: string) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if ((window as any)[NAMESPACE]) {
      setReady(true);
      return;
    }
    const id = "paypal-sdk-subscriptions";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&currency=USD&enable-funding=card`;
      script.setAttribute("data-namespace", NAMESPACE);
      document.body.appendChild(script);
    }
    const onLoad = () => setReady(true);
    const onError = () => setFailed(true);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    return () => {
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [clientId]);
  return { ready, failed };
}

export default function PayPalSubscribeButtons({
  clientId,
  planId,
  getCustomId,
  beforeOpen,
  onApproved,
  onError,
}: {
  clientId: string;
  planId: string;
  // The listing ID the subscription is for. May create it first (submit flow).
  getCustomId: () => Promise<string>;
  // Return false to stop before PayPal opens (e.g. the form is incomplete).
  beforeOpen?: () => boolean;
  onApproved: (subscriptionId: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, failed } = useSubscriptionSdk(clientId);

  // Latest callbacks without re-rendering PayPal's iframes on every keystroke.
  const cb = useRef({ getCustomId, beforeOpen, onApproved, onError });
  cb.current = { getCustomId, beforeOpen, onApproved, onError };

  useEffect(() => {
    const paypal = (window as any)[NAMESPACE];
    if (!ready || !paypal || !containerRef.current) return;

    containerRef.current.innerHTML = "";
    // Default (no fundingSource, default style) -- same stack as the store
    // checkout's PayPalCheckoutButton.
    const buttons = paypal.Buttons({
      onClick: (_data: any, actions: any) => (cb.current.beforeOpen?.() === false ? actions.reject() : actions.resolve()),
      createSubscription: async (_data: any, actions: any) => {
        try {
          const customId = await cb.current.getCustomId();
          return actions.subscription.create({ plan_id: planId, custom_id: customId });
        } catch (err: any) {
          cb.current.onError(err?.message ?? "Couldn't start checkout.");
          throw err;
        }
      },
      onApprove: async (data: any) => {
        await cb.current.onApproved(data.subscriptionID);
      },
      onError: () => cb.current.onError("PayPal ran into a problem. Please try again."),
    });
    buttons.render(containerRef.current);

    return () => {
      try {
        buttons.close();
      } catch {
        // already torn down
      }
    };
  }, [ready, planId]);

  if (failed) return <p className="text-sm text-red-600">Couldn&apos;t load PayPal. Check your connection and refresh.</p>;

  return (
    <div className="max-w-md">
      {!ready && <p className="text-sm text-gray-500">Loading payment options…</p>}
      <div ref={containerRef} className="mt-2" />
    </div>
  );
}
