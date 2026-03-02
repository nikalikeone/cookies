#!/usr/bin/env node
// ============================================
// Генератор workflow JSON для n8n
// Решает проблему экранирования спецсимволов
// ============================================

const fs = require('fs');

// --- Код для нод (Code Nodes) ---

const parseInputCode = `
// ============================================
// ПАРСЕР ВХОДЯЩЕГО СООБЩЕНИЯ ИЗ TELEGRAM
// ============================================

const message = $input.first().json.message;
const text = message.text || message.caption || '';
const chatId = message.chat.id;
const messageId = message.message_id;
const forwardFrom = message.forward_from_chat ? message.forward_from_chat.title : null;

function parseStructured(text) {
  const fields = {};
  const patterns = {
    platform: /(?:Биржа|Площадка|Платформа)[:\\s]+(.+)/i,
    url: /(?:Ссылка|URL|Link)[:\\s]+(https?:\\/\\/[^\\s]+)/i,
    title: /(?:Заголовок|Название|Тема)[:\\s]+(.+)/i,
    description: /(?:Описание|Задача|Текст)[:\\s]+([\\s\\S]*?)(?=(?:Бюджет|Дедлайн|Срок|$))/i,
    budget: /(?:Бюджет|Цена|Стоимость)[:\\s]+(.+)/i,
    deadline: /(?:Дедлайн|Срок|Время)[:\\s]+(.+)/i
  };
  for (const [key, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) fields[key] = match[1].trim();
  }
  return fields;
}

function detectPlatform(url) {
  if (!url) return 'unknown';
  const platforms = {
    'kwork.ru': 'Kwork', 'fl.ru': 'FL.ru', 'linkedin.com': 'LinkedIn',
    'profi.ru': 'Profi.ru', 'youdo.com': 'YouDo', 'habr.com/freelance': 'Habr Freelance',
    'freelance.habr.com': 'Habr Freelance', 'weblancer.net': 'Weblancer',
    'freelancehunt.com': 'FreelanceHunt', 't.me': 'Telegram', 'telegram': 'Telegram'
  };
  for (const [domain, name] of Object.entries(platforms)) {
    if (url.includes(domain)) return name;
  }
  return 'Другая биржа';
}

function parseBudget(budgetStr) {
  if (!budgetStr) return { raw: null, amount: 0, currency: 'RUB' };
  const cleaned = budgetStr.replace(/\\s/g, '');
  const amount = parseInt(cleaned.replace(/[^\\d]/g, ''), 10) || 0;
  let currency = 'RUB';
  if (/\\$|usd|долл/i.test(cleaned)) currency = 'USD';
  if (/€|eur|евро/i.test(cleaned)) currency = 'EUR';
  return { raw: budgetStr, amount, currency };
}

const parsed = parseStructured(text);
const isStructured = Object.keys(parsed).length >= 2;

let result;
if (isStructured) {
  const budget = parseBudget(parsed.budget);
  result = {
    source: 'structured', chat_id: chatId, message_id: messageId,
    platform: parsed.platform || detectPlatform(parsed.url),
    url: parsed.url || '', title: parsed.title || '',
    description: parsed.description || text,
    budget_raw: budget.raw || '', budget_amount: budget.amount,
    budget_currency: budget.currency, deadline: parsed.deadline || '',
    forward_from: forwardFrom, raw_text: text, timestamp: new Date().toISOString()
  };
} else {
  const urlMatch = text.match(/(https?:\\/\\/[^\\s]+)/i);
  const url = urlMatch ? urlMatch[1] : '';
  result = {
    source: 'freeform', chat_id: chatId, message_id: messageId,
    platform: detectPlatform(url) || (forwardFrom ? 'Telegram' : 'unknown'),
    url: url, title: '', description: text,
    budget_raw: '', budget_amount: 0, budget_currency: 'RUB',
    deadline: '', forward_from: forwardFrom, raw_text: text,
    timestamp: new Date().toISOString()
  };
}

return [{ json: result }];
`;

