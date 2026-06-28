/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Product, Order, ShopSettings, ProductReview, SupportInquiry, Coupon, ProductVariant } from '../types';
import { SupabaseService } from '../supabaseService';
import { formatCurrency, generateInvoiceNumber } from '../utils';
import { 
  ShoppingBag, Search, Tag, AlertTriangle, CheckCircle, SlidersHorizontal, 
  Send, Wifi, WifiOff, RefreshCw, Smartphone, MapPin, Sparkles, X, ChevronRight, ChevronLeft, ArrowLeft, CornerDownRight,
  Star, Info, Eye, HelpCircle, Database, Phone, Mail, Music, Zap, Package, Compass, Ship, Anchor
} from 'lucide-react';

interface StorefrontProps {
  onAdminOpen: () => void;
  productsRefresher: number; // Trigger reload when admin updates products
  previewSettings?: ShopSettings | null; // Override settings for Test Store live preview
}

export default function Storefront({ onAdminOpen, productsRefresher, previewSettings }: StorefrontProps) {
  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(() => {
    if (previewSettings) return previewSettings;
    const cached = localStorage.getItem('shop_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true); // Flag for database offline status

  // Search & Navigation
  const [selectedCategory, setSelectedCategory] = useState<string>('General');
  const [searchQuery, setSearchQuery] = useState('');
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryContainerRef.current) {
      const scrollAmount = 200;
      categoryContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string | null>(null);

  // Advanced Filters States
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [onlyPromos, setOnlyPromos] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<string>('default'); // 'default', 'price-asc', 'price-desc', 'name-asc', 'discount'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Invoice / Success Popup
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Offline status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Logged-in Staff Session for Inline moderation
  const [loggedWorker, setLoggedWorker] = useState<any>(null);

  // Business Card Popup state
  const [isBusinessCardOpen, setIsBusinessCardOpen] = useState(false);

  // Dynamic Google Maps URL constructor supporting Address, Coords, or Custom Embed iframe
  const getGoogleMapsUrl = (): string => {
    const opt = settings?.maps_option || 'address';
    if (opt === 'coords' && settings?.maps_coords) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(settings.maps_coords.trim())}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    }
    if (opt === 'embed' && settings?.maps_embed_url) {
      let src = settings.maps_embed_url.trim();
      if (src.includes('<iframe')) {
        const match = src.match(/src="([^"]+)"/);
        if (match && match[1]) {
          src = match[1];
        }
      }
      return src;
    }
    // Default or 'address' option
    return `https://maps.google.com/maps?q=${encodeURIComponent(settings?.address || 'Cuba')}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  };

  useEffect(() => {
    const cached = localStorage.getItem('active_worker_session');
    if (cached) {
      try {
        setLoggedWorker(JSON.parse(cached));
      } catch (e) {
        setLoggedWorker(null);
      }
    } else {
      setLoggedWorker(null);
    }
  }, []);

  // Inactivity timeout for worker session: 1 minute
  const handleInactivityLogoutStore = () => {
    if (loggedWorker) {
      setLoggedWorker(null);
      localStorage.removeItem('active_worker_session');
    }
  };

  const logoutStoreRef = useRef(handleInactivityLogoutStore);
  useEffect(() => {
    logoutStoreRef.current = handleInactivityLogoutStore;
  }, [loggedWorker]);

  useEffect(() => {
    if (!loggedWorker) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logoutStoreRef.current();
      }, 60000); // 1 minute without activity
    };

    resetTimer();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(eventName => {
      window.addEventListener(eventName, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(eventName => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [!!loggedWorker]);

  // Detail Modal for Product Reviews / Star rating
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeVariant, setActiveVariant] = useState<any | null>(null);
  const [currentModalImage, setCurrentModalImage] = useState<string>('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
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

  // Fetch shop data on mount/refresher and poll every 15 seconds
  useEffect(() => {
    async function loadData(silent = false) {
      if (!silent) setLoading(true);
      try {
        // Run database connection check
        const connected = await SupabaseService.checkConnection();
        setIsDbConnected(connected);
        
        if (!connected) {
          if (!silent) setLoading(false);
          return;
        }

        const rawProds = await SupabaseService.getProducts();
        setProducts(rawProds);

        // Fetch categories directly from the database table
        const rawCats = await SupabaseService.getCategories();
        setDbCategories(rawCats);

        if (previewSettings) {
          setSettings(previewSettings);
        } else {
          const rawSettings = await SupabaseService.getSettings();
          setSettings(rawSettings);
        }
      } catch (e) {
        console.error('Error fetching storefront data:', e);
        if (!silent) setIsDbConnected(false);
      } finally {
        if (!silent) setLoading(false);
      }
    }

    loadData(false);

    // Dynamic high-frequency background synchronization (polling)
    const interval = setInterval(() => {
      loadData(true);
    }, 15000); // 15 seconds silent autosync

    return () => clearInterval(interval);
  }, [productsRefresher, previewSettings]);

  // Load reviews when selected product changes in modal
  useEffect(() => {
    if (selectedProduct) {
      loadReviews(selectedProduct.id);
      setActiveVariant(null);
      setCurrentModalImage(selectedProduct.image_url || '');
    } else {
      setActiveVariant(null);
      setCurrentModalImage('');
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

  // --- REGISTRO Y SEGUIMIENTO EN VIVO DE VISITANTES ---
  useEffect(() => {
    let activeInterval: any;
    async function initVisitor() {
      let clientIp = 'Unknown IP';
      let country = 'Cuba';
      let city = 'La Habana';

      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const dat = await res.json();
          if (dat.ip) {
            clientIp = dat.ip;
            country = dat.country_name || 'Cuba';
            city = dat.city || 'La Habana';
          }
        }
      } catch (err) {
        try {
          const res2 = await fetch('https://api.ipify.org?format=json');
          if (res2.ok) {
            const dat2 = await res2.json();
            if (dat2.ip) {
              clientIp = dat2.ip;
            }
          }
        } catch (e2) {}
      }

      if (clientIp === 'Unknown IP') {
        let localIp = localStorage.getItem('visitor_my_device_ip');
        if (!localIp) {
          const randomOctets = [
            Math.floor(Math.random() * 80) + 120,
            Math.floor(Math.random() * 200) + 10,
            Math.floor(Math.random() * 200) + 10,
            Math.floor(Math.random() * 250) + 4
          ];
          localIp = randomOctets.join('.');
          localStorage.setItem('visitor_my_device_ip', localIp);
        }
        clientIp = localIp;
      }

      localStorage.setItem('visitor_last_known_ip', clientIp);
      localStorage.setItem('visitor_last_country', country);
      localStorage.setItem('visitor_last_city', city);

      const ua = navigator.userAgent;
      await SupabaseService.recordVisitor(clientIp, 'Inicio de Tienda', ua, country, city);

      activeInterval = setInterval(async () => {
        const currentIp = localStorage.getItem('visitor_last_known_ip') || clientIp;
        const currentCountry = localStorage.getItem('visitor_last_country') || country;
        const currentCity = localStorage.getItem('visitor_last_city') || city;
        await SupabaseService.recordVisitor(currentIp, 'Navegando en Catálogo', ua, currentCountry, currentCity);
      }, 35000); // Heartbeat each 35 seconds to remain "Active now"
    }

    initVisitor();
    return () => {
      if (activeInterval) clearInterval(activeInterval);
    };
  }, []);

  // Track category changes
  useEffect(() => {
    const savedIp = localStorage.getItem('visitor_last_known_ip');
    const country = localStorage.getItem('visitor_last_country') || 'Cuba';
    const city = localStorage.getItem('visitor_last_city') || 'La Habana';
    if (savedIp && selectedCategory) {
      SupabaseService.recordVisitor(savedIp, `Exploró Categoría: ${selectedCategory}`, navigator.userAgent, country, city);
    }
  }, [selectedCategory]);

  // Track detail view
  useEffect(() => {
    const savedIp = localStorage.getItem('visitor_last_known_ip');
    const country = localStorage.getItem('visitor_last_country') || 'Cuba';
    const city = localStorage.getItem('visitor_last_city') || 'La Habana';
    if (savedIp && selectedProduct) {
      SupabaseService.recordVisitor(savedIp, `Abrió Detalle: ${selectedProduct.name}`, navigator.userAgent, country, city);
    }
  }, [selectedProduct]);

  // Load categories directly from database, combined dynamically with active products to ensure zero data-loss
  // Filter: Keep only categories that have at least one visible product assigned to them
  const activeProductCategories = new Set(
    products.filter(p => p.is_visible).map(p => p.category.toLowerCase().trim())
  );

  const categoriesSet = new Set<string>();
  
  // Add database categories if they have at least one visible product assigned
  dbCategories.forEach(c => {
    if (c.name && activeProductCategories.has(c.name.toLowerCase().trim())) {
      categoriesSet.add(c.name.trim());
    }
  });

  // Add any product categories that might wrap around the database categories (or not in db but assigned to visible products)
  products.filter(p => p.is_visible).forEach(p => {
    const normalized = p.category ? p.category.trim() : '';
    if (normalized) {
      // Find case-insensitive match
      const exists = Array.from(categoriesSet).some(existing => existing.toLowerCase().trim() === normalized.toLowerCase());
      if (!exists) {
        categoriesSet.add(p.category.trim());
      }
    }
  });

  const categories: string[] = ['General', ...Array.from(categoriesSet)] as string[];

  // Helper inside the store to compute price with discount applied
  const getPromoPrice = (product: Product, selectedVariant?: ProductVariant): number => {
    const basePrice = (selectedVariant && selectedVariant.price !== undefined && selectedVariant.price !== null)
      ? selectedVariant.price
      : product.price;

    if (product.promotion_discount > 0) {
      return basePrice * (1 - product.promotion_discount / 100);
    }
    return basePrice;
  };

  // Helper to compute unit price taking tiered pricing scales and promotions into account
  const getProductUnitPriceForQty = (product: Product, quantity: number, selectedVariant?: ProductVariant): number => {
    let basePrice = (selectedVariant && selectedVariant.price !== undefined && selectedVariant.price !== null)
      ? selectedVariant.price
      : product.price;

    if (product.quantity_prices && product.quantity_prices.length > 0) {
      // Sort scales descending to find matching threshold
      const sorted = [...product.quantity_prices].sort((a, b) => b.quantity - a.quantity);
      const match = sorted.find(scale => quantity >= scale.quantity);
      if (match) {
        basePrice = match.price;
      }
    }
    if (product.promotion_discount > 0) {
      return basePrice * (1 - product.promotion_discount / 100);
    }
    return basePrice;
  };

  // Advanced Filtering and Sorting of products
  const filteredProducts = products
    .filter(p => {
      // 1. Must be visible to customers
      if (!p.is_visible) return false;
      
      // 2. Category match
      const matchesCategory = selectedCategory === 'General' || p.category.toLowerCase() === selectedCategory.toLowerCase();

      // 3. Search query match
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      // 4. Min Price check (on getPromoPrice)
      const finalPrice = getPromoPrice(p);
      if (minPrice !== '' && finalPrice < minPrice) return false;

      // 5. Max Price check
      if (maxPrice !== '' && finalPrice > maxPrice) return false;

      // 6. Only promo check
      if (onlyPromos && p.promotion_discount <= 0) return false;

      // 7. Only in stock check
      if (onlyInStock && p.stock <= 0) return false;

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const priceA = getPromoPrice(a);
      const priceB = getPromoPrice(b);
      
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'discount') return b.promotion_discount - a.promotion_discount;
      return 0; // default (which is already sorted by sequence)
    });

  // Coupon Action Handlers
  const handleApplyCoupon = async () => {
    setCouponError(null);
    setCouponSuccessMessage(null);
    if (!couponCode.trim()) {
      setCouponError('Introduce un código de cupón.');
      return;
    }

    try {
      const couponsList = await SupabaseService.getCoupons();
      const match = couponsList.find(c => c.code.toUpperCase().trim() === couponCode.toUpperCase().trim());

      if (!match) {
        setCouponError('El cupón no es válido o ha expirado.');
        setAppliedCoupon(null);
        return;
      }

      if (!match.is_active) {
        setCouponError('Este cupón está desactivado.');
        setAppliedCoupon(null);
        return;
      }

      if (match.min_purchase_amount && cartTotal < match.min_purchase_amount) {
        setCouponError(`Compra mínima requerida: ${formatCurrency(match.min_purchase_amount, settings?.currency || 'CUP')}`);
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(match);
      const valText = match.discount_type === 'percent' ? `${match.discount_value}%` : formatCurrency(match.discount_value, settings?.currency || 'CUP');
      setCouponSuccessMessage(`Cupón "${match.code}" aplicado: -${valText}`);
    } catch (e) {
      console.error('Error validation coupon code:', e);
      setCouponError('Error de conexión al validar cupón.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccessMessage(null);
    setCouponError(null);
  };

  // Helper to calculate discounted totals multi_currency
  const getDiscountedTotals = () => {
    const cartTotalsByCurrency = cart.reduce((acc, item) => {
      const currency = item.product.currency || 'CUP';
      const finalPrice = getProductUnitPriceForQty(item.product, item.quantity);
      acc[currency] = (acc[currency] || 0) + finalPrice * item.quantity;
      return acc;
    }, {} as Record<string, number>);

    const discountedTotals: Record<string, number> = {};
    const discountDetails: Record<string, number> = {};

    Object.entries(cartTotalsByCurrency).forEach(([curr, val]) => {
      const total = Number(val);
      let disc = 0;
      if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'percent') {
          disc = (total * appliedCoupon.discount_value) / 100;
        } else if (appliedCoupon.discount_type === 'fixed' && curr === 'CUP') {
          disc = Math.min(total, appliedCoupon.discount_value);
        }
      }
      discountedTotals[curr] = Math.max(0, total - disc);
      discountDetails[curr] = disc;
    });

    return { totals: cartTotalsByCurrency, discountedTotals, discountDetails };
  };

  // Smart Recommendations Engine
  const getSmartRecommendations = (selectedProd: Product | null): Product[] => {
    const cartIds = cart.map(item => item.product.id);
    const excludeIds = new Set<string>();
    if (selectedProd) excludeIds.add(selectedProd.id);
    
    let candidates = products.filter(p => p.is_visible && !excludeIds.has(p.id));

    if (selectedProd) {
      const sameCategory = candidates.filter(p => p.category === selectedProd.category);
      if (sameCategory.length >= 3) return sameCategory.slice(0, 3);
      const others = candidates.filter(p => p.category !== selectedProd.category);
      return [...sameCategory, ...others].slice(0, 3);
    } else {
      const notInCartCandidates = candidates.filter(p => !cartIds.includes(p.id));
      return notInCartCandidates
        .sort((a, b) => b.promotion_discount - a.promotion_discount)
        .slice(0, 3);
    }
  };

  // Cart operations
  const addToCart = (product: Product, selectedVariant?: ProductVariant) => {
    const maxStock = (selectedVariant && selectedVariant.stock !== undefined && selectedVariant.stock !== null)
      ? selectedVariant.stock
      : product.stock;

    if (maxStock <= 0) return;

    setCart(prev => {
      const idx = prev.findIndex(item => 
        item.product.id === product.id && 
        item.selectedVariant?.id === selectedVariant?.id
      );

      if (idx >= 0) {
        const currentQty = prev[idx].quantity;
        if (currentQty >= maxStock) {
          return prev; // Stop exceeding stock limit
        }
        const updated = [...prev];
        updated[idx] = { ...prev[idx], quantity: currentQty + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1, selectedVariant }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (prodId: string, delta: number, variantId?: string) => {
    setCart(prev => {
      const idx = prev.findIndex(item => 
        item.product.id === prodId && 
        item.selectedVariant?.id === variantId
      );
      if (idx === -1) return prev;
      const target = prev[idx];
      const newQty = target.quantity + delta;

      if (newQty <= 0) {
        return prev.filter(item => !(item.product.id === prodId && item.selectedVariant?.id === variantId));
      }

      const availableStock = (target.selectedVariant && target.selectedVariant.stock !== undefined && target.selectedVariant.stock !== null)
        ? target.selectedVariant.stock
        : target.product.stock;

      if (newQty > availableStock) {
        return prev; // Exceeded stock limit, return unchanged
      }

      const updated = [...prev];
      updated[idx] = { ...target, quantity: newQty };
      return updated;
    });
  };

  const cartTotal = cart.reduce((acc, item) => {
    const finalPrice = getProductUnitPriceForQty(item.product, item.quantity, item.selectedVariant);
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
        product_name: item.selectedVariant ? `${item.product.name} (${item.selectedVariant.name})` : item.product.name,
        quantity: item.quantity,
        price_sold: getProductUnitPriceForQty(item.product, item.quantity, item.selectedVariant),
        currency: item.product.currency || 'CUP'
      }));

      const finalInvoice = generateInvoiceNumber();

      let finalDiscountedOrderPrice = cartTotal;
      if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'percent') {
          finalDiscountedOrderPrice = Math.max(0, cartTotal * (1 - appliedCoupon.discount_value / 100));
        } else if (appliedCoupon.discount_type === 'fixed') {
          finalDiscountedOrderPrice = Math.max(0, cartTotal - appliedCoupon.discount_value);
        }
      }

      const newOrderPayload = {
        invoice_number: finalInvoice,
        customer_name: name.trim(),
        customer_lastname: lastname.trim(),
        customer_phone: `${phoneCountry} ${phone.trim()}`,
        customer_address: address.trim(),
        customer_reference: reference.trim().length > 0 ? reference.trim() : undefined,
        customer_nickname: nickname.trim().length > 0 ? nickname.trim() : undefined,
        items: formattedItems,
        total: finalDiscountedOrderPrice,
        coupon_applied: appliedCoupon ? appliedCoupon.code : undefined,
        discount_amount: appliedCoupon ? (cartTotal - finalDiscountedOrderPrice) : 0
      };

      const finalCreatedOrder = await SupabaseService.createOrder(newOrderPayload);
      
      setSuccessOrder(finalCreatedOrder);
      // Clean states
      setCart([]);
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponSuccessMessage(null);
      setCouponError(null);
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

    const couponApplied = (successOrder as any).coupon_applied;
    const discountAmount = (successOrder as any).discount_amount;
    let couponDecoration = '';
    if (couponApplied && discountAmount > 0) {
      couponDecoration = `*Cupón Aplicado:* ${couponApplied} (-${settings?.currency || 'CUP'} ${discountAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n----------------------------------------\n`;
    }

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
      couponDecoration +
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

  // Unified Loading and Database Connection active check screen
  if (loading || !settings || !isDbConnected) {
    return (
      <div 
        className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 text-center font-sans select-none animate-fade-in" 
        id="storefront-initial-loading-screen"
      >
        <div className="max-w-md w-full space-y-8 flex flex-col items-center">
          {/* Symbol of professional updating */}
          <div className="relative">
            <div className="w-24 h-24 bg-teal-500/5 rounded-full flex items-center justify-center border border-teal-500/10">
              <RefreshCw className="w-10 h-10 text-teal-600 animate-spin duration-[2s]" id="sync-icon-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full animate-ping"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full border-2 border-white"></div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sincronizando Boutique</h2>
            <p className="text-[10px] text-teal-600 uppercase font-extrabold tracking-widest leading-none">Estableciendo canal directo con la Base de Datos</p>
          </div>

          {/* Prompt specified professional notification sms placeholder */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl shadow-xs text-xs text-slate-600 font-bold leading-relaxed max-w-sm">
            "{settings?.loading_text || 'Actualizando, por favor espere. Disculpe por las molestias ocasionadas'}"
          </div>

          <p className="text-[10px] text-slate-400 max-w-xs font-sans">
            Cargando inventario, tasas de cambios globales y estilos autorizados en tiempo real directamente desde tu consola Supabase.
          </p>

          {!isDbConnected && !loading && (
            <div className="space-y-3 w-full pt-4 border-t border-gray-100">
              <p className="text-[10px] text-red-500 font-bold">⚠️ No se pudo establecer la conexión activa con Supabase.</p>
              <button 
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const connected = await SupabaseService.checkConnection();
                  setIsDbConnected(connected);
                  if (connected) {
                    window.location.reload();
                  } else {
                    setLoading(false);
                  }
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] p-3.5 rounded-xl transition-all cursor-pointer shadow-md active:scale-98 uppercase tracking-wider"
              >
                Reintentar Conexión Directa
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-slate-850 flex flex-col font-sans transition-colors duration-300">
      
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
          {(() => {
            const logoType = settings?.shop_logo_type || (settings?.shop_logo_url ? 'image' : 'text');
            const logoVal = settings?.shop_logo_val || settings?.shop_logo_url || 'S';
            
            if (logoType === 'image') {
              return (
                <img 
                  src={logoVal} 
                  alt="Logo" 
                  className="w-10 h-10 object-cover rounded-xl border border-gray-200/80 shadow-sm" 
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              );
            }
            return (
              <div className="w-10 h-10 bg-slate-950 text-teal-400 rounded-xl flex items-center justify-center font-bold text-base tracking-widest shadow-md border border-slate-800/80 uppercase">
                {logoVal.substring(0, 3)}
              </div>
            );
          })()}
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
            
            {/* Search Input and Advanced Toggle */}
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
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
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  showAdvancedFilters 
                    ? 'bg-teal-50 text-teal-800 border-teal-200 shadow-inner' 
                    : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'
                }`}
                title="Filtros avanzados"
              >
                <SlidersHorizontal className="w-4 h-4 text-teal-650" />
                <span className="hidden sm:inline">Filtros</span>
              </button>
            </div>

            {/* Total count of matches indicator */}
            <div className="text-xs text-slate-400 font-medium md:text-right">
              Mostrando <strong className="text-slate-700">{filteredProducts.length}</strong> de <strong className="text-slate-700">{products.filter(p => p.is_visible).length}</strong> productos
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="bg-[#FAFBFB] p-4.5 rounded-2xl border border-gray-150 shadow-inner grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-scale-up text-xs">
              
              {/* Price Range */}
              <div className="space-y-1.5 animate-fade-in">
                <span className="block font-bold text-slate-700 uppercase tracking-wide text-[10px]">Rango de Precio ({settings?.currency || 'CUP'})</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs text-slate-700"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Máx"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs text-slate-700"
                  />
                </div>
              </div>

              {/* Sort Order dropdown */}
              <div className="space-y-1.5 animate-fade-in">
                <span className="block font-bold text-slate-700 uppercase tracking-wide text-[10px]">Ordenar por</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs text-slate-700 cursor-pointer font-medium"
                >
                  <option value="default">Por Defecto</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="name-asc">Nombre (A-Z)</option>
                  <option value="discount">Mayor Descuento</option>
                </select>
              </div>

              {/* Checkboxes parameters */}
              <div className="flex flex-col gap-2.5 justify-center pt-2 sm:pt-0">
                <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 select-none text-[11px]">
                  <input
                    type="checkbox"
                    checked={onlyPromos}
                    onChange={(e) => setOnlyPromos(e.target.checked)}
                    className="rounded text-teal-650 focus:ring-teal-500 w-4 h-4 border-gray-300 cursor-pointer"
                  />
                  <span>Sólo ofertas y descuentos</span>
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 select-none text-[11px]">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="rounded text-teal-650 focus:ring-teal-500 w-4 h-4 border-gray-300 cursor-pointer"
                  />
                  <span>Sólo productos en stock</span>
                </label>
              </div>

              {/* Reset Actions button */}
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    setOnlyPromos(false);
                    setOnlyInStock(false);
                    setSortBy('default');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restablecer Filtros</span>
                </button>
              </div>

            </div>
          )}

          {/* Categoría tabs selector with horizontal arrows */}
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer flex items-center justify-center"
              title="Desplazar a la izquierda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div 
              ref={categoryContainerRef}
              id="category-tabs" 
              className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
            >
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

            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer flex items-center justify-center"
              title="Desplazar a la derecha"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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
                  <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden cursor-zoom-in">
                    <img 
                      src={product.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600'} 
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedImage(product.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600');
                      }}
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

                      {product.quantity_prices && product.quantity_prices.length > 0 && (
                        <div className="mt-2.5 space-y-1">
                          <p className="text-[9px] text-teal-600 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span>⚡ Precio por cantidad:</span>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {product.quantity_prices.map((qp, idx) => (
                              <span key={idx} className="bg-teal-50 border border-teal-100/60 text-teal-800 font-bold text-[9px] px-1.5 py-0.5 rounded" title={`Para compras de ${qp.quantity} o más unidades`}>
                                {qp.quantity}+ ud: {formatCurrency(product.promotion_discount > 0 ? qp.price * (1 - product.promotion_discount / 100) : qp.price, currencySymbol)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
                  const finalPrice = getProductUnitPriceForQty(item.product, item.quantity, item.selectedVariant);
                  const currencySymbol = item.product.currency || 'CUP';
                  const availableStock = (item.selectedVariant && item.selectedVariant.stock !== undefined && item.selectedVariant.stock !== null)
                    ? item.selectedVariant.stock
                    : item.product.stock;
                  return (
                    <div 
                      key={`${item.product.id}-${item.selectedVariant?.id || 'base'}`}
                      className="flex items-center gap-3.5 p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl"
                    >
                      <img 
                        src={item.selectedVariant?.image_url || item.product.image_url} 
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-xs truncate">
                          {item.product.name}
                          {item.selectedVariant && (
                            <span className="block text-[10px] text-teal-600 font-extrabold mt-0.5">
                              Variación: {item.selectedVariant.name}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-teal-600 font-bold">{formatCurrency(finalPrice, currencySymbol)}</span>
                          {item.product.promotion_discount > 0 && (
                            <span className="text-[9px] text-slate-400 line-through">
                              {formatCurrency(item.selectedVariant?.price || item.product.price, currencySymbol)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Disponibles en tienda: {availableStock}</p>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center border border-gray-200 bg-white rounded-lg overflow-hidden shrink-0">
                        <button 
                          onClick={() => updateCartQty(item.product.id, -1, item.selectedVariant?.id)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs text-slate-800 font-extrabold">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(item.product.id, 1, item.selectedVariant?.id)}
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
              <div className="p-5 border-t border-gray-100 bg-slate-50/60 shadow-inner">
                
                {/* Cupones de Descuento */}
                <div className="border-b border-gray-250 pb-3 mb-3 bg-white/40 p-2.5 rounded-xl">
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-teal-650" />
                    <span>¿Tienes un código de descuento?</span>
                  </span>
                  {!appliedCoupon ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ej: VERANO10"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-white border border-gray-250 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase font-mono font-bold"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="bg-slate-900 text-teal-300 font-bold px-3 py-1 text-[11px] rounded-lg hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-teal-50 border border-teal-150 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-teal-850">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold tracking-wide uppercase font-mono bg-teal-100 px-1.5 py-0.5 rounded text-[10px]">{appliedCoupon.code}</span>
                        <span className="text-slate-650">-{appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} ${settings?.currency || 'CUP'}`}</span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer text-[10px]"
                        title="Quitar cupón"
                      >
                        Quitar
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-[10px] text-red-500 font-bold mt-1.5 animate-pulse">❌ {couponError}</p>
                  )}
                  {couponSuccessMessage && (
                    <p className="text-[10px] text-teal-750 font-black mt-1.5 bg-teal-50/50 p-1 rounded-md border border-teal-100">✅ {couponSuccessMessage}</p>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Cantidad de Artículos:</span>
                    <span className="font-semibold text-slate-700">{cartItemsCount}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-gray-200">
                    <span className="text-sm font-bold text-slate-900">Monto Total:</span>
                    <span className="text-right flex flex-col items-end gap-1">
                      {(() => {
                        const { totals, discountedTotals, discountDetails } = getDiscountedTotals();
                        return Object.entries(totals).map(([curr, total]) => {
                          const disc = discountDetails[curr] || 0;
                          const discTotal = discountedTotals[curr] || 0;
                          return (
                            <div key={curr} className="text-right">
                              {disc > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="text-[10px] text-slate-400 line-through">
                                    {formatCurrency(Number(total), curr)}
                                  </div>
                                  <div className="text-[10px] text-teal-600 font-bold">
                                    Ahorro: -{formatCurrency(disc, curr)}
                                  </div>
                                  <div className="text-base font-extrabold text-slate-950">
                                    {formatCurrency(discTotal, curr)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-base font-extrabold text-slate-950">
                                  {formatCurrency(Number(total), curr)}
                                </div>
                              )}
                            </div>
                          );
                        });
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
                  <span className="text-slate-500 font-medium font-sans">Monto final de compra:</span>
                  <p className="text-[10px] text-slate-400">Impuestos y empaque incluidos {appliedCoupon ? `(Cupón ${appliedCoupon.code} aplicado)` : ''}</p>
                </div>
                <div className="text-right">
                  {(() => {
                    const { totals, discountedTotals, discountDetails } = getDiscountedTotals();
                    return Object.entries(totals).map(([curr, total]) => {
                      const disc = discountDetails[curr] || 0;
                      const discTotal = discountedTotals[curr] || 0;
                      return (
                        <div key={curr} className="text-right font-black">
                          {disc > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 line-through mr-1.5">{formatCurrency(Number(total), curr)}</span>
                              <span className="text-[10px] text-teal-650 font-bold mr-1.5">(-{formatCurrency(disc, curr)})</span>
                              <span className="text-base text-slate-950 font-extrabold">{formatCurrency(discTotal, curr)}</span>
                            </div>
                          ) : (
                            <div className="text-base text-slate-900 font-extrabold">
                              {formatCurrency(Number(total), curr)}
                            </div>
                          )}
                        </div>
                      );
                    });
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" id="about-store-full-overlay">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-scale-up max-h-[90vh]">
            <div className="px-6 py-5 bg-slate-950 text-white flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white">Sobre Nosotros</h3>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Información de la Boutique</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-full cursor-pointer transition-all active:scale-95 text-slate-300 hover:text-white"
                title="Cerrar Información"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600 leading-relaxed max-h-[82vh]">
              <div className="text-center pb-4 border-b border-slate-100">
                <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">{settings?.shop_name}</h4>
                <p className="text-[10px] text-teal-600 uppercase font-black tracking-widest mt-1">Establecimiento de confianza</p>
              </div>

              <div className="space-y-3">
                <p className="whitespace-pre-line text-slate-600 text-xs font-medium leading-relaxed bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  {settings?.about_text}
                </p>
              </div>

              {/* Informative details and location map */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-[10px] uppercase tracking-wider mb-2.5">Datos Generales & Contacto</h5>
                    <ul className="space-y-3 text-xs font-semibold text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">📍</span>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase leading-none mb-0.5">Dirección:</p>
                          <p className="text-slate-800">{settings?.address}</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">⌚</span>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase leading-none mb-0.5">Horarios:</p>
                          <p className="text-slate-800">{settings?.business_hours}</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">📞</span>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase leading-none mb-0.5">Soporte Público:</p>
                          <p className="text-slate-800">{settings?.contact_number}</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="border-t border-slate-200 mt-4 pt-4 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase">Soporte Directo WhatsApp</span>
                    <a 
                      href={`https://wa.me/${settings?.whatsapp_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-1.5 rounded-lg font-black text-[10px] transition-all flex items-center gap-1 shadow-sm uppercase tracking-wide cursor-pointer"
                    >
                      <span>Hablar ahora</span>
                    </a>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-100 rounded-2xl flex flex-col space-y-2">
                  <h5 className="font-extrabold text-slate-900 text-[10px] uppercase tracking-wider mb-1 px-1">📍 Ubicación en Google Maps</h5>
                  {/* Google Maps Embed iframe */}
                  <div className="flex-1 min-h-[180px] md:min-h-0 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative bg-slate-100">
                    <iframe
                      id="about-google-maps-iframe"
                      title="Ubicación exacta de la tienda"
                      src={getGoogleMapsUrl()}
                      className="w-full h-full border-0 absolute inset-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAboutOpen(false)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow active:scale-95 animate-fade-in"
              >
                Cerrar Ventana
              </button>
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
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] animate-scale-up">
            
            {/* Top row split layout containing image and reviews */}
            <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
              {/* Product Image Panel */}
              <div className="w-full md:w-1/2 bg-slate-50 relative flex flex-col items-center justify-between border-r border-gray-100 min-h-[250px]">
                <div className="w-full flex-1 flex items-center justify-center relative cursor-zoom-in overflow-hidden">
                  <img 
                    src={currentModalImage || selectedProduct.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600'} 
                    alt={selectedProduct.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover max-h-[250px] md:max-h-[350px] transition-all duration-300"
                    onClick={() => setExpandedImage(currentModalImage || selectedProduct.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600')}
                  />
                  <span className="absolute top-3 left-3 text-[9px] font-bold bg-slate-900 text-white uppercase px-2 py-0.5 rounded shadow-sm">
                    {selectedProduct.category}
                  </span>
                </div>

                {/* Galería de imágenes secundarias (Miniaturas) */}
                {((selectedProduct.gallery_images && selectedProduct.gallery_images.length > 0) || (selectedProduct.variants && selectedProduct.variants.length > 0)) && (
                  <div className="w-full p-3 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto">
                    {/* Imagen principal como miniatura */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentModalImage(selectedProduct.image_url || '');
                        setActiveVariant(null);
                      }}
                      className={`w-10 h-10 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                        (!activeVariant && currentModalImage === selectedProduct.image_url) ? 'border-teal-600 scale-105' : 'border-gray-200'
                      }`}
                    >
                      <img src={selectedProduct.image_url} alt="Principal" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>

                    {/* Imágenes de la Galería */}
                    {selectedProduct.gallery_images && selectedProduct.gallery_images.map((img, idx) => img && (
                      <button
                        key={`gal-${idx}`}
                        type="button"
                        onClick={() => {
                          setCurrentModalImage(img);
                        }}
                        className={`w-10 h-10 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                          (currentModalImage === img) ? 'border-teal-600 scale-105' : 'border-gray-200'
                        }`}
                      >
                        <img src={img} alt={`Galería ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}

                    {/* Imágenes de Variantes */}
                    {selectedProduct.variants && selectedProduct.variants.map((variant: any, idx: number) => variant.image_url && (
                      <button
                        key={`var-img-${idx}`}
                        type="button"
                        onClick={() => {
                          setCurrentModalImage(variant.image_url);
                          setActiveVariant(variant);
                        }}
                        className={`w-10 h-10 rounded-lg border-2 overflow-hidden shrink-0 transition-all relative ${
                          (activeVariant?.id === variant.id) ? 'border-teal-600 scale-105' : 'border-gray-200'
                        }`}
                        title={variant.name}
                      >
                        <img src={variant.image_url} alt={variant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[7px] text-center truncate px-0.5 font-bold">
                          {variant.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content & Review Form Panel */}
              <div className="w-full md:w-1/2 flex flex-col justify-between overflow-y-auto p-6 space-y-4">
                
                {/* Header Info */}
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                      {selectedProduct.name}
                      {activeVariant && (
                        <span className="block text-xs font-bold text-teal-600 mt-1">
                          Variante: {activeVariant.name}
                        </span>
                      )}
                    </h3>
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
                      {formatCurrency(getPromoPrice(selectedProduct, activeVariant), selectedProduct.currency || 'CUP')}
                    </span>
                    {selectedProduct.promotion_discount > 0 && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatCurrency(activeVariant?.price !== undefined ? activeVariant.price : selectedProduct.price, selectedProduct.currency || 'CUP')}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium ml-auto">
                      Stock: {activeVariant?.stock !== undefined && activeVariant.stock !== null ? activeVariant.stock : selectedProduct.stock}
                    </span>
                  </div>

                  {/* Selector de Variaciones */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <span className="block text-[10px] font-black text-slate-750 uppercase tracking-widest">
                        🎨 Variedades Disponibles:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {/* Botón de producto base / original */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveVariant(null);
                            setCurrentModalImage(selectedProduct.image_url || '');
                          }}
                          className={`px-3 py-2 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                            !activeVariant 
                              ? 'bg-teal-600 border-teal-600 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                          }`}
                        >
                          <span>Original</span>
                        </button>

                        {/* Botones de las variantes */}
                        {selectedProduct.variants.map((variant: any) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => {
                              setActiveVariant(variant);
                              if (variant.image_url) {
                                setCurrentModalImage(variant.image_url);
                              }
                            }}
                            className={`px-3 py-2 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                              activeVariant?.id === variant.id 
                                ? 'bg-teal-600 border-teal-600 text-white shadow-xs' 
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                            }`}
                          >
                            {variant.image_url && (
                              <img src={variant.image_url} alt={variant.name} className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                            )}
                            <span>{variant.name}</span>
                            {variant.price !== undefined && variant.price !== null && variant.price !== selectedProduct.price && (
                              <span className="text-[9px] opacity-80 font-mono">
                                ({formatCurrency(variant.price, selectedProduct.currency || 'CUP')})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.quantity_prices && selectedProduct.quantity_prices.length > 0 && (
                    <div className="mt-4 bg-slate-50 border border-slate-200/50 p-3 rounded-xl space-y-2">
                      <p className="text-[10px] text-teal-600 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <span>⚡ Descuentos por Cantidad (Mayoreo):</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {selectedProduct.quantity_prices.map((qp, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                            <span className="font-medium text-slate-500">≥ {qp.quantity} unidades:</span>
                            <span className="font-extrabold text-teal-700">
                              {formatCurrency(selectedProduct.promotion_discount > 0 ? qp.price * (1 - selectedProduct.promotion_discount / 100) : qp.price, selectedProduct.currency || 'CUP')} c/u
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Verified reviews & star selection list */}
                <div className="border-t border-gray-100 pt-4 flex-1 flex flex-col min-h-[150px] max-h-[300px] overflow-y-auto space-y-2">
                  {(() => {
                    const isStaff = loggedWorker && (loggedWorker.role === 'admin' || loggedWorker.role === 'gerente');
                    const targetReviews = isStaff ? reviews : reviews.filter(r => !r.is_hidden);
                    
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Opiniones de Clientes ({targetReviews.length})</p>
                          {isStaff && (
                            <span className="text-[9px] bg-teal-500/10 text-teal-700 font-bold px-1.5 py-0.5 rounded border border-teal-500/20">Modo Moderación</span>
                          )}
                        </div>
                        
                        {targetReviews.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-xs my-auto">
                            <p>No hay valoraciones aún.</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">¡Sé el primero en dar tu opinión!</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {targetReviews.map(rev => (
                              <div key={rev.id} className={`p-2.5 rounded-xl border text-xs transition-all ${rev.is_hidden ? 'bg-amber-500/5 border-amber-200/50 opacity-80' : 'bg-slate-50 border-slate-100/60'}`}>
                                <div className="flex items-center justify-between font-bold text-[10px] text-slate-700 font-sans">
                                  <span className="flex items-center gap-1.5">
                                    {rev.customer_name}
                                    {rev.is_hidden && (
                                      <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded uppercase font-black tracking-wider">Oculto</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-0.5 text-amber-400 animate-fade-in">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star 
                                        key={i} 
                                        id={`star-mod-${rev.id}-${i}`}
                                        className={`w-3 h-3 fill-current ${i < rev.rating ? 'text-amber-400' : 'text-slate-200'}`} 
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-slate-600 mt-1 pl-0.5 leading-relaxed font-semibold">{rev.comment}</p>
                                
                                {/* Moderation Controls */}
                                {isStaff && (
                                  <div className="mt-2 pt-2 border-t border-dashed border-slate-250 flex items-center justify-end gap-2 text-[10px]" id={`mod-action-grp-${rev.id}`}>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await SupabaseService.toggleReviewVisibility(rev.id, !rev.is_hidden);
                                          loadReviews(selectedProduct.id);
                                        } catch(e) {}
                                      }}
                                      className="text-[9px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold px-1.5 py-0.5 border border-amber-200 rounded transition-all cursor-pointer"
                                    >
                                      {rev.is_hidden ? 'Mostrar en Tienda' : 'Ocultar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm('¿Está totalmente seguro de eliminar permanentemente esta opinión de cliente? Esta acción no se puede deshacer.')) {
                                          try {
                                            await SupabaseService.deleteReview(rev.id);
                                            loadReviews(selectedProduct.id);
                                          } catch(e){}
                                        }
                                      }}
                                      className="text-[9px] text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 font-bold px-1.5 py-0.5 border border-red-200 rounded transition-all cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
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
                        if (selectedProduct) addToCart(selectedProduct, activeVariant || undefined);
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

            {/* Bottom Row wrapping Smart Recommendations */}
            <div className="bg-[#FAFBFB] border-t border-gray-100 p-4 shrink-0 text-xs">
              <h4 className="font-extrabold text-[#111827] mb-2 px-1 text-[11px] tracking-tight uppercase flex items-center gap-1.5 text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-teal-650 animate-pulse" />
                <span>Quizás te interese también:</span>
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {getSmartRecommendations(selectedProduct).map(rec => {
                  const hasDiscount = rec.promotion_discount > 0;
                  const finalRecPrice = getPromoPrice(rec);
                  return (
                    <div 
                      key={rec.id} 
                      onClick={() => {
                        setSelectedProduct(rec);
                      }}
                      className="group cursor-pointer bg-white p-2.5 rounded-xl border border-gray-100 hover:border-teal-500/30 transition-all flex items-center gap-2.5 shadow-xs hover:shadow-xs hover:scale-[1.01]"
                    >
                      <img 
                        src={rec.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100'} 
                        alt={rec.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-all animate-scale-up"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate leading-snug group-hover:text-teal-600 transition-colors text-[10px]">{rec.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-black text-slate-900 text-[10px]">{formatCurrency(finalRecPrice, rec.currency || 'CUP')}</span>
                          {hasDiscount && (
                            <span className="text-[8px] text-slate-400 line-through">
                              {formatCurrency(rec.price, rec.currency || 'CUP')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {/* Expanded Image Modal overlay */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          id="expanded-image-backdrop-modal"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-2xl p-1 animate-scale-up">
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 z-50 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full border border-white/10 shadow transition-all cursor-pointer"
              title="Cerrar Imagen"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={expandedImage} 
              alt="Foto completa del producto" 
              className="max-w-full max-h-[88vh] object-contain rounded-xl select-none mx-auto"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Floating About / Address Map Location Button */}
      {settings?.about_visible !== false && (
        <div className={`fixed bottom-[84px] z-[95] print:hidden transition-all duration-300 ${isCartOpen ? 'left-6 md:left-auto md:right-[464px]' : 'right-6 md:right-6'}`}>
          <button
            onClick={() => setIsAboutOpen(true)}
            type="button"
            title="Ver Dirección y Mapa (Ubicación)"
            className={`flex items-center bg-slate-950 border-2 border-[#14B8A6] text-white rounded-full transition-all duration-300 cursor-pointer group focus:outline-none ${
              isCartOpen ? 'p-3' : 'p-3 px-4.5'
            } shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.6)] hover:border-teal-400 active:scale-95`}
          >
            <div className="relative">
              <MapPin className="w-4 h-4 text-teal-400 animate-pulse group-hover:rotate-12 transition-transform" />
            </div>
            <span className={`text-xs font-black tracking-wider uppercase text-teal-400 font-mono transition-all duration-300 overflow-hidden whitespace-nowrap ${isCartOpen ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100 ml-2'}`}>
              Dirección & Mapa
            </span>
          </button>
        </div>
      )}

      {/* Floating Personal Brand Card Badge */}
      <div className={`fixed bottom-6 z-[95] print:hidden transition-all duration-300 ${isCartOpen ? 'left-6 md:left-auto md:right-[464px]' : 'right-6 md:right-6'}`}>
        <button
          onClick={() => setIsBusinessCardOpen(true)}
          type="button"
          title="Ver Tarjeta de Contacto y Servicios"
          className={`flex items-center bg-slate-950 border-2 border-[#fbbf24] text-white rounded-full transition-all duration-300 cursor-pointer group focus:outline-none ${
            isCartOpen ? 'p-3' : 'p-3 px-4.5'
          } shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.6)] hover:border-yellow-400 active:scale-95`}
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
          </div>
          <span className={`text-xs font-black tracking-wider uppercase text-[#fbbf24] font-mono transition-all duration-300 overflow-hidden whitespace-nowrap ${isCartOpen ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100 ml-2'}`}>
            Contacto & Servicios
          </span>
        </button>
      </div>

      {/* High-Fidelity Custom Digital Postcard Modal Overlay */}
      {isBusinessCardOpen && (
        <div 
          className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsBusinessCardOpen(false)}
        >
          <div 
            className="relative w-full max-w-[420px] bg-gradient-to-br from-[#0a0b0d] via-[#111317] to-[#060708] text-white rounded-2xl border-2 border-[#fbbf24]/50 shadow-2xl overflow-hidden p-5 md:p-6 animate-scale-up border-double shadow-yellow-500/5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner Decorative Palm Leaves - Sourced from physical card image */}
            {/* Top-Left Tropical Foliage */}
            <div className="absolute -top-3 -left-3 w-28 h-24 text-emerald-800/20 pointer-events-none transform -rotate-12 select-none">
              <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                <path d="M10,95 C15,70 30,50 65,40 C55,42 45,46 35,52 C45,48 55,46 65,46 C50,51 38,59 28,68 C38,62 48,58 58,58 C45,63 35,72 25,82 C35,76 43,74 50,74 C40,79 30,88 20,98" />
                <path d="M5,100 C15,80 35,65 75,60 C65,62 55,66 45,72 C55,68 65,66 75,66 C60,71 48,79 38,88 C48,82 58,78 68,78 C55,83 45,92 35,100" fillOpacity="0.7"/>
              </svg>
            </div>

            {/* Bottom-Right Tropical Foliage */}
            <div className="absolute -bottom-3 -right-3 w-28 h-24 text-emerald-800/20 pointer-events-none transform rotate-180 select-none">
              <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                <path d="M10,95 C15,70 30,50 65,40 C55,42 45,46 35,52 C45,48 55,46 65,46 C50,51 38,59 28,68 C38,62 48,58 58,58 C45,63 35,72 25,82 C35,76 43,74 50,74 C40,79 30,88 20,98" />
                <path d="M5,100 C15,80 35,65 75,60 C65,62 55,66 45,72 C55,68 65,66 75,66 C60,71 48,79 38,88 C48,82 58,78 68,78 C55,83 45,92 35,100" fillOpacity="0.7"/>
              </svg>
            </div>

            {/* Gold Highlight Blur Background Particle */}
            <div className="absolute top-24 left-1/3 w-20 h-20 bg-yellow-500/10 rounded-full filter blur-2xl pointer-events-none"></div>

            {/* Close Button */}
            <button
              onClick={() => setIsBusinessCardOpen(false)}
              type="button"
              className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/80 p-1.5 rounded-full border border-slate-700/50 shadow transition-all cursor-pointer"
              title="Cerrar tarjeta"
            >
              <X className="w-4 h-4" />
            </button>

            {/* CARD CONTENT HEADER */}
            <div className="flex justify-between items-start pt-2 gap-4">
              {/* Left Column: Icon-Bound Contact Details (Styled just like physically shown) */}
              <div className="space-y-3 flex-1 z-10">
                {/* Phone */}
                <a 
                  href="tel:7862942257" 
                  className="flex items-center gap-2.5 group/link cursor-pointer hover:opacity-90 max-w-max transition-all"
                  title="Llamar teléfono"
                >
                  <div className="w-7 h-7 rounded-full bg-[#fbbf24] text-[#0f172a] shadow-md flex items-center justify-center shrink-0 border border-yellow-300">
                    <Phone className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs md:text-sm font-black tracking-wide font-mono text-slate-100 group-hover/link:text-[#fbbf24] transition-colors">
                    786-294-2257
                  </span>
                </a>

                {/* Email */}
                <a 
                  href="mailto:estilomiami@yahoo.com" 
                  className="flex items-center gap-2.5 group/link cursor-pointer hover:opacity-90 max-w-max transition-all"
                  title="Enviar correo"
                >
                  <div className="w-7 h-7 rounded-full bg-[#fbbf24] text-[#0f172a] shadow-md flex items-center justify-center shrink-0 border border-yellow-300">
                    <Mail className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-100 group-hover/link:text-[#fbbf24] transition-colors break-all">
                    estilomiami@yahoo.com
                  </span>
                </a>

                {/* Address */}
                <a 
                  href="https://maps.google.com/?q=16335+NW+48th+Ave,+Miami+Gardens,+FL+33014" 
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 group/link cursor-pointer hover:opacity-90 max-w-max transition-all"
                  title="Ver ubicación en Google Maps"
                >
                  <div className="w-7 h-7 rounded-full bg-[#fbbf24] text-[#0f172a] shadow-md flex items-center justify-center shrink-0 border border-yellow-300">
                    <MapPin className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <div className="text-left font-mono">
                    <span className="block text-[10px] font-black text-slate-100 group-hover/link:text-[#fbbf24] leading-tight max-w-[220px]">
                      16335 NW 48th Ave
                    </span>
                    <span className="block text-[9px] text-slate-400 font-bold group-hover/link:text-[#fbbf24]/80 leading-none">
                      Miami Gardens, FL 33014
                    </span>
                  </div>
                </a>

                {/* Tiktok */}
                <a 
                  href="https://www.tiktok.com/@cubanosenmiami2" 
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 group/link cursor-pointer hover:opacity-90 max-w-max transition-all"
                  title="Ver perfil de TikTok"
                >
                  <div className="w-7 h-7 rounded-full bg-[#fbbf24] text-[#0f172a] shadow-md flex items-center justify-center shrink-0 border border-yellow-300">
                    <Music className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-extrabold font-mono text-slate-100 group-hover/link:text-[#fbbf24] transition-colors">
                    @cubanosenmiami2
                  </span>
                </a>
              </div>

              {/* Right Column: Symmetrical Orúla Helm/Logo */}
              <div className="flex flex-col items-center shrink-0 pr-2 z-10">
                <div className="relative p-2.5 bg-slate-900/60 rounded-full border border-yellow-500/20 shadow-lg text-yellow-500 mb-1.5 flex items-center justify-center">
                  <Compass className="w-10 h-10 animate-[spin_16s_linear_infinite] stroke-[1.25]" />
                  <Anchor className="w-4 h-4 absolute text-yellow-500 opacity-60" />
                </div>
                <h3 className="font-['Playfair_Display'] text-xs tracking-[0.25em] font-black text-yellow-500 uppercase leading-none mt-1">
                  ORÚLA
                </h3>
              </div>
            </div>

            {/* SECTION 1: SERVICIOS BANNER */}
            <div className="relative my-5 z-10">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#fbbf24]/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 px-6 py-0.5 text-xs font-black tracking-[0.15em] uppercase shadow-md rounded-full border-y border-yellow-300 select-none">
                  SERVICIOS:
                </span>
              </div>
            </div>

            {/* SERVICES IN LIVE COLUMNS VIEWPORTS */}
            <div className="grid grid-cols-5 divide-x divide-yellow-500/25 text-center mt-2 z-10 position-relative">
              {/* Item 1 */}
              <div className="px-0.5 flex flex-col justify-between h-[82px]">
                <div className="flex items-center justify-center grow">
                  <Package className="w-6 h-6 text-[#fbbf24] stroke-[1.5]" />
                </div>
                <p className="text-[8.5px] font-extrabold text-slate-200 leading-tight uppercase tracking-tight mt-1.5 h-10 flex items-start justify-center">
                  Envíos a Cuba
                </p>
              </div>

              {/* Item 2 */}
              <div className="px-0.5 flex flex-col justify-between h-[82px]">
                <div className="flex items-center justify-center grow">
                  <Ship className="w-6 h-6 text-[#fbbf24] stroke-[1.5] -rotate-12" />
                </div>
                <p className="text-[8.5px] font-extrabold text-slate-200 leading-tight uppercase tracking-tight mt-1.5 h-10 flex items-start justify-center">
                  Viajes semanales
                </p>
              </div>

              {/* Item 3 */}
              <div className="px-0.5 flex flex-col justify-between h-[82px]">
                <div className="flex items-center justify-center grow">
                  <ShoppingBag className="w-6 h-6 text-[#fbbf24] stroke-[1.5]" />
                </div>
                <p className="text-[8.5px] font-extrabold text-slate-200 leading-tight uppercase tracking-tight mt-1.5 h-10 flex items-start justify-center">
                  Compra Personalizada
                </p>
              </div>

              {/* Item 4 */}
              <div className="px-0.5 flex flex-col justify-between h-[82px]">
                <div className="flex items-center justify-center grow">
                  <Smartphone className="w-6 h-6 text-[#fbbf24] stroke-[1.5]" />
                </div>
                <p className="text-[8.5px] font-extrabold text-slate-200 leading-tight uppercase tracking-tight mt-1.5 h-10 flex items-start justify-center">
                  Venta de Celulares
                </p>
              </div>

              {/* Item 5 */}
              <div className="px-0.5 flex flex-col justify-between h-[82px]">
                <div className="flex items-center justify-center grow">
                  <Zap className="w-6 h-6 text-[#fbbf24] stroke-[1.5]" />
                </div>
                <p className="text-[8.5px] font-extrabold text-slate-200 leading-tight uppercase tracking-tight mt-1.5 h-10 flex items-start justify-center">
                  Plantas Eléctricas (EcoFlow)
                </p>
              </div>
            </div>

            {/* SECTION 2: ENVÍOS POR LIBRA BANNER */}
            <div className="relative my-5 z-10">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#fbbf24]/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 px-5 py-0.5 text-[10.5px] font-black tracking-[0.12em] uppercase shadow-md rounded-full border-y border-yellow-300 select-none">
                  ENVÍOS POR LIBRA
                </span>
              </div>
            </div>

            {/* WEIGHT SHIPMENTS TYPE Bullet point details */}
            <div className="flex justify-around items-center bg-slate-900/50 backdrop-blur-xs py-2 rounded-xl border border-yellow-500/10 max-w-[340px] mx-auto z-10 relative">
              <div className="flex items-center gap-1.5 text-xs font-black text-white hover:text-yellow-400 transition-colors">
                <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                <span>AÉREO</span>
              </div>
              <span className="w-1.5 h-1.5 bg-yellow-500/30 rounded-full"></span>
              <div className="flex items-center gap-1.5 text-xs font-black text-white hover:text-yellow-400 transition-colors">
                <Ship className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                <span>MARÍTIMO</span>
              </div>
              <span className="w-1.5 h-1.5 bg-yellow-500/30 rounded-full"></span>
              <div className="flex items-center gap-1.5 text-xs font-black text-white hover:text-yellow-400 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                <span>EXPRESS</span>
              </div>
            </div>

            {/* SEPARATOR DOTTED PATH TO PACKAGE */}
            <div className="flex items-center justify-center gap-2 mt-5 text-[10px] text-slate-500 font-mono italic z-10 relative">
              <span>Yo me encargo de la compra y del envío...</span>
              <span className="text-yellow-500/50">➦</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>

            {/* GORGEOUS AUTOGRAPH STYLE SLOGAN */}
            <div className="text-center mt-2.5 pb-2 z-10 relative">
              <span className="font-['Caveat'] text-2xl md:text-3xl text-[#fbbf24] font-bold tracking-wide block animate-pulse">
                tú solo decides qué mandar.
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
