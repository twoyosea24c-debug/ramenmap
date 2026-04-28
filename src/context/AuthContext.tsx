import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

type ProfileRoleRow = {
  role: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadRole(session: Session | null): Promise<string | null> {
  if (!supabase || !session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle<ProfileRoleRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.role ?? null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    const client = supabase;

    if (!isSupabaseConfigured || !client) {
      setIsLoading(false);
      setSession(null);
      setRole(null);
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      setIsLoading(true);
      const { data, error } = await client.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
        setRole(null);
        setIsLoading(false);
        return;
      }

      const nextSession = data.session;
      setSession(nextSession);

      try {
        const nextRole = await loadRole(nextSession);
        if (isMounted) {
          setRole(nextRole);
        }
      } catch {
        if (isMounted) {
          setRole(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initialize();

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(true);
      void loadRole(nextSession)
        .then((nextRole) => {
          if (isMounted) {
            setRole(nextRole);
          }
        })
        .catch(() => {
          if (isMounted) {
            setRole(null);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isLoggedIn: Boolean(session),
      role,
      isAdmin: role === 'admin',
      login: async (email: string, password: string) => {
        if (!supabase) {
          throw new Error('Supabase が未設定です。');
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw new Error(error.message);
        }
      },
      logout: async () => {
        if (!supabase) {
          return;
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          throw new Error(error.message);
        }
      },
    }),
    [isLoading, role, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
