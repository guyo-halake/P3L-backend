
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
        const conn = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS clients_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_name VARCHAR(255) NOT NULL,
                client_name VARCHAR(255) NOT NULL,
                description TEXT,
                github_repos JSON,
                vercel_url VARCHAR(255),
                deadline DATE,
                budget DECIMAL(15, 2),
                dev_assigned_id INT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dev_assigned_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        console.log('Table clients_projects created successfully.');
        await conn.end();
        process.exit(0);
    } catch (e) {
        console.error('Error creating table:', e);
        process.exit(1);
    }
})();
