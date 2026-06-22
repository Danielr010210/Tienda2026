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
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'update'
              ? 'bg-white shadow text-teal-700 font-extrabold scale-[1.01]'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <ToggleLeft className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Script de Actualización (Faltan tablas/columnas de Telegram o diseño)</span>
        </button>
        <button
          onClick={() => setActiveTab('full')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'full'
              ? 'bg-white shadow text-teal-700 font-extrabold scale-[1.01]'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          <span>Esquema Completo Inicial (Base de Datos en Limpio)</span>
        </button>
      </div>

      {/* Database section script */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-slate-400 font-mono text-[11px] ml-2">
              {activeTab === 'full' ? 'crear_esquema_inicial.sql' : 'migrar_configuraciones_y_telegram.sql'}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 rounded transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">¡Copiado!</span>
              </>
            ) : (
              <>
                <Clipboard className="w-3.5 h-3.5" />
                <span>Copiar Script</span>
              </>
            )}
          </button>
        </div>
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[350px]">
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
                <li>Copia el <strong>Script de Actualización</strong> usando el botón de arriba de copiar.</li>
                <li>Abre el panel de tu proyecto en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-800">supabase.com</a>.</li>
                <li>Ve a <strong>"SQL Editor"</strong> en el menú lateral izquierdo, haz clic en <strong>"New Query"</strong>.</li>
                <li>Pega el script y presiona el botón <strong>"Run"</strong> para agregar instantáneamente las tablas de Telegram y nuevas configuraciones.</li>
              </>
            ) : (
              <>
                <li>Crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-800">supabase.com</a>.</li>
                <li>En tu panel, ve a la sección <strong>"SQL Editor"</strong> en el menú lateral izquierdo.</li>
                <li>Presiona <strong>"New Query"</strong>, pega el script de arriba que acabas de copiar y haz clic en <strong>"Run"</strong>.</li>
                <li>¡Listo! Tu base de datos estará estructurada con todas las tablas e índices listos.</li>
              </>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}
