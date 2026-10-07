"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DIRECTORY_PRICES, PREMIUM_FIELDS_LABEL, type DirectoryPlan } from "@/lib/directory";

type Props = {
  listingId: string;
  fullAccess: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  nextBillingAt: string | null;
  premiumUntil: string | null;
  // Null when PayPal billing isn't set up (yet).
  billing: { clientId: string; plans: Record<DirectoryPlan, string> } | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Loaded under its own namespace: the store checkout loads PayPal's SDK
// with different options (one-time capture), and the two can't share.
const NAMESPACE = "paypalSubscriptions";

function useSubscriptionSdk(clientId: string | undefined) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!clientId) return;
    if ((window as any)[NAMESPACE]) {
      setReady(true);
      return;
    }
    const id = "paypal-sdk-subscriptions";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&currency=USD`;
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

export default function DirectoryPlanPanel(props: Props) {
  const router = useRouter();
  const { listingId, fullAccess, plan, subscriptionStatus, nextBillingAt, premiumUntil, billing } = props;
  const [choice, setChoice] = useState<DirectoryPlan>("MONTHLY");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  const active = subscriptionStatus === "ACTIVE" || subscriptionStatus === "APPROVED";
  const paidThrough = premiumUntil && new Date(premiumUntil) > new Date() ? premiumUntil : null;
  const showSubscribe = !fullAccess && !active && Boolean(billing);
  const { ready, failed } = useSubscriptionSdk(showSubscribe ? billing?.clientId : undefined);

  useEffect(() => {
    const paypal = (window as any)[NAMESPACE];
    if (!showSubscribe || !ready || !paypal || !buttonsRef.current || !billing) return;
    buttonsRef.current.innerHTML = "";
    const buttons = paypal.Buttons({
      style: { label: "subscribe", shape: "pill", height: 40 },
      createSubscription: (_data: any, actions: any) =>
        actions.subscription.create({ plan_id: billing.plans[choice], custom_id: listingId }),
      onApprove: async (data: any) => {
        setBusy(true);
        setMessage(null);
        const res = await fetch(`/api/directory/${listingId}/subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId: data.subscriptionID }),
        });
        const body = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
          setMessage({ kind: "error", text: body.error ?? "Your payment went through but we couldn't turn on Premium. Please contact us." });
          return;
        }
        setMessage({ kind: "ok", text: "You're on Premium! All your listing details are now public." });
        router.refresh();
      },
      onError: () => setMessage({ kind: "error", text: "PayPal ran into a problem. Please try again." }),
    });
    buttons.render(buttonsRef.current);
    return () => {
      try {
        buttons.close();
      } catch {
        // already torn down
      }
    };
  }, [showSubscribe, ready, choice, billing, listingId, router]);

  async function cancel() {
    if (!confirm("Cancel your Premium subscription? You won't be charged again, and Premium details stay up until the end of the time you've paid for.")) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/directory/${listingId}/subscription`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: body.error ?? "Couldn't cancel. Please try again." });
      return;
    }
    setMessage({ kind: "ok", text: "Your subscription is cancelled. You won't be charged again." });
    router.refresh();
  }

  return (
    <section id="plan" className="bg-white rounded-xl shadow p-5 space-y-3 scroll-mt-40">
      <h2 className="font-bold text-lg">Your plan</h2>

      {fullAccess ? (
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-green-700">Premium (complimentary).</span> Every detail you fill in shows publicly.
        </p>
      ) : active ? (
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <span className="font-semibold text-green-700">Premium, {plan === "YEARLY" ? DIRECTORY_PRICES.YEARLY.display : DIRECTORY_PRICES.MONTHLY.display}.</span>{" "}
            {nextBillingAt ? <>Next charge on {fmt(nextBillingAt)}. We&apos;ll email you a week before.</> : <>Renews automatically.</>}
          </p>
          <button type="button" onClick={cancel} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">
            Cancel subscription
          </button>
        </div>
      ) : (
        <div className="text-sm text-gray-700 space-y-1">
          {paidThrough ? (
            <p>
              <span className="font-semibold">Premium until {fmt(paidThrough)}</span> (cancelled, won&apos;t renew). After that your
              listing goes back to Free.
            </p>
          ) : (
            <p>
              <span className="font-semibold">Free.</span> Visitors see your logo, address, phone and about. Your {PREMIUM_FIELDS_LABEL}{" "}
              are saved but hidden.
            </p>
          )}
        </div>
      )}

      {showSubscribe && (
        <div className="border-t pt-3 space-y-3">
          <p className="text-sm font-semibold">Upgrade to Premium to show your {PREMIUM_FIELDS_LABEL}.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(DIRECTORY_PRICES) as DirectoryPlan[]).map((p) => (
              <label
                key={p}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  choice === p ? "border-brand-500 bg-brand-50 font-semibold" : "hover:bg-gray-50"
                }`}
              >
                <input type="radio" name="plan" checked={choice === p} onChange={() => setChoice(p)} className="accent-brand-600" />
                {DIRECTORY_PRICES[p].display}
                {p === "YEARLY" && <span className="text-xs text-green-700 font-semibold">save $10</span>}
              </label>
            ))}
          </div>
          {failed ? (
            <p className="text-sm text-red-600">Couldn&apos;t load PayPal. Check your connection and refresh.</p>
          ) : !ready ? (
            <p className="text-sm text-gray-500">Loading PayPal…</p>
          ) : null}
          <div ref={buttonsRef} className="max-w-sm" />
          <p className="text-xs text-gray-500">
            Renews automatically through PayPal until you cancel. We email you a week before each charge.
          </p>
        </div>
      )}

      {!fullAccess && !active && !billing && (
        <p className="text-sm text-gray-500 border-t pt-3">Premium plans aren&apos;t available just yet. Check back soon!</p>
      )}

      {busy && <p className="text-sm text-gray-500">Working…</p>}
      {message && (
        <p className={`text-sm rounded-lg px-3 py-2 ${message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
