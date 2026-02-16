import db from '../config/db.js';

// Get all reports
export const getReports = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_reports');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Get report by ID
export const getReportById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_reports WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// Add report
export const addReport = async (req, res) => {
  try {
    const { school_id, type, date, gpa, grade_summary, file_url } = req.body;
    const [result] = await db.query(
      'INSERT INTO school_reports (school_id, type, date, gpa, grade_summary, file_url) VALUES (?, ?, ?, ?, ?, ?)',
      [school_id, type, date, gpa, grade_summary, file_url]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add report' });
  }
};

// Update report
export const updateReport = async (req, res) => {
  try {
    const { school_id, type, date, gpa, grade_summary, file_url } = req.body;
    await db.query(
      'UPDATE school_reports SET school_id=?, type=?, date=?, gpa=?, grade_summary=?, file_url=? WHERE id=?',
      [school_id, type, date, gpa, grade_summary, file_url, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report' });
  }
};

// Delete report
export const deleteReport = async (req, res) => {
  try {
    await db.query('DELETE FROM school_reports WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
};
