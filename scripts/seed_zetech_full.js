// Seed script for Zetech University with full data
import mysql from 'mysql2/promise';

const config = {
  host: 'interchange.proxy.rlwy.net',
  port: 34104,
  user: 'root',
  password: 'zbTiokKyasobkyQZGAlYTNVbhgTCNsBq',
  database: 'railway',
  multipleStatements: true,
};

async function main() {
  const conn = await mysql.createConnection(config);

  // 1. Insert school
  const [schoolRes] = await conn.query(
    `INSERT INTO schools (name, logo_url, website_url, portal_url, student_email, student_number, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Zetech University',
      'https://brandfetch.com/zetech.ac.ke',
      'https://student.zetech.ac.ke/',
      'https://student.zetech.ac.ke/',
      'guyohalake@zetech.ac.ke',
      'DIT-01-8271/2023',
      '+254 768141129',
      'Graduated'
    ]
  );
  const school_id = schoolRes.insertId;

  // 2. Insert lecturers
  const lecturers = [
    ['Mr Odhiambo'],
    ['Mrs Wanjiku'],
    ['Miss Faith Chebet'],
    ['Mr Daniel'],
    ['Dr Peter'],
    ['Mr Samuel']
  ];
  const lecturerIds = [];
  for (const [name] of lecturers) {
    const [res] = await conn.query('INSERT INTO lecturers (name) VALUES (?)', [name]);
    lecturerIds.push(res.insertId);
  }

  // 3. Insert classrooms
  const classrooms = [
    ['L101'], ['L202'], ['L303'], ['Online']
  ];
  const classroomIds = [];
  for (const [name] of classrooms) {
    const [res] = await conn.query('INSERT INTO classrooms (name) VALUES (?)', [name]);
    classroomIds.push(res.insertId);
  }

  // 4. Insert units (3 sample)
  const units = [
    ['DIT 301', 'OBJECT ORIENTED PROGRAMMING', school_id],
    ['DIT 223', 'CYBER SECURITY CCNA MOD 3', school_id],
    ['DSE 315', 'COMPUTER SYSTEMS PROJECT', school_id]
  ];
  const unitIds = [];
  for (const [code, name, sid] of units) {
    const [res] = await conn.query('INSERT INTO school_units (name, school_id) VALUES (?, ?)', [name, sid]);
    unitIds.push(res.insertId);
  }

  // 5. Insert class times (sample for OOP)
  await conn.query('INSERT INTO class_times (unit_id, lecturer_id, classroom_id, start_time, end_time, day_of_week) VALUES (?, ?, ?, ?, ?, ?)', [unitIds[0], lecturerIds[2], classroomIds[1], '11:00:00', '14:00:00', 'Tuesday']);

  // 6. Insert assignments (one per unit)
  await conn.query('INSERT INTO school_assignments (unit_id, title, due_date, status, description) VALUES (?, ?, ?, ?, ?)', [unitIds[0], 'Assignment 1: Develop a C++ hotel program', '2026-02-16 11:00:00', 'Pending', 'Develop a C++ hotel program']);
  await conn.query('INSERT INTO school_assignments (unit_id, title, due_date, status, description) VALUES (?, ?, ?, ?, ?)', [unitIds[1], 'Assignment 2: NMAP test', '2026-02-16 11:00:00', 'Pending', 'NMAP test']);
  await conn.query('INSERT INTO school_assignments (unit_id, title, due_date, status, description) VALUES (?, ?, ?, ?, ?)', [unitIds[2], 'Assignment 3: Project proposal', '2026-02-16 11:00:00', 'Pending', 'Project proposal']);

  // 7. Insert CATs and Exams for each unit, for 4 semesters
  for (let sem = 1; sem <= 4; sem++) {
    for (let i = 0; i < unitIds.length; i++) {
      // CAT 1
      await conn.query('INSERT INTO exams (unit_id, school_id, date, start_time, end_time, type, venue) VALUES (?, ?, ?, ?, ?, ?, ?)', [unitIds[i], school_id, `2026-02-0${sem} 09:00:00`, '09:00:00', '10:00:00', 'CAT 1', 'L101']);
      // CAT 2
      await conn.query('INSERT INTO exams (unit_id, school_id, date, start_time, end_time, type, venue) VALUES (?, ?, ?, ?, ?, ?, ?)', [unitIds[i], school_id, `2026-02-0${sem} 11:00:00`, '11:00:00', '12:00:00', 'CAT 2', 'L101']);
      // Exam
      await conn.query('INSERT INTO exams (unit_id, school_id, date, start_time, end_time, type, venue) VALUES (?, ?, ?, ?, ?, ?, ?)', [unitIds[i], school_id, `2026-02-1${sem} 14:00:00`, '14:00:00', '16:00:00', 'Exam', 'L202']);
    }
  }

  // 8. Insert sample documents (PDFs)
  const pdfs = [
    'applicationletter.pdf',
    'completionletter.pdf',
    'grad-cert.pdf',
    'Main CV.pdf',
    'Matta AI.pdf',
    'resultslip_DIT-01-8271-2023-1.1.pdf',
    'resultslip_DIT-01-8271-2023-1.2.pdf',
    'resultslip_DIT-01-8271-2023-2.1.pdf',
    'resultslip_DIT-01-8271-2023-2.2.pdf'
  ];
  for (const file of pdfs) {
    await conn.query('INSERT INTO documents (school_id, type, file_url) VALUES (?, ?, ?)', [school_id, 'pdf', `/LocalStorage/Schools/Zetech_as_a_test/${file}`]);
  }

  await conn.end();
  console.log('Zetech University seeded with full data!');
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
