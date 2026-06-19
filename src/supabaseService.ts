/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Product, Worker, Order, AuditLog, SecurityAlert, ShopSettings } from './types';
import { generateInvoiceNumber, hashSHA256 } from './utils';

// Helper to check if string is a valid UUID
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Default mock data so the app feels alive instantly
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1542496658',
    name: 'Smart Watch Aura X',
    description: 'Reloj inteligente con monitor de oxígeno en sangre, pantalla AMOLED de 1.43 pulgadas y batería de 14 días.',
    price: 199.99,
    category: 'Tecnología',
    image_url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=600&auto=format&fit=crop&q=60',
    stock: 12,
    is_visible: true,
    promotion_discount: 15,
  },
  {
    id: 'prod-1546435770',
    name: 'Auriculares Inalámbricos SoundZen',
    description: 'Cancelación de ruido activa híbrida, audio Hi-Res de alta resolución, y almohadillas viscoelásticas ultra suaves.',
    price: 149.50,
    category: 'Audio',
    image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=60',
    stock: 4,
    is_visible: true,
    promotion_discount: 0,
  },
  {
    id: 'prod-1553062407',
    name: 'Mochila Urbana EcoShield',
    description: 'Fabricada con botellas plásticas recicladas. Impermeable, puerto USB de carga integrado y compartimento para laptop de 16".',
    price: 59.99,
    category: 'Moda',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=60',
    stock: 25,
    is_visible: true,
    promotion_discount: 20,
  },
  {
    id: 'prod-1517701604',
    name: 'Cafetera Espresso Barista Compact',
    description: 'Presión de 19 bares, espumador de leche manual y panel táctil intuitivo. Diseñada para cocinas compactas.',
    price: 120.00,
    category: 'Hogar',
    image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=60',
    stock: 0,
    is_visible: true,
    promotion_discount: 0,
  },
  {
    id: 'prod-1542291026',
    name: 'Zapatillas Running Carbon Pro',
    description: 'Placa de fibra de carbono para máxima amortiguación y retorno de energía. Ideal para maratones o ritmos intensos.',
    price: 180.00,
    category: 'Deportes',
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60',
    stock: 8,
    is_visible: true,
    promotion_discount: 10,
  },
  {
    id: 'prod-1622445262',
    name: 'Cargador Inalámbrico Múltiple 3-en-1',
    description: 'Carga simultánea para tu teléfono inteligente, reloj inteligente y auriculares inalámbricos. Acabado de aluminio.',
    price: 45.00,
    category: 'Tecnología',
    image_url: 'https://images.unsplash.com/photo-1622445262465-2481c6877981?w=600&auto=format&fit=crop&q=60',
    stock: 18,
    is_visible: false,
    promotion_discount: 0,
  }
];

const DEFAULT_WORKERS = [
  {
    id: 'w-1',
    username: 'admin',
    password_sha256: '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', // Admin123!
    role: 'admin',
    name: 'Sofía Rodríguez',
    phone: '+506 7000-1111',
    is_active: true,
    failed_attempts: 0,
    locked_until: null,
  },
  {
    id: 'w-2',
    username: 'gerente',
    password_sha256: '68e059127789ea920ad39f186b60eaa3acfef029a4c8808d2d271e500c992d4a', // Gerente123!
    role: 'gerente',
    name: 'Carlos Mendoza',
    phone: '+506 7000-2222',
    is_active: true,
    failed_attempts: 0,
    locked_until: null,
  },
  {
    id: 'w-3',
    username: 'empleado',
    password_sha256: 'a5eb10313b9116ce94dc36afd5b653bf03fee85101278b1a0f044ebc21a98a93', // Empleado123!
    role: 'empleado',
    name: 'Mateo Gómez',
    phone: '+506 7000-3333',
    is_active: true,
    failed_attempts: 0,
    locked_until: null,
  }
];

