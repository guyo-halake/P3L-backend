import db from '../config/db.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    // Assuming admin sees system notifications? Or specific user?
    // For now, if user is admin, show all 'reply_received' notifications.
    // If we want personalized notifications, we'd use user_id in the table.
    
    // Check if user is admin (simplified check)
    if (req.user.user_type !== 'full_admin' && req.user.user_type !== 'client') {
       return res.json([]); // Only admins/clients see notifications?
    }

    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE is_read = FALSE ORDER BY created_at DESC LIMIT 50"
    );
    res.json(rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE notifications SET is_read = TRUE WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
