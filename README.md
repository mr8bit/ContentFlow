# Auto Poster Bot

Платформа для автоматического мониторинга и репостинга контента из Telegram каналов с предварительной обработкой и модерацией.

## Возможности

- 🔍 **Мониторинг каналов**: Автоматическое отслеживание новых постов в указанных Telegram каналах
- 🤖 **AI обработка**: Переписывание текстов с помощью OpenRouter API
- ✅ **Модерация**: Веб-интерфейс для одобрения/отклонения постов
- 📤 **Автопубликация**: Автоматическая публикация одобренных постов в целевые каналы
- 📊 **Аналитика**: Панель управления с статистикой и мониторингом
- 🎛️ **Настройки**: Гибкая конфигурация интервалов проверки и параметров

## Технологический стек

### Backend
- **Python 3.11+** с управлением зависимостями через `uv`
- **FastAPI** для REST API
- **SQLAlchemy** + **PostgreSQL** для базы данных
- **Redis** для кэширования и очередей
- **Celery** для фоновых задач
- **Telethon** для работы с Telegram API (непрерывный мониторинг)
- **OpenRouter** для AI обработки текстов

### Frontend
- **React 18** с TypeScript
- **Material-UI** для компонентов интерфейса
- **React Query** для управления состоянием и кэширования
- **React Router** для навигации
- **Axios** для HTTP запросов

### Инфраструктура
- **Docker Compose** для оркестрации сервисов
- **PostgreSQL** база данных
- **Redis** для кэширования

## Быстрый старт

### Предварительные требования

