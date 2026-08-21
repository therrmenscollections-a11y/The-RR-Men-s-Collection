-- SQL SETUP SCRIPT FOR SUPABASE
-- Run this in your Supabase project under SQL Editor -> New Query

-- 1. Create the Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  sizes text[] NOT NULL DEFAULT '{}', -- e.g., ['S', 'M', 'L', 'XL']
  category text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Store Settings Table (Single row table)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id integer PRIMARY KEY DEFAULT 1,
  store_name text NOT NULL,
  whatsapp_number text NOT NULL,
  store_currency text NOT NULL DEFAULT '₹',
  shop_latitude numeric NOT NULL,
  shop_longitude numeric NOT NULL,
  base_delivery_charge numeric NOT NULL,
  base_delivery_km numeric NOT NULL,
  delivery_charge_per_km numeric NOT NULL,
  free_delivery_min_order numeric NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  shop_address text NOT NULL,
  shop_hours text NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Products
CREATE POLICY "Allow public read-only access" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Allow admin to insert products" ON public.products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admin to update products" ON public.products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin to delete products" ON public.products
  FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Create RLS Policies for Store Settings
CREATE POLICY "Allow public read settings" ON public.store_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow admin to update settings" ON public.store_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. Set up Storage Bucket Security Policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to images
CREATE POLICY "Allow public read access to images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users (admin) to upload/update/delete images
CREATE POLICY "Allow admin to upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow admin to update images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 7. Seed Initial Store Settings
INSERT INTO public.store_settings (
  id, store_name, whatsapp_number, store_currency, shop_latitude, shop_longitude,
  base_delivery_charge, base_delivery_km, delivery_charge_per_km, free_delivery_min_order,
  contact_email, contact_phone, shop_address, shop_hours
) VALUES (
  1, 'The RR Men''s Collection', '1234567890', '₹', 13.04975, 77.72014,
  40.00, 3.0, 10.00, 1500.00,
  'contact@therrmenscollection.com', '+91 12345 67890',
  'Near East Point Hospital, Bidrahalli Main Road, Bangalore - 560049', '9:30 AM - 9:30 PM'
) ON CONFLICT (id) DO NOTHING;

-- Seed some initial mockup clothes
INSERT INTO public.products (name, description, price, sizes, category, image_url)
VALUES 
  ('Classic White Tee', 'A comfortable, standard-fit t-shirt made of 100% organic cotton. Perfect for everyday wear.', 19.99, ARRAY['S', 'M', 'L', 'XL'], 'T-Shirts', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600'),
  ('Vintage Denim Jacket', 'Classic button-up denim jacket with two chest pockets and adjustable button tabs. Vintage wash finish.', 59.99, ARRAY['M', 'L', 'XL'], 'Jackets', 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=600'),
  ('Cozy Hooded Sweatshirt', 'Premium heavyweight fleece hoodie with a drawstring hood and spacious kangaroo pocket.', 39.99, ARRAY['S', 'M', 'L'], 'Hoodies', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600')
ON CONFLICT DO NOTHING;
