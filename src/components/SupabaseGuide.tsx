/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SUPABASE_SQL_SCHEMA, SUPABASE_UPDATE_SQL_SCHEMA } from '../supabaseSchema';
import { SupabaseService } from '../supabaseService';
import { Clipboard, Check, Database, HelpCircle, ShieldAlert, Wifi, Key, FileText, ToggleLeft } from 'lucide-react';

export default function SupabaseGuide() {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [mode, setMode] = useState<'mock' | 'real'>('mock');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'full' | 'update'>('update');

  useEffect(() => {
    const creds = SupabaseService.getCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    setMode(creds.mode);
  }, []);

  const handleCopy = () => {
    const textToCopy = activeTab === 'full' ? SUPABASE_SQL_SCHEMA : SUPABASE_UPDATE_SQL_SCHEMA;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    SupabaseService.setCredentials(url.trim(), key.trim(), mode);
    setSaveStatus('Configuración guardada correctamente.');
    setTimeout(() => {
      setSaveStatus(null);
      window.location.reload(); // Reload to refresh client instances
    }, 1500);
  };

  return (
    <div id="cfg-database" className="max-w-4xl mx-auto p-6 bg-white rounded-2xl border border-gray-100 shadow-sm animate-fade-in">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-5 mb-6">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Estructura & Conexión Supabase</h2>
          <p className="text-sm text-gray-500">¿Qué datos hacen falta y cómo configurar tu base de datos?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Left Card: Explanation of required parameters */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-amber-500" /> Parámetros Requeridos
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed space-y-2">
            La tienda es de arquitectura totalmente estática (perfecta para <strong>GitHub Pages</strong>) y se conecta directamente desde el navegador a tu instancia de Supabase. Para sincronizarla, debes proveer:
          </p>
          <ul className="text-xs space-y-2 mt-3 text-gray-600 list-disc list-inside">
            <li><strong>Supabase URL:</strong> El punto de conexión HTTPS de tu proyecto.</li>
            <li><strong>Anon Public Key:</strong> Llave segura que corre del lado del navegador.</li>
            <li><strong>Realtime Activado:</strong> Permite sincronizar inventarios y alertas entre múltiples pestañas/compradores al instante.</li>
          </ul>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>Seguridad:</strong> Al almacenar tus llaves localmente o en variables del sistema, evitas subirlas al repositorio público de GitHub, blindando tu tienda de accesos maliciosos.</span>
          </div>
        </div>

        {/* Right Card: Status & Quick Switch */}
        <div className="p-5 bg-teal-50/40 rounded-xl border border-teal-100">
          <h3 className="font-semibold text-teal-800 text-sm flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-teal-600 animate-pulse" /> Estado del Servidor Elástico
          </h3>
          <p className="text-xs text-teal-800/80 mb-4">
            Actualmente estás operando en el <strong>Modo Simulado Pro (Offline-Ready)</strong>. Puedes cambiar de modo en cualquier momento para conectarte a tu servidor físico.
          </p>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Modo de Operación</label>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as 'mock' | 'real')}
                className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
              >
                <option value="mock">Modo Simulado (Pre-cargado, Listo para probar)</option>
                <option value="real">Supabase Real (Conectarse a mi propio proyecto)</option>
              </select>
            </div>

            {mode === 'real' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Supabase Project URL</label>
                  <input 
                    type="url" 
                    required 
                    placeholder="https://your-project.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Supabase Anon Key</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>
              </>
            )}

            <button 
              type="submit" 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs p-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Guardar Configuración de Conexión
            </button>

            {saveStatus && (
              <div className="p-2 bg-emerald-50 text-emerald-800 text-xs rounded text-center font-medium animate-fade-in-up">
                {saveStatus}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Selector de tipo de Esquema / Actualización */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl gap-2 mb-4">
        <button
          onClick={() => setActiveTab('update')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'update'
              ? 'bg-[#0f172a] text-white shadow font-black scale-[1.01]'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
          }`}
        >
          <ToggleLeft className={`w-4 h-4 ${activeTab === 'update' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <div className="text-left">
            <span className="block font-black text-[11px] leading-tight">1. Script para Actualizar BD Existente</span>
            <span className="block text-[9px] font-normal opacity-90">Agrega opiniones, cupones, monitoreo y Telegram</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('full')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'full'
              ? 'bg-[#0f172a] text-white shadow font-black scale-[1.01]'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'full' ? 'text-indigo-400' : 'text-slate-500'}`} />
          <div className="text-left">
            <span className="block font-black text-[11px] leading-tight">2. Script del Esquema Completo Desde Cero</span>
            <span className="block text-[9px] font-normal opacity-90">Estructura base nueva con todas las tablas integradas</span>
          </div>
        </button>
      </div>

      {/* Explicación Detallada de lo que hace el Script Seleccionado */}
      <div className="mb-4 p-4 bg-slate-50 border border-slate-250/70 rounded-xl">
        {activeTab === 'update' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded font-mono">Mantenimiento y Nuevas Tablas</span>
              <h4 className="text-xs font-black text-slate-800">¿Qué incluye y qué hace este Script de Actualización?</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Este script está diseñado para <strong>tiendas que ya están funcionando</strong> y no quieren perder sus productos registrados ni pedidos anteriores. Modifica de forma segura tu base de datos aplicando los siguientes cambios:
            </p>
            <ul className="text-[11px] text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 list-disc list-inside mt-1 font-medium bg-white p-3 rounded-lg border border-slate-100">
              <li><strong className="text-slate-800">Opiniones Integradas:</strong> Crea la tabla <code className="font-mono text-pink-600 bg-pink-50 px-1 rounded text-[10px]">product_reviews</code> para guardar comentarios calificados.</li>
              <li><strong className="text-slate-800">Cupones Directos:</strong> Añade la tabla <code className="font-mono text-pink-600 bg-pink-50 px-1 rounded text-[10px]">coupons</code> para estructurar códigos de descuento.</li>
              <li><strong className="text-slate-800">Monitoreo de Visitas:</strong> Agrega la tabla <code className="font-mono text-pink-600 bg-pink-50 px-1 rounded text-[10px]">visitor_history</code> para guardar los ingresos.</li>
              <li><strong className="text-slate-800">Soporte y Mensajería:</strong> Estructura la tabla <code className="font-mono text-pink-600 bg-pink-50 px-1 rounded text-[10px]">support_inquiries</code> para reclamos directos.</li>
              <li><strong className="text-slate-800">Sincronización en Vivo:</strong> Configura la publicación de Supabase Realtime para que los cupones y visitas se actualicen en vivo.</li>
              <li><strong className="text-slate-800">Columnas de Telegram:</strong> Inserta nuevas variables para desactivar o activar bots de avisos.</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-800 rounded font-mono">Inicios Limpios</span>
              <h4 className="text-xs font-black text-slate-800">¿Qué hace el Script de Base de Datos Desde Cero?</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Este script estructurará un <strong>proyecto nuevo de Supabase completamente desde cero</strong>. Si es la primera vez que creas tu base de datos elástica, este script creará todas las relaciones, índices de velocidad, llaves primarias y habilitará la sincronización en vivo. Crea la siguiente arquitectura completa:
            </p>
            <ul className="text-[11px] text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 list-disc list-inside mt-1 font-medium bg-white p-3 rounded-lg border border-slate-100">
              <li><strong className="text-slate-800">Configuración Singleton:</strong> Almacena colores de la interfaz, logotipos, logos, monedas e IVA.</li>
              <li><strong className="text-slate-800">Productos:</strong> Tabla optimizada para almacenar stock real, rebajas y divisas por productos.</li>
              <li><strong className="text-slate-800">Roles y Cuentas:</strong> Crea usuarios con hash para accesos seguros de Admin, Gerencia e Inventario.</li>
              <li><strong className="text-slate-800">Pedidos y Facturas:</strong> Historial contable inmutable con asignador automático de numeraciones.</li>
              <li><strong className="text-slate-800">Opiniones, Visitas y Cupones:</strong> Todas las nuevas tablas pre-configuradas con integridad referencial.</li>
              <li><strong className="text-slate-800">Suscripción Realtime:</strong> Habilita notificaciones en tiempo real para las 8 tablas comerciales principales.</li>
            </ul>
          </div>
        )}
      </div>

      {/* Database section script */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-slate-400 font-mono text-[11px] ml-2">
              {activeTab === 'full' ? '1_crear_esquema_completo.sql' : '2_migrar_y_agregar_tablas_nuevas.sql'}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 rounded transition-all cursor-pointer font-bold"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span className="text-emerald-400 font-extrabold">¡Copiado al portapapeles!</span>
              </>
            ) : (
              <>
                <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Script</span>
              </>
            )}
          </button>
        </div>
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[350px] relative">
          <pre className="whitespace-pre">{activeTab === 'full' ? SUPABASE_SQL_SCHEMA : SUPABASE_UPDATE_SQL_SCHEMA}</pre>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50/40 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <strong>¿Cómo instalar o actualizar en Supabase?</strong>
          <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-700 font-sans">
            {activeTab === 'update' ? (
              <>
                <li>Haz clic arriba en el botón <strong>"Copiar Script"</strong> para guardar el código en tu portapapeles.</li>
                <li>Inicia sesión en tu panel de <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-800">supabase.com</a> y abre tu proyecto.</li>
                <li>Haga clic en la sección <strong>"SQL Editor"</strong> en el menú lateral izquierdo (icono con el símbolo <code className="font-mono bg-slate-100 px-1 rounded">&gt;_</code>).</li>
                <li>Presiona en <strong>"New Query"</strong>, pega el código copiado y haz clic en el botón verde de <strong>"Run"</strong> en la parte inferior derecha.</li>
                <li>¡Listo! El script agregará las tablas de opiniones, cupones y visitas sin borrar tus datos previos.</li>
              </>
            ) : (
              <>
                <li>Crea un proyecto completamente nuevo y gratuito en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-800">supabase.com</a>.</li>
                <li>En tu panel, ve a la sección <strong>"SQL Editor"</strong> en el menú lateral izquierdo.</li>
                <li>Crea una consulta pulsando <strong>"New Query"</strong>, pega el script inicial completo que copiaste arriba y haz clic en <strong>"Run"</strong>.</li>
                <li>¡Fabuloso! Tu base de datos estará lista, estructurada con cuentas, productos y cupones al instante.</li>
              </>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}
