# hack-696ba367-kazast-ai
Hackathon team repository for KazAST-AI


# KazAST-AI

Стартовый каркас для хакатонного проекта: Vue 3 + Vite на фронтенде и Node.js + Express на бэкенде. База данных пока не подключена.

## Стек

- **Frontend:** JavaScript, HTML, CSS, Vue 3, Vite
- **Backend:** Node.js, Express
- **Контейнеризация:** Docker, Docker Compose
- **AI-интеграция:** OpenAI API (`openai` SDK)
- **База данных:** пока не выбрана

## Запуск

Нужны Docker и Docker Compose. Из корня проекта выполните:

```sh
docker compose up --build
```

- Фронтенд: http://localhost:5173
- API: http://localhost:3000/api/health

Изменения в `frontend/` и `backend/` подхватываются в режиме разработки. Остановка: `Ctrl+C`, затем `docker compose down`.

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
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── Dockerfile
│   ├── index.html
│   └── package.json
├── compose.yaml
└── README.md
```

Добавляйте предметные модули в `backend/src` и `frontend/src`, когда станет ясна задача. Настройки подключения к будущей базе можно вынести в переменные окружения Compose.

Правила именования и разработки фронтенда описаны в [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md).
