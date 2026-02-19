
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
};

(async () => {
    try {
        console.log(`Connecting to ${dbConfig.database} on ${dbConfig.host}...`);
        const conn = await mysql.createConnection(dbConfig);
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS system_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            meta JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('Table system_activities created successfully.');
        await conn.end();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
