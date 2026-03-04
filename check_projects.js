import pool from './src/config/db.js';

async function checkProjects() {
    try {
        const [rows] = await pool.query('SELECT id, name, vercel_url FROM projects');
        console.log('Projects in DB:');
        rows.forEach(row => {
            console.log(`- ${row.name} (ID: ${row.id}): ${row.vercel_url || 'N/A'}`);
        });
    } catch (err) {
        console.error('Error querying projects:', err);
    } finally {
        process.exit();
    }
}

checkProjects();
