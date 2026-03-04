import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function initDB() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    console.log("Connected to DB...");

    await conn.execute(`
    CREATE TABLE IF NOT EXISTS task_checklists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      content TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE
    )
  `);

    console.log("Table task_checklists initialized.");
    process.exit(0);
}

initDB();
