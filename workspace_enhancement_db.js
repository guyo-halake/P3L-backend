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

    // Project Type & Client ID for better categorization
    try {
        await conn.execute("ALTER TABLE projects ADD COLUMN type VARCHAR(50) DEFAULT 'Fullstack Web'");
        await conn.execute("ALTER TABLE projects ADD COLUMN language VARCHAR(50) DEFAULT 'React/TS'");
        console.log("Project info columns added.");
    } catch (e) { }

    // Invoices -> Projects Link
    try {
        await conn.execute("ALTER TABLE invoices ADD COLUMN project_id INT NULL");
        await conn.execute("ALTER TABLE invoices ADD INDEX (project_id)");
        console.log("Invoices linked to projects.");
    } catch (e) { }

    // Milestones
    try {
        await conn.execute(`CREATE TABLE IF NOT EXISTS project_milestones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE,
        status ENUM('pending', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (project_id)
    )`);
        console.log("project_milestones created.");
    } catch (e) { }

    // Project Documents
    try {
        await conn.execute(`CREATE TABLE IF NOT EXISTS project_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_url VARCHAR(512) NOT NULL,
        uploaded_by INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (project_id)
    )`);
        console.log("project_documents created.");
    } catch (e) { }

    // Link system_activities to project_id if needed
    try {
        await conn.execute("ALTER TABLE system_activities ADD COLUMN project_id INT NULL");
        await conn.execute("ALTER TABLE system_activities ADD INDEX (project_id)");
        console.log("system_activities linked to projects.");
    } catch (e) { }

    process.exit(0);
}

updateDB();
