# MRSys — Setup Inicial do Banco

**Para:** Celso Almeida (Grupo MR)
**E-mail admin:** celso.almeida@grupomr.seg.br
**Cor principal mantida:** Navy Blue (#1E3A8A)
**Logotipo:** será incorporado nas próximas fases

---

## Arquivos desta entrega

| Arquivo | O que é |
|---|---|
| `MRSys_Plano_Migracao_Web.docx` | Documento completo do plano (10 seções, ~30 páginas) |
| `MRSys_database.sql` | Script SQL: cria as 17 tabelas + dados iniciais |
| `gerar_hash.php` | Utilitário PHP para gerar o hash da sua senha |
| `README_setup.md` | Este arquivo |

---

## Roteiro de instalação no servidor (15 minutos)

### Passo 1 — Banco vazio
1. Acesse o painel da hospedagem (cPanel)
2. **MySQL Databases** → Crie um banco chamado `mrsys_db`
3. Crie um usuário (ex: `mrsys_user`), senha forte
4. Associe o usuário ao banco com **ALL PRIVILEGES**
5. **Anote** as credenciais — vão ser usadas pelo PHP depois

### Passo 2 — Importar schema
1. **phpMyAdmin** (link no cPanel)
2. Clique em `mrsys_db` na lista da esquerda
3. Aba **Importar** → escolha o `MRSys_database.sql`
4. Clique **Executar**
5. Veja a mensagem "A importação foi bem sucedida"

### Passo 3 — Verificar
Cole na aba SQL e execute:
```sql
SHOW TABLES;
SELECT COUNT(*) AS total FROM servicos;
SELECT nome, email FROM usuarios;
```
Resultado esperado: 17 tabelas, 17 serviços, 1 usuário (celso).

### Passo 4 — Ativar senha do admin
1. **Gerenciador de Arquivos** (cPanel) → vá em `public_html/`
2. Faça upload do `gerar_hash.php`
3. No navegador: `https://seudominio.com.br/gerar_hash.php`
4. **Copie** o comando UPDATE exibido
5. phpMyAdmin → aba SQL → cole → Executar
6. **🔴 IMPORTANTE: APAGUE o `gerar_hash.php`** do servidor agora

### Passo 5 — Conferir login (opcional, ainda sem interface)
```sql
SELECT email, senha_hash FROM usuarios WHERE email = 'celso.almeida@grupomr.seg.br';
```
O `senha_hash` deve começar com `$2y$10$` e ter 60 caracteres. Se estiver com `PLACEHOLDER`, refaça o Passo 4.

---

## Fase 2: o que vem depois

Quando você confirmar que os passos acima rodaram sem erro, eu inicio a próxima entrega:

- **`_bootstrap.php`** — conexão segura ao banco, gestão de sessão, helpers JSON
- **`/api/auth/login.php`** — endpoint de login com validação e lockout
- **`.htaccess`** — redirects, segurança, HTTPS forçado
- **Template HTML/CSS** com seu logotipo no header (envie o arquivo do logo quando puder)

A previsão da Fase 2 é 2-3 dias úteis de trabalho.

---

## ⚠ Lembretes de segurança

1. **A senha que você compartilhou no chat (`jr4540504@A`)** deve ser trocada após o primeiro login bem-sucedido — vá no perfil e defina uma nova que só você conheça.
2. **Apague o `gerar_hash.php`** do servidor depois de usar. Deixar ele acessível na web é risco grave.
3. **Faça backup** semanal do banco até a Fase 2 estar pronta. No phpMyAdmin: aba *Exportar* → método rápido → SQL.
4. **Não compartilhe** as credenciais do MySQL (banco/usuário/senha) por canais públicos.

---

## Suporte

Se algo der errado em qualquer passo, me chame com:
- Print da tela de erro (se houver)
- Print do `SHOW TABLES;` se o erro for relacionado a tabelas
- Print do `SELECT VERSION();` se for erro de versão MySQL

A versão mínima é MySQL 5.7 (ou MariaDB 10.2). Se a hospedagem tiver versão menor, me avise — adapto o script.
