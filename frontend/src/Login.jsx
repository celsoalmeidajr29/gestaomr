import React, { useState, useEffect } from 'react'
import { auth } from './api.js'
import { ArrowRight, Moon, Sun } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mr-theme') === 'dark')
  useEffect(() => { localStorage.setItem('mr-theme', darkMode ? 'dark' : 'light') }, [darkMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const data = await auth.login(email, senha)
      onLogin(data?.usuario ?? data)
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen flex">
      {/* Left panel — brand (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-600/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 text-center">
          <img src="/logo.png" alt="celso.cloud" className="w-20 h-20 object-contain mx-auto mb-8" />
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">celso.cloud</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Sistemas Inteligentes de Gestão para o Grupo MR
          </p>

          <div className="mt-10 flex flex-col gap-3.5 text-left">
            {[
              'Fechamento financeiro e operação',
              'Análises e KPIs em tempo real',
              'Agenda, tarefas e documentos',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 text-xs text-slate-600">
          © 2026 celso.cloud — Grupo MR
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 relative">
        {/* Theme toggle (top-right) */}
        <button
          onClick={() => setDarkMode(v => !v)}
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 transition flex items-center justify-center"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-10">
            <img src="/logo.png" alt="celso.cloud" className="w-14 h-14 object-contain mx-auto mb-3" />
            <div className="text-xl font-bold text-slate-900">celso.cloud</div>
            <div className="text-sm text-slate-500 mt-1">Sistemas Inteligentes de Gestão</div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-sm mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                placeholder="••••••••"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 transition text-sm shadow-sm"
            >
              {loading ? (
                'Entrando...'
              ) : (
                <>Entrar <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400">© 2026 celso.cloud</p>
        </div>
      </div>
    </div>
    </div>
  )
}
