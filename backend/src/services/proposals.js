import { ApiError, validateUuid } from './tasks.js';

function validate_body(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'INVALID_BODY', 'Ожидается JSON-объект.');
  }
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Неизвестные или недоступные поля.');
  }
}

function proposal_fields(body) {
  validate_body(body, ['idea', 'plan', 'timeline', 'prototype_url', 'team_id']);
  const values = {};
  const details = {};
  for (const key of ['idea', 'plan', 'timeline']) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 10000 || body[key].includes('\0')) {
      details[key] = 'Заполните поле: до 10000 символов без нулевых символов.';
    } else values[key] = body[key].trim();
  }
  values.prototype_url = null;
  if (body.prototype_url !== undefined && body.prototype_url !== null && body.prototype_url !== '') {
    try {
      const value = body.prototype_url;
      if (typeof value !== 'string' || value.length > 2000 || !/^https?:\/\/[^\s\0]+$/.test(value) || !new URL(value).hostname) throw new Error();
      values.prototype_url = value;
    } catch { details.prototype_url = 'Укажите корректную ссылку HTTP(S), до 2000 символов.'; }
  }
  if (Object.keys(details).length) throw new ApiError(400, 'VALIDATION_ERROR', 'Проверьте поля предложения.', details);
  return values;
}

async function get_task(db, task_id, user_id) {
  const { rows: [task] } = await db.query('SELECT id, owner_id, published_revision_id FROM tasks WHERE id=$1', [task_id]);
  if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.');
  if (user_id && task.owner_id !== user_id) throw new ApiError(403, 'FORBIDDEN', 'Доступ разрешён только владельцу задачи.');
  return task;
}

async function user_teams(db, user_id) {
  const { rows } = await db.query(`SELECT t.id, t.name FROM teams t
    JOIN team_members m ON m.team_id=t.id WHERE m.user_id=$1 ORDER BY t.name, t.id`, [user_id]);
  return rows;
}

export function proposalsService(db) {
  return {
    async context(task_id, user) {
      const task = await get_task(db, task_id);
      return { user, is_owner: user.role === 'business' && task.owner_id === user.id,
        teams: user.role === 'student' ? await user_teams(db, user.id) : [] };
    },
    async create(task_id, user, body) {
      const values = proposal_fields(body);
      const task = await get_task(db, task_id);
      if (!task.published_revision_id) throw new ApiError(409, 'TASK_NOT_PUBLISHED', 'Отклик доступен после публикации задачи.');
      const teams = await user_teams(db, user.id);
      if (!teams.length) throw new ApiError(403, 'TEAM_REQUIRED', 'Студент не состоит в команде.');
      const team_id = body.team_id === undefined && teams.length === 1 ? teams[0].id : body.team_id;
      if (team_id === undefined) throw new ApiError(400, 'TEAM_REQUIRED', 'Выберите свою команду.');
      validateUuid(team_id);
      if (!teams.some(team => team.id === team_id.toLowerCase())) throw new ApiError(403, 'FORBIDDEN', 'Вы не состоите в выбранной команде.');
      const { rows: [proposal] } = await db.query(`INSERT INTO proposals(task_id,team_id,idea,plan,timeline,prototype_url)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [task_id, team_id, values.idea, values.plan, values.timeline, values.prototype_url]);
      return { proposal };
    },
    async list(task_id, user) {
      await get_task(db, task_id, user.id);
      const { rows } = await db.query(`SELECT p.*, t.name AS team_name FROM proposals p
        JOIN teams t ON t.id=p.team_id WHERE p.task_id=$1 ORDER BY p.created_at DESC, p.id`, [task_id]);
      return { proposals: rows };
    },
    async decide(proposal_id, user, body) {
      validate_body(body, ['status']);
      if (!['accepted', 'rejected'].includes(body.status)) throw new ApiError(400, 'INVALID_STATUS', 'Допустимы accepted и rejected.');
      const { rows: [existing] } = await db.query('SELECT task_id FROM proposals WHERE id=$1', [proposal_id]);
      if (!existing) throw new ApiError(404, 'PROPOSAL_NOT_FOUND', 'Предложение не найдено.');
      await get_task(db, existing.task_id, user.id);
      const { rows: [proposal] } = await db.query(`UPDATE proposals p SET status=$2, decided_by=$3, decided_at=now()
        FROM teams t WHERE p.id=$1 AND t.id=p.team_id RETURNING p.*, t.name AS team_name`, [proposal_id, body.status, user.id]);
      return { proposal };
    },
  };
}
