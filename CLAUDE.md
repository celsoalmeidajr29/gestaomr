# Contexto do Projeto MRSys — para Claude Code

Este arquivo é lido automaticamente pelo Claude Code ao abrir esta pasta. Ele contém o contexto necessário para você continuar o desenvolvimento de onde a conversa anterior parou.

---

## 1. O que é o MRSys

Sistema de Fechamento Financeiro de uma empresa de segurança e escolta armada (Grupo MR), em produção no Hostinger. O sistema gerencia:

- Catálogo de serviços (operações: NATURA, IRB, TOMBINI, ESCOLTECH, BRK)
- Lançamentos diários (cada operação executada com KM, horas, funcionários)
- Faturas (fechamentos) mensais por cliente, com numeração própria (F-0001, F-0002...)
- Folha de pagamento consolidada por funcionário
- Despesas, vales (descontos), funcionários com foto e documentos
- PDFs gerados via popup `window.print()`: Ficha Cadastral, Folha Consolidada, Recibo de Prestação de Serviços
- Importação/exportação XLSX via SheetJS

Gestor/usuário principal: **Celso Almeida** (`celso.almeida@grupomr.seg.br`)

---

## 2. Estado Atual

**Todas as 7 fases concluídas. Sistema em produção.**

| Fase | Status | Entregáveis |
|---|---|---|
| Fase 1 — Schema | ✅ Concluída | `database/schema.sql` (17 tabelas, views, triggers) |
| Fase 2 — Bootstrap PHP | ✅ Concluída | `backend/_bootstrap.php`, `backend/api/auth/`, `frontend/src/api.js` |
| Scaffold Frontend | ✅ Concluída | `frontend/` com Vite 5 + React 18 + Tailwind 3 |
| Fase 3 — APIs CRUD | ✅ Concluída | ~60 endpoints PHP em `backend/api/` |
| Fase 4 — Adapter | ✅ Concluída | Substituição de `window.storage` por `api.js` |
| Fase 5 — Migração | ✅ Concluída | Script importa JSON do v13 pro banco MySQL |
| Fase 6 — Permissões | ✅ Concluída | `require_permission()`, triggers de auditoria |
| Fase 7 — Deploy | ✅ Concluída | GitHub Actions → FTP → Hostinger, banco configurado |

### Versão ativa do monolito

**`MRSys_v93.jsx`** — `frontend/src/App.jsx` é wrapper que repassa props para o monolito:
```jsx
import MRSysApp from './versions/MRSys_v93.jsx'
export default function App(props) { return <MRSysApp {...props} /> }
```

Novidades v92–v93 (folha + Cora UI):
- **v93** — Folha: filtro por status na tela (todos / pendente / transferido / pago / cancelada)
- **v92** — Folha: marcar status manualmente (ação em massa + individual)
- **v91** — Cora UI deixa explícito "Valor líquido" no botão Transferir (comportamento já estava correto)
- **Hotfix shim** — `syncFolhas` no storage-shim agora persiste no DB (era só cache em memória)

Novidades v87–v88 (preparação para Cora):
- **v88** — indicadores "Sem PIX" (Funcionários + Folha) + status `pendente/transferido/pago/cancelada` no fluxo da folha + estrutura `cora-certs/` (pastas `mr-assessoria/` e `up-vigilancia/`)
- **v87** — PDF do resumo + dashboard com filtro de mês + folha status `pendente/paga/cancelada` (precursor do v88) + faturas XML com lançamento sintético

Integração Cora (PIX em massa para folha) — F1 a F4:
- **F1** — migration `009_transferencias_cora.sql` (tabelas `transferencias_cora` + `cora_webhook_logs`) + cliente PHP com auth JWT+mTLS (`backend/api/cora/_cora_client.php`) + receiver de webhooks
- **F2** — botão "Transferir" na aba Folha + endpoint PIX em massa (`POST /api/cora/transferir.php`)
- **F3** — processamento de webhooks Cora + listagem de logs (`/api/cora/webhook.php`, `/api/cora/logs.php`)
- **F4** — histórico de transferências com retry + auditoria de webhooks (`/api/cora/listar.php`)
- Migration `010_folhas_status_cora.sql` — estende ENUM de `folhas.status` para `pendente/transferido/pago/cancelada`
- Probes/diagnóstico ainda no repo: `backend/api/cora/probe-aud.php`, `probe-auth-method.php`, `probe-token-url.php`, `test_auth.php`, `diag-certs.php` — usados pra resolver `invalid_client` no stage da Cora. **Token endpoint correto:** `matls-clients.api.stage.cora.com.br`. Limpar quando integração estiver estável em prod.

