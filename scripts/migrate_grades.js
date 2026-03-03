import dotenv from 'dotenv';
dotenv.config();
import db from '../src/config/db.js';

async function migrate() {
    const queries = [
        // Add semester to school_units
        { name: 'units.semester', sql: "ALTER TABLE school_units ADD COLUMN semester VARCHAR(64)" },
        // Add unit_code
        { name: 'units.unit_code', sql: "ALTER TABLE school_units ADD COLUMN unit_code VARCHAR(32)" },
        // Add score (numeric 0-100)
        { name: 'units.score', sql: "ALTER TABLE school_units ADD COLUMN score DECIMAL(5,2)" },
        // Add grade (A, B, C, D, E, I, *, #, -)
        { name: 'units.grade', sql: "ALTER TABLE school_units ADD COLUMN grade VARCHAR(8)" },

        // Grading systems table per school
        {
            name: 'school_grading_systems', sql: `
      CREATE TABLE IF NOT EXISTS school_grading_systems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        grade VARCHAR(8) NOT NULL,
        min_score DECIMAL(5,2) NOT NULL,
        max_score DECIMAL(5,2) NOT NULL,
        grade_point DECIMAL(3,1) NOT NULL,
        description VARCHAR(64),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      )
    `},
    ];

    for (const q of queries) {
        try {
            await db.query(q.sql);
            console.log(`Done: ${q.name}`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(`Already exists: ${q.name}`);
            } else {
                console.error(`Error (${q.name}):`, e.message);
            }
        }
    }

    // Seed default grading system for existing schools
    const [schools] = await db.query('SELECT id FROM schools');
    for (const school of schools) {
        const [existing] = await db.query('SELECT id FROM school_grading_systems WHERE school_id = ?', [school.id]);
        if (existing.length === 0) {
            const grades = [
                { grade: 'A', min: 70, max: 100, gp: 4.0, desc: 'Distinction' },
                { grade: 'B', min: 60, max: 69, gp: 3.0, desc: 'Credit One' },
                { grade: 'C', min: 50, max: 59, gp: 2.0, desc: 'Credit Two' },
                { grade: 'D', min: 40, max: 49, gp: 1.0, desc: 'Pass' },
                { grade: 'E', min: 0, max: 39, gp: 0.0, desc: 'Fail' },
            ];
            for (const g of grades) {
                await db.query(
                    'INSERT INTO school_grading_systems (school_id, grade, min_score, max_score, grade_point, description) VALUES (?, ?, ?, ?, ?, ?)',
                    [school.id, g.grade, g.min, g.max, g.gp, g.desc]
                );
            }
            console.log(`Seeded grading system for school ${school.id}`);
        }
    }

    console.log('Migration complete');
    process.exit(0);
}

migrate();
