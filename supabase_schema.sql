-- Supabase Schema Reference

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (synced with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shopping Lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- List Members table
CREATE TABLE IF NOT EXISTS list_members (
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (list_id, user_id)
);

-- List Items table
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1 NOT NULL,
  category TEXT DEFAULT 'Geral' NOT NULL,
  checked BOOLEAN DEFAULT false NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Shopping Lists
DROP POLICY IF EXISTS "Users can view lists they are members of or own" ON shopping_lists;
CREATE POLICY "Users can view lists they are members of or own" ON shopping_lists
  FOR SELECT USING (
    shopping_lists.owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = shopping_lists.id
      AND list_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert lists" ON shopping_lists;
CREATE POLICY "Users can insert lists" ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners and Admins can update lists" ON shopping_lists;
CREATE POLICY "Owners and Admins can update lists" ON shopping_lists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_members.list_id = shopping_lists.id
      AND list_members.user_id = auth.uid()
      AND list_members.role IN ('admin')
    )
    OR shopping_lists.owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can delete lists" ON shopping_lists;
CREATE POLICY "Owners can delete lists" ON shopping_lists
  FOR DELETE USING (shopping_lists.owner_id = auth.uid());

-- List Members
DROP POLICY IF EXISTS "Members can view other members" ON list_members;
CREATE POLICY "Members can view other members" ON list_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM list_members lm
    WHERE lm.list_id = list_members.list_id
    AND lm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "List owners can manage members" ON list_members;
CREATE POLICY "List owners can manage members" ON list_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM shopping_lists
    WHERE shopping_lists.id = list_members.list_id
    AND shopping_lists.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage members" ON list_members;
CREATE POLICY "Admins can manage members" ON list_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM list_members lm
    WHERE lm.list_id = list_members.list_id
    AND lm.user_id = auth.uid()
    AND lm.role = 'admin'
  )
);

-- Shopping List Items
DROP POLICY IF EXISTS "Members can view items" ON shopping_list_items;
CREATE POLICY "Members can view items" ON shopping_list_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM list_members
    WHERE list_members.list_id = shopping_list_items.list_id
    AND list_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Editors and Admins can manage items" ON shopping_list_items;
CREATE POLICY "Editors and Admins can manage items" ON shopping_list_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM list_members
    WHERE list_members.list_id = shopping_list_items.list_id
    AND list_members.user_id = auth.uid()
    AND list_members.role IN ('admin', 'editor')
  )
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  default_quantity NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Categories and Products
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own products" ON public.products
  FOR ALL USING (auth.uid() = user_id);

