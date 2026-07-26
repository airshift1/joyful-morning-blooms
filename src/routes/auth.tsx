import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Joyful Morning Blooms" },
      { name: "description", content: "Sign in or create your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const search = useSearch({ from: "/auth" });

  useEffect(() => {
    if (!loading && user) {
      const dest = search.redirect && /^\//.test(search.redirect) ? search.redirect : "/account";
      navigate({ to: dest as any });
    }
  }, [user, loading, navigate, search.redirect]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Welcome! Account created.");
        } else {
          // sign in immediately (auto-confirm is on so this works even if signUp didn't return a session)
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            toast.success("Account created! Check your email to confirm, then sign in.");
          } else {
            toast.success("Welcome!");
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-editorial py-16 md:py-24 max-w-md">
      <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Create account"}</p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">{mode === "signin" ? "Sign in" : "Join us"}</h1>

      <div className="rounded-lg border border-border bg-card p-4 mt-8 text-sm text-muted-foreground">
        Use email and password to sign in. Google sign-in is disabled for now.
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>

            <label className="block text-sm mb-1.5">Full name</label>
            <input required maxLength={100} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div>
          <label className="block text-sm mb-1.5">Email</label>
          <input required type="email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Password</label>
          <input required type="password" minLength={6} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>

      <p className="mt-8 text-xs text-muted-foreground">
        By continuing you agree to our <Link to="/" className="underline">terms</Link>.
      </p>
    </div>
  );
}