const parseAnalysisCode = `
// ============================================
// ПАРСИНГ ОТВЕТА AI-АНАЛИЗА
// ============================================

const input = $input.first().json;
const prevData = $('Parse Input Message').first().json;

let analysisText = '';
try {
  analysisText = input.choices[0].message.content;
} catch (e) {
  return [{ json: { ...prevData, analysis_error: 'Не удалось получить ответ от AI', analysis: null, route: 'error' } }];
}

let analysis;
try {
  let jsonStr = analysisText;
  const jsonMatch = analysisText.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  const braceMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);
  if (braceMatch) jsonStr = braceMatch[0];
  analysis = JSON.parse(jsonStr);
} catch (e) {
  return [{ json: { ...prevData, analysis_error: 'Не удалось распарсить JSON: ' + e.message, analysis_raw: analysisText, route: 'error' } }];
}

let route = 'response_only';
if (analysis.is_code_task && analysis.can_automate) {
  route = 'code_task';
} else if (analysis.is_design_task) {
  route = 'design_task';
} else if (analysis.is_code_task) {
  route = 'code_task';
}

return [{ json: { ...prevData, analysis, analysis_raw: analysisText, route, analysis_error: null } }];
`;

const extractDraftCode = `
// ============================================
// ИЗВЛЕЧЕНИЕ ЧЕРНОВИКА ОТКЛИКА
// ============================================

const input = $input.first().json;
const prevData = $('Parse AI Analysis').first().json;

let draftText = '';
try {
  draftText = input.choices[0].message.content;
} catch (e) {
  draftText = 'Ошибка генерации отклика';
}

const iteration = (prevData.response_iteration || 0) + 1;

return [{ json: { ...prevData, draft_response: draftText, response_iteration: iteration } }];
`;

const parseReviewCode = `
// ============================================
// ПАРСИНГ РЕВЬЮ И РЕШЕНИЕ О ЦИКЛЕ
// ============================================

const input = $input.first().json;
const prevData = $('Extract Draft').first().json;

let reviewText = '';
try {
  reviewText = input.choices[0].message.content;
} catch (e) {
  return [{ json: { ...prevData, review: null, needs_improvement: false, final_response: prevData.draft_response } }];
}

let review;
try {
  let jsonStr = reviewText;
  const jsonMatch = reviewText.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  const braceMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);
  if (braceMatch) jsonStr = braceMatch[0];
  review = JSON.parse(jsonStr);
} catch (e) {
  return [{ json: { ...prevData, review: null, review_raw: reviewText, needs_improvement: false, final_response: prevData.draft_response } }];
}

const iteration = prevData.response_iteration || 1;
const needsImprovement = review.improve === true && review.overall_score < 8 && iteration < 3;

return [{ json: {
  ...prevData, review, review_raw: reviewText,
  needs_improvement: needsImprovement,
  final_response: needsImprovement ? null : prevData.draft_response,
  review_suggestions: review.suggestions || ''
} }];
`;

const extractCodeCode = `
// ============================================
// ИЗВЛЕЧЕНИЕ СГЕНЕРИРОВАННОГО КОДА
// ============================================

const input = $input.first().json;
const prevData = $('Parse AI Analysis').first().json;

let codeText = '';
try {
  codeText = input.choices[0].message.content;
} catch (e) {
  codeText = 'Ошибка генерации кода';
}

function extractSection(text, sectionName) {
  const regex = new RegExp('## ' + sectionName + '[\\\\s\\\\S]*?\\\`\\\`\\\`(?:\\\\w+)?\\\\s*([\\\\s\\\\S]*?)\\\`\\\`\\\`', 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

const planMatch = codeText.match(/## ПЛАН[\\s\\S]*?(?=## КОД|## CODE|$)/i);
const plan = planMatch ? planMatch[0] : '';
const code = extractSection(codeText, 'КОД') || extractSection(codeText, 'CODE');
const requirements = extractSection(codeText, 'REQUIREMENTS');
const readme = extractSection(codeText, 'README');

return [{ json: {
  ...prevData, generated_code: codeText, code_plan: plan,
  code_python: code, code_requirements: requirements,
  code_readme: readme, code_iteration: 1
} }];
`;

