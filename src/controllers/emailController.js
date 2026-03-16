// backend/src/controllers/emailController.js
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { logActivity } from '../utils/activityLogger.js';

// Gmail App Password transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'p3lcodes@gmail.com',
    pass: process.env.EMAIL_PASS || 'rhix vnmi pxnm ufsv'
  },
  pool: true,
  maxConnections: 5,
  rateLimit: true
});

// Verify on startup
transporter.verify((err) => {
  if (err) {
    console.error('[EMAIL] SMTP connection failed:', err.message);
  } else {
    console.log('[EMAIL] SMTP ready via Gmail');
  }
});

/**
 * Wraps plain text in a clean HTML email body for better deliverability
 * and inbox rendering.
 */
function buildHtml(text, subject = '') {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f0f0f;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:2px;">P3L DEVELOPERS</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#333333;font-size:15px;line-height:1.7;">
              ${escaped}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f9f9f9;border-top:1px solid #eeeeee;color:#999999;font-size:12px;">
              <div style="color:#444444;font-size:12px;line-height:1.6;">
                Regards,<br/>
                <strong>Admin</strong><br/>
                P3L Developer<br/>
                <a href="https://www.p3lcodes.vercel.app" style="color:#ea580c;text-decoration:none;">www.p3lcodes.vercel.app</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const sendMailInternal = async ({ to, subject, text, html, replyTo, attachments = [] }) => {
  const fromEmail = process.env.EMAIL_USER || 'p3lcodes@gmail.com';

  const info = await transporter.sendMail({
    from: `"P3L Developers" <${fromEmail}>`,
    replyTo: replyTo || fromEmail,
    to,
    subject: subject || 'Message from P3L Developers',
    text: text || '',
    html: html || buildHtml(text || '', subject || ''),
    attachments
  });

  console.log('[EMAIL] Sent OK. MessageId:', info.messageId, '→', to);
  return info;
};

export async function getEmailTemplates(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'backend', 'mock_templates.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('[EMAIL] TEMPLATE LOAD ERROR:', err);
    res.status(500).json({ error: 'Failed to load templates' });
  }
}

export async function sendEmail(req, res) {
  const { to, from, subject, text, html } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: 'Missing recipient or message' });
  }
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const attachments = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

    const info = await sendMailInternal({ to, subject, text, html, replyTo: from, attachments });

    const user = req.user ? req.user.username : 'System';
    logActivity('email', `Email sent to ${to} by ${user}`, {
      subject,
      user,
      attachments: attachments.map((a) => a.filename)
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      attachments: attachments.map((a) => a.filename)
    });
  } catch (err) {
    console.error('[EMAIL] SEND ERROR:', err);
    res.status(500).json({
      error: 'Failed to send email',
      details: err && err.message ? err.message : String(err)
    });
  }
}

export async function notifyAdminNewProject(project) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'p3lcodes@gmail.com';
    const subject = `New Project Created: ${project.name}`;
    const text = `A new project has been created!\n\nName: ${project.name}\nClient: ${project.client_id || 'N/A'}\nDescription: ${project.description || 'No description'}\nStatus: ${project.status}\n\nGitHub: ${project.github_repo || 'None'}\nVercel: ${project.vercel_url || 'None'}\n\nTime: ${new Date().toLocaleString()}`;

    await sendMailInternal({ to: adminEmail, subject, text });
    await logActivity('email', `Admin notified of new project: ${project.name}`, { project_id: project.id, type: 'notification' });
  } catch (err) {
    console.error('[EMAIL] Admin notification failed:', err);
  }
}
