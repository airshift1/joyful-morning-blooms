import { createFileRoute, redirect, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isAdminEmail } from "@/lib/admin";
import { formatMoney, formatDate } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { productPhotoUrl } from "@/lib/photo-url";
import { fallbackImageFor } from "@/lib/product-assets";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Joyful Morning Blooms" }, { name: "robots", content: "noindex" }],
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
  const router = useRouter();
  const isEditingHome = router.state.location.pathname === "/admin/edit-home";

  if (isEditingHome) {
    return <Outlet />;
  }

  return (
    <div className="container-editorial py-10">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Studio dashboard</h1>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="reviews"><ReviewsTab /></TabsContent>
        <TabsContent value="comments"><CommentsTab /></TabsContent>
        <TabsContent value="pages"><PagesTab /></TabsContent>
        <TabsContent value="content"><ContentTab /></TabsContent>
        <TabsContent value="branding"><BrandingTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>

    </div>
  );
}

function OrdersTab() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: orders, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: any) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); refetch(); }
  }

  const archived = (orders ?? []).filter((o: any) => o.status === "completed" || o.status === "cancelled" || o.status === "rejected");
  const active = (orders ?? []).filter((o: any) => !(o.status === "completed" || o.status === "cancelled" || o.status === "rejected"));
  const list = showArchived ? archived : active;

  return (
    <div className="space-y-4 py-6">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived ({archived.length})
        </label>
        <span className="text-sm text-muted-foreground">· Active: {active.length}</span>
      </div>
      {list.length === 0 && <p className="text-muted-foreground">{showArchived ? "No archived orders." : "No active orders."}</p>}
      {list.map((o: any) => (
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

  async function update(id: string, patch: Record<string, any>) {
    const { error } = await supabase.from("products").update(patch as any).eq("id", id);
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
        <ProductEditor key={p.id} product={p} onUpdate={(patch: Record<string, any>) => update(p.id, patch)} onDelete={() => del(p.id)} onRefresh={refetch} />
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

  async function setStatus(id: string, status: any) {
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

function PagesTab() {
  const [editing, setEditing] = useState<string | null>(null);
  const { data: pages, refetch, isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("pages").select("*").order("slug");
        if (error) {
          if (error.message.includes("does not exist")) {
            toast.error("Pages table not yet created. Please run the migration first.");
            return null;
          }
          throw error;
        }
        return data ?? [];
      } catch (e) {
        console.error("Error loading pages:", e);
        return null;
      }
    },
  });

  async function addPage() {
    const slug = prompt("Slug for the new page (e.g. 'home', 'about', 'contact')")?.trim();
    if (!slug) return;
    const title = prompt("Page title", slug) ?? slug;
    const id = crypto.randomUUID();
    const { error } = await supabase.from("pages").insert({
      id,
      slug,
      title,
      subtitle: "",
      content: "",
      background_color: "#ffffff",
      background_image_url: null,
      is_published: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Page created");
    refetch();
    setEditing(id);
  }

  async function updatePage(id: string, updates: any) {
    const { error } = await supabase.from("pages").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); refetch(); }
  }

  if (isLoading) {
    return <div className="py-6">Loading pages...</div>;
  }

  if (pages === null) {
    return (
      <div className="py-6 rounded-lg border border-border bg-card p-6 max-w-2xl">
        <h3 className="font-display text-xl mb-3">Migration Required</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The Pages table hasn't been created yet. To enable page management:
        </p>
        <ol className="text-sm space-y-2 list-decimal list-inside mb-4">
          <li>Go to <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></li>
          <li>Click <strong>New Query</strong></li>
          <li>Paste the SQL code from <code className="bg-background px-2 py-1 rounded text-xs">PAGES_CMS_SETUP.md</code></li>
          <li>Click <strong>Run</strong></li>
          <li>Come back here and refresh</li>
        </ol>
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>
    );
  }

  const pageList = pages ?? [];

  return (
    <div className="py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-lg border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-2xl mb-2">Website Pages</h2>
          <p className="text-sm text-muted-foreground">Edit any page without touching code. Click a page below to start editing.</p>
        </div>
        <Button onClick={addPage}>+ Add page</Button>
      </div>

      {pageList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No pages found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pageList.map((page: any) => (
            <PageCard key={page.id} page={page} isEditing={editing === page.id} onEdit={() => setEditing(page.id)} onClose={() => setEditing(null)} onSave={(updates) => { updatePage(page.id, updates); setEditing(null); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageCard({ page, isEditing, onEdit, onClose, onSave }: any) {
  const [title, setTitle] = useState(page.title);
  const [subtitle, setSubtitle] = useState(page.subtitle);
  const [content, setContent] = useState(page.content);
  const [bgColor, setBgColor] = useState(page.background_color);
  const [bgImage, setBgImage] = useState(page.background_image_url);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ title, subtitle, content, background_color: bgColor, background_image_url: bgImage });
    setSaving(false);
  }

  async function uploadImage(file: File) {
    if (!file) return;
    const path = `page-${page.slug}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from("images").upload(path, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    setBgImage(data.publicUrl);
  }

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 hover:border-border/80 transition-colors">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="font-display text-xl mb-1">{page.title}</h3>
            {page.subtitle && <p className="text-sm text-muted-foreground">{page.subtitle}</p>}
          </div>
          <span className="px-2 py-1 rounded text-xs bg-secondary text-secondary-foreground">{page.slug}</span>
        </div>
        
        {page.content && (
          <p className="text-sm text-foreground/70 mb-3 line-clamp-2">{page.content}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="flex items-center gap-2">
            {page.background_color && (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded border border-border" style={{ backgroundColor: page.background_color }}></div>
                <span className="text-xs text-muted-foreground">{page.background_color}</span>
              </div>
            )}
          </div>
          <Button size="sm" onClick={onEdit}>Edit Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 md:col-span-2 rounded-lg border border-border bg-card p-6">
      <h3 className="font-display text-2xl mb-6">Editing: {page.title}</h3>
      
      <div className="space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-semibold mb-2">Page Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-base"
            placeholder="Enter page title"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Subtitle (optional)</label>
          <input 
            type="text" 
            value={subtitle} 
            onChange={(e) => setSubtitle(e.target.value)} 
            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-base"
            placeholder="Enter page subtitle"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Page Content</label>
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            className="w-full min-h-40 rounded-md border border-input bg-background px-4 py-2.5 text-base resize-none"
            placeholder="Enter page content here..."
          />
        </div>

        <div className="rounded-lg bg-secondary/20 p-4 border border-border/40">
          <h4 className="font-semibold text-sm mb-3">Background Settings</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Background Color</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={bgColor} 
                  onChange={(e) => setBgColor(e.target.value)} 
                  className="h-12 w-20 rounded cursor-pointer border border-input"
                />
                <input 
                  type="text" 
                  value={bgColor} 
                  onChange={(e) => setBgColor(e.target.value)} 
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Background Image</label>
              {bgImage && (
                <div className="mb-3 p-3 rounded-lg bg-background border border-border/40">
                  <p className="text-xs text-muted-foreground mb-2">Current image:</p>
                  <img src={bgImage} alt="Background preview" className="max-h-32 rounded object-cover" />
                  <a href={bgImage} target="_blank" rel="noopener noreferrer" className="text-xs underline text-primary mt-2 inline-block">View full image</a>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} 
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button size="lg" onClick={save} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button size="lg" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContentEditor({ row, onSaved }: any) {
  const valueObject = row.value ?? {};
  const [saving, setSaving] = useState(false);
  const [jsonValue, setJsonValue] = useState(JSON.stringify(valueObject, null, 2));
  const [homeHeroEyebrow, setHomeHeroEyebrow] = useState("");
  const [homeHeroTitle, setHomeHeroTitle] = useState("");
  const [homeHeroSubtitle, setHomeHeroSubtitle] = useState("");
  const [homeHeroCta, setHomeHeroCta] = useState("");
  const [homeStoryTitle, setHomeStoryTitle] = useState("");
  const [homeStoryBody, setHomeStoryBody] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutBody, setAboutBody] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactHours, setContactHours] = useState("");

  useEffect(() => {
    if (row.key === "home") {
      setHomeHeroEyebrow(valueObject.hero_eyebrow ?? "");
      setHomeHeroTitle(valueObject.hero_title ?? "");
      setHomeHeroSubtitle(valueObject.hero_subtitle ?? "");
      setHomeHeroCta(valueObject.hero_cta ?? "");
      setHomeStoryTitle(valueObject.story_title ?? "");
      setHomeStoryBody(valueObject.story_body ?? "");
    } else if (row.key === "about") {
      setAboutTitle(valueObject.title ?? "");
      setAboutBody(valueObject.body ?? "");
    } else if (row.key === "contact") {
      setContactTitle(valueObject.title ?? "");
      setContactBody(valueObject.body ?? "");
      setContactEmail(valueObject.email ?? "");
      setContactPhone(valueObject.phone ?? "");
      setContactAddress(valueObject.address ?? "");
      setContactHours(valueObject.hours ?? "");
    } else {
      setJsonValue(JSON.stringify(valueObject, null, 2));
    }
  }, [row.key, JSON.stringify(valueObject)]);

  async function save() {
    setSaving(true);
    try {
      let nextValue: any;
      if (row.key === "home") {
        nextValue = {
          ...valueObject,
          hero_eyebrow: homeHeroEyebrow,
          hero_title: homeHeroTitle,
          hero_subtitle: homeHeroSubtitle,
          hero_cta: homeHeroCta,
          story_title: homeStoryTitle,
          story_body: homeStoryBody,
        };
      } else if (row.key === "about") {
        nextValue = { ...valueObject, title: aboutTitle, body: aboutBody };
      } else if (row.key === "contact") {
        nextValue = {
          ...valueObject,
          title: contactTitle,
          body: contactBody,
          email: contactEmail,
          phone: contactPhone,
          address: contactAddress,
          hours: contactHours,
        };
      } else {
        nextValue = JSON.parse(jsonValue);
      }

      const { error } = await supabase.from("site_content").upsert({ key: row.key, value: nextValue });
      if (error) throw error;
      toast.success("Saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save content");
    } finally {
      setSaving(false);
    }
  }

  const renderHomeEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Hero eyebrow</label>
        <input value={homeHeroEyebrow} onChange={(e) => setHomeHeroEyebrow(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Hero title</label>
        <input value={homeHeroTitle} onChange={(e) => setHomeHeroTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Hero subtitle</label>
        <textarea value={homeHeroSubtitle} onChange={(e) => setHomeHeroSubtitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-28" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Hero CTA</label>
        <input value={homeHeroCta} onChange={(e) => setHomeHeroCta(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Story title</label>
        <input value={homeStoryTitle} onChange={(e) => setHomeStoryTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Story body</label>
        <textarea value={homeStoryBody} onChange={(e) => setHomeStoryBody(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-28" />
      </div>
    </div>
  );

  const renderAboutEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Page title</label>
        <input value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Page body</label>
        <textarea value={aboutBody} onChange={(e) => setAboutBody(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-28" />
      </div>
    </div>
  );

  const renderContactEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Page title</label>
        <input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Page body</label>
        <textarea value={contactBody} onChange={(e) => setContactBody(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-28" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hours</label>
          <input value={contactHours} onChange={(e) => setContactHours(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="font-display text-xl mb-3">{row.key}</p>
      {row.key === "home" ? renderHomeEditor() : row.key === "about" ? renderAboutEditor() : row.key === "contact" ? renderContactEditor() : (
        <textarea value={jsonValue} onChange={(e) => setJsonValue(e.target.value)} className="w-full font-mono text-xs rounded-md border border-input bg-background px-3 py-2 min-h-48" />
      )}
      <div className="mt-4">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
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

  // Square settings state (admin-managed)
  const [squareAppId, setSquareAppId] = useState("");
  const [squareAccessToken, setSquareAccessToken] = useState("");
  const [squareLocationId, setSquareLocationId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function loadSquareSettings() {
      try {
        const { data, error } = await supabase.from("admin_settings").select("setting_value").eq("id", "square").maybeSingle();
        if (error) throw error;
        const settings = data?.setting_value as any;
        if (settings) {
          setSquareAppId(settings.app_id ?? "");
          setSquareAccessToken(settings.access_token ?? "");
          setSquareLocationId(settings.location_id ?? "");
          setIsConnected(!!settings.app_id && !!settings.access_token && !!settings.location_id);
        }
      } catch (err) {
        console.error("Failed to load Square settings:", err);
      }
    }

    loadSquareSettings();
  }, []);

  async function handleSaveSquareSettings() {
    setIsSaving(true);
    try {
      if (!squareAppId || !squareAccessToken || !squareLocationId) {
        toast.error("Please fill in all Square fields");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase.from("admin_settings").upsert({
        id: "square",
        setting_key: "square_credentials",
        setting_value: {
          app_id: squareAppId,
          access_token: squareAccessToken,
          location_id: squareLocationId,
        },
      });

      if (error) throw error;
      toast.success("Square credentials saved!");
      setIsConnected(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save Square credentials");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnectSquare() {
    if (!confirm("Are you sure? This will disconnect Square.")) return;
    try {
      const { error } = await supabase.from("admin_settings").delete().eq("id", "square");
      if (error) throw error;
      setSquareAppId("");
      setSquareAccessToken("");
      setSquareLocationId("");
      setIsConnected(false);
      toast.success("Square disconnected");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to disconnect Square");
    }
  }

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

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-2xl">Square checkout</h3>
            <p className="text-sm text-muted-foreground">Save your Square credentials to enable online payments for orders.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {isConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Square App ID</label>
            <input value={squareAppId} onChange={(e) => setSquareAppId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Square Location ID</label>
            <input value={squareLocationId} onChange={(e) => setSquareLocationId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Square Access Token</label>
            <input value={squareAccessToken} type="password" onChange={(e) => setSquareAccessToken(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <p className="text-xs text-muted-foreground mt-2">Keep this private. It is used to connect your Square account.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleSaveSquareSettings} disabled={isSaving}>{isSaving ? "Saving..." : "Save Square credentials"}</Button>
          {isConnected && <Button variant="outline" onClick={handleDisconnectSquare}>Disconnect Square</Button>}
        </div>
      </section>
    </div>
  );
}

function BrandingTab() {
  const { data: row, refetch } = useQuery({
    queryKey: ["admin-branding"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle();
      return (data?.value ?? {}) as any;
    },
  });
  const branding = row ?? {};
  const [insta, setInsta] = useState<string>(branding.instagram_url ?? "");

  async function save(patch: Record<string, any>) {
    const next = { ...branding, ...patch };
    const { error } = await supabase.from("site_settings").upsert({ key: "branding", value: next });
    if (error) toast.error(error.message); else { toast.success("Saved"); refetch(); }
  }

  async function uploadTo(kind: "logo_path" | "favicon_path", file: File) {
    const ext = file.name.split(".").pop() || "png";
    const path = `branding/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-photos").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    await save({ [kind]: path });
  }

  const logo = branding.logo_path ? productPhotoUrl(branding.logo_path) : null;
  const favicon = branding.favicon_path ? productPhotoUrl(branding.favicon_path) : null;

  return (
    <div className="py-6 space-y-6 max-w-2xl">
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-2xl mb-4">Site logo</h3>
        <div className="flex items-center gap-4">
          {logo && <img src={logo} alt="Logo" className="h-16 w-16 rounded-full object-cover border border-border" />}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadTo("logo_path", e.target.files[0])} />
          {logo && <Button size="sm" variant="outline" onClick={() => save({ logo_path: null })}>Remove</Button>}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-2xl mb-4">Favicon (browser tab icon)</h3>
        <div className="flex items-center gap-4">
          {favicon && <img src={favicon} alt="Favicon" className="h-10 w-10 rounded object-cover border border-border" />}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadTo("favicon_path", e.target.files[0])} />
          {favicon && <Button size="sm" variant="outline" onClick={() => save({ favicon_path: null })}>Remove</Button>}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-2xl mb-4">Instagram</h3>
        <div className="flex items-center gap-2">
          <input
            value={insta}
            onChange={(e) => setInsta(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={() => save({ instagram_url: insta.trim() })}>Save</Button>
        </div>
      </section>
    </div>
  );
}

function UsersTab() {
  const [query, setQuery] = useState("");
  const { data: rows, refetch, isLoading } = useQuery({
    queryKey: ["admin-users", query],
    queryFn: async () => {
      try {
        let queryBuilder = supabase
          .from("profiles")
          .select("id, email, full_name, birthdate")
          .order("email", { ascending: true });

        if (query && query.trim()) {
          const search = query.trim();
          queryBuilder = queryBuilder.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        }

        const { data: profiles, error: profileError } = await queryBuilder;
        if (profileError) throw profileError;
        const profileRows = profiles ?? [];
        const userIds = profileRows.map((row: any) => row.id).filter(Boolean);

        let roleRows: any[] = [];
        if (userIds.length > 0) {
          const { data: fetchedRoles, error: roleError } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);
          if (!roleError && Array.isArray(fetchedRoles)) {
            roleRows = fetchedRoles;
          }
        }

        let paymentRows: any[] = [];
        if (userIds.length > 0) {
          const paymentKeys = userIds.map((id) => `user_payment_${id}`);
          const { data: fetchedPayments, error: paymentError } = await supabase
            .from("site_settings")
            .select("key, value")
            .in("key", paymentKeys);
          if (!paymentError && Array.isArray(fetchedPayments)) {
            paymentRows = fetchedPayments;
          }
        }

        const roleMap: Record<string, any[]> = {};
        roleRows.forEach((role: any) => {
          if (!role.user_id) return;
          roleMap[role.user_id] = [...(roleMap[role.user_id] ?? []), role];
        });

        const paymentMap: Record<string, any> = {};
        paymentRows.forEach((row: any) => {
          const match = row.key?.toString().replace(/^user_payment_/, "");
          if (match) {
            paymentMap[match] = row.value;
          }
        });

        return profileRows.map((row: any) => ({
          ...row,
          email: row.email ?? "No email",
          user_roles: roleMap[row.id] ?? [],
          payment_settings: paymentMap[row.id] ?? null,
        }));
      } catch (err) {
        console.error("Error loading admin users:", err);
        return [];
      }
    },
  });

  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
      if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Updated");
    refetch();
  }

  const list = rows ?? [];
  const admins = list.filter((u: any) => {
    const hasAdminRole = (u.user_roles ?? []).some((r: any) => r.role === "admin");
    return isAdminEmail(u.email) || hasAdminRole;
  });
  const regularUsers = list.length - admins.length;

  return (
    <div className="py-6 space-y-4">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Users</p>
          <p className="text-2xl font-display mt-1">{list.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Admins</p>
          <p className="text-2xl font-display mt-1">{admins.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Regular Users</p>
          <p className="text-2xl font-display mt-1">{regularUsers}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground mb-3">Promote accounts to admin, or remove admin access.</p>
        <div className="flex items-center gap-2">
          <input placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 rounded-md border border-input px-3 py-2 text-sm" />
          <Button size="sm" onClick={() => refetch()}>Search</Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading users...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
      ) : (
        <div className="space-y-3">
          {list.map((u: any) => {
            const isAdmin = isAdminEmail(u.email) || (u.user_roles ?? []).some((r: any) => r.role === "admin");
            const paymentMethod = u.payment_settings?.payment_method ?? "in_person";
            const paymentLabel = u.payment_settings?.payment_label ?? "";
            const paymentSaved = !!u.payment_settings?.payment_last4;
            const paymentCardBrand = u.payment_settings?.payment_brand ?? "Card";
            const paymentLast4 = u.payment_settings?.payment_last4 ?? "";
            return (
              <div key={u.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{u.full_name || "(no name)"} {u.birthdate && <span className="text-sm text-muted-foreground">· Born {new Date(u.birthdate).toLocaleDateString()}</span>}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    <p className="text-sm text-muted-foreground mt-1">Payment: <strong>{paymentMethod === "online" ? `Online${paymentLabel ? ` (${paymentLabel})` : ""}` : "In person"}</strong>{paymentSaved ? ` · ${paymentCardBrand} ending ${paymentLast4}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground">Admin</span>}
                    <Button size="sm" variant={isAdmin ? "outline" : "default"} onClick={() => toggleAdmin(u.id, !isAdmin)}>
                      {isAdmin ? "Remove admin" : "Make admin"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function CommentsTab() {
  const { data: rows, refetch } = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("comments").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }
  async function reply(id: string, current: string) {
    const admin_reply = prompt("Your reply", current ?? "") ?? current;
    const { error } = await supabase.from("comments").update({ admin_reply }).eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }
  async function del(id: string) {
    if (!confirm("Delete comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) toast.error(error.message); else refetch();
  }

  return (
    <div className="py-6 space-y-3">
      {(rows ?? []).length === 0 && <p className="text-muted-foreground">No comments yet.</p>}
      {(rows ?? []).map((c: any) => (
        <div key={c.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {c.products?.name} · {c.author_name} · <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{c.status}</span>
              </p>
              <p className="mt-2 whitespace-pre-line">{c.body}</p>
              {c.admin_reply && <p className="mt-2 text-sm text-muted-foreground">Reply: {c.admin_reply}</p>}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "hidden")}>Hide</Button>
              <Button size="sm" variant="outline" onClick={() => reply(c.id, c.admin_reply)}>Reply</Button>
              <Button size="sm" variant="destructive" onClick={() => del(c.id)}>Delete</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

