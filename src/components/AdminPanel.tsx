/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Worker, Order, AuditLog, SecurityAlert, ShopSettings, UserRole, ProductCategory, SupportInquiry } from '../types';
import { SupabaseService } from '../supabaseService';
import { formatCurrency } from '../utils';
import SupabaseGuide from './SupabaseGuide';
import { 
  Users, ShoppingBag, ClipboardList, Settings, ShieldAlert, 
  TrendingUp, ArrowLeft, LogOut, Check, X, ShieldCheck, 
  Trash2, Plus, Edit2, AlertTriangle, Eye, EyeOff, LayoutDashboard, Clock, DollarSign, Database, MessageSquare
} from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
  onProductsUpdated: () => void; // Trigger storefront reload on save
}

export default function AdminPanel({ onClose, onProductsUpdated }: AdminPanelProps) {
  // Session State
  const [currentUser, setCurrentUser] = useState<Worker | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Forced Password Reset States (First login rules & secure enforcement)
  const [resetWorker, setResetWorker] = useState<Worker | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [pwdResetError, setPwdResetError] = useState<string | null>(null);
  const [pwdResetSuccess, setPwdResetSuccess] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  // Database Resources States
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  // New States: Categories, Support tickets, Active Clients
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [supportInquiries, setSupportInquiries] = useState<SupportInquiry[]>([]);
  
  // Category CRUD states
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Supabase Presence simulator (Active Visitors)
  const [activeVisitors, setActiveVisitors] = useState(8);

  // Form Modals states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', price: 0, category: '', image_url: '', stock: 10, is_visible: true, promotion_discount: 0, description: '', currency: 'CUP'
  });
  const [imgMode, setImgMode] = useState<'url' | 'file'>('url');

  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [workerForm, setWorkerForm] = useState<{
    username: string;
    name: string;
    role: 'admin' | 'gerente' | 'empleado';
    phone: string;
    is_active: boolean;
    plainPassword?: string;
  }>({
    username: '', name: '', role: 'empleado', phone: '', is_active: true, plainPassword: ''
  });
  const [workerPermissionsForm, setWorkerPermissionsForm] = useState<string[]>([]);
  const [workerMustResetPasswordForm, setWorkerMustResetPasswordForm] = useState<boolean>(true);

  // Load backend database content
  const loadDatabaseData = async () => {
    try {
      const prodList = await SupabaseService.getProducts();
      const ords = await SupabaseService.getOrders();
      const wrks = await SupabaseService.getWorkers();
      const audits = await SupabaseService.getAuditLogs();
      const alrts = await SupabaseService.getAlerts();
      const sets = await SupabaseService.getSettings();
      const cats = await SupabaseService.getCategories();
      const sups = await SupabaseService.getSupportInquiries();

      setProducts(prodList);
      setOrders(ords);
      setWorkers(wrks);
      setAuditLogs(audits);
      setAlerts(alrts);
      setSettings(sets);
      setCategories(cats);
      setSupportInquiries(sups);
    } catch (e) {
      console.error('Error loading admin panel resource pools:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadDatabaseData();
    }
  }, [currentUser]);

  // Handle Presence Tick simulation like real Supabase Presence
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveVisitors(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next >= 3 && next <= 18 ? next : prev;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Login authentication
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError('Complete todos los campos de acceso.');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await SupabaseService.login(usernameInput.trim(), passwordInput);
      if (response.success && response.worker) {
        if (response.worker.must_reset_password) {
          // Redirect to the forced password reset interface
          setResetWorker(response.worker);
          setNewPasswordInput('');
          setConfirmPasswordInput('');
          setPwdResetError(null);
          setPwdResetSuccess(false);
          setUsernameInput('');
          setPasswordInput('');
          return;
        }
        setCurrentUser(response.worker);
        setUsernameInput('');
        setPasswordInput('');
        // Push initial routing based on role
        if (response.worker.role === 'empleado') {
          setActiveTab('pedidos'); // Go immediately to active orders
        } else {
          setActiveTab('dashboard');
        }
      } else {
        setLoginError(response.error || 'Credenciales inválidas.');
      }
    } catch (err) {
      setLoginError('Error de autenticación. Intente más tarde.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Submit forced password reset
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdResetError(null);
    setPwdResetSuccess(false);

    if (!resetWorker) return;

    if (newPasswordInput !== confirmPasswordInput) {
      setPwdResetError('Las contraseñas no coinciden.');
      return;
    }

    // Complexity check: Letters + numbers + special characters (Minimum 6)
    if (newPasswordInput.length < 6) {
      setPwdResetError('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(newPasswordInput);
    const hasNumber = /\d/.test(newPasswordInput);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPasswordInput);

    if (!hasLetter || !hasNumber || !hasSpecial) {
      setPwdResetError('La contraseña debe contener letras, números y al menos un carácter especial (ej: !, @, #, $, %, +/-...).');
      return;
    }

    setIsResetLoading(true);
    try {
      const updatedWorker = {
        ...resetWorker,
        must_reset_password: false
      };
      
      await SupabaseService.saveWorker(updatedWorker, newPasswordInput);

      // Trigger safety alerts & audit log to notify admin and managers
      await SupabaseService.triggerAlert(
        'bloqueo_usuario',
        'low',
        `El colaborador "${resetWorker.name}" (${resetWorker.username}) actualizó satisfactoriamente su contraseña obligatoria de primer ingreso.`
      );
      await SupabaseService.logAudit(
        resetWorker.name, 
        'Cambio Clave Obligatoria', 
        `Se actualizó la contraseña de fábrica por una robusta SHA-256.`
      );

      setPwdResetSuccess(true);
      // Log them in after 2 seconds
      setTimeout(() => {
        setCurrentUser(updatedWorker);
        setResetWorker(null);
        if (updatedWorker.role === 'empleado') {
          setActiveTab('pedidos');
        } else {
          setActiveTab('dashboard');
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      setPwdResetError('No se pudo actualizar la contraseña. Verifique e intente nuevamente.');
    } finally {
      setIsResetLoading(false);
    }
  };

  // Logouts
  const handleLogout = () => {
    if (currentUser) {
      SupabaseService.logAudit(currentUser.name, 'Cerró Sesión', `Sesión finalizada de rol ${currentUser.role}`);
    }
    setCurrentUser(null);
  };

  // Orders managers Confirm / Cancel despachos
  const handleProcessOrder = async (orderId: string, action: 'confirmado' | 'cancelado') => {
    if (!currentUser) return;
    try {
      await SupabaseService.updateOrderStatus(orderId, action, currentUser.name, currentUser.role);
      await loadDatabaseData();
    } catch (err) {
      console.error('Error processing order:', err);
    }
  };

  // PRODUCTS SAVE
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.category || !productForm.image_url) {
      alert('Favor complete los campos requeridos (*)');
      return;
    }

    const payload: Product = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: productForm.name,
      description: productForm.description || '',
      price: Number(productForm.price) || 0,
      category: productForm.category,
      image_url: productForm.image_url,
      stock: Number(productForm.stock) || 0,
      is_visible: productForm.is_visible !== false,
      promotion_discount: Number(productForm.promotion_discount) || 0
    };

    try {
      await SupabaseService.saveProduct(payload);
      setIsProductModalOpen(false);
      setEditingProduct(null);
      await loadDatabaseData();
      onProductsUpdated(); // Notify storefront
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (confirm('¿Está totalmente seguro de eliminar este producto del inventario?')) {
      try {
        await SupabaseService.deleteProduct(id);
        await loadDatabaseData();
        onProductsUpdated();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- CATEGORY CRUD HANDLERS ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) {
      alert('Escribe el nombre de la categoría.');
      return;
    }
    try {
      const payload: ProductCategory = {
        id: editingCategory?.id || `cat-${Date.now()}`,
        name: categoryNameInput.trim()
      };
      await SupabaseService.saveCategory(payload);
      setCategoryNameInput('');
      setEditingCategory(null);
      await loadDatabaseData();
    } catch (err) {
      console.error(err);
      alert('Error guardando la categoría.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('¿Eliminar esta categoría? Los productos asociados conservarán su texto de categoría, pero ésta ya no saldrá en el selector.')) {
      try {
        await SupabaseService.deleteCategory(id);
        await loadDatabaseData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- SYSTEM WIPE UTILITIES (EXCLUSIVE FOR ADMIN) ---
  const handleClearOrdersList = async () => {
    if (!isAdmin) return;
    if (confirm('🚨 ¡PRECAUCIÓN ADVERTENCIA! ¿Estás totalmente seguro de VACIAR la totalidad de pedidos del sistema? Esta operación es irreversible.')) {
      try {
        await SupabaseService.clearOrders();
        await SupabaseService.logAudit(currentUser?.name || 'Admin', 'Vaciar Pedidos', 'Eliminó la totalidad de pedidos del sistema');
        await loadDatabaseData();
        alert('Historial de pedidos vaciado.');
      } catch (e) {
        console.error(e);
        alert('Error al vaciar los pedidos.');
      }
    }
  };

  const handleClearProductsList = async () => {
    if (!isAdmin) return;
    if (confirm('🚨 ¡PRECAUCIÓN ADVERTENCIA! ¿Estás seguro de VACIAR todo el inventario? Se eliminarán irrevocablemente todos los productos.')) {
      try {
        await SupabaseService.clearProducts();
        await SupabaseService.logAudit(currentUser?.name || 'Admin', 'Vaciar Inventario', 'Eliminó la totalidad de productos del sistema');
        await loadDatabaseData();
        onProductsUpdated();
        alert('Inventario de productos vaciado por completo.');
      } catch (e) {
        console.error(e);
        alert('Error al vaciar el inventario.');
      }
    }
  };

  const handleClearWorkersList = async () => {
    if (!isAdmin) return;
    if (confirm('🚨 ¡PRECAUCIÓN ADVERTENCIA! ¿Estás seguro de VACIAR la plantilla de colaboradores? Solo se retendrán administradores por seguridad.')) {
      try {
        await SupabaseService.clearWorkers();
        await SupabaseService.logAudit(currentUser?.name || 'Admin', 'Vaciar Personal', 'Limpieza general de personal (admins retenidos)');
        await loadDatabaseData();
        alert('Colaboradores vaciados (administradores retenidos).');
      } catch (e) {
        console.error(e);
        alert('Error al vaciar colaboradores.');
      }
    }
  };

  const handleClearAuditLogsList = async () => {
    if (!isAdmin) return;
    if (confirm('🚨 ¡PRECAUCIÓN ADVERTENCIA! ¿Estás seguro de vaciar los registros de la Bitácora?')) {
      try {
        await SupabaseService.clearAuditLogs();
        await SupabaseService.logAudit(currentUser?.name || 'Admin', 'Vaciar Bitácora', 'Inició vaciado de registros históricos de auditoría');
        await loadDatabaseData();
        alert('Buzón de Bitácora vaciado.');
      } catch (e) {
        console.error(e);
        alert('Error al de vaciar la bitácora.');
      }
    }
  };

  const handleClearAlertsList = async () => {
    if (!isAdmin) return;
    if (confirm('🚨 ¡PRECAUCIÓN ADVERTENCIA! ¿Estás seguro de borrar todas las alertas de seguridad?')) {
      try {
        await SupabaseService.clearSecurityAlerts();
        await SupabaseService.logAudit(currentUser?.name || 'Admin', 'Vaciar Alertas', 'Se vació el repositorio de alertas de seguridad');
        await loadDatabaseData();
        alert('Alertas de seguridad vaciadas con éxito.');
      } catch (e) {
        console.error(e);
        alert('Error al vaciar alertas.');
      }
    }
  };

  const handleClearSupportInquiriesList = async () => {
    if (!isAdmin) return;
    if (confirm('🚨 ¡PRECAUCIÓN ADVERTENCIA! ¿Estás seguro de vaciar todo el buzón de solicitudes de soporte de clientes?')) {
      try {
        await SupabaseService.clearSupportInquiries();
        await SupabaseService.logAudit(currentUser?.name || 'Admin', 'Vaciar Soporte', 'Buzón de quejas, reclamos y soporte técnico vaciado');
        await loadDatabaseData();
        alert('Reclamaciones de soporte vaciadas con éxito.');
      } catch (e) {
        console.error(e);
        alert('Error al vaciar soporte.');
      }
    }
  };

  // Save Worker
  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.username || !workerForm.name) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    const payload: Worker = {
      id: editingWorker?.id || `w-${Date.now()}`,
      username: workerForm.username.trim().toLowerCase(),
      name: workerForm.name.trim(),
      role: workerForm.role,
      phone: workerForm.phone.trim(),
      is_active: workerForm.is_active,
      failed_attempts: editingWorker?.failed_attempts || 0,
      locked_until: editingWorker?.locked_until || null,
      must_reset_password: workerMustResetPasswordForm,
      permissions: workerPermissionsForm
    };

    try {
      await SupabaseService.saveWorker(payload, workerForm.plainPassword);
      setIsWorkerModalOpen(false);
      setEditingWorker(null);
      await loadDatabaseData();
    } catch (err) {
      alert('Error guardando usuario. Posiblemente el nombre de usuario ya existe.');
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (confirm('¿Confirma la eliminación física de este trabajador del sistema?')) {
      try {
        await SupabaseService.deleteWorker(id);
        await loadDatabaseData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Global settings save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !currentUser) return;
    try {
      await SupabaseService.saveSettings(settings, currentUser.name);
      alert('Ajustes globales actualizados.');
      await loadDatabaseData();
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve Alarms
  const handleResolveAlert = async (id: string) => {
    try {
      await SupabaseService.resolveAlert(id);
      await loadDatabaseData();
    } catch (err) {
      console.error(err);
    }
  };

  // Permissions guards helpers
  const isEmployee = currentUser?.role === 'empleado';
  const isManager = currentUser?.role === 'gerente';
  const isAdmin = currentUser?.role === 'admin';

  // Statistics calculation
  const statsTotalRevenue = orders
    .filter(o => o.status === 'confirmado')
    .reduce((acc, o) => acc + o.total, 0);

  const statsTotalCompleted = orders.filter(o => o.status === 'confirmado').length;
  const statsTotalPending = orders.filter(o => o.status === 'pendiente').length;
  const statsLowStockCount = products.filter(p => p.stock <= 5).length;
  const statsPendingAlerts = alerts.filter(a => !a.resolved).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F9FA] text-slate-800 flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* 1. LOGIN SHIELD COMPONENT */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-950 text-white overflow-y-auto">
          <div className="max-w-md w-full">
            
            {/* Go back storefront button */}
            <button 
              onClick={onClose}
              className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la Tienda</span>
            </button>

            {/* Header logo */}
            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-slate-900 font-extrabold text-base tracking-widest shadow-lg shadow-teal-500/20">
                S
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {resetWorker ? 'Cambio de Clave Obligatorio' : 'Acceso Privado Terminal'}
                </h2>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  {resetWorker ? 'Primer ingreso de Colaborador' : 'Sistema Seguro SHA-256'}
                </p>
              </div>
            </div>

            {resetWorker ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                <div className="mb-6 text-xs text-slate-300 space-y-2">
                  <p className="font-bold text-amber-400">💡 Hola {resetWorker.name}, por motivos de seguridad informática, debes cambiar tu clave temporal antes de ver tus asignaciones.</p>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-400 space-y-1">
                    <span className="font-bold text-slate-300 block mb-1">REQUISITOS OBLIGATORIOS:</span>
                    <p>• Mínimo de <strong>6 caracteres</strong> de longitud.</p>
                    <p>• Debe contener letras (A-Z/a-z), números (0-9) y al menos <strong>un carácter especial</strong> (e.g. !, @, #, $, %, ^, &).</p>
                  </div>
                </div>

                {pwdResetError && (
                  <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 text-red-400 text-xs rounded-xl font-medium">
                    {pwdResetError}
                  </div>
                )}

                {pwdResetSuccess && (
                  <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl font-medium">
                    ✔ Contraseña guardada correctamente. Entrando...
                  </div>
                )}

                <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Nueva Contraseña Segura</label>
                    <input
                      type="password"
                      required
                      placeholder="Nueva clave personalizada"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Confirmar Contraseña</label>
                    <input
                      type="password"
                      required
                      placeholder="Repita la clave"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetWorker(null)}
                      className="w-1/3 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white font-bold text-xs p-3.5 rounded-xl border border-slate-800 cursor-pointer text-center"
                    >
                      Regresar
                    </button>
                    <button
                      type="submit"
                      disabled={isResetLoading || pwdResetSuccess}
                      className="w-2/3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs p-3.5 rounded-xl transition-all shadow-md shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      {isResetLoading ? (
                        <span>Procesando...</span>
                      ) : (
                        <span>Actualizar e Ingresar</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Form Box */
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                <div className="mb-6">
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-amber-500/20">
                    Antipiratería Lock Activo
                  </span>
                  <p className="text-xs text-slate-400 mt-2.5">
                    El sistema bloqueará temporalmente cualquier usuario con más de <strong>3 intentos incorrectos</strong> consecutivos por un período de 5 minutos.
                  </p>
                </div>

                {loginError && (
                  <div className="mb-4 p-3.5 bg-red-950/60 border border-red-800/60 text-red-400 text-xs rounded-xl font-medium flex items-start gap-2.5 animate-bounce-short">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Usuario de Acceso</label>
                    <input
                      type="text"
                      required
                      placeholder="Eje: admin, gerente, empleado"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Contraseña de Colaborador</label>
                    <input
                      type="password"
                      required
                      placeholder="Contraseña de fábrica"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600 active:scale-98 text-slate-950 font-bold text-xs p-3.5 rounded-xl transition-all shadow-md shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer animate-pulse-slow"
                  >
                    {loginLoading ? (
                      <span>Procesando Hash...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Ingresar al Sistema Seguro</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        
        // 2. ACTIVE PANEL DASHBOARD LAYOUT
        <>
          {/* Navigation drawer (Left Sidebar) */}
          <aside className="w-full md:w-64 bg-slate-950 text-slate-300 flex flex-col justify-between shrink-0 border-b md:border-b-0 md:border-r border-slate-800">
            <div>
              {/* Header inside admin */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-slate-950 font-extrabold text-xs">
                    CP
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white truncate w-36">{currentUser.name}</h3>
                    <span className="text-[9px] text-teal-400 bg-teal-950/60 uppercase tracking-wider px-1.5 py-0.5 rounded border border-teal-500/20 font-bold block mt-0.5 w-max">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                
                {/* Back to store */}
                <button 
                  onClick={onClose}
                  title="Volver a Tienda"
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 cursor-pointer md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs based on role mapping */}
              <nav className="p-4 space-y-1">
                
                {/* Dashboard: Admin & Gerente only */}
                {!isEmployee && (
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                      activeTab === 'dashboard' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Estadísticas / Inicio</span>
                  </button>
                )}

                {/* Live orders: All roles */}
                <button
                  onClick={() => setActiveTab('pedidos')}
                  className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    activeTab === 'pedidos' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Pedidos Activos</span>
                    {statsTotalPending > 0 && (
                      <span className="bg-red-500 text-white font-black text-[9px] rounded-full w-4.5 h-4.5 flex items-center justify-center animate-pulse">
                        {statsTotalPending}
                      </span>
                    )}
                  </div>
                </button>

                {/* Order History: All roles */}
                <button
                  onClick={() => setActiveTab('historial')}
                  className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    activeTab === 'historial' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Historial de Pedidos</span>
                </button>

                {/* Products Inventory: All roles (Employee update/create, but others can read/view too) */}
                <button
                  onClick={() => setActiveTab('inventario')}
                  className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    activeTab === 'inventario' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Control de Inventario</span>
                </button>

                {/* Workers CRUD: Admin only */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('trabajadores')}
                    className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                      activeTab === 'trabajadores' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Colaboradores / Staff</span>
                  </button>
                )}

                {/* Security Alerts: Admin & Gerente only */}
                {!isEmployee && (
                  <button
                    onClick={() => setActiveTab('alertas')}
                    className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer relative ${
                      activeTab === 'alertas' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>Alertas de Seguridad</span>
                      {statsPendingAlerts > 0 && (
                        <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-md leading-none">
                          {statsPendingAlerts}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* Audit Logs: Admin only */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('auditoria')}
                    className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                      activeTab === 'auditoria' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Bitácora de Cambios</span>
                  </button>
                )}

                {/* Global Settings: Admin only */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('ajustes')}
                    className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                      activeTab === 'ajustes' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Ajustes de Tienda</span>
                  </button>
                )}

                {/* Soporte / Reclamos: Visible to all staff roles, but clear-log is admin guarded */}
                <button
                  type="button"
                  onClick={() => setActiveTab('support')}
                  className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    activeTab === 'support' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Atención & Soporte</span>
                    {supportInquiries.filter(s => !s.resolved).length > 0 && (
                      <span className="bg-amber-550 border border-amber-300 text-slate-900 font-bold text-[9px] px-1.5 py-0.5 rounded animate-pulse">
                        {supportInquiries.filter(s => !s.resolved).length}
                      </span>
                    )}
                  </div>
                </button>

                {/* Database manual SQL / Realtime keys: All roles can inspect instructions */}
                <button
                  onClick={() => setActiveTab('database')}
                  className={`nav-lnk w-full flex items-center gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    activeTab === 'database' ? 'bg-teal-500 text-slate-950 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Base de Datos / SQL</span>
                </button>
              </nav>
            </div>

            {/* Logout bottom area */}
            <div className="p-4 border-t border-slate-900 space-y-2">
              <button 
                onClick={onClose}
                className="w-full text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 p-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a la Tienda</span>
              </button>

              <button 
                onClick={handleLogout}
                className="w-full text-[11px] font-extrabold bg-red-950/40 text-red-400 hover:text-white hover:bg-red-900/60 p-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>

          {/* Core Content Body */}
          <main className="flex-1 bg-[#F8F9FA] overflow-y-auto p-6 md:p-8">
            
            {/* =========================================================
                TAB 1. DASHBOARD OVERVIEW 
                ========================================================= */}
            {activeTab === 'dashboard' && !isEmployee && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-200 pb-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Panel Control e Indicadores</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Estadísticas operativas consolidadas en tiempo real</p>
                  </div>

                  {/* Realtime database status bar */}
                  <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tráfico Live (Supabase Presence)</p>
                      <p className="text-xs font-extrabold text-slate-800">{activeVisitors} clientes activos en este instante</p>
                    </div>
                  </div>
                </div>

                {/* Quad-Grid widgets layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Invoiced Revenue widget */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Caja Facturada</p>
                      <h4 className="text-lg font-black text-slate-900">{formatCurrency(statsTotalRevenue, settings?.currency || '€')}</h4>
                      <span className="text-[9px] text-emerald-600 font-bold">{statsTotalCompleted} pedidos confirmados</span>
                    </div>
                  </div>

                  {/* Pending Orders widget */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Pedidos Pendientes</p>
                      <h4 className="text-lg font-black text-slate-900">{statsTotalPending} órdenes</h4>
                      <span className="text-[9px] text-blue-600 font-bold">Por despachar o cancelar</span>
                    </div>
                  </div>

                  {/* Inventory Warning widget */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Alertas Stock</p>
                      <h4 className="text-lg font-black text-slate-900">{statsLowStockCount} productos</h4>
                      <span className="text-[9px] text-amber-600 font-bold">Stock crítico (mínimo &lt;= 5)</span>
                    </div>
                  </div>

                  {/* Security Alerts widget */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Alarmas Sistema</p>
                      <h4 className="text-lg font-black text-slate-900">{statsPendingAlerts} críticas</h4>
                      <span className="text-[9px] text-red-600 font-bold">Vigilancia de seguridad activa</span>
                    </div>
                  </div>
                </div>

                {/* Recent Orders Overview */}
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" /> Rendimiento de la Tienda
                  </h3>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs leading-relaxed text-slate-600 space-y-2">
                    <p><strong>Configuración de Alertas Automáticas de Inventario:</strong> Si el stock baja de 5 unidades, el sistema generará una alerta de seguridad silenciosa y destacará al producto en el listado para el empleado.</p>
                    <p><strong>Historial de Auditoría inmutable:</strong> Cada vez que realices configuraciones globales, registres productos o apruebes facturas, quedará marcado irrevocablemente en la pestaña de Bitácoras para el usuario administrador.</p>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 2. ACTIVE ORDERS MANAGER
                ========================================================= */}
            {activeTab === 'pedidos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Pedidos Recibidos Pendientes</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Controla, valida las facturas de clientes y confirma sus envíos.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={handleClearOrdersList}
                        className="text-xs font-bold border border-red-200 hover:bg-red-50 text-red-650 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
                      >
                        Vaciar Pedidos (Admin)
                      </button>
                    )}
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300">
                      Sincronización Supabase Realtime
                    </span>
                  </div>
                </div>

                {orders.filter(o => o.status === 'pendiente').length === 0 ? (
                  <div id="no-pending-orders" className="bg-white p-12 text-center rounded-2xl border border-gray-200/60 max-w-sm mx-auto">
                    <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800 text-sm">No hay pedidos pendientes</h3>
                    <p className="text-xs text-slate-400 mt-1">Todos los tickets de compra ingresados de momento han sido despachados o cancelados oportunamente.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders
                      .filter(o => o.status === 'pendiente')
                      .map(order => {
                        return (
                          <div 
                            key={order.id}
                            className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden"
                          >
                            {/* Header row */}
                            <div className="px-5 py-3.5 bg-slate-50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="bg-teal-100 text-teal-800 font-bold text-xs px-2.5 py-1 rounded-md">
                                  {order.invoice_number}
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">{new Date(order.created_at).toLocaleString('es-ES')}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-500 font-semibold">Total del Ticket:</span>
                                <strong className="text-sm font-extrabold text-slate-900">
                                  {formatCurrency(order.total, settings?.currency || '€')}
                                </strong>
                              </div>
                            </div>

                            {/* Main Body */}
                            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Buyer details */}
                              <div className="space-y-1 text-xs">
                                <p className="text-slate-400 font-bold uppercase tracking-wide text-[9px] mb-2">Datos del Cliente</p>
                                <p className="text-slate-850"><strong>Cliente:</strong> {order.customer_name} {order.customer_lastname}</p>
                                {order.customer_nickname && (
                                  <p className="text-slate-700"><strong>Apodo / Encargo:</strong> {order.customer_nickname}</p>
                                )}
                                <p className="text-slate-750"><strong>Teléfono:</strong> {order.customer_phone}</p>
                                <div className="mt-2 text-slate-650 bg-slate-50 border border-slate-100 p-2.5 rounded-lg leading-relaxed">
                                  <p><strong>Dirección:</strong> {order.customer_address}</p>
                                  {order.customer_reference && (
                                    <p className="mt-1 text-slate-500 italic"><strong>Ref:</strong> {order.customer_reference}</p>
                                  )}
                                </div>
                              </div>

                              {/* Products details */}
                              <div className="md:col-span-2 flex flex-col justify-between">
                                <div>
                                  <p className="text-slate-400 font-bold uppercase tracking-wide text-[9px] mb-2">Desglose de Productos</p>
                                  <div className="border border-gray-100 rounded-xl overflow-hidden text-xs max-h-[150px] overflow-y-auto">
                                    <table className="w-full text-left">
                                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                                        <tr>
                                          <th className="px-4 py-2">Detalle Ítem</th>
                                          <th className="px-4 py-2 text-right">Cant.</th>
                                          <th className="px-4 py-2 text-right">Unitario</th>
                                          <th className="px-4 py-2 text-right">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                        {order.items.map((it, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-2 font-semibold text-slate-800">{it.product_name}</td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-600">{it.quantity}</td>
                                            <td className="px-4 py-2 text-right font-medium text-slate-500">{formatCurrency(it.price_sold, settings?.currency || '€')}</td>
                                            <td className="px-4 py-2 text-right font-black text-slate-800">{formatCurrency(it.price_sold * it.quantity, settings?.currency || '€')}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Processing Action triggers */}
                                <div className="mt-6 pt-4 border-t border-gray-50 flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleProcessOrder(order.id, 'cancelado')}
                                    className="text-xs bg-red-50 text-red-600 hover:bg-red-150 font-bold px-4 py-2 rounded-xl border border-red-200/30 transition-all cursor-pointer"
                                  >
                                    Rechazar / Cancelar Pedido
                                  </button>
                                  <button
                                    onClick={() => handleProcessOrder(order.id, 'confirmado')}
                                    className="text-xs bg-slate-900 text-white hover:bg-slate-800 font-bold px-4.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                                  >
                                    Confirmar Despacho
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                TAB 3. ALL COMPLETED ORDERS HISTORY RECORDS
                ========================================================= */}
            {activeTab === 'historial' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Historial del Local</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Bitácora histórica de pedidos cerrados y colaboradores encargados de su despacho.</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleClearOrdersList}
                      className="text-xs font-bold border border-red-200 hover:bg-red-50 text-red-650 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
                    >
                      Vaciar Pedidos (Admin)
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden text-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFBFB] text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Factura N°</th>
                          <th className="px-6 py-4">Fecha</th>
                          <th className="px-6 py-4">Comprador</th>
                          <th className="px-6 py-4">Monto total</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="px-6 py-4">Procesado Por</th>
                        </tr>
                      </thead>
                      <tbody id="tbl-history-rows" className="divide-y divide-gray-100">
                        {orders.filter(o => o.status !== 'pendiente').length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">No se han procesado pedidos de momento en el historial.</td>
                          </tr>
                        ) : (
                          orders
                            .filter(o => o.status !== 'pendiente')
                            .map(order => {
                              return (
                                <tr key={order.id} className="hover:bg-slate-50/55 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-900">{order.invoice_number}</td>
                                  <td className="px-6 py-4 text-slate-500">{new Date(order.created_at).toLocaleString('es-ES')}</td>
                                  <td className="px-6 py-4 font-semibold text-slate-700">{order.customer_name} {order.customer_lastname}</td>
                                  <td className="px-6 py-4 font-black">{formatCurrency(order.total, settings?.currency || '€')}</td>
                                  <td className="px-6 py-4">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                      order.status === 'confirmado' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                        : 'bg-red-50 text-red-600 border border-red-100'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {order.processed_by ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-800">{order.processed_by}</span>
                                        <span className="text-[9px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded-md font-medium uppercase font-mono">
                                          {order.processed_role}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic">No asignado</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 4. PRODUCTS CATALOG CRUD
                ========================================================= */}
            {activeTab === 'inventario' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Control de Existencias & Precios</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Agrega promociones especiales, administra stocks críticos u oculta productos.</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Clear checklist button ONLY FOR ADMIN */}
                    {isAdmin && (
                      <button
                        onClick={handleClearProductsList}
                        className="text-xs font-bold border border-red-200 hover:bg-red-50 text-red-650 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 animate-fade-in"
                      >
                        Vaciar Inventario (Admin)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsCategoryManagerOpen(true);
                      }}
                      className="text-xs font-bold border border-slate-200 hover:border-slate-350 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                    >
                      <span>Gestionar Categorías</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({
                          name: '', price: 0, category: categories[0]?.name || 'Tecnología', image_url: '', stock: 10, is_visible: true, promotion_discount: 0, description: '', currency: 'CUP'
                        });
                        setIsProductModalOpen(true);
                      }}
                      className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Producto Nuevo</span>
                    </button>
                  </div>
                </div>

                {/* Grid listing */}
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden text-xs">
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFBFB] text-[10px] font-bold text-slate-500 uppercase border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-3">Miniatura</th>
                          <th className="px-5 py-3">Nombre / Categoría</th>
                          <th className="px-5 py-3 text-right">Precio Base</th>
                          <th className="px-5 py-3 text-center">Descuento Promo</th>
                          <th className="px-5 py-3 text-right">Precio de Rebaja</th>
                          <th className="px-5 py-3 text-center">Stock Físico</th>
                          <th className="px-5 py-3 text-center">Visible Tienda</th>
                          <th className="px-5 py-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.map(prod => {
                          const currencySymbol = settings?.currency || '€';
                          const discounted = prod.price * (1 - prod.promotion_discount / 100);
                          const isLowST = prod.stock <= 5;

                          return (
                            <tr key={prod.id} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3">
                                <img 
                                  src={prod.image_url} 
                                  alt="" 
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 object-cover rounded-lg border border-gray-150"
                                />
                              </td>
                              <td className="px-5 py-3">
                                <span className="font-bold text-slate-800 block text-xs">{prod.name}</span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 font-bold px-1.5 py-0.5 rounded uppercase font-mono mt-1 inline-block">
                                  {prod.category}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right font-semibold text-slate-600">
                                {formatCurrency(prod.price, currencySymbol)}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {prod.promotion_discount > 0 ? (
                                  <span className="bg-red-50 text-red-600 font-black text-[9px] px-2 py-0.5 rounded border border-red-100">
                                    -{prod.promotion_discount}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Sin descuento</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right font-black text-slate-900">
                                {prod.promotion_discount > 0 ? (
                                  <span className="text-red-650">{formatCurrency(discounted, currencySymbol)}</span>
                                ) : (
                                  <span className="text-slate-500">{formatCurrency(prod.price, currencySymbol)}</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`font-black text-xs px-2.5 py-1 rounded-md leading-none ${
                                  prod.stock === 0 
                                    ? 'bg-red-150 text-red-700' 
                                    : isLowST 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-emerald-50 text-emerald-850'
                                }`}>
                                  {prod.stock}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <button
                                  onClick={async () => {
                                    const updated = { ...prod, is_visible: !prod.is_visible };
                                    await SupabaseService.saveProduct(updated);
                                    await loadDatabaseData();
                                    onProductsUpdated();
                                  }}
                                  title="Presiona para alternar visibilidad sin eliminar"
                                  className="mx-auto block"
                                >
                                  {prod.is_visible ? (
                                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-100 mx-auto font-semibold">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Activo</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-slate-505 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md border border-gray-200 mx-auto font-semibold">
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>Oculto</span>
                                    </div>
                                  )}
                                </button>
                              </td>
                              {/* Edit details trigger */}
                              <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingProduct(prod);
                                      setProductForm(prod);
                                      setIsProductModalOpen(true);
                                    }}
                                    className="p-1 px-2 border border-gray-200 hover:border-slate-400 rounded hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer font-bold"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 5. STAFF ROSTER (ADMIN & GERENTE)
                ========================================================= */}
            {activeTab === 'trabajadores' && (isAdmin || isManager) && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Control de Personal Autorizado</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Crea, edita o desvincula colaboradores bajo perfil jerárquico.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Clear checklist button ONLY FOR ADMIN */}
                    {isAdmin && (
                      <button
                        onClick={handleClearWorkersList}
                        className="text-xs font-bold border border-red-200 hover:bg-red-50 text-red-650 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
                      >
                        Vaciar Fichas (Admin)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingWorker(null);
                        setWorkerForm({
                          username: '', name: '', role: 'empleado', phone: '', is_active: true, plainPassword: ''
                        });
                        setWorkerPermissionsForm(['view_orders', 'process_orders']); // Default employee permissions
                        setWorkerMustResetPasswordForm(true); // Force password reset on first signin
                        setIsWorkerModalOpen(true);
                      }}
                      className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Contratar Colaborador</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden text-xs">
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left font-sans">
                      <thead className="bg-[#FAFBFB] text-[10px] font-bold text-slate-500 uppercase border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-3">Nombre Completo</th>
                          <th className="px-5 py-3">Nombre Usuario</th>
                          <th className="px-5 py-3">Rol del Cargo</th>
                          <th className="px-5 py-3">Teléfono Movil</th>
                          <th className="px-5 py-3 text-center">Estado de Entrada</th>
                          <th className="px-5 py-3 text-center">Configuración</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {workers.map(w => {
                          const isBlocked = w.locked_until && new Date(w.locked_until).getTime() > Date.now();
                          // Admin can configure everyone. Gerente can only configure "empleado" role.
                          const canConfigure = isAdmin || (isManager && w.role === 'empleado');
                          
                          return (
                            <tr key={w.id} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3 font-bold text-slate-800">{w.name}</td>
                              <td className="px-5 py-3 font-mono text-slate-650">{w.username}</td>
                              <td className="px-5 py-3 font-semibold">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  w.role === 'admin' 
                                    ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                    : w.role === 'gerente' 
                                    ? 'bg-blue-50 text-blue-750 border border-blue-100' 
                                    : 'bg-slate-100 text-slate-700 border border-gray-200'
                                }`}>
                                  {w.role}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-slate-505">{w.phone || 'S/N'}</td>
                              <td className="px-5 py-3 text-center">
                                {isBlocked ? (
                                  <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded animate-pulse">
                                    Bloqueado temporalmente
                                  </span>
                                ) : w.must_reset_password ? (
                                  <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded">
                                    Requiere cambio de clave
                                  </span>
                                ) : w.is_active ? (
                                  <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                                    Habilitado
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded">
                                    Desactivado
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {canConfigure ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingWorker(w);
                                        setWorkerForm({
                                          username: w.username,
                                          name: w.name,
                                          role: w.role,
                                          phone: w.phone || '',
                                          is_active: w.is_active,
                                          plainPassword: '' 
                                        });
                                        setWorkerPermissionsForm(w.permissions || []);
                                        setWorkerMustResetPasswordForm(w.must_reset_password || false);
                                        setIsWorkerModalOpen(true);
                                      }}
                                      className="p-1 px-2 border border-gray-200 hover:border-slate-400 rounded hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer text-[10px]"
                                    >
                                      Editar Permisos
                                    </button>
                                    {w.role !== 'admin' && w.id !== 'w-1' && ( 
                                      <button
                                        onClick={() => handleDeleteWorker(w.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Solo Lectura</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 6. HISTORIC AUDIT TRAILS (ADMIN ONLY)
                ========================================================= */}
            {activeTab === 'auditoria' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Bitácora Integral de Tienda</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Control inmutable de auditoría para verificar cambios en existencias, accesos, etc.</p>
                  </div>
                  <button
                    onClick={handleClearAuditLogsList}
                    className="text-xs font-bold border border-red-200 hover:bg-red-50 text-red-650 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
                  >
                    Vaciar Bitácora (Admin)
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                    <span>Los logs se escriben automáticamente después de cada transacción sensible del sistema.</span>
                  </div>

                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
                    {auditLogs.map(log => (
                      <div 
                        key={log.id} 
                        className="p-3 bg-white border border-gray-150 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800 font-bold">{log.user}</strong>
                            <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.2 rounded font-mono uppercase">System log</span>
                            <span className="text-[10px] text-teal-600 font-bold">» {log.action}</span>
                          </div>
                          <p className="text-slate-505 leading-relaxed">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {new Date(log.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 7. ALERTMANGER (ADMIN & GERENTE ONLY)
                ========================================================= */}
            {activeTab === 'alertas' && !isEmployee && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Consola de Alertas del Establecimiento</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Monitoreo automático de incidencias, errores repetidos de login e inventarios en cero.</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleClearAlertsList}
                      className="text-xs font-bold border border-red-200 hover:bg-red-50 text-red-650 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 animate-fade-in"
                    >
                      Vaciar Alertas (Admin)
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {alerts.map(alrt => {
                    const isHigh = alrt.severity === 'high';
                    const isMed = alrt.severity === 'medium';
                    return (
                      <div 
                        key={alrt.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          alrt.resolved 
                            ? 'bg-slate-50 border-gray-200 text-slate-505'
                            : isHigh 
                            ? 'bg-red-50 border-red-150 text-red-800' 
                            : isMed 
                            ? 'bg-amber-50 border-amber-150 text-amber-800'
                            : 'bg-blue-50 border-blue-150 text-blue-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              alrt.resolved 
                                ? 'bg-slate-300'
                                : isHigh 
                                ? 'bg-red-500 animate-ping' 
                                : isMed 
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}></span>
                            <span className="font-bold uppercase tracking-wider text-[9px]">Alerta {alrt.type}</span>
                            <span className="text-[10px] text-slate-400">{new Date(alrt.timestamp).toLocaleString('es-ES')}</span>
                          </div>
                          <p className="font-semibold">{alrt.message}</p>
                        </div>

                        {!alrt.resolved ? (
                          <button
                            onClick={() => handleResolveAlert(alrt.id)}
                            className="text-[11px] font-bold bg-white border px-3 py-1 rounded-lg hover:shadow-xs transition-shadow cursor-pointer"
                          >
                            Marcar Resuelto
                          </button>
                        ) : (
                          <span className="text-[10px] italic font-semibold text-slate-400">Resuelto / Atendido</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 8. GLOBAL SITE CONFIGURATION (ADMIN ONLY)
                ========================================================= */}
            {activeTab === 'ajustes' && isAdmin && settings && (
              <div className="max-w-2xl space-y-6 animate-fade-in">
                <div className="border-b border-gray-200 pb-5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Ajustes Generales de la Tienda</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Controla y personaliza las firmas, horarios de atención, números de contacto y despacho.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-4 shadow-sm text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nombre Comercial de la Tienda</label>
                      <input
                        type="text"
                        required
                        value={settings.shop_name}
                        onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Símbolo de Divisa Precedente</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: €, $, Q"
                        value={settings.currency}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Descripción / Eslogan Comercial</label>
                    <input
                      type="text"
                      required
                      value={settings.shop_description}
                      onChange={(e) => setSettings({ ...settings, shop_description: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Teléfono Público de Soporte</label>
                      <input
                        type="text"
                        required
                        value={settings.contact_number}
                        onChange={(e) => setSettings({ ...settings, contact_number: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">WhatsApp para Ticket de Compra</label>
                      <input
                        type="text"
                        required
                        placeholder="Sin el + ej: 34600000000"
                        value={settings.whatsapp_number}
                        onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Formato internacional sin el símbolo "+" ni espacios intermedios.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Dirección del Establecimiento</label>
                    <input
                      type="text"
                      required
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Horario Comercial de Atención</label>
                    <input
                      type="text"
                      required
                      value={settings.business_hours}
                      onChange={(e) => setSettings({ ...settings, business_hours: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-150 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-sans">Enlace / URL del Logo del Negocio</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={settings.shop_logo_url || ''}
                        onChange={(e) => setSettings({ ...settings, shop_logo_url: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-sans">Texto del Buscador Inteligente</label>
                      <input
                        type="text"
                        placeholder="Ej: Búsqueda Inteligente"
                        value={settings.smart_search_text || ''}
                        onChange={(e) => setSettings({ ...settings, smart_search_text: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-150 pb-2 space-y-3">
                    <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-sans">Ventana "Sobre Nosotros" (About Panel)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="aboutVisChk"
                        checked={!!settings.about_visible}
                        onChange={(e) => setSettings({ ...settings, about_visible: e.target.checked })}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <label htmlFor="aboutVisChk" className="font-semibold text-slate-700 text-[11px] select-none cursor-pointer">
                        Mostrar en la tienda (Ícono al lado del carrito)
                      </label>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contenido de la ventana de Presentación</label>
                      <textarea
                        rows={3}
                        placeholder="Escribe la historia o información del negocio comercial para tus clientes..."
                        value={settings.about_text || ''}
                        onChange={(e) => setSettings({ ...settings, about_text: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed font-sans resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-slate-950 hover:bg-slate-900 font-bold py-2.5 px-5 rounded-xl text-white shadow transition-all cursor-pointer"
                  >
                    Guardar Ajustes Estáticos
                  </button>
                </form>
              </div>
            )}

            {/* =========================================================
                TAB 8. CUSTOMER SUPPORT & INQUIRIES
                ========================================================= */}
            {activeTab === 'support' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Atención a Clientes & Soporte</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Controla las dudas, quejas, reclamaciones generales e inquietudes mandadas por los clientes.</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleClearSupportInquiriesList}
                      className="text-xs font-bold border border-red-200 hover:bg-red-50 text-red-650 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 animate-fade-in"
                    >
                      Vaciar Soporte (Admin)
                    </button>
                  )}
                </div>

                {supportInquiries.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-gray-200/60 max-w-sm mx-auto">
                    <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800 text-sm">Buzón de Soporte Limpio</h3>
                    <p className="text-xs text-slate-400 mt-1">Estimado colaborador, no hay ninguna queja o incidencia de clientes pendiente de resolver.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportInquiries.map(inq => {
                      const isResolved = !!inq.resolved;
                      return (
                        <div 
                          key={inq.id}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs bg-white transition-all ${
                            isResolved ? 'border-gray-150 bg-slate-50/50 opacity-80' : 'border-teal-150 bg-white shadow-xs'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{inq.customer_name}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-150 px-1.5 py-0.5 rounded font-mono">
                                {inq.customer_phone || 'Sin número'}
                              </span>
                              {isResolved ? (
                                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-widest">
                                  Resuelto
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest animate-pulse">
                                  Pendiente
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 ml-auto font-mono">
                                {inq.created_at ? new Date(inq.created_at).toLocaleString() : 'Recién'}
                              </span>
                            </div>
                            <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                              "{inq.message}"
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={async () => {
                                const updated = { ...inq, resolved: !isResolved };
                                try {
                                  await SupabaseService.saveSupportInquiry(updated);
                                  await SupabaseService.logAudit(
                                    currentUser?.name || 'Admin', 
                                    'Actualizar Soporte', 
                                    `Solución cambiada a ${updated.resolved ? 'RESUELTO' : 'PENDIENTE'} para de cliente: ${inq.customer_name}`
                                  );
                                  await loadDatabaseData();
                                } catch (err) {
                                  alert('Error al actualizar soporte.');
                                }
                              }}
                              className={`p-2 px-3 rounded-lg font-bold text-[11px] cursor-pointer cursor-semibold transition-all ${
                                isResolved 
                                  ? 'bg-slate-200 hover:bg-slate-250 text-slate-700' 
                                  : 'bg-teal-600 hover:bg-teal-705 text-white shadow-xs'
                              }`}
                            >
                              {isResolved ? 'Marcar Pendiente' : 'Marcar Solucionado'}
                            </button>

                            {isAdmin && (
                              <button
                                onClick={async () => {
                                  if (confirm(`¿Eliminar de forma permanente el mensaje de "${inq.customer_name}"?`)) {
                                    try {
                                      await SupabaseService.deleteSupportInquiry(inq.id);
                                      await SupabaseService.logAudit(
                                        currentUser?.name || 'Admin', 
                                        'Borrar Soporte', 
                                        `Incompatibilidad o mensaje de ${inq.customer_name} borrado`
                                      );
                                      await loadDatabaseData();
                                    } catch (err) {
                                      alert('Error al borrar soporte.');
                                    }
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Borrar ticket de soporte permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                TAB 9. DATABASE MANUAL / CAPABILITIES
                ========================================================= */}
            {activeTab === 'database' && (
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Estructuras Supabase Realtime</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Controla tu motor de base de datos elástico en tiempo real.</p>
                </div>
                <SupabaseGuide />
              </div>
            )}

          </main>
        </>
      )}

      {/* =========================================================
          4. FORM MODAL PRODUCTS (Add / Edit)
          ========================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-xs animate-scale-up">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">{editingProduct ? 'Editar Producto del Registro' : 'Agregar Nuevo Producto'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Nombre Ítem <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={productForm.name || ''}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Categoría <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={productForm.category || ''}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="" disabled>-- Seleccione Categoría --</option>
                    {categories.length === 0 ? (
                      <>
                        <option value="Tecnología">Tecnología</option>
                        <option value="Audio">Audio</option>
                        <option value="Moda">Moda</option>
                        <option value="Hogar">Hogar</option>
                      </>
                    ) : (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Descripción Detallada</label>
                <textarea
                  rows={2}
                  value={productForm.description || ''}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Moneda del Ítem</label>
                  <select
                    value={productForm.currency || 'CUP'}
                    onChange={(e) => setProductForm({ ...productForm, currency: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none font-bold cursor-pointer"
                  >
                    <option value="CUP">CUP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="MLC">MLC</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Precio <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">% de Rebaja</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={productForm.promotion_discount || 0}
                    onChange={(e) => setProductForm({ ...productForm, promotion_discount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Existencia <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.stock || 0}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">
                  Carga visual del producto
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-gray-150 text-[10px]">
                  <div className="flex gap-4 border-b border-gray-100 pb-2 mb-1 font-bold">
                    <button
                      type="button"
                      onClick={() => setImgMode('url')}
                      className={`pb-1 uppercase tracking-widest cursor-pointer ${imgMode === 'url' ? 'border-b-2 border-teal-650 text-teal-700' : 'text-slate-400'}`}
                    >
                      Enlace URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgMode('file')}
                      className={`pb-1 uppercase tracking-widest cursor-pointer ${imgMode === 'file' ? 'border-b-2 border-teal-650 text-teal-700' : 'text-slate-400'}`}
                    >
                      Cargar Archivo Local
                    </button>
                  </div>

                  {imgMode === 'url' ? (
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={productForm.image_url || ''}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                      className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none font-mono"
                    />
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setProductForm({ ...productForm, image_url: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-xs text-slate-550 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                      />
                      {productForm.image_url && productForm.image_url.startsWith('data:') && (
                        <p className="text-[9px] text-emerald-600 font-bold">✓ Archivo convertido a base64 con éxito.</p>
                      )}
                    </div>
                  )}

                  {productForm.image_url && (
                    <div className="mt-2 flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-150">
                      <img
                        src={productForm.image_url}
                        alt="Vista previa"
                        className="w-9 h-9 object-cover rounded-lg"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=80&q=80';
                        }}
                      />
                      <span className="text-[9px] text-slate-400 truncate max-w-[200px] font-mono">
                        {productForm.image_url}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="visibleChk"
                  checked={productForm.is_visible !== false}
                  onChange={(e) => setProductForm({ ...productForm, is_visible: e.target.checked })}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="visibleChk" className="font-semibold text-slate-750 select-none text-[11px] cursor-pointer">
                  Visibilidad en la Tienda
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white py-2 px-5 rounded-xl font-bold shadow cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          5. FORM MODAL WORKERS STAFF (Add / Edit)
          ========================================================= */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-xs animate-scale-up">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">{editingWorker ? 'Configurar Trabajador' : 'Contratar Nuevo Colaborador'}</h3>
              <button onClick={() => setIsWorkerModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Eje: Sofía Pérez"
                    value={workerForm.name || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Nombre de Usuario <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Eje: sofia_empleado"
                    value={workerForm.username || ''}
                    disabled={!!editingWorker}
                    onChange={(e) => setWorkerForm({ ...workerForm, username: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Cargo / Rol Asignado</label>
                  <select
                    value={workerForm.role}
                    disabled={!isAdmin && workerForm.role !== 'empleado'}
                    onChange={(e) => {
                      const newRole = e.target.value as 'admin' | 'gerente' | 'empleado';
                      setWorkerForm({ ...workerForm, role: newRole });
                      // Pre-fill standard default permissions
                      if (newRole === 'admin') {
                        setWorkerPermissionsForm(['view_dashboard', 'view_orders', 'process_orders', 'manage_inventory', 'manage_workers', 'view_audit_logs', 'configure_settings']);
                      } else if (newRole === 'gerente') {
                        setWorkerPermissionsForm(['view_dashboard', 'view_orders', 'process_orders', 'manage_inventory', 'view_audit_logs']);
                      } else {
                        setWorkerPermissionsForm(['view_orders', 'process_orders']);
                      }
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none font-semibold disabled:bg-slate-100 disabled:text-slate-450"
                  >
                    <option value="empleado">Empleado de Despacho (Solo productos y pedidos)</option>
                    {isAdmin && (
                      <>
                        <option value="gerente">Gerente de Local (Dashboard, inventario, pedidos, alarmas)</option>
                        <option value="admin">Administrador General (Privilegios totales)</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Teléfono Móvil</label>
                  <input
                    type="text"
                    placeholder="Eje: 654321098"
                    value={workerForm.phone || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">
                  {editingWorker ? 'Nueva Contraseña (Dejar vacío para conservar)' : 'Contraseña Inicial de Acceso *' }
                </label>
                <input
                  type="password"
                  required={!editingWorker}
                  placeholder={editingWorker ? 'No editable / Encriptación SHA-250' : 'Contraseña segura de acceso'}
                  value={workerForm.plainPassword || ''}
                  onChange={(e) => setWorkerForm({ ...workerForm, plainPassword: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none font-mono"
                />
              </div>

              {/* PERMISSIONS SELECTOR FOR WORKERS */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="block text-[10px] font-black text-slate-800 uppercase tracking-widest">
                  Permisos Específicos de Acceso (Dashboard & Pestañas)
                </span>
                <p className="text-[10px] text-slate-500">
                  Configure explícitamente a qué herramientas de back-office tendrá acceso el colaborador:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { key: 'view_dashboard', label: 'Ver Panel / Estadísticas' },
                    { key: 'view_orders', label: 'Ver Pedidos de Tienda' },
                    { key: 'process_orders', label: 'Procesar/Confirmar Pedidos' },
                    { key: 'manage_inventory', label: 'Gestionar Inventario' },
                    { key: 'manage_workers', label: 'Gestionar Personal (Admin/Gerente)' },
                    { key: 'view_audit_logs', label: 'Ver Bitácora de Cambios' },
                    { key: 'configure_settings', label: 'Editar Ajustes de Tienda' },
                  ].map((pItem) => {
                    const isChecked = workerPermissionsForm.includes(pItem.key);
                    const isReadOnly = !isAdmin && pItem.key === 'manage_workers';

                    return (
                      <label key={pItem.key} className="flex items-center gap-2 text-[10px] text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWorkerPermissionsForm(prev => [...prev, pItem.key]);
                            } else {
                              setWorkerPermissionsForm(prev => prev.filter(k => k !== pItem.key));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className={isReadOnly ? "text-slate-400" : ""}>{pItem.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mustResetPass"
                  checked={workerMustResetPasswordForm}
                  onChange={(e) => setWorkerMustResetPasswordForm(e.target.checked)}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="mustResetPass" className="font-semibold text-slate-750 select-none text-[11px] cursor-pointer">
                  Forzar cambio de clave obligatorio en el próximo ingreso (SHA-256)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeWorker"
                  checked={workerForm.is_active !== false}
                  disabled={editingWorker?.role === 'admin'} // Admin cannot be deactivated
                  onChange={(e) => setWorkerForm({ ...workerForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="activeWorker" className="font-semibold text-slate-750 select-none text-[11px] cursor-pointer">
                  Colaborador activo habilitado
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white py-2 px-5 rounded-xl font-bold shadow cursor-pointer"
                >
                  {editingWorker ? 'Guardar Cambios' : 'Contratar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-xs animate-scale-up">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Gestionar Categorías del Negocio</h3>
              <button 
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCategory(null);
                  setCategoryNameInput('');
                }} 
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Form Input for saving/editing */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!categoryNameInput.trim()) return;
                  try {
                    const payload = {
                      id: editingCategory?.id || `cat-${Date.now()}`,
                      name: categoryNameInput.trim()
                    };
                    await SupabaseService.saveCategory(payload);
                    setCategoryNameInput('');
                    setEditingCategory(null);
                    // Refresh
                    await loadDatabaseData();
                  } catch (err) {
                    alert('Error al guardar categoría.');
                  }
                }}
                className="flex items-center gap-2 p-3 bg-slate-50 border border-gray-150 rounded-xl"
              >
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">
                    {editingCategory ? 'Editando Nombre' : 'Nueva Categoría'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Eje: Electrodomésticos"
                    value={categoryNameInput}
                    onChange={(e) => setCategoryNameInput(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-gray-205 rounded-lg focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#14B8A6] hover:bg-teal-650 text-slate-950 font-extrabold p-2.5 px-4 rounded-xl mt-4 self-end cursor-pointer"
                >
                  {editingCategory ? 'Guardar' : 'Agregar'}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryNameInput('');
                    }}
                    className="border border-gray-250 bg-white hover:bg-slate-50 text-slate-500 font-semibold p-2.5 px-3 rounded-xl mt-4 self-end cursor-pointer"
                  >
                    Salir
                  </button>
                )}
              </form>

              {/* List showing editable/deletable categories */}
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                <span className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Categorías Registradas</span>
                {categories.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-4">No hay categorías registradas. Se usarán valores por defecto.</p>
                ) : (
                  categories.map((cat) => (
                    <div 
                      key={cat.id} 
                      className="p-2.5 bg-white border border-gray-155 rounded-xl flex items-center justify-between hover:bg-slate-50/50"
                    >
                      <span className="font-bold text-slate-805">{cat.name}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryNameInput(cat.name);
                          }}
                          className="p-1 px-2 text-[10px] border border-gray-205 rounded bg-white font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`¿Confirma eliminar la categoría "${cat.name}"? Los productos que la utilicen no se borrarán.`)) {
                              try {
                                await SupabaseService.deleteCategory(cat.id);
                                if (editingCategory?.id === cat.id) {
                                  setEditingCategory(null);
                                  setCategoryNameInput('');
                                }
                                await loadDatabaseData();
                              } catch (err) {
                                alert('Error al borrar categoría.');
                              }
                            }
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
