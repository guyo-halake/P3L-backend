
import dotenv from 'dotenv';
dotenv.config();
import db from './src/config/db.js';

async function updateSchema() {
    try {
        console.log('--- Updating Chat Schema ---');

        // 1. Add is_pinned to messages
        try {
            const [cols] = await db.query("SHOW COLUMNS FROM messages LIKE 'is_pinned'");
            if (cols.length === 0) {
                console.log('Adding is_pinned to messages...');
                await db.query("ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE");
            } else { console.log('is_pinned exists.'); }
        } catch (e) { console.error(e.message); }

        // 2. Add is_email_sent to messages (for tracking email status)
        try {
            const [cols] = await db.query("SHOW COLUMNS FROM messages LIKE 'is_email_sent'");
            if (cols.length === 0) {
                console.log('Adding is_email_sent to messages...');
                await db.query("ALTER TABLE messages ADD COLUMN is_email_sent BOOLEAN DEFAULT FALSE");
            } else { console.log('is_email_sent exists.'); }
        } catch (e) { console.error(e.message); }

        // 3. Create message_reactions table
        console.log('Checking message_reactions table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS message_reactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id INT NOT NULL,
                user_id INT NOT NULL,
                emoji VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
        `);

        // 4. Create scheduled_messages table
        console.log('Checking scheduled_messages table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                from_user INT NOT NULL,
                to_user INT NOT NULL,
                group_id INT NULL,
                message TEXT NOT NULL,
                scheduled_time DATETIME NOT NULL,
                status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('--- Schema Update Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Fatal Schema Update Error:', err);
        process.exit(1);
    }
}

updateSchema();
