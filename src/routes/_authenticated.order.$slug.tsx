import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { fallbackImageFor } from "@/lib/product-assets";
import { productPhotoUrl } from "@/lib/photo-url";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/order/$slug")({
  head: () => ({
    meta: [{ title: "Place your order — Petal & Stem" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderForm,
});

function OrderForm() {
  const { slug } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ["order-product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_photos(storage_path, sort_order), product_sizes(id, name, price_delta_cents, sort_order)")
        .eq("slug", slug).eq("is_visible", true).maybeSingle();
      return data;
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const m: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
      return m;
    },
  });

  const features = (settings?.features ?? {}) as Record<string, boolean>;
  const vaseCfg = (settings?.vase ?? { enabled: true, price_cents: 300 }) as { enabled: boolean; price_cents: number };

  const [sizeId, setSizeId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [addVase, setAddVase] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [contactPref, setContactPref] = useState<"email" | "sms">("email");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"online" | "in_person">("in_person");
  const [busy, setBusy] = useState(false);

  const sizes = useMemo(() =>
    (product?.product_sizes ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    [product]
  );
  const activeSize = sizes.find((s: any) => s.id === sizeId) ?? sizes[0];

  const total = useMemo(() => {
    if (!product) return 0;
    const base = product.base_price_cents + (activeSize?.price_delta_cents ?? 0);
    const vase = addVase ? vaseCfg.price_cents : 0;
    return (base + vase) * quantity;
  }, [product, activeSize, addVase, vaseCfg, quantity]);

  if (isLoading) return <div className="container-editorial py-24">Loading…</div>;
  if (!product) throw notFound();

  const photo = product.product_photos?.[0]?.storage_path
    ? productPhotoUrl(product.product_photos[0].storage_path)
    : fallbackImageFor(product.slug);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!date) { toast.error("Please choose a date"); return; }
    if (fulfillment === "delivery" && !address) { toast.error("Please enter a delivery address"); return; }
    setBusy(true);
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      product_id: product!.id,
      product_name: product!.name,
      size_id: activeSize?.id ?? null,
      size_name: activeSize?.name ?? null,
      quantity,
      unit_price_cents: product!.base_price_cents + (activeSize?.price_delta_cents ?? 0),
      vase_added: addVase,
      vase_price_cents: addVase ? vaseCfg.price_cents : 0,
      total_cents: total,
      fulfillment_type: fulfillment,
      requested_date: date,
      requested_time: time || null,
      delivery_address: fulfillment === "delivery" ? address : null,
      custom_description: customDescription,
      contact_preference: contactPref,
      full_name: fullName,
      phone,
      email,
      payment_method: payment,
      payment_status: payment === "online" ? "pending" : "unpaid",
      status: "new",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Order placed! We'll be in touch shortly.");
    navigate({ to: "/account" });
  }

  const pickupEnabled = features.pickup !== false;
  const deliveryEnabled = features.delivery !== false;
  const payOnlineEnabled = features.online_payments === true;
  const payInPersonEnabled = features.pay_in_person !== false;

  return (
    <div className="container-editorial py-12 md:py-20">
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <form onSubmit={submit} className="space-y-10">
          <div>
            <p className="eyebrow">Placing an order for</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{product.name}</h1>
          </div>

          {sizes.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4">Size</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sizes.map((s: any) => (
                  <button key={s.id} type="button" onClick={() => setSizeId(s.id)}
                    className={`rounded-md border px-4 py-3 text-left transition ${(activeSize?.id === s.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.price_delta_cents >= 0 ? "+" : ""}{formatMoney(s.price_delta_cents)}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl mb-4">Quantity</h2>
            <input type="number" min={1} max={50} value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </section>

          <section>
            <h2 className="font-display text-2xl mb-4">Fulfillment</h2>
            <div className="flex gap-3 mb-4">
              {pickupEnabled && (
                <button type="button" onClick={() => setFulfillment("pickup")}
                  className={`rounded-md border px-4 py-2 text-sm ${fulfillment === "pickup" ? "border-primary bg-primary/5" : "border-border"}`}>
                  Pickup
                </button>
              )}
              {deliveryEnabled && (
                <button type="button" onClick={() => setFulfillment("delivery")}
                  className={`rounded-md border px-4 py-2 text-sm ${fulfillment === "delivery" ? "border-primary bg-primary/5" : "border-border"}`}>
                  Delivery
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5">Date</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm mb-1.5">Time (optional)</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            {fulfillment === "delivery" && (
              <div className="mt-4">
                <label className="block text-sm mb-1.5">Delivery address</label>
                <input required value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            )}
          </section>

          {vaseCfg.enabled && (
            <section>
              <label className="flex items-center gap-3 rounded-md border border-border p-4 cursor-pointer hover:bg-accent/5">
                <input type="checkbox" checked={addVase} onChange={(e) => setAddVase(e.target.checked)} />
                <div>
                  <div className="font-medium">Add a vase</div>
                  <div className="text-sm text-muted-foreground">+{formatMoney(vaseCfg.price_cents)}</div>
                </div>
              </label>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl mb-4">Special requests</h2>
            <p className="text-sm text-muted-foreground mb-3">Colors, ribbon, card message, any custom instructions.</p>
            <textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} maxLength={2000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-40" />
          </section>

          <section>
            <h2 className="font-display text-2xl mb-4">Contact</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5">Full name</label>
                <input required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm mb-1.5">Phone</label>
                <input required maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1.5">Email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm mb-2">Preferred contact method</p>
              <div className="flex gap-3">
                {(["email", "sms"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setContactPref(m)}
                    className={`rounded-md border px-4 py-2 text-sm ${contactPref === m ? "border-primary bg-primary/5" : "border-border"}`}>
                    {m === "email" ? "Email" : "Text message"}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-4">Payment</h2>
            <div className="flex gap-3">
              {payInPersonEnabled && (
                <button type="button" onClick={() => setPayment("in_person")}
                  className={`rounded-md border px-4 py-2 text-sm ${payment === "in_person" ? "border-primary bg-primary/5" : "border-border"}`}>
                  Pay in person
                </button>
              )}
              {payOnlineEnabled && (
                <button type="button" onClick={() => setPayment("online")}
                  className={`rounded-md border px-4 py-2 text-sm ${payment === "online" ? "border-primary bg-primary/5" : "border-border"}`}>
                  Pay online
                </button>
              )}
            </div>
            {payment === "online" && (
              <p className="mt-3 text-xs text-muted-foreground">Online payments will be finalized after submission.</p>
            )}
          </section>

          <Button type="submit" disabled={busy} size="lg" className="w-full sm:w-auto">
            {busy ? "Placing order…" : "Place order"}
          </Button>
        </form>

        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <img src={photo} alt={product.name} className="w-full aspect-square object-cover" />
            <div className="p-6 space-y-2">
              <p className="font-display text-2xl">{product.name}</p>
              {activeSize && <p className="text-sm text-muted-foreground">{activeSize.name}</p>}
              <div className="border-t border-border pt-3 mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Quantity</span><span>{quantity}</span></div>
                {addVase && <div className="flex justify-between"><span>Vase</span><span>+{formatMoney(vaseCfg.price_cents)}</span></div>}
                <div className="flex justify-between font-medium text-base border-t border-border pt-2 mt-2">
                  <span>Total</span><span>{formatMoney(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
