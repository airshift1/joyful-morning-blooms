import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = { full_name: string | null; phone: string | null } | null;

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadExtras(userId: string) {
    const [{ data: role }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("full_name, phone").eq("id", userId).maybeSingle(),
    ]);
    setIsAdmin(!!role);
    setProfile((prof as Profile) ?? null);
  }

  useEffect(() => {
    const STORAGE_KEY = "sb_session_v2";

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      try {
        if (typeof window !== 'undefined') {
          if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); else localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        // ignore storage errors
      }
      if (s?.user) setTimeout(() => loadExtras(s.user.id), 0);
      else { setIsAdmin(false); setProfile(null); }
    });

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          if (data.session.user) await loadExtras(data.session.user.id);
        } else if (typeof window !== 'undefined') {
          // Try to rehydrate from localStorage if session is missing
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              const access = parsed?.access_token ?? parsed?.accessToken ?? parsed?.access_token;
              const refresh = parsed?.refresh_token ?? parsed?.refreshToken ?? parsed?.refresh_token;
              if (access && refresh) {
                await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
                const { data: newData } = await supabase.auth.getSession();
                setSession(newData.session);
                if (newData.session?.user) await loadExtras(newData.session.user.id);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
