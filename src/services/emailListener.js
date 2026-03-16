
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { logActivity } from '../utils/activityLogger.js';
import db from '../config/db.js';
import { getIO } from '../socket.js';
import { ensurePMainStorage, savePMainMessage } from '../controllers/pMainController.js';
import dotenv from 'dotenv';
dotenv.config();

const emailThreadKey = (email) => `email:${String(email || 'unknown').toLowerCase()}`;

export const checkEmailReplies = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Skipping email check: Missing EMAIL_USER or EMAIL_PASS');
    return;
  }

  await ensurePMainStorage();

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
      bodies: [''],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length > 0) {
      console.log(`Checking ${messages.length} unseen messages...`);
    }

    for (const message of messages) {
      try {
        const rawPart = message.parts.find(part => part.which === '');
        if (!rawPart) continue;
        const rawEmail = await connection.getPartData(message, rawPart);
        const parsed = await simpleParser(rawEmail);
        const fromValue = parsed.from?.value?.[0]?.address || '';
        const fromEmail = fromValue.toLowerCase().trim();
        if (!fromEmail) continue;

        const subject = parsed.subject || 'No Subject';
        const emailText = (parsed.text || parsed.html || 'No content').toString().trim() || 'No content';

        await savePMainMessage({
          channel: 'email',
          direction: 'inbound',
          thread_key: emailThreadKey(fromEmail),
          recipient: process.env.EMAIL_USER || null,
          sender: fromEmail,
          subject,
          body: emailText.substring(0, 20000),
          status: 'received',
          provider_message_id: parsed.messageId || null,
          meta: {
            in_reply_to: parsed.inReplyTo || null,
            references: parsed.references || null,
          },
        });

        const io = getIO();
        if (io) {
          io.emit('pmain_message', { type: 'inbound', channel: 'email', threadKey: emailThreadKey(fromEmail) });
        }

        if (pendingEmails.includes(fromEmail)) {
          console.log(`Reply detected from ${fromEmail}!`);

          await db.execute(
            "UPDATE invitations SET status = 'replied', last_checked = NOW(), reply_content = ?, reply_subject = ? WHERE invitee_email = ?",
            [emailText.substring(0, 5000), subject, fromEmail]
          );

          await db.execute(
            "INSERT INTO notifications (type, message, is_read) VALUES (?, ?, ?)",
            ['reply_received', `Reply received from ${fromEmail}`, false]
          );

          try {
            await logActivity('email', `Reply received from ${fromEmail}: "${subject}"`, { from: fromEmail, subject: subject });
          } catch (logErr) {
            console.error("Failed to log activity for email reply:", logErr);
          }
        }
      } catch (messageError) {
        console.error('Error processing inbound email:', messageError.message || messageError);
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
