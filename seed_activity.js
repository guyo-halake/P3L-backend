// test_activity.js
import db from './src/config/db.js';
import { logActivity } from './src/utils/activityLogger.js';

(async () => {
    try {
        console.log("Checking DB connection...");
        const [rows] = await db.execute('SELECT 1');
        console.log("DB Connected:", rows);

        console.log("Seeding activities...");
        await logActivity('project', 'Project "Omega" created by Admin', { projectId: 101 });
        await logActivity('client', 'New Client "Globex" onboarded', { clientId: 55 });
        await logActivity('message', 'New message from John: "System is down?"', { from: 1 });
        await logActivity('alert', 'High memory usage detected', { metric: '90%' });
        console.log("Done.");
    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await db.end(); // Close pool
        process.exit(0);
    }
})();
