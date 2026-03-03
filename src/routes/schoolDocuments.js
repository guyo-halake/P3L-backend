import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    getDocumentsBySchool,
    getDocumentsByCategory,
    addDocument,
    updateDocument,
    deleteDocument
} from '../controllers/schoolDocumentController.js';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads/school-docs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `doc-${unique}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

const router = Router();

router.get('/school/:schoolId', getDocumentsBySchool);
router.get('/school/:schoolId/:category', getDocumentsByCategory);
router.post('/', upload.single('file'), addDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
