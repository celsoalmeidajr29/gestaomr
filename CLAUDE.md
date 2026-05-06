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

**`MRSys_v53.jsx`** — `frontend/src/App.jsx` é wrapper que repassa props para o monolito:
```jsx
import MRSysApp from './versions/MRSys_v53.jsx'
export default function App(props) { return <MRSysApp {...props} /> }
```

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

17 tabelas no MySQL agrupadas em 5 áreas:

- **Auth (3):** `perfis`, `usuarios`, `sessoes`
- **Cadastros (3):** `clientes` (5 iniciais — migration 004 adicionou `razao_social`, `aliquota`, `numero`, `complemento`, `bairro`, `cargo_contato`), `servicos` (17 iniciais), `funcionarios` (migration 003 adicionou `folha_grupo`)
- **Operação (5):** `lancamentos`, `lancamento_funcionarios` (M:N), `lancamento_extras`, `despesas`, `descontos`
- **Fechamento (4):** `fechamentos`, `fechamento_lancamentos`, `fechamento_status_log`, `folhas`
- **Auxiliares (2):** `arquivos` (foto+docs com path em disco), `auditoria` (log automático)

Mais 3 views (`vw_lancamentos_completo`, `vw_fechamentos_completo`, `vw_resumo_competencia`) e triggers de auditoria automática.

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
- **Categoria editável de folha (v53+):** cada folha tem `categoriaFolha` derivada de `funcionario.folhaGrupo` por default, com override editável inline. Bulk edit via seleção (checkbox) + barra de ações.
- **Painel "3. Folha por Categoria" no Resumo (v53+):** agrupa folhas da competência por `categoriaFolha`. Posicionado entre "2. Folha de Pagamento" e "4. Salários Fixos".
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

*Última atualização: 2026-05-06. Sistema em produção na v53 em `https://celso.cloud`. Trabalho atual: iterações e melhorias no monolito.*
