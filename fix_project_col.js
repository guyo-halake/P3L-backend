import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

console.log("Checking 'project' column in 'clients' table...");

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        const [cols] = await db.query("SHOW COLUMNS FROM clients LIKE 'project'");
        if (cols.length > 0) {
            const col = cols[0];
            console.log("Current column definition:", col);

            if (col.Type.includes('int')) {
                console.log("Column is INT. Altering to VARCHAR(255)...");
                await db.query("ALTER TABLE clients MODIFY COLUMN project VARCHAR(255)");
                console.log("Column altered successfully.");
            } else {
                console.log("Column type looks correct (not INT). No changes made.");
            }
        } else {
            console.log("Column 'project' not found! This is unexpected.");
        }

        await db.end();
    } catch (err) {
        console.error("Error:", err);
    }
})();
