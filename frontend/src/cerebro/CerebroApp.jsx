import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, LogOut, Calendar, CheckSquare, FileText, HardDrive,
  RefreshCw, AlertCircle, ExternalLink, X, Brain, Wifi, WifiOff,
  Clock, Search, Plus, Trash2, Save, Edit2, Check, Play, Pause,
  RotateCcw, Timer, LayoutGrid, Home, Folder, ChevronRight, Bell,
  Mail, Send, Archive, Eye,
} from 'lucide-react'

const API = '/api/cerebro'
const C = {
  bg: '#04040e', card: 'rgba(13,18,48,0.6)', border: 'rgba(79,85,247,0.15)',
  accent: '#4f55f7', accent2: '#8b5cf6', text: '#dde1f0', muted: '#3d4470',
}
const MATRIX_LS = 'cerebro_matrix_v1'

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  const p = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(p.error || `HTTP ${r.status}`)
  return p?.data ?? p
}

// ---- Utilitários ----
const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) }
const fmtDT   = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const fmtHour = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
const fmtSize = b => { if (!b) return ''; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b/1024).toFixed(1)} KB`; return `${(b/1048576).toFixed(1)} MB` }
const pad2    = n => String(n).padStart(2, '0')

function mimeIcon(m = '') {
  if (m.includes('folder')) return '📁'
  if (m.includes('spreadsheet') || m.includes('excel')) return '📊'
  if (m.includes('presentation') || m.includes('powerpoint')) return '📑'
  if (m.includes('document') || m.includes('word')) return '📄'
  if (m.includes('pdf')) return '📕'
  if (m.includes('image')) return '🖼'
  if (m.includes('video')) return '🎬'
  if (m.includes('audio')) return '🎵'
  if (m.includes('markdown') || m.includes('text')) return '📝'
  return '📄'
}

// ---- Markdown renderer ----
function iMd(text, base = 0) {
  const res = []; let rem = text || '', k = base * 100
  while (rem) {
    const tests = [
      [/\*\*\*(.+?)\*\*\*/, m => <strong key={k++}><em>{m[1]}</em></strong>],
      [/\*\*(.+?)\*\*/,     m => <strong key={k++} style={{ color: '#e2e8f0' }}>{m[1]}</strong>],
      [/\*(.+?)\*/,         m => <em key={k++} style={{ color: '#c4b5fd' }}>{m[1]}</em>],
      [/~~(.+?)~~/,         m => <span key={k++} style={{ textDecoration: 'line-through', opacity: .6 }}>{m[1]}</span>],
      [/`(.+?)`/,           m => <code key={k++} style={{ background: 'rgba(0,0,0,0.5)', color: '#86efac', fontFamily: "'DM Mono',monospace", fontSize: '0.78em', padding: '1px 5px', borderRadius: 4 }}>{m[1]}</code>],
      [/\[\[(.+?)\]\]/,     m => <span key={k++} style={{ color: C.accent, borderBottom: `1px dashed ${C.accent}`, cursor: 'default' }}>{m[1]}</span>],
      [/#([\wÀ-ɏ]+)/, m => <span key={k++} style={{ color: C.accent2, fontSize: '0.85em', fontWeight: 600 }}>#{m[1]}</span>],
      [/\[(.+?)\]\((.+?)\)/, m => <a key={k++} href={m[2]} target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: 'underline' }}>{m[1]}</a>],
    ]
    let best = null, bestIdx = Infinity
    for (const [re, fn] of tests) { const m = rem.match(re); if (m && m.index < bestIdx) { best = { m, fn }; bestIdx = m.index } }
    if (!best) { res.push(rem); break }
    if (bestIdx > 0) res.push(rem.slice(0, bestIdx))
    res.push(best.fn(best.m))
    rem = rem.slice(bestIdx + best.m[0].length)
  }
  return res
}

function parseFrontmatter(raw) {
  if (!raw?.startsWith('---')) return { meta: {}, body: raw || '' }
  const end = raw.indexOf('\n---', 4)
  if (end === -1) return { meta: {}, body: raw }
  const yaml = raw.slice(4, end)
  const body = raw.slice(end + 4).trimStart()
  const meta = {}
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)/)
    if (!m) continue
    const v = m[2].trim()
    if (v.startsWith('[')) {
      try { meta[m[1]] = JSON.parse(v.replace(/'/g, '"')) } catch { meta[m[1]] = v.slice(1, -1).split(',').map(s => s.trim()) }
    } else {
      meta[m[1]] = v.replace(/^['"]|['"]$/g, '')
    }
  }
  return { meta, body }
}

function renderMd(raw) {
  if (!raw) return null
  const { body } = parseFrontmatter(raw)
  const lines = body.split('\n'); const blocks = []
  let i = 0, listBuf = [], listK = 0, isOl = false
  const flush = () => {
    if (!listBuf.length) return
    const Tag = isOl ? 'ol' : 'ul'
    blocks.push(<Tag key={`l${listK}`} className={`ml-5 my-1.5 text-sm space-y-1 ${isOl ? 'list-decimal' : 'list-disc'}`} style={{ color: C.text }}>{listBuf}</Tag>)
    listBuf = []
  }
  while (i < lines.length) {
    const l = lines[i++]
    // Bloco de código
    if (l.startsWith('```')) {
      flush(); const lang = l.slice(3).trim(); const code = []
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]); i++
      blocks.push(
        <div key={i} className="my-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          {lang && <div className="px-3 py-1 text-[10px]" style={{ background: 'rgba(0,0,0,0.6)', color: C.muted, fontFamily: "'DM Mono',monospace" }}>{lang}</div>}
          <pre className="px-4 py-3 text-xs overflow-x-auto leading-relaxed" style={{ background: 'rgba(0,0,0,0.5)', color: '#86efac', fontFamily: "'DM Mono',monospace", margin: 0 }}>{code.join('\n')}</pre>
        </div>
      )
      continue
    }
    // Separador
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(l.trim())) {
      flush(); blocks.push(<hr key={i} className="my-4" style={{ borderColor: C.border }} />); continue
    }
    // Headings
    const hm = l.match(/^(#{1,6}) (.+)/)
    if (hm) {
      flush()
      const lvl = hm[1].length
      const styles = [
        { fontSize: '1.4rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.5rem', color: C.text, borderBottom: `2px solid ${C.accent}33`, paddingBottom: '0.3rem' },
        { fontSize: '1.2rem', fontWeight: 700, marginTop: '1.2rem', marginBottom: '0.4rem', color: C.text, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.2rem' },
        { fontSize: '1rem',  fontWeight: 600, marginTop: '1rem',   marginBottom: '0.3rem', color: C.text },
        { fontSize: '0.9rem',fontWeight: 600, marginTop: '0.8rem', marginBottom: '0.25rem',color: '#a5b4fc' },
        { fontSize: '0.85rem',fontWeight:600, marginTop: '0.6rem', marginBottom: '0.2rem', color: C.muted },
        { fontSize: '0.8rem', fontWeight:600, marginTop: '0.5rem', marginBottom: '0.15rem',color: C.muted },
      ]
      blocks.push(<div key={i} style={styles[lvl - 1]}>{iMd(hm[2], i)}</div>)
      continue
    }
    // Callout / blockquote
    if (l.startsWith('> ')) {
      flush()
      const inner = l.slice(2)
      const calloutM = inner.match(/^\[!([\w]+)\]\s*(.*)/)
      if (calloutM) {
        const icons = { NOTE:'ℹ️', TIP:'💡', WARNING:'⚠️', DANGER:'🔥', INFO:'ℹ️', IDEA:'💡', TODO:'✅', QUESTION:'❓' }
        const t = calloutM[1].toUpperCase()
        blocks.push(
          <div key={i} className="rounded-xl px-4 py-3 my-2 text-sm" style={{ background: `rgba(79,85,247,0.1)`, border: `1px solid ${C.accent}44` }}>
            <p className="font-semibold mb-1" style={{ color: C.accent }}>{icons[t] || '📌'} {t}{calloutM[2] ? ` — ${calloutM[2]}` : ''}</p>
          </div>
        )
      } else {
        blocks.push(<blockquote key={i} className="border-l-2 pl-4 my-1.5 text-sm italic" style={{ borderColor: C.accent2, color: '#a5b4fc' }}>{iMd(inner, i)}</blockquote>)
      }
      continue
    }
    // Checkbox
    const cb = l.match(/^[\s]*[-*+] \[([x ])\] (.+)/i)
    if (cb) {
      flush()
      const done = cb[1].toLowerCase() === 'x'
      blocks.push(
        <div key={i} className="flex gap-2 items-start text-sm my-0.5">
          <span className="flex-shrink-0 mt-0.5" style={{ color: done ? '#22c55e' : C.muted }}>{done ? '✅' : '⬜'}</span>
          <span style={done ? { textDecoration: 'line-through', opacity: .45, color: C.muted } : { color: C.text }}>{iMd(cb[2], i)}</span>
        </div>
      )
      continue
    }
    // Listas
    const ul = l.match(/^[\s]*[-*+] (.+)/)
    if (ul) { if (listBuf.length && isOl) flush(); isOl = false; listK = i; listBuf.push(<li key={i} style={{ color: C.text }}>{iMd(ul[1], i)}</li>); continue }
    const ol = l.match(/^[\s]*\d+[.)]\s+(.+)/)
    if (ol) { if (listBuf.length && !isOl) flush(); isOl = true; listK = i; listBuf.push(<li key={i} style={{ color: C.text }}>{iMd(ol[1], i)}</li>); continue }
    // Linha em branco
    if (!l.trim()) { flush(); blocks.push(<div key={i} className="h-2" />); continue }
    // Parágrafo
    flush(); blocks.push(<p key={i} className="text-sm leading-relaxed my-0.5" style={{ color: C.text }}>{iMd(l, i)}</p>)
  }
  flush()
  return <div className="leading-relaxed">{blocks}</div>
}

