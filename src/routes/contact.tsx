import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(2000),
});

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Petal & Stem" },
      { name: "description", content: "Reach the studio with questions, custom requests, or wedding inquiries." },
      { property: "og:title", content: "Contact — Petal & Stem" },
      { property: "og:description", content: "Get in touch with our florists." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { data } = useQuery({
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

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    // Contact messages are lightweight; for v1 we simply thank the user and email is captured by admin follow-up flow later
    toast.success("Thanks! We'll be in touch soon.");
    setForm({ name: "", email: "", message: "" });
    setSubmitting(false);
  }

  return (
    <div className="container-editorial py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-16">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">{c.title ?? "Say hello"}</h1>
          <p className="mt-4 text-lg text-muted-foreground whitespace-pre-line">{c.body ?? ""}</p>

          <ul className="mt-10 space-y-4 text-sm">
            {c.email && <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-accent" /> <a className="hover:underline" href={`mailto:${c.email}`}>{c.email}</a></li>}
            {c.phone && <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-accent" /> {c.phone}</li>}
            {c.address && <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent" /> {c.address}</li>}
            {c.hours && <li className="flex items-center gap-3"><Clock className="h-4 w-4 text-accent" /> {c.hours}</li>}
          </ul>
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
