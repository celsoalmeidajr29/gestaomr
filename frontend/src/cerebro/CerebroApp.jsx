import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, LogOut, Calendar, CheckSquare, FileText, HardDrive,
  RefreshCw, AlertCircle, ExternalLink, ChevronRight, X, Brain,
  Wifi, WifiOff, Clock, Search,
} from 'lucide-react'

// ---- Configuração ----
const API = '/api/cerebro'

// Cores do tema Cérebro
const C = {
  bg:      '#04040e',
  card:    'rgba(13,18,48,0.6)',
  border:  'rgba(79,85,247,0.15)',
  accent:  '#4f55f7',
  accent2: '#8b5cf6',
  text:    '#dde1f0',
  muted:   '#3d4470',
}

// ---- Fetch helper ----
async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  const payload = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(payload.error || `HTTP ${r.status}`)
  return payload?.data ?? payload
}

// ---- Utilitários ----
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtHour(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Ícone por mimeType
function mimeIcon(mimeType = '') {
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📑'
  if (mimeType.includes('document') || mimeType.includes('word')) return '📄'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('image')) return '🖼'
  if (mimeType.includes('video')) return '🎬'
  if (mimeType.includes('audio')) return '🎵'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦'
  if (mimeType.includes('folder')) return '📁'
  if (mimeType.includes('markdown') || mimeType.includes('text')) return '📝'
  return '📄'
}

// ---- Componentes base ----

function Card({ children, style, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: C.card, borderColor: C.border, ...style }}
    >
      {children}
    </div>
  )
}

function Btn({ onClick, children, variant = 'default', disabled, className = '' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    default:   `border hover:opacity-80 ${base}`,
    accent:    `text-white ${base}`,
    ghost:     `hover:bg-white/5 ${base}`,
    danger:    `border hover:opacity-80 ${base}`,
  }
  const styles = {
    default:   { borderColor: C.border, color: C.text, background: 'rgba(255,255,255,0.04)' },
    accent:    { background: C.accent },
    ghost:     { color: C.muted },
    danger:    { borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.06)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${variants[variant]} ${className}`} style={styles[variant]}>
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${C.accent} transparent ${C.accent} ${C.accent}` }} />
    </div>
  )
}

function Empty({ msg = 'Nenhum item encontrado.', sub }) {
  return (
    <div className="text-center py-16" style={{ color: C.muted }}>
      <p className="text-sm">{msg}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  )
}

function Erro({ msg, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14" style={{ color: '#f87171' }}>
      <AlertCircle className="w-8 h-8 opacity-60" />
      <p className="text-sm text-center max-w-xs">{msg}</p>
      {onRetry && <Btn onClick={onRetry} variant="default">Tentar novamente</Btn>}
    </div>
  )
}

// ---- Tela de conexão Google ----
function TelaConectar({ onConnect, connecting }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        🔑
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ color: C.text }}>Conectar ao Google</p>
        <p className="text-sm mt-1 max-w-sm text-center" style={{ color: C.muted }}>
          Autorize o acesso à sua Agenda, Tarefas e Drive para usar o Cérebro.
        </p>
      </div>
      <Btn variant="accent" onClick={onConnect} disabled={connecting}>
        {connecting
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Aguardando...</>
          : <><span className="text-base">G</span> Conectar com Google</>}
      </Btn>
      <p className="text-xs text-center max-w-xs" style={{ color: C.muted }}>
        Apenas leitura. Nenhum dado é modificado. O token é armazenado de forma segura no servidor.
      </p>
    </div>
  )
}

// ---- Aba Agenda ----
const PERIODOS_AGENDA = [
  { label: 'Hoje',     dias: 0 },
  { label: '7 dias',  dias: 7 },
  { label: '14 dias', dias: 14 },
  { label: 'Mês',     dias: 30 },
]

