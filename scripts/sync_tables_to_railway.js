// Auto-sync missing tables from local schema to Railway
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Railway DB connection config
const config = {
  host: 'interchange.proxy.rlwy.net',
  port: 34104,
  user: 'root',
  password: 'zbTiokKyasobkyQZGAlYTNVbhgTCNsBq',
  database: 'railway',
  multipleStatements: true,
};

// Path to your local schema SQL file (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_FILE = path.join(__dirname, '../p3l_system_db_schema.sql');

async function main() {
  const connection = await mysql.createConnection(config);
  const [rows] = await connection.query('SHOW TABLES');
  const existingTables = new Set(rows.map(r => Object.values(r)[0]));

  // Read and parse CREATE TABLE statements from schema file
  const schemaSQL = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const createTableRegex = /CREATE TABLE ([^\s(]+)[\s\S]*?\);/g;
  let match;
  let created = 0;
  while ((match = createTableRegex.exec(schemaSQL)) !== null) {
    const tableName = match[1].replace(/[`'"\[\]]/g, '');
    if (!existingTables.has(tableName)) {
      const createSQL = match[0];
      try {
        await connection.query(createSQL);
        console.log(`Created table: ${tableName}`);
        created++;
      } catch (err) {
        console.error(`Error creating table ${tableName}:`, err.message);
      }
    } else {
      console.log(`Table exists: ${tableName}`);
    }
  }
  await connection.end();
  if (created === 0) {
    console.log('No new tables needed. All up to date!');
  } else {
    console.log(`Created ${created} new table(s).`);
  }
}

main().catch(err => {
  console.error('Sync error:', err);
  process.exit(1);
});
