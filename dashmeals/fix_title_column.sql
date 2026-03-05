-- FIX TITLE COLUMN CONSTRAINT
-- Exécutez ce script dans Supabase > SQL Editor

-- Rendre la colonne 'title' optionnelle (nullable) dans la table promotions
ALTER TABLE public.promotions ALTER COLUMN title DROP NOT NULL;

-- Si la colonne n'existe pas, l'ajouter en tant que nullable (pour être sûr)
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS title text;

-- Forcer le rechargement du cache de schéma
NOTIFY pgrst, 'reload schema';
