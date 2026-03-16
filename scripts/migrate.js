import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

function readSql(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

async function run() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    console.error('Missing DB envs: DB_HOST, DB_USER, DB_NAME');
    process.exit(1);
  }
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  });
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

  // Order matters: base tables first, then dependent tables
  const files = [
    // --- Core tables (no FK dependencies) ---
    path.join(root, 'src', 'models', 'users.sql'),
    path.join(root, 'src', 'models', 'orgs.sql'),
    path.join(root, 'src', 'models', 'clients.sql'),
    path.join(root, 'src', 'models', 'projects.sql'),
    path.join(root, 'src', 'models', 'schools.sql'),
    // --- Tables depending on core tables ---
    path.join(root, 'src', 'models', 'groups.sql'),           // depends on users
    path.join(root, 'src', 'models', 'messages.sql'),          // depends on users
    path.join(root, 'src', 'models', 'message_reactions.sql'), // depends on messages, users
    path.join(root, 'src', 'models', 'invites.sql'),
    path.join(root, 'src', 'models', 'notifications.sql'),     // depends on users
    path.join(root, 'src', 'models', 'services.sql'),          // depends on projects
    path.join(root, 'src', 'models', 'invoices.sql'),          // depends on clients
    path.join(root, 'src', 'models', 'system_activities.sql'),
    path.join(root, 'src', 'models', 'clients_projects.sql'),  // depends on users
    path.join(root, 'src', 'models', 'sent_messages.sql'),
  ];

  try {
    for (const f of files) {
      const sql = readSql(f);
      if (!sql) {
        console.warn('Skipped (not found):', path.basename(f));
        continue;
      }
      console.log('Applying:', path.basename(f));
      await conn.query(sql);
    }
    console.log('Migration completed successfully');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
}

run();
