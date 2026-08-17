import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatDate } from "@/lib/format";
import { fallbackImageFor } from "@/lib/product-assets";
import { productPhotoUrl, reviewPhotoUrl } from "@/lib/photo-url";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ProductComments } from "@/components/product-comments";

export const Route = createFileRoute("/shop/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Joyful Morning Blooms` },
      { name: "description", content: "Order this handcrafted floral arrangement online for pickup or delivery." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();

  const { data: product, isLoading, refetch } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_photos(id, storage_path, sort_order), product_sizes(id, name, price_delta_cents, sort_order)")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", slug],
    enabled: !!product,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", product!.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: canReview } = useQuery({
    queryKey: ["can-review", slug, user?.id],
    enabled: !!user && !!product,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user!.id)
        .eq("product_id", product!.id)
        .eq("status", "completed")
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
  });

  if (isLoading) return <div className="container-editorial py-24">Loading…</div>;
  if (!product) throw notFound();

  const photos = (product.product_photos ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const heroPhoto = photos[0]?.storage_path ? productPhotoUrl(photos[0].storage_path) : fallbackImageFor(product.slug);
  const extraPhotos = photos.slice(1);
  const avgRating = (reviews && reviews.length > 0)
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="container-editorial py-12 md:py-20">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16">
        <div>
          <img src={heroPhoto} alt={product.name} width={1200} height={1200} className="w-full aspect-square object-cover rounded-lg" />
          {extraPhotos.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {extraPhotos.map((p: any) => (
                <img key={p.id} src={productPhotoUrl(p.storage_path)} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-md" />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow">Arrangement</p>
          <h1 className="mt-3 font-display text-5xl">{product.name}</h1>
          <p className="mt-3 text-xl text-muted-foreground">from {formatMoney(product.base_price_cents)}</p>
          {avgRating !== null && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              {[1,2,3,4,5].map((i) => (
                <Star key={i} className={`h-4 w-4 ${i <= Math.round(avgRating) ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
              ))}
              <span className="ml-1 text-muted-foreground">({reviews?.length ?? 0})</span>
            </div>
          )}
          <p className="mt-6 text-lg leading-relaxed whitespace-pre-line">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/order/$slug" params={{ slug: product.slug }}>Order this arrangement</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-24 border-t border-border/60 pt-16">
        <h2 className="font-display text-4xl">Reviews</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {(reviews ?? []).length === 0 && (
            <p className="text-muted-foreground">No reviews yet.</p>
          )}
          {(reviews ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-6 bg-card">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
                ))}
              </div>
              {r.body && <p className="mt-3 leading-relaxed">{r.body}</p>}
              {r.photo_path && <img src={reviewPhotoUrl(r.photo_path)} alt="" loading="lazy" className="mt-3 rounded-md max-h-64" />}
              <p className="mt-3 text-xs text-muted-foreground">— {r.reviewer_name ?? "Customer"} · {formatDate(r.created_at)}</p>
              {r.admin_reply && (
                <div className="mt-4 pl-4 border-l-2 border-accent">
                  <p className="eyebrow text-[10px]">From the florist</p>
                  <p className="mt-1 text-sm">{r.admin_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {canReview && <LeaveReview productId={product.id} onSubmitted={() => refetch()} />}
        {!user && (
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/auth" className="underline">Sign in</Link> to leave a review after your order is completed.
          </p>
        )}
      </section>

      <ProductComments productId={product.id} />
    </div>
  );
}

function LeaveReview({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      product_id: productId,
      rating,
      body,
      reviewer_name: profile?.full_name || user.email?.split("@")[0] || "Customer",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks! Your review is pending approval.");
    setBody("");
    onSubmitted();
  }

  return (
    <div className="mt-12 rounded-lg border border-border p-6 bg-card">
      <h3 className="font-display text-2xl">Share your experience</h3>
      <div className="mt-3 flex items-center gap-1">
        {[1,2,3,4,5].map((i) => (
          <button key={i} onClick={() => setRating(i)} type="button" aria-label={`${i} stars`}>
            <Star className={`h-6 w-6 ${i <= rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
      <textarea
        className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24"
        placeholder="Tell us how the flowers were…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
      />
      <Button onClick={submit} disabled={submitting} className="mt-4">Submit review</Button>
    </div>
  );
}
