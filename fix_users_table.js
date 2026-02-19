
import dotenv from 'dotenv';
dotenv.config();
import db from './src/config/db.js';

async function fixUsersTable() {
    try {
        console.log('--- Fixing Users Table ---');

        // Check for user_type
        try {
            const [cols] = await db.query("SHOW COLUMNS FROM users LIKE 'user_type'");
            if (cols.length === 0) {
                console.log('Adding user_type column...');
                await db.query("ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'client'");
            } else {
                console.log('user_type column exists.');
            }
        } catch (e) {
            console.error('Error checking user_type:', e.message);
        }

        // Check for wallet_balance
        try {
            const [cols] = await db.query("SHOW COLUMNS FROM users LIKE 'wallet_balance'");
            if (cols.length === 0) {
                console.log('Adding wallet_balance column...');
                await db.query("ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(10,2) DEFAULT 0.00");
            } else {
                console.log('wallet_balance column exists.');
            }
        } catch (e) {
            console.error('Error checking wallet_balance:', e.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

fixUsersTable();
