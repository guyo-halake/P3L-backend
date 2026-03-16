import db from './src/config/db.js';

async function verify() {
    try {
        console.log("Checking projects table...");
        const [pRows] = await db.execute('DESCRIBE projects');
        const isPinnedInProjects = pRows.some(row => row.Field === 'is_pinned');
        console.log("is_pinned in projects:", isPinnedInProjects);

        console.log("Checking clients table...");
        const [cRows] = await db.execute('DESCRIBE clients');
        const isPinnedInClients = cRows.some(row => row.Field === 'is_pinned');
        console.log("is_pinned in clients:", isPinnedInClients);

        if (!isPinnedInProjects) {
            console.log("Adding is_pinned to projects...");
            await db.execute('ALTER TABLE projects ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE');
            console.log("Added to projects.");
        }

        if (!isPinnedInClients) {
            console.log("Adding is_pinned to clients...");
            await db.execute('ALTER TABLE clients ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE');
            console.log("Added to clients.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Error during verification:", err);
        process.exit(1);
    }
}

verify();
