import { Router } from 'express';
import {
	getGitHubRepoActivity, createProject, getProjects, saveVercelProject,
	getVercelProjects, getVercelDeployments, getVercelDeploymentEvents,
	deleteProject, updateProject, assignProject, shareProject,
	getProjectTasks, createProjectTask, updateProjectTask,
	getTaskChecklist, addTaskChecklistItem, updateTaskChecklistItem, deleteTaskChecklistItem,
	sendTaskReminder, getProjectActivity, getProjectMilestones, addProjectMilestone,
	getProjectDocuments, getProjectInvoices
} from '../controllers/projectController.js';

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

// GET /api/projects/github-activity?owner=OWNER&repo=REPO
router.get('/github-activity', getGitHubRepoActivity);
// GET /api/projects/vercel-projects
router.get('/vercel-projects', getVercelProjects);
// GET /api/projects/vercel-deployments?project=NAME
router.get('/vercel-deployments', getVercelDeployments);
// GET /api/projects/vercel-deployment-events?deploymentId=ID
router.get('/vercel-deployment-events', getVercelDeploymentEvents);

// POST /api/projects/vercel
router.post('/vercel', saveVercelProject);

// POST /api/projects
router.post('/', createProject);

// GET /api/projects
router.get('/', getProjects);

// DELETE /api/projects/:id
router.delete('/:id', deleteProject);

// PUT /api/projects/:id
router.put('/:id', updateProject);

// POST /api/projects/:id/assign
router.post('/:id/assign', assignProject);

// POST /api/projects/:id/share
router.post('/:id/share', shareProject);

// Tasks
router.get('/:id/tasks', getProjectTasks);
router.post('/tasks', createProjectTask);
router.put('/tasks/:id', updateProjectTask);
router.get('/tasks/:id/checklist', getTaskChecklist);
router.post('/tasks/:id/checklist', addTaskChecklistItem);
router.put('/tasks/checklist/:itemId', updateTaskChecklistItem);
router.delete('/tasks/checklist/:itemId', deleteTaskChecklistItem);
router.post('/tasks/:id/remind', sendTaskReminder);

router.get('/:id/activity', getProjectActivity);
router.get('/:id/milestones', getProjectMilestones);
router.post('/:id/milestones', addProjectMilestone);
router.get('/:id/documents', getProjectDocuments);
router.get('/:id/invoices', getProjectInvoices);

export default router;
