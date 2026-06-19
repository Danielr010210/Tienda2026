/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Order, ShopSettings, ProductReview, SupportInquiry } from '../types';
import { SupabaseService } from '../supabaseService';
import { formatCurrency, generateInvoiceNumber } from '../utils';
import { 
  ShoppingBag, Search, Tag, AlertTriangle, CheckCircle, 
  Send, Wifi, WifiOff, RefreshCw, Smartphone, MapPin, Sparkles, X, ChevronRight, CornerDownRight,
  Star, Info, Eye, HelpCircle, Database
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
  const [phoneCountry, setPhoneCountry] = useState('+53'); // Default Cuba +53
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [nickname, setNickname] = useState('');
  const [formErrors, setFormErrors] = useState<string | null>(null);

  // Invoice / Success Popup
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Offline status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Detail Modal for Product Reviews / Star rating
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Persistent Client Support Sheets / Complaint
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportPhoneCountry, setSupportPhoneCountry] = useState('+53');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportType, setSupportType] = useState<'consulta' | 'queja' | 'problema'>('consulta');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [isSupportSubmitting, setIsSupportSubmitting] = useState(false);

  // About Modal
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Document Title Sync effect to replace "My Google AI Studio App"
  useEffect(() => {
    if (settings?.shop_name) {
      document.title = settings.shop_name;
    } else {
      document.title = 'Boutique Minimal';
    }
  }, [settings?.shop_name]);

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

  // Load reviews when selected product changes in modal
  useEffect(() => {
    if (selectedProduct) {
      loadReviews(selectedProduct.id);
    }
  }, [selectedProduct]);

  const loadReviews = async (pId: string) => {
    try {
      const pReviews = await SupabaseService.getReviews(pId);
      setReviews(pReviews);
    } catch(err) {
      console.error(err);
    }
  };

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
        price_sold: getPromoPrice(item.product),
        currency: item.product.currency || 'CUP'
      }));

      const finalInvoice = generateInvoiceNumber();

      const newOrderPayload = {
        invoice_number: finalInvoice,
        customer_name: name.trim(),
        customer_lastname: lastname.trim(),
        customer_phone: `${phoneCountry} ${phone.trim()}`,
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

    let orderLines = '';
    const orderTotalsByCurrency: Record<string, number> = {};
    successOrder.items.forEach(item => {
      const itemCurrency = item.currency || 'CUP';
      orderLines += `• ${item.quantity}x ${item.product_name} - (${itemCurrency} ${item.price_sold})\n`;
      orderTotalsByCurrency[itemCurrency] = (orderTotalsByCurrency[itemCurrency] || 0) + (item.price_sold * item.quantity);
    });

    const totalToPayString = Object.entries(orderTotalsByCurrency)
      .map(([curr, total]) => `${curr} ${total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      .join(' + ');

    const isMockModeLabel = SupabaseService.getCredentials().mode === 'mock' ? ' [MODO DEMO]' : '';

    const messageText = `*PEDIDO NUEVO - ${successOrder.invoice_number}${isMockModeLabel}*\n` +
      `----------------------------------------\n` +
      `*Cliente:* ${successOrder.customer_name} ${successOrder.customer_lastname}\n` +
      `${successOrder.customer_nickname ? `*Apodo:* ${successOrder.customer_nickname}\n` : ''}` +
      `*Teléfono:* ${successOrder.customer_phone}\n` +
      `*Dirección:* ${successOrder.customer_address}\n` +
      `${successOrder.customer_reference ? `*Ref:* ${successOrder.customer_reference}\n` : ''}` +
      `----------------------------------------\n` +
      `*Productos:* \n` +
      orderLines +
      `----------------------------------------\n` +
      `*Total a pagar: ${totalToPayString}*\n\n` +
      `Por favor confirme si mi pedido está en proceso de despacho. ¡Muchas gracias!`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${contactPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Submit raw review
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setReviewError('');
    if (!newReviewName.trim()) {
      setReviewError('Por favor introduce tu nombre.');
      return;
    }
    if (!newReviewComment.trim()) {
      setReviewError('Por favor escribe un comentario o reseña.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const payload = {
        product_id: selectedProduct.id,
        customer_name: newReviewName.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim()
      };
      await SupabaseService.saveReview(payload as any);
      setNewReviewComment('');
      setNewReviewName('');
      setNewReviewRating(5);
      // Reload comments
      await loadReviews(selectedProduct.id);
    } catch(err) {
      console.error(err);
      setReviewError('No se pudo enviar la opinión en este momento.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Submit support inquiry (with loading state and multiple clicks protection)
  const handleCreateSupportInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    setSupportSuccess(false);

    if (!supportName.trim()) {
      setSupportError('El nombre es obligatorio.');
      return;
    }
    if (!supportPhone.trim()) {
      setSupportError('El teléfono es obligatorio.');
      return;
    }
    if (!supportMessage.trim()) {
      setSupportError('El mensaje de la consulta es obligatorio.');
      return;
    }

    setIsSupportSubmitting(true);
    try {
      const payload = {
        customer_name: supportName.trim(),
        customer_phone: `${supportPhoneCountry} ${supportPhone.trim()}`,
        inquiry_type: supportType,
        message: supportMessage.trim(),
        status: 'pending'
      };
      await SupabaseService.saveSupportInquiry(payload as any);
      setSupportSuccess(true);
      // Empty fields
      setSupportName('');
      setSupportPhone('');
      setSupportMessage('');
    } catch(err) {
      console.error(err);
      setSupportError('Ocurrió un error al enviar tu reporte, prueba más tarde.');
    } finally {
      setIsSupportSubmitting(false);
    }
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
          {settings?.shop_logo_url ? (
            <img 
              src={settings.shop_logo_url} 
              alt="Logo" 
              className="w-9 h-9 object-cover rounded-lg border border-gray-200" 
            />
          ) : (
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm tracking-widest shadow-inner">
              M
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {settings?.shop_name || 'Boutique Minimal'}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">{settings?.smart_search_text || 'Búsqueda Inteligente • Supabase Live'}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div id="nav-actions" className="flex items-center gap-3 flex-wrap">
          {/* Quick Support Ticket Button */}
          <button 
            onClick={() => {
              setSupportSuccess(false);
              setSupportError('');
              setIsSupportOpen(true);
            }}
            className="text-[11px] bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-2.5 py-1.5 rounded-lg border border-sky-100 transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Soporte</span>
          </button>

          {/* Terminal Admin Icon Button */}
          <button 
            onClick={onAdminOpen}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-gray-100"
            title="Terminal Admin"
          >
            <Database className="w-5 h-5" />
          </button>

          {/* About Modal Trigger Icon */}
          {settings?.about_visible !== false && (
            <button 
              onClick={() => setIsAboutOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              title="Acerca de la tienda"
            >
              <Info className="w-5 h-5" />
            </button>
          )}

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
              const currencySymbol = product.currency || 'CUP';
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

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setReviewError('');
                            setNewReviewName('');
                            setNewReviewRating(5);
                            setNewReviewComment('');
                            setSelectedProduct(product);
                          }}
                          className="text-xs font-semibold px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-gray-200/60 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>

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
                  const currencySymbol = item.product.currency || 'CUP';
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
                    <span className="text-right flex flex-col items-end gap-1">
                      {(() => {
                        const cartTotalsByCurrency = cart.reduce((acc, item) => {
                          const currency = item.product.currency || 'CUP';
                          const finalPrice = getPromoPrice(item.product);
                          acc[currency] = (acc[currency] || 0) + finalPrice * item.quantity;
                          return acc;
                        }, {} as Record<string, number>);
                        return Object.entries(cartTotalsByCurrency).map(([curr, total]) => (
                          <div key={curr} className="text-base font-extrabold text-slate-950">
                            {formatCurrency(Number(total), curr)}
                          </div>
                        ));
                      })()}
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
                  <div className="flex gap-1.5">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      className="text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="+53">🇨🇺 +53</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+506">🇨🇷 +506</option>
                      <option value="+57">🇨🇴 +57</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 51234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-inner"
                    />
                  </div>
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
                <div className="text-right">
                  {(() => {
                    const cartTotalsByCurrency = cart.reduce((acc, item) => {
                      const currency = item.product.currency || 'CUP';
                      const finalPrice = getPromoPrice(item.product);
                      acc[currency] = (acc[currency] || 0) + finalPrice * item.quantity;
                      return acc;
                    }, {} as Record<string, number>);
                    return Object.entries(cartTotalsByCurrency).map(([curr, total]) => (
                      <div key={curr} className="text-base text-slate-900 font-extrabold">
                        {formatCurrency(Number(total), curr)}
                      </div>
                    ));
                  })()}
                </div>
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

      {/* About Modal overlay */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-scale-up">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">Sobre Nosotros</h3>
              </div>
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg cursor-pointer animate-fade-in"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh] text-xs text-slate-600 space-y-4">
              <div className="text-center pb-4 border-b border-gray-100">
                <h4 className="text-base font-bold text-slate-900">{settings?.shop_name || 'Boutique Minimal'}</h4>
                <p className="text-[10px] text-slate-400 font-medium">Establecimiento de confianza</p>
              </div>
              <p className="whitespace-pre-line leading-relaxed text-slate-700">
                {settings?.about_text || 'Bienvenidos a nuestra tienda virtual premium. Ofrecemos el mejor servicio de despacho local inmediato.'}
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <p className="font-bold text-slate-800 text-[10px] uppercase">Datos de Contacto:</p>
                <p>📍 Dirección: {settings?.address || 'Sin dirección declarada'}</p>
                <p>⌚ Horarios: {settings?.business_hours || 'Sin horario declarado'}</p>
                <p>📞 Teléfono: {settings?.contact_number || 'Sin teléfono'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Inquiry / PQRS Form Modal */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-scale-up">
            <div className="px-5 py-4 bg-sky-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm">Soporte y Atención al Cliente</h3>
                  <p className="text-[9px] text-sky-300">¿Dudas, quejas o problemas? Cuéntanos tu caso</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupportOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupportInquiry} className="p-6 space-y-4">
              {supportSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold">¡Tu caso ha sido enviado!</p>
                  <p className="text-[10px] text-slate-500">Nuestro equipo de gerencia y administración atenderá tu solicitud a la brevedad. Gracias por tu reporte.</p>
                  <button 
                    type="button"
                    onClick={() => {
                      setSupportSuccess(false);
                      setIsSupportOpen(false);
                    }}
                    className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-bold"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <>
                  {supportError && (
                    <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold">
                      {supportError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        required
                        placeholder="Ej: Sofía Rodríguez"
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Teléfono de Contacto <span className="text-red-500">*</span></label>
                      <div className="flex gap-1">
                        <select
                          value={supportPhoneCountry}
                          onChange={(e) => setSupportPhoneCountry(e.target.value)}
                          className="text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="+53">🇨🇺 +53</option>
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+52">🇲🇽 +52</option>
                        </select>
                        <input 
                          type="text"
                          required
                          placeholder="Ej: 51234567"
                          value={supportPhone}
                          onChange={(e) => setSupportPhone(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Asunto / Tipo de Solicitud</label>
                    <select
                      value={supportType}
                      onChange={(e) => setSupportType(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="consulta">Consulta general / Duda</option>
                      <option value="queja">Queja sobre el servicio / Reclamación</option>
                      <option value="problema">Problema técnico de cobro o entrega</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Detalle de tu Mensaje <span className="text-red-500">*</span></label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Explica detalladamente tu inconformidad o duda sobre un pedido o producto..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSupportOpen(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-4 py-2 border border-gray-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      disabled={isSupportSubmitting}
                      className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {isSupportSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Caso</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Product Details & Ratings Modal overlay */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] animate-scale-up">
            
            {/* Product Image Panel */}
            <div className="w-full md:w-1/2 bg-slate-50 relative flex items-center justify-center border-r border-gray-100 min-h-[220px]">
              <img 
                src={selectedProduct.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600'} 
                alt={selectedProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover max-h-[250px] md:max-h-full"
              />
              <span className="absolute top-3 left-3 text-[9px] font-bold bg-slate-900 text-white uppercase px-2 py-0.5 rounded shadow-sm">
                {selectedProduct.category}
              </span>
            </div>

            {/* Content & Review Form Panel */}
            <div className="w-full md:w-1/2 flex flex-col justify-between overflow-y-auto p-6 space-y-4">
              
              {/* Header Info */}
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">{selectedProduct.name}</h3>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer shrink-0 ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{selectedProduct.description}</p>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-slate-950">
                    {formatCurrency(getPromoPrice(selectedProduct), selectedProduct.currency || 'CUP')}
                  </span>
                  {selectedProduct.promotion_discount > 0 && (
                    <span className="text-[10px] text-slate-400 line-through">
                      {formatCurrency(selectedProduct.price, selectedProduct.currency || 'CUP')}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium ml-auto">Stock: {selectedProduct.stock}</span>
                </div>
              </div>

              {/* Verified reviews & star selection list */}
              <div className="border-t border-gray-100 pt-4 flex-1 flex flex-col min-h-[150px] max-h-[200px] overflow-y-auto space-y-2">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Opiniones de Clientes ({reviews.length})</p>
                
                {reviews.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs my-auto">
                    <p>No hay valoraciones aún.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">¡Sé el primero en dar tu opinión!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviews.map(rev => (
                      <div key={rev.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100/60 text-xs">
                        <div className="flex items-center justify-between font-bold text-[10px] text-slate-700">
                          <span>{rev.customer_name}</span>
                          <div className="flex items-center gap-0.5 text-amber-400 animate-fade-in">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 fill-current ${i < rev.rating ? 'text-amber-400' : 'text-slate-200'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 mt-1 pl-0.5 leading-relaxed font-medium">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form to leave a review */}
              <form onSubmit={handleCreateReview} className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Dejar tu Valoración</p>
                {reviewError && (
                  <div className="p-2.5 bg-red-50 text-red-700 border border-red-100 rounded-lg text-[10px] font-bold">
                    {reviewError}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text"
                    required
                    placeholder="Tu Nombre (Ej: Pedro)"
                    value={newReviewName}
                    onChange={(e) => setNewReviewName(e.target.value)}
                    className="text-xs p-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                  
                  {/* Stars input */}
                  <div className="flex items-center gap-1 justify-center bg-slate-50 border border-gray-200 rounded-lg px-2">
                    <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">ESTRELLAS:</span>
                    <select
                      value={newReviewRating}
                      onChange={(e) => setNewReviewRating(Number(e.target.value))}
                      className="text-xs font-bold text-amber-500 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                      <option value="4">⭐⭐⭐⭐ (4)</option>
                      <option value="3">⭐⭐⭐ (3)</option>
                      <option value="2">⭐⭐ (2)</option>
                      <option value="1">⭐ (1)</option>
                    </select>
                  </div>
                </div>

                <input 
                  type="text"
                  required
                  placeholder="Escribe tu reseña breve..."
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                />

                <div className="flex justify-between items-center pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProduct) addToCart(selectedProduct);
                    }}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Añadir al carrito</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReview ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>Opinar</span>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Footer minimal info */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 px-6 mt-16 text-xs text-center font-medium">
        <p>© 2026 {settings?.shop_name || 'Boutique Minimal'}. Todos los derechos reservados.</p>
        <div className="mt-2 text-[10px] text-slate-500 max-w-md mx-auto space-y-1">
          <p>⌚ Horario de Atención: <strong>{settings?.business_hours || 'Lun a Sáb'}</strong></p>
          <p>📍 Dirección de la Tienda: {settings?.address || 'Sin dirección declarada'}</p>
          <p className="text-slate-600 mt-2">
            Sistema Seguro SHA-256 elástico para despacho instantáneo virtual.
          </p>
        </div>
      </footer>
    </div>
  );
}
