// Script to create the invitations table
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'p3l_system'
};

async function createInvitationsTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database.');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invitee_email VARCHAR(150) NOT NULL UNIQUE,
        invitee_name VARCHAR(100),
        status ENUM('pending', 'replied', 'approved') DEFAULT 'pending',
        invite_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await connection.execute(createTableQuery);
    console.log('Invitations table created successfully.');

    // Add a notifications table for general system alerts if not exists
    const createNotificationsQuery = `
       CREATE TABLE IF NOT EXISTS notifications (
         id INT AUTO_INCREMENT PRIMARY KEY,
         user_id INT, -- if for specific user, null for system-wide/admin
         type VARCHAR(50) NOT NULL, -- 'reply_received', 'new_user', etc.
         message TEXT,
         is_read BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
    `;
    await connection.execute(createNotificationsQuery);
    console.log('Notifications table created successfully.');


  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    if (connection) await connection.end();
  }
}

createInvitationsTable();
