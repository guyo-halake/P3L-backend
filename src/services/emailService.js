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
        const data = await resend.emails.send({
            from: 'P3L Developers <onboarding@resend.dev>', // Update this with your verified domain later
            to: [clientEmail],
            subject: 'Welcome to P3L Developers!',
            html: `
        <div style="font-family: sans-serif; color: #333;">
          <h1>Welcome to P3L, ${clientName}!</h1>
          <p>We are thrilled to have you onboard.</p>
          <p>You can now access your project dashboard to track progress, view invoices, and communicate with the team.</p>
          <br/>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #facc15; color: #422006; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
          <br/><br/>
          <p>Best regards,<br/>The P3L Team</p>
        </div>
      `
        });
        console.log("Email sent successfully:", data);
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { success: false, error };
    }
};
