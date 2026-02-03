
import db from './src/config/db.js';

async function addColumn() {
    try {
        // Check if column exists first
        const [cols] = await db.query("SHOW COLUMNS FROM users LIKE 'must_change_password'");
        if (cols.length === 0) {
            console.log('Adding must_change_password column...');
            await db.query("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE");
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
