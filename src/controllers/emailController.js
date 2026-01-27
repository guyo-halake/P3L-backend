// backend/src/controllers/emailController.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // p3lcodes@gmail.com
    pass: process.env.EMAIL_PASS
  }
});

export async function sendEmail(req, res) {
  const { to, subject, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: 'Missing recipient or message' });
  }
  try {
    await transporter.sendMail({
      from: 'p3lcodes@gmail.com',
      to,
      subject: subject || 'Message from P3L',
      text
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
}
