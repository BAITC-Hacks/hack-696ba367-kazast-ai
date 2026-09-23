# Interaction Module — PostgreSQL

Реализован поток: опубликованная задача → «Откликнуться» → идея, план, срок,
необязательный URL прототипа → pending → решение владельца бизнеса.
Количество предложений и accepted не ограничено: допустимы 0, 1 и несколько.

## Архитектура

Vue → Vuex proposals → существующий services/api.js → Express routes/proposals.js
→ services/proposals.js → существующий pg.Pool → PostgreSQL.
SQL параметризован, миграции не изменены. Отдельного HTTP wrapper и ORM нет.
Каталог, фильтры, пагинация и app_status/tasks/catalog/published_task сохранены.
Публичная карточка: task_detail_page.*, /tasks/:id. Дубликаты task_details_page.*
удалены; interaction.js заменён на proposals.js. Форма получает карточку через
published_task/load_task и существующий GET /api/tasks/:id/published.
Новые маршруты: /tasks/:task_id/proposals/new и /tasks/:task_id/proposals.
Переход к предложениям есть в редакторе и в публичной карточке владельца.
Четыре CSS-класса форм, текста, карточек и действий размещены в global.css.
Соблюдено разделение Vue/JS/CSS из FRONTEND_GUIDE.md.

## Реальная схема

backend/db/migrations/001_initial.sql, proposals:

- id uuid: PK, gen_random_uuid();
- task_id uuid → tasks и team_id uuid → teams: обязательные FK;
- idea, plan, timeline: обязательный непустой text;
- prototype_url: nullable text с HTTP(S) CHECK;
- status: pending по умолчанию, accepted или rejected;
- decided_by uuid → users, decided_at timestamptz;
- created_at timestamptz: now().

CHECK требует NULL в полях решения для pending и заполненных полей для
accepted/rejected. Триггер требует опубликованную задачу, проверяет владельца
решения и запрещает менять задачу/команду предложения. Индексы:
(task_id, created_at DESC), (team_id, created_at DESC). Уникальности по задаче
или команде нет. Поле формы «Срок» соответствует текстовому timeline.

## Demo user и права

VITE_DEMO_USER_ID → tasks.user_id → X-User-Id → существующий demo-auth и users.
Это прежний локальный демо-доступ, не публичная аутентификация.
Прежние task endpoints по-прежнему требуют business; создание Proposal — student.
Команды определяются через team_members JOIN teams для demo user. Единственная
команда выбирается автоматически; при нескольких пользователь выбирает команду.
Сервер повторно проверяет членство, чужая команда и отсутствие команды дают 403.
Business owner проверяется сравнением tasks.owner_id с request.user.id;
роль проверяет demo-auth, автора решения также проверяет триггер PostgreSQL.

После seed: business 00000000-0000-4000-8000-010000000001,
student 00000000-0000-4000-8000-020000000001.
Задайте VITE_DEMO_USER_ID перед запуском Vite; для Docker передайте его в
frontend environment. По умолчанию сохраняется демо-бизнес проекта.

## API

Пути относительно /api:

| Метод | Путь | Доступ и ответ |
|---|---|---|
| GET | /tasks/:id/proposals/context | Demo user; { user, teams, is_owner } |
| POST | /tasks/:id/proposals | Student; 201 { proposal } |
| GET | /tasks/:id/proposals | Business owner; { proposals }, все статусы |
| PATCH | /proposals/:id/status | Business owner; { proposal } |

POST: idea, plan, timeline (до 10000 символов), необязательные prototype_url
(HTTP(S), до 2000 символов) и team_id (можно опустить при единственной команде).
Начальный статус всегда pending. PATCH принимает только status: accepted/rejected,
допускает пересмотр решения, устанавливает decided_by и decided_at на сервере.
Остальные предложения не изменяются. Повторные предложения команды разрешены.
GET списка включает team_name и сортирует по created_at DESC, id.
Context не раскрывает рабочий черновик.

Ошибки в общем формате API: 400 — UUID/поля/статус; 401 — demo user;
403 — роль/владелец/команда; 404 — задача/предложение; 409 — задача не опубликована;
503 — выключенный demo-auth.

## Проверки

Frontend: npm test, npm run build. Backend: npm run test:api, npm run test:db.
Новый test/proposals-api.test.js использует настоящий PostgreSQL: отдельную схему,
все миграции, Express на случайном порту; схема удаляется в finally.
Проверяются pending, публикация, права владельца/чужого business/student,
accepted/rejected, несколько accepted и предложений, валидация, отсутствующие
сущности, членство и выбор нескольких команд. Подмен моделей нет.
test:api требует DATABASE_URL и CREATE SCHEMA; test:db — мигрированную БД.
Можно запускать команды через существующий Docker Compose.

Результат проверки в текущем окружении: frontend — 15 тестов прошли,
production build успешен. Backend test:api и test:db запущены, но PostgreSQL
на 127.0.0.1:5433 недоступен (ECONNREFUSED); Docker Engine возвращает 500.
Прохождение PostgreSQL integration tests пока не подтверждено.
