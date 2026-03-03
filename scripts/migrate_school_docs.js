import dotenv from 'dotenv';
dotenv.config();
import db from '../src/config/db.js';

async function migrate() {
    const queries = [
        // Add user_id to schools
        { name: 'schools.user_id', sql: "ALTER TABLE schools ADD COLUMN user_id INT" },
        // Add graduated_at to schools
        { name: 'schools.graduated_at', sql: "ALTER TABLE schools ADD COLUMN graduated_at DATE" },
        // Create school_documents table
        {
            name: 'school_documents', sql: `
      CREATE TABLE IF NOT EXISTS school_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT,
        user_id INT,
        category VARCHAR(64) NOT NULL,
        subcategory VARCHAR(64),
        title VARCHAR(255) NOT NULL,
        file_url VARCHAR(512),
        file_type VARCHAR(32),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      )
    `},
        // Mark all existing assignments as Submitted
        { name: 'mark_assignments_done', sql: "UPDATE school_assignments SET status = 'Submitted'" },
        // Mark all existing units as Completed with 100% progress
        { name: 'mark_units_done', sql: "UPDATE school_units SET status = 'Completed', progress = 100" },
        // Mark all existing schools as Graduated
        { name: 'mark_schools_graduated', sql: "UPDATE schools SET status = 'Graduated', graduated_at = '2025-11-14'" },
    ];

    for (const q of queries) {
        try {
            await db.query(q.sql);
            console.log(`Done: ${q.name}`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(`Already exists: ${q.name}`);
            } else {
                console.error(`Error (${q.name}):`, e.message);
            }
        }
    }

    console.log('Migration complete');
    process.exit(0);
}

migrate();
