
import express from 'express';
import { updateGitHubToken, setProjectUsers, getVisibleProjects, getUserProfile, updateUserProfile, listUsers, addUser, updateUserType, deleteUser } from '../controllers/userSettingsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
const router = express.Router();


// User management (admin only)
const allowRoles = (roles) => (req, res, next) => {
	if (!req.user || !roles.includes(req.user.user_type)) {
		return res.status(403).json({ message: 'Insufficient permissions' });
	}
	next();
};

router.get('/users', authenticateToken, allowRoles(['full_admin', 'dev']), listUsers);
router.post('/users', authenticateToken, allowRoles(['full_admin', 'dev']), addUser);
router.put('/users/type', authenticateToken, allowRoles(['full_admin', 'dev']), updateUserType);
router.delete('/users', authenticateToken, allowRoles(['full_admin', 'dev']), deleteUser);

// Get user profile
router.get('/profile', authenticateToken, getUserProfile);

// Update user profile
router.put('/profile', authenticateToken, updateUserProfile);

// Update GitHub token for a user
router.post('/github-token', authenticateToken, updateGitHubToken);

// Set allowed users for a project
router.post('/project-users', authenticateToken, setProjectUsers);

// Get projects visible to a user
router.get('/visible-projects', authenticateToken, getVisibleProjects);

export default router;
