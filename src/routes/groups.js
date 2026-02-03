import express from 'express';
import { createGroup, getUserGroups, getGroupMembers } from '../controllers/groupController.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, description, createdBy, memberIds } = req.body;
  try {
    const id = await createGroup(name, description, createdBy, memberIds);
    res.json({ id, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const groups = await getUserGroups(req.params.userId);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.get('/:groupId/members', async (req, res) => {
  try {
    const members = await getGroupMembers(req.params.groupId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

export default router;
