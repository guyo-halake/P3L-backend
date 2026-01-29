// backend/src/routes/tryhackme.js
import express from 'express';
import { fetchTryHackMeProfile } from '../services/tryhackmeService.js';

const router = express.Router();

// GET /api/tryhackme/:username
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const profile = await fetchTryHackMeProfile(username);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch TryHackMe profile' });
  }
});

export default router;
