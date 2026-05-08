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

**NÃO use esta pasta em produção.** Os certificados ficam fora do `public_html`, em diretório com `chmod 600`:

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
