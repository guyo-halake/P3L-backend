import { Router } from 'express';
import { getGitHubRepoActivity, createProject, getProjects, saveVercelProject, getVercelProjects, getVercelDeployments, getVercelDeploymentEvents, deleteProject, updateProject } from '../controllers/projectController.js';
const router = Router();
// GET /api/projects/github-activity?owner=OWNER&repo=REPO - fetch commit and branch data for a GitHub repo
router.get('/github-activity', getGitHubRepoActivity);
// GET /api/projects/vercel-projects - fetch all Vercel projects from Vercel API
router.get('/vercel-projects', getVercelProjects);
// GET /api/projects/vercel-deployments?project=NAME - fetch deployments for a Vercel project
router.get('/vercel-deployments', getVercelDeployments);
// GET /api/projects/vercel-deployment-events?deploymentId=ID - fetch deployment events/logs
router.get('/vercel-deployment-events', getVercelDeploymentEvents);

// POST /api/projects/vercel - save a Vercel project
router.post('/vercel', saveVercelProject);

// POST /api/projects - create a new project
router.post('/', createProject);

// GET /api/projects - get all projects
router.get('/', getProjects);

// DELETE /api/projects/:id - delete a project
router.delete('/:id', deleteProject);

// PUT /api/projects/:id - update a project
router.put('/:id', updateProject);

export default router;
