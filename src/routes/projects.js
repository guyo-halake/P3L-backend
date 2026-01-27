
import { Router } from 'express';
import { createProject, getProjects, saveVercelProject } from '../controllers/projectController.js';

const router = Router();

// POST /api/projects/vercel - save a Vercel project
router.post('/vercel', saveVercelProject);

// POST /api/projects - create a new project
router.post('/', createProject);

// GET /api/projects - get all projects
router.get('/', getProjects);

export default router;
