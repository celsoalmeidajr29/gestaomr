# Deploy MRSys — Hostinger cPanel
**URL temporária:** `https://saddlebrown-zebra-944288.hostingersite.com`

---

## Antes de começar

Você vai precisar de:
- Node.js instalado no seu computador (para fazer o build)
- Acesso ao **hPanel** da Hostinger
- Este repositório clonado localmente

---

## Passo 1 — Build do frontend

No terminal, dentro da pasta do projeto:

```bash
cd frontend
npm install
npm run build
```

Isso gera a pasta `frontend/dist/` com os arquivos prontos para produção.

---

## Passo 2 — Estrutura de arquivos no servidor

Após o upload, o `public_html` do servidor deve ficar assim:

```
public_html/
├── _bootstrap.php          ← de backend/_bootstrap.php
├── .env                    ← criado manualmente no Passo 5
├── .htaccess               ← de frontend/dist/.htaccess  (gerado no build)
├── index.html              ← de frontend/dist/index.html
├── assets/                 ← de frontend/dist/assets/
├── uploads/
│   └── funcionarios/       ← criar vazia (Passo 7)
└── api/
    ├── auth/
    │   ├── login.php
    │   ├── logout.php
    │   └── me.php
    ├── auditoria/
    │   └── index.php
    ├── clientes/
    │   ├── index.php
    │   └── item.php
    ├── dashboard/
    │   └── index.php
    ├── descontos/
    │   ├── index.php
    │   └── item.php
    ├── despesas/
    │   ├── index.php
    │   └── item.php
    ├── fechamentos/
    │   ├── index.php
    │   └── item.php
    ├── folhas/
    │   └── index.php
    ├── funcionarios/
    │   ├── index.php
    │   └── item.php
    ├── lancamentos/
    │   ├── index.php
    │   └── item.php
    ├── perfis/
    │   └── index.php
    ├── servicos/
    │   ├── index.php
    │   └── item.php
    └── usuarios/
        ├── index.php
        └── item.php
```

**Resumo do que vem de cada lugar:**
- `public_html/_bootstrap.php` ← `backend/_bootstrap.php`
- `public_html/.htaccess` ← `frontend/dist/.htaccess`
- `public_html/index.html` + `assets/` ← `frontend/dist/`
- `public_html/api/` ← conteúdo de `backend/api/`

---

## Passo 3 — Upload via File Manager

1. Acesse o **hPanel** → **File Manager**
2. Navegue até `public_html/`
3. Se houver um `index.php` padrão da Hostinger, **apague-o**

### Opção A — Upload direto (mais simples)

Selecione todos os arquivos/pastas listados acima e arraste para o File Manager.

### Opção B — Upload por FTP (recomendado para muitos arquivos)

Use um cliente FTP como **FileZilla**. As credenciais FTP estão no hPanel em **FTP Accounts**.

Faça upload de:
- `frontend/dist/` → selecione o conteúdo (não a pasta dist em si) e envie para `public_html/`
- `backend/_bootstrap.php` → envie para `public_html/`
- `backend/api/` → envie a pasta `api/` inteira para `public_html/`

---

## Passo 4 — Banco de dados

### 4a. Criar o banco e o usuário

1. No hPanel, vá em **Banco de Dados MySQL** → **Criar novo banco**
2. Dê o nome `mrsys` (a Hostinger vai prefixar automaticamente: `u123456789_mrsys`)
3. Crie um usuário: nome `mrsys`, senha forte (anote!)
4. Adicione o usuário ao banco com **Todos os Privilégios**

Anote os dados gerados — você vai usá-los no Passo 5.

### 4b. Importar o schema principal

1. No hPanel → **phpMyAdmin** → selecione o banco `u123456789_mrsys`
2. Clique na aba **Importar**
3. Selecione o arquivo: `database/schema.sql`
4. Clique **Executar**

Isso cria as 17 tabelas, 3 views, triggers de `servicos` e os dados iniciais.

### 4c. Importar os triggers de auditoria

Ainda no phpMyAdmin, com o mesmo banco selecionado:

1. Aba **Importar** novamente
2. Arquivo: `database/migrations/002_audit_triggers.sql`
3. **Executar**

---

## Passo 5 — Criar o arquivo .env

