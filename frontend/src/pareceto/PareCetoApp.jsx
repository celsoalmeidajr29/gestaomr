import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, LogOut, Upload, Users, BarChart3, AlertTriangle, Clock, Plus, Edit2, Trash2, Download, FileText, RefreshCw, X, Check, Search, Settings, Bell, Shield, Target, ChevronDown, ChevronUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const API = '/api/pareceto'

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || `HTTP ${r.status}`)
  }
  const payload = await r.json()
  return payload?.data ?? payload
}

// ---- UTILS ----
function num(v) {
  if (typeof v === 'number') return v
  return parseFloat(String(v || 0).replace(',', '.')) || 0
}
function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function fmtNum(v, dec = 1) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v || 0)
}
function fmtDate(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt)) return ''
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}
function fmtTime(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt)) return ''
  return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}
function parseDateTime(str) {
  if (!str) return null
  const m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/)
  if (m1) return new Date(+m1[3], +m1[2]-1, +m1[1], +m1[4], +m1[5])
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/)
  if (m2) return new Date(+m2[1], +m2[2]-1, +m2[3], +m2[4], +m2[5])
  const m3 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m3) return new Date(+m3[3], +m3[2]-1, +m3[1])
  return null
}
function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
function padR(s, n) { return String(s || '').slice(0, n).padEnd(n) }
function padL(s, n) { return String(s || '').slice(0, n).padStart(n) }

// ---- CSV ----
async function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const buf = new Uint8Array(e.target.result)
      // Sample first 4KB for encoding detection — avoids decoding the whole file twice
      const sample = buf.length > 4096 ? buf.slice(0, 4096) : buf
      const enc = /Ã©|Ã£|Ã§|Ã­|Ã´|Ã¡|Ãª/.test(new TextDecoder('utf-8').decode(sample))
        ? 'windows-1252' : 'utf-8'
      resolve(new TextDecoder(enc).decode(buf))
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function detectDelimiter(line) {
  const t = (line.match(/\t/g) || []).length
  const s = (line.match(/;/g) || []).length
  const c = (line.match(/,/g) || []).length
  if (t >= s && t >= c) return '\t'
  if (s >= c) return ';'
  return ','
}

// Async + chunked — suporta 100k+ linhas sem travar o browser.
// Trata \r\n (Windows), \r (Mac antigo) e \n (Unix).
async function parseCSVText(text, forcedDelim, onProgress) {
  const lines = text.split(/\r\n|\r|\n/)
  const filtered = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) filtered.push(lines[i])
  }
  if (!filtered.length) return { headers: [], rows: [], delim: ',' }
  const delim = forcedDelim || detectDelimiter(filtered[0])
  const headers = filtered[0].split(delim).map(h => h.replace(/^"|"$/g, '').trim())
  const rows = []
  const CHUNK = 8000
  for (let i = 1; i < filtered.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, filtered.length)
    for (let j = i; j < end; j++) {
      const vals = filtered[j].split(delim).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
      const obj = {}
      headers.forEach((h, k) => { obj[h] = vals[k] ?? '' })
      rows.push(obj)
    }
    onProgress && onProgress(i / filtered.length, rows.length)
    await new Promise(r => setTimeout(r, 0))
  }
  return { headers, rows, delim }
}

// ---- VENDAS HELPERS ----
function extractPlaca(raw) {
  if (!raw) return ''
  const m = raw.match(/([A-Z]{3}\d[A-Z]\d{2})/i) || raw.match(/([A-Z]{3}\d{4})/i)
  return m ? m[1].toUpperCase() : raw.split(/[\s(]/)[0].toUpperCase().trim()
}
function classifyCanal(origem) {
  return /\(Motorista\)/i.test(origem) ? 'App Mobile' : 'Campo'
}
function classifyZona(trecho) {
  const mSP = trecho.match(/\(SP(\d+)\)/i)
  if (mSP) return `SP${mSP[1]}`
  if (/\(AUT\)/i.test(trecho)) return 'AUT'
  return 'Outro'
}
function classifyTipo(valor) {
  const v = num(valor)
  if (v <= 3) return 'Período simples'
  if (v <= 6) return 'Dobra de período'
  if (v <= 8) return 'Período único'
  if (v <= 16) return 'Múltiplos períodos'
  return 'ALERTA (>R$16)'
}
function isIrregular(f) {
  const v = (f || '').trim()
  return v !== '' && v !== 'Nenhuma' && v !== '—' && v !== '-'
}

// Gera hash simples para dedup: concatena dtReg|placa|valor (mesmo criterio do backend SHA1)
function hashTransacao(dtReg, placa, valor) {
  const src = (dtReg ? dtReg.toISOString().slice(0, 19).replace('T', ' ') : '') + '|' + placa + '|' + String(Math.round(valor * 100) / 100)
  // djb2 — colisao improvavel para este volume; backend usa SHA1 como autoridade final
  let h = 5381
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h) ^ src.charCodeAt(i)
  return (h >>> 0).toString(16).padStart(8, '0') + '_' + src.length
}

// Guarda TODAS as transacoes (sem dedup por placa).
// Unicidade real e garantida pelo hash_dedup no banco (dt_registro|placa|valor).
function parseVendas(rows, funcs) {
  const funcMap = {}
  funcs.forEach(f => { funcMap[normalizar(f.login)] = f })
  const premissas = []
  const records = []
  const seenHashes = new Set()

  rows.forEach(r => {
    const placa = extractPlaca(r['Placa'] || r['placa'] || '')
    if (!placa) return
    const dtReg = parseDateTime(r['Hora registro'] || r['hora_registro'] || '')
    const valor = num(r['Valor pago'] || r['Valor'] || r['valor'] || 0)
    // Dedup local: ignora linhas identicas dentro do mesmo arquivo
    const hk = hashTransacao(dtReg, placa, valor)
    if (seenHashes.has(hk)) return
    seenHashes.add(hk)
    const origem = r['Origem'] || r['origem'] || ''
    const trecho = r['Trecho'] || r['trecho'] || ''
    const usuario = r['Usuario'] || r['Usuário'] || r['usuario'] || ''
    const fn = normalizar(usuario)
    const func = funcMap[fn]
    records.push({
      placa, dtReg, hashDedup: hk,
      dtInicial: parseDateTime(r['Hora inicial'] || ''),
      periodo: r['Periodo'] || r['periodo'] || '',
      usuario, cargo: func ? func.cargo : 'Não cadastrado',
      naoEncontrado: !func && usuario !== '',
      origem, trecho,
      formaPagamento: r['Forma de pagamento'] || '',
      valor,
      irregular: isIrregular(r['Irregularidade'] || r['irregularidade'] || ''),
      canal: classifyCanal(origem),
      zona: classifyZona(trecho),
      tipo: classifyTipo(valor),
    })
  })

  const naoEnc = [...new Set(records.filter(r => r.naoEncontrado).map(r => r.usuario))].length
  if (naoEnc > 0) premissas.push(`${naoEnc} login(s) não encontrado(s) no cadastro`)
  return { records, premissas }
}

function analyzeVendas(records) {
  if (!records.length) return null
  const totalTrans = records.length
  const totalValor = records.reduce((s, r) => s + r.valor, 0)
  const porCanal = {}, porZona = {}, porTipo = {}, porAgente = {}

  records.forEach(r => {
    const inc = (obj, k, val) => { obj[k] = obj[k] || { count: 0, valor: 0 }; obj[k].count++; obj[k].valor += val }
    inc(porCanal, r.canal, r.valor)
    inc(porZona, r.zona, r.valor)
    inc(porTipo, r.tipo, r.valor)
    if (r.usuario) {
      if (!porAgente[r.usuario]) porAgente[r.usuario] = { cargo: r.cargo, count: 0, valor: 0, datas: {} }
      porAgente[r.usuario].count++; porAgente[r.usuario].valor += r.valor
      if (r.dtReg) {
        const dk = r.dtReg.toISOString().slice(0, 10)
        porAgente[r.usuario].datas[dk] = porAgente[r.usuario].datas[dk] || []
        porAgente[r.usuario].datas[dk].push(r.dtReg)
      }
    }
  })

  const rankingAgentes = Object.entries(porAgente).map(([nome, d]) => {
    let hrs = 0
    Object.values(d.datas).forEach(ts => {
      const s = ts.sort((a, b) => a - b)
      const h = (s[s.length-1] - s[0]) / 3600000
      if (h > 0) hrs += h
    })
    return { nome, cargo: d.cargo, count: d.count, valor: d.valor,
      rPorHora: hrs > 0 ? d.valor / hrs : 0, transPorHora: hrs > 0 ? d.count / hrs : 0,
      diasTrabalhados: Object.keys(d.datas).length }
  }).sort((a, b) => b.count - a.count)

  const porTrechoMap = {}
  records.forEach(r => {
    if (!r.trecho) return
    porTrechoMap[r.trecho] = porTrechoMap[r.trecho] || { count: 0, valor: 0 }
    porTrechoMap[r.trecho].count++; porTrechoMap[r.trecho].valor += r.valor
  })
  const rankingTrechos = Object.entries(porTrechoMap).map(([trecho, d]) => ({ trecho, ...d })).sort((a, b) => b.count - a.count)

  // ---- Fase 3: agrupamentos temporais e adicionais ----
  // Série diária
  const porDataMap = {}
  records.forEach(r => {
    if (!r.dtReg) return
    const dk = r.dtReg.toISOString().slice(0, 10)
    if (!porDataMap[dk]) porDataMap[dk] = { date: dk, label: dk.slice(8)+'/'+dk.slice(5,7), count: 0, valor: 0 }
    porDataMap[dk].count++; porDataMap[dk].valor += r.valor
  })
  const serieDiaria = Object.values(porDataMap).sort((a, b) => a.date.localeCompare(b.date))

  // Por hora do dia (0–23)
  const porHora = Array.from({ length: 24 }, (_, h) => ({ hora: h, label: `${String(h).padStart(2,'0')}h`, count: 0, valor: 0 }))
  records.forEach(r => {
    if (!r.dtReg) return
    const h = r.dtReg.getHours()
    porHora[h].count++; porHora[h].valor += r.valor
  })

  // Por faixa de hora
  const porFaixa = [
    { faixa: 'Manhã', label: '06–12h', count: 0, valor: 0 },
    { faixa: 'Tarde', label: '12–18h', count: 0, valor: 0 },
    { faixa: 'Noite', label: '18–24h', count: 0, valor: 0 },
    { faixa: 'Madrugada', label: '00–06h', count: 0, valor: 0 },
  ]
  porHora.forEach(({ hora, count, valor }) => {
    const idx = hora < 6 ? 3 : hora < 12 ? 0 : hora < 18 ? 1 : 2
    porFaixa[idx].count += count; porFaixa[idx].valor += valor
  })

  // Por dia da semana
  const _DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const _dswRaw = Array.from({ length: 7 }, (_, i) => ({ dia: i, label: _DIAS[i], count: 0, valor: 0, _dates: new Set() }))
  records.forEach(r => {
    if (!r.dtReg) return
    const d = r.dtReg.getDay()
    _dswRaw[d].count++; _dswRaw[d].valor += r.valor; _dswRaw[d]._dates.add(r.dtReg.toISOString().slice(0,10))
  })
  const porDiaSemana = _dswRaw.map(({ _dates, ...d }) => ({
    ...d,
    diasDistintos: _dates.size,
    mediaCount: _dates.size > 0 ? Math.round(d.count / _dates.size * 10) / 10 : 0,
    mediaValor:  _dates.size > 0 ? d.valor / _dates.size : 0,
  }))

  // Por mês
  const porMesMap = {}
  records.forEach(r => {
    if (!r.dtReg) return
    const mk = r.dtReg.toISOString().slice(0, 7)
    if (!porMesMap[mk]) porMesMap[mk] = { mes: mk, label: mk.slice(5)+'/'+mk.slice(2,4), count: 0, valor: 0 }
    porMesMap[mk].count++; porMesMap[mk].valor += r.valor
  })
  const porMes = Object.values(porMesMap).sort((a, b) => a.mes.localeCompare(b.mes))

  // Por forma de pagamento
  const porFormaPagMap = {}
  records.forEach(r => {
    const fp = (r.formaPagamento || 'Não informado').trim() || 'Não informado'
    if (!porFormaPagMap[fp]) porFormaPagMap[fp] = { name: fp, count: 0, valor: 0 }
    porFormaPagMap[fp].count++; porFormaPagMap[fp].valor += r.valor
  })
  const porFormaPag = Object.values(porFormaPagMap).sort((a, b) => b.count - a.count)

  const diasOperados = serieDiaria.length
  const receitaPorDia = diasOperados > 0 ? totalValor / diasOperados : 0
  const transPorDiaMedia = diasOperados > 0 ? totalTrans / diasOperados : 0

  const datas = records.filter(r => r.dtReg).map(r => r.dtReg)
  return {
    totalTrans, totalValor, ticketMedio: totalValor / totalTrans,
    porCanal, porZona, porTipo, rankingAgentes, rankingTrechos,
    comIrreg: records.filter(r => r.irregular).length,
    dataMin: datas.length ? new Date(Math.min(...datas)) : null,
    dataMax: datas.length ? new Date(Math.max(...datas)) : null,
    // Fase 3
    serieDiaria, porHora, porFaixa, porDiaSemana, porMes, porFormaPag,
    diasOperados, receitaPorDia, transPorDiaMedia,
  }
}

function analyzeJornada(records) {
  const byAgenteDia = {}
  records.forEach(r => {
    if (!r.usuario || !r.dtReg) return
    const k = `${r.usuario}|${r.dtReg.toISOString().slice(0,10)}`
    byAgenteDia[k] = byAgenteDia[k] || { usuario: r.usuario, cargo: r.cargo, dia: r.dtReg.toISOString().slice(0,10), ts: [] }
    byAgenteDia[k].ts.push(r.dtReg)
  })
  return Object.values(byAgenteDia).map(d => {
    const s = d.ts.sort((a, b) => a - b)
    const pausas = []
    for (let i = 1; i < s.length; i++) {
      const g = (s[i] - s[i-1]) / 60000
      if (g > 15) pausas.push({ minutos: Math.round(g) })
    }
    return { usuario: d.usuario, cargo: d.cargo, dia: d.dia,
      inicio: s[0], fim: s[s.length-1],
      duracaoMin: Math.round((s[s.length-1] - s[0]) / 60000),
      totalTrans: s.length, pausas,
      pausasCriticas: pausas.filter(p => p.minutos > 60) }
  }).sort((a, b) => a.dia.localeCompare(b.dia) || a.usuario.localeCompare(b.usuario))
}

// ---- IRREGULARIDADES HELPERS ----
function extractPlacaVeiculo(raw) {
  if (!raw) return ''
  const m = raw.match(/([A-Z]{3}\d[A-Z]\d{2})/i) || raw.match(/([A-Z]{3}\d{4})/i)
  return m ? m[1].toUpperCase() : raw.trim()
}
function classifyOrigemIrreg(o) {
  const n = normalizar(o)
  if (/motorista|^app|aplicativ/.test(n)) return 'Aplicativo'
  if (/diret|vend|campo|operacional/.test(n)) return 'Venda direta'
  return 'Outro'
}
function isoWeekLabel(dt) {
  if (!dt || isNaN(dt)) return 'Sem data'
  const d = new Date(dt); d.setHours(12, 0, 0, 0)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startW = new Date(jan4); startW.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1))
  const weekNum = Math.floor((d - startW) / 604800000) + 1
  const dow = d.getDay() || 7
  const ws = new Date(d); ws.setDate(d.getDate() - dow + 1)
  const we = new Date(ws); we.setDate(ws.getDate() + 6)
  return `${d.getFullYear()}-S${String(weekNum).padStart(2,'0')} (${fmtDate(ws)}–${fmtDate(we)})`
}

