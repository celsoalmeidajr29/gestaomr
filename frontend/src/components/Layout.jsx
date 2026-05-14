import React, { useState } from 'react'
import { ChevronLeft, LogOut, Home } from 'lucide-react'

/**
 * Corporate sidebar + topbar layout.
 *
 * Props:
 *   navItems    — array of { id, label, Icon } for sidebar nav
 *   activeNav   — currently active nav id
 *   onNavChange — (id) => void
 *   user        — { nome, perfil_codigo }
 *   appName     — string shown in sidebar header
 *   logo        — image src for sidebar header
 *   onLogout    — () => void
 *   onVoltarHub — () => void  (back to hub button)
 *   children    — page content
 */
export default function Layout({
  navItems = [],
  activeNav,
  onNavChange,
  user,
  appName = 'celso.cloud',
  logo = '/logo.png',
  onLogout,
  onVoltarHub,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`relative flex-shrink-0 bg-slate-900 flex flex-col transition-[width] duration-200 ease-in-out ${
          collapsed ? 'w-14' : 'w-60'
        }`}
      >
        {/* Brand */}
        <div
          className={`h-14 flex items-center border-b border-white/10 px-3 flex-shrink-0 gap-3 overflow-hidden ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {logo && (
            <img src={logo} alt={appName} className="w-7 h-7 object-contain flex-shrink-0" />
          )}
          {!collapsed && (
            <span className="text-sm font-semibold text-white truncate">{appName}</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => {
            const Icon = item.icon || item.Icon
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavChange?.(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {Icon && <Icon size={17} className="flex-shrink-0" />}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/10 py-2">
          {onVoltarHub && (
            <button
              onClick={onVoltarHub}
              title={collapsed ? 'Hub' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Home size={16} className="flex-shrink-0" />
              {!collapsed && <span>Hub</span>}
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              title={collapsed ? 'Sair' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut size={16} className="flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-[52px] w-6 h-6 rounded-full bg-slate-700 border border-slate-600 text-slate-400 hover:text-white flex items-center justify-center transition z-10 shadow"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          <ChevronLeft
            size={12}
            className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </aside>

      {/* ── Right side ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4 flex-shrink-0 shadow-sm">
          <div className="flex-1 min-w-0" />

          {user && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                {user.nome?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate max-w-[160px] leading-tight">
                  {user.nome}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {user.perfil_codigo || 'usuário'}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
