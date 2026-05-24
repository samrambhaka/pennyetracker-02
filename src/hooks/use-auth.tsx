import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "super_admin" | "admin" | "delivery";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (error) {
      console.error("Failed to load roles", error);
      setRoles([]);
      return;
    }
    setRoles((data ?? []).map((r) => r.role as Role));
  };

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => {
          if (!mounted) return;
          loadRoles(s.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
        }, 0);
      } else {
        setRoles([]);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id).finally(() => mounted && setLoading(false));
      else setLoading(false);
    }).catch((error) => {
      console.error("Failed to restore auth session", error);
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    roles,
    loading,
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isSuperAdmin: roles.includes("super_admin"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles: async () => {
      if (session?.user) await loadRoles(session.user.id);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
