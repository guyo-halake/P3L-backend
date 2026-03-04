import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
    console.log("Testing Resend with Key:", process.env.RESEND_API_KEY);
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'razakwako45@gmail.com',
            subject: 'Resend Test',
            text: 'This is a test to see if Resend is working.'
        });

        if (error) {
            console.error("Resend Error Object:", error);
        } else {
            console.log("Resend Success Data:", data);
        }
    } catch (err) {
        console.error("Resend Catch Error:", err);
    }
}

test();
