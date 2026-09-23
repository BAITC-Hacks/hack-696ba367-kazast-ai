export const cardFields = [
  'title', 'industry', 'context', 'need', 'users_description', 'data_materials',
  'constraints_description', 'expected_result', 'success_criteria', 'contact',
  'interaction_format', 'feedback_process',
];
const editableFields = ['original_description', ...cardFields];
const limits = { title: 300, industry: 200, contact: 1000 };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
export function validateUuid(value) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new ApiError(400, 'INVALID_ID', 'Ожидается UUID.');
  }
  return value.toLowerCase();
}
export function validateBody(body, mode) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'INVALID_BODY', 'Ожидается JSON-объект.');
  }
  const isVersionAction = mode === 'confirm' || mode === 'publish';
  const allowed = isVersionAction ? ['expected_version']
    : [...editableFields, ...(mode === 'edit' ? ['expected_version'] : [])];
  const details = Object.create(null);
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) details[key] = 'Неизвестное или недоступное для изменения поле.';
  }
  const values = {};
  for (const key of editableFields) {
    if (!Object.hasOwn(body, key) || isVersionAction) continue;
    const value = body[key];
    if (typeof value !== 'string' || value.includes('\0') || value.length > (limits[key] ?? 10000)) {
      details[key] = `Ожидается строка без нулевых символов, максимум ${limits[key] ?? 10000} символов.`;
    } else {
      values[key] = value.trim();
    }
  }
  if ((mode === 'create' || Object.hasOwn(body, 'original_description')) && !values.original_description) {
    details.original_description = 'Описание обязательно и не может быть пустым.';
  }
  if (mode !== 'create' && (!Number.isSafeInteger(body.expected_version) || body.expected_version < 1)) {
    details.expected_version = 'Передайте положительную целую версию полученной задачи.';
  }
  if (mode === 'edit' && Object.keys(values).length === 0) details.fields = 'Передайте хотя бы одно поле задачи.';
  if (Object.keys(details).length) throw new ApiError(400, 'VALIDATION_ERROR', 'Проверьте поля запроса.', details);
  return values;
}

const cardOf = (task) => Object.fromEntries(cardFields.map(key => [key, task[key]]));
const sameCard = (a, b) => cardFields.every(key => a[key] === b[key]);
async function latestConfirmation(db, taskId) {
  const { rows: [revision] } = await db.query(`SELECT r.*, readiness_breakdown(card) AS breakdown,
    CASE WHEN score < 40 THEN 'draft' WHEN score < 70 THEN 'working'
         WHEN score < 90 THEN 'ready' ELSE 'priority' END AS readiness_level,
    ARRAY(SELECT key FROM jsonb_each_text(readiness_breakdown(card)) WHERE value::integer = 0 ORDER BY key) AS missing
    FROM task_revisions r WHERE task_id=$1 ORDER BY confirmed_at DESC, id DESC LIMIT 1`, [taskId]);
  return revision ?? null;
}
async function ownedTask(db, id, userId) {
  // The same lock serializes edits and confirmations of a task.
  const { rows: [task] } = await db.query('SELECT * FROM tasks WHERE id=$1 FOR UPDATE', [id]);
  if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.');
  if (task.owner_id !== userId) throw new ApiError(403, 'FORBIDDEN', 'Доступ разрешён только владельцу задачи.');
  return task;
}
function checkVersion(task, expected) {
  if (task.version !== expected) throw new ApiError(409, 'VERSION_CONFLICT',
    'Задача уже изменена. Загрузите её заново перед выполнением действия.', { current_version: task.version });
}
function representation(task, confirmation) {
  return {
    task,
    confirmation,
    has_unconfirmed_changes: !confirmation || !sameCard(cardOf(task), confirmation.card),
  };
}
export async function transaction(db, action) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export function taskService(db) {
  return {
    publish(id, userId, expectedVersion) {
      return transaction(db, async client => {
        const task = await ownedTask(client, id, userId);
        checkVersion(task, expectedVersion);
        const confirmation = await latestConfirmation(client, id);
        if (!confirmation) throw new ApiError(409, 'CONFIRMATION_REQUIRED', 'Сначала подтвердите карточку задачи.');
        if (!sameCard(cardOf(task), confirmation.card)) {
          throw new ApiError(409, 'UNCONFIRMED_CHANGES', 'В карточке есть неподтверждённые изменения. Подтвердите их перед публикацией.');
        }
        if (task.published_revision_id === confirmation.id) return representation(task, confirmation);
        const { rows: [published] } = await client.query(`UPDATE tasks
          SET published_revision_id=$2, published_at=clock_timestamp() WHERE id=$1 RETURNING *`, [id, confirmation.id]);
        return representation(published, confirmation);
      });
    },
    async create(userId, values) {
      const fields = Object.keys(values);
      // Column names come exclusively from validateBody's allowlist.
      const { rows: [task] } = await db.query(`INSERT INTO tasks(owner_id,${fields.join(',')})
        VALUES ($1,${fields.map((_, i) => `$${i+2}`).join(',')}) RETURNING *`, [userId, ...Object.values(values)]);
      return representation(task, null);
    },
    get(id, userId) {
      return transaction(db, async client => {
        const task = await ownedTask(client, id, userId);
        return representation(task, await latestConfirmation(client, id));
      });
    },
    edit(id, userId, values, expectedVersion) {
      return transaction(db, async client => {
        const current = await ownedTask(client, id, userId);
        checkVersion(current, expectedVersion);
        const fields = Object.keys(values);
        const { rows: [task] } = await client.query(`UPDATE tasks SET ${fields.map((key,i) => `${key}=$${i+2}`).join(',')}
          WHERE id=$1 RETURNING *`, [id, ...Object.values(values)]);
        return representation(task, await latestConfirmation(client, id));
      });
    },
    confirm(id, userId, expectedVersion) {
      return transaction(db, async client => {
        const task = await ownedTask(client, id, userId);
        checkVersion(task, expectedVersion);
        if (!task.title.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'Для подтверждения нужно название.', { title: 'Заполните название.' });
        const card = cardOf(task);
        let confirmation = await latestConfirmation(client, id);
        const created = !confirmation || !sameCard(card, confirmation.card);
        if (created) {
          await client.query('INSERT INTO task_revisions(task_id,confirmed_by,card,confirmed_at) VALUES ($1,$2,$3,clock_timestamp())', [id,userId,card]);
          confirmation = await latestConfirmation(client, id);
        }
        return { ...representation(task, confirmation), created };
      });
    },
  };
}
