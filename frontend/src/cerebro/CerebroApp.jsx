import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, LogOut, Calendar, CheckSquare, FileText, HardDrive,
  RefreshCw, AlertCircle, ExternalLink, X, Brain,
  Wifi, WifiOff, Clock, Search, StickyNote, Plus, Trash2,
  Save, Edit2, Check,
} from 'lucide-react'

const API = '/api/cerebro'

const C = {
  bg:      '#04040e',
  card:    'rgba(13,18,48,0.6)',
  border:  'rgba(79,85,247,0.15)',
  accent:  '#4f55f7',
  accent2: '#8b5cf6',
  text:    '#dde1f0',
  muted:   '#3d4470',
}

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
    <div className={`rounded-2xl border p-5 ${className}`}
      style={{ background: C.card, borderColor: C.border, ...style }}>
      {children}
    </div>
  )
}

function Btn({ onClick, children, variant = 'default', disabled, className = '' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
  const vs = {
    default: { cls: `border hover:opacity-80 ${base}`, st: { borderColor: C.border, color: C.text, background: 'rgba(255,255,255,0.04)' } },
    accent:  { cls: `text-white ${base}`,               st: { background: C.accent } },
    ghost:   { cls: `hover:bg-white/5 ${base}`,         st: { color: C.muted } },
    danger:  { cls: `border hover:opacity-80 ${base}`,  st: { borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.06)' } },
  }
  const v = vs[variant] || vs.default
  return (
    <button onClick={onClick} disabled={disabled} className={`${v.cls} ${className}`} style={v.st}>
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${C.accent} transparent ${C.accent} ${C.accent}` }} />
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

// ---- Modal wrapper ----
function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${width} rounded-2xl overflow-hidden mt-8 mb-8`}
        style={{ background: '#0a0d1e', border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <p className="font-semibold text-sm" style={{ color: C.text }}>{title}</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 transition" style={{ color: C.muted }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs mb-1 font-medium" style={{ color: C.muted }}>{label}</label>
      {children}
    </div>
  )
}
function FInput({ ...props }) {
  return (
    <input className="w-full rounded-xl px-3 py-2 text-sm outline-none"
      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.text }}
      {...props} />
  )
}
function FTextarea({ ...props }) {
  return (
    <textarea className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.text }}
      {...props} />
  )
}

// ---- Tela de conexão Google ----
function TelaConectar({ onConnect, connecting }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>🔑</div>
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ color: C.text }}>Conectar ao Google</p>
        <p className="text-sm mt-1 max-w-sm text-center" style={{ color: C.muted }}>
          Autorize o acesso à sua Agenda, Tarefas, Keep e Drive para usar o Cérebro.
        </p>
      </div>
      <Btn variant="accent" onClick={onConnect} disabled={connecting}>
        {connecting
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Aguardando...</>
          : <><span className="text-base">G</span> Conectar com Google</>}
      </Btn>
      <p className="text-xs text-center max-w-xs" style={{ color: C.muted }}>
        O token é armazenado de forma segura no servidor.
      </p>
    </div>
  )
}

// ============================================================
// ---- Aba Agenda ----
// ============================================================
const PERIODOS_AGENDA = [
  { label: 'Hoje',    dias: 0 },
  { label: '7 dias',  dias: 7 },
  { label: '14 dias', dias: 14 },
  { label: 'Mês',     dias: 30 },
]

function evToForm(ev) {
  if (!ev) return { title: '', allDay: false, startDate: '', startTime: '09:00', endDate: '', endTime: '10:00', location: '', description: '' }
  const allDay = ev.allDay || false
  const s = ev.start || '', e = ev.end || ''
  return {
    title: ev.title || '',
    allDay,
    startDate: s.slice(0, 10),
    startTime: allDay ? '09:00' : (s.slice(11, 16) || '09:00'),
    endDate:   e.slice(0, 10),
    endTime:   allDay ? '10:00' : (e.slice(11, 16) || '10:00'),
    location:    ev.location    || '',
    description: ev.description || '',
  }
}

