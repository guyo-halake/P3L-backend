import db from './src/config/db.js';

async function createTables() {
    try {
        console.log('Creating p3l_testers table...');
        await db.execute(`
      CREATE TABLE IF NOT EXISTS p3l_testers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        project_id INT,
        status VARCHAR(50) DEFAULT 'Pending',
        last_active TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('p3l_testers table created.');

        console.log('Creating p3l_tester_activities table...');
        await db.execute(`
      CREATE TABLE IF NOT EXISTS p3l_tester_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tester_id INT NOT NULL,
        project_id INT,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tester_id) REFERENCES p3l_testers(id) ON DELETE CASCADE
      )
    `);
        console.log('p3l_tester_activities table created.');

        process.exit(0);
    } catch (error) {
        console.error('Error creating tables:', error);
        process.exit(1);
    }
}

createTables();