function parseIrregularidades(rows, funcs) {
  const funcMap = {}
  funcs.forEach(f => { funcMap[normalizar(f.login)] = f })
  const premissas = []
  const byId = {}

  rows.forEach(r => {
    const status = r['Tipo da notificação'] || r['Situação'] || r['situacao'] || r['situação'] || ''
    if (normalizar(status) === 'regular') return
    const id = r['Identificador'] || r['identificador'] || ''
    byId[id] = r
  })

  const records = Object.values(byId).map(r => {
    const rawStatus = r['Tipo da notificação'] || r['Situação'] || ''
    const sn = normalizar(rawStatus)
    const status = sn.includes('pag') ? 'Paga' : sn.includes('irregular') ? 'Irregular' : rawStatus
    const dtEmissao = parseDateTime(r['Hora de notificação'] || r['hora_de_notificacao'] || '')
    const emissor = r['Usuário'] || r['usuario'] || ''
    const trecho = r['Trecho'] || r['trecho'] || ''
    const placa = extractPlacaVeiculo(r['Veículo'] || r['veiculo'] || '')
    const valor = num(r['Preço'] || r['Preco'] || r['preco'] || 0)
    const func = funcMap[normalizar(emissor)]
    return {
      id: r['Identificador'] || '',
      dtEmissao, status,
      emissor, cargo: func ? func.cargo : 'Não cadastrado',
      naoEncontrado: !func && emissor !== '',
      trecho, placa, valor,
      origemClass: classifyOrigemIrreg(r['Origem'] || ''),
      semana: isoWeekLabel(dtEmissao),
    }
  }).filter(r => r.status === 'Irregular' || r.status === 'Paga')

  const naoEnc = [...new Set(records.filter(r => r.naoEncontrado).map(r => r.emissor))].length
  if (naoEnc > 0) premissas.push(`${naoEnc} login(s) de emissor não encontrado(s) no cadastro`)
  return { records, premissas }
}

function analyzeIrregularidades(records) {
  if (!records.length) return null
  const total = records.length
  const totalPaga = records.filter(r => r.status === 'Paga').length
  const totalIrregular = records.filter(r => r.status === 'Irregular').length
  const valorTotal = records.reduce((s, r) => s + r.valor, 0)
  const valorPago = records.filter(r => r.status === 'Paga').reduce((s, r) => s + r.valor, 0)
  const pctConversao = total > 0 ? (totalPaga / total) * 100 : 0

  const porDia = {}, porEmissor = {}, porCargo = {}, porTrecho = {}, porSemana = {}, porPlaca = {}, porOrigem = {}
  records.forEach(r => {
    if (r.dtEmissao) porDia[r.dtEmissao.toISOString().slice(0,10)] = (porDia[r.dtEmissao.toISOString().slice(0,10)] || 0) + 1

    const addE = (obj, k, init) => { if (!obj[k]) obj[k] = init; return obj[k] }
    const em = addE(porEmissor, r.emissor, { nome: r.emissor, cargo: r.cargo, total: 0, paga: 0, valor: 0 })
    em.total++; if (r.status === 'Paga') em.paga++; em.valor += r.valor

    const cg = addE(porCargo, r.cargo, { cargo: r.cargo, total: 0, paga: 0, valor: 0 })
    cg.total++; if (r.status === 'Paga') cg.paga++; cg.valor += r.valor

    if (r.trecho) {
      const tr = addE(porTrecho, r.trecho, { trecho: r.trecho, total: 0, paga: 0, valor: 0 })
      tr.total++; if (r.status === 'Paga') tr.paga++; tr.valor += r.valor
    }

    const sem = addE(porSemana, r.semana, { label: r.semana, total: 0, irregular: 0, paga: 0, valor: 0, valorPago: 0, aplicativo: 0, vendaDireta: 0 })
    sem.total++; if (r.status === 'Irregular') sem.irregular++; if (r.status === 'Paga') { sem.paga++; sem.valorPago += r.valor }
    sem.valor += r.valor
    if (r.origemClass === 'Aplicativo') sem.aplicativo++; else if (r.origemClass === 'Venda direta') sem.vendaDireta++

    if (r.placa) {
      const pl = addE(porPlaca, r.placa, { placa: r.placa, total: 0, irregular: 0, paga: 0, valor: 0, trechos: new Set(), emissores: new Set(), datas: [] })
      pl.total++; if (r.status === 'Irregular') pl.irregular++; if (r.status === 'Paga') pl.paga++
      pl.valor += r.valor; if (r.trecho) pl.trechos.add(r.trecho); if (r.emissor) pl.emissores.add(r.emissor)
      if (r.dtEmissao) pl.datas.push(r.dtEmissao)
    }

    const og = addE(porOrigem, r.origemClass, { origem: r.origemClass, total: 0, paga: 0, valor: 0 })
    og.total++; if (r.status === 'Paga') og.paga++; og.valor += r.valor
  })

  const top20Placas = Object.values(porPlaca).map(p => ({
    ...p, trechosDist: p.trechos.size, emissoresDist: p.emissores.size,
    primeira: p.datas.length ? new Date(Math.min(...p.datas)) : null,
    ultima: p.datas.length ? new Date(Math.max(...p.datas)) : null,
  })).sort((a, b) => b.total - a.total).slice(0, 20)

  const datas = records.filter(r => r.dtEmissao).map(r => r.dtEmissao)
  const dias = Object.keys(porDia).length
  return {
    total, totalPaga, totalIrregular, valorTotal, valorPago, pctConversao,
    mediaDiaria: dias > 0 ? total / dias : 0,
    mediaSemanais: Object.keys(porSemana).length > 0 ? total / Object.keys(porSemana).length : 0,
    rankingEmissores: Object.values(porEmissor).sort((a, b) => b.total - a.total),
    porCargo, rankingTrechos: Object.values(porTrecho).sort((a, b) => b.total - a.total),
    porSemana: Object.values(porSemana).sort((a, b) => a.label.localeCompare(b.label)),
    top20Placas, porOrigem,
    dataMin: datas.length ? new Date(Math.min(...datas)) : null,
    dataMax: datas.length ? new Date(Math.max(...datas)) : null,
  }
}

// ---- SCORE ENGINE ----
const DEFAULT_SCORE_CONFIG = {
  wVolume: 20, wPctIrreg: 35, wReincid: 30, wRecencia: 15,
  limCritico: 75, limAlto: 50, limMedio: 25,
}
function loadScoreConfig() {
  try { return { ...DEFAULT_SCORE_CONFIG, ...JSON.parse(localStorage.getItem('pc_score_config') || '{}') } }
  catch { return { ...DEFAULT_SCORE_CONFIG } }
}
function saveScoreConfig(cfg) { localStorage.setItem('pc_score_config', JSON.stringify(cfg)) }

function computeScorePlacas(records, cfg) {
  if (!records?.length) return {}
  const config = { ...DEFAULT_SCORE_CONFIG, ...cfg }
  const now = new Date()
  const porPlaca = {}
  records.forEach(r => {
    if (!r.placa) return
    if (!porPlaca[r.placa]) porPlaca[r.placa] = { placa: r.placa, total: 0, irregular: 0, datas: [] }
    const p = porPlaca[r.placa]
    p.total++; if (r.status === 'Irregular') p.irregular++
    if (r.dtEmissao) p.datas.push(r.dtEmissao)
  })
  const all = Object.values(porPlaca)
  const maxVol = Math.max(...all.map(p => p.total), 1)
  const scores = {}
  all.forEach(p => {
    const nVol = p.total / maxVol
    const nIrreg = p.total > 0 ? p.irregular / p.total : 0
    const cutoff90 = new Date(now.getTime() - 90 * 86400000)
    const rec90 = p.datas.filter(d => d >= cutoff90).length
    const nReincid = rec90 >= 3 ? 1 : rec90 === 2 ? 0.6 : rec90 === 1 ? 0.2 : 0
    let nRecencia = 0
    if (p.datas.length) {
      const ultima = new Date(Math.max(...p.datas.map(d => d.getTime())))
      nRecencia = Math.exp(-((now - ultima) / 86400000) / 30)
    }
    const tw = config.wVolume + config.wPctIrreg + config.wReincid + config.wRecencia
    const raw = config.wVolume * nVol + config.wPctIrreg * nIrreg + config.wReincid * nReincid + config.wRecencia * nRecencia
    const score = Math.min(100, Math.round((raw / tw) * 100))
    const nivel = score >= config.limCritico ? 'critico' : score >= config.limAlto ? 'alto' : score >= config.limMedio ? 'medio' : 'baixo'
    scores[p.placa] = { placa: p.placa, score, nivel, total: p.total, irregular: p.irregular, reincidente: rec90 >= 3, rec90 }
  })
  return scores
}

function getScoreColors(nivel) {
  if (nivel === 'critico') return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', bar: 'bg-red-500', label: 'Crítico' }
  if (nivel === 'alto')    return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40', bar: 'bg-orange-400', label: 'Alto' }
  if (nivel === 'medio')   return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40', bar: 'bg-yellow-400', label: 'Médio' }
  return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', bar: 'bg-emerald-500', label: 'Baixo' }
}

function ScoreBadge({ score, nivel }) {
  const c = getScoreColors(nivel)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {score} <span className="opacity-60 font-normal">{c.label}</span>
    </span>
  )
}

function MiniScoreBar({ score, nivel }) {
  const c = getScoreColors(nivel)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold w-6 text-right ${c.text}`}>{score}</span>
    </div>
  )
}

// ---- COMPARAÇÃO DE PERÍODOS ----
function filterByDateRange(records, de, ate, dateKey) {
  if (!de || !ate) return []
  const dMin = new Date(de + 'T00:00:00')
  const dMax = new Date(ate + 'T23:59:59')
  return records.filter(r => { const dt = r[dateKey]; return dt instanceof Date && dt >= dMin && dt <= dMax })
}

function dataRangeFromRecords(records, dateKey) {
  const datas = records.filter(r => r[dateKey] instanceof Date).map(r => r[dateKey])
  if (!datas.length) return { min: '', max: '' }
  const mn = new Date(Math.min(...datas.map(d => d.getTime())))
  const mx = new Date(Math.max(...datas.map(d => d.getTime())))
  return { min: mn.toISOString().slice(0,10), max: mx.toISOString().slice(0,10) }
}

function DeltaBadge({ valA, valB, inverso, suffix }) {
  if (valB === null || valB === undefined || valB === 0) return <span className="text-xs text-slate-600">—</span>
  const pct = ((valA - valB) / Math.abs(valB)) * 100
  const positivo = inverso ? pct < 0 : pct > 0
  const zero = Math.abs(pct) < 0.05
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${zero ? 'bg-slate-700/60 text-slate-400' : positivo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
      {zero ? '=' : pct > 0 ? '▲' : '▼'} {Math.abs(pct) < 0.1 ? '0' : fmtNum(Math.abs(pct))}%{suffix || ''}
    </span>
  )
}

function KpiComparRow({ label, valA, valB, fmt, inverso }) {
  const f = fmt || (v => fmtNum(v, 0))
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0 gap-2">
      <span className="text-xs text-slate-400 flex-1">{label}</span>
      <span className="text-sm font-semibold text-blue-300 w-24 text-right">{valA !== null ? f(valA) : '—'}</span>
      <span className="text-sm font-semibold text-purple-300 w-24 text-right">{valB !== null ? f(valB) : '—'}</span>
      <div className="w-20 text-right">
        {valA !== null && valB !== null ? <DeltaBadge valA={valA} valB={valB} inverso={inverso} /> : <span className="text-xs text-slate-600">—</span>}
      </div>
    </div>
  )
}

function RankingCompar({ title, listA, listB, nameKey, valueKey, fmtVal }) {
  const namesA = new Set(listA.map(x => x[nameKey]))
  const namesB = new Set(listB.map(x => x[nameKey]))
  const allNames = [...new Set([...listA.map(x => x[nameKey]), ...listB.map(x => x[nameKey])])].slice(0, 8)
  const mapA = Object.fromEntries(listA.map(x => [x[nameKey], x[valueKey]]))
  const mapB = Object.fromEntries(listB.map(x => [x[nameKey], x[valueKey]]))
  const f = fmtVal || (v => v?.toLocaleString('pt-BR'))
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</div>
      {allNames.map(n => (
        <div key={n} className="py-1.5 border-b border-slate-700/30 last:border-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300 truncate flex-1">{n}</span>
            <span className="text-blue-300 w-20 text-right">{mapA[n] != null ? f(mapA[n]) : '—'}</span>
            <span className="text-purple-300 w-20 text-right">{mapB[n] != null ? f(mapB[n]) : '—'}</span>
          </div>
          <div className="flex gap-1">
            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${mapA[n] && Math.max(...allNames.map(x => mapA[x]||0)) ? mapA[n]/Math.max(...allNames.map(x => mapA[x]||0))*100 : 0}%` }} />
            </div>
            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500/70 rounded-full" style={{ width: `${mapB[n] && Math.max(...allNames.map(x => mapB[x]||0)) ? mapB[n]/Math.max(...allNames.map(x => mapB[x]||0))*100 : 0}%` }} />
            </div>
          </div>
        </div>
      ))}
      {allNames.length === 0 && <div className="text-slate-500 text-xs py-2">Sem dados</div>}
    </div>
  )
}

