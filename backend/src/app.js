import cors from 'cors';
import express from 'express';
import { pool } from './db/pool.js';
import { apiRouter } from './routes/index.js';
import { ApiError } from './services/tasks.js';

export function createApp({ db = pool, clarificationAi, demoAuthEnabled = process.env.DEMO_AUTH_ENABLED === 'true' && process.env.NODE_ENV !== 'production' } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', apiRouter(db, demoAuthEnabled, clarificationAi));
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Маршрут не найден.')));
  app.use((error, _req, res, _next) => {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
    }
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Некорректный JSON.' } });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Размер запроса превышает 256 КБ.' } });
    console.error('Request failed:', error.code ?? error.name);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Не удалось выполнить запрос.' } });
  });
  return app;
}
