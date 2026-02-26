import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sendSMS, getSMSLogs } from '../controllers/smsController.js';

const router = express.Router();

// Publicly reachable for now, but usually restricted to admin
router.post('/send', sendSMS);
router.get('/logs', authenticateToken, getSMSLogs);

export default router;
