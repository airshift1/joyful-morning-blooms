import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Joyful Morning Blooms" },
      { name: "description", content: "The story behind our small florist studio and the way we design." },
      { property: "og:title", content: "About — Joyful Morning Blooms" },
      { property: "og:description", content: "A small studio designing seasonal florals." },
    ],
  }),
  component: About,
});

function About() {
  const { isAdmin } = useAuth();
  const { data, refetch } = useQuery({
    queryKey: ["site_content", "about"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "about").maybeSingle();
      return (data?.value ?? {}) as Record<string, string>;
    },
  });
  const c = data ?? {};

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(c.title ?? "Our story");
    setBody(c.body ?? "");
  }, [data]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "about", value: { ...c, title, body } });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(false);
    refetch();
  }

  return (
    <div className="container-editorial py-16 md:py-28 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">Our story</p>
        {isAdmin && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-3 font-display text-3xl"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full min-h-64 rounded-md border border-input bg-background px-4 py-3 text-base leading-relaxed"
            placeholder="Tell your story…"
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">{c.title ?? "Our story"}</h1>
          <div className="mt-8 prose prose-lg text-lg leading-relaxed text-foreground/90 whitespace-pre-line">
            {c.body ?? ""}
          </div>
        </>
      )}
    </div>
  );
}
