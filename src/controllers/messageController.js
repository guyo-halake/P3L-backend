import db from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

export async function saveMessage({ from, to, message, timestamp, groupId, isProject, projectId, fileUrl }) {
  try {
    // MySQL DATETIME format YYYY-MM-DD HH:MM:SS
    const mysqlTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await db.execute(
      'INSERT INTO messages (from_user, to_user, message, timestamp, group_id, is_project, project_id, file_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [from, to || null, message, mysqlTimestamp, groupId || null, isProject ? 1 : 0, projectId || null, fileUrl || null]
    );
    // console.log removed for production

    // Log activity for new messages (abbreviate message content)
    const preview = message && message.length > 50 ? message.substring(0, 50) + '...' : message;
    logActivity('message', `New message from User #${from}: "${preview}"`, { from, to, messageId: result.insertId });

    return result.insertId;
  } catch (err) {
    console.error('Error saving message:', err);
    throw err;
  }
}


export async function getMessagesBetweenUsers(user1, user2, groupId) {
  try {
    let query = `
      SELECT m.*, 
      COALESCE(
        JSON_ARRAYAGG(
          IF(mr.id IS NOT NULL, JSON_OBJECT('user_id', mr.user_id, 'emoji', mr.emoji), NULL)
        ), '[]'
      ) as reactions
      FROM messages m
      LEFT JOIN message_reactions mr ON m.id = mr.message_id
    `;

    let params = [];

    if (groupId) {
      query += ` WHERE m.group_id = ?`;
      params.push(groupId);
    } else {
      query += ` WHERE 
        ((m.from_user = ? AND m.to_user = ?) OR (m.from_user = ? AND m.to_user = ?))
        AND m.group_id IS NULL
      `;
      params.push(user1, user2, user2, user1);
    }

    query += ` GROUP BY m.id ORDER BY m.timestamp ASC`;

    const [rows] = await db.execute(query, params);

    // Clean up reactions array (remove nulls if left join failed)
    const cleaned = rows.map(r => {
      let reacts = r.reactions;
      // If it's a string (mysql older versions sometimes return string), parse it
      if (typeof reacts === 'string') {
        try { reacts = JSON.parse(reacts); } catch (e) { reacts = []; }
      }
      // Filter out nulls from the JSON_ARRAYAGG
      if (Array.isArray(reacts)) {
        reacts = reacts.filter(x => x !== null);
      }
      return { ...r, reactions: reacts };
    });

    return cleaned;
  } catch (err) {
    console.error('Error fetching messages:', err);
    throw err;
  }
}

export async function togglePinMessage(messageId) {
  try {
    await db.execute('UPDATE messages SET is_pinned = NOT is_pinned WHERE id = ?', [messageId]);
    return true;
  } catch (err) {
    console.error("Error toggling pin:", err);
    throw err;
  }
}

export async function addMessageReaction(messageId, userId, emoji) {
  try {
    // Check if exists to toggle
    const [existing] = await db.execute('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [messageId, userId, emoji]);
    if (existing.length > 0) {
      await db.execute('DELETE FROM message_reactions WHERE id = ?', [existing[0].id]);
      return 'removed';
    } else {
      await db.execute('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)', [messageId, userId, emoji]);
      return 'added';
    }
  } catch (err) {
    console.error("Error adding reaction:", err);
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
