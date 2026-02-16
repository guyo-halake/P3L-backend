import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// In-memory store for password reset codes (fast implementation)
const pendingResets = new Map(); // key: email, value: { code, expiresAt }

import { sendMailInternal } from './emailController.js';

export const getUserTypes = async (req, res) => {
  // Return the allowed ENUM values for frontend mapping
  const types = [
    { value: 'dev', label: 'Developer (User)' },
    { value: 'full_admin', label: 'Full Admin' },
    { value: 'client', label: 'Client' },
    { value: 'user', label: 'Standard User' }
  ];
  res.json(types);
};

export const sendInviteEmail = async (req, res) => {
  const { username, email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  
  // Template 1: Inquiry
  // "Hey {username}, welcome to P3L Developers..."
  const nameToUse = username || "User";
  const html = `
    <p>Hey <strong>${nameToUse}</strong>,</p>
    <p>Welcome to <strong>P3L Developers</strong>. You have been invited to use the P3L MS.</p>
    <p>Please reply to this email with your preferred email and password.</p>
    <p>Alternatively you can automatically log in using your GitHub.</p>
    <br/>
    <p>A confirmation email/whatsapp text will be sent upon account creation.</p>
    <br/>
    <p>Thank you</p>
    <p>-p3ldeveloper</p>
  `;

  try {
     // Record the invitation
     await db.query(
        'INSERT INTO invitations (invitee_email, invitee_name, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), invite_date = CURRENT_TIMESTAMP',
        [email, username, 'pending']
     );

     await sendMailInternal({
        to: email,
        subject: 'Invitation to P3L Developers',
        html: html,
        text: html.replace(/<[^>]*>?/gm, '') // Fallback text
     });
     res.json({ message: 'Invitation email sent' });
  } catch (err) {
     console.error('Send invite error:', err);
     res.status(500).json({ message: 'Failed to send email' });
  }
};

export const inviteUser = async (req, res) => {
  // This function is now effectively "Create User From Invite"
  const { username, email, phone, userType, password, confirmPassword } = req.body;
  
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // 1. Check if user exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // 2. Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3. Insert into DB
    const [result] = await db.query(
      'INSERT INTO users (username, email, phone, user_type, password) VALUES (?, ?, ?, ?, ?)',
      [username, email, phone || null, userType || 'dev', hashed]
    );

    // Update invitation status
    await db.query("UPDATE invitations SET status = 'approved' WHERE invitee_email = ?", [email]);

    // 4. Send Confirmation Email
    // "Hi {username}, your account has been created..."
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = `
      <p>Hi, <strong>${username}</strong>,</p>
      <p>Your account has been created.</p>
      <p>Visit the following link to log in: <a href="${appUrl}">${appUrl}</a></p>
      <p>Prefer using your laptop.</p> 
    `;
    
    try {
        await sendMailInternal({
            to: email, 
            subject: 'Account Created - P3L Developers',
            html: html,
            text: `Hi ${username}, your account has been created. Visit ${appUrl} to log in.`
        });
    } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
    }

    res.status(201).json({ message: 'User created and confirmation sent', userId: result.insertId });

  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const register = async (req, res) => {
  return res.status(403).json({ message: 'Registration is currently disabled.' });
  /*
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    // Check if user exists
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    // Insert user
    // Default user_type is 'dev'. Only 'full_admin' can create 'full_admin' users (handled elsewhere)
    await db.query('INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)', [username, email, hashed, 'dev']);
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    console.error('Register error:', err); // Log error
    res.status(500).json({ message: 'Server error', error: err.message });
  }
  */
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.error('Login failed: Password does not match for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, user_type: user.user_type }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, user_type: user.user_type, must_change_password: !!user.must_change_password } });
  } catch (err) {
    console.error('Login error:', err); // Log error
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export default { register, login };

// Admin: create user or reset password for existing user
export const adminCreateOrResetUser = async (req, res) => {
  try {
    const { username, email, password, user_type, phone } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      await db.query(
        'UPDATE users SET password = ?, username = COALESCE(?, username), user_type = COALESCE(?, user_type), phone = COALESCE(?, phone), must_change_password = TRUE WHERE email = ?',
        [hashed, username || null, user_type || null, phone || null, email]
      );
      return res.json({ updated: true });
    } else {
      const uname = username || email.split('@')[0];
      await db.query(
        'INSERT INTO users (username, email, password, user_type, phone, must_change_password) VALUES (?, ?, ?, ?, ?, TRUE)',
        [uname, email, hashed, user_type || 'dev', phone || null]
      );
      return res.status(201).json({ created: true });
    }
  } catch (err) {
    console.error('Admin create/reset error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Change password (authenticated)
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { current_password, new_password } = req.body;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!current_password || !new_password) return res.status(400).json({ message: 'Current and new password are required' });
    const [rows] = await db.query('SELECT id, password FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?', [hashed, userId]);
    return res.json({ changed: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Request password reset (unauthenticated)
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const [rows] = await db.query('SELECT id, email FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'No account for this email' });
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    pendingResets.set(email, { code, expiresAt });
    // For fast implementation, return code; in production, send via email.
    return res.json({ requested: true, code, expires_in: 900 });
  } catch (err) {
    console.error('Request reset error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Perform password reset (unauthenticated) and auto-login
export const resetPassword = async (req, res) => {
  try {
    const { email, code, new_password } = req.body;
    if (!email || !code || !new_password) return res.status(400).json({ message: 'Email, code, and new password are required' });
    const entry = pendingResets.get(email);
    if (!entry) return res.status(400).json({ message: 'No reset requested for this email' });
    if (Date.now() > entry.expiresAt) {
      pendingResets.delete(email);
      return res.status(400).json({ message: 'Reset code expired' });
    }
    if (String(code) !== String(entry.code)) return res.status(400).json({ message: 'Invalid code' });
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];
    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?', [hashed, user.id]);
    pendingResets.delete(email);
    // Auto-login
    const token = jwt.sign({ id: user.id, email: user.email, user_type: user.user_type }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ reset: true, token, user: { id: user.id, username: user.username, email: user.email, user_type: user.user_type } });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
