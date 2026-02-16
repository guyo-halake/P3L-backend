// Script to apply new school-related tables to Railway DB
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const config = {
  host: 'interchange.proxy.rlwy.net',
  port: 34104,
  user: 'root',
  password: 'zbTiokKyasobkyQZGAlYTNVbhgTCNsBq',
  database: 'railway',
  multipleStatements: true,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQL_FILE = path.join(__dirname, '../models/add_school_related_tables.sql');

async function main() {
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const conn = await mysql.createConnection(config);
  try {
    await conn.query(sql);
    console.log('All new school-related tables created or already exist.');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('Error applying schema:', err);
  process.exit(1);
});
