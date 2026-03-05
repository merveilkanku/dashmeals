-- Ajout de la table des avis (Reviews)
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders not null,
  restaurant_id uuid references public.restaurants not null,
  user_id uuid references auth.users not null,
  rating int check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ajout de la colonne pour la preuve de livraison dans la table orders
alter table public.orders add column if not exists proof_url text;

-- Activation RLS pour reviews
alter table public.reviews enable row level security;

-- Politiques RLS pour reviews
DROP POLICY IF EXISTS "Public Access Reviews" ON public.reviews;
CREATE POLICY "Public Access Reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

-- Assurer que le bucket images est public (redondance de sécurité)
insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- Politique de stockage pour permettre l'upload par n'importe qui (pour la démo)
DROP POLICY IF EXISTS "Public Upload Images" ON storage.objects;
CREATE POLICY "Public Upload Images" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' );

DROP POLICY IF EXISTS "Public Select Images" ON storage.objects;
CREATE POLICY "Public Select Images" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
