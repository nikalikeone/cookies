# 🔧 Руководство по настройке — Freelance Automation Bot

## Содержание
1. [Требования](#требования)
2. [Установка n8n](#установка-n8n)
3. [Получение бесплатных API ключей](#получение-бесплатных-api-ключей)
4. [Настройка Telegram бота](#настройка-telegram-бота)
5. [Импорт workflow в n8n](#импорт-workflow-в-n8n)
6. [Настройка credentials в n8n](#настройка-credentials-в-n8n)
7. [Тестирование](#тестирование)
8. [Устранение неполадок](#устранение-неполадок)

---

## Требования

- **Node.js** 18+ (для self-hosted n8n)
- **Telegram** аккаунт
- **Интернет** для доступа к AI API

---

## Установка n8n

### Вариант 1: Docker (рекомендуется)

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

### Вариант 2: npm

```bash
npm install n8n -g
n8n start
```

### Вариант 3: n8n Cloud (бесплатный тариф)

Зарегистрируйтесь на [n8n.io](https://n8n.io) — бесплатный тариф включает 5 workflow и 100 выполнений/месяц.

После запуска n8n доступен по адресу: **http://localhost:5678**

---

## Получение бесплатных API ключей

### 1. OpenRouter API (основной — доступ к бесплатным моделям)

1. Перейдите на [openrouter.ai](https://openrouter.ai)
2. Зарегистрируйтесь (можно через Google/GitHub)
3. Перейдите в **Keys** → **Create Key**
4. Скопируйте ключ формата `sk-or-v1-...`

**Бесплатные модели через OpenRouter:**
| Модель | Лимит | Использование |
|--------|-------|---------------|
| `google/gemini-2.0-flash-exp:free` | ~50 req/day | Анализ, генерация кода, дизайн |
| `mistralai/mistral-7b-instruct:free` | ~50 req/day | Ревью откликов и кода |
| `meta-llama/llama-3.1-8b-instruct:free` | ~50 req/day | Резервная модель |
| `qwen/qwen-2.5-7b-instruct:free` | ~50 req/day | Резервная модель |

### 2. Альтернативные бесплатные API (резервные)

#### Google AI Studio (Gemini напрямую)
1. Перейдите на [aistudio.google.com](https://aistudio.google.com)
2. **Get API Key** → **Create API Key**
3. Бесплатно: 15 RPM, 1M токенов/день
4. Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`

#### Groq (Llama, Mixtral)
1. Перейдите на [console.groq.com](https://console.groq.com)
2. Зарегистрируйтесь → **API Keys** → **Create**
3. Бесплатно: 30 RPM, 14,400 req/day
4. Endpoint: `https://api.groq.com/openai/v1/chat/completions`

#### Mistral AI
1. Перейдите на [console.mistral.ai](https://console.mistral.ai)
2. Зарегистрируйтесь → **API Keys** → **Create**
3. Бесплатно: ограниченный тариф для экспериментов
4. Endpoint: `https://api.mistral.ai/v1/chat/completions`

---

## Настройка Telegram бота

### Шаг 1: Создание бота

1. Откройте Telegram, найдите **@BotFather**
2. Отправьте `/newbot`
3. Введите имя бота: `Freelance Automation Bot` (или любое)
4. Введите username: `my_freelance_auto_bot` (уникальный, заканчивается на `bot`)
5. **Скопируйте токен** формата `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### Шаг 2: Настройка бота

Отправьте BotFather следующие команды:

```
/setdescription
Бот для автоматизации работы на фриланс-биржах. Анализирует задания, генерирует отклики, пишет код.

/setcommands
help - Справка по использованию бота
status - Статус системы
```

### Шаг 3: Получение Chat ID

1. Напишите боту любое сообщение
2. Откройте в браузере: `https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates`
3. Найдите `"chat":{"id":XXXXXXXX}` — это ваш Chat ID

---

## Импорт workflow в n8n

### Шаг 1: Открыть n8n

Перейдите на `http://localhost:5678` (или ваш n8n Cloud URL)

### Шаг 2: Импорт

1. Нажмите **"+"** (создать workflow) или **Import from File**
2. Выберите файл `freelance_automation_workflow.json`
3. Workflow появится на канвасе

### Шаг 3: Альтернативный импорт (через URL/clipboard)

1. Откройте файл `freelance_automation_workflow.json`
2. Скопируйте всё содержимое
3. В n8n: **Ctrl+V** на пустом канвасе

---

## Настройка credentials в n8n

### 1. Telegram Bot API

1. В n8n перейдите в **Settings** → **Credentials** → **Add Credential**
2. Выберите **Telegram API**
3. Введите:
   - **Name:** `Telegram Bot`
   - **Access Token:** ваш токен от BotFather
4. Нажмите **Save**

### 2. OpenRouter API (HTTP Header Auth)

1. **Settings** → **Credentials** → **Add Credential**
2. Выберите **Header Auth**
3. Введите:
   - **Name:** `OpenRouter API`
   - **Header Name:** `Authorization`
   - **Header Value:** `Bearer sk-or-v1-ВАШ_КЛЮЧ`
4. Нажмите **Save**

### 3. Привязка credentials к нодам

После создания credentials, откройте каждый HTTP Request нод и выберите созданные credentials:
- Все ноды **Telegram** → credential `Telegram Bot`
- Все ноды **HTTP Request** (AI) → credential `OpenRouter API`

---

## Тестирование

### Тест 1: Команда /help

Отправьте боту `/help` — должна прийти справка.

### Тест 2: Простое задание

Отправьте боту:

```
Новый заказ
Биржа: Kwork
Заголовок: Нужен парсер Wildberries
Описание: Написать Python-скрипт для парсинга карточек товаров с Wildberries. Нужно собирать: название, цену, рейтинг, количество отзывов. Выгрузка в CSV.
Бюджет: 5000₽
Дедлайн: 3 дня
```

**Ожидаемый результат:**
1. ⏳ Уведомление о начале обработки
2. 📊 Анализ задания (тип, сложность, рекомендация)
3. ✍️ Готовый отклик (с оценкой качества)
4. 💻 Сгенерированный код (с ревью)

### Тест 3: Дизайн-задание

```
Новый заказ
Биржа: FL.ru
Заголовок: Логотип для кофейни
Описание: Нужен минималистичный логотип для кофейни "Утренний кофе". Стиль: современный, чистый. Цвета: коричневый, бежевый, белый.
Бюджет: 3000₽
Дедлайн: 2 дня
```

---

## Устранение неполадок

### Проблема: Бот не отвечает

1. Проверьте, что workflow **активирован** (зелёный тумблер в n8n)
2. Проверьте токен Telegram бота
3. Убедитесь, что n8n доступен из интернета (для webhook):
   - Для локальной установки используйте `n8n start --tunnel`
   - Или настройте ngrok: `ngrok http 5678`

### Проблема: AI не отвечает / ошибка 429

1. Превышен лимит бесплатных запросов
2. Решение: подождите 1 час или переключитесь на другую модель
3. Замените модель в HTTP Request нодах:
   - `google/gemini-2.0-flash-exp:free` → `meta-llama/llama-3.1-8b-instruct:free`

### Проблема: Ошибка парсинга JSON от AI

1. AI иногда возвращает невалидный JSON
2. В Code нодах есть fallback-обработка
3. Если проблема повторяется — понизьте `temperature` в HTTP Request нодах

### Проблема: Webhook URL не работает

Для self-hosted n8n нужен публичный URL:

```bash
# Вариант 1: встроенный туннель
n8n start --tunnel

# Вариант 2: ngrok
ngrok http 5678

# Вариант 3: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5678
```

---

## Переменные окружения (опционально)

Для продвинутой настройки можно задать переменные:

```bash
# n8n
export N8N_PORT=5678
export N8N_PROTOCOL=https
export WEBHOOK_URL=https://your-domain.com

# Для прямого использования API (без OpenRouter)
export GOOGLE_AI_API_KEY=your_key
export GROQ_API_KEY=your_key
export MISTRAL_API_KEY=your_key
```
