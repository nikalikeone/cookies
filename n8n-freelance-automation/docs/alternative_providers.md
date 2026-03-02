# 🔄 Альтернативные AI-провайдеры (бесплатные)

Если OpenRouter недоступен или лимиты исчерпаны, используйте прямые API провайдеров.

---

## 1. Google Gemini (рекомендуется как основная альтернатива)

### Регистрация
1. Перейдите на [aistudio.google.com](https://aistudio.google.com)
2. Войдите через Google-аккаунт
3. Перейдите в **Get API Key** → **Create API Key**
4. Скопируйте ключ

### Бесплатные лимиты
- **15 запросов в минуту (RPM)**
- **1,000,000 токенов в минуту (TPM)**
- **1,500 запросов в день (RPD)**

### Настройка в n8n

Замените URL и тело запроса в HTTP Request нодах:

**URL:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY
```

**Тело запроса (JSON):**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Системный промпт: ...\n\nЗадание: ..."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.3,
    "maxOutputTokens": 2000,
    "topP": 0.95
  }
}
```

**Извлечение ответа:**
```javascript
// В Code Node после HTTP Request
const response = $input.first().json;
const text = response.candidates[0].content.parts[0].text;
return [{ json: { content: text } }];
```

### Credential в n8n
Для Google Gemini API ключ передаётся в URL, поэтому credential не нужен. Просто вставьте ключ в URL.

> ⚠️ Для безопасности используйте n8n Environment Variables:
> `Settings → Variables → Add → GEMINI_API_KEY`
> В URL: `...?key={{$env.GEMINI_API_KEY}}`

---

## 2. Groq (самый быстрый)

### Регистрация
1. Перейдите на [console.groq.com](https://console.groq.com)
2. Зарегистрируйтесь (Google/GitHub/email)
3. Перейдите в **API Keys** → **Create API Key**
4. Скопируйте ключ (формат: `gsk_...`)

### Бесплатные лимиты
- **30 запросов в минуту**
- **14,400 запросов в день**
- **6,000 токенов в минуту** (для больших моделей)

### Доступные модели
| Модель | Контекст | Скорость |
|--------|---------|----------|
| `llama-3.3-70b-versatile` | 128K | Очень быстро |
| `llama-3.1-8b-instant` | 128K | Мгновенно |
| `mixtral-8x7b-32768` | 32K | Быстро |
| `gemma2-9b-it` | 8K | Быстро |

### Настройка в n8n

**URL:**
```
https://api.groq.com/openai/v1/chat/completions
```

**Credential (Header Auth):**
- Name: `Authorization`
- Value: `Bearer gsk_ваш_ключ`

**Тело запроса (совместимо с OpenAI):**
```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.3,
  "max_tokens": 2000
}
```

> 💡 Формат запроса и ответа идентичен OpenRouter — достаточно заменить URL и credential.

---

## 3. Mistral AI

### Регистрация
1. Перейдите на [console.mistral.ai](https://console.mistral.ai)
2. Зарегистрируйтесь
3. Перейдите в **API Keys** → **Create Key**
4. Скопируйте ключ

### Бесплатные лимиты
- Бесплатный тариф: ограниченное количество запросов
- Модель `mistral-small-latest` доступна бесплатно

### Настройка в n8n

**URL:**
```
https://api.mistral.ai/v1/chat/completions
```

**Credential (Header Auth):**
- Name: `Authorization`
- Value: `Bearer ваш_ключ`

**Тело запроса (совместимо с OpenAI):**
```json
{
  "model": "mistral-small-latest",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.3,
  "max_tokens": 2000
}
```

---

## 4. Hugging Face Inference API

### Регистрация
1. Перейдите на [huggingface.co](https://huggingface.co)
2. Зарегистрируйтесь
3. Перейдите в **Settings** → **Access Tokens** → **New Token**
4. Скопируйте токен (формат: `hf_...`)

### Бесплатные лимиты
- Бесплатный тариф: ограниченные запросы, очередь
- Доступны тысячи моделей

### Настройка в n8n

**URL:**
```
https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3
```

**Credential (Header Auth):**
- Name: `Authorization`
- Value: `Bearer hf_ваш_токен`

**Тело запроса:**
```json
{
  "inputs": "Системный промпт\n\nUser: Ваш запрос\n\nAssistant:",
  "parameters": {
    "max_new_tokens": 1000,
    "temperature": 0.3,
    "return_full_text": false
  }
}
```

---

## 5. Together AI

### Регистрация
1. Перейдите на [api.together.xyz](https://api.together.xyz)
2. Зарегистрируйтесь
3. Получите $5 бесплатных кредитов
4. Скопируйте API-ключ

### Настройка в n8n

**URL:**
```
https://api.together.xyz/v1/chat/completions
```

**Формат запроса совместим с OpenAI.**

---

## Стратегия переключения между провайдерами

### Приоритет (по надёжности и лимитам)

```
1. OpenRouter (основной) — единый API для всех моделей
   ↓ если лимит исчерпан
2. Google Gemini Direct — 1500 запросов/день
   ↓ если лимит исчерпан
3. Groq — 14400 запросов/день, очень быстрый
   ↓ если лимит исчерпан
4. Mistral Direct — бесплатный тариф
   ↓ если лимит исчерпан
5. Hugging Face — бесплатно, но медленнее
```

### Автоматическое переключение в n8n

Можно настроить автоматический fallback:

1. Добавьте **Error Trigger** после каждого HTTP Request
2. При ошибке 429 (rate limit) → переключите на альтернативный провайдер
3. Используйте **Switch** ноду для выбора провайдера

```
HTTP Request (OpenRouter) → Error? → Switch → HTTP Request (Gemini Direct)
                                            → HTTP Request (Groq)
                                            → HTTP Request (Mistral)
```

---

## Сравнительная таблица

| Провайдер | Модели | RPD (бесплатно) | Скорость | Формат API | Качество |
|-----------|--------|-----------------|----------|-----------|----------|
| OpenRouter | Все | ~50-200 | Средне | OpenAI | ⭐⭐⭐⭐ |
| Google Gemini | Gemini | 1,500 | Быстро | Свой | ⭐⭐⭐⭐ |
| Groq | Llama, Mixtral | 14,400 | Очень быстро | OpenAI | ⭐⭐⭐⭐ |
| Mistral | Mistral | ~1,000 | Быстро | OpenAI | ⭐⭐⭐ |
| HuggingFace | Тысячи | Ограничено | Медленно | Свой | ⭐⭐⭐ |
| Together | Llama, Mixtral | $5 кредит | Быстро | OpenAI | ⭐⭐⭐⭐ |
