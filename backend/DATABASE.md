# MongoDB: запуск и интеграция

Модуль использует существующий Express backend, JavaScript ES modules и Mongoose.
Нужен Node.js 22.12+ и доступная MongoDB: локальная служба либо MongoDB Atlas.
Docker не нужен.

## Запуск

Из папки `backend`:

```powershell
npm install
Copy-Item .env.example .env
```

Копируйте пример только при отсутствии своего `.env`. В `backend/.env` задайте
`MONGODB_URI` для своей базы. Локальный пример без credentials находится в
`.env.example`. Можно передать переменную через окружение процесса: она имеет
приоритет над файлом. `.env` игнорируется Git; реальные секреты не коммитьте.

```powershell
npm start
npm run seed
npm test
```

Сервер запускается только после успешного подключения к MongoDB. Без URI или при
ошибке подключения процесс завершается с кодом 1 и безопасным сообщением.
Тесты схем работают без MongoDB. Seed запускайте отдельно в тестовой базе:
он добавляет демонстрационные Task, Team, Proposal и Progress со стабильными ID,
не удаляет и не перезаписывает существующие записи, в том числе при повторном запуске.
Seed содержит 5 Task (10/draft, 35/draft, 55/working, 85/ready, 100/priority),
5 Team, 6 Proposal и 4 Progress. У каждой задачи минимум 3 вопроса. Данные находятся
в `src/seed/data.js`; импорт этого файла не подключается к БД и не выполняет запись.
Два accepted Proposal относятся к одной priority-задаче: это примеры уже выполненных
ручных решений бизнеса. Есть pending и rejected. Баллы команд согласованы с
подтверждёнными демонстрационными Progress.
Если старая версия seed уже запускалась, записи с теми же ID сохранят прежние значения.
Для воспроизведения полного нового набора используйте отдельную пустую тестовую базу.
Seed не запускается автоматически вместе с сервером.

## Использование из backend

`src/server.js` уже вызывает `connectDB()`. В других точках входа:

```js
import connectDB from './config/db.js';
import Task from './models/Task.js';
import Team from './models/Team.js';
import Proposal from './models/Proposal.js';
import Progress from './models/Progress.js';

await connectDB();
const task = await Task.create({ originalDraft: 'Описание бизнес-задачи' });
const team = await Team.create({ name: 'Команда' });
const proposal = await Proposal.create({ taskId: task._id, teamId: team._id });
const populated = await Proposal.findById(proposal._id).populate('taskId teamId');

// Вызывается обработчиком только после ручного решения бизнеса.
await Proposal.findByIdAndUpdate(proposal._id, { status: 'accepted' }, {
  runValidators: true,
  returnDocument: 'after',
});
```

Для `updateOne` / `findOneAndUpdate` / `findByIdAndUpdate` обязательно передавайте
`runValidators: true`; `save()` и `create()` выполняют валидацию автоматически.
Это поведение описано в [документации Mongoose](https://mongoosejs.com/docs/validation.html).
`ref` позволяет `populate`, но не проверяет существование связанных документов:
эту проверку должен выполнять вызывающий сервис.

## Границы модуля

- Task хранит исходный текст, карточку, результат AI-анализа, вопросы, подтверждения,
  рекомендации, рейтинг и готовность. Пустой черновик допустим. Вопросов может быть
  0, 3 или больше: обязательный минимум при сохранении черновика не установлен.
- `scoreBreakdown`: contextNeed 0–20, data 0–20, expectedResult 0–15,
  successCriteria 0–15, constraints 0–10, users 0–10, businessConnection 0–10.
- Будущий scoreService должен учитывать только заполненные подтверждённые сведения
  и сохранять score, breakdown и readinessLevel согласованно: 0–39 draft,
  40–69 working, 70–89 ready, 90–100 priority. Модели это не рассчитывают.
- Proposal допускает несколько accepted для одной задачи и любое число откликов.
  Выбор команды остаётся ручным.
- Progress хранит этап, подтверждение, дату и начисленные баллы. Подтверждение само
  по себе не меняет Team.points. Будущий сервис должен проверить принятое предложение
  и обеспечить однократное согласованное начисление, включая повторные запросы.
- Все четыре модели имеют createdAt / updatedAt. Авторизация, AI API, scoreService,
  routes/controllers для БД и project tracker в модуль не входят.

## Каталог и индексы

Все опубликованные задачи доступны независимо от балла, включая слабый draft.
Модель не реализует рекомендации, повышение позиции или выделение priority.
Вызывающий backend может выбирать фильтры и сортировку:

```js
const published = await Task.find({ published: true }).sort({ score: -1 });
const byTopic = await Task.find({ published: true, topic: 'Аналитика' }).sort({ score: -1 });
const byReadiness = await Task.find({ published: true, readinessLevel: 'draft' });
const combined = await Task.find({
  published: true, topic: 'Аналитика', readinessLevel: 'ready',
}).sort({ score: -1 });
```

Добавлены отдельные неуникальные индексы: Task — published, score, topic,
readinessLevel; Proposal — taskId, teamId, status; Progress — taskId, teamId.
Отдельная модель Catalog не нужна. Индексы не ограничивают число принятых откликов.

## Проверка в своей тестовой MongoDB

Зависимости модуля — `mongoose` и `dotenv`, уже указанные в package.json:
`npm install` из `backend` устанавливает их вместе с зависимостями Express.
Настройте `MONGODB_URI` в `backend/.env`, затем выполните `npm start`.
Сообщение `MongoDB connected successfully.` подтверждает подключение.
В отдельном терминале выполните `npm run seed` только для выбранной тестовой базы.

В MongoDB Compass подключитесь к той же базе из MONGODB_URI и откройте коллекции
`tasks`, `teams`, `proposals`, `progresses`. В mongosh для выбранной базы:

```js
db.tasks.countDocuments()      // 5 в пустой базе после seed
db.teams.countDocuments()      // 5
db.proposals.countDocuments()  // 6
db.progresses.countDocuments() // 4
db.tasks.find({ published: true }, { title: 1, score: 1, readinessLevel: 1 }).sort({ score: -1 })
db.proposals.find({ taskId: ObjectId('000000000000000000000105'), status: 'accepted' })
```

`npm test` проверяет схемы, ссылки и согласованность seed, индексы и построение
запросов каталога без подключения к MongoDB. Эти проверки не заменяют проверку
реальной записи и выполнения запросов на вашей тестовой базе.
