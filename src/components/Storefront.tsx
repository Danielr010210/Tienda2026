/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Order, ShopSettings } from '../types';
import { SupabaseService } from '../supabaseService';
import { formatCurrency, generateInvoiceNumber } from '../utils';
import { 
  ShoppingBag, Search, Tag, AlertTriangle, CheckCircle, 
  Send, Wifi, WifiOff, RefreshCw, Smartphone, MapPin, Sparkles, X, ChevronRight, CornerDownRight 
} from 'lucide-react';

interface StorefrontProps {
  onAdminOpen: () => void;
  productsRefresher: number; // Trigger reload when admin updates products
}

export default function Storefront({ onAdminOpen, productsRefresher }: StorefrontProps) {
  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Navigation
  const [selectedCategory, setSelectedCategory] = useState<string>('General');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart States
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout Form States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [nickname, setNickname] = useState('');
  const [formErrors, setFormErrors] = useState<string | null>(null);

  // Invoice / Success Popup
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Offline status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch shop data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const rawProds = await SupabaseService.getProducts();
        const rawSettings = await SupabaseService.getSettings();
        setProducts(rawProds);
        setSettings(rawSettings);
      } catch (e) {
        console.error('Error fetching storefront data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productsRefresher]);

  // Extract all categories dynamically from visible products
  const categories: string[] = ['General', ...Array.from(new Set(products
    .filter(p => p.is_visible)
    .map(p => p.category)
  ))] as string[];

  // Filtering products
  const filteredProducts = products.filter(p => {
    // 1. Must be visible to customers
    if (!p.is_visible) return false;
    
    // 2. Category match
    const matchesCategory = selectedCategory === 'General' || p.category.toLowerCase() === selectedCategory.toLowerCase();

    // 3. Search query match
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Helper inside the store to compute price with discount applied
  const getPromoPrice = (product: Product): number => {
    if (product.promotion_discount > 0) {
      return product.price * (1 - product.promotion_discount / 100);
    }
    return product.price;
  };

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx >= 0) {
        const currentQty = prev[idx].quantity;
        if (currentQty >= product.stock) {
          return prev; // Stop exceeding stock limit
        }
        const updated = [...prev];
        updated[idx] = { ...prev[idx], quantity: currentQty + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (prodId: string, delta: number) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === prodId);
      if (idx === -1) return prev;
      const target = prev[idx];
      const newQty = target.quantity + delta;

      if (newQty <= 0) {
        return prev.filter(item => item.product.id !== prodId);
      }

      const availableStock = target.product.stock;
      if (newQty > availableStock) {
        return prev; // Exceeded stock limit, return unchanged
      }

      const updated = [...prev];
      updated[idx] = { ...target, quantity: newQty };
      return updated;
    });
  };

  const cartTotal = cart.reduce((acc, item) => {
    const finalPrice = getPromoPrice(item.product);
    return acc + finalPrice * item.quantity;
  }, 0);

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Submit checkout
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors(null);

    // Form validations
    if (!name.trim()) return setFormErrors('El Nombre es obligatorio.');
    if (!lastname.trim()) return setFormErrors('El Apellido es obligatorio.');
    if (!phone.trim()) return setFormErrors('El Teléfono es obligatorio.');
    if (!/^\d+$/.test(phone.trim())) {
      return setFormErrors('El Teléfono debe contener exclusivamente números.');
    }
    if (!address.trim()) return setFormErrors('La Dirección de entrega es obligatoria.');

    try {
      const formattedItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price_sold: getPromoPrice(item.product)
      }));

      const finalInvoice = generateInvoiceNumber();

      const newOrderPayload = {
        invoice_number: finalInvoice,
        customer_name: name.trim(),
        customer_lastname: lastname.trim(),
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        customer_reference: reference.trim().length > 0 ? reference.trim() : undefined,
        customer_nickname: nickname.trim().length > 0 ? nickname.trim() : undefined,
        items: formattedItems,
        total: cartTotal,
      };

      const finalCreatedOrder = await SupabaseService.createOrder(newOrderPayload);
      
      setSuccessOrder(finalCreatedOrder);
      // Clean states
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      
      // Reset form variables
      setName('');
      setLastname('');
      setPhone('');
      setAddress('');
      setReference('');
      setNickname('');
    } catch (err) {
      console.error('Error creating order:', err);
      setFormErrors('No se pudo procesar la compra. Reintente por favor.');
    }
  };

  // Launch WhatsApp pre-formulated message
  const handleWhatsAppSend = () => {
    if (!successOrder || !settings) return;

    const contactPhone = settings.whatsapp_number || '34600000000';
    const currency = settings.currency || '€';

    let orderLines = '';
    successOrder.items.forEach(item => {
      orderLines += `• ${item.quantity}x ${item.product_name} - (${currency}${item.price_sold})\n`;
    });

    const isMockModeLabel = SupabaseService.getCredentials().mode === 'mock' ? ' [MODO DEMO]' : '';

    const messageText = `*PEDIDO NUEVO - ${successOrder.invoice_number}${isMockModeLabel}*\n` +
      `----------------------------------------\n` +
      `*Cliente:* ${successOrder.customer_name} ${successOrder.customer_lastname}\n` +
      `${successOrder.customer_nickname ? `*Apodo:* ${successOrder.customer_nickname}\n` : ''}` +
      `*Teléfono:* ${successOrder.customer_phone}\n` +
      `*Dirección:* ${successOrder.customer_address}\n` +
      `${successOrder.customer_reference ? `*Ref:* ${successOrder.customer_reference}\n` : ''}` +
      `----------------------------------------\n` +
      `*Productos заказаados:*\n` +
      orderLines +
      `----------------------------------------\n` +
      `*Total a pagar: ${formatCurrency(successOrder.total, currency)}*\n\n` +
      `Por favor confirme si mi pedido está en proceso de despacho. ¡Muchas gracias!`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${contactPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-slate-800 flex flex-col font-sans transition-colors duration-300">
      
      {/* Network Alert (Offline support badge) */}
      {!isOnline && (
        <div id="net-offline-banner" className="bg-amber-500 text-white text-[12px] py-1.5 px-4 text-center font-medium tracking-tight flex items-center justify-center gap-2 transition-all">
          <WifiOff className="w-3.5 h-3.5 animate-bounce" />
          <span>Trabajando en modo fuera de servicio; tu compra se guardará localmente.</span>
        </div>
      )}

      {/* Luxury Minimalist Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm tracking-widest shadow-inner">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {settings?.shop_name || 'Boutique Minimal'}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Búsqueda Inteligente • Supabase Live</p>
          </div>
        </div>

        {/* Quick actions */}
        <div id="nav-actions" className="flex items-center gap-3">
          <button 
            onClick={onAdminOpen}
            className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold px-3.5 py-1.5 rounded-lg border border-gray-200/60 transition-all shadow-sm cursor-pointer"
          >
            Terminal Admin
          </button>

          {/* Cart Icon / Action */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            id="btn-main-cart"
          >
            <ShoppingBag className="w-5.5 h-5.5" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-teal-600 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-white scale-100 transition-transform">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Banner Section */}
        <div className="mb-8 p-8 bg-slate-900 rounded-2xl text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border border-slate-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="z-10 text-center md:text-left max-w-lg">
            <span className="bg-teal-500/20 text-teal-300 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-teal-500/30">
              Despacho en 24 Horas
            </span>
            <h2 className="text-2xl md:text-3.5xl font-bold tracking-tight mt-3 text-white leading-tight">
              {settings?.shop_name || 'Boutique Minimal'}
            </h2>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              {settings?.shop_description || 'Explora nuestro catálogo exclusivo de tecnología, moda, audio e indumentaria.'}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">⌚ {settings?.business_hours || 'Lun a Sáb'}</span>
              <span className="flex items-center gap-1">📍 {settings?.address || 'Madrid, España'}</span>
            </div>
          </div>
          <div className="z-10 bg-slate-800/60 p-4 border border-slate-700/60 rounded-xl text-center backdrop-blur shrink-0 w-full md:w-auto">
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Asistencia Directa</p>
            <p className="text-sm font-bold text-teal-400 mt-1">{settings?.contact_number || '+34 600 000 000'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Soporte por WhatsApp automatizado</p>
          </div>
        </div>

        {/* Searching and Tabs area */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscador inteligente por nombre, categoría o detalle..."
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-700 shadow-sm transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Total count of matches indicator */}
            <div className="text-xs text-slate-400 font-medium md:text-right">
              Mostrando <strong className="text-slate-700">{filteredProducts.length}</strong> de <strong className="text-slate-700">{products.filter(p => p.is_visible).length}</strong> productos
            </div>
          </div>

          {/* Categoría tabs selector */}
          <div id="category-tabs" className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-4 py-2 rounded-xl border font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-950 text-white border-slate-950 shadow-sm' 
                      : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat === 'General' ? 'Todos los Productos' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid of items */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Buscando productos de la base de datos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-sm">No encontramos productos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Prueba modificando los filtros, vaciando tu buscador o agregando nuevos ítems desde el terminal administrador.
            </p>
            {selectedCategory !== 'General' && (
              <button 
                onClick={() => setSelectedCategory('General')}
                className="mt-4 text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
              >
                Volver a Categoría General
              </button>
            )}
          </div>
        ) : (
          <div id="product-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
              const discountedPrice = getPromoPrice(product);
              const currencySymbol = settings?.currency || '€';
              const isLowStock = product.stock > 0 && product.stock <= 5;
              const isOutOfStock = product.stock <= 0;

              return (
                <div 
                  key={product.id}
                  id={`prod-card-${product.id}`}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Image container */}
                  <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
                    <img 
                      src={product.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600'} 
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />

                    {/* Stock alert bar overlay */}
                    {isOutOfStock ? (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm">
                          Agotado / Sin Inventario
                        </span>
                      </div>
                    ) : isLowStock ? (
                      <div className="absolute top-3 left-3 bg-amber-500 text-white font-semibold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <AlertTriangle className="w-3 h-3" />
                        <span>¡Últimas {product.stock} unidades!</span>
                      </div>
                    ) : (
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-700 font-medium text-[9px] px-2.5 py-1 rounded-full shadow-sm">
                        Stock: {product.stock}
                      </div>
                    )}

                    {/* Promo badge badge */}
                    {product.promotion_discount > 0 && !isOutOfStock && (
                      <div className="absolute top-3 right-3 bg-red-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-md shadow-sm animate-pulse flex items-center gap-0.5">
                        <Tag className="w-3 h-3" />
                        <span>-{product.promotion_discount}% DESCUENTO</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                        {product.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight mt-2.5 group-hover:text-teal-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    {/* Footer price & action */}
                    <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        {product.promotion_discount > 0 ? (
                          <div className="space-y-0.5">
                            <p className="text-[11px] text-slate-400 line-through">
                              {formatCurrency(product.price, currencySymbol)}
                            </p>
                            <p className="text-base font-extrabold text-red-600 tracking-tight">
                              {formatCurrency(discountedPrice, currencySymbol)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-base font-extrabold text-slate-900 tracking-tight">
                            {formatCurrency(product.price, currencySymbol)}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-950 hover:bg-slate-900 text-white active:scale-95 shadow-sm'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating sliding Shopping Cart Drawer overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-in-right">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-slate-900" />
                <h3 className="font-bold text-slate-900 text-sm">Tu Carrito ({cartItemsCount})</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Draw items list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                  <ShoppingBag className="w-12 h-12 stroke-1 mb-3 text-slate-300" />
                  <p className="text-xs font-medium">No has agregado productos al carrito.</p>
                  <button 
                    onClick={() => setIsCartOpen(false)} 
                    className="text-xs font-semibold text-teal-600 hover:underline mt-2 cursor-pointer"
                  >
                    Ver el catálogo
                  </button>
                </div>
              ) : (
                cart.map(item => {
                  const finalPrice = getPromoPrice(item.product);
                  const currencySymbol = settings?.currency || '€';
                  return (
                    <div 
                      key={item.product.id}
                      className="flex items-center gap-3.5 p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl"
                    >
                      <img 
                        src={item.product.image_url} 
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-xs truncate">{item.product.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-teal-600 font-bold">{formatCurrency(finalPrice, currencySymbol)}</span>
                          {item.product.promotion_discount > 0 && (
                            <span className="text-[9px] text-slate-400 line-through">
                              {formatCurrency(item.product.price, currencySymbol)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Disponibles en tienda: {item.product.stock}</p>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center border border-gray-200 bg-white rounded-lg overflow-hidden shrink-0">
                        <button 
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs text-slate-800 font-extrabold">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculate and submit */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-slate-50/60">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Cantidad de Artículos:</span>
                    <span className="font-semibold text-slate-700">{cartItemsCount}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-gray-200">
                    <span className="text-sm font-bold text-slate-900">Monto Total:</span>
                    <span className="text-xl font-extrabold text-slate-950">
                      {formatCurrency(cartTotal, settings?.currency || '€')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCart([])}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 p-3 rounded-xl border border-transparent transition-colors cursor-pointer"
                  >
                    Vaciar Carrito
                  </button>
                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="text-xs font-bold bg-slate-950 hover:bg-slate-900 text-white p-3 rounded-xl shadow-md active:scale-98 transition-transform cursor-pointer"
                  >
                    Comprar Pedido
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Form Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-slide-in-up">
            
            {/* Header */}
            <div className="px-6 py-4.5 bg-slate-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Formulario de Confirmación</h3>
                <p className="text-[10px] text-slate-300">Completa tus datos reales para preparar tu ticket</p>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation errors */}
            <form onSubmit={handleConfirmOrder} className="p-6 space-y-4">
              {formErrors && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formErrors}</span>
                </div>
              )}

              {/* Grid 2 Columns names */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Eje: Juan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Eje: Pérez"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Grid 2 Columns phone / nickname */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Teléfono Movil <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Numérico (ej: 654321098)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    Apodo <span className="text-slate-400 text-[8px] font-normal font-sans">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juancho"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Address full info */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Dirección Exacta de Entrega <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Calle, Número, Bloque, Piso, Ciudad, etc."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>

              {/* Reference point (optional) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  Punto de Referencia <span className="text-slate-400 text-[8px] font-normal font-sans">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Cerca del Banco, frente al parque, color porton, etc."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Total review */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Monto final de compra:</span>
                  <p className="text-[10px] text-slate-400">Impuestos y empaque incluidos</p>
                </div>
                <strong className="text-base text-slate-900 font-extrabold">{formatCurrency(cartTotal, settings?.currency || '€')}</strong>
              </div>

              {/* Dialog buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-4 py-2 border border-gray-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl flex items-center gap-1.5 hover:shadow transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Pedido</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Order Popup & WhatsApp Prompt Notification */}
      {successOrder && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl relative text-center animate-scale-up border border-slate-100">
            
            {/* Confetti / Icon */}
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-4 border border-emerald-100">
              <Sparkles className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight">¡Pedido Recibido con Éxito!</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tu factura se ha generado en el panel administrativo de la tienda. Los encargados están listos para despachar su pedido.
            </p>

            {/* Factura Label Code */}
            <div className="my-5 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Número de Factura</span>
              <strong id="invoice-number-display" className="text-2.5xl font-mono text-emerald-950 tracking-widest mt-1">
                {successOrder.invoice_number}
              </strong>
              <div className="mt-2.5 flex items-center gap-1.5 text-[9px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Estado: <strong>Pendiente de Procesamiento</strong></span>
              </div>
            </div>

            {/* Address summary */}
            <div className="text-left bg-slate-50 p-3.5 border border-slate-100 rounded-xl mb-6 space-y-1">
              <p className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Dirección:</span>
              </p>
              <p className="text-xs font-medium text-slate-800 pl-4.5">{successOrder.customer_address}</p>
              {successOrder.customer_nickname && (
                <p className="text-[10px] text-slate-400 pl-4.5 flex items-center gap-1 mt-1">
                  <CornerDownRight className="w-2.5 h-2.5" />
                  <span>Entregar a nombre de: <strong>{successOrder.customer_nickname}</strong></span>
                </p>
              )}
            </div>

            {/* Actions button */}
            <div className="space-y-3">
              <button
                onClick={handleWhatsAppSend}
                className="w-full text-xs font-bold bg-[#25D366] hover:bg-[#20ba56] text-white py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow active:scale-98 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4.5 h-4.5" />
                <span>Enviar Comprobante por WhatsApp</span>
              </button>

              <button
                onClick={() => setSuccessOrder(null)}
                className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar y continuar navegando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer minimal info */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 px-6 mt-16 text-xs text-center font-medium">
        <p>© 2026 {settings?.shop_name || 'Boutique Minimal'}. Todos los derechos reservados.</p>
        <p className="text-[10px] text-slate-500 mt-1">
          Motorizado por React, Tailwind CSS y Supabase Realtime elástico para despacho instantáneo.
        </p>
      </footer>
    </div>
  );
}
