import db from '../config/db.js';

// Get all assignments
export const getAssignments = async (req, res) => {
  try {
    // Join with school_units to get school_id for each assignment
    const [rows] = await db.query(`
      SELECT a.*, u.school_id
      FROM school_assignments a
      JOIN school_units u ON a.unit_id = u.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

// Get assignment by ID
export const getAssignmentById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_assignments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
};

// Add assignment
export const addAssignment = async (req, res) => {
  try {
    const { unit_id, title, due_date, status, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO school_assignments (unit_id, title, due_date, status, description) VALUES (?, ?, ?, ?, ?)',
      [unit_id, title, due_date, status || 'Pending', description]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add assignment' });
  }
};

// Update assignment
export const updateAssignment = async (req, res) => {
  try {
    const { unit_id, title, due_date, status, description } = req.body;
    await db.query(
      'UPDATE school_assignments SET unit_id=?, title=?, due_date=?, status=?, description=? WHERE id=?',
      [unit_id, title, due_date, status, description, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update assignment' });
  }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
  try {
    await db.query('DELETE FROM school_assignments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
};