1. **Docker** и **Docker Compose**
2. **Telegram API credentials** (получить на [my.telegram.org](https://my.telegram.org))
3. **Telegram Bot Token** (получить у [@BotFather](https://t.me/botfather))
4. **OpenRouter API Key** (зарегистрироваться на [openrouter.ai](https://openrouter.ai))

### Установка и запуск

1. **Клонируйте репозиторий**:
   ```bash
   git clone <repository-url>
   cd auto-poster-bot
   ```

2. **Настройте переменные окружения**:
   ```bash
   cp .env.example .env
   ```
   
   Отредактируйте `.env` файл:
   ```env
   # Telegram API (для Telethon)
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   TELEGRAM_SESSION_STRING=your_session_string_here
   
   # Telegram Bot (для публикации)
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   
   # OpenRouter
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=anthropic/claude-3-haiku
   
   # Database
   DATABASE_URL=postgresql://postgres:postgres@db:5432/autoposter
   
   # Redis
   REDIS_URL=redis://redis:6379/0
   
   # JWT
   JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
   
   # Admin
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```

3. **Запустите сервисы**:
   ```bash
   docker-compose up -d
   ```

4. **Дождитесь запуска всех сервисов** (может занять несколько минут при первом запуске)

5. **Настройте Telegram сессию** (если еще не сделано):
   ```bash
   # Запустите скрипт для генерации session string
   docker-compose exec backend python generate_session_telethon.py
   ```
   
   Следуйте инструкциям и добавьте полученный session string в `.env` файл.

6. **Перезапустите сервисы**:
   ```bash
   docker-compose restart
   ```

7. **Откройте веб-интерфейс**: http://localhost:3000

### Первоначальная настройка

1. **Войдите в систему**:
   - Логин: `admin`
   - Пароль: `admin123`

2. **Добавьте исходные каналы**:
   - Перейдите в раздел "Исходные каналы"
   - Нажмите "Добавить канал"
   - Укажите ID канала (например: `@channel_name` или `-1001234567890`)
   - Настройте интервал проверки

3. **Добавьте целевые каналы**:
   - Перейдите в раздел "Целевые каналы"
   - Добавьте каналы для публикации

4. **Настройте параметры**:
   - Перейдите в "Настройки"
   - Проверьте и настройте параметры системы

## Архитектура системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     Worker      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (Python)      │
│   Port: 3000    │    │   Port: 8000    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Telegram API  │
│   Port: 5432    │    │   Port: 6379    │    │   OpenRouter    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Компоненты

- **Frontend**: React приложение с Material-UI интерфейсом
- **Backend**: FastAPI сервер с REST API
- **Worker**: Фоновый процесс для мониторинга каналов и обработки постов
- **PostgreSQL**: Основная база данных
- **Redis**: Кэширование и очереди задач

## Использование

### Мониторинг каналов

1. **Непрерывный мониторинг**: Система использует Telethon для real-time отслеживания новых сообщений
2. **Fallback механизм**: При сбоях переключается на периодическую проверку каналов
3. Новые посты сохраняются в базе данных со статусом "pending"
4. Worker обрабатывает посты через OpenRouter API
5. Обработанные посты получают статус "processed"

### Модерация постов

1. Перейдите в раздел "Посты"
2. Просмотрите обработанные посты
3. Отредактируйте текст при необходимости
4. Одобрите или отклоните посты
5. Одобренные посты автоматически публикуются в целевые каналы

### Управление каналами

- **Исходные каналы**: Каналы для мониторинга новых постов
- **Целевые каналы**: Каналы для публикации одобренных постов
- Возможность включения/отключения каналов
- Настройка индивидуальных интервалов проверки

## API документация

После запуска системы API документация доступна по адресам:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Разработка

### Настройка Telegram сессии

Для работы с Telethon необходимо настроить сессию:

1. **Получите API credentials**:
   - Перейдите на [my.telegram.org](https://my.telegram.org)
   - Войдите в аккаунт и создайте приложение
   - Сохраните `api_id` и `api_hash`

2. **Сгенерируйте session string**:
   ```bash
   # Локально
   cd backend
   uv run python generate_session_telethon.py
   
   # Или в Docker
   docker-compose exec backend python generate_session_telethon.py
   ```

3. **Добавьте в .env файл**:
   ```env
   TELEGRAM_API_ID=your_api_id
   TELEGRAM_API_HASH=your_api_hash
   TELEGRAM_SESSION_STRING=generated_session_string
   ```

Подробные инструкции см. в [SESSION_SETUP.md](SESSION_SETUP.md)

### Локальная разработка backend

```bash
cd backend

# Установка зависимостей
uv sync

# Запуск в режиме разработки
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Локальная разработка frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm start
```

### Миграции базы данных

```bash
# Создание миграции
docker-compose exec backend alembic revision --autogenerate -m "Description"

# Применение миграций
docker-compose exec backend alembic upgrade head
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | - |
| `OPENROUTER_API_KEY` | API ключ OpenRouter | - |
| `OPENROUTER_MODEL` | Модель для обработки текстов | `anthropic/claude-3-haiku` |
| `DATABASE_URL` | URL подключения к PostgreSQL | - |
| `REDIS_URL` | URL подключения к Redis | - |
| `JWT_SECRET_KEY` | Секретный ключ для JWT | - |
| `JWT_EXPIRE_MINUTES` | Время жизни JWT токена (минуты) | `1440` |
| `ADMIN_USERNAME` | Имя администратора по умолчанию | `admin` |
| `ADMIN_PASSWORD` | Пароль администратора | `admin123` |
| `DEFAULT_CHECK_INTERVAL` | Интервал проверки по умолчанию (сек) | `300` |

### Настройки Telegram бота

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен бота
3. Добавьте бота в каналы как администратора
4. Дайте боту права на чтение сообщений и отправку сообщений

### Настройки OpenRouter

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Получите API ключ
3. Выберите подходящую модель (рекомендуется `anthropic/claude-3-haiku`)

## Мониторинг и логи

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend
```

### Статус сервисов

```bash
docker-compose ps
```

### Мониторинг ресурсов

```bash
docker-compose top
```

## Устранение неполадок

### Частые проблемы

1. **Бот не может получить доступ к каналу**:
   - Убедитесь, что бот добавлен в канал как администратор
   - Проверьте права бота на чтение сообщений

2. **Ошибки OpenRouter API**:
   - Проверьте корректность API ключа
   - Убедитесь в наличии средств на аккаунте
   - Проверьте доступность выбранной модели

3. **Проблемы с базой данных**:
   - Проверьте подключение к PostgreSQL
   - Выполните миграции: `docker-compose exec backend alembic upgrade head`

4. **Проблемы с Redis**:
   - Проверьте статус Redis контейнера
   - Перезапустите сервисы: `docker-compose restart`

### Сброс системы

```bash
# Остановка и удаление всех контейнеров
docker-compose down -v

# Удаление образов (опционально)
docker-compose down -v --rmi all

# Повторный запуск
docker-compose up -d
```

## Безопасность

- Измените пароль администратора по умолчанию
- Используйте сильный JWT секретный ключ
- Регулярно обновляйте зависимости
- Не храните секретные данные в коде
- Используйте HTTPS в продакшене

## Лицензия

MIT License

## Поддержка

Для получения поддержки создайте issue в репозитории проекта.