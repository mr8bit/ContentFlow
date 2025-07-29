# 🚀 Руководство по развертыванию Auto Poster Bot

## 📋 Предварительные требования

### Системные требования
- **Docker** 20.10+ и **Docker Compose** 2.0+
- **Git** для клонирования репозитория
- **4GB RAM** минимум (рекомендуется 8GB)
- **10GB** свободного места на диске

### Необходимые API ключи
1. **Telegram API** - получить на [my.telegram.org](https://my.telegram.org)
2. **Telegram Bot Token** - создать у [@BotFather](https://t.me/botfather)
3. **OpenRouter API Key** - зарегистрироваться на [openrouter.ai](https://openrouter.ai)

## ⚡ Быстрое развертывание

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-username/auto-poster-bot.git
cd auto-poster-bot
```

### 2. Настройка переменных окружения
```bash
# Копируем пример конфигурации
cp .env.example .env

# Редактируем конфигурацию
nano .env
```

**Обязательные переменные для заполнения:**
```env
# Telegram API (my.telegram.org)
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here

# Telegram Bot (@BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Безопасность (измените!)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ADMIN_PASSWORD=your-secure-admin-password
```

### 3. Запуск системы
```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### 4. Генерация Telegram сессии
```bash
# Интерактивная генерация сессии
docker-compose exec backend python generate_session_telethon.py

# Следуйте инструкциям в терминале
```

### 5. Доступ к системе
- **Веб-интерфейс**: http://localhost:3000
- **API документация**: http://localhost:8000/docs
- **Логин**: admin / ваш_пароль_из_env

## 🔧 Продвинутая настройка

### Настройка производственной среды

#### 1. Безопасность
```bash
# Генерация сильного JWT ключа
openssl rand -hex 32

# Создание сильного пароля администратора
openssl rand -base64 32
```

#### 2. Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 3. SSL сертификат (Let's Encrypt)
```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com
```

### Настройка мониторинга

#### 1. Логи
```bash
# Просмотр логов всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f scrapper
docker-compose logs -f publisher
```

#### 2. Мониторинг ресурсов
```bash
# Использование ресурсов контейнерами
docker stats

# Мониторинг дискового пространства
df -h
```

### Резервное копирование

#### 1. База данных
```bash
# Создание бэкапа
docker-compose exec postgres pg_dump -U autoposter autoposter > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker-compose exec -T postgres psql -U autoposter autoposter < backup_file.sql
```

#### 2. Конфигурация
```bash
# Бэкап конфигурации
cp .env .env.backup
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz .env docker-compose.yml
```

## 🔄 Обновление системы

### 1. Обновление кода
```bash
# Остановка сервисов
docker-compose down

# Обновление кода
git pull origin main

# Пересборка и запуск
docker-compose up -d --build
```

### 2. Миграции базы данных
```bash
# Применение миграций
docker-compose exec backend python run_migration.py
```

## 🐛 Устранение неполадок

### Частые проблемы

#### 1. Ошибка подключения к Telegram
```bash
# Проверка сессии
docker-compose exec backend python test_channel_access.py

# Перегенерация сессии
docker-compose exec backend python generate_session_telethon.py
```

#### 2. Проблемы с базой данных
```bash
# Проверка подключения к БД
docker-compose exec backend python -c "from database import engine; print('DB OK')"

# Пересоздание БД (ОСТОРОЖНО!)
docker-compose down
docker volume rm auto-poster-bot_postgres_data
docker-compose up -d
```

#### 3. Проблемы с Redis
```bash
# Проверка Redis
docker-compose exec redis redis-cli ping

# Очистка кэша
docker-compose exec redis redis-cli flushall
```

### Логи и диагностика
```bash
# Детальные логи backend
docker-compose logs -f backend | grep ERROR

# Проверка состояния всех сервисов
docker-compose ps

# Проверка использования ресурсов
docker-compose exec backend top
```

## 📊 Мониторинг производительности

### Ключевые метрики
- **CPU usage**: < 70%
- **Memory usage**: < 80%
- **Disk space**: > 20% свободного
- **Response time**: < 2 секунды

### Команды мониторинга
```bash
# Системные ресурсы
htop

# Дисковое пространство
df -h

# Сетевые подключения
netstat -tulpn | grep :8000
```

## 🔒 Безопасность

### Рекомендации
1. **Регулярно обновляйте** систему и зависимости
2. **Используйте сильные пароли** для всех аккаунтов
3. **Настройте firewall** для ограничения доступа
4. **Мониторьте логи** на предмет подозрительной активности
5. **Делайте регулярные бэкапы**

### Firewall (UFW)
```bash
# Базовая настройка
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте [FAQ](README.md#-faq)
2. Изучите [Issues](../../issues)
3. Создайте новый [Issue](../../issues/new)
4. Обратитесь в [Discussions](../../discussions)