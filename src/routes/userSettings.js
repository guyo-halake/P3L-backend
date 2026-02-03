
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { updateGitHubToken, setProjectUsers, getVisibleProjects, getUserProfile, updateUserProfile, listUsers, addUser, updateUserType, deleteUser, saveInvite, updateInviteStatus, listInvites, getInviteInfo, acceptInvite } from '../controllers/userSettingsController.js';

const router = express.Router();
// Onboarding endpoints
router.get('/invite-info', getInviteInfo);
router.post('/accept-invite', acceptInvite);

// User management (admin only)
const allowRoles = (roles) => (req, res, next) => {
	if (!req.user || !roles.includes(req.user.user_type)) {
		return res.status(403).json({ message: 'Insufficient permissions' });
	}
	next();
};

// --- INVITES API ---
router.post('/invites', authenticateToken, allowRoles(['full_admin', 'dev']), saveInvite);
router.put('/invites/status', authenticateToken, allowRoles(['full_admin', 'dev']), updateInviteStatus);
router.get('/invites', authenticateToken, allowRoles(['full_admin', 'dev']), listInvites);

router.get('/users', authenticateToken, allowRoles(['full_admin', 'dev']), listUsers);
router.post('/users', authenticateToken, allowRoles(['full_admin', 'dev']), addUser);
router.put('/users/type', authenticateToken, allowRoles(['full_admin', 'dev']), updateUserType);

// Delete user by ID (RESTful)
router.delete('/users/:id', authenticateToken, allowRoles(['full_admin', 'dev']), async (req, res) => {
	// Reuse deleteUser controller logic, but adapt to req.params.id
	req.body.user_id = req.params.id;
	await deleteUser(req, res);
});

// Legacy bulk delete (if needed)
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
