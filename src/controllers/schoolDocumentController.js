import db from '../config/db.js';
import { getIO } from '../socket.js';

// Get documents by school
export const getDocumentsBySchool = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM school_documents WHERE school_id = ? ORDER BY created_at DESC',
            [req.params.schoolId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};

// Get documents by category
export const getDocumentsByCategory = async (req, res) => {
    try {
        const { schoolId, category } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM school_documents WHERE school_id = ? AND category = ? ORDER BY created_at DESC',
            [schoolId, category]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};

// Add document (supports file upload via multer)
export const addDocument = async (req, res) => {
    try {
        const { school_id, user_id, category, subcategory, title, file_url, file_type, notes } = req.body;

        // If a file was uploaded, use its path
        let finalFileUrl = file_url || '';
        let finalFileType = file_type || '';
        if (req.file) {
            finalFileUrl = `/uploads/school-docs/${req.file.filename}`;
            finalFileType = req.file.mimetype || req.file.originalname.split('.').pop();
        }

        const [result] = await db.query(
            'INSERT INTO school_documents (school_id, user_id, category, subcategory, title, file_url, file_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [school_id, user_id, category, subcategory, title, finalFileUrl, finalFileType, notes]
        );
        const io = getIO();
        io && io.emit('school_document_added', { id: result.insertId, school_id, category });
        res.status(201).json({ id: result.insertId, file_url: finalFileUrl });
    } catch (err) {
        console.error('Failed to add document:', err);
        res.status(500).json({ error: 'Failed to add document' });
    }
};

// Update document
export const updateDocument = async (req, res) => {
    try {
        const { category, subcategory, title, file_url, file_type, notes } = req.body;
        await db.query(
            'UPDATE school_documents SET category=?, subcategory=?, title=?, file_url=?, file_type=?, notes=? WHERE id=?',
            [category, subcategory, title, file_url, file_type, notes, req.params.id]
        );
        const io = getIO();
        io && io.emit('school_document_updated', { id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update document' });
    }
};

// Delete document
export const deleteDocument = async (req, res) => {
    try {
        await db.query('DELETE FROM school_documents WHERE id = ?', [req.params.id]);
        const io = getIO();
        io && io.emit('school_document_deleted', { id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