const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: 'Boutique Minimal',
  shop_description: 'Artículos premium cuidadosamente seleccionados. Rápido, seguro y en un solo toque.',
  contact_number: '+34 600 000 000',
  whatsapp_number: '34600000000',
  business_hours: 'Lunes a Sábado: 09:00 - 20:00 (Domingo cerrado)',
  address: 'Gran Vía 45, Madrid, España',
  currency: '€'
};

const DEFAULT_AUDITS: AuditLog[] = [
  {
    id: 'a-1',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    user: 'Sofía Rodríguez',
    role: 'admin',
    action: 'Inició sesión',
    details: 'Inicio de sesión exitoso desde IP autorizada en la base de datos.'
  },
  {
    id: 'a-2',
    timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    user: 'Sofía Rodríguez',
    role: 'admin',
    action: 'Modificó Configuración',
    details: 'Se actualizó el horario de atención de la tienda.'
  }
];

const DEFAULT_ALERTS: SecurityAlert[] = [
  {
    id: 'al-1',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    type: 'stock_critico',
    severity: 'medium',
    message: 'El producto "Auriculares Inalámbricos SoundZen" ha alcanzado el nivel crítico de inventario (4 unidades restantes).',
    resolved: false
  }
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-1234',
    invoice_number: 'FACT-48194',
    customer_name: 'Alejandro',
    customer_lastname: 'Pérez',
    customer_phone: '654321098',
    customer_address: 'Calle Mayor 12, Piso 3B',
    customer_reference: 'Frente a la panadería de la esquina',
    customer_nickname: 'Alex',
    items: [
      {
        product_id: 'prod-1542496658',
        product_name: 'Smart Watch Aura X',
        quantity: 1,
        price_sold: 169.99
      },
      {
        product_id: 'prod-1553062407',
        product_name: 'Mochila Urbana EcoShield',
        quantity: 2,
        price_sold: 47.99
      }
    ],
    total: 265.97,
    status: 'confirmado',
    processed_by: 'Carlos Mendoza',
    processed_role: 'gerente',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 7.8).toISOString()
  }
];

