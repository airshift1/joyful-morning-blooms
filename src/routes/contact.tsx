import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, Pencil, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(2000),
});

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Joyful Morning Blooms" },
      { name: "description", content: "Reach us with questions, custom requests, or wedding inquiries." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { isAdmin } = useAuth();
  const { data, refetch } = useQuery({
    queryKey: ["site_content", "contact"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "contact").maybeSingle();
      return (data?.value ?? {}) as Record<string, string>;
    },
  });
  const { data: features } = useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "features").maybeSingle();
      return (data?.value ?? {}) as Record<string, boolean>;
    },
  });
  const c = data ?? {};
  const contactFormEnabled = features?.contact_form !== false;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(c.title ?? "Say hello");
    setBody(c.body ?? "");
    setEmail(c.email ?? "");
    setPhone(c.phone ?? "");
  }, [data]);

  async function saveInfo() {
    setSaving(true);
    const { error } = await supabase.from("site_content").upsert({ key: "contact", value: { ...c, title, body, email, phone } });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setEditing(false); refetch();
  }

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please check the form"); return; }
    setSubmitting(true);

    const { error } = await supabase.from("inbox").insert({
      kind: "contact",
      name: form.name,
      email: form.email,
      message: form.message,
      status: "new",
    });

    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks! We'll be in touch soon.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="container-editorial py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-16">
        <div>
          <div className="flex items-start justify-between gap-4">
            <p className="eyebrow">Get in touch</p>
            {isAdmin && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="mt-4 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-md border border-input bg-background px-3 py-2 font-display text-2xl" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Intro text" className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <Button onClick={saveInfo} disabled={saving}><Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save"}</Button>
                <Button variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1.5" /> Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mt-3 font-display text-5xl md:text-6xl">{c.title ?? "Say hello"}</h1>
              <p className="mt-4 text-lg text-muted-foreground whitespace-pre-line">{c.body ?? ""}</p>
              <ul className="mt-10 space-y-4 text-sm">
                {c.email && <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-accent" /> <a className="hover:underline" href={`mailto:${c.email}`}>{c.email}</a></li>}
                {c.phone && <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-accent" /> {c.phone}</li>}
              </ul>
            </>
          )}
        </div>

        {contactFormEnabled && (
          <form onSubmit={submit} className="rounded-lg border border-border bg-card p-8 space-y-4 h-fit">
            <h2 className="font-display text-3xl">Send a note</h2>
            <div>
              <label className="block text-sm mb-1.5">Your name</label>
              <input required maxLength={100} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Email</label>
              <input required type="email" maxLength={200} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Message</label>
              <textarea required maxLength={2000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-32"
                value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">Send message</Button>
          </form>
        )}
      </div>
    </div>
  );
}
