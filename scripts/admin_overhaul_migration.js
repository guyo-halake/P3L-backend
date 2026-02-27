import db from '../src/config/db.js';

async function migrate() {
    try {
        console.log('Starting permissions and tasks migration...');

        // 1. Add permissions column to users
        try {
            await db.query(`ALTER TABLE users ADD COLUMN permissions JSON DEFAULT NULL`);
            console.log('Added permissions column to users table');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('Permissions column already exists');
            } else {
                throw e;
            }
        }

        // 2. Create tasks table
        await db.query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('Todo', 'Doing', 'Done') DEFAULT 'Todo',
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
        console.log('Created project_tasks table');

        // 3. Set default permissions for existing admin
        const [admins] = await db.query("SELECT id FROM users WHERE user_type = 'full_admin'");
        for (const admin of admins) {
            const defaultPerms = JSON.stringify({
                see_revenue: true,
                allowed_sidebar: ["startup", "projects", "clients", "invoices", "tasks", "team", "vault"],
                see_templates: true
            });
            await db.query("UPDATE users SET permissions = ? WHERE id = ?", [defaultPerms, admin.id]);
        }
        console.log('Set default permissions for admins');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
