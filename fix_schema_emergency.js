import dotenv from 'dotenv';
dotenv.config();
import db from './src/config/db.js';

async function fixSchema() {
    try {
        console.log('--- Starting Schema Fix ---');
        console.log('DB Host:', process.env.DB_HOST); // Debug log


        // 1. Fix clients_projects table
        console.log('Checking clients_projects table...');
        try {
            const [cols] = await db.query("SHOW COLUMNS FROM clients_projects LIKE 'project_type'");
            if (cols.length === 0) {
                console.log('Adding project_type column to clients_projects...');
                await db.query("ALTER TABLE clients_projects ADD COLUMN project_type VARCHAR(100) DEFAULT 'Web App'");
                console.log('project_type column added.');
            } else {
                console.log('project_type column already exists.');
            }
        } catch (err) {
            console.error('Error checking clients_projects:', err.message);
        }

        // 2. Fix appointments table (if missing, as seen in other logs usually)
        // Just in case, but focusing on the reported error first.

        // 3. Create invitations table
        console.log('Checking invitations table...');
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS invitations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    invitee_email VARCHAR(255) NOT NULL,
                    status ENUM('pending', 'replied', 'accepted', 'declined') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_checked DATETIME NULL,
                    reply_content TEXT NULL,
                    reply_subject VARCHAR(255) NULL,
                    invite_date DATETIME DEFAULT CURRENT_TIMESTAMP -- Added for compatibility with controller sort
                )
            `);
            console.log('invitations table checked/created.');
        } catch (err) {
            console.error('Error creating invitations table:', err.message);
        }

        console.log('--- Schema Fix Completed ---');
        process.exit(0);

    } catch (err) {
        console.error('Fatal error in schema fix:', err);
        process.exit(1);
    }
}

fixSchema();
