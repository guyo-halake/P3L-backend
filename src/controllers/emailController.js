// backend/src/controllers/emailController.js
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { logActivity } from '../utils/activityLogger.js';

// Fix __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // p3lcodes@gmail.com
    pass: process.env.EMAIL_PASS
  }
});

export const sendMailInternal = async ({ to, subject, text, html }) => {
  const imagePath = path.resolve(__dirname, '../../../public/main.png');
  return transporter.sendMail({
    from: 'P3L Admin <p3lcodes@gmail.com>',
    to,
    subject: subject || 'Message from P3L',
    text,
    html,
    attachments: [
      {
        filename: 'main.png',
        path: imagePath,
        cid: 'mainimage@p3l'
      }
    ]
  });
};

export async function sendEmail(req, res) {
  const { to, subject, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: 'Missing recipient or message' });
  }
  try {
    await sendMailInternal({ to, subject, text });

    // Log Activity
    const user = req.user ? req.user.username : 'System';
    logActivity('email', `Email sent to ${to} by ${user}`, { subject, user });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('EMAIL SEND ERROR:', err);
    res.status(500).json({ error: 'Failed to send email', details: err && err.message ? err.message : err });
  }
}

export async function notifyAdminNewProject(project) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'p3lcodes@gmail.com';
    const subject = `New Project Created: ${project.name}`;
    const text = `
      A new project has been created!
      
      Name: ${project.name}
      Client: ${project.client_id || 'N/A'}
      Description: ${project.description || 'No description'}
      Status: ${project.status}
      
      GitHub: ${project.github_repo || 'None'}
      Vercel: ${project.vercel_url || 'None'}
      
      Time: ${new Date().toLocaleString()}
    `;

    await sendMailInternal({ to: adminEmail, subject, text });
    await logActivity('email', `Admin notified of new project: ${project.name}`, { project_id: project.id, type: 'notification' });
    console.log(`Notification sent to admin: ${adminEmail} for project ${project.name}`);
  } catch (err) {
    console.error("Failed to send admin notification:", err);
    // Don't throw, just log
  }
}
