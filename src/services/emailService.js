import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOnboardingEmail = async (clientName, clientEmail) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is missing. Email sending skipped.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background-color: #09090b; padding: 40px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
            .content { padding: 40px; color: #3f3f46; font-size: 16px; line-height: 1.6; }
            .content p { margin: 0 0 20px 0; }
            .highlight { color: #09090b; font-weight: 600; }
            .box { background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
            .box-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a1a1aa; margin: 0 0 10px 0; }
            .box-value { font-family: monospace; font-size: 14px; color: #09090b; margin: 0 0 10px 0; word-break: break-all; }
            .button { display: inline-block; background-color: #facc15; color: #422006; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; text-align: center; }
            .footer { background-color: #fafafa; padding: 24px 40px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #f4f4f5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to P3L OS</h1>
            </div>
            <div class="content">
              <p>Hi <span class="highlight">${clientName}</span>,</p>
              <p>We’re excited to have you on board. Your secure client portal has been successfully provisioned by the P3L Development Team.</p>
              <p>From your live dashboard, you can track real-time project progress, review invoices, raise issues, and communicate directly with our engineers.</p>
              
              <div class="box">
                <p class="box-title">Access Endpoint</p>
                <p class="box-value">${appUrl}</p>
                <p class="box-title">Authentication Email</p>
                <p class="box-value">${clientEmail}</p>
                <p style="font-size: 12px; color: #71717a; margin-top: 10px;">* Use the link below to initialize your secure connection. An administrator may provide a temporary access key separately.</p>
              </div>

              <div style="text-align: center;">
                <a href="${appUrl}" class="button">Access Workspace</a>
              </div>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} P3L Developers. All rights reserved.<br>
              Nairobi, Kenya
            </div>
          </div>
        </body>
        </html>
        `;

    const data = await resend.emails.send({
      from: 'P3L Developers <onboarding@resend.dev>',
      to: [clientEmail],
      subject: 'Welcome to P3L Developers — Your Project Portal is Ready',
      html: htmlContent
    });
    console.log("Email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
};
