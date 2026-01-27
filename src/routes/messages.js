import express from 'express';
import { saveMessage, getMessagesBetweenUsers } from '../controllers/messageController.js';

const router = express.Router();

// Get all messages between two users
router.get('/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const messages = await getMessagesBetweenUsers(user1, user2);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Save a new message
router.post('/', async (req, res) => {
  const { from, to, message, timestamp } = req.body;
  try {
    const id = await saveMessage({ from, to, message, timestamp });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

export default router;
