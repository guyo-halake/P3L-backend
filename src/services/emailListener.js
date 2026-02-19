
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { logActivity } from '../utils/activityLogger.js';
import db from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

export const checkEmailReplies = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Skipping email check: Missing EMAIL_USER or EMAIL_PASS');
    return;
  }

  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: 'imap.gmail.com', // Default to Gmail as per nodemailer config
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 3000 // 3 seconds timeout
    }
  };

  let connection;

  try {
    // 1. Get pending invitations using shared pool
    const [invitations] = await db.execute(
      "SELECT invitee_email FROM invitations WHERE status = 'pending'"
    );

    if (invitations.length === 0) {
      // console.log('No pending invitations to check.');
      return;
    }

    const pendingEmails = invitations.map(inv => inv.invitee_email.toLowerCase());

    console.log(`Checking for replies from: ${pendingEmails.join(', ')}`);

    // 2. Connect to IMAP
    connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length > 0) {
      console.log(`Checking ${messages.length} unseen messages...`);
    }

    for (const message of messages) {
      const header = message.parts.find(part => part.which === 'HEADER');
      if (!header || !header.body || !header.body.from) continue;

      const fromHeader = header.body.from[0];
      const emailMatch = fromHeader.match(/<([^>]+)>/);
      const fromEmail = emailMatch ? emailMatch[1].toLowerCase() : fromHeader.toLowerCase().trim();

      if (pendingEmails.includes(fromEmail)) {
        console.log(`Reply detected from ${fromEmail}!`);

        // Parse subject
        const subject = header.body.subject ? header.body.subject[0] : 'No Subject';

        // Fetch body
        let emailText = "No content";
        try {
          const all = message.parts.find(part => part.which === 'TEXT');
          const messageBody = await connection.getPartData(message, all);
          emailText = messageBody || "No content";
        } catch (e) {
          console.error("Error fetching email body", e);
        }

        // Store the reply content
        await db.execute(
          "UPDATE invitations SET status = 'replied', last_checked = NOW(), reply_content = ?, reply_subject = ? WHERE invitee_email = ?",
          [emailText.substring(0, 5000), subject, fromEmail]
        );

        // Create Notification
        await db.execute(
          "INSERT INTO notifications (type, message, is_read) VALUES (?, ?, ?)",
          ['reply_received', `Reply received from ${fromEmail}`, false]
        );

        // Log to System Activity (safely)
        try {
          await logActivity('email', `Reply received from ${fromEmail}: "${subject}"`, { from: fromEmail, subject: subject });
        } catch (logErr) {
          console.error("Failed to log activity for email reply:", logErr);
        }
      }
    }
    // console.log('Email check completed.');

  } catch (error) {
    console.error('Error checking emails:', error.message);
  } finally {
    if (connection) {
      connection.end();
    }
  }
};
