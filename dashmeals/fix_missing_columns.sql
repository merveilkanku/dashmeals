-- FIX MISSING COLUMNS
-- Exécutez ce script dans Supabase > SQL Editor pour corriger les erreurs de colonnes manquantes

-- 1. Ajouter la colonne media_url à la table promotions si elle n'existe pas
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS media_url text;

-- 2. Ajouter la colonne caption à la table promotions si elle n'existe pas
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS caption text;

-- 3. Ajouter la colonne media_type si elle manque
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS media_type text check (media_type in ('image', 'video')) default 'image';

-- 4. Ajouter la colonne proof_url aux commandes si elle manque (pour la validation client)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_url text;

-- 5. Forcer le rechargement du cache de schéma de l'API Supabase
NOTIFY pgrst, 'reload schema';
