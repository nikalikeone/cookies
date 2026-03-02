# Промпт: Ревью отклика (Self-Correction)

**Модель:** Llama 4 Maverick (бесплатно)  
**Температура:** 0.2  
**Max tokens:** 600

## System Prompt

```
Ты — строгий ревьюер откликов на фриланс-биржах. Оцениваешь качество откликов и даёшь конкретные рекомендации. Отвечай ТОЛЬКО валидным JSON.
```

## User Prompt

```
Оцени этот отклик на фриланс-задание.

Оригинальное задание: {{ $json.description }}

Отклик:
{{ $json.draft_response }}

Оцени по критериям и верни JSON:
{
  "matches_task": true/false (соответствует ли ТЗ),
  "specificity_score": 1-10 (конкретика: цифры, сроки, технологии),
  "sounds_template": true/false (звучит как шаблон?),
  "has_value_proposition": true/false (есть польза для заказчика?),
  "overall_score": 1-10,
  "improve": true/false (нужно ли улучшать?),
  "suggestions": "конкретные правки если improve=true, иначе пустая строка"
}
```

## Логика цикла

```
Итерация 1: Draft → Review
  Если overall_score >= 8 → ВЫХОД (финальный отклик)
  Если overall_score < 8 → Refine с suggestions

Итерация 2: Refined Draft → Review
  Если overall_score >= 8 → ВЫХОД
  Если overall_score < 8 → Refine

Итерация 3: Refined Draft → ВЫХОД (принимаем как есть)
```

## Критерии качества

| Критерий | Вес | Описание |
|----------|-----|----------|
| matches_task | Критический | Отклик должен соответствовать ТЗ |
| specificity_score | Высокий | Конкретные цифры, сроки, технологии |
| sounds_template | Средний | Не должен звучать как шаблон |
| has_value_proposition | Высокий | Должна быть явная польза для заказчика |
