// List all users (admin only)
export const listUsers = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, username, email, phone, avatar, github_token, user_type, created_at FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// Add a new user (admin only)
export const addUser = async (req, res) => {
  const { username, email, password, user_type, phone } = req.body;
  if (!username || !email || !password || !user_type) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (!['full_admin', 'dev'].includes(user_type)) {
    return res.status(400).json({ message: 'Invalid user_type' });
  }
  try {
    // Check if user exists
    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const bcrypt = (await import('bcryptjs')).default;
    const hashed = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO users (username, email, password, user_type, phone) VALUES (?, ?, ?, ?, ?)', [username, email, hashed, user_type, phone || null]);
    res.status(201).json({ message: 'User added' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add user', error: error.message });
  }
};

// Update user_type (admin only)
export const updateUserType = async (req, res) => {
  const { user_id, user_type } = req.body;
  if (!user_id || !user_type) {
    return res.status(400).json({ message: 'user_id and user_type are required' });
  }
  if (!['full_admin', 'dev'].includes(user_type)) {
    return res.status(400).json({ message: 'Invalid user_type' });
  }
  try {
    await db.execute('UPDATE users SET user_type = ? WHERE id = ?', [user_type, user_id]);
    res.json({ message: 'User type updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user type', error: error.message });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [user_id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};
// Get user profile by ID
export const getUserProfile = async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }
  try {
    const [rows] = await db.execute('SELECT id, username, email, phone, avatar, github_token FROM users WHERE id = ?', [user_id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
};

// Update user profile by ID
export const updateUserProfile = async (req, res) => {
  const { user_id, username, email, phone, avatar, github_token } = req.body;
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }
  try {
    await db.execute(
      'UPDATE users SET username = ?, email = ?, phone = ?, avatar = ?, github_token = ? WHERE id = ?',
      [username, email, phone, avatar, github_token, user_id]
    );
    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};
import db from '../config/db.js';

// Update user's GitHub token
export const updateGitHubToken = async (req, res) => {
  const { user_id, github_token } = req.body;
  if (!user_id || !github_token) {
    return res.status(400).json({ message: 'user_id and github_token are required' });
  }
  try {
    await db.execute('UPDATE users SET github_token = ? WHERE id = ?', [github_token, user_id]);
    res.json({ message: 'GitHub token updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update GitHub token', error: error.message });
  }
};

// Update project visibility (set allowed users for a project)
export const setProjectUsers = async (req, res) => {
  const { project_id, user_ids } = req.body;
  if (!project_id || !Array.isArray(user_ids)) {
    return res.status(400).json({ message: 'project_id and user_ids[] are required' });
  }
  try {
    // Remove existing users for this project
    await db.execute('DELETE FROM project_users WHERE project_id = ?', [project_id]);
    // Add new users
    for (const user_id of user_ids) {
      await db.execute('INSERT INTO project_users (project_id, user_id) VALUES (?, ?)', [project_id, user_id]);
    }
    res.json({ message: 'Project users updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project users', error: error.message });
  }
};

// Get projects visible to a user
export const getVisibleProjects = async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }
  try {
    const [rows] = await db.execute(`
      SELECT p.*, c.name AS client
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      INNER JOIN project_users pu ON pu.project_id = p.id
      WHERE pu.user_id = ?
      ORDER BY p.created_at DESC
    `, [user_id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch visible projects', error: error.message });
  }
};
