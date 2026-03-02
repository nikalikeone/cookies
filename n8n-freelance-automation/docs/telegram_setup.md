# 🤖 Подробная настройка Telegram бота

## Шаг 1: Создание бота через BotFather

1. Откройте Telegram
2. Найдите бота **@BotFather** (с синей галочкой верификации)
3. Нажмите **Start** или отправьте `/start`
4. Отправьте команду `/newbot`
5. BotFather спросит имя бота — введите, например: `Freelance Helper Bot`
6. BotFather спросит username — введите, например: `my_freelance_helper_bot`
   - Username должен заканчиваться на `bot` или `Bot`
   - Должен быть уникальным
7. BotFather выдаст **токен** — скопируйте его

```
Пример токена: 7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
```

> ⚠️ **Никому не показывайте токен!** Это полный доступ к вашему боту.

## Шаг 2: Настройка бота (опционально)

Отправьте BotFather следующие команды:

```
/setdescription — Установить описание бота
/setabouttext — Установить текст "О боте"
/setuserpic — Установить аватар бота
/setcommands — Установить команды меню
```

### Рекомендуемые команды:

```
start - Начать работу с ботом
help - Показать справку по формату сообщений
example - Показать пример сообщения
```

## Шаг 3: Настройка в n8n

### 3.1 Создание Credential

1. Откройте n8n → **Settings** (⚙️) → **Credentials**
2. Нажмите **+ Add Credential**
3. В поиске введите `Telegram`
4. Выберите **Telegram API**
5. Заполните:
   - **Credential Name**: `Telegram Bot` (или любое имя)
   - **Access Token**: вставьте токен от BotFather
6. Нажмите **Save**

### 3.2 Настройка Telegram Trigger

1. В workflow дважды кликните на ноду **Telegram Trigger**
2. В поле **Credential** выберите созданный `Telegram Bot`
3. В **Updates** убедитесь, что выбрано `message`
4. Нажмите **Save**

### 3.3 Настройка Send to Telegram

1. Дважды кликните на ноду **Send to Telegram**
2. Выберите тот же credential `Telegram Bot`
3. Нажмите **Save**

## Шаг 4: Настройка Webhook

### Для n8n.cloud

Webhook настраивается автоматически. Просто активируйте workflow.

### Для self-hosted n8n

n8n должен быть доступен из интернета для получения обновлений от Telegram.

#### Вариант A: ngrok (для тестирования)

```bash
# Установка
npm install -g ngrok
# или
brew install ngrok  # macOS

# Запуск
ngrok http 5678

# Скопируйте URL (например: https://a1b2c3d4.ngrok.io)
```

Установите URL в n8n:
```bash
# В docker-compose.yml
WEBHOOK_URL=https://a1b2c3d4.ngrok.io/

# Или при запуске
N8N_WEBHOOK_URL=https://a1b2c3d4.ngrok.io/ n8n start
```

#### Вариант B: Cloudflare Tunnel (бесплатно, для продакшена)

```bash
# Установка
brew install cloudflared  # macOS
# или скачайте с https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Быстрый запуск (без аккаунта)
cloudflared tunnel --url http://localhost:5678

# С аккаунтом Cloudflare (постоянный URL)
cloudflared tunnel login
cloudflared tunnel create n8n-tunnel
cloudflared tunnel route dns n8n-tunnel n8n.yourdomain.com
cloudflared tunnel run n8n-tunnel
```

#### Вариант C: Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name n8n.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Шаг 5: Проверка

1. Активируйте workflow в n8n (зелёный тумблер)
2. Откройте Telegram, найдите вашего бота
3. Отправьте тестовое сообщение:

```
Новый заказ
Биржа: Kwork
Заголовок: Тестовое задание
Описание: Это тестовое сообщение для проверки бота
Бюджет: 1000₽
Дедлайн: 1 день
```

4. Бот должен ответить анализом задания и откликом

## Устранение проблем

### Бот не отвечает

1. Проверьте, что workflow **активирован**
2. Проверьте **Executions** в n8n — есть ли ошибки
3. Проверьте Webhook URL:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```
4. Если webhook не установлен — перезапустите workflow

### Ошибка 409: Conflict

Другой процесс использует тот же токен. Остановите все другие боты с этим токеном.

### Ошибка 401: Unauthorized

Неверный токен. Проверьте токен в credential.

### Webhook не устанавливается

Убедитесь, что:
- `WEBHOOK_URL` установлен и доступен из интернета
- URL начинается с `https://` (Telegram требует HTTPS)
- Порт 5678 открыт
