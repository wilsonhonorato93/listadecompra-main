import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user, loading: false, initialized: true }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
  initialize: () => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, loading: false, initialized: true });
    }).catch(err => {
      console.error("Supabase auth error:", err);
      set({ user: null, loading: false, initialized: true });
    });

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, loading: false, initialized: true });
      });
      return () => subscription.unsubscribe();
    } catch(err) {
      console.error("Supabase onAuthStateChange error:", err);
      return () => {};
    }
  }
}));
