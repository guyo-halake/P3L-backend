import db from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function seedUsers() {
  try {
    const users = [
      ['Jose P3L', 'josephwanjohi508@gmail.com', 'joseep3l', 'dev'],
      ['Mkavi P3L', 'mkavivictor@gmail.com', 'mkavip3l', 'dev'],
      ['Razak P3L', 'guyohalakeofficial@gmail.com', 'razakp3l', 'dev'],
    ];

    for (const [username, email, plainPassword, userType] of users) {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        console.log(`Skipped existing user: ${email}`);
        continue;
      }
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      await db.query(
        'INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)',
        [username, email, passwordHash, userType]
      );
      console.log(`Added user: ${username}`);
    }
    console.log('Seed users complete');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
}

seedUsers();
