import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [{ title: "My account — Joyful Morning Blooms" }, { name: "robots", content: "noindex" }],
  }),
  component: Account,
});

function Account() {
  const { user, profile } = useAuth();

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

  return (
    <div className="container-editorial py-16 md:py-24">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-3 font-display text-5xl">Hello{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>

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

      <section className="mt-16">
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
      </section>
    </div>
  );
}
