import { Router } from 'express';
import { tasksRouter } from './tasks.js';
import { proposalsRouter } from './proposals.js';

export function apiRouter(db, demoAuthEnabled) {
  const router = Router();
  router.get('/health', async (_request, response) => {
    try {
      await db.query('SELECT 1');
      response.json({ status: 'ok', service: 'kazast-ai-api', database: 'ok' });
    } catch {
      response.status(503).json({ status: 'error', service: 'kazast-ai-api', database: 'unavailable' });
    }
  });
  router.use(proposalsRouter(db, demoAuthEnabled));
  router.use('/tasks', tasksRouter(db, demoAuthEnabled));
  return router;
}