// ---- Componentes base ----
function Card({ children, style, className = '' }) {
  return <div className={`rounded-2xl border p-5 ${className}`} style={{ background: C.card, borderColor: C.border, ...style }}>{children}</div>
}
function Btn({ onClick, children, variant = 'default', disabled, className = '', title }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
  const vs = {
    default: { cls: `border hover:opacity-80 ${base}`, st: { borderColor: C.border, color: C.text, background: 'rgba(255,255,255,0.04)' } },
    accent:  { cls: `text-white ${base}`,               st: { background: C.accent } },
    ghost:   { cls: `hover:bg-white/5 ${base}`,         st: { color: C.muted } },
    danger:  { cls: `border hover:opacity-80 ${base}`,  st: { borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.06)' } },
    green:   { cls: `text-white ${base}`,               st: { background: '#16a34a' } },
  }
  const v = vs[variant] || vs.default
  return <button onClick={onClick} disabled={disabled} className={`${v.cls} ${className}`} style={v.st} title={title}>{children}</button>
}
function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${C.accent} transparent ${C.accent} ${C.accent}` }} /></div>
}
function Empty({ msg, sub }) {
  return <div className="text-center py-16" style={{ color: C.muted }}><p className="text-sm">{msg || 'Nenhum item.'}</p>{sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}</div>
}
function Erro({ msg, onRetry }) {
  return <div className="flex flex-col items-center gap-3 py-14" style={{ color: '#f87171' }}><AlertCircle className="w-8 h-8 opacity-60" /><p className="text-sm text-center max-w-xs">{msg}</p>{onRetry && <Btn onClick={onRetry}>Tentar novamente</Btn>}</div>
}
function ModalWrap({ title, onClose, children, width = 'max-w-lg' }) {
  useEffect(() => { const fn = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn) }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${width} rounded-2xl overflow-hidden mt-8 mb-8`} style={{ background: '#0a0d1e', border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <p className="font-semibold text-sm" style={{ color: C.text }}>{title}</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5" style={{ color: C.muted }}><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
function Field({ label, children }) { return <div className="mb-3"><label className="block text-xs mb-1 font-medium" style={{ color: C.muted }}>{label}</label>{children}</div> }
function FInput(props) { return <input className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.text }} {...props} /> }
function FTA(props) { return <textarea className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.text }} {...props} /> }

// ---- Tela de conexão ----
function TelaConectar({ onConnect, connecting }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>🔑</div>
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ color: C.text }}>Conectar ao Google</p>
        <p className="text-sm mt-1 max-w-sm" style={{ color: C.muted }}>Autorize o acesso à Agenda, Tarefas, Drive e Gmail para usar o Cérebro.</p>
      </div>
      <Btn variant="accent" onClick={onConnect} disabled={connecting}>
        {connecting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Aguardando...</> : <><span>G</span> Conectar com Google</>}
      </Btn>
    </div>
  )
}

