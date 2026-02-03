import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// In-memory store for password reset codes (fast implementation)
const pendingResets = new Map(); // key: email, value: { code, expiresAt }

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
