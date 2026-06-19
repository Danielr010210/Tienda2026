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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar administrador de fábrica:
-- Usuario por defecto: admin
-- Contraseña por defecto: Admin123!
-- Hash SHA-256 de "Admin123!" es "c1c224b03cd9bc7b6a86d77f5dace401917614d1_EJEMPLO"
-- En la app calculamos el SHA-256 real. Aquí tienes un registro inicial.
insert into workers (username, password_sha256, role, name, is_active)
values ('admin', '9c2a6b2c2c62c3e10fa48f804ab8daedc040d9039dc4fc09fed02f37e408bf0a', 'admin', 'Administrador Principal', true)
on conflict (username) do nothing;

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
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table workers;
alter publication supabase_realtime add table security_alerts;

-- =========================================================
-- CONSULTA DE MUESTRA PARA PROBAR PRODUCTOS
-- =========================================================
-- insert into products (name, description, price, category, image_url, stock, is_visible, promotion_discount) values 
-- ('iPhone 15 Pro Max', 'Apple Smartphone 256GB', 1199.00, 'Tecnología', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 8, true, 10),
-- ('Auriculares Sony WH-1000XM5', 'Cancelación de Ruido Activa', 349.99, 'Audio', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 3, true, 0),
-- ('Remera Minimalista Blanca', '100% Algodón Orgánico', 29.99, 'Moda', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', 15, true, 0);
`;
