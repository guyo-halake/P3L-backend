import db from '../config/db.js';

export const getInvitations = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM invitations ORDER BY invite_date DESC");
    res.json(rows);
  } catch (err) {
    console.error('Get invitations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
