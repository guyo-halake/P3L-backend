import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
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
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login route hit');
  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log('DB rows:', rows);
    if (rows.length === 0) {
      console.error('Login failed: No user found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = rows[0];
    console.log('User from DB:', user);
    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);
    if (!match) {
      console.error('Login failed: Password does not match for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, user_type: user.user_type }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, user_type: user.user_type } });
  } catch (err) {
    console.error('Login error:', err); // Log error
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export default { register, login };
