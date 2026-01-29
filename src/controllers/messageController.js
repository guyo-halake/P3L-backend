import db from '../config/db.js';

export async function saveMessage({ from, to, message, timestamp }) {
  try {
    const [result] = await db.execute(
      'INSERT INTO messages (from_user, to_user, message, timestamp) VALUES (?, ?, ?, ?)',
      [from, to, message, timestamp]
    );
    // console.log removed for production
    return result.insertId;
  } catch (err) {
    console.error('Error saving message:', err);
    throw err;
  }
}

export async function getMessagesBetweenUsers(user1, user2) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM messages WHERE 
        (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)
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
