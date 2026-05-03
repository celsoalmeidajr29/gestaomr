# ============================================================================
# MRSys — Variáveis de Ambiente (template)
# ============================================================================
# Copie este arquivo para .env e preencha com seus valores reais.
# Nunca commit o .env (já está no .gitignore).
# ============================================================================

# Aplicação
APP_NAME="MRSys"
APP_ENV=production              # local | production
APP_DEBUG=false                 # true em local, false em produção
APP_URL=https://mrsys.grupomr.seg.br
APP_TIMEZONE="America/Sao_Paulo"

# Chave de criptografia (gerar com: openssl rand -hex 32)
APP_KEY=

# Banco de dados (MySQL/MariaDB)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mrsys_db
DB_USER=mrsys_user
DB_PASS=
DB_CHARSET=utf8mb4

# Sessão
SESSION_LIFETIME=480            # minutos (8 horas)
SESSION_SECURE=true             # true em HTTPS
SESSION_HTTPONLY=true

# Login (segurança)
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15

# Uploads
UPLOAD_MAX_SIZE_MB=10           # foto e documentos
UPLOAD_ALLOWED_TYPES="jpg,jpeg,png,pdf,doc,docx,xls,xlsx"

# E-mail (recuperação de senha, notificações)
MAIL_DRIVER=smtp
MAIL_HOST=smtp.grupomr.seg.br
MAIL_PORT=587
MAIL_USERNAME=celso.almeida@grupomr.seg.br
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=celso.almeida@grupomr.seg.br
MAIL_FROM_NAME="MRSys - Grupo MR"
