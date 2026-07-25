import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/edit-home")({
  head: () => ({
    meta: [{ title: "Edit Home — Joyful Morning Blooms" }, { name: "robots", content: "noindex" }],
  }),
  component: EditHome,
});

function EditHome() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const ownerEmail = import.meta.env.VITE_OWNER_EMAIL || "";
  const allowed = !!user && (isAdmin || (user.email && user.email === ownerEmail));

  const { data: content, refetch } = useQuery({
    queryKey: ["site_content", "home"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "home").maybeSingle();
      return (data?.value ?? {}) as Record<string, any>;
    },
    enabled: allowed,
  });

  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroCta, setHeroCta] = useState("");
  const [heroEyebrow, setHeroEyebrow] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (content) {
      setHeroTitle(content.hero_title ?? "");
      setHeroSubtitle(content.hero_subtitle ?? "");
      setHeroCta(content.hero_cta ?? "");
      setHeroEyebrow(content.hero_eyebrow ?? "");
    }
  }, [content]);

  if (loading) return <div className="container-editorial py-24">Loading…</div>;
  if (!allowed) return (
    <div className="container-editorial py-24 max-w-md">
      <h1 className="font-display text-3xl">Not authorized</h1>
      <p className="mt-3 text-muted-foreground">You must be the site owner to edit the home page.</p>
      <div className="mt-6"><Button asChild><Link to="/auth">Sign in</Link></Button></div>
    </div>
  );

  async function save() {
    setSaving(true);
    try {
      const value = {
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        hero_cta: heroCta,
        hero_eyebrow: heroEyebrow,
      };
      const { error } = await supabase.from("site_content").upsert({ key: "home", value }, { onConflict: ["key"] });
      if (error) throw error;
      toast.success("Home page updated");
      refetch();
      navigate({ to: "/" } as any);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-editorial py-10 max-w-2xl">
      <h1 className="font-display text-3xl mb-4">Edit home page</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1.5">Hero eyebrow</label>
          <input value={heroEyebrow} onChange={(e) => setHeroEyebrow(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Hero title</label>
          <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Hero subtitle</label>
          <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm min-h-24" />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Hero CTA</label>
          <input value={heroCta} onChange={(e) => setHeroCta(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          <Button variant="outline" onClick={() => navigate({ to: "/" } as any)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