function ModalEvento({ mode, inicial, saving, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(inicial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const startDT = form.allDay ? form.startDate : `${form.startDate}T${form.startTime}:00-03:00`
  const endDT   = form.allDay ? (form.endDate || form.startDate) : `${form.endDate || form.startDate}T${form.endTime}:00-03:00`
  return (
    <Modal title={mode === 'new' ? 'Novo compromisso' : 'Editar compromisso'} onClose={onClose}>
      <Field label="Título">
        <FInput value={form.title} onChange={e => set('title', e.target.value)} placeholder="Título do evento" autoFocus />
      </Field>
      <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer" style={{ color: C.muted }}>
        <input type="checkbox" checked={form.allDay} onChange={e => set('allDay', e.target.checked)} />
        Dia inteiro
      </label>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <Field label="Data início">
          <FInput type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </Field>
        {!form.allDay && (
          <Field label="Hora início">
            <FInput type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          </Field>
        )}
        <Field label="Data fim">
          <FInput type="date" value={form.endDate || form.startDate} onChange={e => set('endDate', e.target.value)} />
        </Field>
        {!form.allDay && (
          <Field label="Hora fim">
            <FInput type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Local">
        <FInput value={form.location} onChange={e => set('location', e.target.value)} placeholder="Local (opcional)" />
      </Field>
      <Field label="Descrição">
        <FTextarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Descrição (opcional)" />
      </Field>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Btn variant="accent" disabled={saving || !form.title || !form.startDate}
          onClick={() => onSave({ ...form, start: startDT, end: endDT })}>
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </Btn>
        {onDelete && (
          <Btn variant="danger" disabled={saving} onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </Btn>
        )}
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  )
}

function AbaAgenda() {
  const [periodo, setPeriodo] = useState(1)
  const [eventos, setEventos] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState(null)
  const [modal,   setModal]   = useState(null) // { mode:'new'|'edit', ev }

  const carregar = useCallback(async (idx) => {
    const p = idx ?? periodo
    setLoading(true); setErro(null)
    const dias  = PERIODOS_AGENDA[p].dias
    const start = new Date()
    const end   = new Date(); end.setDate(end.getDate() + dias)
    const fmt   = d => d.toISOString().slice(0, 10)
    try { setEventos(await apiFetch(`/agenda.php?start=${fmt(start)}&end=${fmt(end)}`)) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [periodo])

  // Auto-carrega ao montar (ativação da aba)
  useEffect(() => { carregar() }, []) // eslint-disable-line

  async function salvar(payload) {
    setSaving(true)
    try {
      if (modal.mode === 'new') {
        await apiFetch('/agenda.php', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/agenda.php', { method: 'PATCH', body: JSON.stringify({ id: modal.ev.id, ...payload }) })
      }
      setModal(null); await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  async function excluir(id) {
    if (!confirm('Excluir este compromisso do Google Calendar?')) return
    setSaving(true)
    try { await apiFetch('/agenda.php', { method: 'DELETE', body: JSON.stringify({ id }) }); setModal(null); await carregar() }
    catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

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
          <button key={p.label} onClick={() => { setPeriodo(i); carregar(i) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={periodo === i ? { background: C.accent, color: '#fff' } : { background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Btn variant="accent" onClick={() => setModal({ mode: 'new', ev: null })}>
            <Plus className="w-3.5 h-3.5" /> Novo
          </Btn>
          <Btn onClick={() => carregar()} disabled={loading} variant="default">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Btn>
        </div>
      </div>

      {loading && eventos === null && <Spinner />}
      {erro && <Erro msg={erro} onRetry={() => carregar()} />}
      {!loading && !erro && eventos !== null && dias.length === 0 && <Empty msg="Nenhum evento no período." />}

      {dias.map(dia => (
        <div key={dia} className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: C.accent2 }}>
            {fmtDate(dia)}
          </div>
          <div className="space-y-2">
            {porDia[dia].map((ev, i) => (
              <button key={ev.id || i} onClick={() => setModal({ mode: 'edit', ev })}
                className="w-full text-left">
                <Card className="hover:border-opacity-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" style={{ color: C.text }}>{ev.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                        {ev.allDay ? 'Dia inteiro' : `${fmtHour(ev.start)} → ${fmtHour(ev.end)}`}
                        {ev.location && <span className="ml-2">📍 {ev.location}</span>}
                      </p>
                      {ev.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{ev.description}</p>}
                    </div>
                    <Edit2 className="w-3.5 h-3.5 flex-shrink-0 opacity-30" style={{ color: C.accent }} />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      ))}

      {modal && (
        <ModalEvento
          mode={modal.mode}
          inicial={evToForm(modal.ev)}
          saving={saving}
          onSave={salvar}
          onDelete={modal.ev?.id ? () => excluir(modal.ev.id) : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// ---- Aba Tarefas ----
// ============================================================
function AbaTarefas() {
  const [listas,   setListas]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState(null)
  const [completing, setCompleting] = useState(new Set())
  const [novas, setNovas]       = useState({}) // { listId: string }

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try { setListas(await apiFetch('/tarefas.php')) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, []) // eslint-disable-line

  async function concluir(listId, taskId) {
    setCompleting(s => new Set(s).add(taskId))
    // Optimistic remove
    setListas(prev => prev?.map(l =>
      l.listId === listId ? { ...l, tasks: l.tasks.filter(t => t.id !== taskId) } : l
    ))
    try {
      await apiFetch('/tarefas.php', { method: 'PATCH', body: JSON.stringify({ listId, taskId, status: 'completed' }) })
    } catch (e) {
      alert('Erro ao concluir: ' + e.message)
      carregar()
    } finally {
      setCompleting(s => { const ns = new Set(s); ns.delete(taskId); return ns })
    }
  }

  async function criar(listId, titulo) {
    if (!titulo.trim()) return
    try {
      await apiFetch('/tarefas.php', { method: 'POST', body: JSON.stringify({ listId, title: titulo.trim() }) })
      setNovas(s => ({ ...s, [listId]: '' }))
      await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const total = (listas || []).reduce((s, l) => s + l.tasks.length, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        {listas !== null && (
          <span className="text-xs" style={{ color: C.muted }}>{total} pendente{total !== 1 ? 's' : ''}</span>
        )}
        <Btn onClick={carregar} disabled={loading} variant="default" className="ml-auto">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </Btn>
      </div>

      {loading && listas === null && <Spinner />}
      {erro && <Erro msg={erro} onRetry={carregar} />}
      {!loading && !erro && listas !== null && listas.length === 0 && (
        <Empty msg="Nenhuma tarefa pendente." sub="Tudo em dia!" />
      )}

      {(listas || []).map(lista => (
        <div key={lista.listId} className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: C.accent2 }}>
            {lista.listName}
            <span className="ml-2 normal-case font-normal" style={{ color: C.muted }}>({lista.tasks.length})</span>
          </div>
          <div className="space-y-2">
            {lista.tasks.map((t, i) => (
              <Card key={t.id || i}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => concluir(lista.listId, t.id)}
                    disabled={completing.has(t.id)}
                    className="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition hover:border-green-400"
                    style={{ borderColor: completing.has(t.id) ? '#22c55e' : C.muted }}
                    title="Concluir tarefa"
                  >
                    {completing.has(t.id) && <Check className="w-3 h-3" style={{ color: '#22c55e' }} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: C.text }}>{t.title}</p>
                    {t.due && <p className="text-xs mt-0.5" style={{ color: C.accent }}>Vence: {fmtDate(t.due)}</p>}
                    {t.notes && <p className="text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{t.notes}</p>}
                  </div>
                </div>
              </Card>
            ))}
            {/* Input nova tarefa */}
            <div className="flex gap-2 mt-2">
              <input
                value={novas[lista.listId] || ''}
                onChange={e => setNovas(s => ({ ...s, [lista.listId]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && criar(lista.listId, novas[lista.listId] || '')}
                placeholder="+ Nova tarefa... (Enter para salvar)"
                className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.text }}
              />
              <Btn variant="accent" onClick={() => criar(lista.listId, novas[lista.listId] || '')}>
                <Plus className="w-3.5 h-3.5" />
              </Btn>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ---- Aba Keep ----
// ============================================================
const KEEP_COLORS = ['#fff9c4','#c8e6c9','#bbdefb','#f8bbd0','#ffe0b2','#e1bee7','#b2dfdb','#cfd8dc']

function ModalKeep({ mode, inicial, saving, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(inicial)
  return (
    <Modal title={mode === 'new' ? 'Nova nota' : 'Editar nota'} onClose={onClose}>
      <Field label="Título">
        <FInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título (opcional)" autoFocus />
      </Field>
      <Field label="Conteúdo">
        <FTextarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={8} placeholder="Conteúdo da nota..." />
      </Field>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Btn variant="accent" disabled={saving} onClick={() => onSave(form)}>
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </Btn>
        {onDelete && (
          <Btn variant="danger" disabled={saving} onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Lixeira
          </Btn>
        )}
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  )
}

function KeepGrid({ notas, onEdit }) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
      {notas.map((n, i) => {
        const bg = KEEP_COLORS[i % KEEP_COLORS.length]
        return (
          <button key={n.id || i} onClick={() => onEdit(n)}
            className="break-inside-avoid w-full text-left rounded-2xl p-4 mb-3 hover:opacity-90 transition"
            style={{ background: bg, color: '#202124' }}>
            {n.title && <p className="font-semibold text-sm mb-2 leading-snug">{n.title}</p>}
            {n.isChecklist ? (
              <ul className="space-y-1">
                {(n.items || []).map((item, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-xs">
                    <span className="flex-shrink-0 mt-0.5">{item.checked ? '☑' : '☐'}</span>
                    <span style={item.checked ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              n.text && <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-[12]">{n.text}</p>
            )}
            {n.updateTime && <p className="text-[10px] mt-2 opacity-40">{fmtDateTime(n.updateTime)}</p>}
          </button>
        )
      })}
    </div>
  )
}

function AbaKeep() {
  const [notas,  setNotas]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState(null)
  const [busca,   setBusca]   = useState('')
  const [modal,   setModal]   = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try { setNotas(await apiFetch('/keep.php')) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, []) // eslint-disable-line

  async function salvar(form) {
    setSaving(true)
    try {
      if (modal.mode === 'new') {
        await apiFetch('/keep.php', { method: 'POST', body: JSON.stringify({ title: form.title, text: form.text }) })
      } else {
        await apiFetch('/keep.php', { method: 'PATCH', body: JSON.stringify({ id: modal.nota.id, title: form.title, text: form.text }) })
      }
      setModal(null); await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  async function excluir(id) {
    if (!confirm('Mover nota para a lixeira do Keep?')) return
    setSaving(true)
    try { await apiFetch('/keep.php', { method: 'DELETE', body: JSON.stringify({ id }) }); setModal(null); await carregar() }
    catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  const filtradas = (notas || []).filter(n => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (n.title || '').toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q)
  })
  const pinned   = filtradas.filter(n => n.pinned)
  const unpinned = filtradas.filter(n => !n.pinned)

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Filtrar notas..."
          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
        <Btn variant="accent" onClick={() => setModal({ mode: 'new', nota: null })}>
          <Plus className="w-3.5 h-3.5" /> Nova
        </Btn>
        <Btn onClick={carregar} disabled={loading} variant="default">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Btn>
        {busca && <Btn onClick={() => setBusca('')} variant="ghost"><X className="w-3.5 h-3.5" /></Btn>}
      </div>

      {loading && notas === null && <Spinner />}
      {erro && <Erro msg={erro} onRetry={carregar} />}
      {!loading && !erro && notas !== null && filtradas.length === 0 && <Empty msg="Nenhuma nota encontrada." />}

      {pinned.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: C.accent2 }}>📌 Fixadas</p>
          <KeepGrid notas={pinned} onEdit={n => setModal({ mode: 'edit', nota: n })} />
        </div>
      )}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && <p className="text-xs font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: C.accent2 }}>Outras</p>}
          <KeepGrid notas={unpinned} onEdit={n => setModal({ mode: 'edit', nota: n })} />
        </div>
      )}

      {modal && (
        <ModalKeep
          mode={modal.mode}
          inicial={{ title: modal.nota?.title || '', text: modal.nota?.text || '' }}
          saving={saving}
          onSave={salvar}
          onDelete={modal.nota?.id ? () => excluir(modal.nota.id) : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// ---- Aba Notas (.md Drive) ----
// ============================================================
function AbaNotas() {
  const [arquivos, setArquivos]     = useState(null)
  const [loading,  setLoading]      = useState(false)
  const [erro,     setErro]         = useState(null)
  const [notaAberta, setNotaAberta] = useState(null)
  const [carregandoNota, setCarregandoNota] = useState(false)
  const [editMode,  setEditMode]    = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving,   setSaving]       = useState(false)
  const [busca,    setBusca]        = useState('')

  const carregar = useCallback(async (q = '') => {
    setLoading(true); setErro(null); setNotaAberta(null); setEditMode(false)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}&type=notas` : '?type=notas'
      setArquivos(await apiFetch(`/drive.php${params}`))
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, []) // eslint-disable-line

  const abrirNota = useCallback(async (arquivo) => {
    setCarregandoNota(true); setEditMode(false)
    try {
      const nota = await apiFetch(`/nota.php?id=${arquivo.id}`)
      setNotaAberta(nota); setEditContent(nota.content || '')
    } catch (e) { setErro(`Falha ao abrir: ${e.message}`) }
    finally { setCarregandoNota(false) }
  }, [])

  async function salvarNota() {
    if (!notaAberta) return
    setSaving(true)
    try {
      await apiFetch(`/nota.php?id=${notaAberta.id}`, { method: 'PUT', body: JSON.stringify({ content: editContent }) })
      setNotaAberta(n => ({ ...n, content: editContent }))
      setEditMode(false)
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSaving(false) }
  }

  if (notaAberta) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Btn variant="ghost" onClick={() => { setNotaAberta(null); setEditMode(false) }}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Btn>
          <span className="text-sm font-medium truncate flex-1 min-w-0" style={{ color: C.text }}>{notaAberta.name}</span>
          {!editMode ? (
            <Btn variant="default" onClick={() => setEditMode(true)}>
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </Btn>
          ) : (
            <>
              <Btn variant="accent" disabled={saving} onClick={salvarNota}>
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar
              </Btn>
              <Btn variant="ghost" onClick={() => { setEditMode(false); setEditContent(notaAberta.content || '') }}>
                <X className="w-3.5 h-3.5" />
              </Btn>
            </>
          )}
        </div>
        <Card>
          {editMode ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full text-xs leading-relaxed outline-none resize-none bg-transparent"
              style={{ fontFamily: "'DM Mono', 'Fira Mono', monospace", color: C.text, minHeight: '60vh' }}
            />
          ) : (
            <pre className="text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words"
              style={{ fontFamily: "'DM Mono', 'Fira Mono', monospace", color: C.text, maxHeight: '65vh', overflowY: 'auto' }}>
              {notaAberta.content || '(arquivo vazio)'}
            </pre>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && carregar(busca)}
          placeholder="Buscar notas por nome..."
          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
        <Btn onClick={() => carregar(busca)} disabled={loading} variant="accent">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Buscar
        </Btn>
        {busca && <Btn onClick={() => { setBusca(''); carregar('') }} variant="ghost"><X className="w-3.5 h-3.5" /></Btn>}
      </div>

      {loading && <Spinner />}
      {carregandoNota && <Spinner />}
      {erro && <Erro msg={erro} onRetry={() => carregar(busca)} />}
      {!loading && !carregandoNota && !erro && arquivos === null && <Empty msg="Carregando notas do Drive..." />}
      {!loading && !carregandoNota && !erro && arquivos !== null && arquivos.length === 0 && (
        <Empty msg="Nenhuma nota .md encontrada." sub="Faça upload de arquivos .md no Google Drive para vê-los aqui." />
      )}

      {!loading && !carregandoNota && (arquivos || []).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {arquivos.map(f => (
            <button key={f.id} onClick={() => abrirNota(f)}
              className="group text-left rounded-2xl p-4 transition hover:scale-[1.01]"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg flex-shrink-0">📝</span>
                <p className="text-sm font-medium truncate flex-1" style={{ color: C.text }}>{f.name}</p>
              </div>
              <p className="text-xs" style={{ color: C.muted }}>{f.modifiedTime ? fmtDateTime(f.modifiedTime) : '—'}</p>
              <p className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition" style={{ color: C.accent }}>Abrir →</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ---- Aba Drive ----
// ============================================================
function AbaDrive() {
  const [arquivos, setArquivos] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState(null)
  const [busca,    setBusca]    = useState('')

  const carregar = useCallback(async (q = '') => {
    setLoading(true); setErro(null)
    try { setArquivos(await apiFetch(`/drive.php${q ? `?q=${encodeURIComponent(q)}` : ''}`)) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, []) // eslint-disable-line

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && carregar(busca)}
          placeholder="Buscar arquivos no Drive..."
          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
        <Btn onClick={() => carregar(busca)} disabled={loading} variant="accent">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {busca ? 'Buscar' : 'Recentes'}
        </Btn>
        {busca && <Btn onClick={() => { setBusca(''); carregar('') }} variant="ghost"><X className="w-3.5 h-3.5" /></Btn>}
      </div>

      {loading && <Spinner />}
      {erro    && <Erro msg={erro} onRetry={() => carregar(busca)} />}
      {!loading && !erro && arquivos !== null && arquivos.length === 0 && <Empty msg="Nenhum arquivo encontrado." />}

      {!loading && (arquivos || []).length > 0 && (
        <div className="space-y-1.5">
          {arquivos.map(f => (
            <a key={f.id} href={f.webViewLink || '#'} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition group"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
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

// ============================================================
// ---- App principal ----
// ============================================================
const TABS = [
  { id: 'agenda',  label: 'Agenda',   Icon: Calendar },
  { id: 'tarefas', label: 'Tarefas',  Icon: CheckSquare },
  { id: 'keep',    label: 'Keep',     Icon: StickyNote },
  { id: 'notas',   label: 'Notas',    Icon: FileText },
  { id: 'drive',   label: 'Drive',    Icon: HardDrive },
]

export default function CerebroApp({ usuario, onVoltarHub, onLogout }) {
  const [aba,           setAba]           = useState('agenda')
  const [clock,         setClock]         = useState('')
  const [googleStatus,  setGoogleStatus]  = useState(null)
  const [checkingAuth,  setCheckingAuth]  = useState(true)
  const [connecting,    setConnecting]    = useState(false)
  const [toast,         setToast]         = useState(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const t = document.title
    document.title = 'Cérebro'
    return () => { document.head.removeChild(link); document.title = t }
  }, [])

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick(); const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { checkGoogleAuth() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.data === 'google_auth_success') {
        setConnecting(false); checkGoogleAuth(); showToast('Google conectado com sucesso!')
      } else if (typeof e.data === 'string' && e.data.startsWith('google_auth_error:')) {
        setConnecting(false); showToast(`Falha na autorização: ${e.data.split(':')[1]}`, 'erro')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  async function checkGoogleAuth() {
    setCheckingAuth(true)
    try { setGoogleStatus(await apiFetch('/auth/status.php')) }
    catch { setGoogleStatus({ connected: false }) }
    finally { setCheckingAuth(false) }
  }

  async function connectGoogle() {
    try {
      const { url } = await apiFetch('/auth/start.php')
      setConnecting(true)
      const popup = window.open(url, 'google_oauth', 'width=520,height=660,left=200,top=100')
      const iv = setInterval(() => {
        if (popup?.closed) { clearInterval(iv); setConnecting(false); checkGoogleAuth() }
      }, 500)
    } catch (e) { showToast(`Erro: ${e.message}`, 'erro') }
  }

  async function disconnectGoogle() {
    if (!confirm('Desconectar o Google?')) return
    try {
      await apiFetch('/auth/status.php', { method: 'DELETE' })
      setGoogleStatus({ connected: false }); showToast('Google desconectado.')
    } catch (e) { showToast(`Erro: ${e.message}`, 'erro') }
  }

  function showToast(msg, tipo = 'ok') {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500)
  }

  const conectado = googleStatus?.connected === true

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md"
        style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(4,4,14,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onVoltarHub} className="p-2 rounded-lg transition hover:bg-white/5" style={{ color: C.muted }} title="Voltar ao Hub">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold"
              style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})` }}>
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Cérebro</p>
              <p className="text-xs truncate" style={{ color: C.muted }}>{usuario?.nome || ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: C.muted, fontFamily: "'DM Mono', monospace" }}>
              <Clock className="w-3.5 h-3.5" />{clock}
            </div>
            {!checkingAuth && (
              <button onClick={conectado ? disconnectGoogle : connectGoogle}
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
                style={{
                  background: conectado ? 'rgba(79,85,247,0.12)' : 'rgba(239,68,68,0.08)',
                  color: conectado ? C.accent : '#ef4444',
                  border: `1px solid ${conectado ? C.border : 'rgba(239,68,68,0.2)'}`,
                }}>
                {conectado ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {conectado ? 'Google' : 'Desconectado'}
              </button>
            )}
            <button onClick={onLogout} className="text-sm px-3 py-1.5 rounded hover:bg-white/5 transition flex items-center gap-1.5" style={{ color: C.muted }}>
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setAba(id)}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap min-h-[40px]"
              style={aba === id ? { borderColor: C.accent, color: C.accent } : { borderColor: 'transparent', color: C.muted }}>
              <Icon className="w-4 h-4 flex-shrink-0" /> {label}
            </button>
          ))}
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium"
          style={{ background: toast.tipo === 'erro' ? '#ef4444' : C.accent, color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      {/* Conteúdo — cada aba monta/desmonta ao trocar, causando auto-refresh */}
      <main className="max-w-6xl mx-auto px-4 py-7">
        {checkingAuth ? (
          <Spinner />
        ) : !conectado ? (
          <TelaConectar onConnect={connectGoogle} connecting={connecting} />
        ) : (
          <>
            {aba === 'agenda'  && <AbaAgenda />}
            {aba === 'tarefas' && <AbaTarefas />}
            {aba === 'keep'    && <AbaKeep />}
            {aba === 'notas'   && <AbaNotas />}
            {aba === 'drive'   && <AbaDrive />}
          </>
        )}
      </main>
    </div>
  )
}