function AbaAgenda() {
  const [periodo, setPeriodo] = useState(1) // índice em PERIODOS_AGENDA
  const [eventos, setEventos] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(async (idx = periodo) => {
    setLoading(true); setErro(null)
    const dias = PERIODOS_AGENDA[idx].dias
    const start = new Date()
    const end   = new Date()
    end.setDate(end.getDate() + dias)
    const fmt = d => d.toISOString().slice(0, 10)
    try {
      const data = await apiFetch(`/agenda.php?start=${fmt(start)}&end=${fmt(end)}`)
      setEventos(data)
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [periodo])

  // Agrupa por data
  const porDia = (eventos || []).reduce((acc, ev) => {
    const dia = (ev.start || '').slice(0, 10)
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(ev)
    return acc
  }, {})
  const dias = Object.keys(porDia).sort()

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {PERIODOS_AGENDA.map((p, i) => (
          <button
            key={p.label}
            onClick={() => { setPeriodo(i); if (eventos !== null) carregar(i) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={periodo === i
              ? { background: C.accent, color: '#fff' }
              : { background: C.card, border: `1px solid ${C.border}`, color: C.muted }}
          >
            {p.label}
          </button>
        ))}
        <Btn onClick={() => carregar()} disabled={loading} variant="default" className="ml-auto">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
          Carregar Agenda
        </Btn>
      </div>

      {loading && <Spinner />}
      {erro    && <Erro msg={erro} onRetry={() => carregar()} />}
      {!loading && !erro && eventos === null && (
        <Empty msg="Clique em 'Carregar Agenda' para buscar os eventos." />
      )}
      {!loading && !erro && eventos !== null && dias.length === 0 && (
        <Empty msg="Nenhum evento no período selecionado." />
      )}

      {!loading && dias.map(dia => (
        <div key={dia} className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: C.accent2 }}>
            {fmtDate(dia)}
          </div>
          <div className="space-y-2">
            {porDia[dia].map((ev, i) => (
              <Card key={ev.id || i} className="hover:border-opacity-40 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate" style={{ color: C.text }}>{ev.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {ev.allDay ? 'Dia inteiro' : `${fmtHour(ev.start)} → ${fmtHour(ev.end)}`}
                      {ev.location && <span className="ml-2">📍 {ev.location}</span>}
                    </p>
                    {ev.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{ev.description}</p>
                    )}
                  </div>
                  {ev.link && (
                    <a href={ev.link} target="_blank" rel="noreferrer" className="flex-shrink-0 opacity-40 hover:opacity-100 transition">
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: C.accent }} />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Aba Tarefas ----
function AbaTarefas() {
  const [listas, setListas]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try { setListas(await apiFetch('/tarefas.php')) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  const total = (listas || []).reduce((s, l) => s + l.tasks.length, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        {listas !== null && (
          <span className="text-xs" style={{ color: C.muted }}>{total} tarefa{total !== 1 ? 's' : ''} pendente{total !== 1 ? 's' : ''}</span>
        )}
        <Btn onClick={carregar} disabled={loading} variant="default" className="ml-auto">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
          Carregar Tarefas
        </Btn>
      </div>

      {loading && <Spinner />}
      {erro    && <Erro msg={erro} onRetry={carregar} />}
      {!loading && !erro && listas === null && (
        <Empty msg="Clique em 'Carregar Tarefas' para buscar." />
      )}
      {!loading && !erro && listas !== null && listas.length === 0 && (
        <Empty msg="Nenhuma tarefa pendente encontrada." sub="Todas as suas listas estão em dia!" />
      )}

      {!loading && (listas || []).map(lista => (
        <div key={lista.listId} className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: C.accent2 }}>
            {lista.listName}
            <span className="ml-2 normal-case font-normal" style={{ color: C.muted }}>({lista.tasks.length})</span>
          </div>
          {lista.tasks.length === 0 ? (
            <p className="text-xs px-1" style={{ color: C.muted }}>Nenhuma tarefa pendente nesta lista.</p>
          ) : (
            <div className="space-y-2">
              {lista.tasks.map((t, i) => (
                <Card key={t.id || i}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-4 h-4 rounded border mt-0.5" style={{ borderColor: C.muted }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: C.text }}>{t.title}</p>
                      {t.due && (
                        <p className="text-xs mt-0.5" style={{ color: C.accent }}>
                          Vence: {fmtDate(t.due)}
                        </p>
                      )}
                      {t.notes && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{t.notes}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---- Aba Notas (Drive .md) ----
function AbaNotas() {
  const [arquivos, setArquivos] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState(null)
  const [notaAberta, setNotaAberta] = useState(null) // { name, content }
  const [carregandoNota, setCarregandoNota] = useState(false)
  const [busca, setBusca]       = useState('')

  const carregar = useCallback(async (q = '') => {
    setLoading(true); setErro(null); setNotaAberta(null)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}&type=notas` : '?type=notas'
      setArquivos(await apiFetch(`/drive.php${params}`))
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  const abrirNota = useCallback(async (arquivo) => {
    setCarregandoNota(true)
    try {
      const nota = await apiFetch(`/nota.php?id=${arquivo.id}`)
      setNotaAberta(nota)
    } catch (e) {
      setErro(`Falha ao abrir nota: ${e.message}`)
    } finally { setCarregandoNota(false) }
  }, [])

  // Visualização de nota aberta
  if (notaAberta) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Btn variant="ghost" onClick={() => setNotaAberta(null)}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Btn>
          <span className="text-sm font-medium truncate" style={{ color: C.text }}>{notaAberta.name}</span>
          {notaAberta.modifiedTime && (
            <span className="text-xs ml-auto flex-shrink-0" style={{ color: C.muted }}>
              {fmtDateTime(notaAberta.modifiedTime)}
            </span>
          )}
        </div>
        <Card>
          <pre
            className="text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words"
            style={{ fontFamily: "'DM Mono', 'Fira Mono', monospace", color: C.text, maxHeight: '65vh', overflowY: 'auto' }}
          >
            {notaAberta.content || '(arquivo vazio)'}
          </pre>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && carregar(busca)}
          placeholder="Buscar notas por nome..."
          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
        />
        <Btn onClick={() => carregar(busca)} disabled={loading} variant="accent">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Buscar
        </Btn>
        {busca && (
          <Btn onClick={() => { setBusca(''); carregar('') }} variant="ghost">
            <X className="w-3.5 h-3.5" />
          </Btn>
        )}
      </div>

      {loading    && <Spinner />}
      {carregandoNota && <Spinner />}
      {erro       && <Erro msg={erro} onRetry={() => carregar(busca)} />}
      {!loading && !carregandoNota && !erro && arquivos === null && (
        <Empty msg="Clique em 'Buscar' para listar notas .md do Drive." />
      )}
      {!loading && !carregandoNota && !erro && arquivos !== null && arquivos.length === 0 && (
        <Empty msg="Nenhuma nota .md encontrada." sub="Faça o upload de arquivos .md no Google Drive para vê-los aqui." />
      )}

      {!loading && !carregandoNota && (arquivos || []).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {arquivos.map(f => (
            <button
              key={f.id}
              onClick={() => abrirNota(f)}
              className="group text-left rounded-2xl p-4 transition hover:scale-[1.01]"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg flex-shrink-0">📝</span>
                <p className="text-sm font-medium truncate flex-1" style={{ color: C.text }}>{f.name}</p>
              </div>
              <p className="text-xs" style={{ color: C.muted }}>
                {f.modifiedTime ? fmtDateTime(f.modifiedTime) : '—'}
              </p>
              <p className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition" style={{ color: C.accent }}>
                Abrir →
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Aba Drive ----
function AbaDrive() {
  const [arquivos, setArquivos] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState(null)
  const [busca, setBusca]       = useState('')

  const carregar = useCallback(async (q = '') => {
    setLoading(true); setErro(null)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ''
      setArquivos(await apiFetch(`/drive.php${params}`))
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && carregar(busca)}
          placeholder="Buscar arquivos no Drive..."
          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
        />
        <Btn onClick={() => carregar(busca)} disabled={loading} variant="accent">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {busca ? 'Buscar' : 'Recentes'}
        </Btn>
        {busca && (
          <Btn onClick={() => { setBusca(''); carregar('') }} variant="ghost">
            <X className="w-3.5 h-3.5" />
          </Btn>
        )}
      </div>

      {loading && <Spinner />}
      {erro    && <Erro msg={erro} onRetry={() => carregar(busca)} />}
      {!loading && !erro && arquivos === null && (
        <Empty msg="Clique em 'Recentes' para ver os últimos arquivos modificados." />
      )}
      {!loading && !erro && arquivos !== null && arquivos.length === 0 && (
        <Empty msg="Nenhum arquivo encontrado." />
      )}

      {!loading && (arquivos || []).length > 0 && (
        <div className="space-y-1.5">
          {arquivos.map(f => (
            <a
              key={f.id}
              href={f.webViewLink || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition group"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <span className="text-xl flex-shrink-0">{mimeIcon(f.mimeType)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:underline" style={{ color: C.text }}>{f.name}</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                  {f.mimeType?.split('/').pop()?.split('.').pop() || 'arquivo'}
                  {f.size ? ` · ${fmtSize(f.size)}` : ''}
                  {f.modifiedTime ? ` · ${fmtDateTime(f.modifiedTime)}` : ''}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-60 transition" style={{ color: C.accent }} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- App principal ----
const TABS = [
  { id: 'agenda',  label: 'Agenda',   Icon: Calendar },
  { id: 'tarefas', label: 'Tarefas',  Icon: CheckSquare },
  { id: 'notas',   label: 'Notas',    Icon: FileText },
  { id: 'drive',   label: 'Drive',    Icon: HardDrive },
]

export default function CerebroApp({ usuario, onVoltarHub, onLogout }) {
  const [aba, setAba]                     = useState('agenda')
  const [clock, setClock]                 = useState('')
  const [googleStatus, setGoogleStatus]   = useState(null)   // null | { connected }
  const [checkingAuth, setCheckingAuth]   = useState(true)
  const [connecting, setConnecting]       = useState(false)
  const [toast, setToast]                 = useState(null)

  // Injeta fontes Google
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const t = document.title
    document.title = 'Cérebro'
    return () => { document.head.removeChild(link); document.title = t }
  }, [])

  // Relógio em tempo real
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  // Checa status Google no mount
  useEffect(() => { checkGoogleAuth() }, [])

  // Listener para postMessage do popup OAuth
  useEffect(() => {
    const handler = (e) => {
      if (e.data === 'google_auth_success') {
        setConnecting(false)
        checkGoogleAuth()
        showToast('Google conectado com sucesso!')
      } else if (typeof e.data === 'string' && e.data.startsWith('google_auth_error:')) {
        setConnecting(false)
        showToast(`Falha na autorização: ${e.data.split(':')[1]}`, 'erro')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  async function checkGoogleAuth() {
    setCheckingAuth(true)
    try {
      const status = await apiFetch('/auth/status.php')
      setGoogleStatus(status)
    } catch {
      setGoogleStatus({ connected: false })
    } finally {
      setCheckingAuth(false)
    }
  }

  async function connectGoogle() {
    try {
      const { url } = await apiFetch('/auth/start.php')
      setConnecting(true)
      const popup = window.open(url, 'google_oauth', 'width=520,height=660,left=200,top=100')
      // Monitora fechamento do popup sem postMessage (ex: usuário fecha manualmente)
      const iv = setInterval(() => {
        if (popup?.closed) {
          clearInterval(iv)
          setConnecting(false)
          checkGoogleAuth()
        }
      }, 500)
    } catch (e) {
      showToast(`Erro ao iniciar autenticação: ${e.message}`, 'erro')
    }
  }

  async function disconnectGoogle() {
    if (!window.confirm('Desconectar o Google? Você precisará autorizar novamente para usar o Cérebro.')) return
    try {
      await apiFetch('/auth/status.php', { method: 'DELETE' })
      setGoogleStatus({ connected: false })
      showToast('Google desconectado.')
    } catch (e) {
      showToast(`Erro: ${e.message}`, 'erro')
    }
  }

  function showToast(msg, tipo = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const conectado = googleStatus?.connected === true

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(4,4,14,0.85)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onVoltarHub}
              className="p-2 rounded-lg transition hover:bg-white/5"
              style={{ color: C.muted }}
              title="Voltar ao Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold"
              style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})` }}
            >
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Cérebro</p>
              <p className="text-xs truncate" style={{ color: C.muted }}>{usuario?.nome || ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Relógio */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: C.muted, fontFamily: "'DM Mono', monospace" }}>
              <Clock className="w-3.5 h-3.5" />
              {clock}
            </div>

            {/* Status Google */}
            {!checkingAuth && (
              <button
                onClick={conectado ? disconnectGoogle : connectGoogle}
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
                style={{
                  background: conectado ? 'rgba(79,85,247,0.12)' : 'rgba(239,68,68,0.08)',
                  color: conectado ? C.accent : '#ef4444',
                  border: `1px solid ${conectado ? C.border : 'rgba(239,68,68,0.2)'}`,
                }}
                title={conectado ? 'Clique para desconectar o Google' : 'Clique para conectar o Google'}
              >
                {conectado ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {conectado ? 'Google' : 'Desconectado'}
              </button>
            )}

            <button
              onClick={onLogout}
              className="text-sm px-3 py-1.5 rounded hover:bg-white/5 transition flex items-center gap-1.5"
              style={{ color: C.muted }}
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap min-h-[40px]"
              style={aba === id
                ? { borderColor: C.accent, color: C.accent }
                : { borderColor: 'transparent', color: C.muted }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" /> {label}
            </button>
          ))}
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium"
          style={{
            background: toast.tipo === 'erro' ? '#ef4444' : C.accent,
            color: '#fff',
            border: `1px solid ${toast.tipo === 'erro' ? 'rgba(239,68,68,0.5)' : 'rgba(79,85,247,0.5)'}`,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-4 py-7">
        {checkingAuth ? (
          <Spinner />
        ) : !conectado ? (
          <TelaConectar onConnect={connectGoogle} connecting={connecting} />
        ) : (
          <>
            {aba === 'agenda'  && <AbaAgenda />}
            {aba === 'tarefas' && <AbaTarefas />}
            {aba === 'notas'   && <AbaNotas />}
            {aba === 'drive'   && <AbaDrive />}
          </>
        )}
      </main>
    </div>
  )
}
