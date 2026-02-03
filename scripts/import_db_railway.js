import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    host: process.env.DB_HOST || 'your-railway-host',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'your-password',
    database: process.env.DB_NAME || 'railway',
    multipleStatements: true,
    ssl: {
        rejectUnauthorized: false
    }
};

async function importDb() {
    console.log('Connecting to Railway MySQL...');
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected!');

        const dumpPath = path.resolve(__dirname, '../p3l_system_db_dump.sql');
        console.log(`Reading SQL dump from ${dumpPath}...`);
        const sql = await fs.readFile(dumpPath, 'utf8');

        console.log('Executing SQL dump... (this might take a moment)');
        await connection.query(sql);

        console.log('Database import completed successfully!');
    } catch (err) {
        console.error('Error during import:', err);
    } finally {
        if (connection) await connection.end();
    }
}

importDb();
