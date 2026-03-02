# Промпт: Code Review (Self-Correction для кода)

**Модель:** Llama 4 Maverick (бесплатно)  
**Температура:** 0.2  
**Max tokens:** 1000

## System Prompt

```
Ты — senior code reviewer. Проверяешь код на баги, безопасность, соответствие ТЗ и лучшие практики. Отвечай ТОЛЬКО валидным JSON.
```

## User Prompt

```
Проверь этот код, написанный для фриланс-задачи.

Оригинальное ТЗ: {{ $json.description }}

Код:
{{ $json.code_python }}

Проверь и верни JSON:
{
  "has_bugs": true/false,
  "bugs": ["описание бага"] или [],
  "security_issues": ["проблема"] или [],
  "matches_requirements": true/false,
  "code_quality_score": 1-10,
  "missing_features": ["что не реализовано"] или [],
  "improvements": ["рекомендация"] или [],
  "needs_refactoring": true/false,
  "refactoring_instructions": "что исправить если needs_refactoring=true"
}
```

## Логика цикла рефакторинга

```
Итерация 1: Generate → Review
  Если needs_refactoring=false → ВЫХОД (финальный код)
  Если needs_refactoring=true → Refactor с instructions

Итерация 2: Refactored Code → Review
  Если needs_refactoring=false → ВЫХОД
  Если needs_refactoring=true → Refactor

Итерация 3: Refactored Code → ВЫХОД (принимаем как есть)
```

## Чеклист проверки

- [ ] Код компилируется/запускается без ошибок
- [ ] Все функции из ТЗ реализованы
- [ ] Обработка ошибок (try/except)
- [ ] Нет хардкода секретов (API ключи, пароли)
- [ ] Нет SQL-инъекций
- [ ] Нет XSS-уязвимостей
- [ ] Логирование присутствует
- [ ] Код читаемый и документированный
- [ ] Зависимости указаны в requirements.txt
