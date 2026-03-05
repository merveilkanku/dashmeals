-- FIX STORIES & UPLOADS
-- Exécutez ce script dans Supabase > SQL Editor

-- 1. Assurer que la table promotions existe et a les bonnes colonnes
create table if not exists public.promotions (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants on delete cascade not null,
  media_url text not null,
  media_type text check (media_type in ('image', 'video')) default 'image',
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Réinitialiser les politiques RLS pour promotions
alter table public.promotions enable row level security;

DROP POLICY IF EXISTS "Public Access Promotions" ON public.promotions;
CREATE POLICY "Public Access Promotions" ON public.promotions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Promotions" ON public.promotions;
CREATE POLICY "Public Insert Promotions" ON public.promotions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Delete Promotions" ON public.promotions;
CREATE POLICY "Public Delete Promotions" ON public.promotions FOR DELETE USING (true);

-- 3. Assurer que le bucket 'images' existe et est public
insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- 4. Réinitialiser les politiques de stockage (Storage)
-- ATTENTION: Ces politiques sont très permissives pour la démo
DROP POLICY IF EXISTS "Public Access Images" ON storage.objects;
CREATE POLICY "Public Access Images" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );

DROP POLICY IF EXISTS "Public Upload Images" ON storage.objects;
CREATE POLICY "Public Upload Images" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' );

DROP POLICY IF EXISTS "Public Update Images" ON storage.objects;
CREATE POLICY "Public Update Images" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'images' );

-- 5. Vérifier la table reviews aussi (au cas où)
alter table public.reviews enable row level security;
DROP POLICY IF EXISTS "Public Access Reviews" ON public.reviews;
CREATE POLICY "Public Access Reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
