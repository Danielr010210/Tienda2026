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
  shop_name varchar not null default 'Mi Tienda Minimalista',
  shop_description varchar default 'Compra rápida, segura y al mejor precio.',
  contact_number varchar default '+506 8888-8888',
  whatsapp_number varchar default '50688888888', -- Formato internacional sin más (+) ni espacios
  business_hours varchar default 'Lunes a Sábado: 8:00 AM - 6:00 PM',
  address varchar default 'San José, Costa Rica',
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
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar configuración inicial por defecto si no existe
insert into shop_settings (id, shop_name, shop_description)
values ('singleton', 'Mi Tienda Minimalista', 'La experiencia de compra más rápida de la web.')
on conflict (id) do nothing;

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

-- Insertar trabajadores por defecto si no existen:
-- Admin: Admin123!
-- Gerente: Gerente123!
-- Empleado: Empleado123!
insert into workers (username, password_sha256, role, name, phone, is_active)
values 
  ('admin', '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', 'admin', 'Sofía Rodríguez (Admin)', '+506 7000-1111', true),
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

-- Habilitar Realtime para visitor_history, coupons, product_reviews y support_inquiries
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

-- =========================================================
-- CONSULTA DE MUESTRA PARA PROBAR PRODUCTOS
-- =========================================================
-- insert into products (name, description, price, category, image_url, stock, is_visible, promotion_discount) values 
-- ('iPhone 15 Pro Max', 'Apple Smartphone 256GB', 1199.00, 'Tecnología', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 8, true, 10),
-- ('Auriculares Sony WH-1000XM5', 'Cancelación de Ruido Activa', 349.99, 'Audio', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 3, true, 0),
-- ('Remera Minimalista Blanca', '100% Algodón Orgánico', 29.99, 'Moda', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', 15, true, 0);
`;

export const SUPABASE_UPDATE_SQL_SCHEMA = `-- =========================================================
-- SCRIPT DE ACTUALIZACIÓN / MIGRACIÓN DE BASE DE DATOS
-- Ejecuta este script si ya tenías la base de datos de antes
-- y deseas agregar las nuevas columnas para configuraciones (Telegram, etc.)
-- =========================================================

-- 1. Agregar nuevas columnas de compatibilidad para trabajadores (workers)
alter table workers add column if not exists must_reset_password boolean not null default true;
alter table workers add column if not exists permissions text[] default '{}'::text[];

-- 2. Agregar nueva columna de moneda en productos (products)
alter table products add column if not exists currency varchar default 'CUP';

-- 3. Agregar nuevas columnas para shop_settings (Configuraciones de la Tienda y API Telegram)
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

-- 4. Asegurar que el registro singleton existe
insert into shop_settings (id, shop_name, shop_description)
values ('singleton', 'Boutique Minimal', 'La experiencia de compra más rápida de la web.')
on conflict (id) do nothing;

-- 5. Crear tabla de cupones si no existe
create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code varchar unique not null,
  discount_type varchar not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  is_active boolean not null default true,
  min_purchase_amount numeric(10,2) not null default 0 check (min_purchase_amount >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Crear tabla de historial de visitantes si no existe
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

-- 7. Crear tabla de opiniones de productos si no existe
create table if not exists product_reviews (
  id varchar primary key,
  product_id uuid references products(id) on delete cascade,
  reviewer_name varchar not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  is_hidden boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Crear tabla de consultas y reclamos de soporte si no existe
create table if not exists support_inquiries (
  id varchar primary key,
  customer_name varchar not null,
  customer_phone varchar not null,
  type varchar not null check (type in ('consulta', 'queja', 'problema')),
  message text not null,
  resolved boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Activar Realtime para las nuevas tablas si no están agregadas
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
`;