// ---- ModalEvento (compartilhado) ----
function evToForm(ev) {
  if (!ev) return { title: '', allDay: false, startDate: '', startTime: '09:00', endDate: '', endTime: '10:00', location: '', description: '' }
  const allDay = ev.allDay || false, s = ev.start || '', e = ev.end || ''
  return { title: ev.title || '', allDay, startDate: s.slice(0, 10), startTime: allDay ? '09:00' : (s.slice(11, 16) || '09:00'), endDate: e.slice(0, 10), endTime: allDay ? '10:00' : (e.slice(11, 16) || '10:00'), location: ev.location || '', description: ev.description || '' }
}
function ModalEvento({ mode, inicial, saving, onSave, onDelete, onClose }) {
  const [f, setF] = useState(inicial); const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const sdt = f.allDay ? f.startDate : `${f.startDate}T${f.startTime}:00-03:00`
  const edt = f.allDay ? (f.endDate || f.startDate) : `${f.endDate || f.startDate}T${f.endTime}:00-03:00`
  return (
    <ModalWrap title={mode === 'new' ? 'Novo compromisso' : 'Editar compromisso'} onClose={onClose}>
      <Field label="Título"><FInput value={f.title} onChange={e => set('title', e.target.value)} autoFocus /></Field>
      <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer" style={{ color: C.muted }}><input type="checkbox" checked={f.allDay} onChange={e => set('allDay', e.target.checked)} /> Dia inteiro</label>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <Field label="Data início"><FInput type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} /></Field>
        {!f.allDay && <Field label="Hora início"><FInput type="time" value={f.startTime} onChange={e => set('startTime', e.target.value)} /></Field>}
        <Field label="Data fim"><FInput type="date" value={f.endDate || f.startDate} onChange={e => set('endDate', e.target.value)} /></Field>
        {!f.allDay && <Field label="Hora fim"><FInput type="time" value={f.endTime} onChange={e => set('endTime', e.target.value)} /></Field>}
      </div>
      <Field label="Local"><FInput value={f.location} onChange={e => set('location', e.target.value)} placeholder="Local (opcional)" /></Field>
      <Field label="Descrição"><FTA value={f.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Descrição (opcional)" /></Field>
      <div className="flex flex-wrap gap-2 mt-4">
        <Btn variant="accent" disabled={saving || !f.title || !f.startDate} onClick={() => onSave({ ...f, start: sdt, end: edt })}>
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{saving ? 'Salvando...' : 'Salvar'}
        </Btn>
        {onDelete && <Btn variant="danger" disabled={saving} onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /> Excluir</Btn>}
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </ModalWrap>
  )
}

// ---- Hook: eventos do calendário ----
function useAgenda(autoLoad = true) {
  const [eventos, setEventos] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null)

  const carregar = useCallback(async (dias = 7) => {
    setLoading(true); setErro(null)
    const s = new Date(), e = new Date(); e.setDate(e.getDate() + dias)
    const fmt = d => d.toISOString().slice(0, 10)
    try { setEventos(await apiFetch(`/agenda.php?start=${fmt(s)}&end=${fmt(e)}`)) }
    catch (ex) { setErro(ex.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (autoLoad) carregar() }, []) // eslint-disable-line

  async function salvar(payload) {
    setSaving(true)
    try {
      if (modal.mode === 'new') await apiFetch('/agenda.php', { method: 'POST', body: JSON.stringify(payload) })
      else await apiFetch('/agenda.php', { method: 'PATCH', body: JSON.stringify({ id: modal.ev.id, ...payload }) })
      setModal(null); await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  async function excluir(id) {
    if (!confirm('Excluir este compromisso?')) return
    setSaving(true)
    try { await apiFetch('/agenda.php', { method: 'DELETE', body: JSON.stringify({ id }) }); setModal(null); await carregar() }
    catch (e) { alert('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  return { eventos, loading, erro, carregar, saving, modal, setModal, salvar, excluir }
}

// ---- Hook: tarefas ----
function useTarefas(autoLoad = true) {
  const [listas, setListas] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [completing, setCompleting] = useState(new Set())
  const [novas, setNovas] = useState({})

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try { setListas(await apiFetch('/tarefas.php')) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (autoLoad) carregar() }, []) // eslint-disable-line

  async function concluir(listId, taskId) {
    setCompleting(s => new Set(s).add(taskId))
    setListas(prev => prev?.map(l => l.listId === listId ? { ...l, tasks: l.tasks.filter(t => t.id !== taskId) } : l))
    try { await apiFetch('/tarefas.php', { method: 'PATCH', body: JSON.stringify({ listId, taskId, status: 'completed' }) }) }
    catch (e) { alert('Erro ao concluir: ' + e.message); carregar() }
    finally { setCompleting(s => { const ns = new Set(s); ns.delete(taskId); return ns }) }
  }

  async function criar(listId, titulo) {
    if (!titulo.trim()) return
    try { await apiFetch('/tarefas.php', { method: 'POST', body: JSON.stringify({ listId, title: titulo.trim() }) }); setNovas(s => ({ ...s, [listId]: '' })); await carregar() }
    catch (e) { alert('Erro: ' + e.message) }
  }

  return { listas, loading, erro, carregar, completing, concluir, criar, novas, setNovas }
}

// ============================================================
// ---- Aba Início ----
// ============================================================
function AbaInicio() {
  const ag = useAgenda(true)
  const ta = useTarefas(true)

  const hoje = new Date().toISOString().slice(0, 10)
  const eventosHoje = (ag.eventos || []).filter(ev => (ev.start || '').slice(0, 10) === hoje)
  const totalTarefas = (ta.listas || []).reduce((s, l) => s + l.tasks.length, 0)

  // Auto-refresh a cada 5 min
  useEffect(() => {
    const iv = setInterval(() => { ag.carregar(); ta.carregar() }, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, []) // eslint-disable-line

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold" style={{ color: C.text }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </h2>
        <Btn variant="default" disabled={ag.loading || ta.loading}
          onClick={() => { ag.carregar(); ta.carregar() }}>
          <RefreshCw className={`w-3.5 h-3.5 ${(ag.loading || ta.loading) ? 'animate-spin' : ''}`} /> Atualizar
        </Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compromissos de hoje */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent2 }}>
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Hoje
            </p>
            <Btn variant="accent" onClick={() => ag.setModal({ mode: 'new', ev: null })} className="!px-2 !py-1 text-xs">
              <Plus className="w-3 h-3" /> Novo
            </Btn>
          </div>
          {ag.loading && ag.eventos === null && <Spinner />}
          {ag.erro && <Erro msg={ag.erro} onRetry={ag.carregar} />}
          {!ag.loading && eventosHoje.length === 0 && ag.eventos !== null && <Empty msg="Sem compromissos hoje." />}
          <div className="space-y-2">
            {eventosHoje.map((ev, i) => (
              <button key={ev.id || i} onClick={() => ag.setModal({ mode: 'edit', ev })} className="w-full text-left">
                <Card className="hover:border-opacity-50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: C.text }}>{ev.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                        {ev.allDay ? 'Dia inteiro' : `${fmtHour(ev.start)} → ${fmtHour(ev.end)}`}
                        {ev.location && <span className="ml-2">📍 {ev.location}</span>}
                      </p>
                    </div>
                    <Edit2 className="w-3.5 h-3.5 flex-shrink-0 opacity-30" style={{ color: C.accent }} />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>

        {/* Tarefas pendentes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent2 }}>
              <CheckSquare className="w-3.5 h-3.5 inline mr-1" />Tarefas ({totalTarefas})
            </p>
          </div>
          {ta.loading && ta.listas === null && <Spinner />}
          {ta.erro && <Erro msg={ta.erro} onRetry={ta.carregar} />}
          {!ta.loading && totalTarefas === 0 && ta.listas !== null && <Empty msg="Nenhuma tarefa pendente." sub="Tudo em dia!" />}
          <div className="space-y-2">
            {(ta.listas || []).flatMap(lista =>
              lista.tasks.slice(0, 5).map((t, i) => (
                <Card key={t.id || i}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => ta.concluir(lista.listId, t.id)} disabled={ta.completing.has(t.id)}
                      className="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition hover:border-green-400"
                      style={{ borderColor: ta.completing.has(t.id) ? '#22c55e' : C.muted }}>
                      {ta.completing.has(t.id) && <Check className="w-3 h-3" style={{ color: '#22c55e' }} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: C.text }}>{t.title}</p>
                      {t.due && <p className="text-xs mt-0.5" style={{ color: C.accent }}>Vence: {fmtDate(t.due)}</p>}
                      <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{lista.listName}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {ag.modal && (
        <ModalEvento mode={ag.modal.mode} inicial={evToForm(ag.modal.ev)} saving={ag.saving}
          onSave={ag.salvar} onDelete={ag.modal.ev?.id ? () => ag.excluir(ag.modal.ev.id) : null}
          onClose={() => ag.setModal(null)} />
      )}
    </div>
  )
}

// ============================================================
// ---- Aba Agenda ----
// ============================================================
const PERIODOS = [{ label: 'Hoje', dias: 0 }, { label: '7 dias', dias: 7 }, { label: '14 dias', dias: 14 }, { label: 'Mês', dias: 30 }]

function AbaAgenda() {
  const [periodo, setPeriodo] = useState(1)
  const ag = useAgenda(false)

  useEffect(() => { ag.carregar(PERIODOS[periodo].dias) }, []) // eslint-disable-line

  const porDia = (ag.eventos || []).reduce((acc, ev) => {
    const dia = (ev.start || '').slice(0, 10); if (!acc[dia]) acc[dia] = []; acc[dia].push(ev); return acc
  }, {})
  const dias = Object.keys(porDia).sort()

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {PERIODOS.map((p, i) => (
          <button key={p.label} onClick={() => { setPeriodo(i); ag.carregar(p.dias) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={periodo === i ? { background: C.accent, color: '#fff' } : { background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Btn variant="accent" onClick={() => ag.setModal({ mode: 'new', ev: null })}><Plus className="w-3.5 h-3.5" /> Novo</Btn>
          <Btn onClick={() => ag.carregar(PERIODOS[periodo].dias)} disabled={ag.loading}><RefreshCw className={`w-3.5 h-3.5 ${ag.loading ? 'animate-spin' : ''}`} /></Btn>
        </div>
      </div>
      {ag.loading && ag.eventos === null && <Spinner />}
      {ag.erro && <Erro msg={ag.erro} onRetry={() => ag.carregar(PERIODOS[periodo].dias)} />}
      {!ag.loading && !ag.erro && ag.eventos !== null && dias.length === 0 && <Empty msg="Nenhum evento no período." />}
      {dias.map(dia => (
        <div key={dia} className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: C.accent2 }}>{fmtDate(dia)}</div>
          <div className="space-y-2">
            {porDia[dia].map((ev, i) => (
              <button key={ev.id || i} onClick={() => ag.setModal({ mode: 'edit', ev })} className="w-full text-left">
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
      {ag.modal && (
        <ModalEvento mode={ag.modal.mode} inicial={evToForm(ag.modal.ev)} saving={ag.saving}
          onSave={ag.salvar} onDelete={ag.modal.ev?.id ? () => ag.excluir(ag.modal.ev.id) : null}
          onClose={() => ag.setModal(null)} />
      )}
    </div>
  )
}

// ============================================================
// ---- Aba Tarefas ----
// ============================================================
function AbaTarefas() {
  const ta = useTarefas(true)
  const total = (ta.listas || []).reduce((s, l) => s + l.tasks.length, 0)
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        {ta.listas !== null && <span className="text-xs" style={{ color: C.muted }}>{total} pendente{total !== 1 ? 's' : ''}</span>}
        <Btn onClick={ta.carregar} disabled={ta.loading} className="ml-auto"><RefreshCw className={`w-3.5 h-3.5 ${ta.loading ? 'animate-spin' : ''}`} /> Atualizar</Btn>
      </div>
      {ta.loading && ta.listas === null && <Spinner />}
      {ta.erro && <Erro msg={ta.erro} onRetry={ta.carregar} />}
      {!ta.loading && !ta.erro && ta.listas !== null && total === 0 && <Empty msg="Nenhuma tarefa pendente." sub="Tudo em dia!" />}
      {(ta.listas || []).map(lista => (
        <div key={lista.listId} className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: C.accent2 }}>
            {lista.listName} <span className="normal-case font-normal" style={{ color: C.muted }}>({lista.tasks.length})</span>
          </div>
          <div className="space-y-2">
            {lista.tasks.map((t, i) => (
              <Card key={t.id || i}>
                <div className="flex items-start gap-3">
                  <button onClick={() => ta.concluir(lista.listId, t.id)} disabled={ta.completing.has(t.id)}
                    className="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition hover:border-green-400"
                    style={{ borderColor: ta.completing.has(t.id) ? '#22c55e' : C.muted }}>
                    {ta.completing.has(t.id) && <Check className="w-3 h-3" style={{ color: '#22c55e' }} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: C.text }}>{t.title}</p>
                    {t.due && <p className="text-xs mt-0.5" style={{ color: C.accent }}>Vence: {fmtDate(t.due)}</p>}
                    {t.notes && <p className="text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{t.notes}</p>}
                  </div>
                </div>
              </Card>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={ta.novas[lista.listId] || ''} onChange={e => ta.setNovas(s => ({ ...s, [lista.listId]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && ta.criar(lista.listId, ta.novas[lista.listId] || '')}
                placeholder="+ Nova tarefa... (Enter)"
                className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.text }} />
              <Btn variant="accent" onClick={() => ta.criar(lista.listId, ta.novas[lista.listId] || '')}><Plus className="w-3.5 h-3.5" /></Btn>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ---- Aba Pomodoro ----
// ============================================================
const POMO_MODES = { work: { label: 'Foco', mins: 25, color: C.accent }, short: { label: 'Pausa curta', mins: 5, color: '#16a34a' }, long: { label: 'Pausa longa', mins: 15, color: '#0891b2' } }

function TimerCircle({ seconds, total, color }) {
  const r = 70, cx = 80, c = 2 * Math.PI * r
  const pct = total > 0 ? seconds / total : 1
  return (
    <svg width="160" height="160" viewBox="0 0 160 160"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 80 80)"
        style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
    </svg>
  )
}

function AbaPomodoro() {
  const [mode, setMode] = useState('work')
  const [status, setStatus] = useState('idle') // idle | running | paused
  const [seconds, setSeconds] = useState(POMO_MODES.work.mins * 60)
  const [sessions, setSessions] = useState(0)
  const [taskModal, setTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const intervalRef = useRef(null)
  const ta = useTarefas(false)

  const cfg = POMO_MODES[mode]
  const total = cfg.mins * 60

  const changeMode = (m) => {
    clearInterval(intervalRef.current); setMode(m); setStatus('idle'); setSeconds(POMO_MODES[m].mins * 60)
  }

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current); setStatus('idle')
            if (mode === 'work') setSessions(n => n + 1)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(mode === 'work' ? '⏰ Hora da pausa!' : '🎯 Voltar ao foco!', { body: cfg.label + ' concluído.' })
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else clearInterval(intervalRef.current)
    return () => clearInterval(intervalRef.current)
  }, [status]) // eslint-disable-line

  function requestNotif() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }

  const allTasks = (ta.listas || []).flatMap(l => l.tasks.map(t => ({ ...t, listId: l.listId, listName: l.listName })))

  return (
    <div className="max-w-md mx-auto">
      {/* Seletor de modo */}
      <div className="flex gap-2 justify-center mb-8">
        {Object.entries(POMO_MODES).map(([k, v]) => (
          <button key={k} onClick={() => changeMode(k)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition"
            style={mode === k ? { background: v.color, color: '#fff' } : { background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Timer circular */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <TimerCircle seconds={seconds} total={total} color={cfg.color} />
          <div className="text-center z-10">
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '2.2rem', color: C.text, lineHeight: 1 }}>
              {pad2(Math.floor(seconds / 60))}:{pad2(seconds % 60)}
            </p>
            <p className="text-xs mt-1" style={{ color: C.muted }}>{cfg.label}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          {status === 'idle' && (
            <Btn variant="accent" onClick={() => { requestNotif(); setStatus('running') }}>
              <Play className="w-4 h-4" /> Iniciar
            </Btn>
          )}
          {status === 'running' && (
            <Btn variant="default" onClick={() => setStatus('paused')}>
              <Pause className="w-4 h-4" /> Pausar
            </Btn>
          )}
          {status === 'paused' && (
            <Btn variant="accent" onClick={() => setStatus('running')}>
              <Play className="w-4 h-4" /> Continuar
            </Btn>
          )}
          <Btn variant="ghost" onClick={() => { clearInterval(intervalRef.current); setStatus('idle'); setSeconds(total) }}>
            <RotateCcw className="w-4 h-4" />
          </Btn>
        </div>
        <p className="text-xs mt-4" style={{ color: C.muted }}>
          <span style={{ color: cfg.color }}>●</span> {sessions} sessão{sessions !== 1 ? 'ões' : ''} concluída{sessions !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tarefa atual */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: C.muted }}>Focando em</p>
            {selectedTask
              ? <p className="text-sm font-medium truncate" style={{ color: C.text }}>{selectedTask.title}</p>
              : <p className="text-sm" style={{ color: C.muted }}>Nenhuma tarefa selecionada</p>}
          </div>
          <Btn variant="default" onClick={() => { if (!ta.listas) ta.carregar(); setTaskModal(true) }}>
            <CheckSquare className="w-3.5 h-3.5" /> {selectedTask ? 'Trocar' : 'Escolher'}
          </Btn>
          {selectedTask && (
            <Btn variant="green" title="Concluir" onClick={async () => {
              await apiFetch('/tarefas.php', { method: 'PATCH', body: JSON.stringify({ listId: selectedTask.listId, taskId: selectedTask.id, status: 'completed' }) })
                .catch(e => alert(e.message))
              setSelectedTask(null)
            }}>
              <Check className="w-4 h-4" />
            </Btn>
          )}
        </div>
      </Card>

      {/* Modal seleção de tarefa */}
      {taskModal && (
        <ModalWrap title="Escolher tarefa para focar" onClose={() => setTaskModal(false)}>
          {ta.loading ? <Spinner /> : allTasks.length === 0
            ? <Empty msg="Nenhuma tarefa pendente." />
            : <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {allTasks.map(t => (
                <button key={t.id} onClick={() => { setSelectedTask(t); setTaskModal(false) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
                  <p className="text-sm" style={{ color: C.text }}>{t.title}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{t.listName}</p>
                </button>
              ))}
            </div>
          }
        </ModalWrap>
      )}
    </div>
  )
}

// ============================================================
// ---- Aba Matriz de Eisenhower ----
// ============================================================
const Q_CFG = {
  1: { label: 'Fazer agora', sub: 'Urgente + Importante',        color: '#ef4444', bg: 'rgba(239,68,68,0.07)' },
  2: { label: 'Agendar',    sub: 'Importante + Não urgente',     color: '#4f55f7', bg: 'rgba(79,85,247,0.07)' },
  3: { label: 'Delegar',    sub: 'Urgente + Não importante',     color: '#f59e0b', bg: 'rgba(245,158,11,0.07)' },
  4: { label: 'Eliminar',   sub: 'Não urgente + Não importante', color: '#64748b', bg: 'rgba(100,116,139,0.07)' },
}

function MatrizCard({ t, inQ, dragId, onDragStart, onDragEnd, onComplete, onRemove, onAssign }) {
  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(t.id) }}
      onDragEnd={onDragEnd}
      className="flex items-start gap-2 rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing select-none"
      style={{
        background: inQ ? 'rgba(0,0,0,0.35)' : C.card,
        border: `1px solid ${C.border}`,
        opacity: dragId === t.id ? 0.35 : 1,
        transition: 'opacity 0.15s',
      }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug" style={{ color: C.text }}>{t.title}</p>
        {!inQ && <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{t.listName}</p>}
      </div>
      <div className="flex gap-1 flex-shrink-0 items-center mt-0.5">
        {inQ
          ? <>
              <button onClick={() => onComplete(t)} title="Concluir tarefa" className="opacity-40 hover:opacity-100 transition">
                <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
              </button>
              <button onClick={() => onRemove(t.id)} title="Tirar do quadrante" className="opacity-30 hover:opacity-100 transition">
                <X className="w-3 h-3" style={{ color: C.muted }} />
              </button>
            </>
          : [1,2,3,4].map(q => (
              <button key={q} onClick={() => onAssign(t.id, q)}
                className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center hover:opacity-80 transition"
                style={{ background: Q_CFG[q].color, color: '#fff' }}
                title={Q_CFG[q].label}>{q}</button>
            ))
        }
      </div>
    </div>
  )
}

function AbaMatriz() {
  const ta = useTarefas(true)
  const [assign, setAssign] = useState(() => { try { return JSON.parse(localStorage.getItem(MATRIX_LS) || '{}') } catch { return {} } })
  const [dragId,  setDragId]  = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const save = n => { setAssign(n); localStorage.setItem(MATRIX_LS, JSON.stringify(n)) }
  const assignTask  = (taskId, q) => save({ ...assign, [taskId]: Number(q) })
  const removeAssign = taskId => { const n = { ...assign }; delete n[taskId]; save(n) }

  const allTasks = (ta.listas || []).flatMap(l => l.tasks.map(t => ({ ...t, listId: l.listId, listName: l.listName })))
  const unassigned = allTasks.filter(t => !assign[t.id])
  const byQ = q => allTasks.filter(t => assign[t.id] === q)

  async function complete(t) {
    removeAssign(t.id)
    await apiFetch('/tarefas.php', { method: 'PATCH', body: JSON.stringify({ listId: t.listId, taskId: t.id, status: 'completed' }) })
      .catch(e => alert(e.message))
    ta.carregar()
  }

  const cardProps = { dragId, onDragStart: setDragId, onDragEnd: () => setDragId(null), onComplete: complete, onRemove: removeAssign, onAssign: assignTask }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: C.muted }}>
          Arraste para os quadrantes · <span style={{ color: C.accent2 }}>{unassigned.length}</span> por classificar
        </p>
        <Btn onClick={ta.carregar} disabled={ta.loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${ta.loading ? 'animate-spin' : ''}`} /> Atualizar
        </Btn>
      </div>

      {ta.loading && ta.listas === null && <Spinner />}

      {/* Grid 2×2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[1, 2, 3, 4].map(q => {
          const cfg = Q_CFG[q]; const tasks = byQ(q); const isOver = dragOver === q
          return (
            <div key={q}
              onDragOver={e => { e.preventDefault(); setDragOver(q) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }}
              onDrop={e => { e.preventDefault(); setDragOver(null); if (dragId) { assignTask(dragId, q); setDragId(null) } }}
              className="rounded-2xl p-4 min-h-[160px] transition-all"
              style={{
                background: isOver ? cfg.color + '22' : cfg.bg,
                border: `2px solid ${isOver ? cfg.color : cfg.color + '35'}`,
              }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{cfg.sub}</p>
                </div>
                {tasks.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: cfg.color + '22', color: cfg.color }}>{tasks.length}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {tasks.map(t => <MatrizCard key={t.id} t={t} inQ {...cardProps} />)}
                {tasks.length === 0 && (
                  <div className="flex items-center justify-center rounded-xl border-2 border-dashed text-xs py-4"
                    style={{ borderColor: cfg.color + '30', color: isOver ? cfg.color : C.muted }}>
                    {isOver ? '↓ Soltar aqui' : 'Arraste tarefas'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pool de não classificadas */}
      {ta.listas !== null && unassigned.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.accent2 }}>
            Por classificar — arraste ou clique no número
          </p>
          <div className="space-y-1.5">
            {unassigned.map(t => <MatrizCard key={t.id} t={t} inQ={false} {...cardProps} />)}
          </div>
        </div>
      )}

      {ta.listas !== null && allTasks.length === 0 && (
        <Empty msg="Nenhuma tarefa pendente no Google Tasks." />
      )}
    </div>
  )
}

// ============================================================
// ---- Aba Notas (Brain → Notas Atômicas + tags/filtros) ----
// ============================================================
function Breadcrumb({ stack, onNavigate, rootLabel = '🧠 Brain' }) {
  return (
    <div className="flex items-center gap-1 flex-wrap text-xs mb-4" style={{ color: C.muted }}>
      <button onClick={() => onNavigate(-1)} className="hover:opacity-80"
        style={{ color: stack.length === 0 ? C.text : C.muted }}>{rootLabel}</button>
      {stack.map((f, i) => (
        <React.Fragment key={f.id}>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <button onClick={() => onNavigate(i)} className="hover:opacity-80 max-w-[140px] truncate"
            style={{ color: i === stack.length - 1 ? C.text : C.muted }}>{f.name}</button>
        </React.Fragment>
      ))}
    </div>
  )
}

function AbaNotas() {
  const [stack, setStack]         = useState([])
  const [items, setItems]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState(null)
  const [nota, setNota]           = useState(null)
  const [notaMeta, setNotaMeta]   = useState({})  // frontmatter parsed
  const [editMode, setEditMode]   = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving]       = useState(false)
  const [busca, setBusca]         = useState('')
  const [tagFiltro, setTagFiltro] = useState(null) // tag ativa como filtro

  const currentFolder = stack[stack.length - 1] ?? null

  const loadFolder = useCallback(async folderId => {
    setLoading(true); setErro(null); setNota(null); setEditMode(false); setTagFiltro(null)
    try { setItems(await apiFetch(`/drive.php?folder=${encodeURIComponent(folderId)}&type=notas`)) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  const notasRootRef = useRef(null) // pasta Notas Atômicas — raiz fixa da aba

  // Navega sempre para Notas Atômicas (raiz fixa)
  const goRoot = useCallback(async () => {
    if (!notasRootRef.current) return
    setStack([]); setNota(null); setEditMode(false); setTagFiltro(null)
    await loadFolder(notasRootRef.current.id)
  }, [loadFolder])

  // Localiza Brain → Notas Atômicas na montagem
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const brainFolders = await apiFetch('/drive.php?q=Brain&type=folder')
        if (!brainFolders.length) {
          setErro('Pasta "Brain" não encontrada no Google Drive.'); return
        }
        const brain = brainFolders[0]
        const brainItems = await apiFetch(`/drive.php?folder=${encodeURIComponent(brain.id)}&type=notas`)
        const notasFolder = brainItems.find(f => f.isFolder && /notas.at/i.test(f.name))
        if (!notasFolder) {
          setErro('Pasta "Notas Atômicas" não encontrada dentro de Brain.'); return
        }
        notasRootRef.current = notasFolder
        setItems(await apiFetch(`/drive.php?folder=${encodeURIComponent(notasFolder.id)}&type=notas`))
      } catch (e) { setErro(e.message) }
      finally { setLoading(false) }
    })()
  }, []) // eslint-disable-line

  function navigateTo(folder) { setStack(s => [...s, folder]); loadFolder(folder.id) }

  function navigateBreadcrumb(idx) {
    if (idx === -1) { goRoot(); return }
    const ns = stack.slice(0, idx + 1); setStack(ns); loadFolder(ns[ns.length - 1].id)
  }

  async function abrirNota(item) {
    setLoading(true); setEditMode(false)
    try {
      const n = await apiFetch(`/nota.php?id=${item.id}`)
      const { meta, body } = parseFrontmatter(n.content || '')
      setNota({ ...n, content: n.content }); setNotaMeta(meta); setEditContent(n.content || '')
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  async function salvarNota() {
    if (!nota) return; setSaving(true)
    try {
      await apiFetch(`/nota.php?id=${nota.id}`, { method: 'PUT', body: JSON.stringify({ content: editContent }) })
      const { meta } = parseFrontmatter(editContent)
      setNota(n => ({ ...n, content: editContent })); setNotaMeta(meta); setEditMode(false)
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSaving(false) }
  }

  async function buscarGlobal() {
    if (!busca.trim()) return
    setLoading(true); setErro(null); setNota(null); setTagFiltro(null)
    try { setItems(await apiFetch(`/drive.php?q=${encodeURIComponent(busca.trim())}&type=notas`)) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  // ---- Vista de nota aberta ----
  if (nota) {
    const tags = Array.isArray(notaMeta.tags) ? notaMeta.tags
      : (typeof notaMeta.tags === 'string' ? notaMeta.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Btn variant="ghost" onClick={() => { setNota(null); setEditMode(false) }}><ArrowLeft className="w-4 h-4" /> Voltar</Btn>
          <span className="text-sm font-medium truncate flex-1 min-w-0" style={{ color: C.text }}>{nota.name?.replace('.md','')}</span>
          {!editMode
            ? <Btn variant="default" onClick={() => setEditMode(true)}><Edit2 className="w-3.5 h-3.5" /> Editar</Btn>
            : <>
                <Btn variant="accent" disabled={saving} onClick={salvarNota}>
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                </Btn>
                <Btn variant="ghost" onClick={() => { setEditMode(false); setEditContent(nota.content || '') }}><X className="w-3.5 h-3.5" /></Btn>
              </>}
        </div>

        {/* Tags da nota */}
        {tags.length > 0 && !editMode && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: C.accent + '22', color: C.accent, border: `1px solid ${C.accent}33` }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Metadados do frontmatter */}
        {!editMode && Object.keys(notaMeta).filter(k => k !== 'tags').length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(notaMeta).filter(([k]) => k !== 'tags').map(([k, v]) => (
              <span key={k} className="text-[11px] px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', color: C.muted, border: `1px solid ${C.border}` }}>
                <span style={{ color: C.accent2 }}>{k}:</span> {String(v)}
              </span>
            ))}
          </div>
        )}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {editMode
            ? <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                className="w-full outline-none resize-none bg-transparent"
                style={{ fontFamily: "'DM Mono',monospace", color: C.text, minHeight: '65vh', padding: '1.25rem', fontSize: '0.8rem', lineHeight: 1.7 }} />
            : <div style={{ padding: '1.5rem 1.75rem', maxHeight: '72vh', overflowY: 'auto' }}>
                {renderMd(nota.content) || <span style={{ color: C.muted, fontSize: '0.875rem' }}>(nota vazia)</span>}
              </div>}
        </Card>
        {nota.modifiedTime && !editMode && (
          <p className="text-xs mt-2 text-right" style={{ color: C.muted }}>Modificado: {fmtDT(nota.modifiedTime)}</p>
        )}
      </div>
    )
  }

  // ---- Coletar todas as tags dos arquivos visíveis (via nome + tags já vistas) ----
  const allItems  = items || []
  const pastas    = allItems.filter(f => f.isFolder)
  const arquivos  = allItems.filter(f => !f.isFolder)

  // Filtro por nome + tag ativa
  const arquivosFiltrados = arquivos.filter(f => {
    if (busca && !f.name.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const rootLabel = notasRootRef.current ? `📚 ${notasRootRef.current.name}` : '📚 Notas Atômicas'

  return (
    <div>
      <Breadcrumb stack={stack} onNavigate={navigateBreadcrumb} rootLabel={rootLabel} />

      {/* Barra de busca */}
      <div className="flex items-center gap-2 mb-4">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscarGlobal()}
          placeholder="Buscar notas por nome..."
          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
        <Btn onClick={buscarGlobal} disabled={loading || !busca} variant="accent">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </Btn>
        {busca && (
          <Btn variant="ghost" onClick={() => { setBusca(''); stack.length ? loadFolder(currentFolder.id) : goRoot() }}>
            <X className="w-3.5 h-3.5" />
          </Btn>
        )}
        {!loading && (
          <Btn variant="default" onClick={() => stack.length ? loadFolder(currentFolder.id) : goRoot()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Btn>
        )}
      </div>

      {/* Pastas como filtro de categoria */}
      {pastas.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.muted }}>Categorias</p>
          <div className="flex flex-wrap gap-2">
            {pastas.map(f => (
              <button key={f.id} onClick={() => navigateTo(f)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition hover:opacity-80"
                style={{ background: C.card, border: `1px solid ${C.accent2}33`, color: C.accent2 }}>
                <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <Spinner />}
      {erro && <Erro msg={erro} onRetry={() => currentFolder ? loadFolder(currentFolder.id) : null} />}
      {!loading && !erro && items !== null && pastas.length === 0 && arquivos.length === 0 && <Empty msg="Pasta vazia." />}

      {/* Lista de notas */}
      {arquivosFiltrados.length > 0 && (
        <div>
          {pastas.length > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.muted }}>
              Notas ({arquivosFiltrados.length})
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {arquivosFiltrados.map(f => (
              <button key={f.id} onClick={() => abrirNota(f)}
                className="group text-left rounded-2xl p-4 transition hover:scale-[1.01]"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-base flex-shrink-0">📝</span>
                  <p className="text-sm font-medium truncate flex-1" style={{ color: C.text }}>{f.name.replace(/\.md$/i, '')}</p>
                </div>
                <p className="text-[11px]" style={{ color: C.muted }}>{f.modifiedTime ? fmtDT(f.modifiedTime) : '—'}</p>
                <p className="text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition" style={{ color: C.accent }}>Abrir →</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !erro && arquivos.length > 0 && arquivosFiltrados.length === 0 && busca && (
        <Empty msg={`Nenhuma nota com "${busca}".`} />
      )}
    </div>
  )
}

// ============================================================
// ---- FilePreviewModal ----
// ============================================================
function FilePreviewModal({ file, onClose }) {
  const [csvRows, setCsvRows]   = useState(null)
  const [docHtml, setDocHtml]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [loadErr, setLoadErr]   = useState(null)

  const mime        = file.mimeType || ''
  const isImage     = mime.startsWith('image/')
  const isPdf       = mime.includes('pdf')
  const isGDoc      = mime === 'application/vnd.google-apps.document'
  const isGSheet    = mime === 'application/vnd.google-apps.spreadsheet'
  const isGSlides   = mime === 'application/vnd.google-apps.presentation'
  const isOfficeDoc = mime.includes('word') || mime.includes('officedocument.wordprocessing')
  const isOfficeXls = mime.includes('excel') || mime.includes('officedocument.spreadsheetml')

  useEffect(() => {
    if (isGSheet || isOfficeXls) {
      setLoading(true)
      fetch(`${API}/drive_preview.php?id=${file.id}&type=sheet`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('Erro ao exportar'); return r.text() })
        .then(csv => setCsvRows(parseSimpleCSV(csv)))
        .catch(e => setLoadErr(e.message))
        .finally(() => setLoading(false))
    } else if (isGDoc || isOfficeDoc) {
      setLoading(true)
      fetch(`${API}/drive_preview.php?id=${file.id}&type=doc`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('Erro ao exportar'); return r.text() })
        .then(html => setDocHtml(html))
        .catch(e => setLoadErr(e.message))
        .finally(() => setLoading(false))
    }
  }, [file.id]) // eslint-disable-line

  function parseSimpleCSV(text) {
    return text.trim().split('\n').map(line => {
      const cols = []; let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') inQ = !inQ
        else if (ch === ',' && !inQ) { cols.push(cur); cur = '' }
        else cur += ch
      }
      cols.push(cur)
      return cols
    })
  }

  const previewImgSrc  = `${API}/drive_preview.php?id=${file.id}&type=image&mime=${encodeURIComponent(mime)}`
  const previewPdfSrc  = `${API}/drive_preview.php?id=${file.id}&type=pdf`

  const hasNativePreview = isImage || isPdf || isGDoc || isGSheet || isOfficeDoc || isOfficeXls

  return (
    <ModalWrap title={file.name} onClose={onClose} width="max-w-5xl">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xl">{mimeIcon(mime)}</span>
        {file.size && <span className="text-xs" style={{ color: C.muted }}>{fmtSize(file.size)}</span>}
        {file.modifiedTime && <span className="text-xs" style={{ color: C.muted }}>· {fmtDT(file.modifiedTime)}</span>}
        {file.webViewLink && (
          <a href={file.webViewLink} target="_blank" rel="noreferrer" className="ml-auto">
            <Btn variant="default"><ExternalLink className="w-3.5 h-3.5" /> Abrir no Google</Btn>
          </a>
        )}
      </div>

      {loading && <Spinner />}
      {loadErr && <Erro msg={loadErr} />}

      {/* Imagem */}
      {isImage && !loading && (
        <div className="flex justify-center rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', maxHeight: '72vh' }}>
          <img src={previewImgSrc} alt={file.name} loading="lazy"
            style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain' }} />
        </div>
      )}

      {/* PDF */}
      {isPdf && !loading && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, height: '72vh' }}>
          <iframe src={previewPdfSrc} style={{ width: '100%', height: '100%', border: 'none' }} title={file.name} />
        </div>
      )}

      {/* Google Doc / Office Doc → HTML */}
      {(isGDoc || isOfficeDoc) && !loading && docHtml && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, height: '68vh' }}>
          <iframe srcDoc={docHtml} sandbox="allow-popups allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title={file.name} />
        </div>
      )}

      {/* Google Sheet / Office Excel → CSV table */}
      {(isGSheet || isOfficeXls) && !loading && csvRows && (
        <div className="rounded-xl overflow-auto" style={{ border: `1px solid ${C.border}`, maxHeight: '68vh' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.73rem' }}>
            <thead>
              <tr>{(csvRows[0] || []).map((c, i) => (
                <th key={i} style={{ background: 'rgba(79,85,247,0.18)', color: C.text, padding: '6px 10px', border: `1px solid ${C.border}`, textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>
              ))}</tr>
            </thead>
            <tbody>
              {csvRows.slice(1).map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  {row.map((c, ci) => (
                    <td key={ci} style={{ color: C.text, padding: '5px 10px', border: `1px solid ${C.border}`, whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Google Slides */}
      {isGSlides && !loading && (
        <div className="text-center py-10">
          <p className="text-2xl mb-3">📑</p>
          <p className="text-sm mb-5" style={{ color: C.muted }}>Apresentações precisam ser abertas no Google Slides.</p>
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noreferrer">
              <Btn variant="accent"><ExternalLink className="w-4 h-4" /> Abrir no Google Slides</Btn>
            </a>
          )}
        </div>
      )}

      {/* Outros */}
      {!hasNativePreview && !isGSlides && !loading && (
        <div className="text-center py-10">
          <p className="text-3xl mb-3">{mimeIcon(mime)}</p>
          <p className="text-sm mb-5" style={{ color: C.muted }}>Prévia não disponível para este formato.</p>
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noreferrer">
              <Btn variant="accent"><ExternalLink className="w-4 h-4" /> Abrir no Google Drive</Btn>
            </a>
          )}
        </div>
      )}
    </ModalWrap>
  )
}

// ============================================================
// ---- Aba Drive ----
// ============================================================
function AbaDrive() {
  const [arquivos, setArquivos] = useState(null)
  const [stack,    setStack]    = useState([])
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState(null)
  const [busca,    setBusca]    = useState('')
  const [preview,  setPreview]  = useState(null)

  const currFolder = stack[stack.length - 1] ?? null

  const loadDir = useCallback(async (folderId = '') => {
    setLoading(true); setErro(null)
    try {
      const url = folderId ? `/drive.php?folder=${encodeURIComponent(folderId)}` : `/drive.php`
      setArquivos(await apiFetch(url))
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDir() }, []) // eslint-disable-line

  async function buscarGlobal() {
    if (!busca) return; setLoading(true); setErro(null); setStack([])
    try { setArquivos(await apiFetch(`/drive.php?q=${encodeURIComponent(busca)}`)) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  function enterFolder(f) { setStack(s => [...s, f]); setBusca(''); loadDir(f.id) }
  function navBreadcrumb(idx) {
    if (idx === -1) { setStack([]); loadDir() }
    else { const ns = stack.slice(0, idx + 1); setStack(ns); loadDir(ns[ns.length - 1].id) }
  }

  return (
    <div>
      <Breadcrumb stack={stack} onNavigate={navBreadcrumb} />
      <div className="flex items-center gap-2 mb-5">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscarGlobal()}
          placeholder="Buscar arquivos..."
          className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
        <Btn onClick={buscarGlobal} disabled={loading || !busca} variant="accent">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {busca ? 'Buscar' : 'Recentes'}
        </Btn>
        {busca && <Btn variant="ghost" onClick={() => { setBusca(''); setStack([]); loadDir() }}><X className="w-3.5 h-3.5" /></Btn>}
      </div>
      {loading && <Spinner />}
      {erro && <Erro msg={erro} onRetry={() => loadDir(currFolder?.id || '')} />}
      {!loading && !erro && arquivos !== null && arquivos.length === 0 && <Empty msg="Nenhum arquivo encontrado." />}
      {!loading && (arquivos || []).length > 0 && (
        <div className="space-y-1.5">
          {arquivos.map(f => f.isFolder
            ? (
              <button key={f.id} onClick={() => enterFolder(f)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 w-full text-left transition group"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <Folder className="w-5 h-5 flex-shrink-0" style={{ color: C.accent2 }} />
                <p className="text-sm font-medium group-hover:underline" style={{ color: C.text }}>{f.name}</p>
                <ChevronRight className="w-4 h-4 ml-auto opacity-40" style={{ color: C.muted }} />
              </button>
            ) : (
              <button key={f.id} onClick={() => setPreview(f)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 w-full text-left transition group"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                {f.thumbnailLink
                  ? <img src={f.thumbnailLink} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  : <span className="text-xl flex-shrink-0">{mimeIcon(f.mimeType)}</span>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:underline" style={{ color: C.text }}>{f.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                    {f.mimeType?.split('/').pop()?.split('.').pop()}{f.size ? ` · ${fmtSize(f.size)}` : ''}{f.modifiedTime ? ` · ${fmtDT(f.modifiedTime)}` : ''}
                  </p>
                </div>
                <Eye className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-60" style={{ color: C.accent }} />
              </button>
            )
          )}
        </div>
      )}
      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

// ============================================================
// ---- Aba E-mail ----
// ============================================================
function senderName(from = '') {
  const m = from.match(/^(.+?)\s*</)
  return m ? m[1].replace(/"/g, '').trim() : (from.split('@')[0] || '?')
}

function fmtGmailDate(dateStr = '') {
  try {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr.slice(0, 16)
    const today = new Date()
    if (d.toDateString() === today.toDateString())
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch { return '' }
}

function ModalComporEmail({ initialTo = '', initialSubject = '', threadId, onSend, onClose }) {
  const [to,      setTo]      = useState(initialTo)
  const [subject, setSubject] = useState(initialSubject)
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!to || !subject || !body) return
    setSending(true)
    try { await onSend(to, subject, body, threadId) }
    catch (e) { alert('Erro ao enviar: ' + e.message); setSending(false) }
  }

  return (
    <ModalWrap title={threadId ? 'Responder' : 'Novo e-mail'} onClose={onClose}>
      <Field label="Para"><FInput value={to} onChange={e => setTo(e.target.value)} placeholder="email@exemplo.com" autoFocus={!initialTo} /></Field>
      <Field label="Assunto"><FInput value={subject} onChange={e => setSubject(e.target.value)} /></Field>
      <Field label="Mensagem">
        <FTA value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Escreva sua mensagem..." />
      </Field>
      <div className="flex gap-2 mt-4">
        <Btn variant="accent" disabled={sending || !to || !subject || !body} onClick={handleSend}>
          {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {sending ? 'Enviando...' : 'Enviar'}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </ModalWrap>
  )
}

function AbaEmail() {
  const [caixa,     setCaixa]     = useState('inbox')
  const [msgs,      setMsgs]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState(null)
  const [lendo,     setLendo]     = useState(null)
  const [composing, setComposing] = useState(null) // null | 'new' | { replyTo: msg }
  const [busca,     setBusca]     = useState('')

  const carregar = useCallback(async (q = '') => {
    setLoading(true); setErro(null)
    try {
      const url = q ? `/gmail.php?action=${caixa}&q=${encodeURIComponent(q)}`
                    : `/gmail.php?action=${caixa}`
      setMsgs(await apiFetch(url))
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [caixa])

  useEffect(() => { carregar() }, [caixa]) // eslint-disable-line

  async function lerMensagem(id) {
    setLoading(true); setErro(null)
    try {
      const m = await apiFetch(`/gmail.php?action=read&id=${id}`)
      setLendo(m)
      // Mark as read in local list
      setMsgs(prev => prev?.map(msg => msg.id === id ? { ...msg, unread: false } : msg))
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  async function arquivar(id) {
    try {
      await apiFetch('/gmail.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'archive' }) })
      setMsgs(m => m?.filter(msg => msg.id !== id))
      if (lendo?.id === id) setLendo(null)
    } catch (e) { alert(e.message) }
  }

  async function enviar(to, subject, body, threadId) {
    await apiFetch('/gmail.php', { method: 'POST', body: JSON.stringify({ to, subject, body, threadId }) })
    setComposing(null)
    if (caixa === 'sent') carregar()
  }

  // ---- Leitura de mensagem ----
  if (lendo) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Btn variant="ghost" onClick={() => setLendo(null)}><ArrowLeft className="w-4 h-4" /> Voltar</Btn>
          <span className="flex-1" />
          <Btn variant="default" onClick={() => setComposing({ replyTo: lendo })}>
            <Send className="w-3.5 h-3.5" /> Responder
          </Btn>
          {caixa === 'inbox' && (
            <Btn variant="ghost" onClick={() => arquivar(lendo.id)}>
              <Archive className="w-3.5 h-3.5" /> Arquivar
            </Btn>
          )}
        </div>

        <Card className="mb-4">
          <p className="font-semibold text-sm mb-3" style={{ color: C.text }}>{lendo.subject || '(sem assunto)'}</p>
          <div className="space-y-1 text-xs">
            <p style={{ color: C.muted }}><span style={{ color: C.accent2 }}>De:</span> {lendo.from}</p>
            <p style={{ color: C.muted }}><span style={{ color: C.accent2 }}>Para:</span> {lendo.to}</p>
            <p style={{ color: C.muted }}><span style={{ color: C.accent2 }}>Data:</span> {lendo.date}</p>
          </div>
        </Card>

        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: '#fff', minHeight: 240 }}>
          <iframe
            srcDoc={lendo.body || '<p style="font-family:sans-serif;color:#444;padding:16px">(mensagem vazia)</p>'}
            sandbox="allow-popups"
            style={{ width: '100%', minHeight: 300, border: 'none' }}
            title="email"
            onLoad={e => {
              try {
                const h = e.target.contentDocument?.body?.scrollHeight
                if (h) e.target.style.height = (h + 32) + 'px'
              } catch {}
            }}
          />
        </div>

        {composing && (
          <ModalComporEmail
            initialTo={lendo.from}
            initialSubject={`Re: ${lendo.subject || ''}`}
            threadId={lendo.threadId}
            onSend={enviar}
            onClose={() => setComposing(null)}
          />
        )}
      </div>
    )
  }

  // ---- Lista de mensagens ----
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {['inbox', 'sent'].map(k => (
          <button key={k} onClick={() => { setCaixa(k); setMsgs(null) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={caixa === k
              ? { background: C.accent, color: '#fff' }
              : { background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
            {k === 'inbox' ? '📥 Entrada' : '📤 Enviados'}
          </button>
        ))}
        <div className="flex-1 min-w-[140px] flex items-center gap-1.5">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar(busca)}
            placeholder="Buscar e-mails..."
            className="w-full rounded-xl px-3 py-1.5 text-xs outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
          {busca && (
            <button onClick={() => { setBusca(''); carregar() }} className="flex-shrink-0 p-1 hover:opacity-70">
              <X className="w-3.5 h-3.5" style={{ color: C.muted }} />
            </button>
          )}
        </div>
        <Btn variant="accent" onClick={() => setComposing('new')}><Send className="w-3.5 h-3.5" /> Novo</Btn>
        <Btn onClick={() => carregar(busca)} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Btn>
      </div>

      {loading && msgs === null && <Spinner />}
      {erro && <Erro msg={erro} onRetry={() => carregar()} />}
      {!loading && !erro && msgs !== null && msgs.length === 0 && <Empty msg="Nenhuma mensagem." />}

      <div className="space-y-1.5">
        {(msgs || []).map(msg => (
          <button key={msg.id} onClick={() => lerMensagem(msg.id)} className="w-full text-left">
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 transition hover:opacity-80"
              style={{ background: C.card, border: `1px solid ${msg.unread ? C.accent + '66' : C.border}` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{ background: C.accent + '22', color: C.accent }}>
                {(senderName(caixa === 'sent' ? msg.to : msg.from)[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm truncate" style={{ color: C.text, fontWeight: msg.unread ? 600 : 400 }}>
                    {senderName(caixa === 'sent' ? msg.to : msg.from)}
                  </p>
                  <p className="text-[10px] flex-shrink-0" style={{ color: C.muted }}>{fmtGmailDate(msg.date)}</p>
                </div>
                <p className="text-xs truncate" style={{ color: msg.unread ? C.text : C.muted, fontWeight: msg.unread ? 500 : 400 }}>
                  {msg.subject || '(sem assunto)'}
                </p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: C.muted }}>{msg.snippet}</p>
              </div>
              {msg.unread && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: C.accent }} />}
            </div>
          </button>
        ))}
      </div>

      {composing === 'new' && (
        <ModalComporEmail initialTo="" initialSubject="" onSend={enviar} onClose={() => setComposing(null)} />
      )}
    </div>
  )
}

// ============================================================
// ---- App principal ----
// ============================================================
const TABS = [
  { id: 'inicio',   label: 'Início',  Icon: Home },
  { id: 'agenda',   label: 'Agenda',  Icon: Calendar },
  { id: 'tarefas',  label: 'Tarefas', Icon: CheckSquare },
  { id: 'pomodoro', label: 'Foco',    Icon: Timer },
  { id: 'matriz',   label: 'Matriz',  Icon: LayoutGrid },
  { id: 'notas',    label: 'Notas',   Icon: FileText },
  { id: 'drive',    label: 'Drive',   Icon: HardDrive },
  { id: 'email',    label: 'E-mail',  Icon: Mail },
]

export default function CerebroApp({ usuario, onVoltarHub, onLogout }) {
  const [aba, setAba] = useState('inicio')
  const [clock, setClock] = useState('')
  const [googleStatus, setGoogleStatus] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const t = document.title; document.title = 'Cérebro'
    return () => { document.head.removeChild(link); document.title = t }
  }, [])

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [])

  useEffect(() => { checkAuth() }, [])

  useEffect(() => {
    const fn = e => {
      if (e.data === 'google_auth_success') { setConnecting(false); checkAuth(); showToast('Google conectado!') }
      else if (typeof e.data === 'string' && e.data.startsWith('google_auth_error:')) { setConnecting(false); showToast(`Falha: ${e.data.split(':')[1]}`, 'erro') }
    }
    window.addEventListener('message', fn); return () => window.removeEventListener('message', fn)
  }, [])

  async function checkAuth() {
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
      const iv = setInterval(() => { if (popup?.closed) { clearInterval(iv); setConnecting(false); checkAuth() } }, 500)
    } catch (e) { showToast(`Erro: ${e.message}`, 'erro') }
  }

  async function disconnectGoogle() {
    if (!confirm('Desconectar o Google?')) return
    try { await apiFetch('/auth/status.php', { method: 'DELETE' }); setGoogleStatus({ connected: false }); showToast('Google desconectado.') }
    catch (e) { showToast(`Erro: ${e.message}`, 'erro') }
  }

  function showToast(msg, tipo = 'ok') { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500) }
  const conectado = googleStatus?.connected === true

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
      <header className="sticky top-0 z-10 backdrop-blur-md" style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(4,4,14,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onVoltarHub} className="p-2 rounded-lg transition hover:bg-white/5" style={{ color: C.muted }}><ArrowLeft className="w-5 h-5" /></button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})` }}>
              <Brain className="w-5 h-5 text-white" />
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
                style={{ background: conectado ? 'rgba(79,85,247,0.12)' : 'rgba(239,68,68,0.08)', color: conectado ? C.accent : '#ef4444', border: `1px solid ${conectado ? C.border : 'rgba(239,68,68,0.2)'}` }}>
                {conectado ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {conectado ? 'Google' : 'Desconectado'}
              </button>
            )}
            <button onClick={onLogout} className="text-sm px-3 py-1.5 rounded hover:bg-white/5 transition flex items-center gap-1.5" style={{ color: C.muted }}>
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setAba(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap min-h-[40px]"
              style={aba === id ? { borderColor: C.accent, color: C.accent } : { borderColor: 'transparent', color: C.muted }}>
              <Icon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium"
          style={{ background: toast.tipo === 'erro' ? '#ef4444' : C.accent, color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-7">
        {checkingAuth ? <Spinner />
          : !conectado ? <TelaConectar onConnect={connectGoogle} connecting={connecting} />
          : <>
            {aba === 'inicio'   && <AbaInicio />}
            {aba === 'agenda'   && <AbaAgenda />}
            {aba === 'tarefas'  && <AbaTarefas />}
            {aba === 'pomodoro' && <AbaPomodoro />}
            {aba === 'matriz'   && <AbaMatriz />}
            {aba === 'notas'    && <AbaNotas />}
            {aba === 'drive'    && <AbaDrive />}
            {aba === 'email'    && <AbaEmail />}
          </>}
      </main>
    </div>
  )
}
