import express from 'express';
import { register, login, adminCreateOrResetUser, changePassword, requestPasswordReset, resetPassword, getUserTypes, inviteUser, sendInviteEmail } from '../controllers/authController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.get('/types', getUserTypes);
router.post('/send-invite', authenticateToken, sendInviteEmail); // New step 1
router.post('/invite', authenticateToken, inviteUser); // Creating user (step 2)
router.post('/admin/create-or-reset', authenticateToken, requireRole('full_admin'), adminCreateOrResetUser);
router.post('/change-password', authenticateToken, changePassword);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
