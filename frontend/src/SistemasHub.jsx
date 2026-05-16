import React, { useState, useEffect, useCallback } from 'react'
import { BarChart3, Activity, Brain, Plus, Users, LogOut, ChevronLeft, ArrowRight, Pencil, Moon, Sun } from 'lucide-react'
import api from './api.js'

// Hook compartilhado de tema (persiste em localStorage 'mr-theme')
function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mr-theme') === 'dark')
  useEffect(() => { localStorage.setItem('mr-theme', darkMode ? 'dark' : 'light') }, [darkMode])
  return [darkMode, setDarkMode]
}

export const MRSYS_VERSION = 'v1.0.24'
export const PARECETO_VERSION = 'v0.4.0'
export const CEREBRO_VERSION = 'v1.5.0'

const SISTEMAS = [
  {
    id: 'mrsys',
    nome: 'MRSys',
    descricao: 'Fechamento financeiro, folha, faturas e medições',
    Icon: BarChart3,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    hoverBorder: 'hover:border-indigo-300',
    hoverShadow: 'hover:shadow-indigo-100',
    cta: 'text-indigo-600',
    ativo: true,
    versao: MRSYS_VERSION,
  },
  {
    id: 'pareceto',
    nome: 'Pare Certo — Análises',
    descricao: 'Análises operacionais e KPIs do Pare Certo',
    Icon: Activity,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    hoverBorder: 'hover:border-emerald-300',
    hoverShadow: 'hover:shadow-emerald-100',
    cta: 'text-emerald-600',
    ativo: true,
    versao: PARECETO_VERSION,
  },
  {
    id: 'cerebro',
    nome: 'Cérebro',
    descricao: 'Agenda, Tarefas, Notas e Drive integrados ao Google',
    Icon: Brain,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
    hoverBorder: 'hover:border-violet-300',
    hoverShadow: 'hover:shadow-violet-100',
    cta: 'text-violet-600',
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
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── Modal Usuário ─────────────────────────────────────────────────────────
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">{isEdicao ? 'Editar usuário' : 'Novo usuário'}</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700 text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 transition">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          {!isEdicao && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
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
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
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
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Perfil</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.perfil_id}
                onChange={e => set('perfil_id', e.target.value)}
              >
                {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
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

          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acesso ao Hub</div>
            {[
              { key: 'acesso_mrsys', label: 'MRSys', sub: 'Fechamento financeiro e operação' },
              { key: 'acesso_pareceto', label: 'Pare Certo', sub: 'Análises operacionais e KPIs' },
              { key: 'acesso_cerebro', label: 'Cérebro', sub: 'Agenda, Tarefas, Notas e Drive' },
            ].map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{label}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
                <Toggle checked={!!form[key]} onChange={v => set(key, v ? 1 : 0)} />
              </div>
            ))}
          </div>

          {erro && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
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
function GestaoUsuarios({ onVoltar, darkMode, onToggleDark }) {
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
      const [us, ps] = await Promise.all([api.get('/usuarios/'), api.get('/perfis/')])
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
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm flex items-center px-6 gap-4">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition"
        >
          <ChevronLeft size={16} />
          Hub
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <span className="font-semibold text-slate-900 text-sm">Gestão de Usuários</span>
        <div className="flex-1" />
        {onToggleDark && (
          <button
            onClick={onToggleDark}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 transition"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}
        <button
          onClick={() => { setUsuarioEditando(null); setModalAberto(true) }}
          className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          + Novo usuário
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {erro && (
          <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="text-center py-20 text-slate-400 text-sm">Carregando...</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Nome</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">E-mail</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Perfil</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">MRSys</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pare Certo</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Cérebro</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                    >
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{u.nome}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          u.perfil_codigo === 'admin'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.perfil_nome}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          u.status === 'ATIVO'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      {['acesso_mrsys', 'acesso_pareceto', 'acesso_cerebro'].map(campo => (
                        <td key={campo} className="px-4 py-2.5 text-center">
                          {u.perfil_codigo === 'admin' ? (
                            <span className="text-[11px] text-slate-400 italic">admin</span>
                          ) : (
                            <Toggle
                              checked={!!u[campo]}
                              disabled={!!togglingId}
                              onChange={() => toggleAcesso(u, campo)}
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => { setUsuarioEditando(u); setModalAberto(true) }}
                          className="text-slate-400 hover:text-indigo-600 transition p-1 rounded hover:bg-indigo-50"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usuarios.length === 0 && (
                <div className="py-14 text-center text-slate-400 text-sm">Nenhum usuário cadastrado</div>
              )}
            </div>
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
    </div>
  )
}

// ── Hub principal ─────────────────────────────────────────────────────────
export default function SistemasHub({ usuario, onSelecionarSistema, onLogout }) {
  const [viewGestao, setViewGestao] = useState(false)
  const [darkMode, setDarkMode] = useDarkMode()
  const isAdmin = usuario?.perfil_codigo === 'admin'

  if (viewGestao) {
    return <GestaoUsuarios onVoltar={() => setViewGestao(false)} darkMode={darkMode} onToggleDark={() => setDarkMode(v => !v)} />
  }

  const sistemasVisiveis = SISTEMAS.map(s => {
    if (s.placeholder || podeAcessar(s, usuario)) return s
    return { id: `bloqueado-${s.id}`, placeholder: true }
  })

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="celso.cloud" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 leading-tight">celso.cloud</div>
              <div className="text-[11px] text-slate-500 truncate hidden sm:block">{usuario?.nome || ''}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(v => !v)}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 transition"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            {isAdmin && (
              <button
                onClick={() => setViewGestao(true)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
              >
                <Users size={14} />
                <span className="hidden sm:inline">Usuários</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hub de Sistemas</h1>
          <p className="text-slate-500 text-sm mt-1">Selecione um sistema para acessar</p>
        </div>

        {/* Systems grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sistemasVisiveis.map(s => s.placeholder ? (
            <div
              key={s.id}
              className="bg-white border border-dashed border-slate-200 rounded-xl p-6 min-h-[168px] flex flex-col items-center justify-center text-center"
            >
              <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center mb-3">
                <Plus size={18} className="text-slate-300" />
              </div>
              <div className="text-sm font-medium text-slate-400">Em breve</div>
              <div className="text-xs text-slate-300 mt-0.5">Espaço reservado</div>
            </div>
          ) : (
            <button
              key={s.id}
              onClick={() => onSelecionarSistema(s.id)}
              className={`group text-left bg-white border border-slate-200 rounded-xl p-6 min-h-[168px] flex flex-col cursor-pointer transition-all duration-150 hover:shadow-md ${s.hoverBorder} ${s.hoverShadow}`}
            >
              {/* Top row: icon + version */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <s.Icon size={22} className={s.iconColor} />
                </div>
                {s.versao && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {s.versao}
                  </span>
                )}
              </div>

              {/* Name + description */}
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 mb-1">{s.nome}</div>
                <div className="text-xs text-slate-500 leading-snug">{s.descricao}</div>
              </div>

              {/* CTA */}
              <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${s.cta} transition-opacity`}>
                Acessar
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
    </div>
  )
}
