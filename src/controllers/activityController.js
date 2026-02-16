import db from '../config/db.js';

// Get recent activity (messages, commits, tasks, alerts, invoices)
export const getActivity = async (req, res) => {
  try {
    const { user_id } = req.query;

    let messages = [];
    let projects = [];

    // Filter by user_id if provided
    if (user_id) {
       // Messages involving the user
       const [msgs] = await db.execute(
         `SELECT m.id, m.from_user AS user, m.message AS text, m.timestamp, u.username, u.avatar 
          FROM messages m 
          LEFT JOIN users u ON m.from_user = u.id 
          WHERE m.from_user = ? OR m.to_user = ? 
          ORDER BY m.timestamp DESC LIMIT 8`,
         [user_id, user_id]
       );
       messages = msgs;

       // Projects owned by the user
       const [projs] = await db.execute(
         'SELECT id, name, status, created_at FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 8',
         [user_id]
       );
       projects = projs;
    } else {
       // Fallback/Admin view: fetch all
       const [msgs] = await db.execute(
         `SELECT m.id, m.from_user AS user, m.message AS text, m.timestamp, u.username, u.avatar 
          FROM messages m 
          LEFT JOIN users u ON m.from_user = u.id 
          ORDER BY m.timestamp DESC LIMIT 5`
       );
       messages = msgs;
       const [projs] = await db.execute(
         'SELECT id, name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5'
       );
       projects = projs;
    }

    // Compose a simple activity feed
    const activity = [
      ...messages.map((m) => ({
        id: `msg-${m.id}`,
        type: 'message',
        text: m.text,
        timestamp: m.timestamp,
        detail: 'Message',
        avatar: m.avatar,
        sender: m.username
      })),
      ...projects.map((p) => ({
        id: `proj-${p.id}`,
        type: p.status === 'at-risk' ? 'alert' : 'system', // Map project updates to 'system'
        text: `Project "${p.name}" ${p.status === 'active' ? 'deployed' : 'updated'}`,
        timestamp: p.created_at,
        detail: 'System'
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
    
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    // Return empty array instead of error to prevent UI crash, but log it
    res.json([]); 
  }
};
