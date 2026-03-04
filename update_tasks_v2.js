import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function updateDB() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    console.log("Connected to DB...");

    // Add priority column to project_tasks if it doesn't already exist from previous step, just to be sure
    try {
        await conn.execute("ALTER TABLE project_tasks ADD COLUMN priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium'");
        console.log("priority added to project_tasks");
    } catch (e) { }

    // Update checklits
    try {
        await conn.execute("ALTER TABLE task_checklists ADD COLUMN status VARCHAR(20) DEFAULT 'not_started'");
        console.log("status added to task_checklists");
    } catch (e) { }

    await conn.execute("UPDATE task_checklists SET status = IF(completed = 1, 'completed', 'not_started')");
    console.log("Migrated completed status to status column.");

    process.exit(0);
}

updateDB();
