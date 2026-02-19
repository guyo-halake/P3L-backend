import { sendOnboardingEmail } from './src/services/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Testing email service...");
console.log("API Key present?", !!process.env.RESEND_API_KEY);

try {
    await sendOnboardingEmail("Test User", "test@example.com");
    console.log("Email test call completed (check logs for success/fail)");
} catch (e) {
    console.error("CRITICAL FAILURE in email service test:", e);
}
