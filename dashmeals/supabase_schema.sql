-- REINITIALISATION COMPLETE DES PERMISSIONS
-- Copiez tout ceci et exécutez-le dans Supabase > SQL Editor

-- 1. Accorder l'usage du schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Accorder les droits sur toutes les tables existantes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. S'assurer que les futures tables auront aussi les droits
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- 4. Création des tables (si elles n'existent pas)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  role text check (role in ('client', 'business')) not null,
  city text default 'Kinshasa',
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.restaurants (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users not null,
  name text not null,
  type text check (type in ('restaurant', 'bar', 'terrasse', 'snack')) not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  city text default 'Kinshasa',
  is_open boolean default true,
  rating double precision default 5.0,
  review_count int default 0,
  preparation_time int default 30,
  estimated_delivery_time int default 20,
  delivery_available boolean default true,
  cover_image text,
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.menu_items (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants on delete cascade not null,
  name text not null,
  description text,
  price double precision not null,
  category text check (category in ('entrée', 'plat', 'boisson', 'dessert')) not null,
  image text,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  restaurant_id uuid references public.restaurants not null,
  status text check (status in ('pending', 'preparing', 'ready', 'delivering', 'completed', 'cancelled')) default 'pending',
  total_amount double precision not null,
  items jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders not null,
  sender_id uuid references auth.users not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.promotions (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants on delete cascade not null,
  media_url text not null,
  media_type text check (media_type in ('image', 'video')) default 'image',
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.cities (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  province text,
  latitude double precision,
  longitude double precision,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CONFIGURATION STORAGE (Pour les images)
-- Insère un bucket 'images' s'il n'existe pas
insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do nothing;

create policy "Public Access Images" on storage.objects for select using ( bucket_id = 'images' );
create policy "Public Upload Images" on storage.objects for insert with check ( bucket_id = 'images' );
create policy "Public Update Images" on storage.objects for update with check ( bucket_id = 'images' );

-- 6. Activation RLS (Row Level Security) - Mode PERMISSIF
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.promotions enable row level security;
alter table public.cities enable row level security;

-- Création de politiques "Passoire"
DROP POLICY IF EXISTS "Public Access Profiles" ON public.profiles;
CREATE POLICY "Public Access Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Restaurants" ON public.restaurants;
CREATE POLICY "Public Access Restaurants" ON public.restaurants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Menu" ON public.menu_items;
CREATE POLICY "Public Access Menu" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Orders" ON public.orders;
CREATE POLICY "Public Access Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Messages" ON public.messages;
CREATE POLICY "Public Access Messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Promotions" ON public.promotions;
CREATE POLICY "Public Access Promotions" ON public.promotions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Cities" ON public.cities;
CREATE POLICY "Public Access Cities" ON public.cities FOR ALL USING (true) WITH CHECK (true);

-- 7. ACTIVATION REALTIME (CRITIQUE POUR LA DEMANDE)
-- Ajout des tables 'messages' et 'orders' à la publication realtime
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table orders;

-- Données initiales
insert into public.cities (name, latitude, longitude) values ('Kinshasa', -4.4419, 15.2663) on conflict (name) do nothing;