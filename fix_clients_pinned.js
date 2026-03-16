
import db from './src/config/db.js';

async function fix() {
    try {
        const [columns] = await db.execute('SHOW COLUMNS FROM clients LIKE "is_pinned"');
        if (columns.length === 0) {
            console.log('Adding is_pinned column to clients table...');
            await db.execute('ALTER TABLE clients ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE');
            console.log('Column added successfully.');
        } else {
            console.log('is_pinned column already exists.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error adding column:', err);
        process.exit(1);
    }
}

fix();
