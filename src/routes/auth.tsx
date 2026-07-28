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

  async function signInWithGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="container-editorial py-16 md:py-24 max-w-md">
      <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Create account"}</p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">{mode === "signin" ? "Sign in" : "Join us"}</h1>

      <Button
        type="button"
        variant="outline"
        onClick={signInWithGoogle}
        disabled={busy}
        className="mt-8 w-full"
      >
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.9c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.24-4.74 3.24-8.3z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.85 0-5.27-1.92-6.13-4.51H2.18v2.83A11 11 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.87 14.14A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.37-2.14V7.03H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.97l3.69-2.83z"/>
          <path fill="#EA4335" d="M12 5.38c1.61 0 3.06.55 4.21 1.64l3.15-3.15C17.45 2.11 14.97 1 12 1A11 11 0 0 0 2.18 7.03l3.69 2.83C6.73 7.3 9.15 5.38 12 5.38z"/>
        </svg>
        Continue with Google
      </Button>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
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
