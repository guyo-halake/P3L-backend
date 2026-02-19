import db from '../config/db.js';

// Get all exams
export const getExams = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM exams');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

// Get exam by ID
export const getExamById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
};

// Add exam
export const addExam = async (req, res) => {
  try {
    const { unit_id, school_id, date, start_time, end_time, type, venue } = req.body;
    const [result] = await db.query(
      'INSERT INTO exams (unit_id, school_id, date, start_time, end_time, type, venue) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [unit_id, school_id, date, start_time, end_time, type, venue]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exam' });
  }
};

// Update exam
export const updateExam = async (req, res) => {
  try {
    const { unit_id, school_id, date, start_time, end_time, type, venue } = req.body;
    await db.query(
      'UPDATE exams SET unit_id=?, school_id=?, date=?, start_time=?, end_time=?, type=?, venue=? WHERE id=?',
      [unit_id, school_id, date, start_time, end_time, type, venue, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update exam' });
  }
};

// Delete exam
export const deleteExam = async (req, res) => {
  try {
    await db.query('DELETE FROM exams WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};
