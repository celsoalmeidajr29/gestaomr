import React, { useState, useEffect, useCallback } from 'react'
import api from './api.js'

// Versão atual do sistema MRSys (atualizada a cada release)
export const MRSYS_VERSION = 'v1.0.17'

// Versão atual do Pare Certo (atualizada a cada release)
export const PARECETO_VERSION = 'v0.1.5'

// Versão atual do Cérebro
export const CEREBRO_VERSION = 'v1.2.0'

const SISTEMAS = [
  {
    id: 'mrsys',
    nome: 'MRSys - Sistema de Gestão',
    descricao: 'Fechamento financeiro, folha, faturas e medições',
    icone: 'MR',
    cor: 'from-indigo-500 to-blue-600',
    ativo: true,
    versao: MRSYS_VERSION,
  },
  {
    id: 'pareceto',
    nome: 'Pare Certo - Análises',
    descricao: 'Análises operacionais e KPIs do Pare Certo',
    icone: 'PC',
    cor: 'from-emerald-500 to-teal-600',
    ativo: true,
    versao: PARECETO_VERSION,
  },
  {
    id: 'cerebro',
    nome: 'Cérebro',
    descricao: 'Agenda, Tarefas, Notas e Drive integrados ao Google',
    icone: '🧠',
    cor: 'from-violet-600 to-indigo-700',
    ativo: true,
    versao: CEREBRO_VERSION,
  },
  { id: 'placeholder3', placeholder: true },
  { id: 'placeholder4', placeholder: true },
  { id: 'placeholder5', placeholder: true },
]

function podeAcessar(sistema, usuario) {
  if (usuario?.perfil_codigo === 'admin') return true
  if (sistema.id === 'mrsys')    return !!usuario?.acesso_mrsys
  if (sistema.id === 'pareceto') return !!usuario?.acesso_pareceto
  if (sistema.id === 'cerebro')  return !!usuario?.acesso_cerebro
  return false
}

