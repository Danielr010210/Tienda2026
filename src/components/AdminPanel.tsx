/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Worker, Order, AuditLog, SecurityAlert, ShopSettings, UserRole } from '../types';
import { SupabaseService } from '../supabaseService';
import { formatCurrency } from '../utils';
import SupabaseGuide from './SupabaseGuide';
import { 
  Users, ShoppingBag, ClipboardList, Settings, ShieldAlert, 
  TrendingUp, ArrowLeft, LogOut, Check, X, ShieldCheck, 
  Trash2, Plus, Edit2, AlertTriangle, Eye, EyeOff, LayoutDashboard, Clock, DollarSign, Database
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

  // Database Resources States
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Supabase Presence simulator (Active Visitors)
  const [activeVisitors, setActiveVisitors] = useState(8);

  // Form Modals states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', price: 0, category: '', image_url: '', stock: 10, is_visible: true, promotion_discount: 0, description: ''
  });

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

  // Load backend database content
  const loadDatabaseData = async () => {
    try {
      const prodList = await SupabaseService.getProducts();
      const ords = await SupabaseService.getOrders();
      const wrks = await SupabaseService.getWorkers();
      const audits = await SupabaseService.getAuditLogs();
      const alrts = await SupabaseService.getAlerts();
      const sets = await SupabaseService.getSettings();

      setProducts(prodList);
      setOrders(ords);
      setWorkers(wrks);
      setAuditLogs(audits);
      setAlerts(alrts);
      setSettings(sets);
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
      locked_until: editingWorker?.locked_until || null
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
                <h2 className="text-xl font-black text-white tracking-tight">Acceso Privado Terminal</h2>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Módulos multi-rol blindados con SHA-256</p>
              </div>
            </div>

            {/* Form Box */}
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

                <div className="text-[10px] text-slate-500 italic pb-1">
                  💡 Tip Demo: Prueba con <strong>admin</strong> / <strong>Admin123!</strong> para ver todas las utilitarias.
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-teal-500 hover:bg-teal-600 active:scale-98 text-slate-950 font-bold text-xs p-3.5 rounded-xl transition-all shadow-md shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer"
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
                <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Pedidos Recibidos Pendientes</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Controla, valida las facturas de clientes y confirma sus envíos.</p>
                  </div>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300">
                    Sincronización Supabase Realtime
                  </span>
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
                <div className="border-b border-gray-200 pb-5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Historial del Local</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Bitácora histórica de pedidos cerrados y colaboradores encargados de su despacho.</p>
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

                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        name: '', price: 0, category: 'Tecnología', image_url: '', stock: 10, is_visible: true, promotion_discount: 0, description: ''
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Producto Nuevo</span>
                  </button>
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
                TAB 5. STAFF ROSTER (ADMIN ONLY) 
                ========================================================= */}
            {activeTab === 'trabajadores' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Control de Personal Autorizado</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Crea, edita o desvincula gerente o empleado de despacho.</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingWorker(null);
                      setWorkerForm({
                        username: '', name: '', role: 'empleado', phone: '', is_active: true, plainPassword: ''
                      });
                      setIsWorkerModalOpen(true);
                    }}
                    className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Contratar Colaborador</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden text-xs">
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFBFB] text-[10px] font-bold text-slate-500 uppercase border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-3">Nombre Completo</th>
                          <th className="px-5 py-3">Nombre Usuario</th>
                          <th className="px-5 py-3">Rol del Cargo</th>
                          <th className="px-5 py-3">Teléfono Movil</th>
                          <th className="px-5 py-3 text-center">Estado Seguridad</th>
                          <th className="px-5 py-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {workers.map(w => {
                          const isBlocked = w.locked_until && new Date(w.locked_until).getTime() > Date.now();
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
                              <td className="px-5 py-3 text-slate-500">{w.phone || 'S/N'}</td>
                              <td className="px-5 py-3 text-center">
                                {isBlocked ? (
                                  <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded animate-pulse">
                                    Bloqueado (exceso clave)
                                  </span>
                                ) : w.is_active ? (
                                  <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                                    Activo / Habilitado
                                  </span>
                                ) : (
                                  <span className="bg-slate-150 text-slate-505 font-bold px-2 py-0.5 rounded">
                                    Desactivado
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center">
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
                                        plainPassword: '' // Reset fields for security
                                      });
                                      setIsWorkerModalOpen(true);
                                    }}
                                    className="p-1 px-2 border border-gray-200 hover:border-slate-400 rounded hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                                  >
                                    Configurar
                                  </button>
                                  {w.id !== 'w-1' && ( // Prevent deleting default absolute master admin
                                    <button
                                      onClick={() => handleDeleteWorker(w.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
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
                TAB 6. HISTORIC AUDIT TRAILS (ADMIN ONLY)
                ========================================================= */}
            {activeTab === 'auditoria' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-gray-200 pb-5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Bitácora Integral de Tienda</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Control inmutable de auditoría para verificar cambios en existencias, accesos, etc.</p>
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
                <div className="border-b border-gray-200 pb-5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Consola de Alertas del Establecimiento</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Monitoreo automático de incidencias, errores repetidos de login e inventarios en cero.</p>
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
                  <input
                    type="text"
                    required
                    placeholder="Ej: Tecnología, Audio, Moda"
                    value={productForm.category || ''}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Precio (€/$) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">% de Rebaja / Descuento</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={productForm.promotion_discount || 0}
                    onChange={(e) => setProductForm({ ...productForm, promotion_discount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Stock Físico <span className="text-red-500">*</span></label>
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
                <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest mb-1">Enlace / URL de la Imagen <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={productForm.image_url || ''}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="visibleChk"
                  checked={productForm.is_visible !== false}
                  onChange={(e) => setProductForm({ ...productForm, is_visible: e.target.checked })}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="visibleChk" className="font-semibold text-slate-700 select-none">
                  Visibilidad habilitada en el escaparate
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
                    onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none font-semibold"
                  >
                    <option value="empleado">Empleado de Despacho (Solo productos y pedidos)</option>
                    <option value="gerente">Gerente de Local (Dashboard, inventario, pedidos, alarmas)</option>
                    <option value="admin">Administrador General (Privilegios totales)</option>
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
                  {editingWorker ? 'Nueva Contraseña (Dejar vacío para conservar)' : 'Contraseña Inicial de Acceso <*>' }
                </label>
                <input
                  type="password"
                  required={!editingWorker}
                  placeholder={editingWorker ? 'No editable / Encriptado inauditable' : 'Contraseña segura de acceso'}
                  value={workerForm.plainPassword || ''}
                  onChange={(e) => setWorkerForm({ ...workerForm, plainPassword: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeWorker"
                  checked={workerForm.is_active !== false}
                  onChange={(e) => setWorkerForm({ ...workerForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="activeWorker" className="font-semibold text-slate-700 select-none">
                  Colaborador con estatus activo habilitado
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

    </div>
  );
}
