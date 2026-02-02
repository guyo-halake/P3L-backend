import { sendEmail as sendInviteEmail } from './emailController.js';

// Get invite info for onboarding
export const getInviteInfo = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const [rows] = await db.execute('SELECT * FROM invites WHERE invite_token = ?', [token]);
    if (!rows.length) return res.status(404).json({ error: 'Invite not found' });
    const invite = rows[0];
    // Remove allow_custom_credentials check so onboarding works for all invites
    if (invite.status !== 'sent') {
      return res.status(400).json({ error: 'Invite not valid for onboarding' });
    }
    res.json(invite);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Accept invite and set credentials
export const acceptInvite = async (req, res) => {
  const { token, username, email, password, phone, avatar, github_token } = req.body;
  if (!token || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const [rows] = await db.execute('SELECT * FROM invites WHERE invite_token = ?', [token]);
    if (!rows.length) return res.status(404).json({ error: 'Invite not found' });
    const invite = rows[0];
    // Check if user already exists
    const [userRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (userRows.length) return res.status(409).json({ error: 'Email already registered' });
    // Hash password
    const bcrypt = (await import('bcryptjs')).default;
    const hashed = await bcrypt.hash(password, 10);
    // Create user with all info if available
    await db.execute(
      'INSERT INTO users (username, email, password, user_type, phone, avatar, github_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashed, 'dev', phone || invite.phone || null, avatar || null, github_token || null]
    );
    // Update invite status
    await db.execute('UPDATE invites SET status = ?, accepted_at = CURRENT_TIMESTAMP, username = ?, email = ? WHERE id = ?', ['accepted', username, email, invite.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// --- INVITES API ---
// Save a new invite
export const saveInvite = async (req, res) => {
  const { username, email, password, method, phone, message, role, avatar, github_token } = req.body;
  if (!username || !email || !password || !method || !message || (method === 'whatsapp' && !phone)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  let invite_token = null;
  try {
    // Create user immediately
    const bcrypt = (await import('bcryptjs')).default;
    const hashed = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (username, email, password, user_type, phone, avatar, github_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashed, role || 'dev', phone || null, avatar || null, github_token || null]
    );
    // Save invite
    await db.execute(
      'INSERT INTO invites (username, email, method, message, status, invite_token) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, method, message + `\nPassword: ${password}` + (phone ? `\nPhone: ${phone}` : ''), 'sent', invite_token]
    );
    // Compose message for email
    const appUrl = process.env.APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
    let inviteMessage = `${message}\nPassword: ${password}\nApp URL: ${appUrl}`;
    if (phone) inviteMessage += `\nPhone: ${phone}`;
    // Send invite email if method is email
    if (method === 'email') {
      try {
        await sendInviteEmail({
          body: {
            to: email,
            subject: 'You are invited to P3L',
            text: inviteMessage,
            html: `<div>${message}<br><br><b>Password:</b> ${password}<br><b>App URL:</b> <a href='${appUrl}'>${appUrl}</a>${phone ? `<br><b>Phone:</b> ${phone}` : ''}</div>`
          }
        }, {
          json: () => {},
          status: () => ({ json: () => {} })
        });
      } catch (err) {
        console.error('Failed to send invite email:', err);
      }
    }
    res.status(201).json({ message: 'Invite saved and user created', invite_token, inviteMessage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save invite or create user', error: error.message });
  }
};

// Update invite status (e.g., delivered, accepted)
export const updateInviteStatus = async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ message: 'Missing id or status' });
  }
  try {
    let updateSql = 'UPDATE invites SET status = ?';
    let params = [status];
    if (status === 'accepted') {
      updateSql += ', accepted_at = CURRENT_TIMESTAMP';
    }
    updateSql += ' WHERE id = ?';
    params.push(id);
    await db.execute(updateSql, params);
    res.json({ message: 'Invite status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update invite status', error: error.message });
  }
};

// List all invites (admin only)
export const listInvites = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM invites ORDER BY sent_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invites', error: error.message });
  }
};
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
  console.log('addUser received:', { username, email, password, user_type, phone });
  if (!username || !email || !password || !user_type) {
    console.log('addUser missing field:', { username, email, password, user_type, phone });
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (!['full_admin', 'dev'].includes(user_type)) {
    console.log('addUser invalid user_type:', user_type);
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
// Get user profile for the authenticated user (from JWT)
export const getUserProfile = async (req, res) => {
  const user_id = req.user?.id;
  if (!user_id) {
    return res.status(401).json({ message: 'Unauthorized: missing user id in token' });
  }
  try {
    const [rows] = await db.execute('SELECT id, username, email, phone, avatar, github_token, user_type FROM users WHERE id = ?', [user_id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
};

// Update user profile for the authenticated user (from JWT)
export const updateUserProfile = async (req, res) => {
  const user_id = req.user?.id;
  const { username, email, phone, avatar, github_token } = req.body;
  if (!user_id) {
    return res.status(401).json({ message: 'Unauthorized: missing user id in token' });
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
