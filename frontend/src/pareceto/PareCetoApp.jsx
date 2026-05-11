import React, { useEffect } from 'react'
import { ArrowLeft, LogOut, BarChart3 } from 'lucide-react'

/**
 * Pare Certo - Análises (Sistema de KPIs)
 *
 * Esqueleto inicial. Backend ficará totalmente separado do MRSys —
 * não há comunicação cross-sistema. O prompt do projeto entra aqui depois.
 *
 * Props recebidas via main.jsx:
 *  - usuario      : usuário logado (mesma sessão do Hub)
 *  - onVoltarHub  : volta pro SistemasHub
 *  - onLogout     : encerra sessão
 */
export default function PareCetoApp({ usuario, onVoltarHub, onLogout }) {
  useEffect(() => {
    const titleAnterior = document.title
    document.title = 'Pare Certo - Análises'
    return () => { document.title = titleAnterior }
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onVoltarHub} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition" title="Voltar ao Hub">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              PC
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold leading-tight">Pare Certo - Análises</div>
              <div className="text-xs text-slate-500 truncate">{usuario?.nome || 'Sistema de KPIs'}</div>
            </div>
          </div>
          <button onClick={onLogout} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800 transition">
            <LogOut className="w-4 h-4 inline mr-1" />Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold mb-6">
            PC
          </div>
          <h1 className="text-3xl font-bold mb-3">Pare Certo - Análises</h1>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            Sistema de KPIs e análises operacionais do Pare Certo. Estrutura pronta — funcionalidades em desenvolvimento.
          </p>

          <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Em construção
          </div>
        </div>
      </main>
    </div>
  )
}
