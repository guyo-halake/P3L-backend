import express from 'express';
import fetch from 'node-fetch';
import { getPersonalGitHubRepos, getAllGitHubRepos, githubLogin, githubCallback, getRepoReadme, getRepoBranches, getRepoCommits, getRepoPulls, getRepoIssues, mergePullRequest, createBranch, createPullRequest, createIssue, updateIssue, getGithubMe, getRepoLatestWorkflowRun, addRepoCollaborator, getRepoLanguages, getRepoReleases, getRepoCollaborators, getRepoWorkflows, getRepoWorkflowRuns, getRepoContents, getRepoFileContent } from '../controllers/githubController.js';
const router = express.Router();

// GET /api/github/personal-repos?user_id=1
router.get('/personal-repos', getPersonalGitHubRepos);

// GET /api/github/all-repos?user_id=1
router.get('/all-repos', getAllGitHubRepos);

// GitHub OAuth routes
router.get('/login', githubLogin);
router.get('/callback', githubCallback);
// Token validation
router.get('/me', getGithubMe);
// README
router.get('/readme', getRepoReadme);
// Repo branches & commits & pulls
router.get('/branches', getRepoBranches);
router.get('/commits', getRepoCommits);
router.get('/pulls', getRepoPulls);
router.get('/issues', getRepoIssues);
router.get('/workflows/latest', getRepoLatestWorkflowRun);
router.get('/languages', getRepoLanguages);
router.get('/releases', getRepoReleases);
router.get('/collaborators', getRepoCollaborators);
router.get('/workflows', getRepoWorkflows);
router.get('/workflow-runs', getRepoWorkflowRuns);
router.get('/contents', getRepoContents);
router.get('/file-content', getRepoFileContent);
// Actions: merge PR, create branch
router.post('/pulls/merge', mergePullRequest);
router.post('/pulls/create', createPullRequest);
router.post('/issues/create', createIssue);
router.post('/issues/update', updateIssue);
router.post('/branches/create', createBranch);
router.post('/collaborators/add', addRepoCollaborator);

// Proxy GitHub avatar to avoid cross-origin image issues
router.get('/avatar', async (req, res) => {
	const user = req.query.user;
	if (!user) {
		return res.status(400).json({ message: 'Missing user parameter' });
	}
	try {
		const avatarUrl = `https://github.com/${user}.png`;
		const response = await fetch(avatarUrl, { redirect: 'follow' });
		if (!response.ok) {
			return res.status(response.status).json({ message: 'Failed to fetch avatar' });
		}
		const contentType = response.headers.get('content-type') || 'image/png';
		const buffer = Buffer.from(await response.arrayBuffer());
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', contentType);
		res.send(buffer);
	} catch (err) {
		console.error('Avatar proxy error:', err);
		res.status(500).json({ message: 'Avatar proxy error' });
	}
});

export default router;