// Helper to initialize local storage to keep state stable
function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  const value = localStorage.getItem(key);
  if (!value) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function setLocalStorageItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export class SupabaseService {
  // Configured URL and Key (populated with exact user parameters!)
  static getCredentials() {
    const metaEnv = (import.meta as any).env;
    const url = (metaEnv?.VITE_SUPABASE_URL as string) || localStorage.getItem('supabase_url') || 'https://yczvjaciqhaxymsbeyty.supabase.co';
    const key = (metaEnv?.VITE_SUPABASE_ANON_KEY as string) || localStorage.getItem('supabase_key') || 'sb_publishable_fYQjTggl4-eoDyc-s3jPdQ_MG5q4UlW';
    const mode = localStorage.getItem('supabase_mode') || 'real';
    return { url, key, mode };
  }

  static setCredentials(url: string, key: string, mode: 'mock' | 'real') {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    localStorage.setItem('supabase_mode', mode);
  }

  private static isReal() {
    const { url, key, mode } = this.getCredentials();
    return mode === 'real' && !!url && !!key;
  }

  private static getClient() {
    const { url, key } = this.getCredentials();
    if (!url || !key) return null;
    try {
      return createClient(url, key);
    } catch (e) {
      console.error('Error creating Supabase client:', e);
      return null;
    }
  }

  // --- PRODUCTS ---
  static async getProducts(): Promise<Product[]> {
    if (!this.isReal()) {
      return getLocalStorageItem('shop_products', DEFAULT_PRODUCTS);
    }
    const client = this.getClient();
    if (!client) return getLocalStorageItem('shop_products', DEFAULT_PRODUCTS);
    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('name');
      if (error) {
        console.warn('Supabase products fetch failed, using local local storage:', error);
        return getLocalStorageItem('shop_products', DEFAULT_PRODUCTS);
      }
      return data || [];
    } catch (e) {
      console.warn('Supabase products fetch exception, using local:', e);
      return getLocalStorageItem('shop_products', DEFAULT_PRODUCTS);
    }
  }

  static async saveProduct(product: Product): Promise<void> {
    // 1. Always sync to mock local storage for high availability fallback
    const products = await this.getProducts();
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.push(product);
    }
    setLocalStorageItem('shop_products', products);

    if (product.stock <= 5) {
      await this.triggerAlert('stock_critico', 'medium', `Inventario bajo para ${product.name} (${product.stock} unidades).`);
    }

    // 2. Real database sync
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const isIdUuid = isUUID(product.id);
          const rowData: any = {
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: product.image_url,
            stock: product.stock,
            is_visible: product.is_visible,
            promotion_discount: product.promotion_discount
          };
          
          if (isIdUuid) {
            rowData.id = product.id;
            await client.from('products').upsert(rowData);
          } else {
            // First check if a product with the same name already exists in the real DB to update it,
            // or insert it as a new product
            const { data: existing } = await client
              .from('products')
              .select('id')
              .eq('name', product.name)
              .maybeSingle();
            
            if (existing) {
              await client.from('products').update(rowData).eq('id', existing.id);
              product.id = existing.id;
            } else {
              const { data: inserted } = await client
                .from('products')
                .insert(rowData)
                .select('id')
                .single();
              if (inserted) {
                product.id = inserted.id;
              }
            }
          }
        } catch (e) {
          console.error('Supabase sync product error:', e);
        }
      }
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    const products = await this.getProducts();
    const prod = products.find(p => p.id === id);
    const updated = products.filter(p => p.id !== id);
    setLocalStorageItem('shop_products', updated);
    if (prod) {
      this.logAudit('Sistema/Trabajador', 'Eliminar Producto', `Se eliminó el producto: ${prod.name}`);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const tableId = isUUID(id) ? id : null;
          if (tableId) {
            await client.from('products').delete().eq('id', tableId);
          } else if (prod) {
            await client.from('products').delete().eq('name', prod.name);
          }
        } catch (e) {
          console.error('Supabase delete product error:', e);
        }
      }
    }
  }

  // --- WORKERS ---
  static async getWorkers(): Promise<Worker[]> {
    if (!this.isReal()) {
      return getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
    }
    const client = this.getClient();
    if (!client) return getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
    try {
      const { data, error } = await client
        .from('workers')
        .select('*')
        .order('name');
      if (error) {
        console.warn('Real workers fetch failed, using local:', error);
        return getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
      }
      return data || [];
    } catch (e) {
      console.warn('Real workers fetch error, using local:', e);
      return getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
    }
  }

  static async saveWorker(worker: Worker, plainPassword?: string): Promise<void> {
    // 1. Mock store sync
    const workers = await this.getWorkers();
    let dbWorker = { ...worker };
    
    if (plainPassword) {
      const hashed = await hashSHA256(plainPassword);
      (dbWorker as any).password_sha256 = hashed;
    }

    const idx = workers.findIndex(w => w.id === dbWorker.id);
    if (idx >= 0) {
      if (!plainPassword) {
        const oldWorker = workers[idx];
        (dbWorker as any).password_sha256 = (oldWorker as any).password_sha256;
      }
      workers[idx] = dbWorker;
      this.logAudit('Admin', 'Modificar Trabajador', `Se actualizaron datos del colaborador: ${dbWorker.name} (${dbWorker.role})`);
    } else {
      if (!plainPassword) {
        const defaultHash = await hashSHA256('Colaborador123!');
        (dbWorker as any).password_sha256 = defaultHash;
      }
      workers.push(dbWorker);
      this.logAudit('Admin', 'Crear Trabajador', `Se registró un nuevo colaborador: ${dbWorker.name} con rol ${dbWorker.role}`);
    }
    setLocalStorageItem('shop_workers', workers);

    // 2. Real db sync
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const isIdUuid = isUUID(dbWorker.id);
          const rowData: any = {
            username: dbWorker.username.toLowerCase(),
            role: dbWorker.role,
            name: dbWorker.name,
            phone: dbWorker.phone,
            is_active: dbWorker.is_active,
            failed_attempts: dbWorker.failed_attempts,
            locked_until: dbWorker.locked_until
          };
          if (plainPassword || (dbWorker as any).password_sha256) {
            rowData.password_sha256 = plainPassword ? await hashSHA256(plainPassword) : (dbWorker as any).password_sha256;
          }

          if (isIdUuid) {
            rowData.id = dbWorker.id;
            await client.from('workers').upsert(rowData);
          } else {
            // lookup by username
            const { data: existing } = await client
              .from('workers')
              .select('id, password_sha256')
              .eq('username', dbWorker.username.toLowerCase())
              .maybeSingle();

            if (existing) {
              if (!rowData.password_sha256) {
                rowData.password_sha256 = existing.password_sha256;
              }
              await client.from('workers').update(rowData).eq('id', existing.id);
              dbWorker.id = existing.id;
            } else {
              if (!rowData.password_sha256) {
                rowData.password_sha256 = await hashSHA256('Colaborador123!');
              }
              const { data: inserted } = await client
                .from('workers')
                .insert(rowData)
                .select('id')
                .single();
              if (inserted) {
                dbWorker.id = inserted.id;
              }
            }
          }
        } catch (e) {
          console.error('Supabase worker sync exception:', e);
        }
      }
    }
  }

  static async deleteWorker(id: string): Promise<void> {
    const workers = await this.getWorkers();
    const worker = workers.find(w => w.id === id);
    const updated = workers.filter(w => w.id !== id);
    setLocalStorageItem('shop_workers', updated);
    if (worker) {
      this.logAudit('Admin', 'Eliminar Trabajador', `Se desvinculó al trabajador: ${worker.name}`);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          if (isUUID(id)) {
            await client.from('workers').delete().eq('id', id);
          } else if (worker) {
            await client.from('workers').delete().eq('username', worker.username.toLowerCase());
          }
        } catch (e) {
          console.error('Supabase worker delete error:', e);
        }
      }
    }
  }

  // --- ORDERS ---
  static async getOrders(): Promise<Order[]> {
    if (!this.isReal()) {
      return getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
    }
    const client = this.getClient();
    if (!client) return getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Real orders fetch failed, using local fallback:', error);
        return getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
      }
      return (data || []).map((o: any) => ({
        ...o,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
      }));
    } catch (e) {
      console.warn('Real orders fetch exception:', e);
      return getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
    }
  }

  static async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'status'>): Promise<Order> {
    const orders = await this.getOrders();
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
      status: 'pendiente',
    };
    orders.unshift(newOrder);
    setLocalStorageItem('shop_orders', orders);

    // Apply stock deduction automatically on available items
    const products = await this.getProducts();
    for (const item of newOrder.items) {
      const targetProd = products.find(p => p.id === item.product_id);
      if (targetProd) {
        const newStock = Math.max(0, targetProd.stock - item.quantity);
        targetProd.stock = newStock;
        await this.saveProduct(targetProd);
      }
    }

    this.logAudit('Cliente ' + orderData.customer_name, 'Pedido Creado', `Se emitió el pedido ${newOrder.invoice_number} por un valor de ${orderData.total}`);

    // Real DB Sync
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('orders')
            .insert({
              invoice_number: newOrder.invoice_number,
              customer_name: newOrder.customer_name,
              customer_lastname: newOrder.customer_lastname,
              customer_phone: newOrder.customer_phone,
              customer_address: newOrder.customer_address,
              customer_reference: newOrder.customer_reference,
              customer_nickname: newOrder.customer_nickname,
              items: newOrder.items,
              total: newOrder.total,
              status: newOrder.status,
              processed_by: newOrder.processed_by,
              processed_role: newOrder.processed_role
            })
            .select('id')
            .single();
          if (data) {
            newOrder.id = data.id;
          }
          if (error) console.error('Supabase write order error:', error);
        } catch (e) {
          console.error('Supabase write order exception:', e);
        }
      }
    }
    return newOrder;
  }

  static async updateOrderStatus(
    orderId: string, 
    status: 'confirmado' | 'cancelado', 
    processedBy: string, 
    processedRole: string
  ): Promise<void> {
    const orders = await this.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      const oldStatus = orders[idx].status;
      orders[idx].status = status;
      orders[idx].processed_by = processedBy;
      orders[idx].processed_role = processedRole;
      orders[idx].updated_at = new Date().toISOString();
      setLocalStorageItem('shop_orders', orders);

      // Revert stock if canceled
      if (status === 'cancelado' && oldStatus !== 'cancelado') {
        const products = await this.getProducts();
        for (const item of orders[idx].items) {
          const targetProd = products.find(p => p.id === item.product_id);
          if (targetProd) {
            targetProd.stock += item.quantity;
            await this.saveProduct(targetProd);
          }
        }
      }

      this.logAudit(
        processedBy, 
        status === 'confirmado' ? 'Confirmar Pedido' : 'Cancelar Pedido', 
        `Pedido ${orders[idx].invoice_number} marcado como ${status} por el colaborador.`
      );

      // Real database status sync
      if (this.isReal()) {
        const client = this.getClient();
        if (client) {
          try {
            await client
              .from('orders')
              .update({
                status,
                processed_by: processedBy,
                processed_role: processedRole,
                updated_at: new Date().toISOString()
              })
              .eq(isUUID(orderId) ? 'id' : 'invoice_number', isUUID(orderId) ? orderId : orders[idx].invoice_number);
          } catch (e) {
            console.error('Supabase order status sync fail:', e);
          }
        }
      }
    }
  }

  // --- CONFIG / SETTINGS ---
  static async getSettings(): Promise<ShopSettings> {
    if (!this.isReal()) {
      return getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
    }
    const client = this.getClient();
    if (!client) return getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
    try {
      const { data, error } = await client
        .from('shop_settings')
        .select('*')
        .eq('id', 'singleton')
        .maybeSingle();
      if (error || !data) {
        return getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
      }
      return data;
    } catch (e) {
      return getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
    }
  }

  static async saveSettings(settings: ShopSettings, adminName: string): Promise<void> {
    setLocalStorageItem('shop_settings', settings);
    this.logAudit(adminName, 'Actualizar Configuración', `Se modificaron los datos globales de la tienda.`);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client
            .from('shop_settings')
            .upsert({ id: 'singleton', ...settings });
        } catch (e) {
          console.error('Supabase saveSettings error:', e);
        }
      }
    }
  }

  // --- SECURITY ALERTS ---
  static async getAlerts(): Promise<SecurityAlert[]> {
    if (!this.isReal()) {
      return getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
    }
    const client = this.getClient();
    if (!client) return getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
    try {
      const { data, error } = await client
        .from('security_alerts')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) return getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
      return data || [];
    } catch (e) {
      return getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
    }
  }

  static async triggerAlert(type: SecurityAlert['type'], severity: SecurityAlert['severity'], message: string): Promise<void> {
    const alerts = await this.getAlerts();
    const newAlert: SecurityAlert = {
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      resolved: false
    };
    alerts.unshift(newAlert);
    setLocalStorageItem('shop_alerts', alerts);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('security_alerts').insert({
            type,
            severity,
            message,
            resolved: false
          });
        } catch (e) {
          console.error('Supabase triggerAlert exception:', e);
        }
      }
    }
  }

  static async resolveAlert(id: string): Promise<void> {
    const alerts = await this.getAlerts();
    const idx = alerts.findIndex(a => a.id === id);
    if (idx >= 0) {
      alerts[idx].resolved = true;
      setLocalStorageItem('shop_alerts', alerts);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client
            .from('security_alerts')
            .update({ resolved: true })
            .eq(isUUID(id) ? 'id' : 'message', isUUID(id) ? id : (alerts[idx]?.message || ''));
        } catch (e) {
          console.error('Supabase resolve alert exception:', e);
        }
      }
    }
  }

  // --- AUDIT LOGS ---
  static async getAuditLogs(): Promise<AuditLog[]> {
    if (!this.isReal()) {
      return getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
    }
    const client = this.getClient();
    if (!client) return getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
    try {
      const { data, error } = await client
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) return getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
      return data || [];
    } catch (e) {
      return getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
    }
  }

  static logAudit(user: string, action: string, details: string): void {
    const audits = getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
    const newAudit: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      role: 'Sistema',
      action,
      details
    };
    audits.unshift(newAudit);
    setLocalStorageItem('shop_audits', audits);

    const { mode, url, key } = this.getCredentials();
    if (mode === 'real' && url && key) {
      // Dynamic client insertion
      try {
        const client = createClient(url, key);
        client.from('audit_logs').insert({
          user,
          role: 'Colaborador',
          action,
          details
        }).then(({ error }) => {
          if (error) console.error('Auditing insert fail:', error);
        });
      } catch (err) {
        console.error(err);
      }
    }
  }

  // AUTHENTICATION ENGINE WITH SHA-256 (MOCK AND REAL SYNCED)
  static async login(username: string, plainPassword: string): Promise<{ success: boolean; worker?: Worker; error?: string }> {
    const workers = await this.getWorkers();
    const worker = workers.find(w => w.username.toLowerCase() === username.toLowerCase());
    
    if (!worker) {
      await this.triggerAlert('intento_fallido', 'low', `Intento de acceso erróneo. Usuario no existente: "${username}"`);
      return { success: false, error: 'Credenciales inválidas.' };
    }

    if (!worker.is_active) {
      return { success: false, error: 'Esta cuenta se encuentra desactivada por el administrador.' };
    }

    // Check temporary checkout lockout
    if (worker.locked_until) {
      const lockTime = new Date(worker.locked_until).getTime();
      const diff = lockTime - Date.now();
      if (diff > 0) {
        const minutes = Math.ceil(diff / 60000);
        return { success: false, error: `Sección bloqueada por exceso de intentos erróneos. Reintente en ${minutes} min.` };
      } else {
        // Lock expired, reset failed attempts
        worker.failed_attempts = 0;
        worker.locked_until = null;
        await this.saveWorker(worker);
      }
    }

    const inputHash = await hashSHA256(plainPassword);
    const isPassOk = (worker as any).password_sha256 === inputHash;

    if (isPassOk) {
      // Reset attempts
      worker.failed_attempts = 0;
      worker.locked_until = null;
      await this.saveWorker(worker);
      
      this.logAudit(worker.name, 'Inicio de Sesión', `Acceso concedido para rol ${worker.role}`);
      return { success: true, worker };
    } else {
      // Increment failures
      worker.failed_attempts += 1;
      let errorMsg = 'Credenciales inválidas.';

      if (worker.failed_attempts >= 3) {
        const lockoutMinutes = 5;
        const lockedDate = new Date(Date.now() + lockoutMinutes * 60000);
        worker.locked_until = lockedDate.toISOString();
        errorMsg = 'Cuenta bloqueada temporalmente por 5 minutos.';
        
        await this.triggerAlert(
          'bloqueo_usuario',
          'high',
          `Cuenta de "${worker.name}" (${worker.username}) bloqueada temporalmente por 5 minutos debido a 3 fallas de clave consecutivas.`
        );
        this.logAudit('Sistema', 'Bloqueo de Seguridad', `Usuario bloqueado por fallos repetidos: ${worker.username}`);
      } else {
        await this.triggerAlert(
          'intento_fallido',
          'medium',
          `Intento fallido de contraseña número ${worker.failed_attempts} para el usuario: "${worker.username}"`
        );
      }

      await this.saveWorker(worker);
      return { success: false, error: `${errorMsg} Intentos: ${worker.failed_attempts}/3` };
    }
  }
}
