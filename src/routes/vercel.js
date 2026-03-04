import express from 'express';
import { getVercelDeployments, getVercelProjects, createVercelDeployment, getVercelEnvVars, createVercelEnvVar, deleteVercelEnvVar } from '../controllers/vercelController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All Vercel routes require authentication
router.get('/deployments', authenticateToken, getVercelDeployments);
router.get('/projects', authenticateToken, getVercelProjects);
router.post('/deploy', authenticateToken, createVercelDeployment);

// Environment variables
router.get('/projects/:projectId/env', authenticateToken, getVercelEnvVars);
router.post('/projects/:projectId/env', authenticateToken, createVercelEnvVar);
router.delete('/projects/:projectId/env/:envId', authenticateToken, deleteVercelEnvVar);

export default router;