const parseCodeReviewCode = `
// ============================================
// ПАРСИНГ CODE REVIEW И РЕШЕНИЕ О РЕФАКТОРИНГЕ
// ============================================

const input = $input.first().json;
const prevData = $('Extract Generated Code').first().json;

let reviewText = '';
try {
  reviewText = input.choices[0].message.content;
} catch (e) {
  return [{ json: { ...prevData, code_review: null, needs_refactoring: false } }];
}

let review;
try {
  let jsonStr = reviewText;
  const jsonMatch = reviewText.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  const braceMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);
  if (braceMatch) jsonStr = braceMatch[0];
  review = JSON.parse(jsonStr);
} catch (e) {
  return [{ json: { ...prevData, code_review: null, code_review_raw: reviewText, needs_refactoring: false } }];
}

const iteration = prevData.code_iteration || 1;
const needsRefactoring = review.needs_refactoring === true && iteration < 3;

return [{ json: {
  ...prevData, code_review: review, code_review_raw: reviewText,
  needs_refactoring: needsRefactoring,
  refactoring_instructions: review.refactoring_instructions || ''
} }];
`;

const extractDesignCode = `
// ============================================
// ИЗВЛЕЧЕНИЕ ДИЗАЙН-ИНСТРУКЦИИ
// ============================================

const input = $input.first().json;
const prevData = $('Parse AI Analysis').first().json;

let designText = '';
try {
  designText = input.choices[0].message.content;
} catch (e) {
  designText = 'Ошибка генерации дизайн-инструкции';
}

return [{ json: { ...prevData, design_instructions: designText, output_type: 'design' } }];
`;

const formatOutputCode = `
// ============================================
// ФОРМИРОВАНИЕ ФИНАЛЬНОГО СООБЩЕНИЯ
// ============================================

let data;
try {
  data = $input.first().json;
} catch (e) {
  data = {};
}

const analysis = data.analysis || {};
const chatId = data.chat_id;
const route = data.route || 'unknown';

let analysisBlock = '📊 *АНАЛИЗ ЗАДАНИЯ*\\n';
analysisBlock += '├ Тип: ' + (analysis.task_type || '?') + ' (' + (analysis.task_subtype || '?') + ')\\n';
const stars = '⭐'.repeat(Math.min(analysis.complexity || 0, 10));
analysisBlock += '├ Сложность: ' + stars + ' (' + (analysis.complexity || '?') + '/10)\\n';
analysisBlock += '├ Навыки: ' + ((analysis.required_skills || []).join(', ') || '?') + '\\n';
analysisBlock += '├ Бюджет: ' + (analysis.budget_assessment || '?') + '\\n';
analysisBlock += '├ Время: ~' + (analysis.estimated_hours || '?') + ' ч\\n';

if (analysis.red_flags && analysis.red_flags.length > 0) {
  analysisBlock += '├ 🚩 Флаги: ' + analysis.red_flags.join(', ') + '\\n';
}

const recEmoji = analysis.recommendation === 'брать' ? '✅' : analysis.recommendation === 'не брать' ? '❌' : '⚠️';
analysisBlock += '└ ' + recEmoji + ' *' + ((analysis.recommendation || '?').toUpperCase()) + '*: ' + (analysis.recommendation_reason || '') + '\\n';

let responseBlock = '';
if (data.final_response) {
  responseBlock = '\\n\\n💬 *ОТКЛИК (готов к отправке)*\\n' + data.final_response;
}

let codeBlock = '';
if (route === 'code_task' && data.generated_code) {
  codeBlock = '\\n\\n💻 *РЕШЕНИЕ ЗАДАЧИ*\\n';
  if (data.code_plan) codeBlock += data.code_plan + '\\n';
  codeBlock += '\\n_Код и README отправлены следующим сообщением._';
}

let designBlock = '';
if (route === 'design_task' && data.design_instructions) {
  designBlock = '\\n\\n🎨 *ИНСТРУКЦИЯ ПО ДИЗАЙНУ*\\n_Подробная инструкция отправлена следующим сообщением._';
}

const mainMessage = '🤖 *FREELANCE BOT — РЕЗУЛЬТАТ*\\n' + '─'.repeat(30) + '\\n\\n' + analysisBlock + responseBlock + codeBlock + designBlock;

const messages = [{ text: mainMessage, parse_mode: 'Markdown' }];

if (route === 'code_task' && data.code_python) {
  let codeMsg = '💻 *КОД*\\n' + data.code_python.substring(0, 3500);
  if (data.code_requirements) {
    codeMsg += '\\n\\n📦 *requirements.txt*\\n' + data.code_requirements;
  }
  if (data.code_readme) {
    codeMsg += '\\n\\n📖 *README*\\n' + data.code_readme.substring(0, 1000);
  }
  messages.push({ text: codeMsg, parse_mode: 'Markdown' });
}

if (route === 'design_task' && data.design_instructions) {
  const maxLen = 4000;
  const fullText = data.design_instructions;
  for (let i = 0; i < fullText.length; i += maxLen) {
    messages.push({ text: fullText.substring(i, i + maxLen), parse_mode: 'Markdown' });
  }
}

return [{ json: { chat_id: chatId, messages, route, main_message: mainMessage } }];
`;

