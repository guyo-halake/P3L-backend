import db from '../config/db.js';
import { getIO } from '../socket.js';

// Get all documents
export const getDocuments = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM documents');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

// Get document by ID
export const getDocumentById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

// Add document
export const addDocument = async (req, res) => {
  try {
    const { school_id, unit_id, type, file_url, title } = req.body;
    const [result] = await db.query(
      'INSERT INTO documents (school_id, unit_id, type, file_url, title) VALUES (?, ?, ?, ?, ?)',
      [school_id, unit_id, type, file_url, title]
    );
    const io = getIO();
    io && io.emit('academic_document_added', { id: result.insertId, school_id, unit_id, type, file_url, title });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add document' });
  }
};

// Update document
export const updateDocument = async (req, res) => {
  try {
    const { school_id, unit_id, type, file_url, title } = req.body;
    await db.query(
      'UPDATE documents SET school_id=?, unit_id=?, type=?, file_url=?, title=? WHERE id=?',
      [school_id, unit_id, type, file_url, title, req.params.id]
    );
    const io = getIO();
    io && io.emit('academic_document_updated', { id: req.params.id, school_id, unit_id, type, file_url, title });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document' });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    await db.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    const io = getIO();
    io && io.emit('academic_document_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
};
