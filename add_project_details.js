
import db from './src/config/db.js';

async function addColumns() {
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM projects");
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('tech_stack')) {
            console.log('Adding tech_stack...');
            await db.query("ALTER TABLE projects ADD COLUMN tech_stack JSON DEFAULT NULL");
        }

        if (!colNames.includes('progress')) {
            console.log('Adding progress...');
            await db.query("ALTER TABLE projects ADD COLUMN progress INT DEFAULT 0");
        }

        if (!colNames.includes('next_milestone')) {
            console.log('Adding next_milestone...');
            await db.query("ALTER TABLE projects ADD COLUMN next_milestone VARCHAR(255) DEFAULT NULL");
        }

        if (!colNames.includes('milestone_date')) {
            console.log('Adding milestone_date...');
            await db.query("ALTER TABLE projects ADD COLUMN milestone_date DATE DEFAULT NULL");
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Error adding columns:', err);
    } finally {
        process.exit();
    }
}

addColumns();
