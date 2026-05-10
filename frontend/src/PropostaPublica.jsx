/**
 * Página pública de visualização e aceite de proposta comercial.
 * Acessada via URL /proposta/:token (sem autenticação).
 *
 * Fluxo:
 *  1. Lê token da URL.
 *  2. GET /api/propostas/publica.php?token=... -> exibe a proposta.
 *  3. Cliente digita CNPJ -> POST /api/propostas/aceitar.php { token, cnpj }.
 *  4. Sucesso -> tela de confirmação com selo de aceite.
 */
import React, { useEffect, useState } from 'react'

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || '/api'

function brl(n) {
  const v = Number(n) || 0
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function maskCNPJ(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function digitsOnly(v) {
  return String(v || '').replace(/\D/g, '')
}

const STATUS_LABEL = {
  Criada: 'Criada',
  Enviada: 'Aguardando aceite',
  'Em análise': 'Em análise',
  Aceita: 'Aceita',
  Rejeitada: 'Rejeitada',
}

export default function PropostaPublica({ token }) {
  const [loading, setLoading] = useState(true)
  const [errorLoad, setErrorLoad] = useState(null)
  const [proposta, setProposta] = useState(null)
  const [cnpj, setCnpj] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorAccept, setErrorAccept] = useState(null)
  const [aceiteOk, setAceiteOk] = useState(null)

  useEffect(() => {
    let abort = false
    setLoading(true)
    setErrorLoad(null)
    fetch(`${API_BASE}/propostas/publica.php?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (r) => {
        const json = await r.json().catch(() => null)
        if (!r.ok || !json?.ok) {
          throw new Error(json?.error || `Erro HTTP ${r.status}`)
        }
        return json.data
      })
      .then((data) => {
        if (abort) return
        setProposta(data)
      })
      .catch((e) => {
        if (abort) return
        setErrorLoad(e.message || 'Falha ao carregar proposta')
      })
      .finally(() => {
        if (!abort) setLoading(false)
      })
    return () => {
      abort = true
    }
  }, [token])

  async function aceitar(e) {
    e?.preventDefault?.()
    setErrorAccept(null)
    const d = digitsOnly(cnpj)
    if (d.length !== 14) {
      setErrorAccept('Digite o CNPJ completo (14 dígitos)')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch(`${API_BASE}/propostas/aceitar.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, cnpj: d }),
      })
      const json = await r.json().catch(() => null)
      if (!r.ok || !json?.ok) {
        throw new Error(json?.error || `Erro HTTP ${r.status}`)
      }
      setAceiteOk(json.data)
    } catch (err) {
      setErrorAccept(err.message || 'Falha ao registrar aceite')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Carregando proposta...</div>
      </div>
    )
  }

  if (errorLoad) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md max-w-md w-full p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl">!</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Proposta indisponível</h1>
          <p className="text-sm text-slate-600">{errorLoad}</p>
          <p className="text-xs text-slate-400 mt-4">
            Se o link foi enviado por e-mail, ele pode ter expirado. Solicite um novo envio ao remetente.
          </p>
        </div>
      </div>
    )
  }

  if (aceiteOk) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-3xl font-bold">✓</div>
          <h1 className="text-xl font-bold text-slate-800 mb-1">Proposta aceita</h1>
          <p className="text-sm text-slate-600 mb-4">
            Proposta <strong>{aceiteOk.numero_formatado}</strong> aceita com sucesso.
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 text-left">
            <div><strong>Data:</strong> {new Date(aceiteOk.data_aceite).toLocaleString('pt-BR')}</div>
            <div className="mt-1"><strong>Status:</strong> {aceiteOk.status}</div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Você receberá uma cópia em breve. Esta confirmação foi registrada com data, horário e endereço de origem.
          </p>
        </div>
      </div>
    )
  }

  if (!proposta) return null

  const itens = Array.isArray(proposta.itens) ? proposta.itens : []
  const jaAceita = proposta.status === 'Aceita'
  const jaRejeitada = proposta.status === 'Rejeitada'
  const podeAceitar = !jaAceita && !jaRejeitada

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center font-bold text-base tracking-tight">
            MR
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-indigo-200">Grupo MR · Segurança e Escolta Armada</div>
            <h1 className="text-lg sm:text-xl font-bold truncate">Proposta Comercial {proposta.numero_formatado}</h1>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status banner */}
        {jaAceita && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
            Esta proposta já foi <strong>aceita</strong>{proposta.data_aceite ? ` em ${new Date(proposta.data_aceite).toLocaleString('pt-BR')}` : ''}.
          </div>
        )}
        {jaRejeitada && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
            Esta proposta foi marcada como <strong>rejeitada</strong>.
          </div>
        )}

        {/* Cabeçalho da proposta */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase text-slate-500">Cliente</div>
              <div className="font-medium text-slate-800 break-words">{proposta.cliente_razao || proposta.cliente_nome || '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">CNPJ</div>
              <div className="font-medium text-slate-800">{proposta.cliente_cnpj_mascarado || '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Categoria</div>
              <div className="font-medium text-slate-800">{proposta.categoria}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Status</div>
              <div className="font-medium text-slate-800">{STATUS_LABEL[proposta.status] || proposta.status}</div>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <div className="text-xs uppercase text-slate-500">Vencimento</div>
              <div className="font-medium text-slate-800">{proposta.vencimento || '—'}</div>
            </div>
            <div className="col-span-2 sm:col-span-2 text-right">
              <div className="text-xs uppercase text-slate-500">Valor total</div>
              <div className="text-2xl font-bold text-indigo-700">R$ {brl(proposta.valor_total)}</div>
            </div>
          </div>
        </div>

        {/* Itens */}
        {itens.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-800">Itens da proposta</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Descrição</th>
                    {proposta.categoria === 'FACILITIES' && (
                      <>
                        <th className="text-center px-3 py-2">Efetivo</th>
                        <th className="text-left px-3 py-2">Escala</th>
                      </>
                    )}
                    <th className="text-right px-3 py-2">Qtd.</th>
                    <th className="text-right px-3 py-2">Unit.</th>
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it) => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-800">{it.descricao}</td>
                      {proposta.categoria === 'FACILITIES' && (
                        <>
                          <td className="px-3 py-2 text-center text-slate-700">{it.efetivo ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{it.escala || '—'}</td>
                        </>
                      )}
                      <td className="px-3 py-2 text-right text-slate-700">{Number(it.quantidade).toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-right text-slate-700">R$ {brl(it.valor_unitario)}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">R$ {brl(it.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Condições / observações */}
        {(proposta.condicoes_comerciais || proposta.condicoes_faturamento || proposta.prazos || proposta.observacoes) && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4 text-sm">
            {proposta.condicoes_comerciais && (
              <div>
                <h3 className="text-xs uppercase font-semibold text-slate-500 mb-1">Condições comerciais</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{proposta.condicoes_comerciais}</p>
              </div>
            )}
            {proposta.condicoes_faturamento && (
              <div>
                <h3 className="text-xs uppercase font-semibold text-slate-500 mb-1">Condições de faturamento</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{proposta.condicoes_faturamento}</p>
              </div>
            )}
            {proposta.prazos && (
              <div>
                <h3 className="text-xs uppercase font-semibold text-slate-500 mb-1">Prazos</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{proposta.prazos}</p>
              </div>
            )}
            {proposta.observacoes && (
              <div>
                <h3 className="text-xs uppercase font-semibold text-slate-500 mb-1">Observações</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{proposta.observacoes}</p>
              </div>
            )}
          </div>
        )}

        {/* Form de aceite */}
        {podeAceitar && (
          <form
            onSubmit={aceitar}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5"
          >
            <h2 className="font-semibold text-slate-800 mb-1">Aceitar proposta</h2>
            <p className="text-sm text-slate-600 mb-4">
              Para confirmar o aceite, digite o <strong>CNPJ do tomador</strong> dos serviços. O aceite ficará registrado com data, horário e endereço de origem.
            </p>
            <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">CNPJ</label>
            <input
              type="text"
              inputMode="numeric"
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={submitting}
              autoComplete="off"
            />
            {errorAccept && (
              <div className="mt-3 text-sm bg-red-50 border border-red-200 text-red-800 rounded p-2.5">
                {errorAccept}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || digitsOnly(cnpj).length !== 14}
              className="mt-4 w-full sm:w-auto bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-md transition min-h-[40px]"
            >
              {submitting ? 'Processando...' : 'Aceitar proposta'}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-400 pt-2 pb-6">
          MRSys · Grupo MR · Sistema de Gestão
        </div>
      </div>
    </div>
  )
}