Novidades v83–v86 (relatório + UX lançamentos):
- **v86** — salvamento de resumos (snapshot persistente) + Relatório Gerencial no export XLSX
- **v85** — Relatório Gerencial - Despesas no Resumo (folha líquida + cartão/empresa + galop + chefia). Linha "Combustível da Empresa" (despesas operacionais com origem GALOP); Manhães/Ricardo unificam `despChefia` + despesas operacionais com mesma origem (comparação via `normalizar()` para tirar acento)
- **v84** — ação em massa para atribuir prestador em lançamentos selecionados
- **v83** — filtro "Sem prestador" na aba Lançamentos + banner de alerta

Novidades v76–v82 (folha por categoria — fonte única):
- **v82** — resumo folha categoriza direto por `l.categoriaFolha` + `d.folhaGrupo` (alinha com Dashboard); diagnóstico de ATIVOs sem folha
- **v81** — folha bruta = lançamentos + avulsos (sem adicionais); líquido = bruto + adic - desc
- **v80** — folha por categoria com atribuição por lançamento, avulsos e adicionais (fonte única `folhasPorFunc`)
- **v79** — resumo folha por categoria usa `folhasPorFunc` (elimina divergência com aba Folha)
- **v78** — bruto na folha inclui avulsos + export XLSX por categoria/funcionário
- **v77** — export resumo XLSX Aba 2 alinhada com painel Folha por Categoria
- **v76** — bruto da folha inclui lançamentos avulsos nos PDFs

Novidades v70–v75 (XML NF-e iterações + edição de fatura):
- **v75** — fatura M ROCHA não desaparece mais (`template null → ''` aceito)
- **v74** — `fecharFatura` preserva custom/XML; `updateFn` aguarda PUT
- **v73** — faturas não somem mais com status `NF-emitida`/`Aprovada` vencidas
- **v72** — editar cliente da fatura (lápis no card + persistência no banco)
- **v71** — XML NF-e usa `ValorServicos` (sem retenções) + editar competência de fatura pelo lápis
- **v70** — medição não-Natura com KM e horas detalhados no PDF e XLSX
- Hotfixes: `syncClientes` ausente no storage-shim (clientes não persistiam); faturas importadas via XML não persistiam (`nfNumero` no payload + permitir fatura custom sem lançamentos)

Novidades v69:
- **Importar XML NF-e**: botão "Importar XML NF-e" na aba Faturas. Lê arquivo XML padrão SEFAZ (DOMParser), extrai nNF, data, emitente/destinatário (matching automático de cliente por CNPJ), valor, competência. Campos editáveis antes de confirmar. Gera fatura com status "NF-emitida" diretamente
- **Import Despesas da Chefia**: botão "Importar (XLSX/Texto)" na aba Desp. Chefia. Mesmo padrão das despesas normais (2 abas: XLSX + texto colado, modelo baixável, preview). Origem obrigatória: MANHÃES ou RICARDO

Novidades v68:
- **Aba "Faturas"**: aba renomeada de "Fechamentos" para "Faturas" em toda a UI. ID interno `fechamentos` mantido
- **NF número**: mudar status → "NF-emitida" abre modal para informar número e data da NF. Badge no card. Persiste em `numero_nf` no banco
- **Exportar XML NF-e**: botão "XML NF-e" — modal com filtro por cliente, lista NFs emitidas, baixa XML com 1 `<NF>` por fatura (Número, Data, Tomador, Valor)
- **Fix crítico medição**: backend GET /fechamentos agora inclui IDs dos lançamentos. Corrige XLSX e PDF vazios ao enviar medição por email
- **Fix shim**: `nfNumero` mapeado corretamente para `numero_nf` no DB

Novidades v67:
- **ModalBase reescrito**: scroll correto — outer `overflow-y-auto`, inner `flex min-h-full items-start justify-center`. Funciona com qualquer altura de conteúdo
- **Campo spans estáticos**: objeto SPAN map substitui `sm:col-span-${span}` (não detectado pelo Tailwind JIT). Corrige campos de endereço com largura errada
- **ModalFuncionario layout**: grid único `sm:grid-cols-2`, nome como primeiro campo (topo), foto via CSS grid placement. Campo nome agora acessível imediatamente na edição

