import React, { useState } from 'react'
import { auth } from './api.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="celso.cloud" className="w-56 h-56 object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900">celso.cloud</h1>
          <p className="text-slate-600 text-sm mt-2">Sistemas Inteligentes de Gestão</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1 font-medium">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1 font-medium">Senha</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="••••••••"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-300 text-red-700 text-sm rounded-lg px-3 py-2">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition-colors text-sm shadow-sm"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
