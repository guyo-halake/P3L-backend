import express from 'express';
import { getAllGitHubRepos } from '../controllers/orgsController.js';
const router = express.Router();

// GET /api/github/all-repos?user_id=1
router.get('/all-repos', getAllGitHubRepos);

export default router;
