import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { fallbackImageFor } from "@/lib/product-assets";
import { productPhotoUrl } from "@/lib/photo-url";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-bouquet.jpg";
import storyImg from "@/assets/story-image.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Joyful Morning Blooms — Handcrafted florals for life's moments" },
      { name: "description", content: "Seasonal, hand-tied bouquets and custom arrangements. Order online" },
      { property: "og:title", content: "Joyful Morning Blooms — Handcrafted florals for life's moments" },
      { property: "og:description", content: "Seasonal, hand-tied bouquets and custom arrangements. Order online" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: content } = useQuery({
    queryKey: ["site_content", "home"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "home").maybeSingle();
      return (data?.value ?? {}) as Record<string, string>;
    },
  });
  const { data: featured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, slug, name, description, base_price_cents, product_photos(storage_path, sort_order)")
        .eq("is_visible", true)
        .eq("is_featured", true)
        .order("sort_order")
        .limit(3);
      return data ?? [];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["home-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const m: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
      return m;
    },
  });
  const { data: subContent } = useQuery({
    queryKey: ["site_content", "subscription"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "subscription").maybeSingle();
      return (data?.value ?? {}) as Record<string, string>;
    },
  });
  const features = (settings?.features ?? {}) as Record<string, boolean>;
  const subscriptionOn = features.monthly_subscription === true;

  const c = content ?? {};

  return (
    <div>
      {/* Hero */}
      <section className="container-editorial pt-10 md:pt-20 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <p className="eyebrow">{c.hero_eyebrow ?? "Handcrafted florals"}</p>
            <h1 className="mt-4 font-display text-5xl md:text-7xl leading-[1.05] tracking-tight">
              {c.hero_title ?? "Bouquets made to move you"}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              {c.hero_subtitle ?? "Every arrangement is designed and hand-tied in our studio using the freshest seasonal stems."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/shop">
                  {c.hero_cta ?? "Shop the collection"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/about">Our story</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-secondary/50 rotate-1" />
            <img
              src={heroImg}
              alt="Blush pink garden roses in a hand-tied bouquet"
              width={1600}
              height={1200}
              className="w-full aspect-[4/5] object-cover rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container-editorial py-16 md:py-24 border-t border-border/60">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="eyebrow">This week</p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl">Featured arrangements</h2>
          </div>
          <Link to="/shop" className="text-sm text-foreground/70 hover:text-foreground inline-flex items-center gap-1.5">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {(featured ?? []).map((p: any) => {
            const photo = p.product_photos?.[0]?.storage_path
              ? productPhotoUrl(p.product_photos[0].storage_path)
              : fallbackImageFor(p.slug);
            return (
              <Link key={p.id} to="/shop/$slug" params={{ slug: p.slug }} className="group">
                <div className="overflow-hidden rounded-lg bg-secondary/40">
                  <img
                    src={photo}
                    alt={p.name}
                    loading="lazy"
                    width={1200}
                    height={1200}
                    className="w-full aspect-square object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl">{p.name}</h3>
                  <span className="text-sm text-muted-foreground">from {formatMoney(p.base_price_cents)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Story */}
      <section className="container-editorial py-16 md:py-24 border-t border-border/60">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <img
            src={storyImg}
            alt="A florist tying a bouquet"
            loading="lazy"
            width={1200}
            height={1200}
            className="w-full aspect-square object-cover rounded-lg"
          />
          <div>
            <p className="eyebrow">Our studio</p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl">{c.story_title ?? "A small studio, big on details"}</h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              {c.story_body ?? "We source from local growers and design each piece as if it were for our own table."}
            </p>
            <div className="mt-8">
              <Button asChild variant="outline"><Link to="/about">More about us</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {subscriptionOn && (
        <section className="container-editorial py-16 md:py-24 border-t border-border/60">
          <div className="rounded-2xl bg-secondary/40 p-10 md:p-16 text-center">
            <p className="eyebrow">Monthly ritual</p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl">{subContent?.title ?? "Monthly flower subscription"}</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              {subContent?.body ?? "A fresh, seasonal bouquet every month."}
            </p>
            {subContent?.price && <p className="mt-4 font-display text-2xl">{subContent.price}</p>}
            <div className="mt-8">
              <Button asChild size="lg"><Link to="/contact">{subContent?.cta ?? "Subscribe"}</Link></Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
