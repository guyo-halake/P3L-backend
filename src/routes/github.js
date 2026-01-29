import express from 'express';
import { getPersonalGitHubRepos, getAllGitHubRepos, githubLogin, githubCallback } from '../controllers/githubController.js';
const router = express.Router();

// GET /api/github/personal-repos?user_id=1
router.get('/personal-repos', getPersonalGitHubRepos);

// GET /api/github/all-repos?user_id=1
router.get('/all-repos', getAllGitHubRepos);

// GitHub OAuth routes
router.get('/login', githubLogin);
router.get('/callback', githubCallback);

export default router;
