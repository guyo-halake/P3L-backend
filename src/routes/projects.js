

import { Router } from 'express';
import { createProject, getProjects, saveVercelProject, getVercelProjects } from '../controllers/projectController.js';
const router = Router();
// GET /api/projects/vercel-projects - fetch all Vercel projects from Vercel API
router.get('/vercel-projects', getVercelProjects);

// POST /api/projects/vercel - save a Vercel project
router.post('/vercel', saveVercelProject);

// POST /api/projects - create a new project
router.post('/', createProject);

// GET /api/projects - get all projects
router.get('/', getProjects);

export default router;
