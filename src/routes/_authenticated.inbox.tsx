import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
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

function formatFriendlyDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function Inbox() {
  const { user, isAdmin } = useAuth();

  const { data: inbox } = useQuery({
    queryKey: ["inbox-feed", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const futureCutoff = new Date(now);
      futureCutoff.setDate(futureCutoff.getDate() + 21);

      const { data: orderRows } = await supabase
        .from("orders")
        .select("*")
        .order("needed_date", { ascending: true });

      const userIds = Array.from(new Set((orderRows ?? []).map((o: any) => o.user_id).filter(Boolean))) as string[];
      const { data: profileRows } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

      const upcomingOrders = (orderRows ?? [])
        .filter((o: any) => {
          if (!o.needed_date || o.status === "cancelled" || o.status === "completed" || o.status === "rejected") return false;
          const d = new Date(o.needed_date);
          return !Number.isNaN(d.getTime()) && d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= futureCutoff;
        })
        .map((o: any) => ({
          ...o,
          customerName: profileMap.get(o.user_id)?.full_name || o.contact_name || "Customer",
          customerEmail: profileMap.get(o.user_id)?.email || o.contact_email || "",
          productName: o.product_name || "Flower order",
        }))
        .sort((a: any, b: any) => new Date(a.needed_date).getTime() - new Date(b.needed_date).getTime());

      const { data: commentRows } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: reviewRows } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      const comments = (commentRows ?? []).filter((c: any) => !c.status || c.status === "pending" || c.status === "approved");
      const reviews = (reviewRows ?? []).filter((r: any) => !r.status || r.status === "pending" || r.status === "approved");

      return {
        upcomingOrders,
        comments,
        reviews,
      };
    },
  });

  const upcomingOrders = inbox?.upcomingOrders ?? [];
  const comments = inbox?.comments ?? [];
  const reviews = inbox?.reviews ?? [];

  const deliveryMessages = upcomingOrders.map((order: any) => ({
    id: `order-${order.id}`,
    label: "Delivery",
    title: `${order.customerName} has a delivery on ${formatFriendlyDate(order.needed_date)}`,
    summary: `${order.productName}${order.notes ? ` — ${order.notes}` : ""}`,
    meta: `${order.fulfillment || "Delivery"}${order.needed_time ? ` at ${order.needed_time}` : ""}`,
  }));

  const commentMessages = [...comments, ...reviews].map((entry: any) => ({
    id: `message-${entry.id}`,
    label: entry.body ? "Customer note" : "Review",
    title: entry.author_name || entry.customer_name || "Customer",
    summary: entry.body || entry.comment || "No details saved",
    meta: entry.status ? `${entry.status} · ${formatFriendlyDate(entry.created_at)}` : formatFriendlyDate(entry.created_at),
  }));

  const allItems = [...deliveryMessages, ...commentMessages];

  return (
    <div className="container-editorial py-16 md:py-24">
      <p className="eyebrow">{isAdmin ? "Operations" : "Updates"}</p>
      <h1 className="mt-3 font-display text-5xl">Inbox</h1>
      <p className="mt-2 text-muted-foreground max-w-2xl">
        {isAdmin
          ? "Keep track of upcoming deliveries, delivery notes, and customer feedback before the week gets busy."
          : "See your upcoming delivery reminders and customer notes related to your orders."}
      </p>

      <Tabs defaultValue="all" className="mt-8">
        <TabsList>
          <TabsTrigger value="all">All {allItems.length > 0 && `(${allItems.length})`}</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries {deliveryMessages.length > 0 && `(${deliveryMessages.length})`}</TabsTrigger>
          <TabsTrigger value="notes">Notes {commentMessages.length > 0 && `(${commentMessages.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {allItems.length === 0 && <p className="text-muted-foreground py-8">No inbox items right now.</p>}
          {allItems.map((item: any) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                  <h2 className="mt-1 font-display text-2xl">{item.title}</h2>
                </div>
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium">{item.meta}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6">{item.summary}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="deliveries" className="mt-6 space-y-4">
          {deliveryMessages.length === 0 && <p className="text-muted-foreground py-8">No upcoming deliveries in the next 3 weeks.</p>}
          {deliveryMessages.map((item: any) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Delivery reminder</p>
              <h2 className="mt-1 font-display text-2xl">{item.title}</h2>
              <p className="mt-3 text-sm whitespace-pre-line">{item.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.meta}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="notes" className="mt-6 space-y-4">
          {commentMessages.length === 0 && <p className="text-muted-foreground py-8">No customer notes or reviews right now.</p>}
          {commentMessages.map((item: any) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                <span className="text-xs text-muted-foreground">{item.meta}</span>
              </div>
              <h2 className="mt-2 font-display text-xl">{item.title}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6">{item.summary}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
