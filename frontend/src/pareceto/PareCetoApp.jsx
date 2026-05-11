import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, LogOut, Upload, Users, BarChart3, AlertTriangle, Clock, Plus, Edit2, Trash2, Download, FileText, RefreshCw, X, Check, Search } from 'lucide-react'
import * as XLSX from 'xlsx'

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

  const datas = records.filter(r => r.dtReg).map(r => r.dtReg)
  return {
    totalTrans, totalValor, ticketMedio: totalValor / totalTrans,
    porCanal, porZona, porTipo, rankingAgentes, rankingTrechos,
    comIrreg: records.filter(r => r.irregular).length,
    dataMin: datas.length ? new Date(Math.min(...datas)) : null,
    dataMax: datas.length ? new Date(Math.max(...datas)) : null,
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

function exportIrreguXLSX(analise, records) {
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
    ['#', 'Placa', 'Total', 'Irregular', 'Paga', 'Valor (R$)', 'Trechos dist.', 'Emissores', '1ª emissão', 'Última'],
    ...a.top20Placas.map((p, i) => [i+1, p.placa, p.total, p.irregular, p.paga, p.valor, p.trechosDist, p.emissoresDist, fmtDate(p.primeira), fmtDate(p.ultima)]),
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

function AbaVendas({ funcionarios, dados, premissas, analise, jornada, subAba, setSubAba, onUpload, onSalvar, salvando }) {
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

  return (
    <div>
      <ActionBar
        titulo="Análise de Vendas"
        sub={`${dados.nomeArquivo} · ${dados.records.length} transações`}
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
      <SubTabs tabs={[['kpis','KPIs'],['agentes','Agentes'],['trechos','Trechos'],['jornada','Jornada']]} aba={subAba} setAba={setSubAba} />
      {analise && subAba === 'kpis' && <VendasKPIs a={analise} />}
      {analise && subAba === 'agentes' && <VendasAgentes a={analise} />}
      {analise && subAba === 'trechos' && <VendasTrechos a={analise} />}
      {subAba === 'jornada' && <VendasJornada jornada={jornada} />}
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

// ---- ABA IRREGULARIDADES ----
function AbaIrregularidades({ funcionarios, dados, premissas, analise, subAba, setSubAba, onUpload, onSalvar, salvando }) {
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
        onExportXLSX={analise ? () => exportIrreguXLSX(analise, dados.records) : null}
        onSalvar={onSalvar} salvando={salvando}
      />
      {premissas.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400">
          <strong className="text-slate-300">Premissas:</strong> {premissas.join(' · ')}
        </div>
      )}
      <SubTabs tabs={[['kpis','KPIs'],['semanas','Por Semana'],['emissores','Emissores'],['trechos','Trechos'],['placas','Top 20 Placas']]} aba={subAba} setAba={setSubAba} />
      {analise && subAba === 'kpis' && <IrregKPIs a={analise} />}
      {analise && subAba === 'semanas' && <IrregSemanas a={analise} />}
      {analise && subAba === 'emissores' && <IrregEmissores a={analise} />}
      {analise && subAba === 'trechos' && <IrregTrechos a={analise} />}
      {analise && subAba === 'placas' && <IrregPlacas a={analise} />}
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

function IrregPlacas({ a }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3">#</th><th className="px-4 py-3">Placa</th>
            <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Irreg.</th>
            <th className="px-4 py-3 text-right">Paga</th><th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">Trechos</th><th className="px-4 py-3 text-right">Emissores</th>
            <th className="px-4 py-3">1ª emissão</th><th className="px-4 py-3">Última</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {a.top20Placas.map((p, i) => (
            <tr key={p.placa} className="hover:bg-slate-800/30">
              <td className="px-4 py-2.5 text-slate-500 text-xs">{i+1}</td>
              <td className="px-4 py-2.5 font-mono font-medium">{p.placa}</td>
              <td className="px-4 py-2.5 text-right font-medium">{p.total}</td>
              <td className="px-4 py-2.5 text-right text-amber-400">{p.irregular}</td>
              <td className="px-4 py-2.5 text-right text-emerald-400">{p.paga}</td>
              <td className="px-4 py-2.5 text-right">{fmtBRL(p.valor)}</td>
              <td className="px-4 py-2.5 text-right text-slate-400">{p.trechosDist}</td>
              <td className="px-4 py-2.5 text-right text-slate-400">{p.emissoresDist}</td>
              <td className="px-4 py-2.5 text-xs text-slate-400">{fmtDate(p.primeira)}</td>
              <td className="px-4 py-2.5 text-xs text-slate-400">{fmtDate(p.ultima)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    { id: 'irregularidades', label: 'Irregularidades', Icon: AlertTriangle },
    { id: 'funcionarios', label: 'Funcionários', Icon: Users },
    { id: 'historico', label: 'Histórico', Icon: Clock },
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
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setAba(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap min-h-[40px] ${aba === id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />{label}
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
          />
        )}
        {aba === 'historico' && (
          <AbaHistorico historico={historico} loading={loadingHist} onExcluir={excluirHistorico} onRecarregar={carregarHistorico} />
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
