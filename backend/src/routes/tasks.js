import { Router } from 'express';
import { demoAuth } from '../middleware/demo-auth.js';
import { taskService, validateBody, validateUuid } from '../services/tasks.js';
import { getCatalog, getPublishedTask } from '../services/catalog.js';
import { getMyTasks } from '../services/my-tasks.js';

export function tasksRouter(db, demoAuthEnabled) {
  const router = Router();
  const service = taskService(db);
  router.get('/', async (req, res) => res.json(await getCatalog(db, req.query)));
  router.get('/:id/published', async (req, res) => res.json(await getPublishedTask(db, validateUuid(req.params.id))));
  router.use(demoAuth(db, demoAuthEnabled));
  router.get('/mine', async (req, res) => res.json(await getMyTasks(db, req.user.id, req.query)));
  router.post('/', async (req, res) => {
    const result = await service.create(req.user.id, validateBody(req.body, 'create'));
    res.status(201).location(`/api/tasks/${result.task.id}`).json(result);
  });
  router.get('/:id', async (req, res) => {
    res.json(await service.get(validateUuid(req.params.id), req.user.id));
  });
  router.patch('/:id', async (req, res) => {
    const id = validateUuid(req.params.id);
    const values = validateBody(req.body, 'edit');
    res.json(await service.edit(id, req.user.id, values, req.body.expected_version));
  });
  router.post('/:id/confirm', async (req, res) => {
    const id = validateUuid(req.params.id);
    validateBody(req.body, 'confirm');
    const { created, ...result } = await service.confirm(id, req.user.id, req.body.expected_version);
    res.status(created ? 201 : 200).json(result);
  });
  router.post('/:id/publish', async (req, res) => {
    const id = validateUuid(req.params.id);
    validateBody(req.body, 'publish');
    res.json(await service.publish(id, req.user.id, req.body.expected_version));
  });
  return router;
}
