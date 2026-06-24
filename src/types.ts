export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  is_visible: boolean;
  promotion_discount: number; // as a percentage e.g., 10 for 10%
  created_at?: string;
  currency: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  default_folder_url?: string; // Parsed from category name delimiter hack if not directly in DB
  created_at?: string;
}

export interface ShopSettings {
  id: string;
  shop_name: string;
  shop_description: string;
  contact_number: string;
  whatsapp_number: string;
  business_hours: string;
  address: string;
  currency: string;
  about_visible?: boolean;
  about_text?: string | null;
  smart_search_text?: string;
  shop_logo_url?: string;
  theme_preset?: string;
  color_primary?: string;
  color_header_bg?: string;
  color_page_bg?: string;
  color_text?: string;
  color_card_bg?: string;
  font_family?: string;
  shop_logo_type?: string;
  shop_logo_val?: string;
  currencies?: string[];
  banner_visible?: boolean;
  banner_text?: string;
  banner_bg?: string;
  banner_text_color?: string;
  loading_text?: string;
  maps_option?: string;
  maps_coords?: string;
  maps_embed_url?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_enabled?: boolean;
}

export interface Worker {
  id: string;
  username: string;
  password_sha256: string;
  role: string; // 'admin' | 'gerente' | 'vendedor'
  name: string;
  phone: string;
  is_active: boolean;
  failed_attempts?: number;
  locked_until?: string | null;
  created_at?: string;
  must_reset_password?: boolean;
  permissions?: string[];
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
  type: string;
  severity: string;
  message: string;
  resolved: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  currency: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
  delivery_type: 'pickup' | 'delivery';
  address?: string;
  notes?: string;
  whatsapp_sent?: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  is_active: boolean;
  expiry_date?: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  rating: number;
  comment: string;
  author_name: string;
  created_at?: string;
}

export interface SupportInquiry {
  id: string;
  name: string;
  email_or_phone: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved';
  created_at?: string;
}
