import express from 'express';
import { getVercelDeployments, getVercelProjects } from '../controllers/vercelController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All Vercel routes require authentication
router.get('/deployments', authenticateToken, getVercelDeployments);
router.get('/projects', authenticateToken, getVercelProjects);

export default router;
