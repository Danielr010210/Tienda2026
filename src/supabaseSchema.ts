/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SUPABASE_SQL_SCHEMA = `-- =========================================================
-- CONFIGURACIÓN DE BASE DE DATOS SUPABASE PARA TU TIENDA
-- Ejecuta este script completo en el editor SQL de Supabase (SQL Editor -> New Query)
-- =========================================================

-- 1. HABILITAR LA EXTENSIÓN UUID SI NO ESTÁ ACTIVA
create extension if not exists "uuid-ossp";

-- 2. TABLA DE CONFIGURACIONES DE LA TIENDA (SINGLETON)
create table if not exists shop_settings (
  id varchar primary key default 'singleton',
  shop_name varchar not null default 'Cubanos en Miami',
  shop_description varchar default 'La experiencia de compra más rápida de la web.',
  contact_number varchar default '+1 786 294 2257',
  whatsapp_number varchar default '17862942257', -- Formato internacional sin más (+) ni espacios
  business_hours varchar default 'Lunes a Sábado: 9:00 AM - 5:00 PM',
  address varchar default '16335 nw 48th ave Miami Gardens FL 33016',
  currency varchar default '$',
  about_visible boolean default true,
  about_text text,
  smart_search_text varchar default 'Búsqueda Inteligente',
  shop_logo_url varchar default '',
  theme_preset varchar default 'classic',
  color_primary varchar default '#0f172a',
  color_header_bg varchar default '#ffffff',
  color_page_bg varchar default '#F8F9FA',
  color_text varchar default '#1e293b',
  color_card_bg varchar default '#ffffff',
  font_family varchar default 'Inter',
  shop_logo_type varchar default 'text',
  shop_logo_val varchar default 'M',
  currencies text[] default array['CUP', 'USD', 'EUR', 'MLC']::text[],
  banner_visible boolean default false,
  banner_text text default '',
  banner_bg varchar default '#1e293b',
  banner_text_color varchar default '#ffffff',
  loading_text text default 'Actualizando, por favor espere...',
  maps_option varchar default 'address',
  maps_coords varchar default '',
  maps_embed_url varchar default '',
  telegram_bot_token varchar default '',
  telegram_chat_id varchar default '',
  telegram_enabled boolean default false,
  store_url varchar default '',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar configuración inicial por defecto si no existe
insert into shop_settings (id, shop_name, shop_description)
values ('singleton', 'Cubanos en Miami', 'La experiencia de compra más rápida de la web.')
on conflict (id) do update set
  shop_name = excluded.shop_name,
  shop_description = excluded.shop_description;

-- 3. TABLA DE PRODUCTOS
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name varchar not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  category varchar not null,
  image_url varchar not null,
  stock integer not null default 0 check (stock >= 0),
  is_visible boolean not null default true,
  promotion_discount integer not null default 0 check (promotion_discount >= 0 and promotion_discount <= 100),
  currency varchar default 'CUP',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indice para búsquedas rápidas por categoría y visibilidad
create index if not exists idx_products_category_visible on products(category, is_visible);

-- 4. TABLA DE TRABAJADORES (ADMIN, GERENTE, EMPLEADO)
create table if not exists workers (
  id uuid primary key default uuid_generate_v4(),
  username varchar unique not null,
  password_sha256 varchar not null, -- Contraseña con hash SHA-256
  role varchar not null check (role in ('admin', 'gerente', 'empleado')),
  name varchar not null,
  phone varchar,
  is_active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamp with time zone,
  must_reset_password boolean not null default true,
  permissions text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Asegurar compatibilidad para bases de datos ya creadas previamente
alter table workers add column if not exists must_reset_password boolean not null default true;
alter table workers add column if not exists permissions text[] default '{}'::text[];
alter table products add column if not exists currency varchar default 'CUP';
alter table products add column if not exists variants jsonb default '[]'::jsonb;
alter table products add column if not exists gallery_images text[] default '{}'::text[];
alter table products add column if not exists quantity_prices jsonb default '[]'::jsonb;
alter table product_categories add column if not exists image_path varchar;

-- Compatibilidad para shop_settings existentes (nuevas columnas)
alter table shop_settings add column if not exists about_visible boolean default true;
alter table shop_settings add column if not exists about_text text;
alter table shop_settings add column if not exists smart_search_text varchar default 'Búsqueda Inteligente';
alter table shop_settings add column if not exists shop_logo_url varchar default '';
alter table shop_settings add column if not exists theme_preset varchar default 'classic';
alter table shop_settings add column if not exists color_primary varchar default '#0f172a';
alter table shop_settings add column if not exists color_header_bg varchar default '#ffffff';
alter table shop_settings add column if not exists color_page_bg varchar default '#F8F9FA';
alter table shop_settings add column if not exists color_text varchar default '#1e293b';
alter table shop_settings add column if not exists color_card_bg varchar default '#ffffff';
alter table shop_settings add column if not exists font_family varchar default 'Inter';
alter table shop_settings add column if not exists shop_logo_type varchar default 'text';
alter table shop_settings add column if not exists shop_logo_val varchar default 'M';
alter table shop_settings add column if not exists currencies text[] default array['CUP', 'USD', 'EUR', 'MLC']::text[];
alter table shop_settings add column if not exists banner_visible boolean default false;
alter table shop_settings add column if not exists banner_text text default '';
alter table shop_settings add column if not exists banner_bg varchar default '#1e293b';
alter table shop_settings add column if not exists banner_text_color varchar default '#ffffff';
alter table shop_settings add column if not exists loading_text text default 'Actualizando, por favor espere...';
alter table shop_settings add column if not exists maps_option varchar default 'address';
alter table shop_settings add column if not exists maps_coords varchar default '';
alter table shop_settings add column if not exists maps_embed_url varchar default '';
alter table shop_settings add column if not exists telegram_bot_token varchar default '';
alter table shop_settings add column if not exists telegram_chat_id varchar default '';
alter table shop_settings add column if not exists telegram_enabled boolean default false;
alter table shop_settings add column if not exists store_url varchar default '';

-- Insertar trabajadores por defecto si no existen:
-- Admin: admin o Admin123!
-- Gerente: Gerente123!
-- Empleado: Empleado123!
insert into workers (username, password_sha256, role, name, phone, is_active)
values 
  ('admin', '0a5bc3e342432f1bad92ffd51b785343ec72906cdba6a26131060b008e786656', 'admin', 'Sofía Rodríguez (Admin)', '+506 7000-1111', true),
  ('gerente', '68e059127789ea920ad39f186b60eaa3acfef029a4c8808d2d271e500c992d4a', 'gerente', 'Carlos Mendoza (Gerente)', '+506 7000-2222', true),
  ('empleado', 'a5eb10313b9116ce94dc36afd5b653bf03fee85101278b1a0f044ebc21a98a93', 'empleado', 'Mateo Gómez (Empleado)', '+506 7000-3333', true)
on conflict (username) do update 
set password_sha256 = excluded.password_sha256;

-- 5. TABLA DE PEDIDOS / FACTURAS
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  invoice_number varchar unique not null, -- Formato FACT-xxxxx
  customer_name varchar not null,
  customer_lastname varchar not null,
  customer_phone varchar not null,
  customer_address text not null,
  customer_reference text,
  customer_nickname varchar,
  items jsonb not null, -- Guardar arreglo de productos {product_id, product_name, quantity, price_sold}
  total numeric(10,2) not null check (total >= 0),
  status varchar not null default 'pendiente' check (status in ('pendiente', 'confirmado', 'cancelado')),
  processed_by varchar, -- Nombre del trabajador que lo procesó
  processed_role varchar, -- Rol del trabajador que lo procesó
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índice para números de factura y estado rápido
create index if not exists idx_orders_invoice on orders(invoice_number);
create index if not exists idx_orders_status on orders(status);

-- 6. TABLA DE BITÁCORA DE CAMBIOS (AUDIT LOGS)
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  "user" varchar not null,
  role varchar not null,
  action varchar not null,
  details text not null
);

-- 7. TABLA DE ALERTAS DE SEGURIDAD E INVENTARIO
create table if not exists security_alerts (
  id uuid primary key default uuid_generate_v4(),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  type varchar not null check (type in ('bloqueo_usuario', 'intento_fallido', 'stock_critico', 'precio_alterado')),
  severity varchar not null check (severity in ('low', 'medium', 'high')),
  message text not null,
  resolved boolean not null default false
);

-- =========================================================
-- ACTIVACIÓN DE SUPABASE REALTIME (CRUCIAL PARA ACTUACIONES EN VIVO)
-- =========================================================

-- Creamos el canal de publicación si no existe
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Agregamos las tablas clave a la publicación de Realtime para sincronizar clientes y admin en vivo
do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'products'
  ) then
    alter publication supabase_realtime add table products;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'workers'
  ) then
    alter publication supabase_realtime add table workers;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'security_alerts'
  ) then
    alter publication supabase_realtime add table security_alerts;
  end if;
end $$;

-- 8. TABLA DE HISTORIAL DE VISITANTES
create table if not exists visitor_history (
  id uuid primary key default uuid_generate_v4(),
  ip varchar not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  user_agent text not null,
  browser varchar not null,
  os varchar not null,
  page_visited varchar not null,
  country varchar not null default 'Cuba',
  city varchar not null default 'La Habana'
);

-- 9. TABLA DE CUPONES / CÓDIGOS DE DESCUENTO
create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code varchar unique not null,
  discount_type varchar not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  is_active boolean not null default true,
  min_purchase_amount numeric(10,2) not null default 0 check (min_purchase_amount >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. TABLA DE OPINIONES DE PRODUCTOS (VALORACIONES)
create table if not exists product_reviews (
  id varchar primary key,
  product_id uuid references products(id) on delete cascade,
  reviewer_name varchar not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  is_hidden boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. TABLA DE CONSULTAS Y RECLAMOS DE SOPORTE
create table if not exists support_inquiries (
  id varchar primary key,
  customer_name varchar not null,
  customer_phone varchar not null,
  type varchar not null check (type in ('consulta', 'queja', 'problema')),
  message text not null,
  resolved boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. TABLA DE CATEGORÍAS DE PRODUCTOS
create table if not exists product_categories (
  id varchar primary key,
  name varchar unique not null,
  image_path varchar,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Realtime para visitor_history, coupons, product_reviews, support_inquiries y product_categories
do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'visitor_history'
  ) then
    alter publication supabase_realtime add table visitor_history;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'coupons'
  ) then
    alter publication supabase_realtime add table coupons;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'product_reviews'
  ) then
    alter publication supabase_realtime add table product_reviews;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'support_inquiries'
  ) then
    alter publication supabase_realtime add table support_inquiries;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'product_categories'
  ) then
    alter publication supabase_realtime add table product_categories;
  end if;
end $$;

-- =========================================================
-- PRODUCTOS POR DEFECTO PARA LA TIENDA CUBANOS EN MIAMI
-- =========================================================
insert into products (id, name, description, price, category, image_url, stock, is_visible, promotion_discount, currency, quantity_prices) values
('0f76d605-edd2-4f99-816e-c206c1fd001b'::uuid, '12 CUP ALUMINUM COFFEE MAKER 6-CS', '', 10.12, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/12 CUP ALUMINUM COFFEE MAKER 6-CS.jpg', 10, true, 0, 'USD', '[{"quantity": 6, "price": 9.11}]'::jsonb),
('fdd969ee-cf0a-4fb0-a981-10d1a9f43bcb'::uuid, '16CT Tide Pods Clean Breeze', '', 6.02, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/16CT Tide Pods Clean Breeze.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('6f35bc91-38a2-4b86-9d93-19b182a52dd8'::uuid, '3pk 100gr Dettol Bar Soap', '', 2.15, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/3pk 100gr Dettol Bar Soap-Fresh.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('6be532b5-cb11-4908-839c-9209f495128a'::uuid, '4 Pack Kids Tooth Brush With Cap Soft', '', 1.11, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/4 Pack Kids Tooth Brush With Cap Soft.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('84ffb764-99b5-4cc9-b163-824ae7f54aae'::uuid, '4 Pack Tooth Brush With Cap Soft', '', 0.99, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/4 Pack Tooth Brush With Cap Soft.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('1b6987a9-4241-41e3-b459-37636280b47f'::uuid, '4.2oz Crest-Tartar Protection Regular Paste', '', 1.64, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/4.2oz Crest-Tartar Protection Regular Paste.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('884ca244-fc89-4638-94de-5d317b049eda'::uuid, '5 Pack Tooth Brush Clear Handle Soft', '', 0.99, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/5 Pack Tooth Brush Clear Handle Soft.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('aede4ef0-9958-48cf-834e-2336fb33ac4c'::uuid, '5.4oz Crest Toothpaste W-Scoope 4pk', '', 12.00, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/5.4oz Crest Toothpaste W-Scoope 4pk.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('1cd3d000-0b26-4b01-b912-1c1e7be46322'::uuid, '6 Cup Aluminum Coffee Maker 12-cs', '', 6.52, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/6 Cup Aluminum Coffee Maker 12-cs.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('4e4a98f9-06eb-4c9f-860a-f8f4f1f2ef18'::uuid, '6.4oz Tp Whitening With Toothbrush', '', 1.00, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/6.4oz Tp Whitening With Toothbrush.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('f3d54f9d-cb64-42ce-b40d-ac59d057e9cb'::uuid, '60 PC DENTAL FLOSS FLUORIDE-48', '', 1.15, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/60 PC DENTAL FLOSS FLUORIDE-48.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('2c0958da-f9b5-497d-8e10-a76c99954fa4'::uuid, '9 Cup Aluminum Coffee Maker 12-cs', '', 8.42, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/9 Cup Aluminum Coffee Maker 12-cs.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('585daef3-1d23-4351-a432-18bb4041a437'::uuid, 'Alas de Mariposa', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Alas de Mariposa.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('f11a3ff2-e45a-42e5-ae0d-ef97e2c54a9d'::uuid, 'Alicia', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Alicia.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('9e801ecb-4630-4a5d-8abd-c44cfb363f80'::uuid, 'Blue Moon', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Blue Moon.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('d8a1445f-bd07-4053-979f-64fc0994e749'::uuid, 'Camerata', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Camerata.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('9941b5cc-5096-4b06-acc8-9b259c410996'::uuid, 'Colgate 8 oz (226 gr)', '', 2.50, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Colgate 8 oz (226 gr).jpg', 10, true, 0, 'USD', '[]'::jsonb),
('e99ec8e6-ebf4-4bd1-8cd0-9dc2437125f8'::uuid, 'Complice Man', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Complice Man.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('ba826053-7cc0-408c-9f50-05cd25aebc6a'::uuid, 'Complice Woman', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Complice Woman.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('349c6eb2-5b8a-4fbe-8e79-db27bc21447f'::uuid, 'Dove Body Spray', '', 2.68, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Dove Woman.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('c043de78-a26c-485f-ae80-2c120657a408'::uuid, 'Dove Men', '', 3.75, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Dove Men.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('5e5f25d1-6eb4-4b15-ad29-3fa28aa2dfee'::uuid, 'EcoFlow Delta 2 (950)', '', 750.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/EcoFlow Delta 2 (950).jpg', 10, true, 0, 'USD', '[]'::jsonb),
('58831200-17d3-4253-b623-6226f7c74a3c'::uuid, 'EcoFlow Delta 3 Classic', '', 650.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/EcoFlow Delta 3 Classic.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('27ff9cde-c355-4636-9cb1-8fb9c61401b7'::uuid, 'EcoFlow Delta 3 Max', '', 1100.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/EcoFlow Delta 3 Max.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('55b3ccb9-ce7a-41a8-95f7-392ca7483fec'::uuid, 'Electric Espresso Maker 3 Cups, Red', '', 36.16, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Electric Espresso Maker 3 Cups, Red.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('f6b4603a-cc9b-4dcd-a207-0de22dd404ce'::uuid, 'Electric Espresso Maker 6 Cups, Red', '', 40.90, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Electric Espresso Maker 6 Cups, Red.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('1a8d3a91-cb28-4b1b-b88b-12ee18789634'::uuid, 'Electric Espresso Marker 6 Cups', '', 36.83, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Electric Espresso Marker 6 Cups.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('ac2ed0bf-bb2a-4e9e-8690-435f51828591'::uuid, 'Elements', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Elements.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('f1f6a297-13d3-4871-b66c-f5a4d83feefc'::uuid, 'Eva', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Eva.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('7b0a7ccb-97c8-4844-ab2d-125be9bab584'::uuid, 'Habana', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Habana.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('9d0c5ea0-c40e-4c48-9f39-258b81d9699b'::uuid, 'Habana Man', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Habana Man.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('97ab8cda-a57e-472c-bba4-1e9ebed4f216'::uuid, 'Impacto Man', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Impacto Man.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('9b870271-9a76-43ae-8b66-96f0dd8ac4e5'::uuid, 'Mariposa', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Mariposa.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('241210cb-de80-452b-aad5-acfa57e20866'::uuid, 'Mariposa Absolu', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Mariposa Absolu.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('24d01af6-321b-4d09-9cb3-fe1ace4d5e4b'::uuid, 'Nao', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Nao.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('91f7a0aa-26c3-48d9-b868-dfb731e42f39'::uuid, 'Premium Panini Maker 2 Slice', '', 30.95, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Panini Maker 2 Slice.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('9fb85924-7bef-4813-af21-31edcbaee6c2'::uuid, 'Premium Rice Cooker 1.2L- 6 Cups', '', 18.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Rice Cooker 1.2L- 6 Cups.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('e5b0c7c1-0bbc-48ef-a2b4-df7180e3697a'::uuid, 'Premium Rice Cooker 1.5L-8 Cups', '', 24.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Rice Cooker 1.5L-8 Cups.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('054ad15e-058c-4382-be66-a6df95acb0c4'::uuid, 'Premium Sandwich Maker S.S', '', 27.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Sandwich Maker S.S.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('ff1fd35a-c7e4-4a44-be10-d6f7055bea70'::uuid, 'Premium Sandwich Maker White', '', 13.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Sandwich Maker White.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('9cb52819-4762-486f-8e22-b7502caac1ee'::uuid, 'Premium Sandwich Marker Rect', '', 12.00, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Sandwich Marker Rect.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('ad47fcff-77c5-4188-8ba4-9f811939f996'::uuid, 'Rebelde', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Rebelde.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('f1dca5de-b9cd-4469-af15-36e67a9b3409'::uuid, 'Rechargeable Fan 10´´', '', 34.50, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 10´´.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('c20cde4a-34e3-4693-a05f-d1953f886236'::uuid, 'Rechargeable Fan 12´´', '', 36.80, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 12´´.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('55885252-6f8b-41d3-8128-7811d92114ab'::uuid, 'Rechargeable Fan 14´´', '', 42.55, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 14´´.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('81bc59a3-022a-4786-9e90-771300179f6f'::uuid, 'Rechargeable Fan 8´´', '', 20.52, 'Equipos Electrónicos', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 8´´.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('c76ac28d-97b3-45e7-ad4f-ddbd6bb9a47e'::uuid, 'Romeo & Julieta', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Romeo & Julieta.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('e040172e-3a30-4372-b855-17f2e7236855'::uuid, 'Rosa Venus White Bar Soap', '', 0.99, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Rosa Venus White Bar Soap.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('ffa4b609-1524-43cd-a193-87e7b00e3905'::uuid, 'Sanogyl Soin Gencives', '', 7.50, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Sanogyl Soin Gencives.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('8824e380-a719-4052-bfd7-6144d64cb332'::uuid, 'Tooth Brush 10 pcs Medium', '', 0.99, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Tooth Brush 10 pcs Medium.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('c2e150e6-23dd-4d1d-9bec-f09ab96f7f0e'::uuid, 'Tooth Brush 5pcs Medium-Value Pack', '', 0.99, 'Aseo Personal', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Tooth Brush 5pcs Medium-Value Pack.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('9041da99-6223-452e-9a7c-fd41480fcc3e'::uuid, 'Vegueros', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Vegueros.jpg', 10, true, 0, 'USD', '[]'::jsonb),
('f5b3692e-f5a5-431a-b65b-bc19737a12df'::uuid, 'Vegueros in Black', '', 50.00, 'Perfumería', 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Vegueros in Black.jpg', 10, true, 0, 'USD', '[]'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  category = excluded.category,
  image_url = excluded.image_url,
  stock = excluded.stock,
  is_visible = excluded.is_visible,
  promotion_discount = excluded.promotion_discount,
  currency = excluded.currency,
  quantity_prices = excluded.quantity_prices;
`;

