import db from '../config/db.js';

// Get recent activity (messages, commits, tasks, alerts, invoices)
export const getActivity = async (req, res) => {
  try {
    // Example: fetch recent messages and projects as activity
    const [messages] = await db.execute(
      'SELECT id, from_user AS user, message AS text, timestamp FROM messages ORDER BY timestamp DESC LIMIT 5'
    );
    const [projects] = await db.execute(
      'SELECT id, name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5'
    );
    // Compose a simple activity feed
    const activity = [
      ...messages.map((m) => ({
        id: `msg-${m.id}`,
        type: 'message',
        text: m.text,
        timestamp: m.timestamp,
      })),
      ...projects.map((p) => ({
        id: `proj-${p.id}`,
        type: p.status === 'at-risk' ? 'alert' : 'commit',
        text: `Project \"${p.name}\" updated`,
        timestamp: p.created_at,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: 'Failed to fetch activity', error: error.message });
  }
};
