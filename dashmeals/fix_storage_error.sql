-- FORCE FIX STORAGE POLICIES (CORRECTION ERREUR 403)
-- Copiez et exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Activer RLS sur storage.objects (au cas où)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les politiques existantes pour le bucket 'images' pour éviter les conflits
DROP POLICY IF EXISTS "Public Access Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Images" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Images Public Access" ON storage.objects;

-- 3. Créer des politiques TRES PERMISSIVES pour le bucket 'images'
-- Autoriser la lecture pour tout le monde (public)
CREATE POLICY "Public Access Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- Autoriser l'upload pour tout le monde (authentifié OU anonyme)
CREATE POLICY "Public Upload Images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'images' );

-- Autoriser la mise à jour pour tout le monde
CREATE POLICY "Public Update Images"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'images' );

-- Autoriser la suppression pour tout le monde (utile pour le dashboard)
CREATE POLICY "Public Delete Images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'images' );

-- 4. S'assurer que le bucket existe et est public
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
