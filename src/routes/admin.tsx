import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney, formatDate } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { productPhotoUrl } from "@/lib/photo-url";
import { fallbackImageFor } from "@/lib/product-assets";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Petal & Stem" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminGate,
});

function AdminGate() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="container-editorial py-24">Loading…</div>;
  if (!user) {
    return (
      <div className="container-editorial py-24 max-w-md">
        <h1 className="font-display text-3xl">Admin</h1>
        <p className="mt-3 text-muted-foreground">Please sign in to continue.</p>
        <Button asChild className="mt-6"><Link to="/auth">Sign in</Link></Button>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="container-editorial py-24 max-w-md">
        <h1 className="font-display text-3xl">Not authorized</h1>
        <p className="mt-3 text-muted-foreground">This area is only for the shop owner.</p>
      </div>
    );
  }
  return <AdminDashboard />;
}

function AdminDashboard() {
  return (
    <div className="container-editorial py-10">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Studio dashboard</h1>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="content">Pages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="reviews"><ReviewsTab /></TabsContent>
        <TabsContent value="content"><ContentTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function OrdersTab() {
  const { data: orders, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); refetch(); }
  }

  return (
    <div className="space-y-4 py-6">
      {(orders ?? []).length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      {(orders ?? []).map((o: any) => (
        <div key={o.id} className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-start gap-6 justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-xl">{o.product_name}</p>
                <span className="px-2 py-0.5 rounded-full text-xs bg-secondary">{o.status}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-secondary">{o.payment_method}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(o.created_at)} · {o.quantity} × {o.size_name ?? "—"} · {formatMoney(o.subtotal_cents)}
              </p>
              <p className="mt-2 text-sm"><strong>{o.full_name}</strong> · {o.phone} · {o.email}</p>
              <p className="text-sm text-muted-foreground">Prefers: {o.contact_preference}</p>
              <p className="mt-2 text-sm">{o.fulfillment} on {o.needed_date}{o.needed_time ? ` at ${o.needed_time}` : ""}</p>
              {o.vase_added && <p className="text-sm">+ Vase (+{formatMoney(o.vase_price_cents)})</p>}
              {o.custom_description && (
                <div className="mt-3 p-3 rounded-md bg-secondary/60 text-sm whitespace-pre-line">
                  <p className="eyebrow text-[10px] mb-1">Special requests</p>
                  {o.custom_description}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {["accepted", "completed", "rejected", "cancelled"].map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => setStatus(o.id, s)}>{s}</Button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductsTab() {
  const { data: products, refetch } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, product_photos(id, storage_path)").order("sort_order");
      return data ?? [];
    },
  });

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }

  async function addProduct() {
    const slug = prompt("Slug (e.g. 'summer-bundle')")?.trim();
    if (!slug) return;
    const name = prompt("Name") ?? slug;
    const { error } = await supabase.from("products").insert({ slug, name, base_price_cents: 2500, description: "" });
    if (error) toast.error(error.message); else { toast.success("Added"); refetch(); }
  }

  async function del(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }

  return (
    <div className="py-6 space-y-4">
      <Button onClick={addProduct}>+ Add product</Button>
      {(products ?? []).map((p: any) => (
        <ProductEditor key={p.id} product={p} onUpdate={(patch) => update(p.id, patch)} onDelete={() => del(p.id)} onRefresh={refetch} />
      ))}
    </div>
  );
}

function ProductEditor({ product, onUpdate, onDelete, onRefresh }: any) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.base_price_cents / 100);
  const [description, setDescription] = useState(product.description ?? "");
  const photo = product.product_photos?.[0]?.storage_path
    ? productPhotoUrl(product.product_photos[0].storage_path)
    : fallbackImageFor(product.slug);

  async function uploadPhoto(file: File) {
    const path = `${product.id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("product-photos").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { error: dbErr } = await supabase.from("product_photos").insert({ product_id: product.id, storage_path: path, sort_order: (product.product_photos?.length ?? 0) });
    if (dbErr) toast.error(dbErr.message); else { toast.success("Uploaded"); onRefresh(); }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 grid md:grid-cols-[160px_1fr_auto] gap-4">
      <img src={photo} alt={name} className="w-40 aspect-square object-cover rounded-md" />
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
        <input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-32 rounded-md border border-input px-3 py-2 text-sm" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm min-h-24" />
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={product.is_visible} onCheckedChange={(v) => onUpdate({ is_visible: v })} /> Visible
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={product.is_featured} onCheckedChange={(v) => onUpdate({ is_featured: v })} /> Featured
          </label>
        </div>
        <div>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} className="text-sm" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={() => onUpdate({ name, base_price_cents: Math.round(price * 100), description })}>Save</Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  );
}

function ReviewsTab() {
  const { data: reviews, refetch } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }
  async function reply(id: string, current: string) {
    const admin_reply = prompt("Your reply", current ?? "") ?? current;
    const { error } = await supabase.from("reviews").update({ admin_reply }).eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }
  async function del(id: string) {
    if (!confirm("Delete review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }

  return (
    <div className="py-6 space-y-3">
      {(reviews ?? []).map((r: any) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{r.products?.name} · {r.reviewer_name} · {r.rating}★ · <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{r.status}</span></p>
              {r.body && <p className="mt-2">{r.body}</p>}
              {r.admin_reply && <p className="mt-2 text-sm text-muted-foreground">Reply: {r.admin_reply}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "hidden")}>Hide</Button>
              <Button size="sm" variant="outline" onClick={() => reply(r.id, r.admin_reply)}>Reply</Button>
              <Button size="sm" variant="destructive" onClick={() => del(r.id)}>Delete</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentTab() {
  const { data: rows, refetch } = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("*").order("key");
      return data ?? [];
    },
  });

  return (
    <div className="py-6 space-y-6">
      {(rows ?? []).map((r: any) => (
        <ContentEditor key={r.key} row={r} onSaved={refetch} />
      ))}
    </div>
  );
}

function ContentEditor({ row, onSaved }: any) {
  const [value, setValue] = useState(JSON.stringify(row.value, null, 2));
  async function save() {
    try {
      const parsed = JSON.parse(value);
      const { error } = await supabase.from("site_content").update({ value: parsed }).eq("key", row.key);
      if (error) throw error;
      toast.success("Saved"); onSaved();
    } catch (e: any) { toast.error(e.message); }
  }
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="font-display text-xl mb-3">{row.key}</p>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} className="w-full font-mono text-xs rounded-md border border-input bg-background px-3 py-2 min-h-48" />
      <Button size="sm" className="mt-3" onClick={save}>Save</Button>
    </div>
  );
}

function SettingsTab() {
  const { data: rows, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return data ?? [];
    },
  });
  const features = (rows?.find((r: any) => r.key === "features")?.value ?? {}) as Record<string, boolean>;
  const vase = (rows?.find((r: any) => r.key === "vase")?.value ?? { enabled: true, price_cents: 300 }) as { enabled: boolean; price_cents: number };

  async function saveFeatures(next: Record<string, boolean>) {
    const { error } = await supabase.from("site_settings").upsert({ key: "features", value: next });
    if (error) toast.error(error.message); else refetch();
  }
  async function saveVase(next: any) {
    const { error } = await supabase.from("site_settings").upsert({ key: "vase", value: next });
    if (error) toast.error(error.message); else refetch();
  }

  const toggles = ["delivery","pickup","reviews","comments","contact_form","online_payments","pay_in_person","wedding_orders","gallery","products","monthly_subscription"];

  return (
    <div className="py-6 space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-2xl mb-4">Features</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {toggles.map((k) => (
            <label key={k} className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm capitalize">{k.replace(/_/g, " ")}</span>
              <Switch checked={features[k] !== false} onCheckedChange={(v) => saveFeatures({ ...features, [k]: v })} />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-2xl mb-4">Vase add-on</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={vase.enabled} onCheckedChange={(v) => saveVase({ ...vase, enabled: v })} /> Enabled
          </label>
          <label className="text-sm flex items-center gap-2">
            Price ($):
            <input type="number" step="0.01" defaultValue={vase.price_cents / 100}
              onBlur={(e) => saveVase({ ...vase, price_cents: Math.round(Number(e.target.value) * 100) })}
              className="w-24 rounded-md border border-input px-2 py-1" />
          </label>
        </div>
      </section>
    </div>
  );
}
