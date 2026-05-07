/**
 * storage-shim.js — Fase 4
 *
 * Implementa a interface window.storage do MRSys v13 roteando todas as
 * chamadas para a API PHP. O v13 usa:
 *   window.storage.get(key)       → Promise<{ value: jsonString } | null>
 *   window.storage.set(key, json) → Promise<void>
 *   window.storage.delete(key)    → Promise<void>
 *
 * Estratégia:
 *   - get()  → carrega do backend, mapeia para formato v13, cacheia em memória
 *   - set()  → faz diff contra o cache, sincroniza (POST novos, PUT alterados,
 *               soft-delete removidos), atualiza cache
 *   - delete() → limpa cache local (não apaga no backend — dados são preservados)
 */

import api from './api.js'

// Mapa v13-id (string) → API-id (int) — necessário para referências cruzadas
// (ex: fechamento.lancamentos = ['L123'] precisa do API id real para o POST)
const _idMap = new Map()

// Cache em memória: key → array no formato v13
const _cache = {}

// Fila de sync — impede POSTs paralelos que causam duplicatas
let _syncQueue = Promise.resolve()

// ─── helpers ────────────────────────────────────────────────────────────────
const n = v => Number(v) || 0
const normalizar = s =>
  (s || '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// ─── MAPPERS API → v13 ──────────────────────────────────────────────────────

function apiToServico(r) {
  // id = cod serve de chave para recuperação no diffSync (sem este campo
  // serviços recém-criados sem _apiId seriam duplicados na próxima sync)
  _idMap.set(r.codigo, r.id)
  return {
    _apiId: r.id,
    id: r.codigo,
    cod: r.codigo,
    template: r.template,
    descricao: r.descricao,
    cliente: r.cliente_nome,
    cliente_id: r.cliente_id,
    cnpj: r.cnpj_servico || '',
    emissao: r.emissao || '',
    franquiaHoras: n(r.franquia_horas),
    franquiaKm: n(r.franquia_km),
    valorFatura: n(r.valor_fatura),
    diariaPaga: n(r.diaria_paga),
    horaExtraFatura: n(r.hora_extra_fatura),
    horaExtraPaga: n(r.hora_extra_paga),
    kmExtraFatura: n(r.km_extra_fatura),
    kmExtraPago: n(r.km_extra_pago),
    adicionalDomingosFatura: n(r.adicional_domingos_fatura),
    adicionalDomingosPago: n(r.adicional_domingos_pago),
    aliquota: n(r.aliquota),
    categoriaServico: r.categoria_servico || '',
    status: r.status,
  }
}

function apiToFuncionario(r) {
  const v13Id = r.codigo_externo || `F${String(r.id).padStart(3, '0')}`
  _idMap.set(v13Id, r.id)
  return {
    _apiId: r.id,
    id: v13Id,
    nome: r.nome,
    categoria: r.categoria || 'Operacional',
    funcao: r.funcao || '',
    cpf: r.cpf || '',
    rg: r.rg || '',
    dataNascimento: r.data_nascimento || '',
    estadoCivil: r.estado_civil || '',
    nacionalidade: r.nacionalidade || 'Brasileira',
    naturalidade: r.naturalidade || '',
    telefone: r.telefone || '',
    email: r.email || '',
    endereco: r.endereco || '',
    cep: r.cep || '',
    cidade: r.cidade || '',
    uf: r.uf || '',
    salarioFixo: n(r.salario_fixo),
    valorDiaria: n(r.valor_diaria),
    folhaGrupo: r.folha_grupo || '',
    tipoPix: r.tipo_pix || 'CPF',
    chavePix: r.chave_pix || '',
    dataAdmissao: r.data_admissao || '',
    dataDemissao: r.data_demissao || '',
    notas: r.notas || '',
    status: r.status,
    fotoMeta: null,
    documentos: (r.arquivos || []).map(a => ({
      id: a.id, nome: a.nome_original, tipo: a.mime_type, caminho: a.caminho,
    })),
    criadoEm: r.criado_em,
  }
}

function apiToLancamento(r) {
  const v13Id = `L${r.id}`
  _idMap.set(v13Id, r.id)

  // Restaura extras: array {chave,valor} → objeto plano
  const extras = {}
  for (const e of r.extras || []) extras[e.chave] = e.valor
  // Funcionários: role/papel → chave nos extras
  for (const f of r.funcionarios || []) {
    if (f.papel && f.funcionario_nome) extras[f.papel] = f.funcionario_nome
  }

  return {
    _apiId: r.id,
    id: v13Id,
    os: r.os || '',
    data: r.data,
    competencia: r.competencia || '',
    categoriaFolha: r.categoria_folha || '',
    codServico: r.servico_codigo,
    descricao: r.servico_descricao,
    cliente: r.cliente_nome,
    template: r.template,
    horasTrabalhadas: n(r.horas_trabalhadas),
    kmRodados: n(r.km_rodados),
    pedagio: n(r.pedagio),
    batidaExtra: n(r.batida_extra),
    outros: n(r.outros),
    isDomingo: !!r.is_domingo,
    extras,
    observacoes: r.observacao || '',
    status: r.status,
    horasExtras: n(r.horas_extras),
    kmExtras: n(r.km_extras),
    extraHorasFatura: n(r.extra_horas_fatura),
    extraKmFatura: n(r.extra_km_fatura),
    adicDomFatura: n(r.adic_dom_fatura),
    extraHorasPaga: n(r.extra_horas_paga),
    extraKmPago: n(r.extra_km_pago),
    adicDomPago: n(r.adic_dom_pago),
    pedagioFatura: n(r.pedagio_fatura),
    pedagioReembolso: n(r.pedagio_reembolso),
    totalFatura: n(r.total_fatura),
    totalPago: n(r.total_pago),
    aliquota: n(r.aliquota_aplicada),
    imposto: n(r.imposto),
    lucro: n(r.lucro),
    atualizadoEm: r.atualizado_em,
  }
}

function apiToFechamento(r) {
  const v13Id = `F${r.id}`
  _idMap.set(v13Id, r.id)
  const lancamentos = (r.lancamentos || []).map(l => {
    const lid = `L${l.id}`
    _idMap.set(lid, l.id)
    return lid
  })
  return {
    _apiId: r.id,
    id: v13Id,
    numero: r.numero,
    numeroFmt: r.numero_formatado,
    cliente: r.cliente_nome,
    template: r.template,
    periodo: r.competencia,
    competencia: r.competencia,
    dataInicio: r.data_inicio || null,
    dataFim: r.data_fim || null,
    dataFechamento: r.data_fechamento,
    dataVencimento: r.data_vencimento || null,
    dataPagamento: r.data_pagamento || null,
    totalFatura: n(r.total_fatura),
    totalPago: n(r.total_pago),
    totalImposto: n(r.total_imposto),
    lucro: n(r.lucro),
    qtdLancamentos: n(r.qtd_lancamentos),
    lancamentos,
    statusFatura: r.status_fatura,
    nfNumero: r.numero_nf || null,
    historicoStatus: (r.historico_status || []).map(h => ({
      status: h.status_novo, em: h.em, auto: !!h.automatico,
    })),
    custom: !!r.is_custom,
  }
}

function apiToDespesa(r) {
  _idMap.set(`D${r.id}`, r.id)
  return {
    _apiId: r.id,
    id: `D${r.id}`,
    descricao: r.descricao,
    competencia: r.competencia,
    tipo: r.tipo,
    valor: n(r.valor),
    centroCusto: r.centro_custo || '',
    origem: r.origem || '',
    dataLancamento: r.data_lancamento || '',
    dataPagamento: r.data_pagamento || '',
    parcelaAtual: r.parcela_atual ?? null,
    parcelaTotal: r.parcela_total ?? null,
    status: r.status,
    observacoes: r.observacoes || '',
    criadoEm: r.criado_em,
  }
}

function apiToDespChefia(r) {
  _idMap.set(`DC2${r.id}`, r.id)
  return {
    _apiId: r.id,
    id: `DC2${r.id}`,
    descricao: r.descricao,
    competencia: r.competencia,
    tipo: r.tipo,
    valor: n(r.valor),
    origem: r.origem || 'MANHÃES',
    dataLancamento: r.data_lancamento || '',
    dataPagamento: r.data_pagamento || '',
    parcelaAtual: r.parcela_atual ?? null,
    parcelaTotal: r.parcela_total ?? null,
    status: r.status,
    observacoes: r.observacoes || '',
    criadoEm: r.criado_em,
  }
}

function apiToDesconto(r) {
  _idMap.set(`DC${r.id}`, r.id)
  return {
    _apiId: r.id,
    id: `DC${r.id}`,
    competencia: r.competencia,
    alvoNome: r.alvo_nome,
    tipoVale: r.tipo_vale,
    valor: n(r.valor),
    centroCusto: r.centro_custo || '',
    formaPagamento: r.forma_pagamento || '',
    data: r.data || null,
    observacoes: r.observacoes || '',
    criadoEm: r.criado_em,
  }
}

function apiToDiaria(r) {
  _idMap.set(`DI${r.id}`, r.id)
  // Busca o v13-id do funcionário no cache para o modal de edição
  const cachedFuncs = _cache['funcionarios'] || []
  const funcCache = cachedFuncs.find(f => f._apiId === r.funcionario_id)
  const funcionarioId = funcCache?.id ?? r.funcionario_id
  return {
    _apiId:        r.id,
    id:            `DI${r.id}`,
    competencia:   r.competencia,
    data:          r.data,
    funcionarioId,
    nome:          r.nome_snapshot,
    clienteId:     r.cliente_id,
    clienteNome:   r.cliente_nome,
    folhaGrupo:    r.folha_grupo || '',
    valor:         Number(r.valor) || 0,
    observacoes:   r.observacoes || '',
    criadoEm:      r.criado_em,
  }
}

function toApiDiaria(v) {
  // funcionarioId pode ser v13-id ('F001') ou API integer — resolve via _idMap
  const funcionarioApiId = _idMap.get(v.funcionarioId) ?? v.funcionarioId
  return {
    competencia:    v.competencia,
    data:           v.data,
    funcionario_id: funcionarioApiId,
    nome_snapshot:  v.nome,
    cliente_id:     v.clienteId || null,
    cliente_nome:   v.clienteNome || '',
    folha_grupo:    v.folhaGrupo || null,
    valor:          Number(v.valor) || 0,
    observacoes:    v.observacoes || null,
  }
}

function apiToFolha(r) {
  _idMap.set(`FO${r.id}`, r.id)
  return {
    _apiId: r.id,
    id: `FO${r.id}`,
    funcionario_id: r.funcionario_id,
    funcionarioNome: r.funcionario_nome,
    competencia: r.competencia,
    totalLancamentos: n(r.total_lancamentos),
    salarioFixoAplicado: n(r.salario_fixo_aplicado),
    adicionais: n(r.adicionais),
    descontosManuais: n(r.descontos_manuais),
    totalVales: n(r.total_vales),
    bruto: n(r.bruto),
    liquido: n(r.liquido),
    ajustes: r.ajustes || [],
    status: r.status,
    dataPagamento: r.data_pagamento || null,
    observacoes: r.observacoes || '',
    criadoEm: r.criado_em,
  }
}

// ─── MAPPERS v13 → API ──────────────────────────────────────────────────────

const FUNC_EXTRAS = ['agente1', 'agente2', 'agente', 'motorista']

function toApiServico(v, clienteId) {
  return {
    codigo: v.cod,
    cliente_id: clienteId || v.cliente_id,
    template: v.template,
    descricao: v.descricao,
    categoria_servico: v.categoriaServico,
    cnpj_servico: v.cnpj || null,
    emissao: v.emissao || null,
    franquia_horas: n(v.franquiaHoras),
    franquia_km: n(v.franquiaKm),
    valor_fatura: n(v.valorFatura),
    diaria_paga: n(v.diariaPaga),
    hora_extra_fatura: n(v.horaExtraFatura),
    hora_extra_paga: n(v.horaExtraPaga),
    km_extra_fatura: n(v.kmExtraFatura),
    km_extra_pago: n(v.kmExtraPago),
    adicional_domingos_fatura: n(v.adicionalDomingosFatura),
    adicional_domingos_pago: n(v.adicionalDomingosPago),
    aliquota: n(v.aliquota),
    status: v.status || 'ATIVO',
  }
}

function toApiFuncionario(v) {
  return {
    codigo_externo: v.id,
    nome: v.nome,
    categoria: v.categoria || 'Operacional',
    funcao: v.funcao || null,
    cpf: v.cpf || null,
    rg: v.rg || null,
    data_nascimento: v.dataNascimento || null,
    estado_civil: v.estadoCivil || null,
    nacionalidade: v.nacionalidade || 'Brasileira',
    naturalidade: v.naturalidade || null,
    telefone: v.telefone || null,
    email: v.email || null,
    endereco: v.endereco || null,
    cep: v.cep || null,
    cidade: v.cidade || null,
    uf: v.uf || null,
    salario_fixo: n(v.salarioFixo),
    valor_diaria: n(v.valorDiaria),
    folha_grupo: v.folhaGrupo || null,
    tipo_pix: v.tipoPix || 'CPF',
    chave_pix: v.chavePix || null,
    data_admissao: v.dataAdmissao || null,
    data_demissao: v.dataDemissao || null,
    notas: v.notas || null,
    status: v.status || 'ATIVO',
  }
}

function toApiLancamento(v, servicosByCode, funcsByNome) {
  const svc = servicosByCode.get(v.codServico)
  const extras = v.extras || {}

  const funcionarios = FUNC_EXTRAS
    .filter(k => extras[k])
    .map(k => {
      const apiId = funcsByNome.get(normalizar(extras[k]))
      return apiId ? { funcionario_id: apiId, papel: k, participacao_percentual: 100 } : null
    })
    .filter(Boolean)

  const extrasArr = Object.entries(extras)
    .filter(([k]) => !FUNC_EXTRAS.includes(k))
    .map(([chave, valor]) => ({ chave, valor: String(valor ?? '') }))

  return {
    servico_id: svc?._apiId ?? null,
    os: v.os || null,
    data: v.data,
    competencia: v.competencia || null,
    categoria_folha: v.categoriaFolha || null,
    is_domingo: v.isDomingo ? 1 : 0,
    is_feriado: v.isFeriado ? 1 : 0,
    nome_feriado: v.nomeFeriado || null,
    horas_trabalhadas: n(v.horasTrabalhadas),
    km_rodados: n(v.kmRodados),
    pedagio: n(v.pedagio),
    outros: n(v.outros),
    batida_extra: n(v.batidaExtra),
    horas_extras: n(v.horasExtras),
    km_extras: n(v.kmExtras),
    extra_horas_fatura: n(v.extraHorasFatura),
    extra_km_fatura: n(v.extraKmFatura),
    adic_dom_fatura: n(v.adicDomFatura),
    extra_horas_paga: n(v.extraHorasPaga),
    extra_km_pago: n(v.extraKmPago),
    adic_dom_pago: n(v.adicDomPago),
    pedagio_fatura: n(v.pedagioFatura),
    pedagio_reembolso: n(v.pedagioReembolso),
    total_fatura: n(v.totalFatura),
    total_pago: n(v.totalPago),
    aliquota_aplicada: n(v.aliquota),
    imposto: n(v.imposto),
    lucro: n(v.lucro),
    status: v.status || 'pendente',
    observacao: v.observacoes || null,
    funcionarios,
    extras: extrasArr,
  }
}

function toApiFechamento(v, clientesByNome) {
  const lancamentoIds = (v.lancamentos || [])
    .map(vid => _idMap.get(vid))
    .filter(Boolean)
  const clienteId = clientesByNome.get((v.cliente || '').toUpperCase())
  return {
    cliente_id: clienteId ?? null,
    template: v.template,
    competencia: v.periodo || v.competencia,
    data_inicio: v.dataInicio || null,
    data_fim: v.dataFim || null,
    data_vencimento: v.dataVencimento || null,
    total_fatura: n(v.totalFatura),
    total_pago: n(v.totalPago),
    total_imposto: n(v.totalImposto),
    lucro: n(v.lucro),
    status_fatura: v.statusFatura || 'Enviada',
    numero_nf: v.numeroNF || null,
    is_custom: v.custom ? 1 : 0,
    observacoes: v.observacoes || null,
    lancamento_ids: lancamentoIds,
  }
}

function toApiDespesa(v) {
  return {
    descricao: v.descricao,
    competencia: v.competencia,
    tipo: v.tipo || 'AVULSA',
    valor: n(v.valor),
    centro_custo: v.centroCusto || null,
    origem: v.origem || null,
    data_lancamento: v.dataLancamento || null,
    data_pagamento: v.dataPagamento || null,
    parcela_atual: v.parcelaAtual || null,
    parcela_total: v.parcelaTotal || null,
    status: v.status || 'pendente',
    observacoes: v.observacoes || null,
  }
}

function toApiDespChefia(v) {
  return {
    descricao: v.descricao,
    competencia: v.competencia,
    tipo: v.tipo || 'AVULSA',
    valor: n(v.valor),
    origem: v.origem || 'MANHÃES',
    data_lancamento: v.dataLancamento || null,
    data_pagamento: v.dataPagamento || null,
    parcela_atual: v.parcelaAtual || null,
    parcela_total: v.parcelaTotal || null,
    status: v.status || 'pendente',
    observacoes: v.observacoes || null,
  }
}

function toApiDesconto(v) {
  return {
    alvo_nome: v.alvoNome,
    competencia: v.competencia,
    tipo_vale: v.tipoVale || 'VALE',
    valor: n(v.valor),
    centro_custo: v.centroCusto || null,
    forma_pagamento: v.formaPagamento || null,
    data: v.data || null,
    observacoes: v.observacoes || null,
    funcionario_id: v.funcionario_id || null,
  }
}

// ─── LOAD FROM API ───────────────────────────────────────────────────────────

async function loadKey(key) {
  try {
    switch (key) {
      case 'servicos':         return (await api.get('/servicos/index.php') || []).map(apiToServico)
      case 'funcionarios':     return (await api.get('/funcionarios/index.php') || []).map(apiToFuncionario)
      case 'lancamentos':      return (await api.get('/lancamentos/index.php') || []).map(apiToLancamento)
      case 'fechamentos':      return (await api.get('/fechamentos/index.php') || []).map(apiToFechamento)
      case 'despesas':         return (await api.get('/despesas/index.php') || []).map(apiToDespesa)
      case 'descontos':        return (await api.get('/descontos/index.php') || []).map(apiToDesconto)
      case 'folhas':           return (await api.get('/folhas/index.php') || []).map(apiToFolha)
      case 'diarias':          return (await api.get('/diarias/index.php') || []).map(apiToDiaria)
      case 'despChefia':        return (await api.get('/despesas_chefia/index.php') || []).map(apiToDespChefia)
      case 'categoriasFolha':  return (await api.get('/folha_categorias/index.php') || []).map(r => ({ _apiId: r.id, id: `CF${r.id}`, nome: r.nome, cor: r.cor || 'blue' }))
      case 'clientes':         return (await api.get('/clientes/index.php') || []).map(r => ({
        _apiId: r.id,
        id: r.id,
        nome: r.nome,
        razaoSocial: r.razao_social || r.nome,
        cnpj: r.cnpj || '',
        inscricaoEstadual: r.inscricao_estadual || '',
        email: r.contato_email || '',
        telefone: r.contato_telefone || '',
        endereco: r.endereco || '',
        numero: r.numero || '',
        complemento: r.complemento || '',
        bairro: r.bairro || '',
        cidade: r.cidade || '',
        uf: r.uf || '',
        cep: r.cep || '',
        nomeContato: r.contato_nome || '',
        cargoContato: r.cargo_contato || '',
        aliquota: n(r.aliquota),
        observacoes: r.observacoes || '',
        status: r.status || 'ATIVO',
      }))
      default:                 return null
    }
  } catch (e) {
    console.error('[shim] load error', key, e.message)
    return null
  }
}

// ─── SYNC (diff + API calls) ──────────────────────────────────────────────────

async function diffSync({ key, newData, oldData, createFn, updateFn, deleteFn }) {
  const result = [...newData]
  const oldByApiId = new Map(
    (oldData || []).filter(x => x._apiId).map(x => [x._apiId, x])
  )
  // Índice v13-id → _apiId do cache anterior, para recuperar quando o v13
  // recriar um objeto sem o campo _apiId (causa de duplicatas)
  const oldByV13Id = new Map(
    (oldData || []).filter(x => x.id && x._apiId).map(x => [x.id, x._apiId])
  )

  for (let i = 0; i < result.length; i++) {
    let item = result[i]

    // Recupera _apiId perdido: primeiro pelo _idMap em memória, depois pelo cache anterior
    if (!item._apiId && item.id) {
      const recovered = _idMap.get(item.id) ?? oldByV13Id.get(item.id)
      if (recovered) {
        item = { ...item, _apiId: recovered }
        result[i] = item
      }
    }

    if (item._apiId) {
      const old = oldByApiId.get(item._apiId)
      if (!old || JSON.stringify(item) !== JSON.stringify(old)) {
        try { await updateFn(item._apiId, item) } catch (e) { console.error('[shim] update', key, e.message) }
      }
      oldByApiId.delete(item._apiId)
    } else {
      try {
        const created = await createFn(item)
        if (created?.id) {
          result[i] = { ...item, _apiId: created.id }
          if (item.id) _idMap.set(item.id, created.id)
        }
      } catch (e) { console.error('[shim] create', key, e.message) }
    }
  }

  for (const [apiId] of oldByApiId) {
    try { await deleteFn(apiId) } catch (e) { console.error('[shim] delete', key, e.message) }
  }

  return result
}

async function syncServicos(newData) {
  let clientesByNome = new Map()
  try {
    const cl = await api.get('/clientes/index.php')
    for (const c of cl || []) clientesByNome.set(c.nome.toUpperCase(), c.id)
  } catch (_) {}

  // Fallback: deriva cliente_id de serviços já carregados no cache (que têm cliente_id do banco).
  // Garante que novos serviços criados na UI sejam persistidos mesmo se o GET /clientes falhar
  // ou se houver pequena divergência nos nomes.
  const cidPorNomeFallback = new Map()
  for (const s of (_cache['servicos'] || [])) {
    if (s.cliente && s.cliente_id) cidPorNomeFallback.set(s.cliente.toUpperCase(), s.cliente_id)
  }

  const resolveCid = item =>
    item.cliente_id
    || clientesByNome.get((item.cliente || '').toUpperCase())
    || cidPorNomeFallback.get((item.cliente || '').toUpperCase())

  _cache['servicos'] = await diffSync({
    key: 'servicos',
    newData,
    oldData: _cache['servicos'],
    createFn: async item => {
      const cid = resolveCid(item)
      if (!cid) { console.error('[shim] syncServicos: cliente não encontrado para', item.cliente); return null }
      return api.post('/servicos/index.php', toApiServico(item, cid))
    },
    updateFn: async (apiId, item) => {
      const cid = resolveCid(item)
      api.put(`/servicos/item.php?id=${apiId}`, toApiServico(item, cid))
    },
    deleteFn: apiId => api.delete(`/servicos/item.php?id=${apiId}`),
  })
}

async function syncFuncionarios(newData) {
  _cache['funcionarios'] = await diffSync({
    key: 'funcionarios',
    newData,
    oldData: _cache['funcionarios'],
    createFn: item => api.post('/funcionarios/index.php', toApiFuncionario(item)),
    updateFn: (apiId, item) => api.put(`/funcionarios/item.php?id=${apiId}`, toApiFuncionario(item)),
    deleteFn: apiId => api.delete(`/funcionarios/item.php?id=${apiId}`),
  })
}

async function syncLancamentos(newData) {
  const servicosByCode = new Map((_cache['servicos'] || []).map(s => [s.cod, s]))
  const funcsByNome = new Map((_cache['funcionarios'] || []).map(f => [normalizar(f.nome), f._apiId]))

  _cache['lancamentos'] = await diffSync({
    key: 'lancamentos',
    newData,
    oldData: _cache['lancamentos'],
    createFn: async item => {
      const payload = toApiLancamento(item, servicosByCode, funcsByNome)
      if (!payload.servico_id) return null
      return api.post('/lancamentos/index.php', payload)
    },
    updateFn: async (apiId, item) => {
      const payload = toApiLancamento(item, servicosByCode, funcsByNome)
      api.put(`/lancamentos/item.php?id=${apiId}`, payload)
    },
    deleteFn: apiId => api.delete(`/lancamentos/item.php?id=${apiId}`),
  })
}

async function syncFechamentos(newData) {
  let clientesByNome = new Map()
  try {
    const cl = await api.get('/clientes/index.php')
    for (const c of cl || []) clientesByNome.set(c.nome.toUpperCase(), c.id)
  } catch (_) {}

  _cache['fechamentos'] = await diffSync({
    key: 'fechamentos',
    newData,
    oldData: _cache['fechamentos'],
    createFn: async item => {
      const payload = toApiFechamento(item, clientesByNome)
      if (!payload.cliente_id || !payload.lancamento_ids.length) return null
      return api.post('/fechamentos/index.php', payload)
    },
    updateFn: async (apiId, item) => {
      // Only mutable fields after creation
      api.put(`/fechamentos/item.php?id=${apiId}`, {
        status_fatura: item.statusFatura,
        data_vencimento: item.dataVencimento || null,
        data_pagamento: item.dataPagamento || null,
        numero_nf: item.nfNumero || null,
        observacoes: item.observacoes || null,
      })
    },
    deleteFn: apiId => api.delete(`/fechamentos/item.php?id=${apiId}`),
  })
}

async function syncDespesas(newData) {
  _cache['despesas'] = await diffSync({
    key: 'despesas',
    newData,
    oldData: _cache['despesas'],
    createFn: item => api.post('/despesas/index.php', toApiDespesa(item)),
    updateFn: (apiId, item) => api.put(`/despesas/item.php?id=${apiId}`, toApiDespesa(item)),
    deleteFn: apiId => api.delete(`/despesas/item.php?id=${apiId}`),
  })
}

async function syncDespChefia(newData) {
  _cache['despChefia'] = await diffSync({
    key: 'despChefia',
    newData,
    oldData: _cache['despChefia'],
    createFn: item => api.post('/despesas_chefia/index.php', toApiDespChefia(item)),
    updateFn: (apiId, item) => api.put(`/despesas_chefia/item.php?id=${apiId}`, toApiDespChefia(item)),
    deleteFn: apiId => api.delete(`/despesas_chefia/item.php?id=${apiId}`),
  })
}

async function syncDescontos(newData) {
  _cache['descontos'] = await diffSync({
    key: 'descontos',
    newData,
    oldData: _cache['descontos'],
    createFn: item => api.post('/descontos/index.php', toApiDesconto(item)),
    updateFn: (apiId, item) => api.put(`/descontos/item.php?id=${apiId}`, toApiDesconto(item)),
    deleteFn: apiId => api.delete(`/descontos/item.php?id=${apiId}`),
  })
}

async function syncFolhas(newData) {
  // Folhas são geradas pelo backend via fechamentos — sync parcial por ora
  _cache['folhas'] = newData
}

async function syncDiarias(newData) {
  _cache['diarias'] = await diffSync({
    key:      'diarias',
    newData,
    oldData:  _cache['diarias'],
    createFn: item => api.post('/diarias/index.php', toApiDiaria(item)),
    updateFn: (apiId, item) => api.put(`/diarias/item.php?id=${apiId}`, toApiDiaria(item)),
    deleteFn: apiId => api.delete(`/diarias/item.php?id=${apiId}`),
  })
}

async function syncCategoriasFolha(newData) {
  const toApi = v => ({ nome: (v.nome || '').toUpperCase(), cor: v.cor || null })
  _cache['categoriasFolha'] = await diffSync({
    key:      'categoriasFolha',
    newData,
    oldData:  _cache['categoriasFolha'],
    createFn: item => api.post('/folha_categorias/index.php', toApi(item)),
    updateFn: (apiId, item) => api.put(`/folha_categorias/item.php?id=${apiId}`, toApi(item)),
    deleteFn: apiId => api.delete(`/folha_categorias/item.php?id=${apiId}`),
  })
}

function syncKey(key, newData) {
  const run = () => {
    switch (key) {
      case 'servicos':     return syncServicos(newData)
      case 'funcionarios': return syncFuncionarios(newData)
      case 'lancamentos':  return syncLancamentos(newData)
      case 'fechamentos':  return syncFechamentos(newData)
      case 'despesas':     return syncDespesas(newData)
      case 'despChefia':   return syncDespChefia(newData)
      case 'descontos':    return syncDescontos(newData)
      case 'folhas':           return syncFolhas(newData)
      case 'diarias':          return syncDiarias(newData)
      case 'categoriasFolha':  return syncCategoriasFolha(newData)
      default:                 return Promise.resolve(void (_cache[key] = newData))
    }
  }
  // Encadeia na fila — erros de um sync não bloqueiam o próximo
  _syncQueue = _syncQueue.catch(() => {}).then(run)
  return _syncQueue
}

// ─── INTERFACE PÚBLICA ───────────────────────────────────────────────────────

export function initStorageShim() {
  window.storage = {
    async get(key) {
      // Chaves de arquivo (foto/docs) — não suportado nesta fase
      if (key.startsWith('funcfoto_') || key.startsWith('funcdoc_')) return null

      // Servir do cache se já carregado
      if (_cache[key] !== undefined) {
        return { value: JSON.stringify(_cache[key]) }
      }

      // Carregar do backend
      const data = await loadKey(key)
      _cache[key] = data ?? []
      return _cache[key] !== undefined ? { value: JSON.stringify(_cache[key]) } : null
    },

    async set(key, value) {
      if (key.startsWith('funcfoto_') || key.startsWith('funcdoc_')) return
      let parsed
      try { parsed = JSON.parse(value) } catch { return }
      await syncKey(key, parsed)
    },

    async delete(key) {
      delete _cache[key]
    },

    // v63: força recarregar do backend (limpa cache e refaz GET).
    // Útil ao trocar de aba para garantir sync com outros usuários ou outros clientes.
    async refresh(key) {
      if (key.startsWith('funcfoto_') || key.startsWith('funcdoc_')) return null
      // Aguarda fila de sync para não competir com saves em curso
      try { await _syncQueue } catch (_) {}
      const data = await loadKey(key)
      if (data !== null) {
        _cache[key] = data
        return { value: JSON.stringify(data) }
      }
      return null
    },
  }
}