No File Manager, dentro de `public_html/`, crie um arquivo chamado **`.env`** (com ponto no início).

Cole o conteúdo abaixo, substituindo os valores marcados:

```ini
APP_NAME="MRSys"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://saddlebrown-zebra-944288.hostingersite.com
APP_TIMEZONE="America/Sao_Paulo"

# Gere uma chave em: https://generate-secret.vercel.app/64
APP_KEY=COLE_AQUI_UMA_CHAVE_ALEATORIA_DE_64_CHARS

# Substitua pelos valores gerados no Passo 4a
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u000000000_mrsys
DB_USER=u000000000_mrsys
DB_PASS=SENHA_DO_BANCO
DB_CHARSET=utf8mb4

SESSION_LIFETIME=480
SESSION_SECURE=true
SESSION_HTTPONLY=true
SESSION_SAMESITE=Lax

CORS_ALLOWED_ORIGINS=https://saddlebrown-zebra-944288.hostingersite.com

LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15

UPLOAD_MAX_SIZE_MB=10
UPLOAD_ALLOWED_TYPES="jpg,jpeg,png,pdf,doc,docx,xls,xlsx"
```

---

## Passo 6 — Ativar a senha do administrador

O schema foi importado com um hash inválido no lugar da senha. Você precisa gerar o hash real.

### 6a. Criar o arquivo temporário

No File Manager, dentro de `public_html/`, crie o arquivo **`gerar_hash.php`**:

```php
<?php echo password_hash('jr4540504@A', PASSWORD_BCRYPT);
```

### 6b. Acessar pelo navegador

Abra no navegador:
```
https://saddlebrown-zebra-944288.hostingersite.com/gerar_hash.php
```

Você vai ver uma string parecida com:
```
$2y$10$AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQr
```

**Copie essa string inteira.**

### 6c. Atualizar no banco

No phpMyAdmin → aba **SQL**, cole e execute:

```sql
UPDATE usuarios
SET senha_hash = 'COLE_O_HASH_AQUI'
WHERE email = 'celso.almeida@grupomr.seg.br';
```

### 6d. Apagar o arquivo temporário

No File Manager, **apague `gerar_hash.php`** imediatamente.

---

## Passo 7 — Criar a pasta de uploads

No File Manager, dentro de `public_html/`, crie:

```
uploads/
└── funcionarios/
```

Clique com o botão direito na pasta `uploads/` → **Permissões** → defina `755`.

---

## Passo 8 — Teste final

Acesse `https://saddlebrown-zebra-944288.hostingersite.com` e faça login com:

- **E-mail:** `celso.almeida@grupomr.seg.br`
- **Senha:** `jr4540504@A`

**Checklist de validação:**

- [ ] Tela de login carrega
- [ ] Login funciona e entra no sistema
- [ ] Menu principal aparece (Lançamentos, Fechamentos, etc.)
- [ ] Criação de um lançamento funciona
- [ ] Dados persistem após recarregar a página
- [ ] Trocar a senha no primeiro uso (Configurações → Perfil)

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Tela branca após login | `.htaccess` não aplicado | Verificar se o arquivo foi enviado e se `mod_rewrite` está ativo |
| Erro "Não autenticado" em todas as telas | `.env` não encontrado ou caminho errado | Confirmar que `.env` está em `public_html/` ao lado de `_bootstrap.php` |
| Erro de banco de dados | Credenciais erradas no `.env` | Comparar `DB_NAME`/`DB_USER` com o que foi gerado no hPanel |
| 404 ao navegar diretamente para uma rota | SPA routing não configurado | Verificar se `.htaccess` está em `public_html/` e se `mod_rewrite` está habilitado |
| Login não funciona (senha incorreta) | Hash placeholder no banco | Refazer o Passo 6 |

---

## Quando o domínio próprio chegar

1. No hPanel, aponte o domínio para a hospedagem
2. Ative o SSL gratuito (Let's Encrypt) no hPanel → **SSL/TLS**
3. Atualize duas linhas no `.env`:
   ```ini
   APP_URL=https://seudaminio.com.br
   CORS_ALLOWED_ORIGINS=https://seudaminio.com.br
   ```
4. Nenhuma mudança de código necessária
