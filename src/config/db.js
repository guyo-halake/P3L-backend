import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

// Determine connection settings: use MYSQL_URL/DATABASE_URL if available (Railway), otherwise use individual env vars (Local/Manual)
let connectionConfig;

if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
  const connectionString = process.env.MYSQL_URL || process.env.DATABASE_URL;
  connectionConfig = {
    uri: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
} else {
  connectionConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const pool = mysql.createPool(connectionConfig);

export default pool.promise();
