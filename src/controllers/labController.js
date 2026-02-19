import db from '../config/db.js';

// Get all labs
export const getLabs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_labs');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
};

// Get lab by ID
export const getLabById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_labs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lab not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lab' });
  }
};

// Add lab
export const addLab = async (req, res) => {
  try {
    const { unit_id, name, platform, status, score, due_date } = req.body;
    const [result] = await db.query(
      'INSERT INTO school_labs (unit_id, name, platform, status, score, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [unit_id, name, platform, status || 'Not Started', score || 0, due_date]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add lab' });
  }
};

// Update lab
export const updateLab = async (req, res) => {
  try {
    const { unit_id, name, platform, status, score, due_date } = req.body;
    await db.query(
      'UPDATE school_labs SET unit_id=?, name=?, platform=?, status=?, score=?, due_date=? WHERE id=?',
      [unit_id, name, platform, status, score, due_date, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lab' });
  }
};

// Delete lab
export const deleteLab = async (req, res) => {
  try {
    await db.query('DELETE FROM school_labs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lab' });
  }
};
