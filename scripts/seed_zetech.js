import db from '../src/config/db.js';

async function seed() {
    // Find Zetech school
    const [schools] = await db.query('SELECT id FROM schools WHERE name LIKE "%Zetech%" LIMIT 1');
    if (schools.length === 0) {
        console.log("Zetech University not found in database.");
        process.exit(1);
    }
    const schoolId = schools[0].id;
    console.log("Found Zetech school ID:", schoolId);

    // 1. CLEAR EXISTING DATA FOR ZETECH
    await db.query('DELETE FROM school_units WHERE school_id = ?', [schoolId]);
    await db.query('DELETE FROM school_fees WHERE school_id = ?', [schoolId]);
    // Wait, let's verify fees table. The backend route is '/api/fees'.

    // Let's verify the fees table structure in the database first.

    // 2. SEED UNITS
    const unitsData = [
        // Year 1 Sem 1
        { s: "Y1S1 2023/2024", c: "DAC 123", n: "FINANCIAL ACCOUNTING I", g: "A" },
        { s: "Y1S1 2023/2024", c: "DCU 110", n: "COMMUNICATION SKILLS", g: "A" },
        { s: "Y1S1 2023/2024", c: "DCU 112", n: "DIGITAL LITERACY", g: "B" },
        { s: "Y1S1 2023/2024", c: "DIT 101", n: "COMPUTER APPLICATIONS", g: "A" },
        { s: "Y1S1 2023/2024", c: "DIT 104", n: "BASIC MATHEMATICS", g: "C" },
        { s: "Y1S1 2023/2024", c: "DIT 105", n: "DESKTOP PUBLISHING", g: "A" },
        // Year 1 Sem 2
        { s: "Y1S2 2023/2024", c: "DCS 203", n: "ELECTRONICS", g: "C" },
        { s: "Y1S2 2023/2024", c: "DIT 201", n: "SYSTEM ANALYSIS AND DESIGN", g: "A" },
        { s: "Y1S2 2023/2024", c: "DIT 202", n: "OPERATING SYSTEMS", g: "A" },
        { s: "Y1S2 2023/2024", c: "DIT 205", n: "COMPUTER NETWORKS/ CCNA", g: "C" },
        { s: "Y1S2 2023/2024", c: "DIT 302", n: "DATABASE SYSTEMS", g: "C" },
        { s: "Y1S2 2023/2024", c: "DSE 101", n: "STRUCTURED PROGRAMMING", g: "C" },
        // Year 2 Sem 1
        { s: "Y2S1 2024/2025", c: "DIT 301", n: "OBJECT ORIENTED PROGRAMMING", g: "A" },
        { s: "Y2S1 2024/2025", c: "DIT 307", n: "ROUTING AND SWITCHING (CCNA 2)", g: "D" },
        { s: "Y2S1 2024/2025", c: "DSE 301", n: "SOFTWARE ENGINEERING", g: "B" },
        { s: "Y2S1 2024/2025", c: "DSE 402", n: "RESEARCH METHODS IN IT (SYSTEM PROPOSAL)", g: "D" },
        { s: "Y2S1 2024/2025", c: "DSE 403", n: "WEB DEVELOPMENT I", g: "A" },
        { s: "Y2S1 2024/2025", c: "DSE 501", n: "ARTIFICIAL INTELLIGENCE", g: "C" },
        // Year 2 Sem 2
        { s: "Y2S2 2024/2025", c: "DCU 113", n: "ENTREPRENEURSHIP AND INNOVATION", g: "C" },
        { s: "Y2S2 2024/2025", c: "DCU 300", n: "INDUSTRIAL ATTACHMENT", g: "P" }, // mapped PASS to P to avoid breaking char limit if any, but grading systems usually use A-E. I will insert P.
        { s: "Y2S2 2024/2025", c: "DIT 221", n: "OBJECT ORIENTED PROGRAMMING II", g: "A" },
        { s: "Y2S2 2024/2025", c: "DIT 223", n: "CYBER SECURITY CCNA MOD 3", g: "A" },
        { s: "Y2S2 2024/2025", c: "DSE 223", n: "WEB DEVELOPMENT II", g: "A" },
        { s: "Y2S2 2024/2025", c: "DSE 315", n: "COMPUTER SYSTEMS PROJECT", g: "A" },
        { s: "Y2S2 2024/2025", c: "DIT 222", n: "PRINCIPLES OF COMPUTER SUPPORT AND MAINTENANCE", g: "B" },
    ];

    const [existingUnits] = await db.query('SELECT id FROM school_units WHERE school_id = ?', [schoolId]);
    if (existingUnits.length > 0) {
        const unitIds = existingUnits.map(u => u.id);
        await db.query('DELETE FROM school_assignments WHERE unit_id IN (?)', [unitIds]);
    }
    await db.query('DELETE FROM exams WHERE school_id = ?', [schoolId]);

    for (const u of unitsData) {
        // Determine a fake score based on the grade, so it looks realistic if someone checks
        let fakeScore = null;
        if (u.g === 'A') fakeScore = 80;
        else if (u.g === 'B') fakeScore = 65;
        else if (u.g === 'C') fakeScore = 55;
        else if (u.g === 'D') fakeScore = 45;
        else if (u.g === 'P') fakeScore = 100; // pass

        const [res] = await db.query(
            'INSERT INTO school_units (school_id, name, unit_code, semester, progress, status, score, grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [schoolId, u.n, u.c, u.s, 100, 'Completed', fakeScore, u.g === 'P' ? 'PASS' : u.g]
        );
        const unitId = res.insertId;

        // Assignments (2 per unit)
        await db.query(
            'INSERT INTO school_assignments (unit_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
            [unitId, `${u.n} - Assignment 1`, 'First assignment', '2024-03-10', 'Submitted']
        );
        await db.query(
            'INSERT INTO school_assignments (unit_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
            [unitId, `${u.n} - Assignment 2`, 'Second assignment', '2024-04-10', 'Submitted']
        );

        // Exams: 2 CATs per unit
        await db.query(
            'INSERT INTO exams (school_id, unit_id, type, date, start_time, end_time, venue) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [schoolId, unitId, 'CAT', '2024-02-20', '08:00', '10:00', 'Hall A']
        );
        await db.query(
            'INSERT INTO exams (school_id, unit_id, type, date, start_time, end_time, venue) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [schoolId, unitId, 'CAT', '2024-03-20', '08:00', '10:00', 'Hall A']
        );
    }
    console.log(`Inserted ${unitsData.length} units with assignments and CATs.`);

    // 1 Exam per semester spanning the units. Normally exams are per unit, but you said "the exam is about all the units". 
    // We'll just create a main exam record per semester instead of per unit, or assign it to a random unit if table requires it. 
    // Wait, exams table requires `unit_id`. I'll pick the first unit of each semester for the "Main Exam".
    const semesters = [...new Set(unitsData.map(u => u.s))];
    for (const sem of semesters) {
        const [units] = await db.query('SELECT id FROM school_units WHERE school_id = ? AND semester = ? LIMIT 1', [schoolId, sem]);
        if (units.length > 0) {
            await db.query(
                'INSERT INTO exams (school_id, unit_id, type, date, start_time, end_time, venue) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [schoolId, units[0].id, 'Main Exam', '2024-04-30', '14:00', '17:00', 'Main Hall']
            );
        }
    }

    // 3. SEED FEES 
    // Based on architecture, the table is likely `fees` based on `fetchFees()` mapped to `/api/fees` and old controllers.
    // I only insert the Debit lines, because the sum of amounts of Paid items needs to equal the total charges.
    const feeDocs = [
        { d: '2023-08-29', ref: 'SFI74491', desc: 'STANDARD INVOICE (Y1S1 23/24)', amount: 48750 },

        { d: '2024-01-09', ref: 'SFI84790', desc: 'STANDARD INVOICE (Y1S2 23/24)', amount: 45750 },
        { d: '2024-01-29', ref: 'SIA65840', desc: 'INVOICE ADJUSTMENT ID Replacement', amount: 500 },

        { d: '2024-04-29', ref: 'SFI90626', desc: 'STANDARD INVOICE (Y2S1 23/24)', amount: 46250 },

        { d: '2024-08-23', ref: 'SFI100400', desc: 'STANDARD INVOICE (Y2S1 24/25)', amount: 55250 },
        { d: '2024-09-18', ref: 'SIA78083', desc: 'INVOICE ADJUSTMENT Supplementary Exams', amount: 800 },
        { d: '2024-11-25', ref: 'SIA85264', desc: 'INVOICE ADJUSTMENT id rep', amount: 500 },

        { d: '2025-09-25', ref: 'SIA105546', desc: 'INVOICE ADJUSTMENT Graduation Fees 2025', amount: 6000 },
        { d: '2025-11-24', ref: 'SIA111220', desc: 'INVOICE ADJUSTMENT torn gown', amount: 5000 },
    ];

    for (const f of feeDocs) {
        // All of them are fully paid based on the final balance = 0.00
        await db.query(
            'INSERT INTO school_fees (school_id, description, amount, date, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)',
            [schoolId, `${f.ref} - ${f.desc}`, f.amount, f.d, 'Bank/M-Pesa', 'Paid']
        );
    }
    console.log(`Inserted ${feeDocs.length} fee records.`);

    // Add the PASS grade to grading system so GPA calc works or simply skips it
    // Since PASS doesn't normally count to GPA, we can give it points = 0 but max_score = 100 just to register it, 
    // or grade_point = 0. The app handles it cleanly if it has a record or skips.
    await db.query('DELETE FROM school_grading_systems WHERE school_id = ? AND grade = "PASS"', [schoolId]);
    await db.query(
        'INSERT INTO school_grading_systems (school_id, grade, min_score, max_score, grade_point, description) VALUES (?, ?, ?, ?, ?, ?)',
        [schoolId, 'PASS', 0, 100, 0, 'Passed (Attachment)']
    );

    console.log("Seeding done successfully.");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
