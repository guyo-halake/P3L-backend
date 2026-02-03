
import db from './src/config/db.js';

async function checkSchema() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM users");
        console.log('Columns in users table:');
        rows.forEach(r => console.log(`- ${r.Field}: ${r.Type}`));

        // Check if github_token exists
        const tokenCol = rows.find(r => r.Field === 'github_token');
        if (tokenCol) {
            console.log('\nCONFIRMED: github_token column exists.');
        } else {
            console.log('\nWARNING: github_token column MISSING.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