function ComparacaoPeriodos({ records, tipo }) {
  const dateKey = tipo === 'vendas' ? 'dtReg' : 'dtEmissao'
  const { min: dMin, max: dMax } = useMemo(() => dataRangeFromRecords(records, dateKey), [records, dateKey])

  // Inicializa A = primeira metade, B = segunda metade do range total
  const midDate = useMemo(() => {
    if (!dMin || !dMax) return ''
    const d = new Date((new Date(dMin).getTime() + new Date(dMax).getTime()) / 2)
    return d.toISOString().slice(0,10)
  }, [dMin, dMax])

  const [pA, setPA] = useState({ de: '', ate: '' })
  const [pB, setPB] = useState({ de: '', ate: '' })

  useEffect(() => {
    if (midDate && dMin && dMax && !pA.de) {
      const prevMid = new Date(new Date(midDate).getTime() - 86400000).toISOString().slice(0,10)
      setPA({ de: dMin, ate: prevMid })
      setPB({ de: midDate, ate: dMax })
    }
  }, [midDate, dMin, dMax])

  const recA = useMemo(() => filterByDateRange(records, pA.de, pA.ate, dateKey), [records, pA, dateKey])
  const recB = useMemo(() => filterByDateRange(records, pB.de, pB.ate, dateKey), [records, pB, dateKey])
  const analA = useMemo(() => recA.length ? (tipo === 'vendas' ? analyzeVendas : analyzeIrregularidades)(recA) : null, [recA, tipo])
  const analB = useMemo(() => recB.length ? (tipo === 'vendas' ? analyzeVendas : analyzeIrregularidades)(recB) : null, [recB, tipo])

  function preset(period, setter) {
    if (!dMin || !dMax) return
    if (period === 'tudo') { setter({ de: dMin, ate: dMax }); return }
    const refDate = new Date(dMax)
    if (period === '7d') setter({ de: new Date(refDate.getTime()-6*864e5).toISOString().slice(0,10), ate: dMax })
    if (period === '30d') setter({ de: new Date(refDate.getTime()-29*864e5).toISOString().slice(0,10), ate: dMax })
    if (period === 'mes') setter({ de: new Date(refDate.getFullYear(), refDate.getMonth(), 1).toISOString().slice(0,10), ate: dMax })
  }

  function PeriodPicker({ label, color, p, setP }) {
    return (
      <div className={`bg-slate-800/50 border rounded-xl p-4 ${color === 'A' ? 'border-blue-500/30' : 'border-purple-500/30'}`}>
        <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${color === 'A' ? 'text-blue-400' : 'text-purple-400'}`}>{label}</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-slate-500 block mb-1">De</label>
            <input type="date" value={p.de} min={dMin} max={dMax}
              onChange={e => setP(prev => ({ ...prev, de: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Até</label>
            <input type="date" value={p.ate} min={dMin} max={dMax}
              onChange={e => setP(prev => ({ ...prev, ate: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {[['7d','7d'],['30d','30d'],['mes','Mês'],['tudo','Tudo']].map(([v,l]) => (
            <button key={v} onClick={() => preset(v, setP)}
              className="px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition">{l}</button>
          ))}
        </div>
        {p.de && p.ate && <div className="text-xs text-slate-500 mt-2">{recA !== undefined ? (color === 'A' ? recA : recB).length.toLocaleString('pt-BR') : 0} registros</div>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <PeriodPicker label="Período A" color="A" p={pA} setP={setPA} />
        <PeriodPicker label="Período B" color="B" p={pB} setP={setPB} />
      </div>

      {(!analA && !analB) && (
        <div className="text-center py-8 text-slate-500 text-sm">Selecione os dois períodos para ver a comparação.</div>
      )}

      {(analA || analB) && (
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/><span className="text-blue-300 font-semibold">A</span> {pA.de} a {pA.ate} ({recA.length.toLocaleString('pt-BR')} reg.)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"/><span className="text-purple-300 font-semibold">B</span> {pB.de} a {pB.ate} ({recB.length.toLocaleString('pt-BR')} reg.)</span>
            <span className="text-slate-500 ml-auto">Δ = variação de B → A</span>
          </div>

          {/* KPIs header */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 pb-2 border-b border-slate-700">
              <span>Indicador</span>
              <div className="flex gap-2">
                <span className="w-24 text-right text-blue-400">A</span>
                <span className="w-24 text-right text-purple-400">B</span>
                <span className="w-20 text-right">Δ</span>
              </div>
            </div>

            {tipo === 'vendas' && <>
              <KpiComparRow label="Transações" valA={analA?.totalTrans ?? null} valB={analB?.totalTrans ?? null} />
              <KpiComparRow label="Valor total" valA={analA?.totalValor ?? null} valB={analB?.totalValor ?? null} fmt={fmtBRL} />
              <KpiComparRow label="Ticket médio" valA={analA?.ticketMedio ?? null} valB={analB?.ticketMedio ?? null} fmt={fmtBRL} />
              <KpiComparRow label="Agentes únicos" valA={analA?.rankingAgentes?.length ?? null} valB={analB?.rankingAgentes?.length ?? null} />
              <KpiComparRow label="Irregulares" valA={recA.filter(r=>r.irregular).length} valB={recB.filter(r=>r.irregular).length} inverso />
            </>}

            {tipo === 'irregularidades' && <>
              <KpiComparRow label="Total notificações" valA={analA?.total ?? null} valB={analB?.total ?? null} />
              <KpiComparRow label="Irregulares" valA={analA?.totalIrregular ?? null} valB={analB?.totalIrregular ?? null} inverso />
              <KpiComparRow label="Pagas" valA={analA?.totalPaga ?? null} valB={analB?.totalPaga ?? null} />
              <KpiComparRow label="% Conversão" valA={analA?.pctConversao ?? null} valB={analB?.pctConversao ?? null} fmt={v => fmtNum(v)+'%'} />
              <KpiComparRow label="Valor emitido" valA={analA?.valorTotal ?? null} valB={analB?.valorTotal ?? null} fmt={fmtBRL} />
              <KpiComparRow label="Valor pago" valA={analA?.valorPago ?? null} valB={analB?.valorPago ?? null} fmt={fmtBRL} />
            </>}
          </div>

          {/* Rankings lado-a-lado */}
          {tipo === 'vendas' && analA && analB && (
            <div className="grid sm:grid-cols-2 gap-4">
              <RankingCompar title="Top agentes — transações" listA={analA.rankingAgentes.slice(0,6)} listB={analB.rankingAgentes.slice(0,6)} nameKey="nome" valueKey="count" />
              <RankingCompar title="Top trechos — transações" listA={analA.rankingTrechos.slice(0,6)} listB={analB.rankingTrechos.slice(0,6)} nameKey="trecho" valueKey="count" />
            </div>
          )}

          {tipo === 'irregularidades' && analA && analB && (
            <div className="grid sm:grid-cols-2 gap-4">
              <RankingCompar title="Top emissores — total" listA={analA.rankingEmissores.slice(0,6)} listB={analB.rankingEmissores.slice(0,6)} nameKey="nome" valueKey="total" />
              <RankingCompar title="Top trechos — total" listA={analA.rankingTrechos.slice(0,6)} listB={analB.rankingTrechos.slice(0,6)} nameKey="trecho" valueKey="total" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- RELATÓRIO SEMANAL ----
function exportRelatorioSemanalXLSX(semana, analise, top20, scorePlacas) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Relatório Semanal — ' + semana], [],
    ['KPI', 'Valor'],
    ['Total notificações', analise.total],
    ['Irregulares', analise.totalIrregular],
    ['Pagas', analise.totalPaga],
    ['% Conversão', fmtNum(analise.pctConversao) + '%'],
    ['Valor emitido (R$)', analise.valorTotal],
    ['Valor pago (R$)', analise.valorPago],
  ]), 'KPIs')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'Placa', 'Score', 'Nível', 'Irregulares na semana', 'Total na semana', 'Valor (R$)'],
    ...top20.map((p, i) => {
      const s = scorePlacas?.[p.placa]
      return [i+1, p.placa, s?.score ?? '', s?.nivel ?? '', p.irregular, p.total, p.valor]
    }),
  ]), 'Top 20 Inadimplentes')
  if (analise.rankingEmissores?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['#', 'Emissor', 'Cargo', 'Total', 'Paga', '% Conv.'],
      ...analise.rankingEmissores.slice(0,20).map((e,i) => [i+1, e.nome, e.cargo, e.total, e.paga, fmtNum(e.total>0?e.paga/e.total*100:0)+'%']),
    ]), 'Emissores')
  }
  XLSX.writeFile(wb, `rel_semanal_${semana.replace(/[^a-z0-9]/gi,'_')}.xlsx`)
}

function exportRelatorioSemanalTXT(semana, analise, top20, scorePlacas) {
  const L = [
    `RELATÓRIO SEMANAL — ${semana}`,
    '='.repeat(55), '',
    'KPIs DA SEMANA', '-'.repeat(40),
    `Total notificações : ${analise.total}`,
    `Irregulares        : ${analise.totalIrregular}`,
    `Pagas              : ${analise.totalPaga}`,
    `% Conversão        : ${fmtNum(analise.pctConversao)}%`,
    `Valor emitido      : ${fmtBRL(analise.valorTotal)}`,
    `Valor pago         : ${fmtBRL(analise.valorPago)}`,
    '', 'TOP 20 PLACAS INADIMPLENTES', '-'.repeat(55),
    `${padR('#',4)}${padR('Placa',10)}${'Score'.padStart(6)}${'Nível'.padStart(9)}${'Irreg.'.padStart(8)}${'Total'.padStart(7)}`,
    ...top20.map((p, i) => {
      const s = scorePlacas?.[p.placa]
      return `${padR(i+1,4)}${padR(p.placa,10)}${padL(s?.score??'—',6)}${padL(s?.nivel??'—',9)}${padL(p.irregular,8)}${padL(p.total,7)}`
    }),
  ]
  downloadTXT(L.join('\n'), `rel_semanal_${semana.replace(/[^a-z0-9]/gi,'_')}.txt`)
}

function RelatorioSemanal({ records, scorePlacas }) {
  const semanas = useMemo(() => {
    const s = new Set(records.filter(r => r.semana).map(r => r.semana))
    return Array.from(s).sort().reverse()
  }, [records])

  const [semana, setSemana] = useState('')
  useEffect(() => { if (semanas.length && !semana) setSemana(semanas[0]) }, [semanas])

  const semanaAnterior = useMemo(() => {
    const idx = semanas.indexOf(semana)
    return idx >= 0 && idx < semanas.length - 1 ? semanas[idx + 1] : null
  }, [semana, semanas])

  const recSemana   = useMemo(() => records.filter(r => r.semana === semana), [records, semana])
  const recAnterior = useMemo(() => semanaAnterior ? records.filter(r => r.semana === semanaAnterior) : [], [records, semanaAnterior])

  const analise   = useMemo(() => recSemana.length ? analyzeIrregularidades(recSemana) : null, [recSemana])
  const analAnter = useMemo(() => recAnterior.length ? analyzeIrregularidades(recAnterior) : null, [recAnterior])

  const top20 = useMemo(() => {
    const m = {}
    recSemana.forEach(r => {
      if (!r.placa) return
      if (!m[r.placa]) m[r.placa] = { placa: r.placa, total: 0, irregular: 0, valor: 0 }
      m[r.placa].total++
      if (r.status === 'Irregular') m[r.placa].irregular++
      m[r.placa].valor += r.valor
    })
    return Object.values(m).sort((a, b) => b.irregular - a.irregular).slice(0, 20)
  }, [recSemana])

  if (!semanas.length) return <div className="text-center py-12 text-slate-500 text-sm">Nenhum dado com semana disponível.</div>

  return (
    <div className="space-y-4">
      {/* Seletor de semana */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Semana</label>
          <select value={semana} onChange={e => setSemana(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
            {semanas.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {semanaAnterior && (
          <div className="text-xs text-slate-500 mt-4">← vs <span className="text-slate-400">{semanaAnterior}</span></div>
        )}
        <div className="ml-auto flex gap-2">
          {analise && (
            <>
              <button onClick={() => exportRelatorioSemanalXLSX(semana, analise, top20, scorePlacas)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> XLSX
              </button>
              <button onClick={() => exportRelatorioSemanalTXT(semana, analise, top20, scorePlacas)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> TXT
              </button>
            </>
          )}
        </div>
      </div>

      {!analise && <div className="text-center py-8 text-slate-500 text-sm">Sem dados para {semana}.</div>}

      {analise && (
        <>
          {/* KPIs com delta vs semana anterior */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total', val: analise.total, prev: analAnter?.total },
              { label: 'Irregulares', val: analise.totalIrregular, prev: analAnter?.totalIrregular, inv: true },
              { label: 'Pagas', val: analise.totalPaga, prev: analAnter?.totalPaga },
              { label: '% Conversão', val: analise.pctConversao, prev: analAnter?.pctConversao, fmt: v => fmtNum(v)+'%' },
              { label: 'Valor emitido', val: analise.valorTotal, prev: analAnter?.valorTotal, fmt: fmtBRL },
              { label: 'Valor pago', val: analise.valorPago, prev: analAnter?.valorPago, fmt: fmtBRL },
            ].map(({ label, val, prev, fmt, inv }) => (
              <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">{label}</div>
                <div className="text-xl font-bold text-slate-100">{fmt ? fmt(val) : val.toLocaleString('pt-BR')}</div>
                {prev != null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-slate-500">{fmt ? fmt(prev) : prev.toLocaleString('pt-BR')}</span>
                    <DeltaBadge valA={val} valB={prev} inverso={inv} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Top 20 inadimplentes */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Top 20 placas inadimplentes — {semana}</span>
              <span className="text-xs text-slate-500">{top20.length} placas</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-800/40">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Placa</th>
                  <th className="px-4 py-2.5">Score Risco</th>
                  <th className="px-4 py-2.5 text-right">Irreg. semana</th>
                  <th className="px-4 py-2.5 text-right">Total semana</th>
                  <th className="px-4 py-2.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {top20.map((p, i) => {
                  const s = scorePlacas?.[p.placa]
                  return (
                    <tr key={p.placa} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
                      <td className="px-4 py-2.5 font-mono font-medium">{p.placa}</td>
                      <td className="px-4 py-2.5 min-w-[140px]">
                        {s ? <MiniScoreBar score={s.score} nivel={s.nivel} /> : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-amber-400 font-medium">{p.irregular}</td>
                      <td className="px-4 py-2.5 text-right">{p.total}</td>
                      <td className="px-4 py-2.5 text-right">{fmtBRL(p.valor)}</td>
                    </tr>
                  )
                })}
                {top20.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma placa com irregulares nesta semana.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Top emissores da semana */}
          {analise.rankingEmissores.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Top emissores da semana</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-2">#</th><th className="pb-2">Emissor</th><th className="pb-2">Cargo</th>
                      <th className="pb-2 text-right">Total</th><th className="pb-2 text-right">Paga</th><th className="pb-2 text-right">Conv.%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {analise.rankingEmissores.slice(0, 10).map((e, i) => (
                      <tr key={e.nome} className="hover:bg-slate-700/20">
                        <td className="py-2 text-slate-500 text-xs">{i+1}</td>
                        <td className="py-2 font-medium">{e.nome}</td>
                        <td className="py-2"><CargoBadge cargo={e.cargo} /></td>
                        <td className="py-2 text-right">{e.total}</td>
                        <td className="py-2 text-right text-emerald-400">{e.paga}</td>
                        <td className="py-2 text-right"><ConvBar pct={e.total > 0 ? e.paga/e.total*100 : 0} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---- XLSX EXPORTS ----
function exportVendasXLSX(analise, records, jornada) {
  const wb = XLSX.utils.book_new()
  const a = analise

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['KPI', 'Valor'],
    ['Total de transações', a.totalTrans], ['Valor total', a.totalValor], ['Ticket médio', a.ticketMedio],
    ['Com irregularidade', a.comIrreg],
    ['Período', `${fmtDate(a.dataMin)} a ${fmtDate(a.dataMax)}`],
    [], ['Canal', 'Transações', 'Valor (R$)'],
    ...Object.entries(a.porCanal).map(([c, d]) => [c, d.count, d.valor]),
    [], ['Zona', 'Transações', 'Valor (R$)'],
    ...Object.entries(a.porZona).map(([z, d]) => [z, d.count, d.valor]),
    [], ['Tipo', 'Transações', 'Valor (R$)'],
    ...Object.entries(a.porTipo).map(([t, d]) => [t, d.count, d.valor]),
  ]), 'KPIs')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'Agente', 'Cargo', 'Transações', 'Valor (R$)', 'R$/hora', 'Trans/hora', 'Dias'],
    ...a.rankingAgentes.map((ag, i) => [i+1, ag.nome, ag.cargo, ag.count, ag.valor, ag.rPorHora, ag.transPorHora, ag.diasTrabalhados]),
  ]), 'Agentes')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'Trecho', 'Transações', 'Valor (R$)'],
    ...a.rankingTrechos.map((t, i) => [i+1, t.trecho, t.count, t.valor]),
  ]), 'Trechos')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Agente', 'Cargo', 'Data', 'Início', 'Término', 'Duração (min)', 'Transações', 'Pausas', 'Pausas críticas'],
    ...jornada.map(j => [j.usuario, j.cargo, j.dia, fmtTime(j.inicio), fmtTime(j.fim), j.duracaoMin, j.totalTrans, j.pausas.length, j.pausasCriticas.length]),
  ]), 'Jornada')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Placa', 'Data/hora', 'Agente', 'Cargo', 'Canal', 'Zona', 'Trecho', 'Valor (R$)', 'Tipo', 'Pagamento', 'Irregular'],
    ...records.map(r => [r.placa, r.dtReg ? fmtDate(r.dtReg)+' '+fmtTime(r.dtReg) : '', r.usuario, r.cargo, r.canal, r.zona, r.trecho, r.valor, r.tipo, r.formaPagamento, r.irregular ? 'Sim' : '']),
  ]), 'Dados')

  XLSX.writeFile(wb, 'pareceto_vendas.xlsx')
}

function exportIrreguXLSX(analise, records, scorePlacas) {
  const wb = XLSX.utils.book_new()
  const a = analise

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['KPI', 'Valor'],
    ['Total', a.total], ['Irregular', a.totalIrregular], ['Paga', a.totalPaga],
    ['% conversão', `${fmtNum(a.pctConversao)}%`],
    ['Valor emitido', a.valorTotal], ['Valor pago', a.valorPago],
    ['Média diária', a.mediaDiaria], ['Média semanal', a.mediaSemanais],
    [], ['Cargo', 'Total', 'Paga', 'Valor (R$)'],
    ...Object.values(a.porCargo).map(c => [c.cargo, c.total, c.paga, c.valor]),
    [], ['Origem', 'Total', 'Paga', 'Valor (R$)'],
    ...Object.values(a.porOrigem).map(o => [o.origem, o.total, o.paga, o.valor]),
  ]), 'KPIs')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Semana', 'Total', 'Irregular', 'Paga', '% Conv.', 'Valor (R$)', 'Valor pago (R$)', 'App', 'Direta'],
    ...a.porSemana.map(s => [s.label, s.total, s.irregular, s.paga, s.total > 0 ? fmtNum(s.paga/s.total*100)+'%' : '0%', s.valor, s.valorPago, s.aplicativo, s.vendaDireta]),
  ]), 'Por Semana')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'Emissor', 'Cargo', 'Total', 'Paga', '% Conv.', 'Valor (R$)'],
    ...a.rankingEmissores.map((e, i) => [i+1, e.nome, e.cargo, e.total, e.paga, e.total > 0 ? fmtNum(e.paga/e.total*100)+'%' : '0%', e.valor]),
  ]), 'Emissores')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'Trecho', 'Total', 'Paga', '% Conv.', 'Valor (R$)'],
    ...a.rankingTrechos.map((t, i) => [i+1, t.trecho, t.total, t.paga, t.total > 0 ? fmtNum(t.paga/t.total*100)+'%' : '0%', t.valor]),
  ]), 'Trechos')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'Placa', 'Score', 'Nível', 'Total', 'Irregular', 'Paga', 'Valor (R$)', 'Reincidente', 'Trechos dist.', 'Emissores', '1ª emissão', 'Última'],
    ...a.top20Placas.map((p, i) => {
      const s = scorePlacas?.[p.placa]
      return [i+1, p.placa, s?.score ?? '', s?.nivel ?? '', p.total, p.irregular, p.paga, p.valor, s?.reincidente ? 'Sim' : 'Não', p.trechosDist, p.emissoresDist, fmtDate(p.primeira), fmtDate(p.ultima)]
    }),
  ]), 'Top 20 Placas')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ID', 'Data/hora', 'Status', 'Emissor', 'Cargo', 'Placa', 'Trecho', 'Valor (R$)', 'Origem', 'Semana'],
    ...records.map(r => [r.id, r.dtEmissao ? fmtDate(r.dtEmissao)+' '+fmtTime(r.dtEmissao) : '', r.status, r.emissor, r.cargo, r.placa, r.trecho, r.valor, r.origemClass, r.semana]),
  ]), 'Dados')

  XLSX.writeFile(wb, 'pareceto_irregularidades.xlsx')
}

function exportFuncionariosXLSX(funcs) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['ID', 'Nome', 'Login', 'Cargo', 'Status', 'Cadastrado em'],
    ...funcs.map(f => [f.id, f.nome, f.login, f.cargo, f.status, fmtDate(new Date(f.created_at))]),
  ]), 'Funcionários')
  XLSX.writeFile(wb, 'pareceto_funcionarios.xlsx')
}

// ---- TXT EXPORTS ----
function downloadTXT(content, filename) {
  const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  URL.revokeObjectURL(a.href)
}

function gerarTXTVendas(analise, jornada, premissas) {
  const a = analise
  const L = [
    '='.repeat(60),
    'PARE CERTO — ANÁLISE DE VENDAS',
    `Período: ${fmtDate(a.dataMin)} a ${fmtDate(a.dataMax)}`,
    `Gerado em: ${fmtDate(new Date())} às ${fmtTime(new Date())}`,
    `Registros processados: ${a.totalTrans}`,
    '='.repeat(60), '',
    'KPIs GERAIS', '-'.repeat(40),
    `Total de transações.......... ${a.totalTrans.toLocaleString('pt-BR')}`,
    `Valor total.................. ${fmtBRL(a.totalValor)}`,
    `Ticket médio................. ${fmtBRL(a.ticketMedio)}`,
    `Com irregularidade........... ${a.comIrreg}`, '',
    'CANAL', '-'.repeat(40),
    ...Object.entries(a.porCanal).map(([c, d]) => `${padR(c, 20)} ${d.count} trans  ${fmtBRL(d.valor)}`), '',
    'ZONA', '-'.repeat(40),
    ...Object.entries(a.porZona).map(([z, d]) => `${padR(z, 12)} ${String(d.count).padStart(5)} trans  ${fmtBRL(d.valor)}`), '',
    'TIPO DE TRANSAÇÃO', '-'.repeat(50),
    ...Object.entries(a.porTipo).map(([t, d]) => `${padR(t, 28)} ${String(d.count).padStart(5)} trans  ${fmtBRL(d.valor)}`), '',
    'RANKING DE AGENTES', '-'.repeat(60),
    `${padR('#', 4)}${padR('Agente', 26)}${padR('Cargo', 13)}${'Trans'.padStart(6)}${'Valor'.padStart(14)}${'R$/hora'.padStart(11)}`,
    ...a.rankingAgentes.slice(0, 30).map((ag, i) =>
      `${padR(i+1, 4)}${padR(ag.nome, 26)}${padR(ag.cargo, 13)}${padL(ag.count, 6)}${padL(fmtBRL(ag.valor), 14)}${padL(ag.rPorHora > 0 ? fmtBRL(ag.rPorHora) : '—', 11)}`), '',
    'RANKING DE TRECHOS', '-'.repeat(60),
    `${padR('#', 4)}${padR('Trecho', 36)}${'Trans'.padStart(6)}${'Valor'.padStart(14)}`,
    ...a.rankingTrechos.slice(0, 20).map((t, i) =>
      `${padR(i+1, 4)}${padR(t.trecho, 36)}${padL(t.count, 6)}${padL(fmtBRL(t.valor), 14)}`),
    ...(jornada.filter(j => j.pausasCriticas.length > 0).length > 0 ? [
      '', 'PAUSAS CRÍTICAS (>60 min)', '-'.repeat(50),
      ...jornada.filter(j => j.pausasCriticas.length > 0).map(j =>
        `${padR(j.usuario, 25)} ${j.dia}  ${j.pausasCriticas.length} pausa(s) crítica(s)`),
    ] : []),
    ...(premissas.length ? ['', 'PREMISSAS APLICADAS', '-'.repeat(40), ...premissas.map(p => `• ${p}`)] : []),
    '', '='.repeat(60),
  ]
  downloadTXT(L.join('\n'), 'pareceto_vendas.txt')
}

function gerarTXTIrregularidades(analise, premissas) {
  const a = analise
  const L = [
    '='.repeat(60),
    'PARE CERTO — IRREGULARIDADES / NOTIFICAÇÕES',
    `Período: ${fmtDate(a.dataMin)} a ${fmtDate(a.dataMax)}`,
    `Gerado em: ${fmtDate(new Date())} às ${fmtTime(new Date())}`,
    `Registros processados: ${a.total}`,
    '='.repeat(60), '',
    'KPIs GERAIS', '-'.repeat(40),
    `Total de registros........... ${a.total}`,
    `Irregular.................... ${a.totalIrregular}`,
    `Paga......................... ${a.totalPaga}`,
    `% de conversão............... ${fmtNum(a.pctConversao)}%`,
    `Valor total emitido.......... ${fmtBRL(a.valorTotal)}`,
    `Valor total pago............. ${fmtBRL(a.valorPago)}`,
    `Média diária................. ${fmtNum(a.mediaDiaria)}`,
    `Média semanal................ ${fmtNum(a.mediaSemanais)}`, '',
    'POR SEMANA', '-'.repeat(70),
    `${padR('Semana', 30)}${'Total'.padStart(6)}${'Paga'.padStart(6)}${'Conv%'.padStart(7)}${'Valor'.padStart(14)}`,
    ...a.porSemana.map(s => `${padR(s.label, 30)}${padL(s.total, 6)}${padL(s.paga, 6)}${padL((s.total > 0 ? fmtNum(s.paga/s.total*100) : '0')+'%', 7)}${padL(fmtBRL(s.valor), 14)}`), '',
    'RANKING DE EMISSORES', '-'.repeat(70),
    `${padR('#', 4)}${padR('Emissor', 26)}${padR('Cargo', 13)}${'Total'.padStart(6)}${'Paga'.padStart(6)}${'Conv%'.padStart(7)}`,
    ...a.rankingEmissores.slice(0, 30).map((e, i) =>
      `${padR(i+1, 4)}${padR(e.nome, 26)}${padR(e.cargo, 13)}${padL(e.total, 6)}${padL(e.paga, 6)}${padL((e.total > 0 ? fmtNum(e.paga/e.total*100) : '0')+'%', 7)}`), '',
    'RANKING DE TRECHOS', '-'.repeat(70),
    `${padR('#', 4)}${padR('Trecho', 36)}${'Total'.padStart(6)}${'Paga'.padStart(6)}${'Conv%'.padStart(7)}`,
    ...a.rankingTrechos.slice(0, 20).map((t, i) =>
      `${padR(i+1, 4)}${padR(t.trecho, 36)}${padL(t.total, 6)}${padL(t.paga, 6)}${padL((t.total > 0 ? fmtNum(t.paga/t.total*100) : '0')+'%', 7)}`), '',
    'TOP 20 PLACAS', '-'.repeat(60),
    `${padR('#', 4)}${padR('Placa', 10)}${'Total'.padStart(6)}${'Irreg.'.padStart(7)}${'Paga'.padStart(6)}${'Valor'.padStart(14)}`,
    ...a.top20Placas.map((p, i) =>
      `${padR(i+1, 4)}${padR(p.placa, 10)}${padL(p.total, 6)}${padL(p.irregular, 7)}${padL(p.paga, 6)}${padL(fmtBRL(p.valor), 14)}`),
    ...(premissas.length ? ['', 'PREMISSAS APLICADAS', '-'.repeat(40), ...premissas.map(p => `• ${p}`)] : []),
    '', '='.repeat(60),
  ]
  downloadTXT(L.join('\n'), 'pareceto_irregularidades.txt')
}

// ---- SHARED UI ----
function StatCard({ label, value, sub }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-100 leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function CargoBadge({ cargo }) {
  const cls = cargo === 'Supervisor' ? 'bg-purple-500/20 text-purple-300'
    : cargo === 'Fiscal' ? 'bg-blue-500/20 text-blue-300'
    : cargo === 'Operador' ? 'bg-slate-600/40 text-slate-300'
    : 'bg-amber-500/20 text-amber-300'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{cargo || 'Não cadastrado'}</span>
}

function ConvBar({ pct }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct || 0)}%` }} />
      </div>
      <span className="text-xs">{fmtNum(pct || 0)}%</span>
    </div>
  )
}

