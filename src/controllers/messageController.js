import db from '../config/db.js';

export async function saveMessage({ from, to, message, timestamp, groupId, isProject, projectId }) {
  try {
    const [result] = await db.execute(
      'INSERT INTO messages (from_user, to_user, message, timestamp, group_id, is_project, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [from, to || null, message, timestamp, groupId || null, isProject ? 1 : 0, projectId || null]
    );
    // console.log removed for production
    return result.insertId;
  } catch (err) {
    console.error('Error saving message:', err);
    throw err;
  }
}

export async function getMessagesBetweenUsers(user1, user2, groupId) {
  try {
    if (groupId) {
      const [rows] = await db.execute(
        `SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC`,
        [groupId]
      );
      return rows;
    }
    const [rows] = await db.execute(
      `SELECT * FROM messages WHERE 
        ((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?))
        AND group_id IS NULL
        ORDER BY timestamp ASC`,
      [user1, user2, user2, user1]
    );
    // console.log removed for production
    return rows;
  } catch (err) {
    console.error('Error fetching messages:', err);
    throw err;
  }
}

export async function markMessagesAsRead(from_user, to_user, groupId) {
  try {
    if (groupId) {
      const [result] = await db.execute(
        'UPDATE messages SET `read` = 1 WHERE group_id = ? AND from_user != ? AND `read` = 0',
        [groupId, to_user] // to_user is the current user marked them as read
      );
      return result.affectedRows;
    }
    const [result] = await db.execute(
      'UPDATE messages SET `read` = 1 WHERE from_user = ? AND to_user = ? AND `read` = 0',
      [from_user, to_user]
    );
    return result.affectedRows;
  } catch (err) {
    console.error('Error marking messages as read:', err);
    throw err;
  }
}
