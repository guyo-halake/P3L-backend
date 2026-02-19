import db from '../config/db.js';

// Get all classrooms
export const getClassrooms = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM classrooms');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
};

// Get classroom by ID
export const getClassroomById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM classrooms WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Classroom not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classroom' });
  }
};

// Add classroom
export const addClassroom = async (req, res) => {
  try {
    const { name, location, capacity } = req.body;
    const [result] = await db.query(
      'INSERT INTO classrooms (name, location, capacity) VALUES (?, ?, ?)',
      [name, location, capacity]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add classroom' });
  }
};

// Update classroom
export const updateClassroom = async (req, res) => {
  try {
    const { name, location, capacity } = req.body;
    await db.query(
      'UPDATE classrooms SET name=?, location=?, capacity=? WHERE id=?',
      [name, location, capacity, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update classroom' });
  }
};

// Delete classroom
export const deleteClassroom = async (req, res) => {
  try {
    await db.query('DELETE FROM classrooms WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete classroom' });
  }
};