Novidades v66:
- Fix responsividade em altas resoluções: wrapper `flex` ganhou `max-w-7xl mx-auto`, alinhando sidebar+conteúdo com o header centralizado

Novidades v65:
- Nova aba **"Despesas da Chefia"**: CRUD para despesas de MANHÃES e RICARDO, separadas das operacionais. Breakdown por origem com badges coloridos. Conectado ao backend `/api/despesas_chefia/` + migration 008
- **Sidebar recolhível**: toggle com ChevronLeft/Right. Recolhido = 52px (ícones apenas); expandido = 164px (ícone + label)
- **Despesas aba**: tabela "Por Origem" (breakdown do total filtrado por cada origem)
- **Resumo**: Painel 7 "Despesas da Chefia" com botões ×, incluída no custoTotal e no card de resumo (violeta)
- Export XLSX Resumo: nova aba "Desp. Chefia", faturamento consolidado por cliente (respeita exclusões ×)
- Dados de chefia incluídos em `resumoFechamento` e `resumoLimpo`

Novidades v64:
- Fix: serviços criados manualmente agora persistem no banco (`storage-shim` com fallback de `cliente_id` + `loadKey('clientes')` carrega do banco)
- Sidebar lateral com labels completos e legíveis (160px, ícone + texto lado a lado)
- Resumo: painel "1. Faturamento" exibe somente visão consolidada por cliente (NATURA agrupada numa linha)

Novidades v63 (base):
- Auto-refresh ao trocar de aba (`window.storage.refresh(key)` no shim) com indicador "Sincronizando..." no header
- Sidebar lateral em md+ com ícones (mobile mantém tabs scrolláveis)
- Importação de despesas por XLSX/Texto (mesmo padrão das diárias avulsas)
- Dashboard "Pago" agora soma lançamentos avulsos das competências com fatura gerada
- Folha de pagamento: funcionários com APENAS lançamentos avulsos passam a aparecer na folha
- Fix duplicação de avulsos: backend `POST /diarias` retorna o registro completo quando insert único
- SistemasHub mostra badge da versão atual do MRSys

A partir de v49, o `App` recebe `{ onVoltarHub, onLogout }` do `SistemasHub.jsx` (após login).

Histórico completo de versões no Obsidian: `01 - Projetos/MRSys/Histórico de Versões.md`

### Artefatos de referência em `docs/`

- `MRSys_v13.jsx` — versão React monolítica original (3.426 linhas, referência histórica)
- `MRSys_database.sql` — schema MySQL de referência (usar `database/schema.sql`)
- `MRSys_Plano_Migracao_Web.docx` — plano executivo (10 seções)
- `Modelo_Importacao_Funcionarios.xlsx` — template de importação

---

## 3. Decisões já tomadas (NÃO REDISCUTIR)

Estas decisões foram debatidas e aprovadas. Trate como invariantes:

| Item | Decisão |
|---|---|
| Hospedagem (backend) | Hostinger cPanel (já contratado) |
| Hospedagem (frontend) | **Hostinger cPanel** — build estática React servida pelo mesmo Apache do backend |
| Stack backend | PHP 8.x nativo (sem framework) + MySQL 8 |
| Stack frontend | Manter React (build estática) + API JSON |
| Cross-origin | Frontend e backend no **mesmo domínio** (sem CORS). Cookie `SameSite=Lax`. Domínio principal: `celso.cloud` |
| Deploy | Push para `main` → GitHub Actions → FTP → Hostinger (`.github/workflows/deploy.yml`) |
| Cor principal | Navy Blue `#1E3A8A` |
| Usuários simultâneos | 2-5 (financeiro/admin) |
| Usuário inicial | Apenas Celso, perfil admin, e-mail `celso.almeida@grupomr.seg.br` |
| Versionamento | A cada alteração no monolito, salvar como `MRSys_v{N}.jsx` em `frontend/src/versions/` |

---

## 4. Modelo de dados (resumo)

20 tabelas no MySQL agrupadas em 6 áreas:

