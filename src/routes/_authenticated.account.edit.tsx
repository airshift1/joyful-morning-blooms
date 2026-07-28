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

function maskPaymentValue(value: string) {
  if (!value) return "";
  return value.length <= 4 ? "••••" : `•••• ${value.slice(-4)}`;
}

function EditProfile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "in_person">("in_person");
  const [paymentLabel, setPaymentLabel] = useState("");
  const [paymentToken, setPaymentToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    // fetch birthdate and payment settings directly from profiles and site_settings
    (async () => {
      if (!user) return;
      const { data: profileData } = await supabase.from("profiles").select("birthdate").eq("id", user.id).maybeSingle();
      setBirthdate(profileData?.birthdate ?? null);

      const { data: paymentData } = await supabase.from("site_settings").select("value").eq("key", `user_payment_${user.id}`).maybeSingle();
      const paymentSettings = paymentData?.value as Record<string, any> | null;
      if (paymentSettings) {
        setPaymentMethod(paymentSettings.payment_method === "online" ? "online" : "in_person");
        setPaymentLabel(paymentSettings.payment_label ?? "");
        setSavedToken(paymentSettings.payment_token ?? "");
      }
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
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, phone, birthdate }, { onConflict: ["id"] });
      if (profileError) throw profileError;

      const paymentValue: Record<string, any> = {
        payment_method: paymentMethod,
        payment_label: paymentLabel,
      };
      if (paymentToken) {
        paymentValue.payment_token = paymentToken;
      } else if (savedToken) {
        paymentValue.payment_token = savedToken;
      }

      const { error: paymentError } = await supabase.from("site_settings").upsert({ key: `user_payment_${user.id}`, value: paymentValue }, { onConflict: ["key"] });
      if (paymentError) throw paymentError;

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
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-2xl mb-4">Payment settings</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Preferred payment</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "online" | "in_person")}
                className="w-full rounded-md border border-input px-3 py-2 text-sm">
                <option value="in_person">Pay in person</option>
                <option value="online">Pay online</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5">Payment label</label>
              <input value={paymentLabel} onChange={(e) => setPaymentLabel(e.target.value)} placeholder="My card or account name"
                className="w-full rounded-md border border-input px-3 py-2 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">This is a friendly name for saved online payment information.</p>
            </div>
          </div>
          {paymentMethod === "online" && (
            <div className="mt-4">
              <label className="block text-sm mb-1.5">Payment keychain secret</label>
              <div className="flex gap-2 items-center">
                <input
                  value={paymentToken}
                  type={showToken ? "text" : "password"}
                  placeholder={savedToken ? "Leave blank to keep existing secret" : "Enter a payment secret"}
                  onChange={(e) => setPaymentToken(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => setShowToken((prev) => !prev)}>
                  {showToken ? "Hide" : "Show"}
                </Button>
              </div>
              {savedToken ? (
                <p className="text-xs text-muted-foreground mt-2">Saved secret: {maskPaymentValue(savedToken)}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Your secret is stored securely and shown masked.</p>
              )}
            </div>
          )}
        </section>
        <div className="flex gap-2 mt-4">
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          <Button variant="outline" onClick={() => navigate({ to: "/account" } as any)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
