# Промпт: Генерация кода

## Системный промпт
```
Ты — опытный Python-разработчик и архитектор ПО. Пишешь чистый, документированный код с обработкой ошибок. Всегда добавляешь README с инструкцией по установке и запуску.
```

## Пользовательский промпт
```
Задача от заказчика:
{{ $json.description }}

Анализ:
Тип: {{ $json.analysis.task_subtype }}
Сложность: {{ $json.analysis.complexity }}/10
Навыки: {{ $json.analysis.required_skills.join(', ') }}

Требования к решению:
1. Сначала напиши ПЛАН реализации (3-5 шагов)
2. Затем полный рабочий код на Python с комментариями
3. Обработка ошибок (try/except) для всех критических операций
4. Логирование через logging
5. Конфигурация через переменные окружения или config
6. README.md с:
   - Описание проекта
   - Требования (Python версия, зависимости)
   - Установка (pip install)
   - Запуск
   - Примеры использования

Формат ответа:
## ПЛАН
1. ...

## КОД
```python
...
```

## REQUIREMENTS.TXT
```
...
```

## README.MD
```markdown
...
```
```

## Параметры модели
- **Модель:** `google/gemini-2.0-flash-exp:free`
- **Temperature:** 0.4
- **Max tokens:** 4000

## Типичные задачи и подходы

| Задача | Библиотеки | Подход |
|--------|-----------|--------|
| Парсинг сайтов | requests, beautifulsoup4, selenium | HTTP → BS4, динамика → Selenium |
| Telegram бот | python-telegram-bot, aiogram | aiogram 3.x для async |
| API интеграция | requests, aiohttp | REST клиент с retry |
| Работа с данными | pandas, openpyxl | DataFrame → обработка → экспорт |
| Автоматизация | schedule, apscheduler | Cron-подобное расписание |
| Скрапинг | scrapy, playwright | Scrapy для масштаба, Playwright для JS |
