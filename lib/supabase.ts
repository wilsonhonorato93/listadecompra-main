import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: typeof fetch !== 'undefined' ? (...args) => fetch(...args) : undefined,
  },
});

export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  created_at: string;
};

export type ShoppingList = {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type ListMember = {
  list_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
};

export type ListItem = {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  category: string;
  checked: boolean;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
};
