-- Create MESSAGES table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their own orders
CREATE POLICY "Users can view messages for their orders" 
ON public.messages FOR SELECT 
USING (
    auth.uid() IN (
        SELECT user_id FROM public.orders WHERE id = messages.order_id
    )
    OR 
    auth.uid() IN (
        SELECT owner_id FROM public.restaurants 
        JOIN public.orders ON orders.restaurant_id = restaurants.id 
        WHERE orders.id = messages.order_id
    )
);

-- Policy: Users can insert messages for their own orders
CREATE POLICY "Users can insert messages for their orders" 
ON public.messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id
    AND (
        auth.uid() IN (
            SELECT user_id FROM public.orders WHERE id = order_id
        )
        OR 
        auth.uid() IN (
            SELECT owner_id FROM public.restaurants 
            JOIN public.orders ON orders.restaurant_id = restaurants.id 
            WHERE orders.id = order_id
        )
    )
);

-- Policy: Users can update (mark as read) messages for their orders
CREATE POLICY "Users can update messages for their orders" 
ON public.messages FOR UPDATE 
USING (
    auth.uid() IN (
        SELECT user_id FROM public.orders WHERE id = messages.order_id
    )
    OR 
    auth.uid() IN (
        SELECT owner_id FROM public.restaurants 
        JOIN public.orders ON orders.restaurant_id = restaurants.id 
        WHERE orders.id = messages.order_id
    )
);

-- Realtime subscription
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
