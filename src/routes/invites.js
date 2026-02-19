import express from 'express';
import { getInvitations } from '../controllers/inviteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getInvitations);

export default router;