// ── Toggle switch ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Modal Usuário (criar / editar) ────────────────────────────────────────
function ModalUsuario({ usuario, perfis, onSalvar, onFechar }) {
  const isEdicao = !!usuario?.id
  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    senha: '',
    perfil_id: usuario?.perfil_id || (perfis[0]?.id ?? ''),
    status: usuario?.status || 'ATIVO',
    acesso_mrsys: usuario?.acesso_mrsys ?? 1,
    acesso_pareceto: usuario?.acesso_pareceto ?? 0,
    acesso_cerebro: usuario?.acesso_cerebro ?? 0,
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSalvar() {
    if (!form.nome.trim()) return setErro('Nome obrigatório')
    if (!isEdicao && !form.email.trim()) return setErro('E-mail obrigatório')
    if (!isEdicao && !form.senha.trim()) return setErro('Senha obrigatória')
    if (!form.perfil_id) return setErro('Perfil obrigatório')
    setErro('')
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        perfil_id: Number(form.perfil_id),
        status: form.status,
        acesso_mrsys: form.acesso_mrsys,
        acesso_pareceto: form.acesso_pareceto,
        acesso_cerebro: form.acesso_cerebro,
      }
      if (!isEdicao) {
        payload.email = form.email.trim()
        payload.senha = form.senha
      }
      if (form.senha && isEdicao) payload.senha = form.senha
      if (isEdicao) {
        await api.patch(`/usuarios/item.php?id=${usuario.id}`, payload)
      } else {
        await api.post('/usuarios/', payload)
      }
      onSalvar()
    } catch (e) {
      setErro(e.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{isEdicao ? 'Editar usuário' : 'Novo usuário'}</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nome</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          {!isEdicao && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isEdicao ? 'Nova senha (em branco = não alterar)' : 'Senha'}
            </label>
            <input
              type="password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.senha}
              onChange={e => set('senha', e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Perfil</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.perfil_id}
                onChange={e => set('perfil_id', e.target.value)}
              >
                {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="BLOQUEADO">Bloqueado</option>
              </select>
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            <div className="text-xs font-semibold text-slate-700 mb-1">Acesso ao Hub</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">MRSys</div>
                <div className="text-xs text-slate-500">Fechamento financeiro e operação</div>
              </div>
              <Toggle checked={!!form.acesso_mrsys} onChange={v => set('acesso_mrsys', v ? 1 : 0)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">Pare Certo - Análises</div>
                <div className="text-xs text-slate-500">Análises operacionais e KPIs</div>
              </div>
              <Toggle checked={!!form.acesso_pareceto} onChange={v => set('acesso_pareceto', v ? 1 : 0)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">Cérebro</div>
                <div className="text-xs text-slate-500">Agenda, Tarefas, Notas e Drive</div>
              </div>
              <Toggle checked={!!form.acesso_cerebro} onChange={v => set('acesso_cerebro', v ? 1 : 0)} />
            </div>
          </div>
          {erro && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
          >
            {salvando ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Gestão de Usuários ────────────────────────────────────────────────────
function GestaoUsuarios({ onVoltar }) {
  const [usuarios, setUsuarios] = useState([])
  const [perfis, setPerfis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [us, ps] = await Promise.all([
        api.get('/usuarios/'),
        api.get('/perfis/'),
      ])
      setUsuarios(us || [])
      setPerfis(ps || [])
    } catch (e) {
      setErro(e.message || 'Erro ao carregar')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function toggleAcesso(u, campo) {
    const key = `${u.id}-${campo}`
    setTogglingId(key)
    try {
      await api.patch(`/usuarios/item.php?id=${u.id}`, { [campo]: u[campo] ? 0 : 1 })
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, [campo]: x[campo] ? 0 : 1 } : x))
    } catch (e) {
      setErro(e.message || 'Erro ao atualizar acesso')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onVoltar}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded hover:bg-slate-100 transition"
            >
              ← Hub
            </button>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-900">Gestão de Usuários</span>
          </div>
          <button
            onClick={() => { setUsuarioEditando(null); setModalAberto(true) }}
            className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            + Novo usuário
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {erro && (
          <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            {erro}
          </div>
        )}
        {carregando ? (
          <div className="text-center py-20 text-slate-400">Carregando...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">E-mail</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Perfil</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">MRSys</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Pare Certo</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Cérebro</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.nome}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.perfil_codigo === 'admin'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.perfil_nome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.status === 'ATIVO'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.perfil_codigo === 'admin' ? (
                        <span className="text-xs text-slate-400 italic">admin</span>
                      ) : (
                        <Toggle
                          checked={!!u.acesso_mrsys}
                          disabled={!!togglingId}
                          onChange={() => toggleAcesso(u, 'acesso_mrsys')}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.perfil_codigo === 'admin' ? (
                        <span className="text-xs text-slate-400 italic">admin</span>
                      ) : (
                        <Toggle
                          checked={!!u.acesso_pareceto}
                          disabled={!!togglingId}
                          onChange={() => toggleAcesso(u, 'acesso_pareceto')}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.perfil_codigo === 'admin' ? (
                        <span className="text-xs text-slate-400 italic">admin</span>
                      ) : (
                        <Toggle
                          checked={!!u.acesso_cerebro}
                          disabled={!!togglingId}
                          onChange={() => toggleAcesso(u, 'acesso_cerebro')}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setUsuarioEditando(u); setModalAberto(true) }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usuarios.length === 0 && (
              <div className="py-12 text-center text-slate-400">Nenhum usuário cadastrado</div>
            )}
          </div>
        )}
      </main>

      {modalAberto && (
        <ModalUsuario
          usuario={usuarioEditando}
          perfis={perfis}
          onSalvar={() => { setModalAberto(false); carregar() }}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}

// ── Hub principal ─────────────────────────────────────────────────────────
export default function SistemasHub({ usuario, onSelecionarSistema, onLogout }) {
  const [viewGestao, setViewGestao] = useState(false)
  const isAdmin = usuario?.perfil_codigo === 'admin'

  if (viewGestao) {
    return <GestaoUsuarios onVoltar={() => setViewGestao(false)} />
  }

  const sistemasVisiveis = SISTEMAS.map(s => {
    if (s.placeholder || podeAcessar(s, usuario)) return s
    return { id: `bloqueado-${s.id}`, placeholder: true }
  })

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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setViewGestao(true)}
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded hover:bg-slate-100 transition"
              >
                Usuários
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded hover:bg-slate-100 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <img src="/logo.png" alt="celso.cloud" className="w-40 h-40 object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900">Sistemas Inteligentes de Gestão</h1>
          <p className="text-slate-600 text-sm mt-3">Selecione o sistema desejado ou prepare espaço para sistemas futuros.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sistemasVisiveis.map(s => s.placeholder ? (
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
