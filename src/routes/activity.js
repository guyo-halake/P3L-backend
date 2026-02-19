import { Router } from 'express';
import { getActivity, createActivity } from '../controllers/activityController.js';

const router = Router();

// GET /api/activity - get recent activity
router.get('/', getActivity);

// POST /api/activity - create manual activity log
router.post('/', createActivity);

export default router;
