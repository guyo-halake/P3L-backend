
import express from 'express';
import { getRevenueSummary, getTeamPerformance, getVaultDocs, addVaultDoc } from '../controllers/businessController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/revenue', authenticateToken, getRevenueSummary);
router.get('/team', authenticateToken, getTeamPerformance);
router.get('/vault', authenticateToken, getVaultDocs);
router.post('/vault', authenticateToken, addVaultDoc);

export default router;
