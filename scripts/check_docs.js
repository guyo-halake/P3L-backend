import db from '../src/config/db.js';

async function check() {
    const [cols] = await db.query('DESCRIBE school_documents');
    console.log(cols);
    process.exit(0);
}

check();
