import db from './src/config/db.js';

async function check() {
    try {
        const [cols] = await db.execute("SHOW COLUMNS FROM messages LIKE 'to_user'");
        console.log('to_user schema:', cols);

        const [users] = await db.execute("SELECT id FROM users LIMIT 1");
        console.log('Valid User ID:', users[0]?.id);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
