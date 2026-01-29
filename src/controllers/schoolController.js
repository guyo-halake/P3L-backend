
import db from '../config/db.js';
import { getIO } from '../socket.js';

// Get all schools
export const getSchools = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM schools');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

// Get single school by ID
export const getSchoolById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'School not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch school' });
  }
};

// Add a new school
export const addSchool = async (req, res) => {
  try {
    const { name, logo_url, website_url, portal_url, student_email, student_number, phone, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO schools (name, logo_url, website_url, portal_url, student_email, student_number, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, logo_url, website_url, portal_url, student_email, student_number, phone, status || 'Active']
    );
    // Emit real-time event
    const io = getIO();
    io && io.emit('school_added', { id: result.insertId, name, logo_url, website_url, portal_url, student_email, student_number, phone, status: status || 'Active' });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add school' });
  }
};

// Update a school
export const updateSchool = async (req, res) => {
  try {
    const { name, logo_url, website_url, portal_url, student_email, student_number, phone, status } = req.body;
    await db.query(
      'UPDATE schools SET name=?, logo_url=?, website_url=?, portal_url=?, student_email=?, student_number=?, phone=?, status=? WHERE id=?',
      [name, logo_url, website_url, portal_url, student_email, student_number, phone, status, req.params.id]
    );
    // Emit real-time event
    const io = getIO();
    io && io.emit('school_updated', { id: req.params.id, name, logo_url, website_url, portal_url, student_email, student_number, phone, status });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update school' });
  }
};

// Delete a school
export const deleteSchool = async (req, res) => {
  try {
    await db.query('DELETE FROM schools WHERE id = ?', [req.params.id]);
    // Emit real-time event
    const io = getIO();
    io && io.emit('school_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete school' });
  }
};
