import db from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME || (email ? email.split('@')[0] : 'admin');
  const password = process.env.ADMIN_PASSWORD;
  const role = 'full_admin';
  if (!email || !password) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD');
    process.exit(1);
  }
  try {
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    const hash = await bcrypt.hash(password, 10);
    if (rows.length > 0) {
      await db.query('UPDATE users SET password = ?, username = ? WHERE email = ?', [hash, username, email]);
      console.log('Updated admin user:', email);
    } else {
      await db.query('INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)', [username, email, hash, role]);
      console.log('Created admin user:', email);
    }
    process.exit(0);
  } catch (err) {
    console.error('Seed admin failed:', err.message || err);
    process.exit(1);
  }
}

run();
