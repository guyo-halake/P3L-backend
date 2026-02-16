import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    multipleStatements: true,
  });
  // Seed 4 semesters of fees for Zetech University (school_id = 1 assumed)
  const sql = `
    INSERT INTO school_fees (school_id, date, description, amount, status, payment_method) VALUES
      (1, '2026-01-10', 'Semester 1 Fees', 56000, 'Paid', 'Bank Transfer'),
      (1, '2026-05-10', 'Semester 2 Fees', 56000, 'Paid', 'Bank Transfer'),
      (1, '2026-09-10', 'Semester 3 Fees', 56000, 'Pending', NULL),
      (1, '2027-01-10', 'Semester 4 Fees', 56000, 'Pending', NULL);
  `;
  await conn.query(sql);
  await conn.end();
  console.log('Seeded 4 semesters of fees for Zetech University.');
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
