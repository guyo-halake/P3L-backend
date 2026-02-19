import db from '../config/db.js';

// Get all units
export const getUnits = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_units');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch units' });
  }
};

// Get unit by ID
export const getUnitById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_units WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Unit not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
};

// Add unit
export const addUnit = async (req, res) => {
  try {
    const { school_id, name, lecturer, schedule, progress, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO school_units (school_id, name, lecturer, schedule, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
      [school_id, name, lecturer, schedule, progress || 0, status || 'Active']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add unit' });
  }
};

// Update unit
export const updateUnit = async (req, res) => {
  try {
    const { school_id, name, lecturer, schedule, progress, status } = req.body;
    await db.query(
      'UPDATE school_units SET school_id=?, name=?, lecturer=?, schedule=?, progress=?, status=? WHERE id=?',
      [school_id, name, lecturer, schedule, progress, status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update unit' });
  }
};

// Delete unit
export const deleteUnit = async (req, res) => {
  try {
    await db.query('DELETE FROM school_units WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
};
