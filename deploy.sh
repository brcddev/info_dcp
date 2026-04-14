#!/bin/bash

# ==================================================
# Деплой проекта info_dcp (PWA + Gateway)
# ==================================================

# --- НАСТРОЙКИ ---
SERVER_USER="brc"
SERVER_HOST="lan.pbord.ru"
SERVER_PWA_PATH="/var/www/lan.pbord.ru"
SERVER_GATEWAY_PATH="/home/brc/gateway"
LOCAL_PWA_PATH="/home/brc/info_dcp/pwa"
LOCAL_GATEWAY_PATH="/home/brc/info_dcp/gateway"
TEMP_PWA_DIR="/home/brc/pwa-temp"

# --- ЦВЕТА ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Проверка rsync
if ! command -v rsync &> /dev/null; then
    log_error "rsync не установлен. Установите: sudo apt install rsync"
    exit 1
fi

# 1. Сборка PWA
log_info "Сборка PWA..."
cd "$LOCAL_PWA_PATH" || { log_error "Не найден путь $LOCAL_PWA_PATH"; exit 1; }
npm run build
if [ $? -ne 0 ]; then
    log_error "Ошибка сборки PWA"
    exit 1
fi
log_info "Сборка завершена"

# 2. Копирование PWA на сервер во временную папку
log_info "Копирование PWA на сервер (во временную папку)..."
rsync -avz --delete --no-perms --no-owner \
    "$LOCAL_PWA_PATH/dist/" \
    "$SERVER_USER@$SERVER_HOST:$TEMP_PWA_DIR/"

if [ $? -ne 0 ]; then
    log_error "Ошибка копирования PWA"
    exit 1
fi
log_info "PWA скопирован"

# 3. Перемещение файлов в целевую директорию и установка прав (через SSH)
log_info "Перемещение файлов PWA в $SERVER_PWA_PATH и установка прав..."
ssh "$SERVER_USER@$SERVER_HOST" << EOF
    sudo rm -rf $SERVER_PWA_PATH/*
    sudo cp -r $TEMP_PWA_DIR/* $SERVER_PWA_PATH/
    sudo rm -rf $TEMP_PWA_DIR
    sudo chown -R www-data:www-data $SERVER_PWA_PATH
    sudo chmod -R 755 $SERVER_PWA_PATH
EOF

if [ $? -ne 0 ]; then
    log_error "Ошибка перемещения/прав PWA"
    exit 1
fi

# 4. Копирование шлюза (опционально)
log_info "Копирование шлюза на сервер..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'serviceAccountKey.json' \
    "$LOCAL_GATEWAY_PATH/" \
    "$SERVER_USER@$SERVER_HOST:$SERVER_GATEWAY_PATH/"

if [ $? -ne 0 ]; then
    log_error "Ошибка копирования шлюза"
    exit 1
fi
log_info "Шлюз скопирован"

# 5. Установка зависимостей шлюза и перезапуск
log_info "Установка зависимостей шлюза (production) и перезапуск..."
ssh "$SERVER_USER@$SERVER_HOST" << EOF
    export PATH="/home/brc/.nvm/versions/node/v24.14.1/bin:\$PATH"
    cd $SERVER_GATEWAY_PATH
    npm install --omit=dev
    pm2 restart info-dcp-gateway || pm2 start index.js --name info-dcp-gateway
    pm2 save
EOF

if [ $? -ne 0 ]; then
    log_error "Ошибка перезапуска шлюза"
    exit 1
fi

log_info "✅ Деплой успешно завершён!"