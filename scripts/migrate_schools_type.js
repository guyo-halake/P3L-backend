import dotenv from 'dotenv';
dotenv.config();
import db from '../src/config/db.js';

async function migrate() {
    const columns = [
        { name: 'type', sql: "ALTER TABLE schools ADD COLUMN type VARCHAR(32) DEFAULT 'physical'" },
        { name: 'platform', sql: "ALTER TABLE schools ADD COLUMN platform VARCHAR(64)" },
        { name: 'platform_username', sql: "ALTER TABLE schools ADD COLUMN platform_username VARCHAR(255)" },
    ];

    for (const col of columns) {
        try {
            await db.query(col.sql);
            console.log(`Added column: ${col.name}`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(`Column already exists: ${col.name}`);
            } else {
                console.error(`Error adding ${col.name}:`, e.message);
            }
        }
    }

    console.log('Migration done');
    process.exit(0);
}

migrate();
