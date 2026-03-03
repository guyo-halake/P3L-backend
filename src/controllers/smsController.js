import db from '../config/db.js';
import axios from 'axios';
import { logActivity } from '../utils/activityLogger.js';

/**
 * Send SMS via AfricasTalking API
 * @param {Object} req 
 * @param {Object} res 
 */
export const sendSMS = async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Missing recipients (to) or message content' });
    }

    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;

    if (!username || !apiKey) {
        console.error('[SMS] AT_USERNAME or AT_API_KEY not configured in .env');
        return res.status(500).json({ error: 'SMS service not configured' });
    }

    const isSandbox = username.toLowerCase() === 'sandbox';
    const apiUrl = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

    try {
        // AfricasTalking expects form-urlencoded body
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('to', to);
        params.append('message', message);

        const response = await axios.post(apiUrl, params, {
            headers: {
                'apiKey': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });

        const data = response.data;
        console.log('[SMS] AT Response:', JSON.stringify(data));

        // AFricastalking returns a list of SMS messages sent
        const recipients = data.SMSMessageData.Recipients;

        // Log to database (SentMessages table if it exists)
        for (const recipient of recipients) {
            try {
                // Determine segments (roughly 160 chars per segment for GSM)
                const segments = Math.ceil(message.length / 160);
                const costPerSegment = 1.0; // 1 KES as per user request summary
                const totalCost = segments * costPerSegment;

                await db.execute(
                    `INSERT INTO SentMessages (phoneNumber, message, status, cost, messageId, statusCode) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        recipient.number,
                        message,
                        recipient.status,
                        totalCost,
                        recipient.messageId,
                        recipient.statusCode
                    ]
                ).catch(e => console.warn('[SMS] Could not save to SentMessages table:', e.message));
            } catch (err) {
                console.warn('[SMS] DB Logging failed:', err.message);
            }
        }

        // Log global activity
        logActivity('sms', `SMS broadcast to ${to}`, { recipientCount: recipients.length });

        res.json({ success: true, data });
    } catch (error) {
        console.error('[SMS] Send Failed:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to send SMS',
            details: error.response?.data || error.message
        });
    }
};

/**
 * Get SMS stats/logs
 */
export const getSMSLogs = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM SentMessages ORDER BY timestamp DESC LIMIT 50');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch SMS logs' });
    }
};
