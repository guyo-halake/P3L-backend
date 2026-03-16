// backend/src/routes/email.js
import express from 'express';
import multer from 'multer';
import { sendEmail, getEmailTemplates } from '../controllers/emailController.js';

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 15 * 1024 * 1024, files: 10 }
});

router.get('/templates', getEmailTemplates);
router.post('/send', upload.array('attachments', 10), sendEmail);

export default router;
