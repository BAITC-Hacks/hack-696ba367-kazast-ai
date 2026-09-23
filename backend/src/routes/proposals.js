import { Router } from 'express';
import { demoAuth } from '../middleware/demo-auth.js';
import { validateUuid } from '../services/tasks.js';
import { proposalService, validateProposal, validateDecision } from '../services/proposals.js';

export function proposalsRouter(db, enabled) {
  const router = Router();
  const service = proposalService(db);
  const student = demoAuth(db, enabled, 'student');
  const business = demoAuth(db, enabled);
  router.get('/teams/mine', student, async (req,res) => res.json(await service.myTeams(req.user.id)));
  router.get('/proposals/mine', student, async (req,res) => res.json(await service.mine(req.user.id)));
  router.post('/tasks/:id/proposals', student, async (req,res) => {
    const id = validateUuid(req.params.id);
    const values = validateProposal(req.body);
    res.status(201).json(await service.create(id,req.user.id,values));
  });
  router.get('/tasks/:id/proposals', business, async (req,res) => res.json(await service.forTask(validateUuid(req.params.id),req.user.id)));
  router.patch('/proposals/:id/status', business, async (req,res) => {
    const id = validateUuid(req.params.id);
    const status = validateDecision(req.body);
    res.json(await service.decide(id,req.user.id,status));
  });
  return router;
}
