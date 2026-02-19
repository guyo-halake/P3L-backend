
import db from './src/config/db.js';

async function updateEnum() {
    try {
        console.log('Updating user_type enum...');
        // Modify the column to include 'client' and 'user' in addition to 'full_admin' and 'dev'
        await db.query("ALTER TABLE users MODIFY COLUMN user_type ENUM('full_admin', 'dev', 'client', 'user') NOT NULL DEFAULT 'dev'");
        console.log('Enum updated successfully.');
    } catch (err) {
        console.error('Error updating enum:', err);
    } finally {
        process.exit();
    }
}

updateEnum();
