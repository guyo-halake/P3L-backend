import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

const getMailer = () => {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  // If host is provided, use explicit SMTP config; otherwise default to Gmail service.
  transporter = smtpHost
    ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    })
    : nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });

  return transporter;
};

export const sendOnboardingEmail = async (clientName, clientEmail, projectName = null) => {
  const mailer = getMailer();
  if (!mailer) {
    console.warn("SMTP credentials are missing. Email sending skipped.");
    return { success: false, error: "Missing SMTP credentials" };
  }

  try {
    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || `P3L Developers <${process.env.EMAIL_USER || 'no-reply@p3ldevelopers.com'}>`;
    const replyTo = process.env.EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO || undefined;
    const projectLine = projectName
      ? `Your account has been created and project <span class="highlight">${projectName}</span> will be under development shortly.`
      : `Your account has been created and your project will be under development shortly.`;
    const textProjectLine = projectName
      ? `Your account has been created and project "${projectName}" will be under development shortly.`
      : `Your account has been created and your project will be under development shortly.`;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; color: #3f3f46; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); }
            .header { background-color: #0f0f0f; padding: 40px; text-align: center; }
            .header h1 { color: #f97316; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
            .header p { color: #a1a1aa; margin: 8px 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
            .content { padding: 50px 40px; font-size: 16px; line-height: 1.8; }
            .content p { margin: 0 0 20px 0; }
            .highlight { color: #000; font-weight: 700; }
            .address-block { margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; font-size: 13px; color: #71717a; line-height: 1.8; }
            .address-block strong { color: #18181b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>P3L Developers</h1>
              <p>Welcome to the team</p>
            </div>
            <div class="content">
              <p>Hey <span class="highlight">${clientName}</span>,</p>
              <p>Welcome to P3L. ${projectLine} We're excited to have you on board.</p>
              <div class="address-block">
                <strong>Admin</strong><br>
                P3L Developers, Matta Tech.<br>
                Nairobi, Kenya.
              </div>
            </div>
          </div>
        </body>
        </html>
        `;

    const payload = {
      from: fromEmail,
      to: clientEmail,
      subject: 'Welcome to P3L Developers — Your Project Portal is Ready',
      html: htmlContent,
      text: `Welcome To P3L Developers\n\nHey ${clientName}, Welcome to P3L. ${textProjectLine} We're excited to have you on board.\n\nAdmin\nP3L Developers, Matta Tech.\nNairobi, Kenya.`
    };
    if (replyTo) payload.replyTo = replyTo;

    const info = await mailer.sendMail(payload);
    console.log("Email sent successfully:", info?.messageId || info?.response || 'ok');
    return { success: true, data: info };
  } catch (error) {
    console.error("Failed to send email:", error?.message || error);
    return { success: false, error: error?.message || "Unknown email error" };
  }
};

export const sendTesterInviteEmail = async (testerEmail, inviteLink, adminName) => {
  const mailer = getMailer();
  if (!mailer) {
    console.warn("SMTP credentials are missing. Email skipped.");
    return { success: false, error: "Missing SMTP credentials" };
  }

  try {
    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || `P3L Developers <${process.env.EMAIL_USER || 'no-reply@p3ldevelopers.com'}>`;
    const replyTo = process.env.EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO || undefined;
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #18181b; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #09090b; border: 1px solid #3f3f46; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5); }
            .header { background-color: #09090b; padding: 40px; text-align: center; border-bottom: 1px solid #27272a;}
            .header h1 { color: #facc15; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
            .content { padding: 40px; color: #a1a1aa; font-size: 16px; line-height: 1.6; }
            .button { display: inline-block; background-color: #facc15; color: #000; font-weight: 800; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; text-align: center; margin-top: 20px;}
            .highlight { color: #fff; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to P3L Developers</h1>
            </div>
            <div class="content">
              <p>You have been invited by <span class="highlight">${adminName || 'an Administrator'}</span> to the P3L OS as a Test user.</p>
              <p>Click on the following link to complete your account creation and access your designated testing environments.</p>
              
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Complete Setup</a>
              </div>
            </div>
          </div>
        </body>
        </html>
        `;

    const payload = {
      from: fromEmail,
      to: testerEmail,
      subject: 'Welcome to P3L Developers — Tester Invitation',
      html: htmlContent
    };
    if (replyTo) payload.replyTo = replyTo;

    const info = await mailer.sendMail(payload);
    if (!info) {
      return { success: false, error: 'SMTP did not return a send result' };
    }
    return { success: true, data: info };
  } catch (error) {
    console.error("Failed to send invite email:", error?.message || error);
    return { success: false, error: error?.message || 'Unknown invite email error' };
  }
};
