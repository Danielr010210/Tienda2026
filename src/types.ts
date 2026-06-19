/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'gerente' | 'empleado' | 'cliente';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  is_visible: boolean; // Control visibility without deleting
  promotion_discount: number; // Percentage discount (e.g., 15 for 15% off)
  created_at?: string;
}

export interface Worker {
  id: string;
  username: string;
  role: 'admin' | 'gerente' | 'empleado';
  name: string;
  phone?: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until?: string | null;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price_sold: number;
}

export interface Order {
  id: string;
  invoice_number: string; // FACT-XXXXX
  customer_name: string;
  customer_lastname: string;
  customer_phone: string;
  customer_address: string;
  customer_reference?: string;
  customer_nickname?: string;
  items: OrderItem[];
  total: number;
  status: 'pendiente' | 'confirmado' | 'cancelado';
  processed_by?: string; // name of worker who confirmed/canceled
  processed_role?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  type: 'bloqueo_usuario' | 'intento_fallido' | 'stock_critico' | 'precio_alterado';
  severity: 'low' | 'medium' | 'high';
  message: string;
  resolved: boolean;
}

export interface ShopSettings {
  shop_name: string;
  shop_description: string;
  contact_number: string;
  whatsapp_number: string; // Used for order sending
  business_hours: string;
  address: string;
  currency: string;
}
