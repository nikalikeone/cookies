# 🧠 Подробная настройка OpenRouter (бесплатные AI-модели)

## Что такое OpenRouter?

OpenRouter — это единый API-шлюз для доступа к AI-моделям от разных провайдеров (Google, Meta, Mistral, OpenAI и др.). Многие модели доступны **бесплатно**.

## Шаг 1: Регистрация

1. Перейдите на [openrouter.ai](https://openrouter.ai)
2. Нажмите **Sign In**
3. Войдите через Google, GitHub или email
4. Подтвердите email (если регистрация через email)

## Шаг 2: Создание API-ключа

1. После входа перейдите в **Keys** (в меню слева или по ссылке [openrouter.ai/keys](https://openrouter.ai/keys))
2. Нажмите **Create Key**
3. Введите имя ключа: `n8n-freelance-bot`
4. Нажмите **Create**
5. **Скопируйте ключ** (формат: `sk-or-v1-...`)

> ⚠️ Ключ показывается только один раз! Сохраните его в надёжном месте.

## Шаг 3: Настройка в n8n

### Создание Header Auth Credential

1. Откройте n8n → **Settings** → **Credentials**
2. Нажмите **+ Add Credential**
3. В поиске введите `Header Auth`
4. Выберите **Header Auth**
5. Заполните:
   - **Credential Name**: `OpenRouter API Key`
   - **Name** (header name): `Authorization`
   - **Value** (header value): `Bearer sk-or-v1-ваш_ключ_здесь`
6. Нажмите **Save**

### Привязка к нодам

Обновите credential во всех HTTP Request нодах:
- `AI Analysis (Gemini Free)`
- `Draft Response (Mistral Free)`
- `Review Response (Llama Free)`
- `Refine Response (Mistral Free)`
- `Generate Code (Gemini Free)`
- `Code Review (Llama Free)`
- `Refactor Code (Gemini Free)`
- `Design Instructions (Gemini Free)`

Для каждой ноды:
1. Дважды кликните на ноду
2. В разделе **Authentication** выберите `Header Auth`
3. В **Credential** выберите `OpenRouter API Key`
4. Нажмите **Save**

## Бесплатные модели

### Используемые в workflow

| Модель | ID на OpenRouter | Назначение |
|--------|-----------------|-----------|
| Google Gemini 2.0 Flash | `google/gemini-2.0-flash-exp:free` | Анализ, генерация кода, дизайн |
| Mistral Small 3.1 24B | `mistralai/mistral-small-3.1-24b-instruct:free` | Генерация откликов |
| Llama 4 Maverick | `meta-llama/llama-4-maverick:free` | Ревью откликов и кода |

### Другие бесплатные модели (альтернативы)

| Модель | ID | Качество | Скорость |
|--------|-----|----------|----------|
| Gemini 2.5 Pro | `google/gemini-2.5-pro-exp-03-25:free` | ⭐⭐⭐⭐⭐ | Средне |
| Llama 4 Scout | `meta-llama/llama-4-scout:free` | ⭐⭐⭐⭐ | Быстро |
| Qwen3 235B | `qwen/qwen3-235b-a22b:free` | ⭐⭐⭐⭐ | Средне |
| DeepSeek V3 | `deepseek/deepseek-chat-v3-0324:free` | ⭐⭐⭐⭐ | Средне |
| Mistral Small 3.1 | `mistralai/mistral-small-3.1-24b-instruct:free` | ⭐⭐⭐ | Быстро |

> Актуальный список: [openrouter.ai/models?q=free](https://openrouter.ai/models?q=free)

## Лимиты бесплатных моделей

- **Rate limit**: ~10-20 запросов в минуту
- **Daily limit**: ~50-200 запросов в день (зависит от модели)
- **Token limit**: зависит от модели (обычно 4K-32K контекст)
- **Очередь**: в пиковые часы возможны задержки

### Как проверить лимиты

1. Перейдите на [openrouter.ai/activity](https://openrouter.ai/activity)
2. Посмотрите использование за день
3. Если лимит исчерпан — подождите до следующего дня или используйте альтернативный провайдер

## Формат запроса

OpenRouter использует формат, совместимый с OpenAI:

```json
{
  "model": "google/gemini-2.0-flash-exp:free",
  "messages": [
    {"role": "system", "content": "Системный промпт"},
    {"role": "user", "content": "Пользовательский промпт"}
  ],
  "temperature": 0.3,
  "max_tokens": 1500
}
```

### Обязательные заголовки

```
Authorization: Bearer sk-or-v1-ваш_ключ
Content-Type: application/json
HTTP-Referer: https://your-app.com  (рекомендуется)
X-Title: Your App Name  (рекомендуется)
```

## Устранение проблем

### Ошибка 401: Invalid API key

- Проверьте, что ключ начинается с `sk-or-v1-`
- Проверьте, что в Header Auth значение: `Bearer sk-or-v1-...` (с пробелом после Bearer)

### Ошибка 429: Rate limit exceeded

- Подождите 1-2 минуты
- Или переключитесь на альтернативную модель
- Или используйте прямой API провайдера (Google, Groq, Mistral)

### Ошибка 503: Model unavailable

- Бесплатная модель временно недоступна
- Попробуйте другую бесплатную модель
- Проверьте статус: [status.openrouter.ai](https://status.openrouter.ai)

### Пустой ответ или timeout

- Увеличьте `timeout` в HTTP Request ноде (30000-60000 мс)
- Уменьшите `max_tokens` (меньше токенов = быстрее ответ)
- Попробуйте модель с меньшим размером (Mistral Small вместо Llama 70B)
