import express from 'express';
import { saveMessage, getMessagesBetweenUsers, markMessagesAsRead } from '../controllers/messageController.js';

const router = express.Router();

// Get all messages between two users or group
router.get('/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  const { groupId } = req.query;
  try {
    const messages = await getMessagesBetweenUsers(user1, user2, groupId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark messages as read
router.put('/read', async (req, res) => {
  const { from_user, to_user, groupId } = req.body;
  try {
    await markMessagesAsRead(from_user, to_user, groupId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Save a new message
router.post('/', async (req, res) => {
  const { from, to, message, timestamp, groupId, isProject, projectId } = req.body;
  try {
    const id = await saveMessage({ from, to, message, timestamp, groupId, isProject, projectId });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

export default router;
