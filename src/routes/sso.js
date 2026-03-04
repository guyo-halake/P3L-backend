import express from 'express';
import { generateTicket, validateTicket } from '../controllers/ssoController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate a one-time login ticket (for the dashboard)
router.post('/generate-ticket', authenticateToken, generateTicket);

// Validate a login ticket (for the target project)
router.post('/validate-ticket', validateTicket);

export default router;