- **Auth (3):** `perfis`, `usuarios`, `sessoes`
- **Cadastros (3):** `clientes` (5 iniciais — migration 004 adicionou `razao_social`, `aliquota`, `numero`, `complemento`, `bairro`, `cargo_contato`), `servicos` (17 iniciais), `funcionarios` (migration 003 adicionou `folha_grupo`)
- **Operação (6):** `lancamentos`, `lancamento_funcionarios` (M:N), `lancamento_extras`, `despesas`, `descontos`, `despesas_chefia` (migration 008)
- **Fechamento (4):** `fechamentos` (com `numero_nf`, `data_nf`), `fechamento_lancamentos`, `fechamento_status_log`, `folhas` (migration 010 estende ENUM de `status` para `pendente/transferido/pago/cancelada`)
- **Integração Cora (2):** `transferencias_cora`, `cora_webhook_logs` (migration 009)
- **Auxiliares (2):** `arquivos` (foto+docs com path em disco), `auditoria` (log automático)

Mais 3 views (`vw_lancamentos_completo`, `vw_fechamentos_completo`, `vw_resumo_competencia`), uma tabela auxiliar `folha_categorias` (migration 007) e triggers de auditoria automática.

Migrations aplicadas até o momento: 001 a 010 (`database/migrations/`).

Schema completo em `database/schema.sql`. **NÃO altere o schema sem antes documentar a mudança em `database/migrations/`.**

---

## 5. Templates de cliente (regra de negócio crítica)

Cada cliente tem seu template que define o ciclo de cobrança e estrutura de campos:

| Template | Cliente | Ciclo | Notas |
|---|---|---|---|
| `NATURA_NOTURNA` | NATURA COSMÉTICOS | dia 1 → último dia do mês | Campos BASE e TIPO extras (varia entre Cajamar/SP/RJ) |
| `NATURA_MOTOLINK` | NATURA COSMÉTICOS | dia 1 → último dia do mês | Idem |
| `IRB_ITRACKER` | IRB LOGÍSTICA | dia 1 → último dia | Padrão |
| `TOMBINI` | GRUPO TOMBINI | dia 1 → último dia | Padrão |
| `ESCOLTECH` | ESCOLTECH | dia 1 → último dia | Padrão |
| `BRK` | BRK TECNOLOGIA | dia 26 → dia 25 do mês seguinte | Único cliente com ciclo deslocado |

**Alíquotas por cliente:** NATURA e BRK usam **15.60%**; IRB, TOMBINI e ESCOLTECH usam **8.65%**.

---

## 6. Continuidade — como trabalhar no monolito

O sistema está em produção e o trabalho agora é iterativo: correções de bugs e novas funcionalidades no monolito.

**Fluxo padrão para cada alteração:**

1. Copiar `MRSys_v{N}.jsx` → `MRSys_v{N+1}.jsx`
2. Editar o novo arquivo
3. Atualizar `frontend/src/App.jsx` para apontar para `v{N+1}`
4. Commit + push → deploy automático via GitHub Actions
5. Atualizar `Histórico de Versões.md` no Obsidian e este `CLAUDE.md`

**Imports/Exports disponíveis (v53):**

Imports (com modelos XLSX baixáveis e parsers permissivos):
- Funcionários (planilha cheia, ~20 colunas) — aba Funcionários
- **Salários fixos** (Nome, Salário, Grupo Folha) — aba Folha → modal com 2 modos: **XLSX** ou **Texto colado** (v52)
- **Diárias avulsas** (Data, Nome, Valor, Tipo de Folha) — aba Diárias → 2 botões: **Importar XLSX** ou **Importar texto** (v50/v52)

Exports XLSX:
- `exportarFaturaXLSX` — fatura por cliente (router Natura / padrão)
- `exportarFaturaNaturaXLSX` — fatura NATURA com 17 colunas no padrão da planilha
- `exportarFaturaPadraoXLSX` — fatura padrão (demais clientes)
- `exportarResumoFechamentoXLSX` — 7 abas: Faturamento, Folha Clientes, Salários Fixos, Adiantamentos, Despesas Fixas, Avulsas, Parcelamentos
- `exportarServicosXLSX` — catálogo de serviços (19 colunas)
- `exportarFuncionariosXLSX` — cadastro de funcionários (20 colunas)
- `exportarDespesasXLSX` — despesas filtradas (2 abas: listagem + resumo por tipo)
- `exportarDescontosXLSX` — vales filtrados (2 abas: listagem + resumo por tipo de vale)

---

## 7. Convenções deste projeto

