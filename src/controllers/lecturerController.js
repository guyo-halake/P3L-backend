import db from '../config/db.js';

// Get all lecturers
export const getLecturers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lecturers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lecturers' });
  }
};

// Get lecturer by ID
export const getLecturerById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lecturers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lecturer not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lecturer' });
  }
};

// Add lecturer
export const addLecturer = async (req, res) => {
  try {
    const { name, email, phone, department } = req.body;
    const [result] = await db.query(
      'INSERT INTO lecturers (name, email, phone, department) VALUES (?, ?, ?, ?)',
      [name, email, phone, department]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add lecturer' });
  }
};

// Update lecturer
export const updateLecturer = async (req, res) => {
  try {
    const { name, email, phone, department } = req.body;
    await db.query(
      'UPDATE lecturers SET name=?, email=?, phone=?, department=? WHERE id=?',
      [name, email, phone, department, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lecturer' });
  }
};

// Delete lecturer
export const deleteLecturer = async (req, res) => {
  try {
    await db.query('DELETE FROM lecturers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lecturer' });
  }
};
