import express from 'express';
import { z } from 'zod';
import {
  getAllPlans,
  getPlanById,
  getPlanByName,
  getUserPlan,
  assignPlanToUser,
  cancelUserPlan
} from './store.js';

const router = express.Router();

router.get('/plans', async (_req, res, next) => {
  try {
    const plans = await getAllPlans();
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

router.get('/plans/:id', async (req, res, next) => {
  try {
    const plan = await getPlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
    }
    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

router.get('/user/plan', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }
    const userPlan = await getUserPlan(req.user.id);
    res.json({ plan: userPlan || null });
  } catch (error) {
    next(error);
  }
});

const selectPlanSchema = z.object({
  planId: z.string().uuid().optional(),
  planName: z.string().optional()
}).refine(
  obj => obj.planId || obj.planName,
  'Either planId or planName is required'
);

router.post('/user/plan/select', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    const data = selectPlanSchema.parse(req.body);

    let plan;
    if (data.planId) {
      plan = await getPlanById(data.planId);
    } else {
      plan = await getPlanByName(data.planName);
    }

    if (!plan) {
      return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
    }

    const subscription = await assignPlanToUser(req.user.id, plan.id);

    res.status(201).json({
      message: 'Plan assigned successfully',
      subscription,
      plan: plan
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'INVALID_INPUT', details: error.flatten() });
    }
    next(error);
  }
});

router.post('/user/plan/cancel', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    const currentPlan = await getUserPlan(req.user.id);
    if (!currentPlan) {
      return res.status(400).json({ error: 'NO_ACTIVE_PLAN' });
    }

    await cancelUserPlan(req.user.id, currentPlan.planId);

    res.json({ message: 'Plan cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
