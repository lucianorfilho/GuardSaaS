#!/bin/bash

echo "================================================"
echo "   DBGuard — Instalação Automática"
echo "================================================"

# Variáveis
DB_NAME="dbguard"
DB_USER="dbguard"
DB_PASS=$(openssl rand -base64 16)
JWT_SECRET=$(openssl rand -base64 32)
APP_DIR="/var/www/dbguard"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
err()  { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

# 1. Atualizar sistema
log "Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências
log "Instalando dependências..."
apt install -y curl git ufw nginx mysql-server

# 3. Node.js 20
log "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. PM2
log "Instalando PM2..."
npm install -g pm2

# 5. Firewall
log "Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 6. MySQL
log "Configurando MySQL..."
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# 7. Clonar repositório
log "Clonando repositório..."
mkdir -p $APP_DIR
git clone https://github.com/lucianorfilho/GuardSaaS.git $APP_DIR || {
  cd $APP_DIR && git pull
}

# 8. Importar schema
log "Importando schema do banco..."
mysql -u $DB_USER -p$DB_PASS $DB_NAME < $APP_DIR/backend/database/schema.sql

# 9. Configurar backend
log "Configurando backend..."
cd $APP_DIR/backend
npm install

cat > .env << ENVEOF
PORT=4000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
APP_NAME=DBGuard
ENVEOF

# 10. Configurar frontend
log "Configurando frontend..."
cd $APP_DIR/frontend
npm install

# Pegar IP público
PUBLIC_IP=$(curl -s ifconfig.me)

cat > .env.local << ENVEOF
NEXT_PUBLIC_API_URL=http://${PUBLIC_IP}:4000
ENVEOF

npm run build

# 11. PM2
log "Iniciando serviços com PM2..."
cd $APP_DIR/backend
pm2 start src/index.js --name dbguard-api

cd $APP_DIR/frontend
pm2 start npm --name dbguard-frontend -- start

pm2 save
pm2 startup | tail -1 | bash

# 12. Nginx
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/dbguard << NGINXEOF
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/dbguard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "================================================"
echo "   DBGuard instalado com sucesso!"
echo "================================================"
echo ""
echo "  URL:      http://${PUBLIC_IP}"
echo "  Admin:    admin@dbguard.com.br"
echo "  Senha:    password"
echo ""
echo "  DB_USER:  ${DB_USER}"
echo "  DB_PASS:  ${DB_PASS}"
echo ""
warn "Salve as credenciais acima em local seguro!"
warn "Troque a senha do admin após o primeiro login!"
echo "================================================"
