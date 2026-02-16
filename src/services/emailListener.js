import imaps from 'imap-simple';
import mailparser from 'mailparser';
const { simpleParser } = mailparser;
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'p3l_system'
};

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
      authTimeout: 3000
    }
  };

  let connection;
  let dbConnection;

  try {
    dbConnection = await mysql.createConnection(dbConfig);
    
    // Get pending invitations
    const [invitations] = await dbConnection.execute(
      "SELECT invitee_email FROM invitations WHERE status = 'pending'"
    );

    if (invitations.length === 0) {
      console.log('No pending invitations to check.');
      return;
    }

    const pendingEmails = invitations.map(inv => inv.invitee_email.toLowerCase());

    console.log(`Checking for replies from: ${pendingEmails.join(', ')}`);

    connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    console.log(`Checking ${messages.length} unseen messages...`);

    for (const message of messages) {
      const header = message.parts.find(part => part.which === 'HEADER');
      if (!header || !header.body || !header.body.from) continue;

      const fromHeader = header.body.from[0]; // simplistic parsing
      
      // better to use mailparser for safety
      // But imap-simple returns parsed header object if structured is true?
      // Actually standard 'from' is just an array of strings in raw header? 
      // Let's use simple match on the raw string for now
      
      const fromClean = fromHeader.replace(/<.*>/, '').trim(); 
      // Actually, let's look for the email address inside brackets
      const emailMatch = fromHeader.match(/<([^>]+)>/);
      const fromEmail = emailMatch ? emailMatch[1].toLowerCase() : fromHeader.toLowerCase();

      if (pendingEmails.includes(fromEmail)) {
          console.log(`Reply detected from ${fromEmail}!`);

          // Parse the email content (using simpleParser from mailparser)
          try {
             const all = message.parts.find(part => part.which === 'TEXT');
             const id = message.attributes.uid;
             const idHeader = "imap-" + id;
             
             // Fetch entire body to parse properly
             const messageBody = await connection.getParts(message.attributes.uid, message.parts, { markSeen: false });
             
             // The structure of message.parts can be complex.
             // Imap-simple returns parts. We need to construct the full raw email or parse the 'TEXT' part if available.
             
             // Simpler approach: fetch full message source for parsing
             const fullMessage = await connection.getPartData(message, all);
             
             // However, simpleParser expects a stream or string (raw email).
             // imap-simple's 'getPartData' returns the confusingly named "data" which is the body content.
             
             // Let's try to get just the text body
             let emailText = "";
             
             // If part is text/plain or text/html
             if (all && all.body) {
                 emailText = all.body; // But this might be empty if not fetched via 'bodies' option in search
             }

             // Re-fetch the specific message with body
             // Actually, the initial search fetched headers and text.
             // message.parts has { which: 'TEXT', body: '...' }
             
             const textPart = message.parts.find(p => p.which === 'TEXT');
             if (textPart && textPart.body) {
                 emailText = textPart.body;
             }
             
             // Store the reply content
             await dbConnection.execute(
                "UPDATE invitations SET status = 'replied', last_checked = NOW(), reply_content = ?, reply_subject = ? WHERE invitee_email = ?",
                [emailText.substring(0, 5000), (header.body.subject ? header.body.subject[0] : 'No Subject'), fromEmail]
             );

             // Create Notification
             await dbConnection.execute(
                "INSERT INTO notifications (type, message, is_read) VALUES (?, ?, ?)",
                ['reply_received', `Reply received from ${fromEmail}`, false]
             );


          } catch (parseErr) {
             console.error('Error parsing email body:', parseErr);
          }
      }
    }

    console.log('Email check completed.');

  } catch (error) {
    console.error('Error checking emails:', error);
  } finally {
    if (connection) {
        connection.end();
    }
    if (dbConnection) {
        dbConnection.end();
    }
  }
};
