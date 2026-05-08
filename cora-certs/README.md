# Certificados Cora (mTLS)

Esta pasta guarda os certificados de autenticação mTLS da Cora **somente em ambiente local de desenvolvimento**.

## Estrutura

```
cora-certs/
├── mr-assessoria/
│   ├── cert.pem      ← certificado público (do Cora)
│   └── private.key   ← chave privada (do Cora)
├── up-vigilancia/
│   ├── cert.pem
│   └── private.key
└── .gitignore        ← bloqueia commit acidental dos arquivos
```

## Como instalar (local)

1. Baixe os arquivos do painel Cora (1 par `.pem` + `.key` por empresa)
2. Renomeie para `cert.pem` e `private.key` dentro da subpasta correspondente
3. **Não commitar** — o `.gitignore` desta pasta já bloqueia, mas confirme antes de `git add`

## Produção (Hostinger)

**⚠ CRÍTICO — NÃO subir certificados para dentro de `public_html/`.** Tudo lá é servido pelo Apache; sua chave privada ficaria pública em `https://celso.cloud/cora-certs/private-key.key`.

Os certificados devem ficar **acima** de `public_html/`, em diretório protegido com `chmod 600`:

```
/home/SEU-USUARIO/cora-certs/
├── mr-assessoria/
│   ├── cert.pem
│   └── private.key
└── up-vigilancia/
    ├── cert.pem
    └── private.key
```

## `.env` do backend

```
CORA_BASE_URL=https://api.stage.cora.com.br
CORA_MR_CLIENT_ID=int-7SzA99mhM1tsdeOlTKV1Cy
CORA_MR_CERT_PATH=/caminho/absoluto/cora-certs/mr-assessoria/cert.pem
CORA_MR_KEY_PATH=/caminho/absoluto/cora-certs/mr-assessoria/private.key
CORA_UP_CLIENT_ID=int-5hkgOAMyBeJxYJoKTJ1rRC
CORA_UP_CERT_PATH=/caminho/absoluto/cora-certs/up-vigilancia/cert.pem
CORA_UP_KEY_PATH=/caminho/absoluto/cora-certs/up-vigilancia/private.key
```

## Permissões (Linux/Mac)

```bash
chmod 600 cora-certs/mr-assessoria/*
chmod 600 cora-certs/up-vigilancia/*
```

No Windows, basta o `.gitignore` impedir commit acidental — o sistema de arquivos local não precisa de chmod.

## Caminhos no `.env` precisam ser ABSOLUTOS

Os caminhos sempre começam com `/`. Exemplos válidos:
- ✅ `/home/u833a3654853f41ce/cora-certs/mr-assessoria/certificate.pem`
- ❌ `833a3654853f41ce/files/public_html/cora-certs/...` (faltando `/` no início)
- ❌ `cora-certs/mr-assessoria/certificate.pem` (caminho relativo)

Para descobrir o caminho absoluto no Hostinger:
1. Crie um arquivo temporário `public_html/whereami.php` com:
   ```php
   <?php echo realpath(__DIR__ . '/../cora-certs/mr-assessoria/certificate.pem');
   ```
2. Acesse `https://celso.cloud/whereami.php`
3. Copie o caminho exibido para o `.env`
4. **Apague o `whereami.php`** depois

## Fallback de segurança — `.htaccess`

Se por algum motivo os certificados precisarem ficar dentro de `public_html/`, copie o `.htaccess` desta pasta junto com eles. Ele bloqueia HTTP em qualquer arquivo dentro da pasta.

Mesmo com o `.htaccess`, **o ideal continua sendo manter fora de `public_html/`**.
