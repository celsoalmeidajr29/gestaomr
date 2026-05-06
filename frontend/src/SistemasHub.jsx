import React from 'react'

const SISTEMAS = [
  {
    id: 'mrsys',
    nome: 'MRSys',
    descricao: 'Sistema de Fechamento Financeiro — Grupo MR',
    icone: 'MR',
    cor: 'from-indigo-500 to-blue-600',
    ativo: true,
  },
  { id: 'placeholder1', placeholder: true },
  { id: 'placeholder2', placeholder: true },
  { id: 'placeholder3', placeholder: true },
  { id: 'placeholder4', placeholder: true },
  { id: 'placeholder5', placeholder: true },
]

export default function SistemasHub({ usuario, onSelecionarSistema, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-800 flex-shrink-0 flex items-center justify-center text-white font-bold">MR</div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">Grupo MR — Hub</div>
              <div className="text-xs text-slate-400 truncate">{usuario?.nome || ''}</div>
            </div>
          </div>
          <button onClick={onLogout} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800 transition">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Selecione um sistema</h1>
          <p className="text-slate-400 text-sm mt-2">Acesse o sistema desejado ou prepare espaço para sistemas futuros.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SISTEMAS.map(s => s.placeholder ? (
            <div
              key={s.id}
              className="p-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 min-h-[180px] flex flex-col items-center justify-center text-center opacity-50"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-2xl mb-3">+</div>
              <div className="font-medium text-slate-400 text-sm">Em breve</div>
              <div className="text-xs text-slate-500 mt-1">Espaço reservado</div>
            </div>
          ) : (
            <button
              key={s.id}
              onClick={() => onSelecionarSistema(s.id)}
              className="group text-left p-6 rounded-2xl border border-slate-700 bg-slate-800/50 hover:border-indigo-500 hover:bg-slate-800 transition-all min-h-[180px] flex flex-col cursor-pointer hover:scale-[1.02]"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.cor} flex items-center justify-center text-white text-lg font-bold mb-4 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition`}>
                {s.icone}
              </div>
              <div className="text-lg font-semibold mb-1">{s.nome}</div>
              <div className="text-sm text-slate-400 leading-snug">{s.descricao}</div>
              <div className="mt-auto pt-3 text-xs text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                Acessar <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 text-center text-xs text-slate-500">
          Para adicionar um novo sistema, edite <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono">SistemasHub.jsx</code> e ajuste o array SISTEMAS.
        </div>
      </main>
    </div>
  )
}
