
import db from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const [rows] = await db.execute('DESCRIBE clients_projects');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
