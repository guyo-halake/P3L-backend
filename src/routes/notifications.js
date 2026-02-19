import express from 'express';
import { getNotifications, markRead } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getNotifications); // Corrected: removed query logic from route definition
router.post('/:id/read', authenticateToken, markRead);

export default router;
