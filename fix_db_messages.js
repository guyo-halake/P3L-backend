import db from './src/config/db.js';

async function migrate() {
    try {
        console.log('Checking messages table schema...');

        // Check if columns exist
        const [rows] = await db.execute("SHOW COLUMNS FROM messages LIKE 'is_project'");
        if (rows.length === 0) {
            console.log('Adding is_project column...');
            await db.execute("ALTER TABLE messages ADD COLUMN is_project BOOLEAN DEFAULT FALSE");
        } else {
            console.log('is_project column already exists.');
        }

        const [rows2] = await db.execute("SHOW COLUMNS FROM messages LIKE 'project_id'");
        if (rows2.length === 0) {
            console.log('Adding project_id column...');
            await db.execute("ALTER TABLE messages ADD COLUMN project_id INT NULL");
        } else {
            console.log('project_id column already exists.');
        }

        const [rows3] = await db.execute("SHOW COLUMNS FROM messages LIKE 'file_url'");
        if (rows3.length === 0) {
            console.log('Adding file_url column...');
            await db.execute("ALTER TABLE messages ADD COLUMN file_url TEXT NULL");
        } else {
            console.log('file_url column already exists.');
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
