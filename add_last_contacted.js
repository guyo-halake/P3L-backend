import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function addLastContacted() {
    let connectionConfig;
    if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
        connectionConfig = process.env.MYSQL_URL || process.env.DATABASE_URL;
    } else {
        connectionConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT) || 3306,
            connectTimeout: 20000, // 20 seconds
        };
    }

    console.log('Connecting to database...', connectionConfig.host);

    try {
        const connection = await mysql.createConnection(connectionConfig);
        console.log('Connected!');

        console.log('Adding last_contacted column to clients table...');
        await connection.execute(`
      ALTER TABLE clients 
      ADD COLUMN last_contacted TIMESTAMP NULL DEFAULT NULL
    `);
        console.log('Success!');
        await connection.end();
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column already exists.');
        } else {
            console.error('Error:', err);
        }
    }
}

addLastContacted();
