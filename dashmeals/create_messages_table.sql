-- CREATE MESSAGES TABLE FOR CHAT
-- Exécutez ce script dans Supabase > SQL Editor

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
-- Allow users to view messages for their orders
DROP POLICY IF EXISTS "Users can view messages for their orders" ON public.messages;
CREATE POLICY "Users can view messages for their orders"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() IN (SELECT user_id FROM public.orders WHERE id = order_id) OR
  auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id IN (SELECT restaurant_id FROM public.orders WHERE id = order_id))
);

-- Allow users to insert messages for their orders
DROP POLICY IF EXISTS "Users can insert messages for their orders" ON public.messages;
CREATE POLICY "Users can insert messages for their orders"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    auth.uid() IN (SELECT user_id FROM public.orders WHERE id = order_id) OR
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id IN (SELECT restaurant_id FROM public.orders WHERE id = order_id))
  )
);

-- 4. Realtime
-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
