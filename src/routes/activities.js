import express from 'express';
import { getSystemActivity } from '../controllers/systemActivityController.js';

const router = express.Router();

// GET /api/activities — fetch recent system activities
router.get('/', getSystemActivity);

export default router;
