import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

type Profile = { full_name: string | null; phone: string | null; email?: string | null; birthdate?: string | null } | null;

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile;
  isAdmin: boolean;
  loading: boolean;
  refreshAuthState: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refreshAuthState: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function ensureProfile(user: User) {
    try {
      const profilePatch: Record<string, any> = { id: user.id };
      if (user.email) profilePatch.email = user.email;
      if (user.user_metadata?.full_name) profilePatch.full_name = user.user_metadata.full_name;
      const { error } = await supabase.from("profiles").upsert(profilePatch, { onConflict: ["id"] });
      if (error) console.warn("Profile upsert failed:", error.message);
    } catch (error) {
      console.warn("Profile ensure failed:", error);
    }
  }

  async function loadExtras(userId: string, email?: string | null) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, birthdate")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const profileData: Profile = {
        full_name: data?.full_name ?? null,
        phone: data?.phone ?? null,
        email: data?.email ?? email ?? null,
        birthdate: data?.birthdate ?? null,
      };
      setProfile(profileData);

      const hasAdminRole = !roleError && Array.isArray(roleRows) && roleRows.some((role: any) => {
        const value = String(role?.role ?? "").toLowerCase();
        return ["admin", "owner", "staff"].includes(value);
      });
      setIsAdmin(isAdminEmail(email) || hasAdminRole);
    } catch (err) {
      console.warn("Load auth extras failed:", err);
      setIsAdmin(isAdminEmail(email));
    }
  }

  async function refreshAuthState() {
    const currentUser = session?.user ?? null;
    if (!currentUser) {
      setIsAdmin(false);
      setProfile(null);
      return;
    }

    await ensureProfile(currentUser);
    await loadExtras(currentUser.id, currentUser.email);
  }

  useEffect(() => {
    const SESSION_KEY = "sb_session_v2";
    const USER_ID_KEY = "sb_user_id";

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (typeof window !== 'undefined') {
        try {
          if (s?.user) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(s));
            localStorage.setItem(USER_ID_KEY, s.user.id);
          } else {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(USER_ID_KEY);
          }
        } catch (e) {
          // ignore storage errors
        }
      }
      if (s?.user) {
        setTimeout(() => {
          ensureProfile(s.user);
          loadExtras(s.user.id, s.user.email);
        }, 0);
      } else { setIsAdmin(false); setProfile(null); }
    });

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          if (data.session.user) {
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(USER_ID_KEY, data.session.user.id);
              } catch (e) { }
            }
            await ensureProfile(data.session.user);
            await loadExtras(data.session.user.id, data.session.user.email);
          }
        } else if (typeof window !== 'undefined') {
          // Try to rehydrate from localStorage if session is missing
          const stored = localStorage.getItem(SESSION_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              const access = parsed?.access_token ?? parsed?.accessToken;
              const refresh = parsed?.refresh_token ?? parsed?.refreshToken;
              if (access && refresh) {
                await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
                const { data: newData } = await supabase.auth.getSession();
                if (newData.session) {
                  setSession(newData.session);
                  try {
                    localStorage.setItem(USER_ID_KEY, newData.session.user.id);
                  } catch (e) { }
                  if (newData.session.user) {
                    await ensureProfile(newData.session.user);
                    await loadExtras(newData.session.user.id, newData.session.user.email);
                  }
                }
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
    refreshAuthState,
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
