import pool from './src/config/db.js';

async function updateCocktailProject() {
    try {
        const vercelUrl = 'https://cocktails-manager-gray.vercel.app';
        const name = 'Cocktail Manager';

        // Check if it exists
        const [rows] = await pool.query('SELECT id FROM projects WHERE name LIKE ?', ['%Cocktail%']);

        if (rows.length > 0) {
            const id = rows[0].id;
            await pool.query('UPDATE projects SET vercel_url = ?, name = ? WHERE id = ?', [vercelUrl, name, id]);
            console.log(`Updated project ID ${id} with URL: ${vercelUrl}`);
        } else {
            // Create new
            const [result] = await pool.query('INSERT INTO projects (name, vercel_url, status) VALUES (?, ?, ?)', [name, vercelUrl, 'Active']);
            console.log(`Created new project ID ${result.insertId} with URL: ${vercelUrl}`);
        }
    } catch (err) {
        console.error('Error updating project:', err);
    } finally {
        process.exit();
    }
}

updateCocktailProject();
