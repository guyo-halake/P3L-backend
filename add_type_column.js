
import db from './src/config/db.js';

async function addColumn() {
    try {
        // Check if column exists first
        const [cols] = await db.query("SHOW COLUMNS FROM projects LIKE 'type'");
        if (cols.length === 0) {
            console.log('Adding type column to projects...');
            // Default to 'Web App' for existing projects if needed, or NULL.
            // Using a safe default.
            await db.query("ALTER TABLE projects ADD COLUMN type VARCHAR(50) DEFAULT 'Web App'");
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
