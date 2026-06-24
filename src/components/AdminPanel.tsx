import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, ShopSettings, Order, Worker, AuditLog, SecurityAlert } from '../types';
import { SupabaseService } from '../supabaseService';
import { 
  FolderPlus, Plus, Edit2, Trash2, Settings, ShoppingCart, LogOut, Check, X, AlertTriangle, ShieldCheck, 
  UserCheck, Save, Image, Layers, ClipboardList
} from 'lucide-react';

interface AdminPanelProps {
  onBackToStore: () => void;
}

// Browser-native SHA-256 hash generator
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default function AdminPanel({ onBackToStore }: AdminPanelProps) {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState<Worker | null>(null);

  // App Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'orders' | 'settings' | 'alerts'>('products');
  const [loading, setLoading] = useState(true);

  // Editing Forms State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodCategory, setProdCategory] = useState('');
  const [prodStock, setProdStock] = useState(10);
  const [prodVisible, setProdVisible] = useState(true);
  const [prodDiscount, setProdDiscount] = useState(0);
  const [prodCurrency, setProdCurrency] = useState('USD');
  
  // USER FEATURE: photo filename vs full URL
  const [useDefaultFolder, setUseDefaultFolder] = useState(true);
  const [prodPhotoFilename, setProdPhotoFilename] = useState('');
  const [prodPhotoFullUrl, setProdPhotoFullUrl] = useState('');

  // Category Form Fields
  const [catName, setCatName] = useState('');
  const [catFolderUrl, setCatFolderUrl] = useState('');

  // Settings Form Fields
  const [setShopName, setSetShopName] = useState('');
  const [setShopDesc, setSetShopDesc] = useState('');
  const [setContact, setSetContact] = useState('');
  const [setWhatsapp, setSetWhatsapp] = useState('');
  const [setHours, setSetHours] = useState('');
  const [setAddress, setSetAddress] = useState('');
  const [setMainCurrency, setSetMainCurrency] = useState('USD');
  const [setBannerVisible, setSetBannerVisible] = useState(false);
  const [setBannerText, setSetBannerText] = useState('');
  const [setBannerBg, setSetBannerBg] = useState('#1e293b');
  const [setBannerTextColor, setSetBannerTextColor] = useState('#ffffff');

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [p, c, s, o, l, a] = await Promise.all([
          SupabaseService.getProducts(),
          SupabaseService.getCategories(),
          SupabaseService.getSettings(),
          SupabaseService.getOrders(),
          SupabaseService.getAuditLogs(),
          SupabaseService.getSecurityAlerts()
        ]);
        setProducts(p);
        setCategories(c);
        setSettings(s);
        setOrders(o);
        setAuditLogs(l);
        setSecurityAlerts(a);

        // Prepopulate settings form fields
        if (s) {
          setSetShopName(s.shop_name);
          setSetShopDesc(s.shop_description);
          setSetContact(s.contact_number);
          setSetWhatsapp(s.whatsapp_number);
          setSetHours(s.business_hours);
          setSetAddress(s.address);
          setSetMainCurrency(s.currency);
          setSetBannerVisible(!!s.banner_visible);
          setSetBannerText(s.banner_text || '');
          setSetBannerBg(s.banner_bg || '#1e293b');
          setSetBannerTextColor(s.banner_text_color || '#ffffff');
        }
      } catch (err) {
        console.error('Error loading admin panel data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isLoggedIn) {
      loadAdminData();
    }
  }, [isLoggedIn]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const allWorkers = await SupabaseService.getWorkers();
      const enteredHash = await sha256(passwordInput);

      const found = allWorkers.find(
        w => w.username.toLowerCase() === usernameInput.toLowerCase() && 
             w.password_sha256 === enteredHash && 
             w.is_active
      );

      if (found) {
        setCurrentUser(found);
        setIsLoggedIn(true);
        // Log action
        await SupabaseService.logAction(
          found.name,
          found.role,
          'Inicio de Sesión',
          `El usuario ${found.username} inició sesión en el panel administrativo.`
        );
      } else {
        setAuthError('Usuario o contraseña incorrectos, o usuario inactivo.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Ocurrió un error al procesar la autenticación.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (currentUser) {
      await SupabaseService.logAction(
        currentUser.name,
        currentUser.role,
        'Cierre de Sesión',
        `El usuario ${currentUser.username} cerró sesión voluntariamente.`
      );
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsernameInput('');
    setPasswordInput('');
  };

  // Open Product Modal (New or Edit)
  const openProductModal = (product: Product | null) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name);
      setProdDesc(product.description || '');
      setProdPrice(product.price);
      setProdCategory(product.category);
      setProdStock(product.stock);
      setProdVisible(product.is_visible);
      setProdDiscount(product.promotion_discount);
      setProdCurrency(product.currency);

      // Analyze if image matches current category's default folder
      const selectedCat = categories.find(c => c.name === product.category);
      const defaultFolder = selectedCat?.default_folder_url || '';

      if (defaultFolder && product.image_url.startsWith(defaultFolder)) {
        setUseDefaultFolder(true);
        setProdPhotoFilename(product.image_url.substring(defaultFolder.length));
        setProdPhotoFullUrl(product.image_url);
      } else {
        setUseDefaultFolder(false);
        setProdPhotoFilename('');
        setProdPhotoFullUrl(product.image_url);
      }
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdDesc('');
      setProdPrice(0);
      setProdStock(10);
      setProdVisible(true);
      setProdDiscount(0);
      setProdCurrency(settings?.currency || 'USD');

      // Default to first category if available
      if (categories.length > 0) {
        setProdCategory(categories[0].name);
        setUseDefaultFolder(!!categories[0].default_folder_url);
        setProdPhotoFilename('');
        setProdPhotoFullUrl('');
      } else {
        setProdCategory('');
        setUseDefaultFolder(false);
        setProdPhotoFilename('');
        setProdPhotoFullUrl('');
      }
    }
    setIsProductModalOpen(true);
  };

  // On category change in Product Form
  const handleProductCategoryChange = (catNameVal: string) => {
    setProdCategory(catNameVal);
    const selectedCat = categories.find(c => c.name === catNameVal);
    if (selectedCat && selectedCat.default_folder_url) {
      setUseDefaultFolder(true);
    } else {
      setUseDefaultFolder(false);
    }
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodCategory) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    const selectedCat = categories.find(c => c.name === prodCategory);
    const defaultFolder = selectedCat?.default_folder_url || '';

    // Calculate image URL
    let finalImageUrl = prodPhotoFullUrl;
    if (useDefaultFolder && defaultFolder) {
      finalImageUrl = `${defaultFolder}${prodPhotoFilename.trim()}`;
    }

    if (!finalImageUrl) {
      alert('Por favor ingrese la dirección o nombre de la foto del producto.');
      return;
    }

    const productPayload: Product = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: prodName,
      description: prodDesc || undefined,
      price: prodPrice,
      category: prodCategory,
      image_url: finalImageUrl,
      stock: prodStock,
      is_visible: prodVisible,
      promotion_discount: prodDiscount,
      currency: prodCurrency,
      created_at: editingProduct?.created_at || new Date().toISOString()
    };

    try {
      await SupabaseService.saveProduct(productPayload);
      
      // Update local state
      const updatedList = await SupabaseService.getProducts();
      setProducts(updatedList);
      
      // Log Action
      if (currentUser) {
        await SupabaseService.logAction(
          currentUser.name,
          currentUser.role,
          editingProduct ? 'Modificación de Producto' : 'Creación de Producto',
          `Se guardó el producto ${prodName} (Categoría: ${prodCategory}, Stock: ${prodStock}).`
        );
      }

      setIsProductModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error guardando el producto.');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro que desea eliminar el producto ${name}?`)) return;
    try {
      await SupabaseService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));

      if (currentUser) {
        await SupabaseService.logAction(
          currentUser.name,
          currentUser.role,
          'Eliminación de Producto',
          `Se eliminó el producto ${name} (${id}).`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Category Modal (New or Edit)
  const openCategoryModal = (category: ProductCategory | null) => {
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatFolderUrl(category.default_folder_url || '');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatFolderUrl('');
    }
    setIsCategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert('El nombre de la categoría es requerido.');
      return;
    }

    const categoryPayload: ProductCategory = {
      id: editingCategory?.id || `cat-${Date.now()}`,
      name: catName.trim(),
      default_folder_url: catFolderUrl.trim() || undefined
    };

    try {
      await SupabaseService.saveCategory(categoryPayload);
      
      // Refresh local states
      const refreshedCats = await SupabaseService.getCategories();
      setCategories(refreshedCats);

      if (currentUser) {
        await SupabaseService.logAction(
          currentUser.name,
          currentUser.role,
          editingCategory ? 'Modificación de Categoría' : 'Creación de Categoría',
          `Se guardó la categoría: ${catName} con carpeta por defecto: ${catFolderUrl || 'Ninguna'}`
        );
      }

      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error guardando la categoría.');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro que desea eliminar la categoría ${name}? Esto no borrará los productos pero ya no estarán categorizados.`)) return;
    try {
      await SupabaseService.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));

      if (currentUser) {
        await SupabaseService.logAction(
          currentUser.name,
          currentUser.role,
          'Eliminación de Categoría',
          `Se eliminó la categoría ${name} (${id}).`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const settingsPayload: ShopSettings = {
      id: 'singleton',
      shop_name: setShopName,
      shop_description: setShopDesc,
      contact_number: setContact,
      whatsapp_number: setWhatsapp,
      business_hours: setHours,
      address: setAddress,
      currency: setMainCurrency,
      currencies: settings?.currencies || ['USD', 'CUP', 'EUR', 'MLC'],
      banner_visible: setBannerVisible,
      banner_text: setBannerText,
      banner_bg: setBannerBg,
      banner_text_color: setBannerTextColor,
      theme_preset: settings?.theme_preset || 'classic',
      color_primary: settings?.color_primary || '#0f172a',
      color_header_bg: settings?.color_header_bg || '#ffffff',
      color_page_bg: settings?.color_page_bg || '#F8F9FA',
      color_text: settings?.color_text || '#1e293b',
      color_card_bg: settings?.color_card_bg || '#ffffff',
      font_family: settings?.font_family || 'Inter',
      shop_logo_type: settings?.shop_logo_type || 'text',
      shop_logo_val: settings?.shop_logo_val || '🛍️',
      telegram_enabled: settings?.telegram_enabled || false
    };

    try {
      await SupabaseService.saveSettings(settingsPayload);
      setSettings(settingsPayload);
      alert('¡Configuración guardada con éxito!');

      if (currentUser) {
        await SupabaseService.logAction(
          currentUser.name,
          currentUser.role,
          'Actualización de Ajustes',
          'Se modificó la configuración general del comercio.'
        );
      }
    } catch (err) {
      console.error(err);
      alert('Error guardando los ajustes.');
    }
  };

  // Change Order Status
  const handleChangeOrderStatus = async (orderId: string, status: 'pending' | 'completed' | 'cancelled') => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder: Order = { ...order, status };

    try {
      await SupabaseService.saveOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));

      if (currentUser) {
        await SupabaseService.logAction(
          currentUser.name,
          currentUser.role,
          'Cambio de Estado de Pedido',
          `El pedido ${orderId} fue marcado como ${status}.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve Alert
  const handleResolveAlert = async (id: string) => {
    try {
      await SupabaseService.resolveSecurityAlert(id);
      setSecurityAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));

      if (currentUser) {
        await SupabaseService.logAction(
          currentUser.name,
          currentUser.role,
          'Resolución de Alerta',
          `Se marcó como resuelta la alerta de seguridad ${id}.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          <div className="text-center">
            <span className="text-4xl">🔐</span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">Panel Administrativo</h2>
            <p className="text-xs text-slate-500 mt-1">Inicie sesión para gestionar su inventario y pedidos.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Usuario</label>
              <input 
                type="text" 
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="ale / admin"
                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Contraseña</label>
              <input 
                type="password" 
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••"
                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-semibold">
                {authError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-lg transition-all cursor-pointer shadow-md"
            >
              Iniciar Sesión
            </button>
          </form>

          <button 
            onClick={onBackToStore}
            className="w-full mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2 text-center"
          >
            ← Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row">
      
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛠️</span>
            <div>
              <h3 className="font-extrabold text-white text-xs tracking-wider uppercase">Panel de Control</h3>
              <p className="text-[10px] text-slate-400 font-medium">Conectado como {currentUser?.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-1.5">
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={16} /> Productos
          </button>

          <button 
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FolderPlus size={16} /> Categorías (jsdelivr)
          </button>

          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart size={16} /> Pedidos
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="ml-auto bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full animate-bounce">
                {orders.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Settings size={16} /> Ajustes Tienda
          </button>

          <button 
            onClick={() => setActiveTab('alerts')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'alerts' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={16} /> Auditoría y Alertas
            {securityAlerts.filter(a => !a.resolved).length > 0 && (
              <span className="ml-auto bg-pink-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full">
                {securityAlerts.filter(a => !a.resolved).length}
              </span>
            )}
          </button>
        </nav>

        {/* Back and Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button 
            onClick={onBackToStore}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Ver Tienda Online
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-800 hover:bg-red-950 hover:border-red-900 text-red-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Cargando base de datos...</p>
          </div>
        ) : (
          <>
            {/* --- PRODUCTS TAB --- */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Catálogo de Productos</h2>
                    <p className="text-xs text-slate-500">Gestione productos, fotos de jsDelivr, existencias y promociones.</p>
                  </div>
                  <button 
                    onClick={() => openProductModal(null)}
                    className="bg-slate-900 hover:bg-indigo-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus size={16} /> Crear Producto
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                          <th className="p-4">Producto</th>
                          <th className="p-4">Categoría</th>
                          <th className="p-4">Precio</th>
                          <th className="p-4">Inventario</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-8 text-slate-400 font-semibold">No hay productos en inventario. Crea uno para comenzar.</td>
                          </tr>
                        ) : (
                          products.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="p-4 flex items-center gap-3">
                                <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200" />
                                <div>
                                  <h4 className="font-bold text-slate-800">{p.name}</h4>
                                  <span className="text-[10px] text-slate-400 block font-medium max-w-xs truncate">{p.image_url}</span>
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-slate-600">{p.category}</td>
                              <td className="p-4 font-black text-slate-900">
                                {p.promotion_discount > 0 ? (
                                  <div>
                                    <span className="text-[10px] text-slate-400 line-through mr-1.5">{p.price} {p.currency}</span>
                                    <span className="text-pink-600">{p.price * (1 - p.promotion_discount / 100)} {p.currency}</span>
                                  </div>
                                ) : (
                                  <span>{p.price} {p.currency}</span>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={`font-bold px-2.5 py-1 rounded-full text-[10px] ${
                                  p.stock === 0 ? 'bg-red-50 text-red-600 border border-red-100' :
                                  p.stock <= 3 ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                                  'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                  {p.stock} unidades
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`font-semibold text-[10px] ${p.is_visible ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  ● {p.is_visible ? 'Visible' : 'Oculto'}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-1 whitespace-nowrap">
                                <button 
                                  onClick={() => openProductModal(p)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- CATEGORIES TAB --- */}
            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Categorías de Productos</h2>
                    <p className="text-xs text-slate-500">Defina carpetas raíz de jsDelivr para enlazar las imágenes automáticamente por categoría.</p>
                  </div>
                  <button 
                    onClick={() => openCategoryModal(null)}
                    className="bg-slate-900 hover:bg-indigo-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus size={16} /> Crear Categoría
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                          <th className="p-4">Categoría</th>
                          <th className="p-4">Ruta / Carpeta jsDelivr de Fotos</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categories.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center p-8 text-slate-400 font-semibold">No hay categorías registradas. Cree una nueva.</td>
                          </tr>
                        ) : (
                          categories.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/50">
                              <td className="p-4 font-extrabold text-slate-900">{c.name}</td>
                              <td className="p-4 font-mono text-slate-500 font-medium">
                                {c.default_folder_url ? (
                                  <span className="bg-slate-100 px-2 py-1 rounded text-[11px] text-indigo-600 select-all border border-slate-200">
                                    {c.default_folder_url}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Ninguna (deberá ingresar la URL completa de cada foto)</span>
                                )}
                              </td>
                              <td className="p-4 text-right space-x-1">
                                <button 
                                  onClick={() => openCategoryModal(c)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCategory(c.id, c.name)}
                                  className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- ORDERS TAB --- */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Historial de Pedidos por WhatsApp</h2>
                  <p className="text-xs text-slate-500">Supervise y actualice el estado de los pedidos que fueron completados por los clientes.</p>
                </div>

                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      <ClipboardList size={40} className="mx-auto text-slate-300" />
                      <p className="mt-4 text-slate-500 text-sm font-semibold">No se han registrado pedidos en el sistema.</p>
                    </div>
                  ) : (
                    orders.map(order => (
                      <div key={order.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full border border-slate-200">
                              ID: {order.id}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              'bg-slate-100 text-slate-400 border-slate-200'
                            }`}>
                              {order.status === 'pending' ? 'Pendiente' :
                               order.status === 'completed' ? 'Completado' : 'Cancelado'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{new Date(order.created_at || '').toLocaleString('es-ES')}</span>
                          </div>

                          <div className="text-xs space-y-1">
                            <p className="font-bold text-slate-900">👤 Cliente: <span className="font-semibold text-slate-700">{order.customer_name}</span></p>
                            <p className="font-bold text-slate-900">📞 Teléfono: <span className="font-semibold text-slate-700">{order.customer_phone}</span></p>
                            <p className="font-bold text-slate-900">🛵 Método: <span className="font-semibold text-slate-700">{order.delivery_type === 'delivery' ? `Envío (${order.address})` : 'Recogida en tienda'}</span></p>
                            {order.notes && <p className="font-bold text-slate-900">📝 Notas: <span className="font-semibold text-slate-500 italic">"{order.notes}"</span></p>}
                          </div>

                          <div className="border-t border-dashed border-slate-100 pt-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Detalle de Productos</span>
                            <ul className="mt-1 space-y-1 text-xs">
                              {order.items.map((item, i) => (
                                <li key={i} className="text-slate-600">
                                  • <span className="font-bold text-slate-800">{item.quantity}x</span> {item.name} ({item.price} {item.currency})
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 flex flex-col items-start md:items-end justify-between min-w-[180px] self-stretch gap-4">
                          <div className="text-left md:text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Importe Recibido</span>
                            <span className="text-base font-black text-slate-900">{order.total} {order.currency}</span>
                          </div>

                          <div className="flex flex-row md:flex-col gap-1.5 w-full">
                            {order.status === 'pending' && (
                              <button 
                                onClick={() => handleChangeOrderStatus(order.id, 'completed')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Check size={12} /> Completar
                              </button>
                            )}
                            {order.status !== 'cancelled' && (
                              <button 
                                onClick={() => handleChangeOrderStatus(order.id, 'cancelled')}
                                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold text-[10px] px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <X size={12} /> Cancelar Pedido
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Configuración General del Comercio</h2>
                  <p className="text-xs text-slate-500">Configure los datos de contacto, la moneda predeterminada y el banner promocional.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Nombre de la Tienda *</label>
                      <input 
                        type="text" 
                        required
                        value={setShopName}
                        onChange={(e) => setSetShopName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Moneda Predeterminada de Totales *</label>
                      <select 
                        value={setMainCurrency}
                        onChange={(e) => setSetMainCurrency(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="CUP">CUP ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="MLC">MLC ($)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Descripción o Eslogan *</label>
                      <textarea 
                        required
                        rows={2}
                        value={setShopDesc}
                        onChange={(e) => setSetShopDesc(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Número de Contacto *</label>
                      <input 
                        type="text" 
                        required
                        value={setContact}
                        onChange={(e) => setSetContact(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">WhatsApp para Envíos *</label>
                      <input 
                        type="text" 
                        required
                        value={setWhatsapp}
                        onChange={(e) => setSetWhatsapp(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Horario de Atención *</label>
                      <input 
                        type="text" 
                        required
                        value={setHours}
                        onChange={(e) => setSetHours(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Dirección Física *</label>
                      <input 
                        type="text" 
                        required
                        value={setAddress}
                        onChange={(e) => setSetAddress(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Banner Promocional Superior</h4>
                        <p className="text-[10px] text-slate-400">Mostrar anuncios globales en la parte superior de la tienda.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={setBannerVisible}
                        onChange={(e) => setSetBannerVisible(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                      />
                    </div>

                    {setBannerVisible && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase">Texto del Mensaje</label>
                          <input 
                            type="text" 
                            value={setBannerText}
                            onChange={(e) => setSetBannerText(e.target.value)}
                            placeholder="Ej. ¡Envíos gratis a todo Miami Gardens este fin de semana!"
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase">Color de Fondo</label>
                          <input 
                            type="color" 
                            value={setBannerBg}
                            onChange={(e) => setSetBannerBg(e.target.value)}
                            className="mt-1 block h-9 w-full rounded-lg border border-slate-200 p-1 bg-slate-50 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase">Color del Texto</label>
                          <input 
                            type="color" 
                            value={setBannerTextColor}
                            onChange={(e) => setSetBannerTextColor(e.target.value)}
                            className="mt-1 block h-9 w-full rounded-lg border border-slate-200 p-1 bg-slate-50 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save size={14} /> Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* --- ALERTS & AUDIT TAB --- */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Auditoría y Seguridad</h2>
                  <p className="text-xs text-slate-500">Inspeccione alertas de stock y mantenga un registro estricto de las operaciones sensibles de la tienda.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Active Alerts */}
                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle size={14} className="text-pink-600" /> Alertas del Sistema
                    </h3>
                    
                    {securityAlerts.length === 0 ? (
                      <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                        No hay alertas registradas.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {securityAlerts.map(alert => (
                          <div 
                            key={alert.id}
                            className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                              alert.resolved 
                                ? 'bg-slate-50 border-slate-100 text-slate-400' 
                                : alert.severity === 'high' 
                                ? 'bg-pink-50 border-pink-100 text-pink-700' 
                                : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span>{alert.type.toUpperCase()}</span>
                              <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs font-medium">{alert.message}</p>
                            {!alert.resolved && (
                              <button 
                                onClick={() => handleResolveAlert(alert.id)}
                                className="mt-1 text-[10px] font-black underline hover:text-slate-950 text-left cursor-pointer"
                              >
                                Marcar como Resuelta
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit Logs */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={14} className="text-slate-700" /> Historial de Transacciones (Audit)
                    </h3>
                    
                    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs p-4">
                      <div className="space-y-3.5 max-h-[480px] overflow-y-auto">
                        {auditLogs.length === 0 ? (
                          <p className="text-center py-8 text-xs text-slate-400 font-semibold">No se han registrado transacciones de auditoría.</p>
                        ) : (
                          auditLogs.map(log => (
                            <div key={log.id} className="text-xs border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-900">{log.action}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString('es-ES')}</span>
                              </div>
                              <p className="text-slate-600 mt-1">{log.details}</p>
                              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400 font-semibold">
                                <UserCheck size={10} />
                                <span>Por: {log.user} ({log.role})</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* PRODUCT DIALOG (CREATE/EDIT) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsProductModalOpen(false)} className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"></div>
          
          <div className="bg-white rounded-2xl border border-slate-200/80 max-w-xl w-full relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Nombre del Producto *</label>
                  <input 
                    type="text" 
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Ej. Frijoles Negros Goya 15oz"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Categoría *</label>
                  <select 
                    value={prodCategory}
                    onChange={(e) => handleProductCategoryChange(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Moneda del Producto *</label>
                  <select 
                    value={prodCurrency}
                    onChange={(e) => setProdCurrency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CUP">CUP ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="MLC">MLC ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Precio Unitario *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Cantidad en Stock *</label>
                  <input 
                    type="number" 
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Descuento de Promoción (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={prodDiscount}
                    onChange={(e) => setProdDiscount(parseInt(e.target.value) || 0)}
                    placeholder="Ej. 10 para 10% de descuento"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                  />
                </div>

                <div className="flex items-center gap-3 self-center mt-3">
                  <input 
                    type="checkbox" 
                    id="prodVisible"
                    checked={prodVisible}
                    onChange={(e) => setProdVisible(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <label htmlFor="prodVisible" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Habilitar Visibilidad en Tienda</label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Descripción</label>
                  <textarea 
                    rows={2}
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Detalles sobre envase, peso o características adicionales..."
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50 resize-none"
                  />
                </div>

                {/* --- USER REQUESTED PHOTO ATTACHMENT / DIRECTORY SPECIFICATION --- */}
                <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Image size={14} className="text-indigo-600" /> Imagen del Producto (jsDelivr)
                      </h4>
                      <p className="text-[10px] text-slate-400">Restaure la ruta por defecto o especifique dirección personalizada.</p>
                    </div>

                    {/* Check if current category actually has folder url mapped */}
                    {(() => {
                      const selectedCat = categories.find(c => c.name === prodCategory);
                      const hasFolder = !!selectedCat?.default_folder_url;
                      return hasFolder ? (
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-[10px] font-bold text-indigo-600">
                          <input 
                            type="checkbox" 
                            id="useDefaultFolder"
                            checked={useDefaultFolder}
                            onChange={(e) => setUseDefaultFolder(e.target.checked)}
                            className="h-3 w-3"
                          />
                          <label htmlFor="useDefaultFolder" className="cursor-pointer select-none">Usar carpeta de la categoría</label>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">No hay carpeta jsdelivr en esta categoría</span>
                      );
                    })()}
                  </div>

                  {useDefaultFolder && categories.find(c => c.name === prodCategory)?.default_folder_url ? (
                    <div className="space-y-2.5 bg-slate-50/50 p-3.5 border border-slate-200/60 rounded-xl animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded font-mono truncate max-w-sm">
                          {categories.find(c => c.name === prodCategory)?.default_folder_url}
                        </span>
                        <span className="text-slate-400 font-bold text-xs">/</span>
                        <input 
                          type="text"
                          required
                          value={prodPhotoFilename}
                          onChange={(e) => setProdPhotoFilename(e.target.value)}
                          placeholder="nombre_de_foto.jpg"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none bg-white font-mono focus:border-slate-400"
                        />
                      </div>
                      
                      {prodPhotoFilename.trim() && (
                        <div className="text-[10px] font-semibold text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span className="truncate">Resultado: <strong className="text-indigo-600 font-mono">{categories.find(c => c.name === prodCategory)?.default_folder_url}{prodPhotoFilename.trim()}</strong></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Dirección de Foto Completa (URL)</label>
                      <input 
                        type="url" 
                        required
                        value={prodPhotoFullUrl}
                        onChange={(e) => setProdPhotoFullUrl(e.target.value)}
                        placeholder="https://cdn.jsdelivr.net/gh/webbrother10/cdn-fotos/alimentos/arroz.jpg"
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY DIALOG (CREATE/EDIT) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsCategoryModalOpen(false)} className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"></div>
          
          <div className="bg-white rounded-2xl border border-slate-200/80 max-w-md w-full relative z-10 shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {editingCategory ? 'Editar Categoría' : 'Crear Nueva Categoría'}
              </h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Nombre de la Categoría *</label>
                <input 
                  type="text" 
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ej. Alimentos, Aseo Personal, Perfumería"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Ruta / Carpeta jsDelivr de Fotos (Opcional)</label>
                <input 
                  type="text" 
                  value={catFolderUrl}
                  onChange={(e) => setCatFolderUrl(e.target.value)}
                  placeholder="Ej. https://cdn.jsdelivr.net/gh/usuario/repo/carpeta/"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Ingrese la ruta de la carpeta donde se almacenan las fotos. Cuando cree un producto en esta categoría, solo tendrá que ingresar el nombre del archivo (ej. <code className="font-mono bg-slate-100 rounded px-1 text-[9.5px]">arroz.jpg</code>).
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