const splitMessagesCode = `
// ============================================
// РАЗБИВКА СООБЩЕНИЙ ДЛЯ ОТПРАВКИ
// ============================================

const data = $input.first().json;
const messages = data.messages || [{ text: data.main_message, parse_mode: 'Markdown' }];

return messages.map(msg => ({
  json: {
    chat_id: data.chat_id,
    text: msg.text,
    parse_mode: msg.parse_mode || 'Markdown'
  }
}));
`;

// --- Промпты ---

const analysisPrompt = `Проанализируй фриланс-задание и верни JSON.

Платформа: {{ $json.platform }}
Заголовок: {{ $json.title }}
Описание: {{ $json.description }}
Бюджет: {{ $json.budget_raw }} ({{ $json.budget_amount }} {{ $json.budget_currency }})
Дедлайн: {{ $json.deadline }}

Верни JSON строго в формате:
{
  "task_type": "разработка|дизайн|текст|маркетинг|аналитика|другое",
  "task_subtype": "конкретный подтип (парсинг, бот, сайт, логотип и т.д.)",
  "complexity": число от 1 до 10,
  "required_skills": ["навык1", "навык2"],
  "budget_assessment": "адекватный|заниженный|завышенный|не указан",
  "estimated_hours": число,
  "red_flags": ["флаг1"] или [],
  "recommendation": "брать|не брать|уточнить",
  "recommendation_reason": "причина рекомендации",
  "can_automate": true или false,
  "automation_approach": "как можно автоматизировать или null",
  "is_design_task": true или false,
  "is_code_task": true или false,
  "summary": "краткое резюме в 1-2 предложения"
}`;

const draftPrompt = `Напиши отклик на фриланс-задание.

Платформа: {{ $json.platform }}
Задание: {{ $json.title }}
Описание: {{ $json.description }}
Бюджет: {{ $json.budget_raw }}
Анализ задачи: {{ JSON.stringify($json.analysis) }}

Мой опыт: Python 3+ года, n8n автоматизации, парсинг данных, Telegram боты, веб-скрапинг, API интеграции, автоматизация бизнес-процессов.

Требования к отклику:
1. Приветствие (1 предложение)
2. Показать понимание задачи (1-2 предложения)
3. Релевантный кейс из опыта (1-2 предложения)
4. Предложение по срокам и подходу (1-2 предложения)
5. Уточняющий вопрос (1 вопрос)

Длина: 100-150 слов. Не используй шаблонные фразы типа 'Здравствуйте, меня заинтересовал ваш проект'.`;

const reviewPrompt = `Оцени этот отклик на фриланс-задание.

Оригинальное задание: {{ $json.description }}

Отклик:
{{ $json.draft_response }}

Оцени по критериям и верни JSON:
{
  "matches_task": true или false,
  "specificity_score": число от 1 до 10,
  "sounds_template": true или false,
  "has_value_proposition": true или false,
  "overall_score": число от 1 до 10,
  "improve": true или false,
  "suggestions": "конкретные правки если improve=true, иначе пустая строка"
}`;

