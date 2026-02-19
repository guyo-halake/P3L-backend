import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

console.log("Creating 'invoices' table...");

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('Paid', 'Pending', 'Overdue', 'Draft') DEFAULT 'Draft',
        date DATE NOT NULL,
        due_date DATE,
        description VARCHAR(255),
        items JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `;

        await db.query(createTableQuery);
        console.log("Table 'invoices' created successfully.");

        await db.end();
    } catch (err) {
        console.error("Error creating table:", err);
    }
})();
