import { ApiError, validateUuid } from '../services/tasks.js';

// Explicit local demo identity selector, NOT authentication for a public deployment.
export function demoAuth(db, enabled) {
  return async (request, _response, next) => {
    if (!enabled) throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Демо-доступ выключен. Настройте авторизацию.');
    const header = request.get('X-User-Id');
    if (!header) throw new ApiError(401, 'UNAUTHORIZED', 'Передайте X-User-Id демо-пользователя.');
    let id;
    try { id = validateUuid(header); }
    catch { throw new ApiError(401, 'UNAUTHORIZED', 'Некорректный X-User-Id.'); }
    const { rows: [user] } = await db.query('SELECT id, role FROM users WHERE id=$1', [id]);
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Пользователь не найден.');
    if (user.role !== 'business') throw new ApiError(403, 'FORBIDDEN', 'Управление задачами доступно представителю бизнеса.');
    request.user = user;
    next();
  };
}
