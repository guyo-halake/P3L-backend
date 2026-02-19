import db from '../config/db.js';

// Get all fees
export const getFees = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_fees');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
};

// Get fee by ID
export const getFeeById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_fees WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Fee not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fee' });
  }
};

// Add fee
export const addFee = async (req, res) => {
  try {
    const { school_id, date, description, amount, status, payment_method, receipt_url } = req.body;
    const [result] = await db.query(
      'INSERT INTO school_fees (school_id, date, description, amount, status, payment_method, receipt_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [school_id, date, description, amount, status || 'Pending', payment_method, receipt_url]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add fee' });
  }
};

// Update fee
export const updateFee = async (req, res) => {
  try {
    const { school_id, date, description, amount, status, payment_method, receipt_url } = req.body;
    await db.query(
      'UPDATE school_fees SET school_id=?, date=?, description=?, amount=?, status=?, payment_method=?, receipt_url=? WHERE id=?',
      [school_id, date, description, amount, status, payment_method, receipt_url, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fee' });
  }
};

// Delete fee
export const deleteFee = async (req, res) => {
  try {
    await db.query('DELETE FROM school_fees WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete fee' });
  }
};
