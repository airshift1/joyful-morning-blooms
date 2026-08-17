import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { fallbackImageFor } from "@/lib/product-assets";
import { productPhotoUrl } from "@/lib/photo-url";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop florals — Joyful Morning Blooms" },
      { name: "description", content: "Browse our full collection of hand-tied bouquets, wedding florals, and custom arrangements." },
      { property: "og:title", content: "Shop florals — Joyful Morning Blooms" },
      { property: "og:description", content: "Browse hand-tied bouquets and custom arrangements." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { vase } = useSiteSettings();
  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, slug, name, description, base_price_cents, product_photos(storage_path, sort_order), product_sizes(name, price_delta_cents, sort_order)")
        .eq("is_visible", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  return (
    <div className="container-editorial py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-3 font-display text-5xl md:text-6xl">Every stem, hand-picked</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Seasonal arrangements designed and tied in our studio. Available for pickup or local delivery.
        </p>
        {vase.enabled && (
          <p className="mt-3 text-sm text-foreground/70">
            Add a vase to any order for <span className="font-medium">+{formatMoney(vase.price_cents)}</span>.
          </p>
        )}
      </div>

      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {isLoading && [1,2,3,4,5,6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-lg bg-secondary/60" />
            <div className="mt-4 h-5 w-2/3 bg-secondary/60 rounded" />
            <div className="mt-2 h-4 w-1/3 bg-secondary/60 rounded" />
          </div>
        ))}
        {(products ?? []).map((p: any) => {
          const photo = p.product_photos?.[0]?.storage_path
            ? productPhotoUrl(p.product_photos[0].storage_path)
            : fallbackImageFor(p.slug);
          const sizes = (p.product_sizes ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
          const prices = sizes.map((s: any) => p.base_price_cents + (s.price_delta_cents ?? 0));
          const min = prices.length ? Math.min(...prices) : p.base_price_cents;
          const max = prices.length ? Math.max(...prices) : p.base_price_cents;
          const priceLabel = min === max ? formatMoney(min) : `${formatMoney(min)}–${formatMoney(max)}`;
          return (
            <div key={p.id} className="group flex flex-col">
              <Link to="/shop/$slug" params={{ slug: p.slug }} className="block">
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
                  <span className="text-sm font-medium">{priceLabel}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                {sizes.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {sizes.map((s: any) => (
                      <li key={s.name} className="flex justify-between">
                        <span>{s.name}</span>
                        <span>{formatMoney(p.base_price_cents + (s.price_delta_cents ?? 0))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
              <div className="mt-4">
                <Button asChild size="sm" className="w-full">
                  <Link to="/order/$slug" params={{ slug: p.slug }}>Order this</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
