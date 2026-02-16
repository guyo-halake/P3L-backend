import { Router } from 'express';
import { getGitHubRepoActivity, createProject, getProjects, saveVercelProject, getVercelProjects, getVercelDeployments, getVercelDeploymentEvents, deleteProject, updateProject } from '../controllers/projectController.js';
const router = Router();
// BULK DELETE projects
router.post('/bulk-delete', async (req, res) => {
	const { ids } = req.body;
	if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No project ids provided' });
	try {
		const placeholders = ids.map(() => '?').join(',');
		const [result] = await req.app.get('db').execute(`DELETE FROM projects WHERE id IN (${placeholders})`, ids);
		res.json({ success: true, deleted: result.affectedRows });
	} catch (error) {
		res.status(500).json({ message: 'Bulk delete failed', error: error.message });
	}
});
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