const refinePrompt = `Улучши этот отклик на фриланс-задание.

Оригинальное задание: {{ $json.description }}

Текущий отклик:
{{ $json.draft_response }}

Замечания ревьюера:
{{ $json.review_suggestions }}

Требования: сохрани структуру (приветствие, кейс, сроки, вопрос), длина 100-150 слов, учти все замечания.`;

const codeGenPrompt = `Задача с фриланс-биржи:

Описание: {{ $json.description }}
Требуемые навыки: {{ $json.analysis.required_skills ? $json.analysis.required_skills.join(', ') : 'не определены' }}
Подход к автоматизации: {{ $json.analysis.automation_approach || 'стандартный' }}

Выполни задачу:
1. Сначала напиши ПЛАН реализации (3-5 шагов)
2. Затем полный код на Python с комментариями
3. Обработка ошибок (try/except)
4. Логирование (модуль logging)
5. README.md с описанием, установкой зависимостей, запуском, примерами

Формат ответа:
## ПЛАН
...

## КОД
(python код)

## REQUIREMENTS
(список зависимостей)

## README
(markdown документация)`;

const codeReviewPrompt = `Проверь этот код, написанный для фриланс-задачи.

Оригинальное ТЗ: {{ $json.description }}

Код:
{{ $json.code_python }}

Проверь и верни JSON:
{
  "has_bugs": true или false,
  "bugs": ["описание бага"] или [],
  "security_issues": ["проблема"] или [],
  "matches_requirements": true или false,
  "code_quality_score": число от 1 до 10,
  "missing_features": ["что не реализовано"] или [],
  "improvements": ["рекомендация"] или [],
  "needs_refactoring": true или false,
  "refactoring_instructions": "что исправить если needs_refactoring=true"
}`;

const refactorPrompt = `Исправь этот код:

Оригинальное ТЗ: {{ $json.description }}

Текущий код:
{{ $json.code_python }}

Замечания ревьюера:
{{ $json.refactoring_instructions }}

Баги: {{ $json.code_review && $json.code_review.bugs ? $json.code_review.bugs.join('; ') : 'нет' }}
Проблемы безопасности: {{ $json.code_review && $json.code_review.security_issues ? $json.code_review.security_issues.join('; ') : 'нет' }}

Верни исправленный полный код на Python.`;

const designPrompt = `Создай подробную инструкцию для выполнения дизайн-задачи с фриланс-биржи.

Задание: {{ $json.description }}
Требуемые навыки: {{ $json.analysis.required_skills ? $json.analysis.required_skills.join(', ') : 'дизайн' }}
Бюджет: {{ $json.budget_raw }}

Создай инструкцию в формате:

## АНАЛИЗ ЗАДАЧИ
- Что нужно сделать
- Какой результат ожидается
- Формат файлов для сдачи

## ИНСТРУМЕНТЫ (бесплатные)
Для каждого инструмента укажи название, ссылку, назначение, ограничения бесплатной версии.
Инструменты: Canva, Figma, Leonardo.ai, Bing Image Creator, Remove.bg, Photopea, Coolors.co, Google Fonts

## ПОШАГОВАЯ ИНСТРУКЦИЯ
Детальные шаги (10-15 шагов) с указанием что делать, в каком инструменте, какие настройки, размеры, цвета, шрифты.

## ПРОМПТЫ ДЛЯ AI-ГЕНЕРАЦИИ
3 варианта промптов для Leonardo.ai/Bing Image Creator (основной, альтернативный, минималистичный стиль).

## ЧЕКЛИСТ ПЕРЕД СДАЧЕЙ
Проверка размеров, цветов, текста, форматов файлов.`;

// --- Сборка workflow ---

