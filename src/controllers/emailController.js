// backend/src/controllers/emailController.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // p3lcodes@gmail.com
    pass: process.env.EMAIL_PASS
  }
});


import path from 'path';
import { fileURLToPath } from 'url';

// Fix __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function sendEmail(req, res) {
  const { to, subject, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: 'Missing recipient or message' });
  }
  try {
    // Resolve absolute path to public/main.png
    // Use the project root public/main.png
    const imagePath = path.resolve(__dirname, '../../../public/main.png');
    await transporter.sendMail({
      from: 'p3lcodes@gmail.com',
      to,
      subject: subject || 'Message from P3L',
      text,
      attachments: [
        {
          filename: 'main.png',
          path: imagePath,
          cid: 'mainimage@p3l'
        }
      ]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('EMAIL SEND ERROR:', err);
    res.status(500).json({ error: 'Failed to send email', details: err && err.message ? err.message : err });
  }
}
