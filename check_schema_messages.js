import db from './src/config/db.js';

async function check() {
    try {
        console.log('--- Messages Table Schema ---');
        const [cols] = await db.execute("DESCRIBE messages");
        console.table(cols);

        console.log('\n--- Users ---');
        const [users] = await db.execute("SELECT id, username FROM users LIMIT 10");
        console.table(users);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
