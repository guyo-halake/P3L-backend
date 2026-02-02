import db from '../config/db.js';

export async function createGroup(name, description, createdBy, memberIds) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [groupResult] = await connection.execute(
      'INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, createdBy]
    );
    const groupId = groupResult.insertId;

    // Add creator as member
    const allMembers = Array.from(new Set([...memberIds, createdBy]));
    for (const userId of allMembers) {
      await connection.execute(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, userId]
      );
    }

    await connection.commit();
    return groupId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getUserGroups(userId) {
  try {
    const [rows] = await db.execute(
      `SELECT g.* FROM \`groups\` g 
       JOIN group_members gm ON g.id = gm.group_id 
       WHERE gm.user_id = ?`,
      [userId]
    );
    return rows;
  } catch (err) {
    throw err;
  }
}

export async function getGroupMembers(groupId) {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.email FROM users u 
       JOIN group_members gm ON u.id = gm.user_id 
       WHERE gm.group_id = ?`,
      [groupId]
    );
    return rows;
  } catch (err) {
    throw err;
  }
}
