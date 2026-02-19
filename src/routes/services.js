import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getServicesByProjectId,
    createService,
    updateService,
    deleteService,
    getServiceCommits,
    triggerDeploy,
    getGithubRepos,
    getVercelProjects,
    getGithubBranches,
    getGithubPulls,
    getGithubIssues,
    getServiceDeployments
} from '../controllers/serviceController.js';

const router = express.Router();

router.use(authenticateToken); // Protect all service routes

router.get('/project/:projectId', getServicesByProjectId);
router.post('/', createService);
router.put('/:id', updateService); // Update Service
router.delete('/:id', deleteService);
router.get('/commits', getServiceCommits); // Proxy to GitHub
router.post('/:id/deploy', triggerDeploy); // Trigger Webhook

// New Endpoints: DevOps 2.0
router.get('/github/repos', getGithubRepos);
router.get('/github/branches', getGithubBranches);
router.get('/github/pulls', getGithubPulls);
router.get('/github/issues', getGithubIssues);

router.get('/vercel/projects', getVercelProjects);
router.get('/vercel/deployments', getServiceDeployments);

export default router;
