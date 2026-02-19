
import db from './src/config/db.js';

async function addColumn() {
    try {
        // Check if column exists first
        const [cols] = await db.query("SHOW COLUMNS FROM clients LIKE 'type'");
        if (cols.length === 0) {
            console.log('Adding type column to clients table...');
            await db.query("ALTER TABLE clients ADD COLUMN type VARCHAR(50) DEFAULT 'p3l'");
            console.log('Column added.');
        } else {
            console.log('Column already exists.');
        }
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        process.exit();
    }
}

addColumn();
