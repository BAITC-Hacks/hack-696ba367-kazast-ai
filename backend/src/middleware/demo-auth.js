import { ApiError, validateUuid } from '../services/tasks.js';

// Explicit local demo identity selector, NOT authentication for a public deployment.
export function demoAuth(db, enabled, roles = ['business']) {
  return async (request, _response, next) => {
    if (!enabled) throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Демо-доступ выключен. Настройте авторизацию.');
    const header = request.get('X-User-Id');
    if (!header) throw new ApiError(401, 'UNAUTHORIZED', 'Передайте X-User-Id демо-пользователя.');
    let id;
    try { id = validateUuid(header); }
    catch { throw new ApiError(401, 'UNAUTHORIZED', 'Некорректный X-User-Id.'); }
    const { rows: [user] } = await db.query('SELECT id, role FROM users WHERE id=$1', [id]);
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Пользователь не найден.');
    if (!roles.includes(user.role)) throw new ApiError(403, 'FORBIDDEN', 'Действие недоступно для этой роли.');
    request.user = user;
    next();
  };
}
