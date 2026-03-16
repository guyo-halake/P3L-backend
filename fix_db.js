
import db from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const [rows] = await db.execute('DESCRIBE projects');
        const hasBudget = rows.some(r => r.Field === 'budget');
        if (!hasBudget) {
            await db.execute('ALTER TABLE projects ADD COLUMN budget DECIMAL(15,2) NULL');
            console.log("Added budget column to projects table");
        } else {
            console.log("Budget column already exists");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