### Código JSX (frontend)

- **Monolito intencional:** tudo em `App.jsx`. Não dividir em componentes separados sem necessidade.
- **Tailwind classes inline:** sem CSS separado.
- **Estado React puro:** sem Redux/Zustand. Tudo em `useState`/`useReducer` no componente raiz.
- **Funções nomeadas para handlers:** `salvarServico`, `excluirFuncionario`, etc — facilita auditoria.
- **Snapshot no momento:** ao calcular um lançamento, congele a alíquota e os valores num campo do próprio lançamento. Mudanças posteriores no serviço não devem afetar lançamentos antigos.

### PHP (backend)

- **Sem framework.** PDO direto, prepared statements sempre.
- **Estrutura de retorno padrão:** `{ "ok": bool, "data": ..., "error": "..." }`
- **Auditoria via trigger SQL** sempre que possível (já modelada no schema)
- **`@usuario_id` SQL variable** setada no início de cada request autenticado, lida pelos triggers

### Versionamento (Git)

- **Branch principal:** `main`
- **Commits em português**, formato: `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`

### Validação obrigatória após edits

Antes de declarar um módulo "pronto", rode estes checks:

```bash
# Frontend (se alterado)
cd frontend && npm run lint && npm run build

# Sintaxe PHP (se alterado)
php -l backend/_bootstrap.php
php -l backend/api/**/*.php
```

---

## 8. Comportamentos importantes do sistema

Estes detalhes não são óbvios e foram consolidados ao longo do desenvolvimento:

- **Status de fatura** vai de `Enviada → Aprovada → NF-emitida → Paga`. `Vencida` é marcada automaticamente quando a data de vencimento passa e o status não é `Paga`. Histórico em `fechamento_status_log`.
- **Categorias de serviço (5 valores atuais):** `MOTOLINK RJ`, `VELADA RJ`, `VELADA SP`, `ARMADA`, `FACILITIES`. Cada uma com cor própria no frontend. Valores antigos (`MOTOLINK`, `VELADA`, `PRONTA RESPOSTA`) foram migrados nas versões v26/v34.
- **Resumo de Fechamento (aba)** tem botão `×` em cada linha que filtra do resumo e do XLSX exportado (não apaga dado real). Útil quando você precisa entregar uma planilha "limpa" sem alguns lançamentos.
- **Folha de pagamento** considera APENAS lançamentos dentro de faturas geradas (status fechado), nunca pendentes. Funcionário com salário fixo aparece em toda competência ativa, mesmo sem participação.
- **Cada funcionário recebe o `totalPago` completo do lançamento** (sem divisão por número de agentes) — mudança feita na v35.
- **Feriados:** detecção automática (nacionais + RJ + Páscoa móvel). Feriados customizados editáveis. Badge 🎉 na tabela de lançamentos.
- **Numeração OS sequencial** (`OS-0001`, `OS-0002`...) por lançamento, persistida em `osCounter`.
- **Rounds monetários:** `roundMoney`/`sumMoney`/`sumQty` em todas as somas — evita drift de floating-point. Não remover.
- **`num(v)`** normaliza vírgula decimal (pt-BR) antes de converter — não substituir por `Number(v)`.
- **Export NATURA (v41+):** coluna ADICIONAL inclui `adicDomFatura + pedagioFatura`.
- **Resumo Faturamento NATURA (v46+):** dividido em 4 linhas por `categoriaServico` real dos lançamentos dentro da fatura:
  - `NATURA COSMÉTICOS - VELADA SP` → categoria contém `VELADA SP` (ou VELADA sem sufixo)
  - `NATURA COSMÉTICOS - VELADA RJ` → categoria contém `VELADA RJ`
  - `NATURA COSMÉTICOS - ARMADA` → categoria contém `ARMADA`
  - `NATURA COSMÉTICOS - MOTOLINK` → categoria contém `MOTOLINK` (RJ ou SP)
