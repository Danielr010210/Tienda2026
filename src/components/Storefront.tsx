import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, ShopSettings, Order, OrderItem } from '../types';
import { SupabaseService } from '../supabaseService';
import { ShoppingCart, Search, X, Phone, MapPin, Clock, Tag, ShoppingBag, Eye, HelpCircle, MessageSquare, Send, Check, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StorefrontProps {
  onAdminClick: () => void;
}

export default function Storefront({ onAdminClick }: StorefrontProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Product for Quick View
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Floating Support/Info widget states
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportTab, setSupportTab] = useState<'info' | 'form'>('info');
  const [supportName, setSupportName] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, c, s] = await Promise.all([
          SupabaseService.getProducts(),
          SupabaseService.getCategories(),
          SupabaseService.getSettings()
        ]);
        setProducts(p.filter(prod => prod.is_visible));
        setCategories(c);
        setSettings(s);
      } catch (err) {
        console.error('Error loading storefront data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Check stock
        if (existing.quantity >= product.stock) {
          alert(`Lo sentimos, solo hay ${product.stock} unidades disponibles en inventario.`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.promotion_discount > 0 
          ? product.price * (1 - product.promotion_discount / 100) 
          : product.price,
        quantity: 1,
        image_url: product.image_url,
        currency: product.currency
      }];
    });

    // Simple visual cue: brief toast or alert
    confetti({
      particleCount: 15,
      spread: 40,
      origin: { y: 0.8 }
    });
  };

  const updateCartQuantity = (id: string, amount: number) => {
    const product = products.find(p => p.id === id);
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + amount;
          if (newQty <= 0) return null;
          if (product && newQty > product.stock) {
            alert(`Lo sentimos, solo hay ${product.stock} unidades en inventario.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as OrderItem[];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Group cart totals by currency
  const getCartTotals = () => {
    const totals: Record<string, number> = {};
    cart.forEach(item => {
      totals[item.currency] = (totals[item.currency] || 0) + (item.price * item.quantity);
    });
    return totals;
  };

  const formatPrice = (val: number, curr: string) => {
    return new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2 }).format(val) + ' ' + curr;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName || !customerPhone) {
      alert('Por favor complete su nombre y número de contacto.');
      return;
    }
    if (deliveryType === 'delivery' && !deliveryAddress) {
      alert('Por favor ingrese una dirección de envío.');
      return;
    }

    const totals = getCartTotals();
    const mainCurrency = settings?.currency || 'USD';
    const totalAmount = totals[mainCurrency] || Object.values(totals)[0] || 0;

    const orderId = `ped-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: cart,
      total: totalAmount,
      currency: mainCurrency,
      status: 'pending',
      delivery_type: deliveryType,
      address: deliveryType === 'delivery' ? deliveryAddress : undefined,
      notes: notes || undefined,
      whatsapp_sent: true
    };

    try {
      // Save order to Supabase
      await SupabaseService.saveOrder(newOrder);

      // Reduce product stocks in Supabase
      for (const item of cart) {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          const updatedStock = Math.max(0, prod.stock - item.quantity);
          await SupabaseService.saveProduct({ ...prod, stock: updatedStock });
          
          // Log high-risk alert if stock is critical (e.g. < 3)
          if (updatedStock < 3) {
            await SupabaseService.createSecurityAlert(
              'stock_critico',
              'high',
              `Inventario críticamente bajo para ${prod.name} (${updatedStock} unidades restante).`
            );
          }
        }
      }

      // Log action
      await SupabaseService.logAction(
        'Cliente',
        'Cliente',
        'Creación de Pedido',
        `El cliente ${customerName} creó el pedido ${orderId} por WhatsApp.`
      );

      // Create WhatsApp message
      let msg = `*🛒 NUEVO PEDIDO: ${orderId}*\n\n`;
      msg += `👤 *Cliente:* ${customerName}\n`;
      msg += `📞 *Teléfono:* ${customerPhone}\n`;
      msg += `📦 *Método:* ${deliveryType === 'delivery' ? 'Envío a Domicilio 🛵' : 'Recogida en Tienda 🏬'}\n`;
      if (deliveryType === 'delivery') {
        msg += `📍 *Dirección:* ${deliveryAddress}\n`;
      }
      if (notes) {
        msg += `📝 *Notas:* ${notes}\n`;
      }
      msg += `\n*📦 PRODUCTOS:*\n`;
      cart.forEach(item => {
        msg += `• ${item.quantity}x ${item.name} (${formatPrice(item.price, item.currency)})\n`;
      });
      msg += `\n*💵 TOTALES POR MONEDA:*\n`;
      Object.entries(totals).forEach(([curr, tot]) => {
        msg += `• *Total en ${curr}:* ${formatPrice(tot, curr)}\n`;
      });
      msg += `\n_¡Muchas gracias por su preferencia!_`;

      const whatsappNumber = settings?.whatsapp_number || '7862942257';
      const cleanPhone = whatsappNumber.replace(/\D/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setNotes('');
      setIsCartOpen(false);

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Open WhatsApp in new tab after a brief delay
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 1000);

    } catch (err) {
      console.error('Error completing order:', err);
      alert('Hubo un problema al procesar su pedido. Por favor intente nuevamente.');
    }
  };

  const handleSendSupportWhatsApp = () => {
    if (!supportName || !supportMessage) {
      alert('Por favor complete su nombre y mensaje.');
      return;
    }
    const text = `*💬 NUEVA CONSULTA DE SOPORTE*\n\n👤 *Nombre:* ${supportName}\n📞 *Contacto:* ${supportPhone || 'No especificado'}\n\n*Mensaje/Pregunta:*\n${supportMessage}\n\n_Enviado desde la Tienda Virtual_`;
    const formattedPhone = (settings?.whatsapp_number || settings?.contact_number || '+17862942257').replace(/\D/g, '');
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName || !supportMessage) return;

    const inquiry = {
      id: 'inq-' + Date.now(),
      name: supportName,
      email_or_phone: supportPhone || 'No especificado',
      subject: 'Consulta de Soporte',
      message: supportMessage,
      status: 'pending' as const,
      created_at: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('shop_support_inquiries') || '[]');
      existing.push(inquiry);
      localStorage.setItem('shop_support_inquiries', JSON.stringify(existing));
    } catch (err) {
      console.error(err);
    }

    setSupportSubmitted(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });

    setTimeout(() => {
      setSupportSubmitted(false);
      setSupportName('');
      setSupportPhone('');
      setSupportMessage('');
      setIsSupportOpen(false);
    }, 4500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#0f172a] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium">Cargando la tienda...</p>
      </div>
    );
  }

  const shopName = settings?.shop_name || 'Cubanos en Miami Shop';
  const shopDesc = settings?.shop_description || 'Artículos premium seleccionados. Rápido, seguro y en un solo toque.';
  const totals = getCartTotals();

  // Dynamic style bindings
  const primaryColor = settings?.color_primary || '#0f172a';
  const headerBgColor = settings?.color_header_bg || '#ffffff';
  const pageBgColor = settings?.color_page_bg || '#F8F9FA';
  const textColor = settings?.color_text || '#1e293b';
  const cardBgColor = settings?.color_card_bg || '#ffffff';
  const fontFamily = settings?.font_family || 'Inter';

  return (
    <div 
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: pageBgColor,
        color: textColor,
        fontFamily: `${fontFamily}, system-ui, sans-serif`
      }}
    >
      
      {/* Promo Banner if visible */}
      {settings?.banner_visible && (
        <div 
          className="py-2.5 px-4 text-center text-xs font-semibold tracking-wide transition-all"
          style={{ backgroundColor: settings.banner_bg || '#1e293b', color: settings.banner_text_color || '#ffffff' }}
        >
          {settings.banner_text}
        </div>
      )}

      {/* Header */}
      <header 
        className="sticky top-0 z-40 border-b border-slate-200/80 shadow-xs backdrop-blur-md transition-colors"
        style={{ backgroundColor: headerBgColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.shop_logo_url ? (
              <img src={settings.shop_logo_url} alt={shopName} className="h-9 w-9 object-contain rounded-md" />
            ) : (
              <span className="text-2xl">{settings?.shop_logo_val || '🛍️'}</span>
            )}
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{shopName}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onAdminClick}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Panel Admin
            </button>
            
            <button 
              id="cart-toggle-btn"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-700 hover:scale-105"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-pink-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-pink-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-pink-400 font-bold tracking-wider text-xs uppercase bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">Miami Gardens, FL</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-3 leading-tight tracking-tight">
            Envía a Cuba de Forma Rápida y Segura
          </h2>
          <p className="mt-4 text-slate-300 text-base max-w-2xl mx-auto leading-relaxed">
            {shopDesc}
          </p>

          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={settings?.smart_search_text || 'Buscar productos por nombre o descripción...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 text-white border border-white/20 focus:border-white/40 placeholder-slate-400 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category Filter Pills */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none scroll-smooth">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all' 
                ? 'text-white shadow-md' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            style={selectedCategory === 'all' ? { backgroundColor: primaryColor } : undefined}
          >
            Todos los Productos ({products.length})
          </button>
          {categories.map(cat => {
            const count = products.filter(p => p.category === cat.name).length;
            return (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.name 
                    ? 'text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
                style={selectedCategory === cat.name ? { backgroundColor: primaryColor } : undefined}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <ShoppingBag size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800 mt-4">No se encontraron productos</h3>
            <p className="text-slate-500 text-sm mt-1">Prueba cambiando los filtros o tu búsqueda inteligente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map(product => {
              const hasPromo = product.promotion_discount > 0;
              const promoPrice = hasPromo ? product.price * (1 - product.promotion_discount / 100) : product.price;
              const isLowStock = product.stock > 0 && product.stock <= 3;
              const isOutOfStock = product.stock === 0;

              return (
                <div 
                  key={product.id}
                  className="rounded-xl border border-slate-200/80 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden relative group hover:-translate-y-0.5"
                  style={{ backgroundColor: cardBgColor }}
                >
                  {/* Promotion tag */}
                  {hasPromo && (
                    <span className="absolute top-2.5 left-2.5 bg-pink-600 text-white text-[10px] font-black px-2 py-1 rounded-full z-10 flex items-center gap-1 shadow-sm">
                      <Tag size={10} /> -{product.promotion_discount}%
                    </span>
                  )}

                  {/* Stock status tag */}
                  {isOutOfStock ? (
                    <span className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10 shadow-sm">
                      Agotado
                    </span>
                  ) : isLowStock ? (
                    <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-sm animate-pulse">
                      Últimas {product.stock} u.
                    </span>
                  ) : null}

                  {/* Image container */}
                  <div className="w-full aspect-square bg-slate-50 relative overflow-hidden group-hover:scale-105 transition-all duration-500">
                    <img 
                      src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';
                      }}
                    />
                    {/* Hover detail overlay */}
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => setSelectedProduct(product)}
                        className="bg-white text-slate-900 p-2 rounded-full shadow-md hover:scale-110 transition-transform"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3.5 sm:p-4 flex flex-col flex-grow">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{product.category}</span>
                    <h4 
                      className="text-xs sm:text-sm font-bold line-clamp-2 mt-1 min-h-[36px] cursor-pointer hover:opacity-80" 
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 flex-grow">
                        {product.description}
                      </p>
                    )}

                    {/* Price and Add button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex flex-col">
                        {hasPromo ? (
                          <>
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatPrice(product.price, product.currency)}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-pink-600">
                              {formatPrice(promoPrice, product.currency)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm font-black">
                            {formatPrice(product.price, product.currency)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className={`w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                          isOutOfStock 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'text-white hover:opacity-90 shadow-xs hover:shadow-md'
                        }`}
                        style={!isOutOfStock ? { backgroundColor: primaryColor } : undefined}
                      >
                        {isOutOfStock ? 'Sin Stock' : 'Añadir'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Info section / Maps & Address */}
      <footer className="bg-white border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8 mt-12 text-slate-600">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-extrabold text-slate-950 text-sm tracking-wider uppercase">Acerca de la Tienda</h4>
            <p className="text-xs leading-relaxed mt-4">
              Realizamos entregas seguras con excelentes tiempos de respuesta. Puedes coordinar toda la entrega mediante WhatsApp de forma personalizada.
            </p>
            <div className="flex items-center gap-2.5 mt-4 text-xs font-semibold text-slate-900">
              <Clock size={16} className="text-slate-500" />
              <span>{settings?.business_hours || 'Lunes a Sábado: 9am-5pm'}</span>
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-950 text-sm tracking-wider uppercase">Información de Contacto</h4>
            <ul className="mt-4 space-y-2.5 text-xs font-semibold">
              <li className="flex items-center gap-2.5 text-slate-900">
                <Phone size={16} className="text-slate-500" />
                <span>Celular/WhatsApp: {settings?.contact_number || '+1 (786) 294-2257'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={16} className="text-slate-500" />
                <span>{settings?.address || '16335 nw 48th Miami Gardens FL 33016'}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-950 text-sm tracking-wider uppercase">Pedidos WhatsApp</h4>
            <p className="text-xs leading-relaxed mt-4">
              Agrega productos a tu carrito y presiona realizar pedido. Serás redirigido a WhatsApp con un mensaje estructurado y listo para enviar al administrador.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-100 mt-10 pt-6 text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} {shopName}. Todos los derechos reservados.
        </div>
      </footer>

      {/* Shopping Cart Drawer Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay */}
            <div 
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={20} className="text-slate-900" />
                      <h2 className="text-lg font-extrabold text-slate-900">Tu Carrito</h2>
                    </div>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <ShoppingBag size={48} className="text-slate-200" />
                        <p className="mt-4 text-sm font-semibold text-slate-500">El carrito está vacío</p>
                        <p className="text-xs text-slate-400 mt-1">Explora nuestros productos y agrega algo especial.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cart.map(item => (
                          <div key={item.id} className="flex gap-4 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-slate-50 border border-slate-100" />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-slate-800 truncate">{item.name}</h5>
                              <p className="text-xs font-black text-slate-900 mt-1">{formatPrice(item.price, item.currency)}</p>
                              
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  <button 
                                    onClick={() => updateCartQuantity(item.id, -1)}
                                    className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-xs font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                                  <button 
                                    onClick={() => updateCartQuantity(item.id, 1)}
                                    className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-xs font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                                <button 
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-[10px] font-bold text-red-500 hover:text-red-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Order Summary Form */}
                        <form onSubmit={handleCheckout} className="border-t border-slate-100 pt-6 mt-6 space-y-4">
                          <h4 className="text-sm font-black text-slate-900">Datos para la Entrega</h4>
                          
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase">Nombre Completo *</label>
                            <input 
                              type="text" 
                              required
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Ej. Juan Pérez"
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase">Teléfono de Contacto (WhatsApp) *</label>
                            <input 
                              type="tel" 
                              required
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="Ej. +1 (786) 294-2257 o 55555482"
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase">Tipo de Entrega *</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button 
                                type="button"
                                onClick={() => setDeliveryType('pickup')}
                                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                  deliveryType === 'pickup'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                Recogida en Tienda
                              </button>
                              <button 
                                type="button"
                                onClick={() => setDeliveryType('delivery')}
                                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                  deliveryType === 'delivery'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                Envío a Domicilio
                              </button>
                            </div>
                          </div>

                          {deliveryType === 'delivery' && (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase">Dirección de Envío Completa *</label>
                              <textarea 
                                required
                                rows={2}
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                placeholder="Calle, número, entre calles, municipio o ciudad..."
                                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50/50 resize-none"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase">Notas adicionales (Opcional)</label>
                            <textarea 
                              rows={2}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Ej. Dejar en el porche, llamar antes de llegar..."
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50/50 resize-none"
                            />
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer */}
                  {cart.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-6 space-y-4">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Totales del Pedido</span>
                        {Object.entries(totals).map(([curr, val]) => (
                          <div key={curr} className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 font-medium">Subtotal en {curr}</span>
                            <span className="font-extrabold text-slate-900">{formatPrice(val, curr)}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={handleCheckout}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Phone size={16} /> Realizar Pedido por WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Quick View Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setSelectedProduct(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"></div>
          <div className="bg-white rounded-2xl max-w-lg w-full relative z-10 overflow-hidden shadow-2xl border border-slate-200/80 animate-in fade-in-50 zoom-in-95 duration-250">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="w-full h-64 bg-slate-50 relative">
              <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              {selectedProduct.promotion_discount > 0 && (
                <span className="absolute top-4 left-4 bg-pink-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-10 shadow-md">
                  -{selectedProduct.promotion_discount}%
                </span>
              )}
            </div>

            <div className="p-6">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedProduct.category}</span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-1 leading-tight">{selectedProduct.name}</h3>
              
              <div className="mt-3 flex items-center gap-3">
                {selectedProduct.promotion_discount > 0 ? (
                  <>
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(selectedProduct.price, selectedProduct.currency)}
                    </span>
                    <span className="text-lg font-black text-pink-600">
                      {formatPrice(selectedProduct.price * (1 - selectedProduct.promotion_discount / 100), selectedProduct.currency)}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-black text-slate-900">
                    {formatPrice(selectedProduct.price, selectedProduct.currency)}
                  </span>
                )}
              </div>

              <p className="text-slate-600 text-xs mt-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {selectedProduct.description || 'Sin descripción detallada disponible.'}
              </p>

              <div className="mt-4 flex justify-between items-center text-xs font-semibold text-slate-500">
                <span>Disponibles en tienda: {selectedProduct.stock} unidades</span>
              </div>

              <button 
                onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                disabled={selectedProduct.stock === 0}
                className="w-full mt-6 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed hover:opacity-90"
                style={selectedProduct.stock > 0 ? { backgroundColor: primaryColor } : undefined}
              >
                {selectedProduct.stock === 0 ? 'Sin existencias' : 'Añadir al Carrito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Support & Store Info Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 font-sans">
        {/* The Cartel (Popup Panel) */}
        {isSupportOpen && (
          <div 
            className="w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300"
            style={{ 
              backgroundColor: cardBgColor,
              color: textColor,
              fontFamily: `${fontFamily}, system-ui, sans-serif`
            }}
          >
            {/* Header */}
            <div 
              className="p-4 flex items-center justify-between text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={18} />
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold">Información y Soporte</h4>
                  <p className="text-[10px] text-white/85 font-medium">Atención al cliente en vivo</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupportOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Switched Navigation */}
            <div className="flex border-b border-slate-100 bg-slate-50">
              <button
                onClick={() => setSupportTab('info')}
                className={`flex-1 py-2.5 text-center text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  supportTab === 'info'
                    ? 'text-slate-900 border-indigo-600'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
                style={supportTab === 'info' ? { borderColor: primaryColor } : undefined}
              >
                Horarios y Ubicación
              </button>
              <button
                onClick={() => setSupportTab('form')}
                className={`flex-1 py-2.5 text-center text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  supportTab === 'form'
                    ? 'text-slate-900 border-indigo-600'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
                style={supportTab === 'form' ? { borderColor: primaryColor } : undefined}
              >
                Escribir al Admin
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {supportTab === 'info' ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Clock className="text-slate-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Horario de Atención</h5>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{settings?.business_hours || 'Lunes a Sábado: 9am-5pm'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <MapPin className="text-slate-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dirección Física</h5>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{settings?.address || '16335 nw 48th Miami Gardens FL 33016'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Phone className="text-slate-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teléfono & WhatsApp</h5>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{settings?.contact_number || '+1 (786) 294-2257'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <DollarSign className="text-slate-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monedas Aceptadas</h5>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(settings?.currencies || ['USD', 'CUP', 'EUR', 'MLC']).map(curr => (
                          <span key={curr} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md uppercase">
                            {curr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      ¿Tienes alguna duda con tu pedido o necesitas un envío personalizado? Ponte en contacto con nosotros directamente.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {supportSubmitted ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in duration-300">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                        <Check size={24} />
                      </div>
                      <h5 className="text-sm font-black text-slate-900">¡Mensaje Recibido!</h5>
                      <p className="text-xs text-slate-500 mt-1.5 max-w-[240px]">
                        Tu consulta ha sido procesada de manera segura. Nos comunicaremos contigo a la brevedad.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSupportSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tu Nombre *</label>
                        <input 
                          type="text"
                          required
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          placeholder="Ej. María Gómez"
                          className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-slate-400 bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tu Teléfono (Opcional)</label>
                        <input 
                          type="tel"
                          value={supportPhone}
                          onChange={(e) => setSupportPhone(e.target.value)}
                          placeholder="Ej. +1 (786) 123-4567"
                          className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-slate-400 bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mensaje o Consulta *</label>
                        <textarea 
                          required
                          rows={3}
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          placeholder="Escribe tu duda sobre los productos, horarios de entrega o formas de pago..."
                          className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-slate-400 bg-slate-50 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1.5">
                        <button
                          type="button"
                          onClick={handleSendSupportWhatsApp}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <Phone size={12} /> WhatsApp Directo
                        </button>
                        <button
                          type="submit"
                          className="py-2 px-3 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Send size={12} /> Enviar Mensaje
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Toggle Button */}
        <button 
          onClick={() => setIsSupportOpen(!isSupportOpen)}
          className="h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 relative cursor-pointer"
          style={{ backgroundColor: primaryColor }}
        >
          {isSupportOpen ? (
            <X size={24} className="animate-in spin-in duration-200" />
          ) : (
            <>
              <HelpCircle size={26} className="animate-in zoom-in-50 duration-200" />
              {/* Pulsing indicator badge */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