function DropZone({ onFile, label }) {
  const ref = useRef()
  return (
    <div
      className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-600/50 hover:bg-slate-800/20 transition"
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}>
      <Upload className="w-12 h-12 mx-auto mb-3 text-slate-600" />
      <div className="text-slate-400 text-sm">{label || 'Arraste o CSV aqui ou '}<span className="text-emerald-400">clique para selecionar</span></div>
      <input ref={ref} type="file" accept=".csv,.txt" className="hidden" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  )
}

// ---- MODAL FUNCIONÁRIO ----
function ModalFuncionario({ data, mode, onSalvar, onFechar }) {
  const [form, setForm] = useState({ ...data })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{mode === 'criar' ? 'Novo funcionário' : 'Editar funcionário'}</h3>
          <button onClick={onFechar} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome completo *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Login (conforme aparece nas planilhas) *</label>
            <input value={form.login} onChange={e => set('login', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Exatamente como está no CSV" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cargo *</label>
              <select value={form.cargo} onChange={e => set('cargo', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option>Supervisor</option><option>Fiscal</option><option>Operador</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option>Ativo</option><option>Inativo</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onFechar} className="px-4 py-2 text-sm rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition">Cancelar</button>
          <button onClick={() => onSalvar(form)} disabled={!form.nome || !form.login}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium transition">
            {mode === 'criar' ? 'Cadastrar' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- ABA FUNCIONÁRIOS ----
function AbaFuncionarios({ funcionarios, todos, loading, busca, setBusca, filtroCargo, setFiltroCargo, filtroStatus, setFiltroStatus, onNovo, onEditar, onInativar, onExportXLSX }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold">Cadastro de Funcionários</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {todos.filter(f => f.status === 'Ativo').length} ativo(s) · {todos.filter(f => f.status === 'Inativo').length} inativo(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onExportXLSX} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-700 hover:bg-slate-800 transition text-slate-300">
            <Download className="w-4 h-4" />XLSX
          </button>
          <button onClick={onNovo} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 transition text-white font-medium">
            <Plus className="w-4 h-4" />Novo funcionário
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou login..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500">
          <option value="todos">Todos os cargos</option>
          <option>Supervisor</option><option>Fiscal</option><option>Operador</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500">
          <option value="todos">Todos</option><option value="Ativo">Ativos</option><option value="Inativo">Inativos</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : funcionarios.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhum funcionário encontrado.<br />
          Cadastre o primeiro para habilitar análise por cargo nos relatórios.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Cargo</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cadastrado</th><th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {funcionarios.map(f => (
                <tr key={f.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{f.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{f.login}</td>
                  <td className="px-4 py-3"><CargoBadge cargo={f.cargo} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${f.status === 'Ativo' ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${f.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-600'}`} />{f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(new Date(f.created_at))}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEditar(f)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"><Edit2 className="w-4 h-4" /></button>
                      {f.status === 'Ativo' && (
                        <button onClick={() => onInativar(f.id)} className="p-1.5 rounded hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- ABA VENDAS ----
function SubTabs({ tabs, aba, setAba }) {
  return (
    <div className="flex gap-1 mb-5 overflow-x-auto border-b border-slate-800">
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => setAba(id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${aba === id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

function ActionBar({ titulo, sub, sub2, onNovoArquivo, onExportTXT, onExportXLSX, onSalvar, salvando }) {
  const ref = useRef()
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h2 className="text-xl font-semibold">{titulo}</h2>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        {sub2 && <div className="text-xs text-slate-500">{sub2}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        {onNovoArquivo && (
          <>
            <button onClick={() => ref.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition">
              <Upload className="w-4 h-4" />Novo arquivo
            </button>
            <input ref={ref} type="file" accept=".csv,.txt" className="hidden" onChange={e => { if (e.target.files[0]) { onNovoArquivo(e.target.files[0]); e.target.value = '' } }} />
          </>
        )}
        {onExportTXT && (
          <button onClick={onExportTXT} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition">
            <FileText className="w-4 h-4" />TXT
          </button>
        )}
        {onExportXLSX && (
          <button onClick={onExportXLSX} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition">
            <Download className="w-4 h-4" />XLSX
          </button>
        )}
        {onSalvar && (
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition disabled:opacity-50">
            {salvando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Salvar histórico
          </button>
        )}
      </div>
    </div>
  )
}

// ---- ANÁLISE INDIVIDUAL ----
function computeAgenteAnalise(meus, nome, analise) {
  if (!meus.length) return null
  const totalTrans = meus.length
  const totalValor = meus.reduce((s, r) => s + r.valor, 0)
  const ticketMedio = totalValor / totalTrans
  const ranking = (analise.rankingAgentes.findIndex(a => a.nome === nome) + 1) || analise.rankingAgentes.length
  const totalAgentes = analise.rankingAgentes.length

  const porDataMap = {}
  meus.forEach(r => {
    if (!r.dtReg) return
    const dk = r.dtReg.toISOString().slice(0,10)
    if (!porDataMap[dk]) porDataMap[dk] = { date:dk, label:dk.slice(8)+'/'+dk.slice(5,7), count:0, valor:0 }
    porDataMap[dk].count++; porDataMap[dk].valor += r.valor
  })
  const serieDiaria = Object.values(porDataMap).sort((a,b) => a.date.localeCompare(b.date))
  const diasTrabalhados = serieDiaria.length
  const melhorDia = serieDiaria.reduce((best,d) => d.valor>(best?.valor||0)?d:best, null)

  const porHora = Array.from({length:24},(_,h) => ({hora:h,label:`${String(h).padStart(2,'0')}h`,count:0,valor:0}))
  meus.forEach(r => { if (r.dtReg) { porHora[r.dtReg.getHours()].count++; porHora[r.dtReg.getHours()].valor+=r.valor } })
  const melhorHora = porHora.reduce((best,h) => h.count>best.count?h:best, porHora[0])

  const _DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const _dsw = Array.from({length:7},(_,i)=>({dia:i,label:_DIAS[i],count:0,valor:0,_dates:new Set()}))
  meus.forEach(r=>{ if(r.dtReg){const d=r.dtReg.getDay();_dsw[d].count++;_dsw[d].valor+=r.valor;_dsw[d]._dates.add(r.dtReg.toISOString().slice(0,10))} })
  const porDiaSemana = _dsw.map(({_dates,...d})=>({...d,diasDistintos:_dates.size,mediaCount:_dates.size>0?Math.round(d.count/_dates.size*10)/10:0}))

  const porMesMap = {}
  meus.forEach(r => {
    if (!r.dtReg) return
    const mk = r.dtReg.toISOString().slice(0,7)
    if (!porMesMap[mk]) porMesMap[mk]={mes:mk,label:mk.slice(5)+'/'+mk.slice(2,4),count:0,valor:0}
    porMesMap[mk].count++; porMesMap[mk].valor+=r.valor
  })
  const porMes = Object.values(porMesMap).sort((a,b)=>a.mes.localeCompare(b.mes))

  const porSemanaMap = {}
  meus.forEach(r => {
    if (!r.dtReg) return
    const dt=new Date(r.dtReg); const jan4=new Date(dt.getFullYear(),0,4)
    const sw=new Date(jan4); sw.setDate(jan4.getDate()-((jan4.getDay()||7)-1))
    const wn=Math.floor((dt-sw)/604800000)+1
    const wk=`${dt.getFullYear()}-W${String(wn).padStart(2,'0')}`
    if(!porSemanaMap[wk]) porSemanaMap[wk]={semana:wk,label:`S${wn}`,count:0,valor:0}
    porSemanaMap[wk].count++; porSemanaMap[wk].valor+=r.valor
  })
  const porSemana = Object.values(porSemanaMap).sort((a,b)=>a.semana.localeCompare(b.semana))

  const valDiarios = serieDiaria.map(d=>d.valor)
  const mediaDiaria = valDiarios.reduce((s,v)=>s+v,0)/(valDiarios.length||1)
  const stdDev = Math.sqrt(valDiarios.reduce((s,v)=>s+Math.pow(v-mediaDiaria,2),0)/(valDiarios.length||1))
  const coefVar = mediaDiaria>0?(stdDev/mediaDiaria)*100:0

  const ags = analise.rankingAgentes
  const maxTrans  = Math.max(...ags.map(a=>a.count),1)
  const maxValor  = Math.max(...ags.map(a=>a.valor),1)
  const maxTicket = Math.max(...ags.map(a=>a.valor/a.count),1)
  const hAgentes  = ags.filter(a=>a.rPorHora>0)
  const maxProdH  = Math.max(...hAgentes.map(a=>a.rPorHora),1)
  const maxDias   = Math.max(...ags.map(a=>a.diasTrabalhados),1)
  const mediaTpct = (analise.totalTrans/ags.length)/maxTrans*100
  const mediaVpct = (analise.totalValor/ags.length)/maxValor*100
  const mediaTkpct= analise.ticketMedio/maxTicket*100
  const mediaPhpct= hAgentes.length>0?(hAgentes.reduce((s,a)=>s+a.rPorHora,0)/hAgentes.length)/maxProdH*100:0
  const mediaDpct = (ags.reduce((s,a)=>s+a.diasTrabalhados,0)/ags.length)/maxDias*100
  const meAg = ags.find(a=>a.nome===nome)

  const radar = [
    {metric:'Transações', eu:Math.round(totalTrans/maxTrans*100),    media:Math.round(mediaTpct),    fullMark:100},
    {metric:'Valor',      eu:Math.round(totalValor/maxValor*100),     media:Math.round(mediaVpct),    fullMark:100},
    {metric:'Ticket',     eu:Math.round(ticketMedio/maxTicket*100),   media:Math.round(mediaTkpct),   fullMark:100},
    {metric:'R$/hora',    eu:meAg?.rPorHora>0?Math.round(meAg.rPorHora/maxProdH*100):0, media:Math.round(mediaPhpct), fullMark:100},
    {metric:'Dias trab.', eu:Math.round(diasTrabalhados/maxDias*100), media:Math.round(mediaDpct),    fullMark:100},
    {metric:'Consistência',eu:Math.round(Math.max(0,100-coefVar)),    media:65,                       fullMark:100},
  ]

  const datas=meus.filter(r=>r.dtReg).map(r=>r.dtReg)
  return {
    totalTrans, totalValor, ticketMedio, ranking, totalAgentes, diasTrabalhados,
    melhorDia, melhorHora, coefVar, stdDev,
    serieDiaria, porHora, porDiaSemana, porMes, porSemana, radar,
    dataMin: datas.length?new Date(Math.min(...datas)):null,
    dataMax: datas.length?new Date(Math.max(...datas)):null,
    prodPorHora: meAg?.transPorHora||0,
    rPorHora: meAg?.rPorHora||0,
  }
}

function VendasFuncionarioDetalhe({ nome, cargo, records, analise, onVoltar }) {
  const meus = useMemo(()=>records.filter(r=>r.usuario===nome),[records,nome])
  const a = useMemo(()=>computeAgenteAnalise(meus,nome,analise),[meus,nome,analise])
  const interval = Math.max(0, Math.ceil((a?.serieDiaria?.length||0)/12)-1)

  if (!a) return (
    <div className="space-y-4">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors"><ArrowLeft className="w-4 h-4"/>Voltar</button>
      <div className="text-center py-12 text-slate-500">Nenhum registro para {nome}.</div>
    </div>
  )

  const consistLabel = a.coefVar < 30 ? 'Regular' : a.coefVar < 60 ? 'Variável' : 'Irregular'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-700/50">
        <button onClick={onVoltar} className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4"/></button>
        <div className="min-w-0">
          <div className="font-semibold text-lg text-white truncate">{nome}</div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><CargoBadge cargo={cargo||'Operador'}/><span>{fmtDate(a.dataMin)} – {fmtDate(a.dataMax)}</span></div>
        </div>
        <div className="ml-auto text-right flex-shrink-0">
          <div className="text-2xl font-bold text-emerald-400">#{a.ranking}</div>
          <div className="text-xs text-slate-500">de {a.totalAgentes} agentes</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Transações" value={a.totalTrans.toLocaleString('pt-BR')}/>
        <StatCard label="Valor total" value={fmtBRL(a.totalValor)}/>
        <StatCard label="Ticket médio" value={fmtBRL(a.ticketMedio)} sub={`equipe: ${fmtBRL(analise.ticketMedio)}`}/>
        <StatCard label="Dias trabalhados" value={a.diasTrabalhados}/>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Trans./hora" value={a.prodPorHora>0?fmtNum(a.prodPorHora):'—'}/>
        <StatCard label="R$/hora" value={a.rPorHora>0?fmtBRL(a.rPorHora):'—'}/>
        <StatCard label="Pico do dia" value={a.melhorHora.count>0?a.melhorHora.label:'—'} sub={a.melhorHora.count>0?`${a.melhorHora.count} trans.`:''}/>
        <StatCard label="Consistência" value={`${Math.round(Math.max(0,100-a.coefVar))}%`} sub={consistLabel}/>
      </div>

      {a.serieDiaria.length>1 && (
        <ChartCard title="Receita diária" height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={a.serieDiaria} margin={{top:4,right:8,bottom:0,left:4}}>
              <defs><linearGradient id="gAg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid {...gridStyle}/><XAxis dataKey="label" {...axisStyle} interval={interval}/><YAxis {...axisStyle} tickFormatter={fmtK} width={52}/>
              <Tooltip {...ttStyle} formatter={v=>[fmtBRL(v),'Valor']}/>
              <Area type="monotone" dataKey="valor" stroke="#10b981" fill="url(#gAg2)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <ChartCard title="Transações por hora" height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.porHora} margin={{top:4,right:8,bottom:0,left:4}}>
              <CartesianGrid {...gridStyle}/><XAxis dataKey="label" {...axisStyle} interval={3}/><YAxis {...axisStyle} width={32}/>
              <Tooltip {...ttStyle} formatter={v=>[v.toLocaleString('pt-BR'),'Trans.']}/>
              <Bar dataKey="count" radius={[2,2,0,0]}>{a.porHora.map((h,i)=><Cell key={i} fill={h.hora===a.melhorHora.hora&&h.count>0?'#f59e0b':'#06b6d4'}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Média por dia da semana" height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.porDiaSemana} margin={{top:4,right:8,bottom:0,left:4}}>
              <CartesianGrid {...gridStyle}/><XAxis dataKey="label" {...axisStyle}/><YAxis {...axisStyle} width={32}/>
              <Tooltip {...ttStyle} formatter={v=>[v.toLocaleString('pt-BR'),'Média']}/>
              <Bar dataKey="mediaCount" fill="#8b5cf6" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {analise.rankingAgentes.length>1 && (
          <ChartCard title="Comparativo com a equipe" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={a.radar} margin={{top:4,right:24,bottom:4,left:24}}>
                <PolarGrid stroke="#334155"/>
                <PolarAngleAxis dataKey="metric" tick={{fill:'#94a3b8',fontSize:11}}/>
                <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fill:'#475569',fontSize:9}}/>
                <Radar name={nome.split(' ')[0]} dataKey="eu" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2}/>
                <Radar name="Média equipe" dataKey="media" stroke="#64748b" fill="#64748b" fillOpacity={0.1} strokeWidth={1} strokeDasharray="4 4"/>
                <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                <Tooltip {...ttStyle} formatter={v=>[`${v}/100`]}/>
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {a.porMes.length>=1 && (
          <ChartCard title="Valor por mês" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.porMes} margin={{top:4,right:8,bottom:0,left:4}}>
                <CartesianGrid {...gridStyle}/><XAxis dataKey="label" {...axisStyle}/><YAxis {...axisStyle} tickFormatter={fmtK} width={52}/>
                <Tooltip {...ttStyle} formatter={v=>[fmtBRL(v),'Valor']}/>
                <Bar dataKey="valor" fill="#14b8a6" radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {a.porSemana.length>2 && (
        <ChartCard title="Evolução semanal (transações)" height={180}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={a.porSemana} margin={{top:4,right:8,bottom:0,left:4}}>
              <CartesianGrid {...gridStyle}/><XAxis dataKey="label" {...axisStyle} interval={Math.max(0,Math.ceil(a.porSemana.length/10)-1)}/><YAxis {...axisStyle} width={32}/>
              <Tooltip {...ttStyle} formatter={v=>[v.toLocaleString('pt-BR'),'Trans.']}/>
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {a.melhorDia && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-400">
          <span className="text-slate-300 font-medium">Melhor dia: </span>
          {a.melhorDia.date} — {a.melhorDia.count.toLocaleString('pt-BR')} trans. · {fmtBRL(a.melhorDia.valor)}
        </div>
      )}
    </div>
  )
}

function AbaVendas({ funcionarios, dados, premissas, analise, jornada, subAba, setSubAba, onUpload, onSalvar, salvando }) {
  const [selectedAgente, setSelectedAgente] = useState(null)

  if (!dados) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">Módulo 1 — Análise de Vendas</h2>
        <p className="text-sm text-slate-400 mb-6">Importe o CSV de vendas exportado do sistema operacional.</p>
        {funcionarios.length === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Cadastre funcionários na aba Funcionários para habilitar análise por cargo.
          </div>
        )}
        <DropZone onFile={onUpload} label="Arraste o CSV de vendas aqui ou " />
        <div className="text-xs text-slate-600 text-center mt-2">Delimitador TAB, encoding UTF-8 ou Windows-1252</div>
      </div>
    )
  }

  // Drill-down individual
  if (selectedAgente && analise && dados) {
    const ag = analise.rankingAgentes.find(a => a.nome === selectedAgente)
    return (
      <VendasFuncionarioDetalhe
        nome={selectedAgente}
        cargo={ag?.cargo}
        records={dados.records}
        analise={analise}
        onVoltar={() => setSelectedAgente(null)}
      />
    )
  }

  return (
    <div>
      <ActionBar
        titulo="Análise de Vendas"
        sub={`${dados.nomeArquivo} · ${dados.records.length.toLocaleString('pt-BR')} transações`}
        sub2={analise ? `${fmtDate(analise.dataMin)} a ${fmtDate(analise.dataMax)}` : ''}
        onNovoArquivo={onUpload}
        onExportTXT={analise ? () => gerarTXTVendas(analise, jornada, premissas) : null}
        onExportXLSX={analise ? () => exportVendasXLSX(analise, dados.records, jornada) : null}
        onSalvar={onSalvar} salvando={salvando}
      />
      {premissas.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400">
          <strong className="text-slate-300">Premissas:</strong> {premissas.join(' · ')}
        </div>
      )}
      <SubTabs tabs={[['kpis','KPIs'],['temporal','Temporal'],['agentes','Agentes'],['trechos','Trechos'],['pagamentos','Pagamentos'],['jornada','Jornada'],['comparar','Comparar']]} aba={subAba} setAba={setSubAba} />
      {analise && subAba === 'kpis' && <VendasKPIs a={analise} />}
      {analise && subAba === 'temporal' && <VendasTemporal a={analise} />}
      {analise && subAba === 'agentes' && <VendasAgentesChart a={analise} onSelectAgente={setSelectedAgente} />}
      {analise && subAba === 'trechos' && <VendasTrechosChart a={analise} />}
      {analise && subAba === 'pagamentos' && <VendasPagamentos a={analise} />}
      {subAba === 'jornada' && <VendasJornada jornada={jornada} />}
      {subAba === 'comparar' && <ComparacaoPeriodos records={dados.records} tipo="vendas" />}
    </div>
  )
}

function RankingRow({ label, count, total, valor, alert }) {
  const pct = total > 0 ? count / total * 100 : 0
  return (
    <div className={`py-1.5 border-b border-slate-700/40 last:border-0 ${alert ? 'text-red-400' : ''}`}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span>{count.toLocaleString('pt-BR')} <span className="text-slate-400 text-xs">({fmtNum(pct)}%)</span></span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${alert ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <span className="text-xs text-emerald-400">{fmtBRL(valor)}</span>
      </div>
    </div>
  )
}

function VendasKPIs({ a }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Transações" value={a.totalTrans.toLocaleString('pt-BR')} />
        <StatCard label="Valor total" value={fmtBRL(a.totalValor)} />
        <StatCard label="Ticket médio" value={fmtBRL(a.ticketMedio)} />
        <StatCard label="Com irregularidade" value={a.comIrreg} sub={`${fmtNum(a.comIrreg/a.totalTrans*100)}%`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Dias operados" value={a.diasOperados} />
        <StatCard label="Receita / dia" value={fmtBRL(a.receitaPorDia)} />
        <StatCard label="Trans. / dia" value={fmtNum(a.transPorDiaMedia, 0)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Por canal</div>
          {Object.entries(a.porCanal).map(([c, d]) => <RankingRow key={c} label={c} count={d.count} total={a.totalTrans} valor={d.valor} />)}
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Por zona</div>
          {Object.entries(a.porZona).sort((a2, b2) => b2[1].count - a2[1].count).map(([z, d]) => <RankingRow key={z} label={z} count={d.count} total={a.totalTrans} valor={d.valor} />)}
        </div>
      </div>
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Tipo de transação</div>
        {Object.entries(a.porTipo).sort((a2, b2) => b2[1].count - a2[1].count).map(([t, d]) =>
          <RankingRow key={t} label={t} count={d.count} total={a.totalTrans} valor={d.valor} alert={t.includes('ALERTA')} />)}
      </div>
    </div>
  )
}

function VendasAgentes({ a }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">#</th><th className="px-4 py-3">Agente</th><th className="px-4 py-3">Cargo</th>
            <th className="px-4 py-3 text-right">Trans.</th><th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">R$/hora</th><th className="px-4 py-3 text-right">Trans/hora</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {a.rankingAgentes.map((ag, i) => (
            <tr key={ag.nome} className={`hover:bg-slate-800/30 ${ag.cargo === 'Não cadastrado' ? 'text-amber-400/80' : ''}`}>
              <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
              <td className="px-4 py-2.5 font-medium">{ag.nome}</td>
              <td className="px-4 py-2.5"><CargoBadge cargo={ag.cargo} /></td>
              <td className="px-4 py-2.5 text-right">{ag.count.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-2.5 text-right text-emerald-400">{fmtBRL(ag.valor)}</td>
              <td className="px-4 py-2.5 text-right">{ag.rPorHora > 0 ? fmtBRL(ag.rPorHora) : '—'}</td>
              <td className="px-4 py-2.5 text-right">{ag.transPorHora > 0 ? fmtNum(ag.transPorHora) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VendasTrechos({ a }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">#</th><th className="px-4 py-3">Trecho</th>
            <th className="px-4 py-3 text-right">Trans.</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">% total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {a.rankingTrechos.map((t, i) => (
            <tr key={t.trecho} className="hover:bg-slate-800/30">
              <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
              <td className="px-4 py-2.5 font-medium">{t.trecho}</td>
              <td className="px-4 py-2.5 text-right">{t.count.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-2.5 text-right text-emerald-400">{fmtBRL(t.valor)}</td>
              <td className="px-4 py-2.5 text-right"><ConvBar pct={t.count/a.totalTrans*100} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VendasJornada({ jornada }) {
  if (!jornada.length) return <div className="text-center py-12 text-slate-500 text-sm">Sem dados de jornada. Verifique o campo "Hora registro" no CSV.</div>
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">Agente</th><th className="px-4 py-3">Cargo</th><th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Início</th><th className="px-4 py-3">Término</th>
            <th className="px-4 py-3 text-right">Duração</th><th className="px-4 py-3 text-right">Trans.</th>
            <th className="px-4 py-3 text-right">Pausas</th><th className="px-4 py-3 text-right">Críticas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {jornada.map((j, i) => (
            <tr key={i} className={`hover:bg-slate-800/30 ${j.pausasCriticas.length > 0 ? 'bg-red-900/10' : ''}`}>
              <td className="px-4 py-2.5 font-medium">{j.usuario}</td>
              <td className="px-4 py-2.5"><CargoBadge cargo={j.cargo} /></td>
              <td className="px-4 py-2.5 text-slate-400 text-xs">{j.dia}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{fmtTime(j.inicio)}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{fmtTime(j.fim)}</td>
              <td className="px-4 py-2.5 text-right">{j.duracaoMin}min</td>
              <td className="px-4 py-2.5 text-right">{j.totalTrans}</td>
              <td className="px-4 py-2.5 text-right">{j.pausas.length || '—'}</td>
              <td className={`px-4 py-2.5 text-right font-medium ${j.pausasCriticas.length > 0 ? 'text-red-400' : 'text-slate-500'}`}>{j.pausasCriticas.length || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---- RECHARTS HELPERS ----
const C_COLORS = ['#10b981','#14b8a6','#06b6d4','#0ea5e9','#8b5cf6','#f59e0b','#ef4444','#f97316','#ec4899','#84cc16']
const ttStyle = {
  contentStyle: { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontSize:12 },
  labelStyle: { color:'#94a3b8' },
  itemStyle: { color:'#e2e8f0' },
}
const axisStyle = { tick:{ fill:'#64748b', fontSize:11 }, axisLine:{ stroke:'#334155' }, tickLine:false }
const gridStyle = { strokeDasharray:'3 3', stroke:'#1e293b' }
const fmtK = v => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v.toFixed(0)}`

function ChartCard({ title, children, height = 240 }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      {title && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</div>}
      <div style={{ height }}>{children}</div>
    </div>
  )
}

function FaixaCards({ porFaixa, totalTrans }) {
  const icons = ['☀️','🌇','🌙','🌃']
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {porFaixa.map((f, i) => (
        <div key={f.faixa} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
          <div className="text-lg mb-1">{icons[i]}</div>
          <div className="text-xs text-slate-400">{f.faixa}</div>
          <div className="text-sm text-slate-500 mb-1">{f.label}</div>
          <div className="text-base font-bold text-emerald-400">{f.count.toLocaleString('pt-BR')}</div>
          <div className="text-xs text-slate-400">{fmtBRL(f.valor)}</div>
          <div className="text-xs text-slate-600">{totalTrans > 0 ? fmtNum(f.count/totalTrans*100) : 0}%</div>
        </div>
      ))}
    </div>
  )
}

function VendasTemporal({ a }) {
  const interval = Math.max(0, Math.ceil(a.serieDiaria.length / 12) - 1)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Dias operados" value={a.diasOperados} />
        <StatCard label="Receita/dia (média)" value={fmtBRL(a.receitaPorDia)} />
        <StatCard label="Trans./dia (média)" value={fmtNum(a.transPorDiaMedia, 0)} />
      </div>

      {a.serieDiaria.length > 1 && (
        <ChartCard title="Receita diária" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={a.serieDiaria} margin={{ top:4, right:8, bottom:0, left:4 }}>
              <defs>
                <linearGradient id="gValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle}/>
              <XAxis dataKey="label" {...axisStyle} interval={interval}/>
              <YAxis {...axisStyle} tickFormatter={fmtK} width={52}/>
              <Tooltip {...ttStyle} formatter={v => [fmtBRL(v),'Valor']}/>
              <Area type="monotone" dataKey="valor" stroke="#10b981" fill="url(#gValor)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {a.serieDiaria.length > 1 && (
        <ChartCard title="Transações por dia" height={180}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.serieDiaria} margin={{ top:4, right:8, bottom:0, left:4 }}>
              <CartesianGrid {...gridStyle}/>
              <XAxis dataKey="label" {...axisStyle} interval={interval}/>
              <YAxis {...axisStyle} width={36}/>
              <Tooltip {...ttStyle} formatter={v => [v.toLocaleString('pt-BR'),'Trans.']}/>
              <Bar dataKey="count" fill="#14b8a6" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <ChartCard title="Por hora do dia" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.porHora} margin={{ top:4, right:8, bottom:0, left:4 }}>
              <CartesianGrid {...gridStyle}/>
              <XAxis dataKey="label" {...axisStyle} interval={3}/>
              <YAxis {...axisStyle} width={32}/>
              <Tooltip {...ttStyle} formatter={v => [v.toLocaleString('pt-BR'),'Trans.']}/>
              <Bar dataKey="count" radius={[2,2,0,0]}>
                {a.porHora.map((h, i) => {
                  const pico = a.porHora.reduce((mx, x) => x.count > mx.count ? x : mx, a.porHora[0])
                  return <Cell key={i} fill={h.hora === pico.hora ? '#f59e0b' : '#06b6d4'}/>
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por dia da semana (média)" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.porDiaSemana} margin={{ top:4, right:8, bottom:0, left:4 }}>
              <CartesianGrid {...gridStyle}/>
              <XAxis dataKey="label" {...axisStyle}/>
              <YAxis {...axisStyle} width={32}/>
              <Tooltip {...ttStyle} formatter={(v, n) => [v.toLocaleString('pt-BR'), n === 'mediaCount' ? 'Média trans.' : n]}/>
              <Bar dataKey="mediaCount" fill="#8b5cf6" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <FaixaCards porFaixa={a.porFaixa} totalTrans={a.totalTrans}/>

      {a.porMes.length > 1 && (
        <ChartCard title="Evolução mensal" height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.porMes} margin={{ top:4, right:8, bottom:0, left:4 }}>
              <CartesianGrid {...gridStyle}/>
              <XAxis dataKey="label" {...axisStyle}/>
              <YAxis {...axisStyle} tickFormatter={fmtK} width={52}/>
              <Tooltip {...ttStyle} formatter={(v, n) => n === 'valor' ? [fmtBRL(v),'Valor'] : [v.toLocaleString('pt-BR'),'Trans.']}/>
              <Bar dataKey="valor" fill="#10b981" radius={[2,2,0,0]} name="valor"/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

function VendasPagamentos({ a }) {
  const total = a.porFormaPag.reduce((s, x) => s + x.count, 0)
  const tipoArr = Object.entries(a.porTipo).map(([name, d]) => ({ name, ...d })).sort((x, y) => y.count - x.count)
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <ChartCard title="Forma de pagamento" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={a.porFormaPag} cx="50%" cy="45%" outerRadius={80} innerRadius={36} dataKey="count" paddingAngle={2}>
                {a.porFormaPag.map((_, i) => <Cell key={i} fill={C_COLORS[i % C_COLORS.length]}/>)}
              </Pie>
              <Tooltip {...ttStyle} formatter={(v, n, p) => [`${v.toLocaleString('pt-BR')} (${fmtNum(v/total*100)}%)`, p.payload.name]}/>
              <Legend formatter={v => <span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tipo de transação" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={tipoArr} margin={{ top:4, right:8, bottom:0, left:110 }}>
              <CartesianGrid {...gridStyle} horizontal={false}/>
              <XAxis type="number" {...axisStyle}/>
              <YAxis type="category" dataKey="name" {...axisStyle} width={110}/>
              <Tooltip {...ttStyle} formatter={v => [v.toLocaleString('pt-BR'),'Trans.']}/>
              <Bar dataKey="count" radius={[0,4,4,0]}>
                {tipoArr.map((t, i) => <Cell key={i} fill={t.name.includes('ALERTA') ? '#ef4444' : C_COLORS[i % C_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3">Forma de pagamento</th>
              <th className="px-4 py-3 text-right">Trans.</th>
              <th className="px-4 py-3 text-right">%</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {a.porFormaPag.map((fp, i) => (
              <tr key={fp.name} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:C_COLORS[i%C_COLORS.length]}}/>
                  {fp.name}
                </td>
                <td className="px-4 py-2.5 text-right">{fp.count.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-2.5 text-right text-slate-400">{fmtNum(fp.count/total*100)}%</td>
                <td className="px-4 py-2.5 text-right text-emerald-400">{fmtBRL(fp.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VendasAgentesChart({ a, onSelectAgente }) {
  const top10 = a.rankingAgentes.slice(0, 10).map(ag => ({ nome: ag.nome.split(' ')[0], count: ag.count, valor: ag.valor }))
  return (
    <div className="space-y-4">
      <ChartCard title={`Top ${top10.length} agentes — transações`} height={top10.length * 30 + 40}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={top10} margin={{ top:4, right:40, bottom:0, left:70 }}>
            <CartesianGrid {...gridStyle} horizontal={false}/>
            <XAxis type="number" {...axisStyle}/>
            <YAxis type="category" dataKey="nome" {...axisStyle} width={70}/>
            <Tooltip {...ttStyle} formatter={v => [v.toLocaleString('pt-BR'),'Trans.']}/>
            <Bar dataKey="count" radius={[0,4,4,0]}>
              {top10.map((_, i) => <Cell key={i} fill={i === 0 ? '#f59e0b' : i < 3 ? '#10b981' : '#14b8a6'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      {onSelectAgente && (
        <p className="text-xs text-slate-500 text-center -mt-2">Clique em um agente para ver análise individual</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3">#</th><th className="px-4 py-3">Agente</th><th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3 text-right">Trans.</th><th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-right">Ticket</th><th className="px-4 py-3 text-right">R$/h</th><th className="px-4 py-3 text-right">Trans/h</th>
              {onSelectAgente && <th className="px-4 py-3"/>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {a.rankingAgentes.map((ag, i) => (
              <tr
                key={ag.nome}
                className={`transition-colors hover:bg-slate-800/50 ${onSelectAgente ? 'cursor-pointer' : ''} ${ag.cargo === 'Não cadastrado' ? 'text-amber-400/80' : ''}`}
                onClick={() => onSelectAgente && onSelectAgente(ag.nome)}
              >
                <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
                <td className="px-4 py-2.5 font-medium">{ag.nome}</td>
                <td className="px-4 py-2.5"><CargoBadge cargo={ag.cargo}/></td>
                <td className="px-4 py-2.5 text-right">{ag.count.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-2.5 text-right text-emerald-400">{fmtBRL(ag.valor)}</td>
                <td className="px-4 py-2.5 text-right">{fmtBRL(ag.valor / ag.count)}</td>
                <td className="px-4 py-2.5 text-right">{ag.rPorHora > 0 ? fmtBRL(ag.rPorHora) : '—'}</td>
                <td className="px-4 py-2.5 text-right">{ag.transPorHora > 0 ? fmtNum(ag.transPorHora) : '—'}</td>
                {onSelectAgente && <td className="px-3 py-2.5 text-slate-600 text-xs">›</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VendasTrechosChart({ a }) {
  const top12 = a.rankingTrechos.slice(0, 12).map(t => ({ nome: t.trecho.length > 18 ? t.trecho.slice(0,18)+'…' : t.trecho, count: t.count, valor: t.valor, trecho: t.trecho }))
  return (
    <div className="space-y-4">
      <ChartCard title={`Top ${top12.length} trechos — transações`} height={top12.length * 28 + 40}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={top12} margin={{ top:4, right:40, bottom:0, left:130 }}>
            <CartesianGrid {...gridStyle} horizontal={false}/>
            <XAxis type="number" {...axisStyle}/>
            <YAxis type="category" dataKey="nome" {...axisStyle} width={130}/>
            <Tooltip {...ttStyle} formatter={v => [v.toLocaleString('pt-BR'),'Trans.']} labelFormatter={(_, payload) => payload?.[0]?.payload?.trecho || ''}/>
            <Bar dataKey="count" fill="#0ea5e9" radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3">#</th><th className="px-4 py-3">Trecho</th>
              <th className="px-4 py-3 text-right">Trans.</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">% total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {a.rankingTrechos.map((t, i) => (
              <tr key={t.trecho} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
                <td className="px-4 py-2.5 font-medium">{t.trecho}</td>
                <td className="px-4 py-2.5 text-right">{t.count.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-2.5 text-right text-emerald-400">{fmtBRL(t.valor)}</td>
                <td className="px-4 py-2.5 text-right"><ConvBar pct={t.count/a.totalTrans*100}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---- ABA IRREGULARIDADES ----
function AbaIrregularidades({ funcionarios, dados, premissas, analise, subAba, setSubAba, onUpload, onSalvar, salvando, scorePlacas, alertaDismissed, onDismissAlerta, scoreConfig }) {
  if (!dados) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">Módulo 2 — Irregularidades / Notificações</h2>
        <p className="text-sm text-slate-400 mb-6">Importe o CSV de irregularidades exportado do sistema operacional.</p>
        {funcionarios.length === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Cadastre funcionários na aba Funcionários para habilitar análise por cargo.
          </div>
        )}
        <DropZone onFile={onUpload} label="Arraste o CSV de irregularidades aqui ou " />
        <div className="text-xs text-slate-600 text-center mt-2">Delimitador ponto-e-vírgula</div>
      </div>
    )
  }
  return (
    <div>
      <ActionBar
        titulo="Irregularidades / Notificações"
        sub={`${dados.nomeArquivo} · ${dados.records.length} registros`}
        sub2={analise ? `${fmtDate(analise.dataMin)} a ${fmtDate(analise.dataMax)}` : ''}
        onNovoArquivo={onUpload}
        onExportTXT={analise ? () => gerarTXTIrregularidades(analise, premissas) : null}
        onExportXLSX={analise ? () => exportIrreguXLSX(analise, dados.records, scorePlacas) : null}
        onSalvar={onSalvar} salvando={salvando}
      />
      {premissas.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400">
          <strong className="text-slate-300">Premissas:</strong> {premissas.join(' · ')}
        </div>
      )}
      {!alertaDismissed && scorePlacas && <AlertasPanel scorePlacas={scorePlacas} onDismiss={onDismissAlerta} />}
      <SubTabs tabs={[['kpis','KPIs'],['risco','Score / Risco'],['semanas','Por Semana'],['emissores','Emissores'],['trechos','Trechos'],['placas','Top 20 Placas'],['comparar','Comparar'],['relatorio','Rel. Semanal']]} aba={subAba} setAba={setSubAba} />
      {analise && subAba === 'kpis' && <IrregKPIs a={analise} />}
      {subAba === 'risco' && <IrregRisco scorePlacas={scorePlacas || {}} config={scoreConfig} />}
      {analise && subAba === 'semanas' && <IrregSemanas a={analise} />}
      {analise && subAba === 'emissores' && <IrregEmissores a={analise} />}
      {analise && subAba === 'trechos' && <IrregTrechos a={analise} />}
      {analise && subAba === 'placas' && <IrregPlacas a={analise} scorePlacas={scorePlacas} />}
      {subAba === 'comparar' && <ComparacaoPeriodos records={dados.records} tipo="irregularidades" />}
      {subAba === 'relatorio' && <RelatorioSemanal records={dados.records} scorePlacas={scorePlacas} />}
    </div>
  )
}

function IrregKPIs({ a }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={a.total.toLocaleString('pt-BR')} />
        <StatCard label="Irregular" value={a.totalIrregular.toLocaleString('pt-BR')} />
        <StatCard label="Paga" value={a.totalPaga.toLocaleString('pt-BR')} />
        <StatCard label="% conversão" value={`${fmtNum(a.pctConversao)}%`} sub="pagas / total" />
        <StatCard label="Valor emitido" value={fmtBRL(a.valorTotal)} />
        <StatCard label="Valor pago" value={fmtBRL(a.valorPago)} />
        <StatCard label="Média diária" value={fmtNum(a.mediaDiaria)} />
        <StatCard label="Média semanal" value={fmtNum(a.mediaSemanais)} />
      </div>
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Conversão geral</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, a.pctConversao)}%` }} />
          </div>
          <span className="text-xl font-bold text-emerald-400">{fmtNum(a.pctConversao)}%</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">{a.totalPaga} pagas de {a.total} emitidas</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Por origem</div>
          {Object.values(a.porOrigem).map(o => (
            <div key={o.origem} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0 text-sm">
              <span>{o.origem}</span>
              <span className="font-medium">{o.total} <span className="text-slate-500 text-xs">({fmtNum(o.total/a.total*100)}%)</span></span>
            </div>
          ))}
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Por cargo do emissor</div>
          {Object.values(a.porCargo).map(c => (
            <div key={c.cargo} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0 text-sm">
              <CargoBadge cargo={c.cargo} />
              <span className="font-medium">{c.total} <span className="text-slate-500 text-xs">{fmtNum(c.total > 0 ? c.paga/c.total*100 : 0)}% conv.</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IrregSemanas({ a }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">Semana</th><th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Irreg.</th><th className="px-4 py-3 text-right">Paga</th>
            <th className="px-4 py-3 text-right">Conv.%</th><th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">App</th><th className="px-4 py-3 text-right">Direta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {a.porSemana.map(s => (
            <tr key={s.label} className="hover:bg-slate-800/30">
              <td className="px-4 py-2.5 font-mono text-xs">{s.label}</td>
              <td className="px-4 py-2.5 text-right font-medium">{s.total}</td>
              <td className="px-4 py-2.5 text-right text-amber-400">{s.irregular}</td>
              <td className="px-4 py-2.5 text-right text-emerald-400">{s.paga}</td>
              <td className="px-4 py-2.5 text-right"><ConvBar pct={s.total > 0 ? s.paga/s.total*100 : 0} /></td>
              <td className="px-4 py-2.5 text-right">{fmtBRL(s.valor)}</td>
              <td className="px-4 py-2.5 text-right text-slate-400">{s.aplicativo || '—'}</td>
              <td className="px-4 py-2.5 text-right text-slate-400">{s.vendaDireta || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IrregEmissores({ a }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">#</th><th className="px-4 py-3">Emissor</th><th className="px-4 py-3">Cargo</th>
            <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paga</th>
            <th className="px-4 py-3 text-right">Conv.%</th><th className="px-4 py-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {a.rankingEmissores.map((e, i) => (
            <tr key={e.nome} className={`hover:bg-slate-800/30 ${e.cargo === 'Não cadastrado' ? 'text-amber-400/80' : ''}`}>
              <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
              <td className="px-4 py-2.5 font-medium">{e.nome}</td>
              <td className="px-4 py-2.5"><CargoBadge cargo={e.cargo} /></td>
              <td className="px-4 py-2.5 text-right">{e.total}</td>
              <td className="px-4 py-2.5 text-right text-emerald-400">{e.paga}</td>
              <td className="px-4 py-2.5 text-right"><ConvBar pct={e.total > 0 ? e.paga/e.total*100 : 0} /></td>
              <td className="px-4 py-2.5 text-right">{fmtBRL(e.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IrregTrechos({ a }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">#</th><th className="px-4 py-3">Trecho</th>
            <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paga</th>
            <th className="px-4 py-3 text-right">Conv.%</th><th className="px-4 py-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {a.rankingTrechos.map((t, i) => (
            <tr key={t.trecho} className="hover:bg-slate-800/30">
              <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
              <td className="px-4 py-2.5 font-medium">{t.trecho}</td>
              <td className="px-4 py-2.5 text-right">{t.total}</td>
              <td className="px-4 py-2.5 text-right text-emerald-400">{t.paga}</td>
              <td className="px-4 py-2.5 text-right"><ConvBar pct={t.total > 0 ? t.paga/t.total*100 : 0} /></td>
              <td className="px-4 py-2.5 text-right">{fmtBRL(t.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IrregPlacas({ a, scorePlacas }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">#</th><th className="px-4 py-3">Placa</th>
            {scorePlacas && <th className="px-4 py-3">Score / Risco</th>}
            <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Irreg.</th>
            <th className="px-4 py-3 text-right">Paga</th><th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">Trechos</th><th className="px-4 py-3 text-right">Emissores</th>
            <th className="px-4 py-3">1ª emissão</th><th className="px-4 py-3">Última</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {a.top20Placas.map((p, i) => {
            const s = scorePlacas?.[p.placa]
            return (
              <tr key={p.placa} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
                <td className="px-4 py-2.5 font-mono font-medium">{p.placa}</td>
                {scorePlacas && (
                  <td className="px-4 py-2.5 min-w-[140px]">
                    {s ? <MiniScoreBar score={s.score} nivel={s.nivel} /> : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right font-medium">{p.total}</td>
                <td className="px-4 py-2.5 text-right text-amber-400">{p.irregular}</td>
                <td className="px-4 py-2.5 text-right text-emerald-400">{p.paga}</td>
                <td className="px-4 py-2.5 text-right">{fmtBRL(p.valor)}</td>
                <td className="px-4 py-2.5 text-right text-slate-400">{p.trechosDist}</td>
                <td className="px-4 py-2.5 text-right text-slate-400">{p.emissoresDist}</td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{fmtDate(p.primeira)}</td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{fmtDate(p.ultima)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function IrregRisco({ scorePlacas, config }) {
  const [busca, setBusca] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('todos')

  const sorted = useMemo(() => {
    let list = Object.values(scorePlacas || {}).sort((a, b) => b.score - a.score)
    if (filtroNivel !== 'todos') list = list.filter(p => p.nivel === filtroNivel)
    if (busca) { const b = busca.toUpperCase(); list = list.filter(p => p.placa.includes(b)) }
    return list
  }, [scorePlacas, filtroNivel, busca])

  const contadores = useMemo(() => {
    const all = Object.values(scorePlacas || {})
    return {
      critico: all.filter(p => p.nivel === 'critico').length,
      alto: all.filter(p => p.nivel === 'alto').length,
      medio: all.filter(p => p.nivel === 'medio').length,
      baixo: all.filter(p => p.nivel === 'baixo').length,
    }
  }, [scorePlacas])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { nivel: 'critico', label: 'Crítico', count: contadores.critico },
          { nivel: 'alto',    label: 'Alto',    count: contadores.alto },
          { nivel: 'medio',   label: 'Médio',   count: contadores.medio },
          { nivel: 'baixo',   label: 'Baixo',   count: contadores.baixo },
        ].map(({ nivel, label, count }) => {
          const c = getScoreColors(nivel)
          return (
            <button key={nivel} onClick={() => setFiltroNivel(filtroNivel === nivel ? 'todos' : nivel)}
              className={`p-3 rounded-xl border text-left transition ${filtroNivel === nivel ? `${c.bg} ${c.border} border` : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70'}`}>
              <div className={`text-2xl font-bold ${c.text}`}>{count}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar placa..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3">#</th><th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3 min-w-[160px]">Score / Risco</th>
              <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Irreg.</th>
              <th className="px-4 py-3 text-right">Reincid. 90d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.map((p, i) => (
              <tr key={p.placa} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
                <td className="px-4 py-2.5 font-mono font-medium">{p.placa}</td>
                <td className="px-4 py-2.5 min-w-[160px]"><MiniScoreBar score={p.score} nivel={p.nivel} /></td>
                <td className="px-4 py-2.5 text-right">{p.total}</td>
                <td className="px-4 py-2.5 text-right text-amber-400">{p.irregular}</td>
                <td className="px-4 py-2.5 text-right">
                  {p.reincidente
                    ? <span className="inline-flex items-center gap-1 text-xs text-red-400"><Bell className="w-3 h-3"/>{p.rec90}x</span>
                    : <span className="text-slate-600 text-xs">{p.rec90 > 0 ? p.rec90+'x' : '—'}</span>}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma placa encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AlertasPanel({ scorePlacas, onDismiss }) {
  const reincidentes = useMemo(() =>
    Object.values(scorePlacas || {}).filter(p => p.reincidente).sort((a, b) => b.rec90 - a.rec90),
  [scorePlacas])
  const criticas = Object.values(scorePlacas || {}).filter(p => p.nivel === 'critico')

  if (!reincidentes.length && !criticas.length) return null
  return (
    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/8 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-300">
            {reincidentes.length > 0 && `${reincidentes.length} placa${reincidentes.length > 1 ? 's reincidentes' : ' reincidente'} (3+ em 90 dias)`}
            {reincidentes.length > 0 && criticas.length > 0 && ' · '}
            {criticas.length > 0 && `${criticas.length} placa${criticas.length > 1 ? 's' : ''} nível crítico`}
          </span>
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
      {reincidentes.length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {reincidentes.slice(0, 20).map(p => (
            <span key={p.placa} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-xs font-mono font-medium text-red-300">
              {p.placa} <span className="opacity-60">{p.rec90}x</span>
            </span>
          ))}
          {reincidentes.length > 20 && <span className="text-xs text-slate-500 self-center">+{reincidentes.length - 20} mais</span>}
        </div>
      )}
    </div>
  )
}

// ---- ABA HISTÓRICO ----
function AbaHistorico({ historico, loading, onExcluir, onRecarregar }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Histórico de Relatórios</h2>
          <p className="text-sm text-slate-400 mt-0.5">Últimos relatórios salvos para comparação histórica.</p>
        </div>
        <button onClick={onRecarregar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition" title="Recarregar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : historico.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhum relatório salvo ainda.<br />Processe um CSV e clique em "Salvar histórico".
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Módulo</th><th className="px-4 py-3">Período</th>
                <th className="px-4 py-3 text-right">Registros</th><th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3">Salvo em</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {historico.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.modulo === 'vendas' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {r.modulo === 'vendas' ? 'Vendas' : 'Irregularidades'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{fmtDate(new Date(r.periodo_inicio + 'T12:00:00'))} a {fmtDate(new Date(r.periodo_fim + 'T12:00:00'))}</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(r.total_registros).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{r.nome_arquivo || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(new Date(r.created_at))}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onExcluir(r.id)} className="p-1.5 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- ABA CONFIGURAÇÕES ----
function AbaConfiguracoes({ scoreConfig, onSaveScore, metas, onSaveMeta, onDeleteMeta, funcionarios }) {
  const [subAba, setSubAba] = useState('score')
  const [cfg, setCfg] = useState({ ...scoreConfig })
  const [dirty, setDirty] = useState(false)
  const [metaForm, setMetaForm] = useState({ funcionario_nome: '', mes: new Date().toISOString().slice(0,7), meta_trans: '', meta_valor: '' })
  const [editandoMeta, setEditandoMeta] = useState(null)

  const totalPesos = cfg.wVolume + cfg.wPctIrreg + cfg.wReincid + cfg.wRecencia

  function setPeso(key, val) {
    setCfg(c => ({ ...c, [key]: Number(val) }))
    setDirty(true)
  }
  function setLim(key, val) {
    setCfg(c => ({ ...c, [key]: Number(val) }))
    setDirty(true)
  }

  function handleSaveScore() { onSaveScore(cfg); setDirty(false) }

  function handleSaveMeta(e) {
    e.preventDefault()
    const m = editandoMeta ? { ...editandoMeta, ...metaForm } : { ...metaForm }
    onSaveMeta(m)
    setMetaForm({ funcionario_nome: '', mes: new Date().toISOString().slice(0,7), meta_trans: '', meta_valor: '' })
    setEditandoMeta(null)
  }

  const NIVEIS = [
    { key: 'limCritico', label: 'Crítico', color: 'bg-red-500', desc: '≥ valor → vermelho' },
    { key: 'limAlto',    label: 'Alto',    color: 'bg-orange-400', desc: '≥ valor → laranja' },
    { key: 'limMedio',   label: 'Médio',   color: 'bg-yellow-400', desc: '≥ valor → amarelo' },
  ]

  const PESOS = [
    { key: 'wVolume',   label: 'Volume de ocorrências', desc: 'Peso: qtd absoluta de irregularidades' },
    { key: 'wPctIrreg', label: '% de irregulares',      desc: 'Peso: proporção de notificações irregulares' },
    { key: 'wReincid',  label: 'Reincidência (90d)',     desc: 'Peso: 3+ ocorrências nos últimos 90 dias' },
    { key: 'wRecencia', label: 'Recência',               desc: 'Peso: quão recente foi a última ocorrência' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Configurações</h2>
          <p className="text-sm text-slate-400">Score de risco, metas mensais e exportação de dados.</p>
        </div>
      </div>

      <SubTabs tabs={[['score','Score de Risco'],['metas','Metas Mensais'],['exportar','Exportar Dados']]} aba={subAba} setAba={setSubAba} />

      {subAba === 'score' && (
        <div className="space-y-6 mt-4">
          {/* Pesos */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Pesos da fórmula de score
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${totalPesos === 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                Soma: {totalPesos}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Cada peso define a importância do fator. A soma ideal é 100.</p>
            <div className="space-y-5">
              {PESOS.map(({ key, label, desc }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm text-slate-200">{label}</span>
                      <span className="text-xs text-slate-500 ml-2">{desc}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 w-8 text-right">{cfg[key]}</span>
                  </div>
                  <input type="range" min={0} max={100} value={cfg[key]} onChange={e => setPeso(key, e.target.value)}
                    className="w-full accent-emerald-500 h-1.5 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Limiares */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" /> Limiares de risco
            </div>
            <p className="text-xs text-slate-500 mb-4">Define a faixa de score que classifica cada nível de risco (0–100).</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {NIVEIS.map(({ key, label, color, desc }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${color}`}></span>
                    {label} — {desc}
                  </label>
                  <input type="number" min={0} max={100} value={cfg[key]} onChange={e => setLim(key, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2 items-center">
              <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500" style={{width:`${cfg.limMedio}%`}}/>
                <div className="bg-yellow-400" style={{width:`${cfg.limAlto-cfg.limMedio}%`}}/>
                <div className="bg-orange-400" style={{width:`${cfg.limCritico-cfg.limAlto}%`}}/>
                <div className="bg-red-500 flex-1"/>
              </div>
            </div>
            <div className="flex text-xs text-slate-500 mt-1 justify-between">
              <span>0 — Baixo</span>
              <span>{cfg.limMedio} — Médio</span>
              <span>{cfg.limAlto} — Alto</span>
              <span>{cfg.limCritico} — Crítico</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveScore} disabled={!dirty}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${dirty ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
              Salvar configuração
            </button>
            {!dirty && <span className="text-xs text-slate-500">Configuração salva no navegador</span>}
            {dirty && <span className="text-xs text-amber-400">Alterações não salvas</span>}
            <button onClick={() => { setCfg({ ...DEFAULT_SCORE_CONFIG }); setDirty(true) }}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition">
              Restaurar padrão
            </button>
          </div>
        </div>
      )}

      {subAba === 'metas' && (
        <div className="space-y-4 mt-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" /> {editandoMeta ? 'Editar meta' : 'Nova meta mensal'}
            </div>
            <form onSubmit={handleSaveMeta} className="grid sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Funcionário</label>
                <input list="pc-funcs-list" value={metaForm.funcionario_nome}
                  onChange={e => setMetaForm(m => ({ ...m, funcionario_nome: e.target.value }))}
                  placeholder="Nome do agente" required
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                <datalist id="pc-funcs-list">
                  {funcionarios.map(f => <option key={f.id} value={f.nome} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mês (AAAA-MM)</label>
                <input type="month" value={metaForm.mes} onChange={e => setMetaForm(m => ({ ...m, mes: e.target.value }))} required
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Meta de transações</label>
                <input type="number" min={0} value={metaForm.meta_trans} onChange={e => setMetaForm(m => ({ ...m, meta_trans: e.target.value }))}
                  placeholder="Ex: 500"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Meta de receita (R$)</label>
                <div className="flex gap-2">
                  <input type="number" min={0} step="0.01" value={metaForm.meta_valor} onChange={e => setMetaForm(m => ({ ...m, meta_valor: e.target.value }))}
                    placeholder="Ex: 5000"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition flex-shrink-0">
                    {editandoMeta ? 'Atualizar' : 'Adicionar'}
                  </button>
                  {editandoMeta && (
                    <button type="button" onClick={() => { setEditandoMeta(null); setMetaForm({ funcionario_nome:'', mes: new Date().toISOString().slice(0,7), meta_trans:'', meta_valor:'' }) }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition flex-shrink-0">
                      <X className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Funcionário</th><th className="px-4 py-3">Mês</th>
                  <th className="px-4 py-3 text-right">Meta Trans.</th><th className="px-4 py-3 text-right">Meta Receita</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {metas.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma meta cadastrada.</td></tr>
                )}
                {metas.map(m => (
                  <tr key={m.id || `${m.funcionario_nome}${m.mes}`} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-medium">{m.funcionario_nome}</td>
                    <td className="px-4 py-2.5 font-mono">{m.mes}</td>
                    <td className="px-4 py-2.5 text-right">{m.meta_trans ? m.meta_trans.toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-4 py-2.5 text-right">{m.meta_valor > 0 ? fmtBRL(m.meta_valor) : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditandoMeta(m); setMetaForm({ funcionario_nome: m.funcionario_nome, mes: m.mes, meta_trans: m.meta_trans || '', meta_valor: m.meta_valor || '' }) }}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"><Edit2 className="w-3.5 h-3.5"/></button>
                        <button onClick={() => onDeleteMeta(m.id)} className="p-1.5 rounded hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subAba === 'exportar' && (
        <div className="space-y-4 mt-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-teal-400" /> Exportar configurações
            </div>
            <p className="text-xs text-slate-400 mb-4">Baixa as configurações de score e metas cadastradas como JSON para backup.</p>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify({ scoreConfig: cfg, metas }, null, 2)], { type: 'application/json' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pareceto_config.json'; a.click()
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
              <Download className="w-4 h-4"/> Baixar pareceto_config.json
            </button>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" /> Importar configurações
            </div>
            <p className="text-xs text-slate-400 mb-4">Restaura configurações a partir de um backup JSON exportado anteriormente.</p>
            <label className="cursor-pointer px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition flex items-center gap-2 w-fit">
              <Upload className="w-4 h-4"/> Carregar JSON
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return
                const reader = new FileReader()
                reader.onload = ev => {
                  try {
                    const data = JSON.parse(ev.target.result)
                    if (data.scoreConfig) { setCfg({ ...DEFAULT_SCORE_CONFIG, ...data.scoreConfig }); onSaveScore({ ...DEFAULT_SCORE_CONFIG, ...data.scoreConfig }) }
                    if (data.metas?.length) data.metas.forEach(m => onSaveMeta(m))
                    alert('Configurações importadas com sucesso!')
                  } catch { alert('Arquivo JSON inválido') }
                }
                reader.readAsText(file)
                e.target.value = ''
              }} />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- ROOT ----
export default function PareCetoApp({ usuario, onVoltarHub, onLogout }) {
  useEffect(() => {
    const t = document.title; document.title = 'Pare Certo - Análises'
    return () => { document.title = t }
  }, [])

  const [aba, setAba] = useState('funcionarios')
  const [toast, setToast] = useState(null)

  // Funcionários
  const [funcionarios, setFuncionarios] = useState([])
  const [loadingFuncs, setLoadingFuncs] = useState(true)
  const [modalFunc, setModalFunc] = useState(null)
  const [buscaFunc, setBuscaFunc] = useState('')
  const [filtroCargoFunc, setFiltroCargoFunc] = useState('todos')
  const [filtroStatusFunc, setFiltroStatusFunc] = useState('Ativo')

  // Vendas
  const [dadosVendas, setDadosVendas] = useState(null)
  const [premissasVendas, setPremissasVendas] = useState([])
  const [analiseVendas, setAnaliseVendas] = useState(null)
  const [jornadaVendas, setJornadaVendas] = useState([])
  const [subAbaVendas, setSubAbaVendas] = useState('kpis')
  const [salvandoVendas, setSalvandoVendas] = useState(false)
  const [processandoVendas, setProcessandoVendas] = useState(null)

  // Irregularidades
  const [dadosIrreg, setDadosIrreg] = useState(null)
  const [premissasIrreg, setPremissasIrreg] = useState([])
  const [analiseIrreg, setAnaliseIrreg] = useState(null)
  const [subAbaIrreg, setSubAbaIrreg] = useState('kpis')
  const [salvandoIrreg, setSalvandoIrreg] = useState(false)
  const [processandoIrreg, setProcessandoIrreg] = useState(null)
  const [alertaDismissed, setAlertaDismissed] = useState(false)

  // Score
  const [scoreConfig, setScoreConfig] = useState(() => loadScoreConfig())
  const scorePlacas = useMemo(
    () => dadosIrreg?.records?.length ? computeScorePlacas(dadosIrreg.records, scoreConfig) : null,
    [dadosIrreg, scoreConfig]
  )
  const qtdCriticas = useMemo(
    () => scorePlacas ? Object.values(scorePlacas).filter(p => p.nivel === 'critico').length : 0,
    [scorePlacas]
  )

  // Metas
  const [metas, setMetas] = useState([])
  async function carregarMetas() {
    try { setMetas(await apiFetch('/metas/index.php')) } catch { /* silencioso */ }
  }
  useEffect(() => { carregarMetas() }, [])

  async function handleSaveMeta(form) {
    try {
      if (form.id) {
        await apiFetch(`/metas/index.php?id=${form.id}`, { method: 'PUT', body: JSON.stringify(form) })
      } else {
        await apiFetch('/metas/index.php', { method: 'POST', body: JSON.stringify(form) })
      }
      await carregarMetas()
      showToast('Meta salva')
    } catch (e) { showToast(e.message, 'erro') }
  }
  async function handleDeleteMeta(id) {
    try {
      await apiFetch(`/metas/index.php?id=${id}`, { method: 'DELETE' })
      setMetas(m => m.filter(x => x.id !== id))
    } catch (e) { showToast(e.message, 'erro') }
  }

  // Histórico
  const [historico, setHistorico] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)

  function showToast(msg, tipo = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  async function carregarFuncionarios() {
    setLoadingFuncs(true)
    try { setFuncionarios(await apiFetch('/funcionarios/index.php')) }
    catch (e) { showToast('Erro ao carregar funcionários: ' + e.message, 'erro') }
    finally { setLoadingFuncs(false) }
  }
  useEffect(() => { carregarFuncionarios() }, [])

  async function salvarFuncionario(form) {
    try {
      if (form.id) {
        await apiFetch(`/funcionarios/item.php?id=${form.id}`, { method: 'PUT', body: JSON.stringify(form) })
        showToast('Funcionário atualizado')
      } else {
        await apiFetch('/funcionarios/index.php', { method: 'POST', body: JSON.stringify(form) })
        showToast('Funcionário cadastrado')
      }
      setModalFunc(null); carregarFuncionarios()
    } catch (e) { showToast(e.message, 'erro') }
  }

  async function inativarFuncionario(id) {
    try {
      await apiFetch(`/funcionarios/item.php?id=${id}`, { method: 'DELETE' })
      showToast('Funcionário inativado'); carregarFuncionarios()
    } catch (e) { showToast(e.message, 'erro') }
  }

  const funcsFiltrados = useMemo(() => {
    let list = funcionarios
    if (filtroStatusFunc !== 'todos') list = list.filter(f => f.status === filtroStatusFunc)
    if (filtroCargoFunc !== 'todos') list = list.filter(f => f.cargo === filtroCargoFunc)
    if (buscaFunc) { const b = normalizar(buscaFunc); list = list.filter(f => normalizar(f.nome).includes(b) || normalizar(f.login).includes(b)) }
    return list
  }, [funcionarios, filtroStatusFunc, filtroCargoFunc, buscaFunc])

  async function handleUploadVendas(file) {
    setProcessandoVendas({ pct: 2, label: 'Lendo arquivo...' })
    try {
      const text = await readFileText(file)
      setProcessandoVendas({ pct: 10, label: 'Detectando estrutura...' })
      await new Promise(r => setTimeout(r, 0))
      let linhasLidas = 0
      const { rows, delim } = await parseCSVText(text, null, (ratio, count) => {
        linhasLidas = count
        setProcessandoVendas({ pct: 10 + Math.round(ratio * 72), label: `Processando linhas... ${count.toLocaleString('pt-BR')}` })
      })
      linhasLidas = rows.length
      setProcessandoVendas({ pct: 85, label: 'Classificando por placa...' })
      await new Promise(r => setTimeout(r, 0))
      const { records, premissas } = parseVendas(rows, funcionarios)
      setProcessandoVendas({ pct: 95, label: 'Gerando análise...' })
      await new Promise(r => setTimeout(r, 0))
      setDadosVendas({ records, nomeArquivo: file.name })
      setPremissasVendas([
        `Arquivo: ${file.name}`,
        `Delimitador: ${delim === '\t' ? 'TAB' : delim}`,
        `${linhasLidas.toLocaleString('pt-BR')} linhas no CSV · ${records.length.toLocaleString('pt-BR')} placas únicas`,
        ...premissas,
      ])
      setAnaliseVendas(analyzeVendas(records))
      setJornadaVendas(analyzeJornada(records))
      setSubAbaVendas('kpis')
      showToast(`${records.length.toLocaleString('pt-BR')} transações carregadas`)
    } catch (e) { showToast('Erro ao processar CSV: ' + e.message, 'erro') }
    finally { setProcessandoVendas(null) }
  }

  async function salvarRelatorioVendas() {
    if (!analiseVendas || !dadosVendas?.records?.length) return
    setSalvandoVendas(true)
    try {
      const nomeArq = dadosVendas?.nomeArquivo || ''
      const payload = dadosVendas.records.map(r => ({
        hash_dedup:   r.hashDedup || null,
        placa:        r.placa,
        dt_registro:  r.dtReg     ? r.dtReg.toISOString().slice(0,19).replace('T',' ')     : null,
        dt_inicial:   r.dtInicial ? r.dtInicial.toISOString().slice(0,19).replace('T',' ') : null,
        periodo:      r.periodo   || null,
        usuario:      r.usuario   || null,
        cargo:        r.cargo     || null,
        origem:       r.origem    || null,
        trecho:       r.trecho    || null,
        forma_pag:    r.formaPagamento || null,
        valor:        r.valor,
        irregular:    r.irregular ? 1 : 0,
        canal:        r.canal     || null,
        zona:         r.zona      || null,
        tipo:         r.tipo      || null,
        nome_arquivo: nomeArq,
      }))
      const res = await apiFetch('/vendas/index.php', { method: 'POST', body: JSON.stringify(payload) })
      const partes = [`${res.inseridos} novas`]
      if (res.duplicatas > 0) partes.push(`${res.duplicatas} já existiam`)
      showToast(partes.join(' · '), 'sucesso')
      await apiFetch('/relatorios/index.php', {
        method: 'POST',
        body: JSON.stringify({
          modulo: 'vendas',
          periodo_inicio: analiseVendas.dataMin?.toISOString().slice(0,10) || new Date().toISOString().slice(0,10),
          periodo_fim:    analiseVendas.dataMax?.toISOString().slice(0,10) || new Date().toISOString().slice(0,10),
          total_registros: analiseVendas.totalTrans,
          resumo_json: JSON.stringify({ totalTrans: analiseVendas.totalTrans, totalValor: analiseVendas.totalValor, topAgentes: analiseVendas.rankingAgentes.slice(0,10), premissas: premissasVendas }),
          nome_arquivo: dadosVendas?.nomeArquivo || '',
        }),
      })
    } catch (e) { showToast('Erro ao salvar: ' + e.message, 'erro') }
    finally { setSalvandoVendas(false) }
  }

  async function handleUploadIrreg(file) {
    setProcessandoIrreg({ pct: 2, label: 'Lendo arquivo...' })
    try {
      const text = await readFileText(file)
      setProcessandoIrreg({ pct: 10, label: 'Detectando estrutura...' })
      await new Promise(r => setTimeout(r, 0))
      const { rows, delim } = await parseCSVText(text, ';', (ratio, count) => {
        setProcessandoIrreg({ pct: 10 + Math.round(ratio * 72), label: `Processando linhas... ${count.toLocaleString('pt-BR')}` })
      })
      setProcessandoIrreg({ pct: 85, label: 'Processando irregularidades...' })
      await new Promise(r => setTimeout(r, 0))
      const { records, premissas } = parseIrregularidades(rows, funcionarios)
      setProcessandoIrreg({ pct: 95, label: 'Gerando análise...' })
      await new Promise(r => setTimeout(r, 0))
      setDadosIrreg({ records, nomeArquivo: file.name })
      setPremissasIrreg([
        `Arquivo: ${file.name}`,
        `Delimitador: ${delim === '\t' ? 'TAB' : delim}`,
        `${rows.length.toLocaleString('pt-BR')} linhas no CSV · ${records.length.toLocaleString('pt-BR')} notificações`,
        ...premissas,
      ])
      setAnaliseIrreg(analyzeIrregularidades(records))
      setAlertaDismissed(false)
      setSubAbaIrreg('kpis')
      showToast(`${records.length.toLocaleString('pt-BR')} notificações carregadas`)
    } catch (e) { showToast('Erro ao processar CSV: ' + e.message, 'erro') }
    finally { setProcessandoIrreg(null) }
  }

  async function salvarRelatorioIrreg() {
    if (!analiseIrreg || !dadosIrreg?.records?.length) return
    setSalvandoIrreg(true)
    try {
      const payload = dadosIrreg.records.map(r => ({
        id_csv:       r.id,
        dt_emissao:   r.dtEmissao ? r.dtEmissao.toISOString().slice(0,19).replace('T',' ') : null,
        status:       r.status    || 'Irregular',
        emissor:      r.emissor   || null,
        cargo:        r.cargo     || null,
        trecho:       r.trecho    || null,
        placa:        r.placa     || null,
        valor:        r.valor,
        origem_class: r.origemClass || null,
        semana:       r.semana    || null,
      })).filter(r => r.id_csv)
      const res = await apiFetch('/irregularidades/index.php', { method: 'POST', body: JSON.stringify(payload) })
      await apiFetch('/relatorios/index.php', {
        method: 'POST',
        body: JSON.stringify({
          modulo: 'irregularidades',
          periodo_inicio: analiseIrreg.dataMin?.toISOString().slice(0,10) || new Date().toISOString().slice(0,10),
          periodo_fim:    analiseIrreg.dataMax?.toISOString().slice(0,10) || new Date().toISOString().slice(0,10),
          total_registros: analiseIrreg.total,
          resumo_json: JSON.stringify({ total: analiseIrreg.total, totalPaga: analiseIrreg.totalPaga, pctConversao: analiseIrreg.pctConversao, premissas: premissasIrreg }),
          nome_arquivo: dadosIrreg?.nomeArquivo || '',
        }),
      })
      const partesIr = [`${res.inseridos} novas`]
      if (res.duplicatas > 0) partesIr.push(`${res.duplicatas} já existiam`)
      showToast(partesIr.join(' · '), 'sucesso')
    } catch (e) { showToast('Erro ao salvar: ' + e.message, 'erro') }
    finally { setSalvandoIrreg(false) }
  }

  async function carregarHistorico() {
    setLoadingHist(true)
    try { setHistorico(await apiFetch('/relatorios/index.php')) }
    catch (e) { showToast('Erro ao carregar histórico: ' + e.message, 'erro') }
    finally { setLoadingHist(false) }
  }
  useEffect(() => { if (aba === 'historico') carregarHistorico() }, [aba])

  async function excluirHistorico(id) {
    try {
      await apiFetch(`/relatorios/index.php?id=${id}`, { method: 'DELETE' })
      setHistorico(h => h.filter(r => r.id !== id)); showToast('Registro excluído')
    } catch (e) { showToast(e.message, 'erro') }
  }

  const TABS = [
    { id: 'vendas', label: 'Vendas', Icon: BarChart3 },
    { id: 'irregularidades', label: 'Irregularidades', Icon: AlertTriangle, badge: qtdCriticas },
    { id: 'funcionarios', label: 'Funcionários', Icon: Users },
    { id: 'historico', label: 'Histórico', Icon: Clock },
    { id: 'configuracoes', label: 'Config.', Icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onVoltarHub} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition" title="Voltar ao Hub">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">PC</div>
            <div className="min-w-0">
              <div className="text-base font-semibold leading-tight">Pare Certo — Análises</div>
              <div className="text-xs text-slate-500 truncate">{usuario?.nome || ''}</div>
            </div>
          </div>
          <button onClick={onLogout} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800 transition flex items-center gap-1">
            <LogOut className="w-4 h-4" />Sair
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(({ id, label, Icon, badge }) => (
            <button key={id} onClick={() => setAba(id)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap min-h-[40px] ${aba === id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />{label}
              {badge > 0 && (
                <span className="absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition ${toast.tipo === 'erro' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {aba === 'funcionarios' && (
          <AbaFuncionarios
            funcionarios={funcsFiltrados} todos={funcionarios} loading={loadingFuncs}
            busca={buscaFunc} setBusca={setBuscaFunc}
            filtroCargo={filtroCargoFunc} setFiltroCargo={setFiltroCargoFunc}
            filtroStatus={filtroStatusFunc} setFiltroStatus={setFiltroStatusFunc}
            onNovo={() => setModalFunc({ mode: 'criar', data: { nome: '', login: '', cargo: 'Operador', status: 'Ativo' } })}
            onEditar={f => setModalFunc({ mode: 'editar', data: { ...f } })}
            onInativar={inativarFuncionario}
            onExportXLSX={() => exportFuncionariosXLSX(funcsFiltrados)}
          />
        )}
        {aba === 'vendas' && (
          <AbaVendas
            funcionarios={funcionarios} dados={dadosVendas} premissas={premissasVendas}
            analise={analiseVendas} jornada={jornadaVendas}
            subAba={subAbaVendas} setSubAba={setSubAbaVendas}
            onUpload={handleUploadVendas} onSalvar={salvarRelatorioVendas} salvando={salvandoVendas}
          />
        )}
        {aba === 'irregularidades' && (
          <AbaIrregularidades
            funcionarios={funcionarios} dados={dadosIrreg} premissas={premissasIrreg}
            analise={analiseIrreg}
            subAba={subAbaIrreg} setSubAba={setSubAbaIrreg}
            onUpload={handleUploadIrreg} onSalvar={salvarRelatorioIrreg} salvando={salvandoIrreg}
            scorePlacas={scorePlacas} scoreConfig={scoreConfig}
            alertaDismissed={alertaDismissed} onDismissAlerta={() => setAlertaDismissed(true)}
          />
        )}
        {aba === 'historico' && (
          <AbaHistorico historico={historico} loading={loadingHist} onExcluir={excluirHistorico} onRecarregar={carregarHistorico} />
        )}
        {aba === 'configuracoes' && (
          <AbaConfiguracoes
            scoreConfig={scoreConfig}
            onSaveScore={cfg => { setScoreConfig(cfg); saveScoreConfig(cfg); showToast('Configuração de score salva') }}
            metas={metas} onSaveMeta={handleSaveMeta} onDeleteMeta={handleDeleteMeta}
            funcionarios={funcionarios}
          />
        )}
      </main>

      {modalFunc && (
        <ModalFuncionario data={modalFunc.data} mode={modalFunc.mode} onSalvar={salvarFuncionario} onFechar={() => setModalFunc(null)} />
      )}

      {(processandoVendas || processandoIrreg) && (() => {
        const p = processandoVendas || processandoIrreg
        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center w-80 shadow-2xl">
              <div className="text-base font-semibold text-emerald-400 mb-1">Processando planilha</div>
              <div className="text-sm text-slate-400 mb-4 h-5">{p.label}</div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-200" style={{ width: `${p.pct}%` }} />
              </div>
              <div className="text-xs text-slate-500 mt-2">{p.pct}%</div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
