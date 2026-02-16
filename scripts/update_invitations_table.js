// Script to add reply_content column to invitations table
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'p3l_system'
};

async function updateInvitationsTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database.');

    // Check if column exists
    const [columns] = await connection.execute(
        "SHOW COLUMNS FROM invitations LIKE 'reply_content'"
    );

    if (columns.length === 0) {
        const alterQuery = `ALTER TABLE invitations ADD COLUMN reply_content TEXT`;
        await connection.execute(alterQuery);
        console.log('Added reply_content column to invitations table.');
    } else {
        console.log('reply_content column already exists.');
    }
    
    // Also add reply_subject if not exists, might be useful
    const [subCols] = await connection.execute("SHOW COLUMNS FROM invitations LIKE 'reply_subject'");
    if (subCols.length === 0) {
        await connection.execute("ALTER TABLE invitations ADD COLUMN reply_subject VARCHAR(255)");
        console.log('Added reply_subject column.');
    }

  } catch (error) {
    console.error('Error updating table:', error);
  } finally {
    if (connection) await connection.end();
  }
}

updateInvitationsTable();
