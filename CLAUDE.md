# Contexto do Projeto MRSys — para Claude Code

Este arquivo é lido automaticamente pelo Claude Code ao abrir esta pasta. Ele contém o contexto necessário para você continuar o desenvolvimento de onde a conversa anterior parou.

---

## 1. O que é o MRSys

Sistema de Fechamento Financeiro de uma empresa de segurança e escolta armada (Grupo MR), atualmente em produção como aplicação React standalone. O sistema gerencia:

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

### Fases concluídas

| Fase | Status | Entregáveis |
|---|---|---|
| Fase 1 — Schema | ✅ Concluída | `database/schema.sql` (17 tabelas, views, triggers) |
| Fase 2 — Bootstrap PHP | ✅ Concluída | `backend/_bootstrap.php`, `backend/api/auth/` (login/logout/me), `backend/.htaccess`, `frontend/src/api.js` |
| Scaffold Frontend | ✅ Concluída | `frontend/` com Vite 5 + React 18 + Tailwind 3, deploy via Cloudflare Pages |

### Próxima fase pendente: **Fase 3 — APIs CRUD**

### Artefatos de referência em `docs/`

- `MRSys_v13.jsx` — versão React monolítica atual em produção (3.426 linhas)
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
| Cross-origin | Frontend e backend no **mesmo domínio** (sem CORS). Cookie `SameSite=Lax`. Subdomínio atual: `saddlebrown-zebra-944288.hostingersite.com` |
| Cor principal | Navy Blue `#1E3A8A` |
| Usuários simultâneos | 2-5 (financeiro/admin) |
| Usuário inicial | Apenas Celso, perfil admin, e-mail `celso.almeida@grupomr.seg.br` |
| Senha admin temporária | `jr4540504@A` (deve ser trocada no primeiro login) |
| Domínio | Celso já possui (nome a ser informado) |
| Logotipo | Celso já possui (arquivo a ser fornecido) |
| Versionamento | A cada alteração no monolito, salvar como `MRSys_v{N}.jsx` em `frontend/src/versions/` |

---

## 4. Modelo de dados (resumo)

17 tabelas no MySQL agrupadas em 5 áreas:

- **Auth (3):** `perfis`, `usuarios`, `sessoes`
- **Cadastros (3):** `clientes` (5 iniciais), `servicos` (17 iniciais), `funcionarios`
- **Operação (5):** `lancamentos`, `lancamento_funcionarios` (M:N), `lancamento_extras`, `despesas`, `descontos`
- **Fechamento (4):** `fechamentos`, `fechamento_lancamentos`, `fechamento_status_log`, `folhas`
- **Auxiliares (2):** `arquivos` (foto+docs com path em disco), `auditoria` (log automático)

Mais 3 views (`vw_lancamentos_completo`, `vw_fechamentos_completo`, `vw_resumo_competencia`) e 3 triggers de auditoria automática.

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

## 6. Próximo passo: Fase 3 — APIs CRUD

Fase 2 e scaffold frontend concluídos. Próxima fase pendente:

**Entregáveis da Fase 3** (~60 endpoints PHP em `backend/api/`):

- `servicos/` — CRUD completo (17 serviços iniciais já no schema)
- `clientes/` — CRUD (5 clientes iniciais já no schema)
- `funcionarios/` — CRUD + upload foto/documentos
- `lancamentos/` — CRUD + M:N funcionários + extras
- `fechamentos/` — criação, atualização de status, geração de folha
- `despesas/` e `descontos/` — CRUD simples
- `usuarios/` e `perfis/` — CRUD + gestão de permissões
- `dashboard/` — GET com resumo da competência atual

**Critério de aceite Fase 3:** Celso consegue criar um lançamento via API e visualizar no frontend.

**Tempo estimado:** 5-7 dias de trabalho focado.

### Pendências antes da Fase 3

1. Ativar senha admin no banco: rodar `gerar_hash.php` no servidor (criar temporariamente, nunca commitar)
2. Confirmar URL do domínio do cPanel para preencher `CORS_ALLOWED_ORIGINS` e `APP_URL` no `.env`

---

## 7. Fases seguintes (visão geral)

