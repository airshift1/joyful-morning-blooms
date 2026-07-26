import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/edit")({
  head: () => ({ meta: [{ title: "Edit profile — Joyful Morning Blooms" }, { name: "robots", content: "noindex" }] }),
  component: EditProfile,
});

function EditProfile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    // fetch birthdate directly from profiles in case types aren't present
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("birthdate").eq("id", user.id).maybeSingle();
      setBirthdate(data?.birthdate ?? null);
    })();
  }, [user, profile]);

  if (loading) return <div className="container-editorial py-24">Loading…</div>;
  if (!user) return (
    <div className="container-editorial py-24 max-w-md">
      <h1 className="font-display text-3xl">Not signed in</h1>
      <p className="mt-3 text-muted-foreground">Sign in to edit your profile.</p>
      <div className="mt-6"><Button asChild><Link to="/auth">Sign in</Link></Button></div>
    </div>
  );

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, phone, birthdate }, { onConflict: ["id"] });
      if (error) throw error;
      toast.success("Profile updated");
      navigate({ to: "/account" } as any);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-editorial py-10 max-w-2xl">
      <h1 className="font-display text-3xl mb-4">Edit profile</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1.5">Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Birthdate</label>
          <input type="date" value={birthdate ?? ""} onChange={(e) => setBirthdate(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Optional — used for birthday notes and gift suggestions.</p>
        </div>
       <div className="flex gap-2 mt-4">
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          <Button variant="outline" onClick={() => navigate({ to: "/account" } as any)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