- **Resumo Faturamento — colunas Modelo e Qtd removidas (v45+):** tabela exibe apenas Cliente | Valor.
- **Salários fixos por grupo de folha (v43+):** campo `folhaGrupo` em funcionários agrupa salários fixos no painel "Salários Fixos" do Resumo, independente de fechamentos.
- **Exports de despesas e vales (v42+):** respeitam os filtros ativos na tela.
- **Categoria e competência da folha vêm dos lançamentos (v55+):** novos campos `competencia` (override AAAA-MM) e `categoriaFolha` em cada lançamento. `folhasPorFunc` agrupa por `(funcId, l.competencia ?? data.slice(0,7))` e categoria = mais comum entre lançamentos.
- **Aba "Cat. Folha" (v55+):** CRUD do catálogo de categorias de folha. Lista categorias em uso mas não cadastradas com botão de auto-registro.
- **Competência segue a data por padrão (v56+):** form mostra `data.slice(0,7)` como default. Só persiste override quando o usuário escolhe um mês diferente. Sincroniza automaticamente quando a data muda (a menos que tenha sido override manual).
- **Editar valores pagos em lançamentos fechados (v57+):** botão Wallet laranja no row dos fechados. `ModalEditarPagoLancamento` edita só os campos de pago — não afeta fatura.
- **Categoria do funcionário é select do catálogo (v58+):** `ModalFuncionario` usa `<select>` com `categoriasFolha`, não input livre.
- **Folha por Categoria considera todos os lançamentos da competência (v59+):** itera lançamentos diretamente (qualquer status), não só os fechados. Lista categorias cadastradas mesmo com R$0.
- **Persistência DB de folhaGrupo + auto-criação no Cat. Folha (v60+):** `funcionarios.folha_grupo` agora persiste no MySQL via storage-shim. Categorias novas usadas em imports/edições são criadas automaticamente no Cat. Folha via helper `garantirCategoriasFolha`.
- **Lançamentos Avulsos (v61+):** aba renomeada de "Diárias Avulsas". Modelo de import: `data, Colaborador, Valor, Grupo Folha`. Aceita XLSX e texto colado em um único modal com tabs. Salário fixo do funcionário removido do cadastro — agora 100% via lançamentos avulsos.
- **Folha por Categoria — fonte única `folhasPorFunc` (v79–v82):** a aba Folha, o painel "Folha por Categoria" no Resumo e o export XLSX usam a MESMA estrutura. Categorização vem direto de `l.categoriaFolha` no lançamento (com fallback `d.folhaGrupo` no funcionário). Bruto = lançamentos + avulsos (sem adicionais); líquido = bruto + adic - desc. Não dividir essa lógica em outro lugar — qualquer divergência entre Dashboard/Folha/Resumo indica regressão.
- **Lançamentos sem prestador (v83–v84):** filtro "Sem prestador" + banner de alerta na aba Lançamentos. Ação em massa para atribuir prestador em múltiplos lançamentos selecionados.
- **Relatório Gerencial no Resumo (v85–v86):** painel + linha no export XLSX. Linhas: Folha líquida, Despesas do mês, Combustível da Empresa (origem GALOP em despesas operacionais), Manhães e Ricardo (unificam `despChefia` + despesas operacionais com mesma origem). **Comparação de origem usa `normalizar()` para tirar acento** — `"MANHÃES".includes("MANHA")` falha sem isso. v86 também adiciona snapshot persistente de resumos.
- **Status da folha (v87+):** ENUM evoluiu de `aberta/processada/paga` (legado) para `pendente/transferido/pago/cancelada` (novo). Frontend mapeia legados para exibição: `aberta/processada → pendente`, `paga → pago`. Migration 010 estendeu o ENUM no DB. v92 permite mudar status manualmente (em massa ou individual); v93 adiciona filtro por status na aba Folha.
- **Indicadores "Sem PIX" (v88+):** badges nas abas Funcionários e Folha sinalizam funcionários sem chave PIX cadastrada — bloqueio implícito para a transferência via Cora.
- **Integração Cora (PIX em massa) — F1 a F4:** botão "Transferir" na aba Folha dispara `POST /api/cora/transferir.php` que envia PIX em lote. Cliente PHP (`backend/api/cora/_cora_client.php`) faz auth com **JWT (client_assertion) + mTLS** (certs em `cora-certs/{mr-assessoria,up-vigilancia}/`, fora do webroot, com `.htaccess` defense-in-depth). Cada folha vira UMA linha em `transferencias_cora` com `idempotency_key` única. Webhooks da Cora chegam em `/api/cora/webhook.php` (todos auditados em `cora_webhook_logs`, mesmo inválidos). Listagem de transferências em `/api/cora/listar.php`. **Token endpoint correto:** `matls-clients.api.stage.cora.com.br`. **Valor sempre líquido** (v91 deixa explícito na UI).
- **Importar XML NF-e (v69+, ajustado em v71/v74/v75):** XML SEFAZ → fatura com status `NF-emitida` direto. Usa `<ValorServicos>` (sem retenções). Faturas custom (sem lançamentos) são permitidas; `template = ''` (não null) é aceito. `fecharFatura` preserva custom/XML.
- **Editar competência e cliente da fatura (v71/v72):** ícone de lápis no card de fatura abre modal pra trocar competência ou cliente. Persiste no banco via PUT.
- **Faturas vencidas não somem (v73):** status `NF-emitida` e `Aprovada` permanecem visíveis mesmo após vencimento.
- **Salário fixo desconsiderado (v62+):** removidos todos os cálculos e visualizações de salário fixo (folha bruto/líquido, Stat na Folha, badge "+R$" no row, Card no detalhe, linhas nos PDFs, contribuição em Resumo Folha por Categoria). Folha agora vem só de lançamentos + lançamentos avulsos + ajustes manuais. Campo `salarioFixo` mantido em 0 (não destrói dados existentes).
- **Resumo consolidado em 6 painéis (v54+):** painéis "2. Folha de Pagamento" (template) e "4. Salários Fixos" removidos. Item 2 agora é "Folha por Categoria" (Categoria | Valor + bruto). Painéis 3-6 são Adiantamentos/Despesas Fixas/Avulsas/Parcelamentos.
- **Card "Total Pago" nos lançamentos (v53+):** substituiu o card "Lucro" no topo. Coluna Lucro removida da tabela (redundante com PAGO Total).
- **Hub de Sistemas (v49+):** após login, mostra `SistemasHub.jsx` com 1 card MRSys ativo + 5 placeholders. Para adicionar sistema novo, editar array `SISTEMAS`.
- **Consolidação Faturas+Fechamentos (v51+):** aba "Faturas" removida. Aba "Fechamentos" agora tem faturas abertas (badge amarelo, botões Ver/Fechar) + fechadas (Status/Vencimento/Enviar/Reabrir).
- **Envio de medição por email (v51+):** botão "Enviar" no fechamento. Modal com destinatários (chip), assunto pré-preenchido `MEDIÇÃO DE SERVIÇOS - {CLIENTE} {COMPETENCIA}`. Anexa PDF (jsPDF) + XLSX. Backend: `backend/api/email/enviar_medicao.php`.

