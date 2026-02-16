
import db from './src/config/db.js';

async function checkColumns() {
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM users");
        console.log(cols);
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        process.exit();
    }
}

checkColumns();
