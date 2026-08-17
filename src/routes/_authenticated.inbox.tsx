import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney, formatDate } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Joyful Morning Blooms" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Inbox,
});

function Inbox() {
  const { user } = useAuth();

  const { data: orders } = useQuery({
    queryKey: ["inbox-orders", user?.id],
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

  const { data: comments } = useQuery({
    queryKey: ["inbox-comments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, products(name, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const newOrders = (orders ?? []).filter((o: any) => o.status === "new");
  const newComments = (comments ?? []).filter((c: any) => c.status === "pending");

  return (
    <div className="container-editorial py-16 md:py-24">
      <p className="eyebrow">Your activity</p>
      <h1 className="mt-3 font-display text-5xl">Inbox</h1>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList>
          <TabsTrigger value="orders">Orders {newOrders.length > 0 && `(${newOrders.length})`}</TabsTrigger>
          <TabsTrigger value="comments">Comments {newComments.length > 0 && `(${newComments.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 mt-6">
          {(orders ?? []).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No orders yet. <Link to="/shop" className="underline">Browse the shop</Link>.
            </div>
          )}
          {(orders ?? []).map((o: any) => (
            <div key={o.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex flex-wrap items-center gap-6 justify-between">
                <div className="flex-1">
                  <p className="font-display text-2xl">{o.products?.name ?? "Custom order"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(o.created_at)} · {o.quantity} × {o.size_name ?? "standard"}
                  </p>
                  <p className="text-sm mt-2">
                    Fulfillment: <strong>{o.fulfillment}</strong> on <strong>{o.needed_date}</strong>
                    {o.needed_time && ` at ${o.needed_time}`}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary">{o.status}</span>
                    <span className="text-sm font-semibold">{formatMoney(o.subtotal_cents)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4 mt-6">
          {(comments ?? []).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No comments or reviews yet. <Link to="/shop" className="underline">Leave a review</Link>.
            </div>
          )}
          {(comments ?? []).map((c: any) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-display text-lg">{c.products?.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm">{"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-secondary">{c.status}</span>
                  </div>
                  {c.body && <p className="mt-3 text-sm">{c.body}</p>}
                  {c.admin_reply && (
                    <div className="mt-3 p-3 rounded-md bg-secondary/40 border border-border/40">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">From the florist:</p>
                      <p className="text-sm">{c.admin_reply}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(c.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
