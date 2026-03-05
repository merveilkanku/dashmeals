-- RELAX RLS FOR MESSAGES
-- Exécutez ce script dans Supabase > SQL Editor

-- Drop existing strict policy
DROP POLICY IF EXISTS "Users can insert messages for their orders" ON public.messages;

-- Create a more permissive policy for development/debugging
-- Allows any authenticated user to insert a message as long as they are the sender
CREATE POLICY "Users can insert messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Ensure Select policy is also permissive enough for now
DROP POLICY IF EXISTS "Users can view messages for their orders" ON public.messages;
CREATE POLICY "Users can view messages"
ON public.messages FOR SELECT
USING (true);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