export const SUPABASE_UPDATE_SQL_SCHEMA = `-- =========================================================
-- SCRIPT DE ACTUALIZACIÓN / MIGRACIÓN DE BASE DE DATOS
-- Crea las tablas que falten y actualiza las existentes de forma segura.
-- =========================================================

-- 1. HABILITAR LA EXTENSIÓN UUID SI NO ESTÁ ACTIVA
create extension if not exists "uuid-ossp";

-- 2. TABLA DE CONFIGURACIONES DE LA TIENDA (SINGLETON) SI NO EXISTE
create table if not exists shop_settings (
  id varchar primary key default 'singleton',
  shop_name varchar not null default 'Cubanos en Miami',
  shop_description varchar default 'La experiencia de compra más rápida de la web.',
  contact_number varchar default '+1 786 294 2257',
  whatsapp_number varchar default '17862942257',
  business_hours varchar default 'Lunes a Sábado: 9:00 AM - 5:00 PM',
  address varchar default '16335 nw 48th ave Miami Gardens FL 33016',
  currency varchar default '$',
  about_visible boolean default true,
  about_text text,
  smart_search_text varchar default 'Búsqueda Inteligente',
  shop_logo_url varchar default '',
  theme_preset varchar default 'classic',
  color_primary varchar default '#0f172a',
  color_header_bg varchar default '#ffffff',
  color_page_bg varchar default '#F8F9FA',
  color_text varchar default '#1e293b',
  color_card_bg varchar default '#ffffff',
  font_family varchar default 'Inter',
  shop_logo_type varchar default 'text',
  shop_logo_val varchar default 'M',
  currencies text[] default array['CUP', 'USD', 'EUR', 'MLC']::text[],
  banner_visible boolean default false,
  banner_text text default '',
  banner_bg varchar default '#1e293b',
  banner_text_color varchar default '#ffffff',
  loading_text text default 'Actualizando, por favor espere...',
  maps_option varchar default 'address',
  maps_coords varchar default '',
  maps_embed_url varchar default '',
  telegram_bot_token varchar default '',
  telegram_chat_id varchar default '',
  telegram_enabled boolean default false,
  store_url varchar default '',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar configuración inicial por defecto si no existe
insert into shop_settings (id, shop_name, shop_description)
values ('singleton', 'Cubanos en Miami', 'La experiencia de compra más rápida de la web.')
on conflict (id) do update set
  shop_name = excluded.shop_name,
  shop_description = excluded.shop_description;

-- 3. TABLA DE PRODUCTOS SI NO EXISTE
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name varchar not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  category varchar not null,
  image_url varchar not null,
  stock integer not null default 0 check (stock >= 0),
  is_visible boolean not null default true,
  promotion_discount integer not null default 0 check (promotion_discount >= 0 and promotion_discount <= 100),
  currency varchar default 'CUP',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indice para búsquedas rápidas por categoría y visibilidad
create index if not exists idx_products_category_visible on products(category, is_visible);

-- 4. TABLA DE TRABAJADORES SI NO EXISTE
create table if not exists workers (
  id uuid primary key default uuid_generate_v4(),
  username varchar unique not null,
  password_sha256 varchar not null,
  role varchar not null check (role in ('admin', 'gerente', 'empleado')),
  name varchar not null,
  phone varchar,
  is_active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamp with time zone,
  must_reset_password boolean not null default true,
  permissions text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar trabajadores por defecto si no existen:
-- Admin: admin o Admin123!
-- Gerente: Gerente123!
-- Empleado: Empleado123!
insert into workers (username, password_sha256, role, name, phone, is_active)
values 
  ('admin', '0a5bc3e342432f1bad92ffd51b785343ec72906cdba6a26131060b008e786656', 'admin', 'Sofía Rodríguez (Admin)', '+506 7000-1111', true),
  ('gerente', '68e059127789ea920ad39f186b60eaa3acfef029a4c8808d2d271e500c992d4a', 'gerente', 'Carlos Mendoza (Gerente)', '+506 7000-2222', true),
  ('empleado', 'a5eb10313b9116ce94dc36afd5b653bf03fee85101278b1a0f044ebc21a98a93', 'empleado', 'Mateo Gómez (Empleado)', '+506 7000-3333', true)
on conflict (username) do update 
set password_sha256 = excluded.password_sha256;

-- 5. TABLA DE PEDIDOS / FACTURAS SI NO EXISTE
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  invoice_number varchar unique not null,
  customer_name varchar not null,
  customer_lastname varchar not null,
  customer_phone varchar not null,
  customer_address text not null,
  customer_reference text,
  customer_nickname varchar,
  items jsonb not null,
  total numeric(10,2) not null check (total >= 0),
  status varchar not null default 'pendiente' check (status in ('pendiente', 'confirmado', 'cancelado')),
  processed_by varchar,
  processed_role varchar,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índice para números de factura y estado rápido
create index if not exists idx_orders_invoice on orders(invoice_number);
create index if not exists idx_orders_status on orders(status);

-- 6. TABLA DE BITÁCORA DE CAMBIOS SI NO EXISTE
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  "user" varchar not null,
  role varchar not null,
  action varchar not null,
  details text not null
);

-- 7. TABLA DE ALERTAS DE SEGURIDAD SI NO EXISTE
create table if not exists security_alerts (
  id uuid primary key default uuid_generate_v4(),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  type varchar not null check (type in ('bloqueo_usuario', 'intento_fallido', 'stock_critico', 'precio_alterado')),
  severity varchar not null check (severity in ('low', 'medium', 'high')),
  message text not null,
  resolved boolean not null default false
);

-- 8. Crear tabla de cupones si no existe
create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code varchar unique not null,
  discount_type varchar not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  is_active boolean not null default true,
  min_purchase_amount numeric(10,2) not null default 0 check (min_purchase_amount >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Crear tabla de historial de visitantes si no existe
create table if not exists visitor_history (
  id uuid primary key default uuid_generate_v4(),
  ip varchar not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  user_agent text not null,
  browser varchar not null,
  os varchar not null,
  page_visited varchar not null,
  country varchar not null default 'Cuba',
  city varchar not null default 'La Habana'
);

-- 10. Crear tabla de opiniones de productos si no existe
create table if not exists product_reviews (
  id varchar primary key,
  product_id uuid references products(id) on delete cascade,
  reviewer_name varchar not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  is_hidden boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Crear tabla de consultas y reclamos de soporte si no existe
create table if not exists support_inquiries (
  id varchar primary key,
  customer_name varchar not null,
  customer_phone varchar not null,
  type varchar not null check (type in ('consulta', 'queja', 'problema')),
  message text not null,
  resolved boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Crear tabla de categorías de productos si no existe
create table if not exists product_categories (
  id varchar primary key,
  name varchar unique not null,
  image_path varchar,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================
-- MIGRACIÓN DE COLUMNAS DE COMPATIBILIDAD (SOPORTA BD YA EXISTENTES)
-- =========================================================

-- Compatibilidad para trabajadores (workers)
alter table workers add column if not exists must_reset_password boolean not null default true;
alter table workers add column if not exists permissions text[] default '{}'::text[];

-- Compatibilidad de moneda en productos (products)
alter table products add column if not exists currency varchar default 'CUP';
alter table products add column if not exists variants jsonb default '[]'::jsonb;
alter table products add column if not exists gallery_images text[] default '{}'::text[];
alter table products add column if not exists quantity_prices jsonb default '[]'::jsonb;

-- Compatibilidad de imagen en categorías (product_categories)
alter table product_categories add column if not exists image_path varchar;

-- Compatibilidad para shop_settings existentes (Telegram, IVA, Logo, etc.)
alter table shop_settings add column if not exists about_visible boolean default true;
alter table shop_settings add column if not exists about_text text;
alter table shop_settings add column if not exists smart_search_text varchar default 'Búsqueda Inteligente';
alter table shop_settings add column if not exists shop_logo_url varchar default '';
alter table shop_settings add column if not exists theme_preset varchar default 'classic';
alter table shop_settings add column if not exists color_primary varchar default '#0f172a';
alter table shop_settings add column if not exists color_header_bg varchar default '#ffffff';
alter table shop_settings add column if not exists color_page_bg varchar default '#F8F9FA';
alter table shop_settings add column if not exists color_text varchar default '#1e293b';
alter table shop_settings add column if not exists color_card_bg varchar default '#ffffff';
alter table shop_settings add column if not exists font_family varchar default 'Inter';
alter table shop_settings add column if not exists shop_logo_type varchar default 'text';
alter table shop_settings add column if not exists shop_logo_val varchar default 'M';
alter table shop_settings add column if not exists currencies text[] default array['CUP', 'USD', 'EUR', 'MLC']::text[];
alter table shop_settings add column if not exists banner_visible boolean default false;
alter table shop_settings add column if not exists banner_text text default '';
alter table shop_settings add column if not exists banner_bg varchar default '#1e293b';
alter table shop_settings add column if not exists banner_text_color varchar default '#ffffff';
alter table shop_settings add column if not exists loading_text text default 'Actualizando, por favor espere...';
alter table shop_settings add column if not exists maps_option varchar default 'address';
alter table shop_settings add column if not exists maps_coords varchar default '';
alter table shop_settings add column if not exists maps_embed_url varchar default '';
alter table shop_settings add column if not exists telegram_bot_token varchar default '';
alter table shop_settings add column if not exists telegram_chat_id varchar default '';
alter table shop_settings add column if not exists telegram_enabled boolean default false;
alter table shop_settings add column if not exists store_url varchar default '';

-- =========================================================
-- ACTIVACIÓN DE SUPABASE REALTIME PARA TODAS LAS TABLAS
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'products'
  ) then
    alter publication supabase_realtime add table products;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'workers'
  ) then
    alter publication supabase_realtime add table workers;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'security_alerts'
  ) then
    alter publication supabase_realtime add table security_alerts;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'visitor_history'
  ) then
    alter publication supabase_realtime add table visitor_history;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'coupons'
  ) then
    alter publication supabase_realtime add table coupons;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'product_reviews'
  ) then
    alter publication supabase_realtime add table product_reviews;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'support_inquiries'
  ) then
    alter publication supabase_realtime add table support_inquiries;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'product_categories'
  ) then
    alter publication supabase_realtime add table product_categories;
  end if;
end $$;
`;
