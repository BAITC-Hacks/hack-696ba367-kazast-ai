import { Router } from 'express';
import { demoAuth } from '../middleware/demo-auth.js';
import { validateUuid } from '../services/tasks.js';
import { proposalsService } from '../services/proposals.js';

export function proposalsRouter(db, enabled) {
  const router = Router();
  const service = proposalsService(db);
  router.get('/tasks/:id/proposals/context', demoAuth(db, enabled, ['student', 'business']), async (req, res) => {
    res.json(await service.context(validateUuid(req.params.id), req.user));
  });
  router.post('/tasks/:id/proposals', demoAuth(db, enabled, ['student']), async (req, res) => {
    res.status(201).json(await service.create(validateUuid(req.params.id), req.user, req.body));
  });
  router.get('/tasks/:id/proposals', demoAuth(db, enabled), async (req, res) => {
    res.json(await service.list(validateUuid(req.params.id), req.user));
  });
  router.patch('/proposals/:id/status', demoAuth(db, enabled), async (req, res) => {
    res.json(await service.decide(validateUuid(req.params.id), req.user, req.body));
  });
  return router;
}
