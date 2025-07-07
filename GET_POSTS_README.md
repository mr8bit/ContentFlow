# 📨 Скрипт для получения постов из Telegram каналов

Этот скрипт позволяет получить список постов из любого Telegram канала, используя те же классы и методы что и основной worker.

## 🚀 Запуск в Docker

### Способ 1: Интерактивный режим

```bash
# Запуск скрипта в интерактивном режиме
docker-compose --profile tools run --rm get-posts
```

В интерактивном режиме скрипт:
1. Покажет список доступных каналов из базы данных
2. Попросит ввести ID или username канала
3. Попросит ввести количество сообщений для получения

### Способ 2: С параметрами командной строки

```bash
# Получить 50 постов из канала testhuypizda
docker-compose --profile tools run --rm get-posts uv run python get_channel_posts.py testhuypizda 50

# Получить 100 постов из канала @channelname
docker-compose --profile tools run --rm get-posts uv run python get_channel_posts.py @channelname 100

# Получить 20 постов (по умолчанию)
docker-compose --profile tools run --rm get-posts uv run python get_channel_posts.py testchannel
```

## 📋 Параметры

- `channel_identifier` - ID или username канала (например: `testhuypizda` или `@channelname`)
- `limit` - Количество сообщений для получения (по умолчанию: 50)

## 📊 Что показывает скрипт

Для каждого поста скрипт выводит:
- 🆔 ID сообщения
- 📅 Дата публикации
- 👤 Информация об отправителе
- 👀 Количество просмотров
- 🔄 Количество пересылок
- 📝 Текст сообщения (первые 200 символов)
- 🖼️ Информация о медиа файлах

## 🔧 Локальный запуск (без Docker)

```bash
# Перейти в папку backend
cd backend

# Установить зависимости
uv sync

# Запустить скрипт
uv run python get_channel_posts.py testhuypizda 50
```

## ⚠️ Требования

1. **База данных должна быть запущена** - скрипт использует настройки из БД
2. **Telegram API настроен** - в базе должны быть корректные API_ID, API_HASH и SESSION_STRING
3. **Доступ к каналу** - аккаунт должен иметь доступ к указанному каналу

## 🛠️ Примеры использования

### Получить последние 20 постов из канала
```bash
docker-compose --profile tools run --rm get-posts uv run python get_channel_posts.py testhuypizda 20
```

### Получить 100 постов из публичного канала
```bash
docker-compose --profile tools run --rm get-posts uv run python get_channel_posts.py @durov 100
```

### Интерактивный режим с выбором канала
```bash
docker-compose --profile tools run --rm get-posts
```

## 🔍 Отладка

Если скрипт не работает:

1. Проверьте, что основные сервисы запущены:
   ```bash
   docker-compose up -d postgres redis backend
   ```

2. Проверьте логи:
   ```bash
   docker-compose --profile tools logs get-posts
   ```

3. Убедитесь, что в базе данных есть корректные настройки Telegram API

4. Проверьте, что у аккаунта есть доступ к указанному каналу

## 📝 Примечания

- Скрипт использует профиль `tools` в docker-compose, поэтому он не запускается автоматически
- Флаг `--rm` автоматически удаляет контейнер после завершения работы
- Скрипт безопасно отключается от Telegram API после завершения работы
- Все логи выводятся в консоль для удобства отладки