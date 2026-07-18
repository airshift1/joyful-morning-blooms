import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export function ProductComments({ productId }: { productId: string }) {
  const { user, profile } = useAuth();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: comments, refetch } = useQuery({
    queryKey: ["comments", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit() {
    if (!user || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("comments").insert({
      product_id: productId,
      user_id: user.id,
      author_name: profile?.full_name || user.email?.split("@")[0] || "Customer",
      body: body.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Comment posted");
    setBody("");
    refetch();
  }

  return (
    <section className="mt-24 border-t border-border/60 pt-16">
      <h2 className="font-display text-4xl">Questions & comments</h2>
      <p className="mt-2 text-muted-foreground">Ask about colors, availability, or leave a note.</p>

      {user ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24"
            placeholder="Write a comment or question…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1500}
          />
          <Button className="mt-3" onClick={submit} disabled={busy || !body.trim()}>
            {busy ? "Posting…" : "Post comment"}
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link to="/auth" className="underline">Sign in</Link> to leave a comment.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {(comments ?? []).length === 0 && (
          <p className="text-muted-foreground">No comments yet — be the first.</p>
        )}
        {(comments ?? []).map((c: any) => (
          <div key={c.id} className="rounded-lg border border-border p-5 bg-card">
            <p className="text-xs text-muted-foreground">{c.author_name} · {formatDate(c.created_at)}</p>
            <p className="mt-2 leading-relaxed whitespace-pre-line">{c.body}</p>
            {c.admin_reply && (
              <div className="mt-4 pl-4 border-l-2 border-accent">
                <p className="eyebrow text-[10px]">From the florist</p>
                <p className="mt-1 text-sm whitespace-pre-line">{c.admin_reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
