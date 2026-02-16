
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function addColumn() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        // Check if column exists
        const [columns] = await connection.query("SHOW COLUMNS FROM invoices LIKE 'pdf_url'");
        if (columns.length === 0) {
            await connection.query("ALTER TABLE invoices ADD COLUMN pdf_url VARCHAR(512) DEFAULT NULL");
            console.log("Column 'pdf_url' added successfully.");
        } else {
            console.log("Column 'pdf_url' already exists.");
        }
    } catch (error) {
        console.error("Error adding column:", error);
    } finally {
        await connection.end();
    }
}

addColumn();
