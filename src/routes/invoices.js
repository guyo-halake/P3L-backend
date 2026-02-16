import express from 'express';
import { getInvoicesByClientId, createInvoice, updateInvoiceStatus, deleteInvoice } from '../controllers/invoiceController.js';

import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const router = express.Router();

router.get('/client/:clientId', getInvoicesByClientId);
router.post('/', upload.single('file'), createInvoice);
router.put('/:id/status', updateInvoiceStatus);
router.delete('/:id', deleteInvoice);

export default router;
