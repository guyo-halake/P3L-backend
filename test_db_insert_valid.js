import db from './src/config/db.js';

async function testInsert() {
    try {
        console.log('Testing Valid DB Insert...');
        const [result] = await db.execute(
            'INSERT INTO messages (from_user, to_user, message, timestamp, group_id, is_project, project_id, file_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [20, 20, 'test_manual_insert_valid', new Date(), null, 0, null, null]
        );
        console.log('Insert ID:', result.insertId);
        process.exit(0);
    } catch (err) {
        console.error('Insert Failed:', err);
        process.exit(1);
    }
}

testInsert();
