# hack-696ba367-kazast-ai
Hackathon team repository for KazAST-AI


# KazAST-AI

Проект хакатона: Vue 3 + Vite на фронтенде, Node.js + Express на бэкенде и PostgreSQL для хранения задач, команд и откликов.

## Стек

- **Frontend:** JavaScript, HTML, CSS, Vue 3, Vite
- **Backend:** Node.js, Express
- **Контейнеризация:** Docker, Docker Compose
- **AI-интеграция:** OpenAI API (`openai` SDK)
- **База данных:** PostgreSQL 16, драйвер `pg`, SQL-миграции

## Запуск

Нужны Docker и Docker Compose. Из корня проекта выполните:

```sh
docker compose up --build
```

- Фронтенд: http://localhost:5173
- API: http://localhost:3000/api/health

Изменения в `frontend/` и `backend/` подхватываются в режиме разработки. Остановка: `Ctrl+C`, затем `docker compose down`.

PostgreSQL запускается автоматически; миграции применяются перед запуском API. Данные сохраняются в Docker volume. API `/api/health` проверяет доступность БД.

Если зависимости уже установлены в старом Docker volume, перед запуском обновите их:

```sh
docker compose run --rm --no-deps backend npm ci
```

После запуска загрузите синтетические данные и выполните проверки:

```sh
docker compose exec backend npm run db:seed
docker compose exec backend npm run test:db
```

Схема данных, формула рейтинга, правила публикации и тестовые сценарии описаны в [backend/db/README.md](backend/db/README.md). Реализован API создания, чтения, редактирования и подтверждения задач. Контракт и пример для фронтенда — [backend/API.md](backend/API.md). В локальном Compose демо-пользователь выбирается заголовком `X-User-Id`; это не production-авторизация. API публикации и откликов добавляется следующим этапом.

## OpenAI API

Создайте локальный файл `.env` из шаблона и укажите в нём свой API-ключ:

```sh
cp .env.example .env
```

Затем задайте значение `OPENAI_API_KEY` в `.env` и запустите Compose. Ключ передаётся только бэкенду; `.env` исключён из Git. Не добавляйте секрет в исходный код или во frontend-переменные `VITE_*`.

## Структура

```text
.
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   └── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── style/
│   │   ├── tokens.css
│   │   ├── controls.css
│   │   └── global.css
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── router/
│   │   ├── pages/
│   │   ├── components/
│   │   └── store/
│   ├── Dockerfile
│   ├── index.html
│   └── package.json
├── compose.yaml
└── README.md
```

Настройки PostgreSQL приведены в `.env.example`. Миграции находятся в `backend/db/migrations`, подключение — в `backend/src/db`.

Правила именования и разработки фронтенда описаны в [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md).
