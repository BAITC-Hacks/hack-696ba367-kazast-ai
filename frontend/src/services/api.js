const api_url = (import.meta.env?.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function api_request(path, { method = 'GET', body, user_id, timeout_ms = 15000 } = {}) {
  const controller = new AbortController();
  const timeout_id = setTimeout(() => controller.abort(), timeout_ms);
  try {
    const response = await fetch(`${api_url}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user_id ? { 'X-User-Id': user_id } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) {
      throw { ...result.error, status: response.status };
    }
    return result;
  } catch (error) {
    if (error.code) throw error;
    throw { code: 'NETWORK_ERROR', message: 'Не удалось получить ответ сервера. Проверьте соединение и попробуйте снова. Если запрос был отправлен, проверьте сохранённую задачу перед повтором.' };
  } finally {
    clearTimeout(timeout_id);
  }
}
