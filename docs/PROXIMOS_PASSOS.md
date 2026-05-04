# MRSys — Próximos Passos

> Documento criado em 2026-05-04. Atualizar conforme cada item for concluído.

---

## 1. Responsividade

**Objetivo:** o sistema funcionar bem em telas menores (tablets, celular do Celso em campo).

### O que precisa de atenção

- **Header de abas:** overflow-x já existe, mas em mobile as abas ficam muito pequenas para tocar com o dedo. Avaliar agrupar abas em menu dropdown em viewport < 640px.
- **Tabelas de lançamentos e fechamentos:** colunas demais para telas < 768px. Estratégia: esconder colunas menos importantes com `hidden sm:table-cell`, ou usar cards empilhados abaixo de certo breakpoint.
- **Modais:** já usam `max-w-2xl`, mas em mobile ocupam 100% da largura sem padding adequado. Adicionar `mx-2` ou `w-full` em telas pequenas.
- **Grids de dashboard:** os `grid-cols-4` precisam colapsar para `grid-cols-2` em mobile.
- **Botões de ação nas linhas de tabela:** em mobile usar ícone sem texto para economizar espaço.
- **Folha de pagamento / PDF:** impressão já usa `@media print`, mas verificar se o layout não quebra em papel A4 com margens padrão.

### Critério de aceite

Navegar por todas as abas em viewport de 375px (iPhone SE) sem scroll horizontal indesejado e sem elementos sobrepostos.

---

## 2. Módulo de Despesas da Chefia

### 2a. Despesas da Chefia no Resumo de Fechamento

**Objetivo:** diferenciar despesas operacionais (já existentes) de despesas de chefia/administrativas, e incluir o total dessas despesas como linha de dedução no resumo de fechamento mensal.

**Regra de negócio:**
- Uma despesa pode ter `tipo = 'CHEFIA'` (novo valor além dos existentes: `FIXA`, `PARCELA`, `AVULSA`).
- No Resumo de Fechamento, abaixo do total de lançamentos, aparece uma linha **"Despesas de Chefia"** com o total do período filtrado.
- Não afeta o cálculo de fatura por cliente (é uma dedução do resultado geral da empresa).

**Entregáveis:**
- [ ] Adicionar `CHEFIA` como opção de tipo no `ModalDespesa`
- [ ] Incluir seção "Despesas de Chefia" no resumo de fechamento com total por competência
- [ ] Filtro na aba Despesas para visualizar separado por tipo

---

### 2b. Aba de Credores

**Objetivo:** visão consolidada de quanto a empresa deve a cada credor/categoria em uma competência.

**Regra de negócio:**
- **Centro de custo** (`centro_custo`) de cada despesa identifica o credor ou categoria (ex: `"Combustível"`, `"Aluguel"`, `"Fornecedor X"`).
- A aba Credores soma os valores de todas as despesas por `centro_custo` dentro da competência selecionada.
- Exibe: credor, quantidade de lançamentos, total devido, status geral (pendente / pago / parcial).

**Entregáveis:**
- [ ] Nova aba `credores` no menu de navegação
- [ ] Tabela: `centro_custo` | `qtd lançamentos` | `total` | `status`
- [ ] Filtro por competência (mesmo seletor já usado em outras abas)
- [ ] Linha de totais no rodapé da tabela

---

### 2c. Reembolso de Despesa na Folha do Funcionário

**Objetivo:** quando o `origem` de uma despesa for o nome de um funcionário, aquele valor é reembolsado para ele na folha — mas **não soma no bruto/líquido**, apenas aparece como linha informativa separada.

**Regra de negócio:**
- Campo `origem` da despesa = nome exato (ou normalizado) de um funcionário cadastrado.
- Na folha de pagamento do funcionário daquele período, aparece seção **"Reembolsos"** listando cada despesa com descrição e valor.
- O total de reembolsos é exibido à parte — **não entra no cálculo de bruto, líquido ou INSS**. É meramente informativo/comprobatório.
- O PDF da folha consolidada e o recibo de PSO devem incluir a seção de reembolsos.

**Entregáveis:**
- [ ] `folhasPorFunc` (useMemo): cruzar `despesas.filter(d => normalizar(d.origem) === nomeNorm)` para o período e incluir no retorno como `reembolsos: [...]` e `totalReembolsos`
- [ ] `ModalDetalheFolha`: exibir seção "Reembolsos" após os descontos, com total separado
- [ ] PDF da folha consolidada: incluir seção reembolsos
- [ ] Recibo PSO: incluir linha de reembolso se houver

---

## 3. Geração de Recibos PDF em Lote

**Objetivo:** selecionar vários funcionários e gerar um único arquivo PDF com todos os recibos de PSO de uma competência, para assinar de uma vez.

### Fluxo esperado

1. Na aba **Folha de Pagamento**, botão **"Gerar recibos em lote"** abre um modal.
2. Modal exibe lista de funcionários com checkbox. Filtros: competência, status da folha.
3. Usuário seleciona os desejados (ou "Selecionar todos") e clica em **"Gerar PDF"**.
4. O sistema monta um único documento com um recibo por página (usando `@media print` + `page-break-after: always`) e abre `window.print()`.

### Detalhes técnicos

- O PDF em lote usa o mesmo template do recibo individual (`ModalReciboPSOPDF`), repetido para cada funcionário selecionado dentro de um único `<div>` imprimível.
- **Não requer biblioteca externa** — mesma abordagem `window.print()` já usada no sistema.
- Cada recibo ocupa exatamente uma página A4. Testar com folhas de funcionários com muitos reembolsos/descontos para garantir que não quebra em 2 páginas.

**Entregáveis:**
- [ ] Botão "Gerar recibos em lote" na aba Folha de Pagamento
- [ ] `ModalRecibosLote`: lista de seleção de funcionários + botão gerar
- [ ] Componente `RecibosLoteImpressao`: div oculto com N recibos, `page-break-after: always` entre cada um
- [ ] Lógica de seleção: checkboxes individuais + "selecionar todos" + contador `X selecionados`
- [ ] Filtro por competência dentro do modal (default = competência atual do filtro global)

---

## Ordem sugerida de implementação

| # | Item | Esforço estimado | Dependência |
|---|------|-----------------|-------------|
| 1 | Responsividade | 2–3 dias | Nenhuma |
| 2 | Tipo CHEFIA + seção no resumo | 0,5 dia | Nenhuma |
| 3 | Aba Credores | 1 dia | Item 2 |
| 4 | Reembolso na folha | 1–2 dias | Nenhuma |
| 5 | Recibos em lote | 1 dia | Nenhuma |

**Total estimado:** 6–8 dias de trabalho focado.
