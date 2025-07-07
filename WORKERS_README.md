# 🔧 Архитектура воркеров

Система разделена на два независимых воркера для повышения надежности и масштабируемости:

## 📥 Scrapper Worker

**Файл:** `backend/scrapper.py`  
**Docker:** `Dockerfile.scrapper`  
**Сервис:** `scrapper` в docker-compose.yml

### Функции:
- 🔍 Мониторинг Telegram-каналов в реальном времени
- 📨 Получение новых сообщений из источников
- 💾 Сохранение постов и медиафайлов в базу данных
- 🔄 Периодическая проверка каналов (fallback механизм)
- 💓 Отправка heartbeat сигналов

### Управление:
- Статус хранится в таблице `scrapper_status`
- Управляется через поля `should_run` и `is_running`
- Автоматическая перезагрузка каналов каждые 30 минут

## 📤 Publisher Worker

**Файл:** `backend/publisher.py`  
**Docker:** `Dockerfile.publisher`  
**Сервис:** `publisher` в docker-compose.yml

### Функции:
- 🤖 Обработка текста постов через OpenRouter AI
- 📅 Публикация запланированных постов
- 🚀 Немедленная публикация постов (статус "publishing")
- 📸 Поддержка медиа-групп, фото, видео, документов
- 💓 Отправка heartbeat сигналов

### Управление:
- Статус хранится в таблице `publisher_status`
- Управляется через поля `should_run` и `is_running`
- Обработка постов каждые 10 секунд
- Публикация каждые 15 секунд

## 🗄️ База данных

### Новые таблицы:
- `scrapper_status` - статус scrapper воркера
- `publisher_status` - статус publisher воркера

### Поля статуса:
- `should_run` - должен ли воркер работать
- `is_running` - работает ли воркер сейчас
- `last_heartbeat` - последний heartbeat
- `started_at` - время запуска
- `stopped_at` - время остановки

## 🐳 Docker

### Запуск всех сервисов:
```bash
docker-compose up -d
```

### Запуск только scrapper:
```bash
docker-compose up -d scrapper
```

### Запуск только publisher:
```bash
docker-compose up -d publisher
```

### Просмотр логов:
```bash
# Scrapper логи
docker-compose logs -f scrapper

# Publisher логи
docker-compose logs -f publisher
```

## 🔄 Миграция

Для применения новых таблиц в базе данных:

```bash
# Перейти в директорию backend
cd backend

# Применить миграции
alembic upgrade head
```

## 📊 Мониторинг

### Через API:
- `GET /api/scrapper/status` - статус scrapper
- `GET /api/publisher/status` - статус publisher
- `POST /api/scrapper/start` - запуск scrapper
- `POST /api/scrapper/stop` - остановка scrapper
- `POST /api/publisher/start` - запуск publisher
- `POST /api/publisher/stop` - остановка publisher

### Через базу данных:
```sql
-- Проверить статус scrapper
SELECT * FROM scrapper_status;

-- Проверить статус publisher
SELECT * FROM publisher_status;
```

## 🔧 Преимущества новой архитектуры

1. **Независимость**: Воркеры могут работать независимо друг от друга
2. **Масштабируемость**: Можно запускать несколько экземпляров каждого воркера
3. **Надежность**: Сбой одного воркера не влияет на другой
4. **Гибкость**: Можно останавливать/запускать воркеры по отдельности
5. **Мониторинг**: Отдельное отслеживание состояния каждого воркера

## 🚨 Важные замечания

- Старый `worker.py` больше не используется
- Убедитесь, что применили миграции базы данных
- Каждый воркер имеет свой собственный жизненный цикл
- Heartbeat сигналы помогают отслеживать "живость" воркеров
- Воркеры автоматически останавливаются при получении сигнала `should_run = False`