import db from '../config/db.js';

// Get all class times
export const getClassTimes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM class_times');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch class times' });
  }
};

// Get class time by ID
export const getClassTimeById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM class_times WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Class time not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch class time' });
  }
};

// Add class time
export const addClassTime = async (req, res) => {
  try {
    const { unit_id, lecturer_id, classroom_id, start_time, end_time, day_of_week } = req.body;
    const [result] = await db.query(
      'INSERT INTO class_times (unit_id, lecturer_id, classroom_id, start_time, end_time, day_of_week) VALUES (?, ?, ?, ?, ?, ?)',
      [unit_id, lecturer_id, classroom_id, start_time, end_time, day_of_week]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add class time' });
  }
};

// Update class time
export const updateClassTime = async (req, res) => {
  try {
    const { unit_id, lecturer_id, classroom_id, start_time, end_time, day_of_week } = req.body;
    await db.query(
      'UPDATE class_times SET unit_id=?, lecturer_id=?, classroom_id=?, start_time=?, end_time=?, day_of_week=? WHERE id=?',
      [unit_id, lecturer_id, classroom_id, start_time, end_time, day_of_week, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update class time' });
  }
};

// Delete class time
export const deleteClassTime = async (req, res) => {
  try {
    await db.query('DELETE FROM class_times WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete class time' });
  }
};
