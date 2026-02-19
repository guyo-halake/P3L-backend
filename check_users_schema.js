
import dotenv from 'dotenv';
dotenv.config();
import db from './src/config/db.js';

async function checkUsersSchema() {
    try {
        console.log('--- Checking Users Table Schema ---');
        const [cols] = await db.query("SHOW COLUMNS FROM users");
        console.log('Columns:', cols.map(c => c.Field).join(', '));
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkUsersSchema();