---

## 9. Como começar uma sessão de trabalho

Sempre que abrir o Claude Code nesta pasta, comece com:

> Busque no Obsidian (`01 - Projetos/MRSys/`) o contexto atualizado — especialmente `Histórico de Versões.md` e `MRSys.md`. Depois confirme:
> 1. Qual é a versão atual do monolito
> 2. O que foi feito na última sessão
> 3. O que o usuário quer trabalhar agora

Se eu (Celso) der uma instrução que conflita com algo nas Decisões já tomadas (seção 3), me avise antes de mudar — pode ser que eu tenha esquecido o motivo da escolha original.

---

## 10. O que NÃO fazer

- ❌ Não criar testes automatizados antes de pedido explícito (foco é entregar funcionalidade, não cobertura)
- ❌ Não trocar a stack (sem React Native, sem Vue, sem Laravel — manter PHP nativo + React)
- ❌ Não criar componentes em arquivos separados sem necessidade clara
- ❌ Não usar `localStorage`/`sessionStorage` diretamente (sistema usa `window.storage` com debounce/retry)
- ❌ Não commitar `.env`, credenciais, ou o `gerar_hash.php`
- ❌ Não rodar `DELETE` ou `DROP` no banco sem confirmação explícita
- ❌ Não remover `roundMoney`/`sumMoney` — são críticos para precisão monetária

---

*Última atualização: 2026-05-09. Sistema em produção na v93 em `https://celso.cloud`. Trabalho atual: iterações e melhorias no monolito + integração Cora (PIX em massa para folha). Pendentes:*
- *Confirmar que migrations 008/009/010 estão aplicadas em produção (`database/migrations/`).*
- *Limpar probes de diagnóstico Cora (`backend/api/cora/probe-*.php`, `test_auth.php`, `diag-certs.php`) quando a auth estiver estável em prod.*
- *Validar end-to-end o fluxo Cora em produção (transferência → webhook → status na folha).*
