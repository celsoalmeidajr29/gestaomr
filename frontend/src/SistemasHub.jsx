import React from 'react'

// Versão atual do sistema MRSys (atualizada a cada release)
export const MRSYS_VERSION = 'v79'

const SISTEMAS = [
  {
    id: 'mrsys',
    nome: 'MRSys - ERP do Grupo MR',
    descricao: 'Fechamento financeiro, folha, faturas e medições',
    icone: 'MR',
    cor: 'from-indigo-500 to-blue-600',
    ativo: true,
    versao: MRSYS_VERSION,
  },
  { id: 'placeholder1', placeholder: true },
  { id: 'placeholder2', placeholder: true },
  { id: 'placeholder3', placeholder: true },
  { id: 'placeholder4', placeholder: true },
  { id: 'placeholder5', placeholder: true },
]

export default function SistemasHub({ usuario, onSelecionarSistema, onLogout }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="celso.cloud" className="w-12 h-12 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-base font-semibold leading-tight text-slate-900">celso.cloud</div>
              <div className="text-xs text-slate-500 truncate">{usuario?.nome || ''}</div>
            </div>
          </div>
          <button onClick={onLogout} className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded hover:bg-slate-100 transition">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <img src="/logo.png" alt="celso.cloud" className="w-40 h-40 object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900">Sistemas Inteligentes de Gestão</h1>
          <p className="text-slate-600 text-sm mt-3">Selecione o sistema desejado ou prepare espaço para sistemas futuros.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SISTEMAS.map(s => s.placeholder ? (
            <div
              key={s.id}
              className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 min-h-[180px] flex flex-col items-center justify-center text-center"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-2xl mb-3">+</div>
              <div className="font-medium text-slate-500 text-sm">Em breve</div>
              <div className="text-xs text-slate-400 mt-1">Espaço reservado</div>
            </div>
          ) : (
            <button
              key={s.id}
              onClick={() => onSelecionarSistema(s.id)}
              className="group text-left p-6 rounded-2xl border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-lg transition-all min-h-[180px] flex flex-col cursor-pointer hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.cor} flex items-center justify-center text-white text-lg font-bold group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition`}>
                  {s.icone}
                </div>
                {s.versao && <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{s.versao}</span>}
              </div>
              <div className="text-lg font-semibold mb-1 text-slate-900">{s.nome}</div>
              <div className="text-sm text-slate-600 leading-snug">{s.descricao}</div>
              <div className="mt-auto pt-3 text-xs text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 font-medium">
                Acessar <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 text-center text-xs text-slate-400">
          Para adicionar um novo sistema, edite <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">SistemasHub.jsx</code> e ajuste o array SISTEMAS.
        </div>
      </main>
    </div>
  )
}
