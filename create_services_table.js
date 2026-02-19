
import db from './src/config/db.js';

async function createServicesTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL, -- frontend, backend, api, db, other
                repo_url VARCHAR(255), -- Full GitHub URL
                repo_name VARCHAR(255), -- owner/repo for API calls
                deploy_url VARCHAR(255), -- Live site
                webhook_url VARCHAR(255), -- Deploy hook
                last_deployed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        `;

        console.log('Creating services table...');
        await db.query(query);
        console.log('Services table created successfully.');
    } catch (err) {
        console.error('Error creating services table:', err);
    } finally {
        process.exit();
    }
}

createServicesTable();
