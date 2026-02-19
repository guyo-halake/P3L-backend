import express from 'express';
import fs from 'fs';
import path from 'path';
import { saveMessage, getMessagesBetweenUsers, markMessagesAsRead, togglePinMessage, addMessageReaction } from '../controllers/messageController.js';

const router = express.Router();

// Toggle Pin
router.post('/:id/pin', async (req, res) => {
  try {
    await togglePinMessage(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add Reaction
router.post('/:id/react', async (req, res) => {
  const { userId, emoji } = req.body;
  try {
    const action = await addMessageReaction(req.params.id, userId, emoji);
    res.json({ success: true, action });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


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
  const { from, to, message, timestamp, groupId, isProject, projectId, fileUrl } = req.body;
  try {
    const id = await saveMessage({ from, to, message, timestamp, groupId, isProject, projectId, fileUrl });
    res.json({ id });
  } catch (err) {
    console.error('API Error:', err);
    try {
      const logPath = path.join(process.cwd(), 'backend_error.log');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - ${err.message}\n${err.stack}\n\n`);
    } catch (e) { console.error('Log write failed', e); }
    res.status(500).json({ error: 'Failed to save message: ' + err.message });
  }
});

export default router;