| Fase | Entrega | Status | Dias |
|---|---|---|---|
| 3 | APIs CRUD de todos os módulos | ⏳ Pendente | 5-7 |
| 4 | Adapter no frontend (substituir `window.storage` por `api.js`) | ⏳ Pendente | 3-4 |
| 5 | Migração: script que importa o JSON de backup do v13 pro novo banco | ⏳ Pendente | 1-2 |
| 6 | Permissões + auditoria por trigger | ⏳ Pendente | 2-3 |
| 7 | Testes + deploy + cron de backup | ⏳ Pendente | 2-3 |

**Total restante:** ~2-3 semanas a partir da Fase 3.

---

## 8. Convenções deste projeto

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
- **Cada fase em sua branch** (`fase-2-bootstrap`, `fase-3-apis`, etc), merge para `main` quando aceite

### Validação obrigatória após edits

Antes de declarar um módulo "pronto", rode estes checks:

```bash
# Sintaxe PHP
php -l backend/_bootstrap.php
php -l backend/api/**/*.php

# Frontend (se alterado)
cd frontend && npm run lint && npm run build

# Schema SQL (se alterado)
mysql -u root -p mrsys_db < database/schema.sql --execute="SHOW TABLES;"
```

---

## 9. Comportamentos importantes do sistema

Estes detalhes não são óbvios e foram sangrados em conversas anteriores:

- **Status de fatura** vai de `Enviada → Aprovada → NF-emitida → Paga`. `Vencida` é marcada automaticamente quando a data de vencimento passa e o status não é `Paga`. Histórico em `fechamento_status_log`.
- **Categorias de serviço (5 valores):** ARMADA, VELADA, MOTOLINK, PRONTA RESPOSTA, FACILITIES. Cada uma com cor própria no frontend.
- **Resumo de Fechamento (aba)** tem botão `×` em cada linha que filtra do resumo e do XLSX exportado (não apaga dado real). Útil quando você precisa entregar uma planilha "limpa" sem alguns lançamentos.
- **Folha de pagamento** considera APENAS lançamentos dentro de faturas geradas (status fechado), nunca pendentes. Funcionário com salário fixo aparece em toda competência ativa, mesmo sem participação.
- **Funcionários têm fotos e até 5 documentos.** No v13 ficam em chaves separadas do storage (`funcfoto_{id}`, `funcdoc_{id}_{docId}`). Na versão web ficam em `/uploads/funcionarios/{id}/` com referência na tabela `arquivos`.
- **Importação de funcionários via XLSX** já funciona no v13. Aliases de cabeçalho aceitos: "Funcionário", "Colaborador", "Cargo" → categoria; "Salário Fixo", "Salario" → salário; etc.
- **Persistência robusta no v13:** salva com debounce 300ms, retry 3x, detecta `quota_exceeded`, bloqueia `beforeunload` se há pendências, força save em `visibilitychange='hidden'`. Replicar comportamento equivalente na versão web (loading states + mensagens de erro claras).

---

## 10. Como começar uma sessão de trabalho

Sempre que abrir o Claude Code nesta pasta, comece com:

> Leia o CLAUDE.md e o HISTORICO.md, depois confirme:
> 1. Em que fase estamos
> 2. Qual é o próximo entregável
> 3. Existe alguma decisão pendente que precisa ser tomada agora?

Se eu (Celso) der uma instrução que conflita com algo nas Decisões já tomadas (seção 3), me avise antes de mudar — pode ser que eu tenha esquecido o motivo da escolha original.

Se você precisar de algo que não tenho aqui (logotipo, credenciais reais, etc), me peça explicitamente em vez de assumir.

---

## 11. O que NÃO fazer

- ❌ Não criar testes automatizados antes de pedido explícito (foco é entregar funcionalidade, não cobertura)
- ❌ Não trocar a stack (sem React Native, sem Vue, sem Laravel — manter PHP nativo + React)
- ❌ Não criar componentes em arquivos separados sem necessidade clara
- ❌ Não usar `localStorage`/`sessionStorage` no frontend novo (vai contra o objetivo de centralizar dados)
- ❌ Não commitar `.env`, credenciais, ou o `gerar_hash.php`
- ❌ Não rodar `DELETE` ou `DROP` no banco sem confirmação explícita

---

*Última atualização: 2026-05-03. Fases 1, 2 e scaffold frontend concluídos. Próximo passo: Fase 3 — APIs CRUD.*