function makeHttpNode(id, name, position, model, systemPrompt, userPrompt, temperature, maxTokens, timeout) {
  return {
    parameters: {
      method: "POST",
      url: "https://openrouter.ai/api/v1/chat/completions",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Content-Type", value: "application/json" },
          { name: "HTTP-Referer", value: "https://n8n-freelance-bot.local" },
          { name: "X-Title", value: "Freelance Automation Bot" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={\n  "model": "${model}",\n  "messages": [\n    {\n      "role": "system",\n      "content": ${JSON.stringify(systemPrompt)}\n    },\n    {\n      "role": "user",\n      "content": ${JSON.stringify(userPrompt)}\n    }\n  ],\n  "temperature": ${temperature},\n  "max_tokens": ${maxTokens}\n}`,
      options: { timeout: timeout || 30000 }
    },
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    credentials: {
      httpHeaderAuth: {
        id: "OPENROUTER_CREDENTIAL_ID",
        name: "OpenRouter API Key"
      }
    }
  };
}

function makeCodeNode(id, name, position, code) {
  return {
    parameters: { functionCode: code },
    id,
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position
  };
}

const workflow = {
  name: "Freelance Automation — Kwork, FL.ru, LinkedIn, Profi.ru, YouDo, Telegram",
  nodes: [
    // 1. Telegram Trigger
    {
      parameters: { updates: ["message"], additionalFields: {} },
      id: "telegram-trigger",
      name: "Telegram Trigger",
      type: "n8n-nodes-base.telegramTrigger",
      typeVersion: 1.1,
      position: [220, 300],
      credentials: { telegramApi: { id: "TELEGRAM_CREDENTIAL_ID", name: "Telegram Bot" } }
    },

    // 2. Parse Input
    makeCodeNode("parse-input", "Parse Input Message", [440, 300], parseInputCode),

    // 3. AI Analysis
    makeHttpNode("ai-analysis", "AI Analysis (Gemini Free)", [660, 300],
      "google/gemini-2.0-flash-exp:free",
      "Ты — опытный фриланс-аналитик. Анализируешь задания с бирж и даёшь структурированную оценку. Отвечай ТОЛЬКО валидным JSON без markdown-обёрток.",
      analysisPrompt, 0.3, 1500, 30000),

    // 4. Parse Analysis
    makeCodeNode("parse-analysis", "Parse AI Analysis", [880, 300], parseAnalysisCode),

    // 5. Router
    {
      parameters: {
        rules: {
          rules: [
            { outputIndex: 0, conditions: { conditions: [{ leftValue: "={{ $json.route }}", rightValue: "code_task", operator: { type: "string", operation: "equals" } }] }, renameOutput: "Code Task" },
            { outputIndex: 1, conditions: { conditions: [{ leftValue: "={{ $json.route }}", rightValue: "design_task", operator: { type: "string", operation: "equals" } }] }, renameOutput: "Design Task" },
            { outputIndex: 2, conditions: { conditions: [{ leftValue: "={{ $json.route }}", rightValue: "response_only", operator: { type: "string", operation: "equals" } }] }, renameOutput: "Response Only" },
            { outputIndex: 3, conditions: { conditions: [{ leftValue: "={{ $json.route }}", rightValue: "error", operator: { type: "string", operation: "equals" } }] }, renameOutput: "Error" }
          ]
        }
      },
      id: "router",
      name: "Route by Task Type",
      type: "n8n-nodes-base.switch",
      typeVersion: 3,
      position: [1100, 300]
    },

    // 6. Draft Response
    makeHttpNode("draft-response", "Draft Response (Mistral Free)", [1340, 100],
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "Ты — опытный фрилансер с 5+ годами опыта. Пишешь отклики на задания с бирж. Твой стиль: профессиональный, конкретный, уверенный но не высокомерный. Всегда включаешь релевантный опыт и задаёшь уточняющий вопрос.",
      draftPrompt, 0.7, 800, 30000),

    // 7. Extract Draft
    makeCodeNode("extract-draft", "Extract Draft", [1560, 100], extractDraftCode),

    // 8. Review Response
    makeHttpNode("review-response", "Review Response (Llama Free)", [1780, 100],
      "meta-llama/llama-4-maverick:free",
      "Ты — строгий ревьюер откликов на фриланс-биржах. Оцениваешь качество откликов и даёшь конкретные рекомендации. Отвечай ТОЛЬКО валидным JSON.",
      reviewPrompt, 0.2, 600, 30000),

    // 9. Parse Review
    makeCodeNode("parse-review", "Parse Review Decision", [2000, 100], parseReviewCode),

    // 10. Check Improvement
    {
      parameters: { conditions: { boolean: [{ value1: "={{ $json.needs_improvement }}", value2: true }] } },
      id: "check-improvement",
      name: "Needs Improvement?",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [2220, 100]
    },

    // 11. Refine Response
    makeHttpNode("refine-response", "Refine Response (Mistral Free)", [2440, 0],
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "Ты — опытный фрилансер. Улучши свой предыдущий отклик с учётом замечаний ревьюера.",
      refinePrompt, 0.6, 800, 30000),

    // 12. Generate Code
    makeHttpNode("generate-code", "Generate Code (Gemini Free)", [1340, 300],
      "google/gemini-2.0-flash-exp:free",
      "Ты — senior Python-разработчик. Пишешь чистый, документированный код с обработкой ошибок. Всегда включаешь README с инструкцией по установке и запуску.",
      codeGenPrompt, 0.4, 4000, 60000),

    // 13. Extract Code
    makeCodeNode("extract-code", "Extract Generated Code", [1560, 300], extractCodeCode),

    // 14. Code Review
    makeHttpNode("review-code", "Code Review (Llama Free)", [1780, 300],
      "meta-llama/llama-4-maverick:free",
      "Ты — senior code reviewer. Проверяешь код на баги, безопасность, соответствие ТЗ и лучшие практики. Отвечай ТОЛЬКО валидным JSON.",
      codeReviewPrompt, 0.2, 1000, 30000),

    // 15. Parse Code Review
    makeCodeNode("parse-code-review", "Parse Code Review", [2000, 300], parseCodeReviewCode),

    // 16. Check Refactoring
    {
      parameters: { conditions: { boolean: [{ value1: "={{ $json.needs_refactoring }}", value2: true }] } },
      id: "check-refactoring",
      name: "Needs Refactoring?",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [2220, 300]
    },

    // 17. Refactor Code
    makeHttpNode("refactor-code", "Refactor Code (Gemini Free)", [2440, 250],
      "google/gemini-2.0-flash-exp:free",
      "Ты — senior Python-разработчик. Исправь код с учётом замечаний ревьюера. Верни ТОЛЬКО исправленный код.",
      refactorPrompt, 0.3, 4000, 60000),

    // 18. Design Instructions
    makeHttpNode("design-instructions", "Design Instructions (Gemini Free)", [1340, 500],
      "google/gemini-2.0-flash-exp:free",
      "Ты — эксперт по дизайну и визуальному контенту. Помогаешь новичкам выполнять дизайн-задачи с фриланс-бирж, используя бесплатные инструменты. Даёшь пошаговые инструкции.",
      designPrompt, 0.5, 3000, 45000),

    // 19. Extract Design
    makeCodeNode("extract-design", "Extract Design Instructions", [1560, 500], extractDesignCode),

    // 20. Format Output
    makeCodeNode("format-output", "Format Final Output", [2660, 300], formatOutputCode),

    // 21. Split Messages
    makeCodeNode("split-messages", "Split Messages", [2880, 300], splitMessagesCode),

    // 22. Send to Telegram
    {
      parameters: {
        chatId: "={{ $json.chat_id }}",
        text: "={{ $json.text }}",
        additionalFields: { parse_mode: "={{ $json.parse_mode }}" }
      },
      id: "send-telegram",
      name: "Send to Telegram",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [3100, 300],
      credentials: { telegramApi: { id: "TELEGRAM_CREDENTIAL_ID", name: "Telegram Bot" } }
    },

    // 23. Send Error
    {
      parameters: {
        chatId: "={{ $json.chat_id }}",
        text: "=⚠️ *Ошибка обработки*\n\nНе удалось проанализировать задание.\nОшибка: {{ $json.analysis_error || 'Неизвестная ошибка' }}\n\nПопробуйте отправить задание ещё раз в формате:\n\nНовый заказ\nБиржа: Kwork\nСсылка: https://...\nЗаголовок: ...\nОписание: ...\nБюджет: ...\nДедлайн: ...",
        additionalFields: { parse_mode: "Markdown" }
      },
      id: "send-error",
      name: "Send Error to Telegram",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [1340, 700],
      credentials: { telegramApi: { id: "TELEGRAM_CREDENTIAL_ID", name: "Telegram Bot" } }
    }
  ],
  connections: {
    "Telegram Trigger": { main: [[{ node: "Parse Input Message", type: "main", index: 0 }]] },
    "Parse Input Message": { main: [[{ node: "AI Analysis (Gemini Free)", type: "main", index: 0 }]] },
    "AI Analysis (Gemini Free)": { main: [[{ node: "Parse AI Analysis", type: "main", index: 0 }]] },
    "Parse AI Analysis": { main: [[{ node: "Route by Task Type", type: "main", index: 0 }]] },
    "Route by Task Type": {
      main: [
        [{ node: "Generate Code (Gemini Free)", type: "main", index: 0 }, { node: "Draft Response (Mistral Free)", type: "main", index: 0 }],
        [{ node: "Design Instructions (Gemini Free)", type: "main", index: 0 }, { node: "Draft Response (Mistral Free)", type: "main", index: 0 }],
        [{ node: "Draft Response (Mistral Free)", type: "main", index: 0 }],
        [{ node: "Send Error to Telegram", type: "main", index: 0 }]
      ]
    },
    "Draft Response (Mistral Free)": { main: [[{ node: "Extract Draft", type: "main", index: 0 }]] },
    "Extract Draft": { main: [[{ node: "Review Response (Llama Free)", type: "main", index: 0 }]] },
    "Review Response (Llama Free)": { main: [[{ node: "Parse Review Decision", type: "main", index: 0 }]] },
    "Parse Review Decision": { main: [[{ node: "Needs Improvement?", type: "main", index: 0 }]] },
    "Needs Improvement?": {
      main: [
        [{ node: "Refine Response (Mistral Free)", type: "main", index: 0 }],
        [{ node: "Format Final Output", type: "main", index: 0 }]
      ]
    },
    "Refine Response (Mistral Free)": { main: [[{ node: "Extract Draft", type: "main", index: 0 }]] },
    "Generate Code (Gemini Free)": { main: [[{ node: "Extract Generated Code", type: "main", index: 0 }]] },
    "Extract Generated Code": { main: [[{ node: "Code Review (Llama Free)", type: "main", index: 0 }]] },
    "Code Review (Llama Free)": { main: [[{ node: "Parse Code Review", type: "main", index: 0 }]] },
    "Parse Code Review": { main: [[{ node: "Needs Refactoring?", type: "main", index: 0 }]] },
    "Needs Refactoring?": {
      main: [
        [{ node: "Refactor Code (Gemini Free)", type: "main", index: 0 }],
        [{ node: "Format Final Output", type: "main", index: 0 }]
      ]
    },
    "Refactor Code (Gemini Free)": { main: [[{ node: "Extract Generated Code", type: "main", index: 0 }]] },
    "Design Instructions (Gemini Free)": { main: [[{ node: "Extract Design Instructions", type: "main", index: 0 }]] },
    "Extract Design Instructions": { main: [[{ node: "Format Final Output", type: "main", index: 0 }]] },
    "Format Final Output": { main: [[{ node: "Split Messages", type: "main", index: 0 }]] },
    "Split Messages": { main: [[{ node: "Send to Telegram", type: "main", index: 0 }]] }
  },
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
    callerPolicy: "workflowsFromSameOwner"
  },
  tags: [
    { name: "freelance" },
    { name: "automation" },
    { name: "telegram" },
    { name: "ai" }
  ],
  pinData: {},
  versionId: "1.0.0"
};

// Записываем JSON
fs.writeFileSync('freelance_automation_workflow.json', JSON.stringify(workflow, null, 2), 'utf8');
console.log('✅ Workflow JSON generated successfully');
console.log('Nodes:', workflow.nodes.length);
console.log('Connections:', Object.keys(workflow.connections).length);
workflow.nodes.forEach(n => console.log('  -', n.name, '(' + n.type + ')'));
