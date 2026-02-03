import db from './src/config/db.js';

async function check() {
    try {
        const [rows] = await db.execute('SELECT id, username, email, github_token FROM users');
        console.log('USERS_START');
        rows.forEach(u => {
            const hasToken = !!u.github_token && u.github_token.length > 0;
            console.log(`User ${u.id} (${u.username}): ${hasToken ? 'HAS_TOKEN' : 'NO_TOKEN'}`);
        });
        console.log('USERS_END');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
