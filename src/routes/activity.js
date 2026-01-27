import { Router } from 'express';
import { getActivity } from '../controllers/activityController.js';

const router = Router();

// GET /api/activity - get recent activity
router.get('/', getActivity);

export default router;
