import db from './src/config/db.js';

async function testUpdate() {
    try {
        const [projects] = await db.execute('SELECT id, name, is_pinned FROM projects LIMIT 1');
        if (projects.length === 0) {
            console.log("No projects to test with.");
            process.exit(0);
        }
        const p = projects[0];
        console.log(`Testing project: ${p.name} (ID: ${p.id}), current is_pinned: ${p.is_pinned}`);

        const newVal = p.is_pinned ? 0 : 1;
        console.log(`Updating to: ${newVal}`);

        await db.execute('UPDATE projects SET is_pinned = ? WHERE id = ?', [newVal, p.id]);

        const [updated] = await db.execute('SELECT is_pinned FROM projects WHERE id = ?', [p.id]);
        console.log(`Updated is_pinned: ${updated[0].is_pinned}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testUpdate();
