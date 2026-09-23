import { ApiError, validateUuid, transaction } from './tasks.js';

export function validateProposal(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'INVALID_BODY', 'Ожидается JSON-объект.');
  const allowed = ['team_id', 'idea', 'plan', 'timeline', 'prototype_url'];
  const details = Object.create(null);
  for (const key of Object.keys(body)) if (!allowed.includes(key)) details[key] = 'Недоступное поле.';
  const values = {};
  try { values.team_id = validateUuid(body.team_id); } catch { details.team_id = 'Укажите UUID команды.'; }
  for (const [key, limit] of [['idea',10000],['plan',10000],['timeline',1000]]) {
    const value = body[key];
    if (typeof value !== 'string' || !value.trim() || value.length > limit || value.includes('\0')) {
      details[key] = `Обязательная строка, максимум ${limit} символов.`;
    } else values[key] = value.trim();
  }
  values.prototype_url = null;
  if (body.prototype_url !== undefined && body.prototype_url !== null && body.prototype_url !== '') {
    try {
      if (typeof body.prototype_url !== 'string' || body.prototype_url.length > 2000) throw new Error();
      const url = body.prototype_url.trim();
      const parsed = new URL(url);
      if (!/^https?:\/\//i.test(url) || /\s|\0/.test(url) || !['http:','https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error();
      values.prototype_url = parsed.href;
    } catch { details.prototype_url = 'Ожидается HTTP(S)-ссылка без логина и пароля, максимум 2000 символов.'; }
  }
  if (Object.keys(details).length) throw new ApiError(400, 'VALIDATION_ERROR', 'Проверьте поля отклика.', details);
  return values;
}
export function validateDecision(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'status') || !['accepted','rejected'].includes(body.status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Передайте только status: accepted или rejected.');
  }
  return body.status;
}
export function proposalService(db) {
  return {
    async myTeams(userId) {
      const { rows } = await db.query(`SELECT t.* FROM teams t JOIN team_members m ON m.team_id=t.id
        WHERE m.user_id=$1 ORDER BY t.name,t.id`,[userId]);
      return { items: rows };
    },
    create(taskId, userId, values) {
      return transaction(db, async client => {
        const { rows: [task] } = await client.query('SELECT id,published_revision_id FROM tasks WHERE id=$1 FOR SHARE',[taskId]);
        if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.');
        if (!task.published_revision_id) throw new ApiError(409, 'TASK_NOT_PUBLISHED', 'Отклик можно отправить только на опубликованную задачу.');
        const { rowCount } = await client.query('SELECT team_id FROM team_members WHERE team_id=$1 AND user_id=$2 FOR SHARE',[values.team_id,userId]);
        if (!rowCount) throw new ApiError(403, 'TEAM_ACCESS_DENIED', 'Вы не состоите в выбранной команде.');
        const { rows: [proposal] } = await client.query(`INSERT INTO proposals(task_id,team_id,idea,plan,timeline,prototype_url)
          VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[taskId,values.team_id,values.idea,values.plan,values.timeline,values.prototype_url]);
        return { proposal };
      });
    },
    async mine(userId) {
      const { rows } = await db.query(`SELECT p.*, t.name AS team_name, c.card->>'title' AS task_title
        FROM proposals p JOIN teams t ON t.id=p.team_id
        LEFT JOIN task_catalog c ON c.id=p.task_id
        WHERE EXISTS (SELECT 1 FROM team_members m WHERE m.team_id=p.team_id AND m.user_id=$1)
        ORDER BY p.created_at DESC,p.id`,[userId]);
      return { items: rows };
    },
    forTask(taskId, userId) {
      return transaction(db, async client => {
        const { rows: [task] } = await client.query('SELECT owner_id FROM tasks WHERE id=$1 FOR SHARE',[taskId]);
        if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.');
        if (task.owner_id !== userId) throw new ApiError(403, 'FORBIDDEN', 'Предложения доступны только владельцу задачи.');
        const { rows } = await client.query(`SELECT p.*, t.name AS team_name, t.interests, t.skills, t.technologies
          FROM proposals p JOIN teams t ON t.id=p.team_id WHERE p.task_id=$1 ORDER BY p.created_at DESC,p.id`,[taskId]);
        return { items: rows };
      });
    },
    decide(id, userId, status) {
      return transaction(db, async client => {
        const { rows: [current] } = await client.query(`SELECT p.*,t.owner_id FROM proposals p
          JOIN tasks t ON t.id=p.task_id WHERE p.id=$1 FOR UPDATE OF p FOR SHARE OF t`,[id]);
        if (!current) throw new ApiError(404, 'PROPOSAL_NOT_FOUND', 'Отклик не найден.');
        if (current.owner_id !== userId) throw new ApiError(403, 'FORBIDDEN', 'Решение принимает только владелец задачи.');
        if (current.status === status) {
          const { owner_id, ...proposal } = current;
          return { proposal };
        }
        if (current.status !== 'pending') throw new ApiError(409, 'PROPOSAL_ALREADY_DECIDED', 'Решение по отклику уже принято.');
        const { rows: [proposal] } = await client.query(`UPDATE proposals SET status=$2,decided_by=$3,decided_at=clock_timestamp()
          WHERE id=$1 RETURNING *`,[id,status,userId]);
        return { proposal };
      });
    },
  };
}
