
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log('Starting migration...');

        // 1. Add revenue_type to invoices
        try {
            await db.query(`ALTER TABLE invoices ADD COLUMN revenue_type VARCHAR(50) DEFAULT 'Freelance/Remote'`);
            console.log('Added revenue_type to invoices');
        } catch (e) {
            console.log('revenue_type already exists or error:', e.message);
        }

        // 2. Create team_performance table
        await db.query(`
            CREATE TABLE IF NOT EXISTS team_performance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                hours_logged DECIMAL(10, 2) DEFAULT 0,
                contributions INT DEFAULT 0,
                skill_growth_json JSON, -- { "React": 80, "Node": 50 }
                streak INT DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('team_performance table ready');

        // 3. Create business_vault table
        await db.query(`
            CREATE TABLE IF NOT EXISTS business_vault (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category ENUM('Legal', 'Accounting', 'Partnerships', 'Supplier', 'Business') DEFAULT 'Business',
                file_url VARCHAR(512),
                source ENUM('Local', 'GoogleDrive') DEFAULT 'Local',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('business_vault table ready');

        // 4. Create revenue_subscriptions table (for MRR tracking)
        await db.query(`
            CREATE TABLE IF NOT EXISTS revenue_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                service_name VARCHAR(255) NOT NULL,
                amount_monthly DECIMAL(10, 2) NOT NULL,
                status ENUM('Active', 'Cancelled', 'Paused') DEFAULT 'Active',
                started_at DATE,
                last_payment_at DATE,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
            )
        `);
        console.log('revenue_subscriptions table ready');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await db.end();
    }
}

migrate();
