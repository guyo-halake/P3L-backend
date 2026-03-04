import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function test() {
    console.log("Testing Gmail Relay with User:", process.env.EMAIL_USER);
    try {
        const info = await transporter.sendMail({
            from: `P3L Admin <${process.env.EMAIL_USER}>`,
            to: 'razakwako45@gmail.com',
            subject: 'Gmail Relay Test',
            text: 'Testing Gmail App Password sending for task assignment.'
        });

        console.log("Gmail Relay Success Info:", info.messageId);
    } catch (err) {
        console.error("Gmail Relay Error:", err);
    }
}

test();
