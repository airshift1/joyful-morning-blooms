import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function maskPaymentValue(value: string) {
  if (!value) return "";
  return value.length <= 4 ? "••••" : `•••• ${value.slice(-4)}`;
}

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [{ title: "My account — Joyful Morning Blooms" }, { name: "robots", content: "noindex" }],
  }),
  component: Account,
});

function Account() {
  const { user, profile, isAdmin } = useAuth();
  const router = useRouter();
  const isEditing = router.state.location.pathname === "/account/edit";
  const [squareConfig, setSquareConfig] = useState<{ connected: boolean; app_id?: string | null; location_id?: string | null } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [amountDollars, setAmountDollars] = useState("25");
  const [description, setDescription] = useState("Floral order payment");
  const [cardInstance, setCardInstance] = useState<any>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  if (isEditing) {
    return <Outlet />;
  }

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ["user-payment-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", `user_payment_${user!.id}`).maybeSingle();
      return (data?.value ?? null) as Record<string, any> | null;
    },
  });

  useEffect(() => {
    let active = true;
    async function loadConfig() {
      try {
        const response = await fetch("/api/square/config");
        const payload = await response.json();
        if (active) setSquareConfig(payload);
      } catch {
        if (active) setSquareConfig({ connected: false });
      }
    }

    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if ((window as Window & { Square?: any }).Square) {
      setScriptLoaded(true);
      return;
    }

    const existing = document.querySelector('script[src="https://js.squareup.com/v2/paymentform"]');
    if (existing) {
      existing.addEventListener("load", () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.squareup.com/v2/paymentform";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptLoaded(false);
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!scriptLoaded || !squareConfig?.connected || !squareConfig.app_id || !squareConfig.location_id) {
      setCardReady(false);
      setCardInstance(null);
      setCardError("Card payments are not ready yet. Make sure the Square app ID, location ID, and access token are configured for this site.");
      return () => {
        cancelled = true;
      };
    }

    async function initializeCard() {
      try {
        const payments = (window as Window & { Square?: any }).Square.payments(squareConfig.app_id, squareConfig.location_id);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach("#square-card-container");
        setCardInstance(card);
        setCardReady(true);
        setCardError(null);
      } catch (error) {
        console.error("Unable to initialize Square card form", error);
        if (!cancelled) {
          setCardReady(false);
          setCardInstance(null);
          setCardError(error instanceof Error ? error.message : "The card form could not be loaded. Check the Square configuration and try again.");
        }
      }
    }

    initializeCard();

    return () => {
      cancelled = true;
      setCardReady(false);
      setCardInstance(null);
    };
  }, [scriptLoaded, squareConfig?.connected, squareConfig?.app_id, squareConfig?.location_id]);

  async function payNow() {
    if (!user || !cardInstance) {
      toast.error("Card payment is not ready yet.");
      return;
    }

    const amountCents = Math.max(100, Math.round(Number(amountDollars) * 100));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setPaying(true);
    try {
      const tokenResult = await cardInstance.tokenize();
      if (tokenResult?.status !== "OK" || !tokenResult.token) {
        throw new Error(tokenResult?.errors?.[0]?.detail ?? "Please enter a valid card.");
      }

      const response = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          amountCents,
          idempotencyKey: crypto.randomUUID(),
          description,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.details?.errors?.[0]?.detail ?? payload?.error ?? "Payment failed.");
      }

      toast.success(`Payment accepted for ${formatMoney(amountCents)}`);
      setAmountDollars("25");
      setDescription("Floral order payment");
    } catch (error: any) {
      toast.error(error?.message ?? "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="container-editorial py-16 md:py-24">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-3 font-display text-5xl">Hello{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isAdmin && (
          <Button asChild>
            <Link to="/admin">Open admin panel</Link>
          </Button>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
          <Button asChild variant="outline"><Link to="/account/edit">Edit profile</Link></Button>
        </div>
      </div>

      <section className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-2xl mb-4">Payment preferences</h2>
        {paymentSettings ? (
          <div className="space-y-2">
            <p className="text-sm">Preferred payment: <strong>{paymentSettings.payment_method === "online" ? "Online" : "Pay in person"}</strong></p>
            {paymentSettings.payment_label && <p className="text-sm">Saved payment label: <strong>{paymentSettings.payment_label}</strong></p>}
            {paymentSettings.payment_method === "online" && paymentSettings.payment_token && (
              <p className="text-sm">Saved payment secret: <strong>{maskPaymentValue(paymentSettings.payment_token)}</strong></p>
            )}
            {!paymentSettings.payment_token && paymentSettings.payment_method === "online" && (
              <p className="text-sm text-muted-foreground">Online payment is enabled, but no card details are set yet. Use the card form below to pay now.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Save your preferred payment method and use the card form below to pay online.</p>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-2xl mb-4">Pay online with a card</h2>
        {!squareConfig?.connected ? (
          <p className="text-sm text-muted-foreground">Card payments are not configured for this site yet. Once the florist adds the Square app ID, location ID, and access token, this form will work.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm">Amount</label>
                <input
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  type="number"
                  min="1"
                  step="0.01"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div ref={cardContainerRef} id="square-card-container" className="rounded-md border border-input bg-background p-3" />
            <div className="flex items-center gap-3">
              <Button onClick={payNow} disabled={paying || !cardReady}>
                {paying ? "Processing..." : "Pay now"}
              </Button>
              {!cardReady && <p className="text-sm text-muted-foreground">Preparing the secure card form…</p>}
            </div>
            {cardError && <p className="text-sm text-red-600">{cardError}</p>}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl mb-6">Your orders</h2>
        {(orders ?? []).length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-muted-foreground">
            No orders yet. <Link to="/shop" className="underline">Browse the shop</Link>.
          </div>
        )}
        <div className="space-y-4">
          {(orders ?? []).map((o: any) => (
            <div key={o.id} className="rounded-lg border border-border bg-card p-6 flex flex-wrap items-center gap-6 justify-between">
              <div>
                <p className="font-display text-2xl">{o.products?.name ?? "Custom order"}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(o.created_at)} · {o.quantity} × {o.size_name ?? "standard"}
                </p>
                <p className="text-sm mt-1">Fulfillment: {o.fulfillment} on {o.needed_date}{o.needed_time ? ` at ${o.needed_time}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-lg">{formatMoney(o.subtotal_cents)}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-secondary">{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
