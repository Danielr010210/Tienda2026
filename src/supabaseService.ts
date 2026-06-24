/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { Product, ProductCategory, ShopSettings, Order, Worker, AuditLog, SecurityAlert } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper to save and read from local storage when Supabase fails or is not configured
function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
}

// Delimiter used to pack default_folder_url into the category name field
const CATEGORY_DELIMITER = ':::';

export class SupabaseService {
  // --- PRODUCTS ---
  static async getProducts(): Promise<Product[]> {
    let products: Product[] = [];
    let fetched = false;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          products = data;
          fetched = true;
          setLocalStorage('shop_products', data);
        } else {
          console.warn('Supabase getProducts error, falling back to local storage:', error);
        }
      } catch (e) {
        console.error('Supabase getProducts exception:', e);
      }
    }

    if (!fetched) {
      products = getLocalStorage<Product[]>('shop_products', []);
    }

    // Default products fallback with real CDN images matching categories
    if (products.length === 0) {
      products = [
        {
          id: 'prod-1',
          name: 'Arroz Extra Premium (Grano Largo)',
          description: 'Arroz blanco de grano largo extra pulido, libre de impurezas. Calidad de exportación.',
          price: 6.50,
          category: 'Alimentos',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/alimentos/arroz.jpg',
          stock: 45,
          is_visible: true,
          promotion_discount: 10,
          currency: 'USD'
        },
        {
          id: 'prod-2',
          name: 'Aceite de Girasol Sol',
          description: 'Aceite vegetal refinado de girasol, ideal para cocinar todo tipo de alimentos.',
          price: 4.80,
          category: 'Alimentos',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/alimentos/aceite.jpg',
          stock: 32,
          is_visible: true,
          promotion_discount: 0,
          currency: 'USD'
        },
        {
          id: 'prod-3',
          name: 'Split Royal de 1 Tonelada (12000 BTU)',
          description: 'Aire acondicionado tipo Split Royal, 110V/220V, alta eficiencia, ultra silencioso.',
          price: 450.00,
          category: 'Equipos Electrónicos',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/equipos/split.jpg',
          stock: 8,
          is_visible: true,
          promotion_discount: 5,
          currency: 'USD'
        },
        {
          id: 'prod-4',
          name: 'Televisor LED Smart TV 32"',
          description: 'Pantalla HD de alta definición, conexiones HDMI, USB y Wi-Fi para aplicaciones de streaming.',
          price: 280.00,
          category: 'Equipos Electrónicos',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/equipos/tv.jpg',
          stock: 4,
          is_visible: true,
          promotion_discount: 0,
          currency: 'USD'
        },
        {
          id: 'prod-5',
          name: 'Perfume Clásico Alicia',
          description: 'Fragancia mítica cubana con exquisitas notas florales y frutales para el día a día.',
          price: 22.00,
          category: 'PERFUMERÍA',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/perfumeria/alicia.jpg',
          stock: 15,
          is_visible: true,
          promotion_discount: 15,
          currency: 'USD'
        },
        {
          id: 'prod-6',
          name: 'Loción de Cuerpo Coral',
          description: 'Crema hidratante corporal con fragancia marina, suaviza y refresca la piel.',
          price: 12.00,
          category: 'PERFUMERÍA',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/perfumeria/locion.jpg',
          stock: 20,
          is_visible: true,
          promotion_discount: 0,
          currency: 'USD'
        },
        {
          id: 'prod-7',
          name: 'Jabón de Tocador Lux Suave',
          description: 'Jabón cremoso enriquecido con extractos florales para una piel tersa y perfumada.',
          price: 1.50,
          category: 'Aseo Personal',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/aseo/jabon.jpg',
          stock: 120,
          is_visible: true,
          promotion_discount: 0,
          currency: 'USD'
        },
        {
          id: 'prod-8',
          name: 'Dentífrico Colgate Triple Acción',
          description: 'Pasta dental con flúor para protección anticaries total, aliento fresco y dientes blancos.',
          price: 3.20,
          category: 'Aseo Personal',
          image_url: 'https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/aseo/colgate.jpg',
          stock: 65,
          is_visible: true,
          promotion_discount: 0,
          currency: 'USD'
        }
      ];
      setLocalStorage('shop_products', products);
    }
    return products;
  }

  static async saveProduct(product: Product): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('products').upsert(product);
        if (!error) {
          const local = await this.getProducts();
          const idx = local.findIndex(p => p.id === product.id);
          if (idx >= 0) local[idx] = product; else local.push(product);
          setLocalStorage('shop_products', local);
          return;
        }
        console.error('Supabase saveProduct error:', error);
      } catch (e) {
        console.error('Supabase saveProduct exception:', e);
      }
    }
    // Fallback
    const local = getLocalStorage<Product[]>('shop_products', []);
    const idx = local.findIndex(p => p.id === product.id);
    if (idx >= 0) local[idx] = product; else local.push(product);
    setLocalStorage('shop_products', local);
  }

  static async deleteProduct(id: string): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
          const local = getLocalStorage<Product[]>('shop_products', []);
          setLocalStorage('shop_products', local.filter(p => p.id !== id));
          return;
        }
        console.error('Supabase deleteProduct error:', error);
      } catch (e) {
        console.error('Supabase deleteProduct exception:', e);
      }
    }
    const local = getLocalStorage<Product[]>('shop_products', []);
    setLocalStorage('shop_products', local.filter(p => p.id !== id));
  }

  // --- CATEGORIES (using the smart delimiter hack) ---
  static async getCategories(): Promise<ProductCategory[]> {
    let rawCategories: any[] = [];
    let fetched = false;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('product_categories').select('*').order('name');
        if (!error && data) {
          rawCategories = data;
          fetched = true;
          setLocalStorage('shop_categories_raw', data);
        } else {
          console.warn('Supabase getCategories error, falling back to local storage:', error);
        }
      } catch (e) {
        console.error('Supabase getCategories exception:', e);
      }
    }

    if (!fetched) {
      rawCategories = getLocalStorage<any[]>('shop_categories_raw', [
        { id: 'cat-1', name: 'Alimentos:::https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/alimentos/' },
        { id: 'cat-2', name: 'Equipos Electrónicos:::https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/equipos/' },
        { id: 'cat-3', name: 'PERFUMERÍA:::https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/perfumeria/' },
        { id: 'cat-4', name: 'Aseo Personal:::https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/aseo/' }
      ]);
    }

    // Unpack name and default_folder_url
    return rawCategories.map((cat: any) => {
      const parts = cat.name.split(CATEGORY_DELIMITER);
      return {
        id: cat.id,
        name: parts[0] || '',
        default_folder_url: parts[1] || '',
        created_at: cat.created_at
      };
    });
  }

  static async saveCategory(category: ProductCategory): Promise<void> {
    // Pack name and default_folder_url
    const dbName = category.default_folder_url
      ? `${category.name.trim()}${CATEGORY_DELIMITER}${category.default_folder_url.trim()}`
      : category.name.trim();

    const dbPayload = {
      id: category.id,
      name: dbName
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('product_categories').upsert(dbPayload);
        if (!error) {
          const rawLocal = getLocalStorage<any[]>('shop_categories_raw', []);
          const idx = rawLocal.findIndex(c => c.id === category.id);
          if (idx >= 0) rawLocal[idx] = dbPayload; else rawLocal.push(dbPayload);
          setLocalStorage('shop_categories_raw', rawLocal);
          return;
        }
        console.error('Supabase saveCategory error:', error);
      } catch (e) {
        console.error('Supabase saveCategory exception:', e);
      }
    }

    const rawLocal = getLocalStorage<any[]>('shop_categories_raw', []);
    const idx = rawLocal.findIndex(c => c.id === category.id);
    if (idx >= 0) rawLocal[idx] = dbPayload; else rawLocal.push(dbPayload);
    setLocalStorage('shop_categories_raw', rawLocal);
  }

  static async deleteCategory(id: string): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('product_categories').delete().eq('id', id);
        if (!error) {
          const rawLocal = getLocalStorage<any[]>('shop_categories_raw', []);
          setLocalStorage('shop_categories_raw', rawLocal.filter(c => c.id !== id));
          return;
        }
        console.error('Supabase deleteCategory error:', error);
      } catch (e) {
        console.error('Supabase deleteCategory exception:', e);
      }
    }
    const rawLocal = getLocalStorage<any[]>('shop_categories_raw', []);
    setLocalStorage('shop_categories_raw', rawLocal.filter(c => c.id !== id));
  }

  // --- SHOP SETTINGS ---
  static async getSettings(): Promise<ShopSettings> {
    const defaultSettings: ShopSettings = {
      id: 'singleton',
      shop_name: 'Cubanos en Miami Shop',
      shop_description: 'Artículos premium seleccionados. Rápido, seguro y en un solo toque.',
      contact_number: '+1 7862942257',
      whatsapp_number: '7862942257',
      business_hours: 'Lunes a Sábado: 9am-5pm',
      address: '16335 nw 48th Miami Gardens FL 33016',
      currency: 'USD',
      currencies: ['USD', 'CUP', 'EUR', 'MLC'],
      about_visible: true,
      smart_search_text: 'Búsqueda Inteligente',
      shop_logo_type: 'text',
      shop_logo_val: '🛍️'
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 'singleton').maybeSingle();
        if (!error && data) {
          setLocalStorage('shop_settings', data);
          return data;
        }
        console.warn('Supabase getSettings error, falling back to local storage:', error);
      } catch (e) {
        console.error('Supabase getSettings exception:', e);
      }
    }
    return getLocalStorage<ShopSettings>('shop_settings', defaultSettings);
  }

  static async saveSettings(settings: ShopSettings): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('shop_settings').upsert(settings);
        if (!error) {
          setLocalStorage('shop_settings', settings);
          return;
        }
        console.error('Supabase saveSettings error:', error);
      } catch (e) {
        console.error('Supabase saveSettings exception:', e);
      }
    }
    setLocalStorage('shop_settings', settings);
  }

  // --- ORDERS ---
  static async getOrders(): Promise<Order[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          setLocalStorage('shop_orders', data);
          return data;
        }
        console.warn('Supabase getOrders error, falling back:', error);
      } catch (e) {
        console.error('Supabase getOrders exception:', e);
      }
    }
    return getLocalStorage<Order[]>('shop_orders', []);
  }

  static async saveOrder(order: Order): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').upsert(order);
        if (!error) {
          const local = getLocalStorage<Order[]>('shop_orders', []);
          const idx = local.findIndex(o => o.id === order.id);
          if (idx >= 0) local[idx] = order; else local.push(order);
          setLocalStorage('shop_orders', local);
          return;
        }
        console.error('Supabase saveOrder error:', error);
      } catch (e) {
        console.error('Supabase saveOrder exception:', e);
      }
    }
    const local = getLocalStorage<Order[]>('shop_orders', []);
    const idx = local.findIndex(o => o.id === order.id);
    if (idx >= 0) local[idx] = order; else local.push(order);
    setLocalStorage('shop_orders', local);
  }

  static async deleteOrder(id: string): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (!error) {
          const local = getLocalStorage<Order[]>('shop_orders', []);
          setLocalStorage('shop_orders', local.filter(o => o.id !== id));
          return;
        }
        console.error('Supabase deleteOrder error:', error);
      } catch (e) {
        console.error('Supabase deleteOrder exception:', e);
      }
    }
    const local = getLocalStorage<Order[]>('shop_orders', []);
    setLocalStorage('shop_orders', local.filter(o => o.id !== id));
  }

  // --- WORKERS (for simple shop managers login) ---
  static async getWorkers(): Promise<Worker[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('workers').select('*');
        if (!error && data) {
          setLocalStorage('shop_workers', data);
          return data;
        }
      } catch (e) {
        console.error('Supabase getWorkers exception:', e);
      }
    }
    return getLocalStorage<Worker[]>('shop_workers', [
      {
        id: 'b006debb-c5b7-4255-b234-6b049cb84527',
        username: 'ale',
        password_sha256: '2bdbfd21cf0fdcdead37525600e31aca622eb2a0ee3af298e3687d4a763f213c', // SHA-256 of '123456'
        role: 'gerente',
        name: 'Alexis Franco',
        phone: '+53 55555482',
        is_active: true
      },
      {
        id: 'admin-1',
        username: 'admin',
        password_sha256: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 of 'admin'
        role: 'admin',
        name: 'Administrador Principal',
        phone: '+1 7862942257',
        is_active: true
      }
    ]);
  }

  static async saveWorker(worker: Worker): Promise<void> {
    if (supabase) {
      try {
        await supabase.from('workers').upsert(worker);
      } catch (e) {
        console.error(e);
      }
    }
    const local = await this.getWorkers();
    const idx = local.findIndex(w => w.id === worker.id);
    if (idx >= 0) local[idx] = worker; else local.push(worker);
    setLocalStorage('shop_workers', local);
  }

  // --- AUDIT LOGS ---
  static async getAuditLogs(): Promise<AuditLog[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (!error && data) return data;
      } catch (e) {
        console.error(e);
      }
    }
    return getLocalStorage<AuditLog[]>('shop_audit_logs', []);
  }

  static async logAction(user: string, role: string, action: string, details: string): Promise<void> {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      user,
      role,
      action,
      details
    };
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert(log);
      } catch (e) {
        console.error(e);
      }
    }
    const local = getLocalStorage<AuditLog[]>('shop_audit_logs', []);
    local.unshift(log);
    setLocalStorage('shop_audit_logs', local.slice(0, 100));
  }

  // --- SECURITY ALERTS ---
  static async getSecurityAlerts(): Promise<SecurityAlert[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('security_alerts').select('*').order('timestamp', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.error(e);
      }
    }
    return getLocalStorage<SecurityAlert[]>('shop_security_alerts', []);
  }

  static async createSecurityAlert(type: string, severity: string, message: string): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      resolved: false
    };
    if (supabase) {
      try {
        await supabase.from('security_alerts').insert(alert);
      } catch (e) {
        console.error(e);
      }
    }
    const local = getLocalStorage<SecurityAlert[]>('shop_security_alerts', []);
    local.unshift(alert);
    setLocalStorage('shop_security_alerts', local);
  }

  static async resolveSecurityAlert(id: string): Promise<void> {
    if (supabase) {
      try {
        await supabase.from('security_alerts').update({ resolved: true }).eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }
    const local = getLocalStorage<SecurityAlert[]>('shop_security_alerts', []);
    const idx = local.findIndex(a => a.id === id);
    if (idx >= 0) {
      local[idx].resolved = true;
      setLocalStorage('shop_security_alerts', local);
    }
  }
}
