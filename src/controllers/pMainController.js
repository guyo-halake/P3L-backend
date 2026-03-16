import axios from 'axios';
import db from '../config/db.js';
import { sendMailInternal } from './emailController.js';
import { getIO } from '../socket.js';

let tableReady = false;

async function ensurePMainTable() {
  if (tableReady) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pmain_messages (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      channel VARCHAR(32) NOT NULL,
      direction VARCHAR(16) NOT NULL,
      thread_key VARCHAR(191) NOT NULL,
      recipient VARCHAR(255) NULL,
      sender VARCHAR(255) NULL,
      subject VARCHAR(255) NULL,
      body LONGTEXT NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'queued',
      provider_message_id VARCHAR(255) NULL,
      meta JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pmain_thread_created (thread_key, created_at),
      INDEX idx_pmain_channel_created (channel, created_at)
    )
  `);

  tableReady = true;
}

function normalizeChannel(value) {
  const channel = String(value || '').toLowerCase();
  if (channel === 'email' || channel === 'telegram' || channel === 'whatsapp') {
    return channel;
  }
  return 'email';
}

function normalizeDirection(value) {
  const direction = String(value || '').toLowerCase();
  return direction === 'inbound' ? 'inbound' : 'outbound';
}

function computeThreadKey(channel, recipient, sender) {
  const keyBase = recipient || sender || 'unknown';
  return `${channel}:${String(keyBase).toLowerCase()}`;
}

async function getGithubTokenForUser(userId) {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (!userId) return null;
  const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [userId]);
  if (rows.length > 0 && rows[0].github_token) return rows[0].github_token;
  return null;
}

async function buildContextAppendix({ includeProjects, includeClients, includeRepos, userId }) {
  const blocks = [];

  if (includeProjects) {
    const [projects] = await db.execute('SELECT id, name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 20');
    const list = projects.map((p) => `#${p.id} ${p.name} (${p.status || 'unknown'})`).join('\n');
    blocks.push(`Projects Snapshot:\n${list || 'No projects found.'}`);
  }

  if (includeClients) {
    const [clients] = await db.execute('SELECT id, name, email, phone, status FROM clients ORDER BY id DESC LIMIT 20');
    const list = clients
      .map((c) => `#${c.id} ${c.name || 'Unnamed'} | ${c.email || 'no-email'} | ${c.phone || 'no-phone'} | ${c.status || 'unknown'}`)
      .join('\n');
    blocks.push(`Clients Snapshot:\n${list || 'No clients found.'}`);
  }

  if (includeRepos) {
    const token = await getGithubTokenForUser(userId);
    if (token) {
      try {
        const response = await axios.get('https://api.github.com/user/repos?type=all&sort=updated&per_page=20', {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
          },
        });
        const repos = Array.isArray(response.data) ? response.data : [];
        const list = repos
          .map((r) => `${r.full_name} | ${r.private ? 'private' : 'public'} | ${r.html_url}`)
          .join('\n');
        blocks.push(`Repositories Snapshot:\n${list || 'No repositories found.'}`);
      } catch (error) {
        blocks.push('Repositories Snapshot:\nUnable to fetch repositories right now.');
      }
    } else {
      blocks.push('Repositories Snapshot:\nNo GitHub token configured for this account.');
    }
  }

  if (blocks.length === 0) return '';
  return `\n\n---\nP3L Context Packet\n---\n${blocks.join('\n\n')}`;
}

async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing.');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await axios.post(url, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });

  return response.data?.result?.message_id ? String(response.data.result.message_id) : null;
}

async function sendWhatsAppMessage(target, text) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error('WHATSAPP_CLOUD_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing.');
  }

  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: target,
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const id = response.data?.messages?.[0]?.id;
  return id ? String(id) : null;
}

async function persistMessage(message) {
  await ensurePMainTable();
  const [result] = await db.execute(
    `INSERT INTO pmain_messages
      (channel, direction, thread_key, recipient, sender, subject, body, status, provider_message_id, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      message.channel,
      message.direction,
      message.thread_key,
      message.recipient || null,
      message.sender || null,
      message.subject || null,
      message.body,
      message.status || 'queued',
      message.provider_message_id || null,
      message.meta ? JSON.stringify(message.meta) : null,
    ]
  );

  const [rows] = await db.execute('SELECT * FROM pmain_messages WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function savePMainMessage(message) {
  return persistMessage(message);
}

export async function ensurePMainStorage() {
  await ensurePMainTable();
}

async function getAudienceTargets(audience) {
  if (audience === 'clients') {
    const [clients] = await db.execute('SELECT id, name, email, phone FROM clients ORDER BY id DESC LIMIT 300');
    return clients;
  }

  if (audience === 'users') {
    const [users] = await db.execute('SELECT id, username AS name, email, phone FROM users ORDER BY id DESC LIMIT 300');
    return users;
  }

  return [];
}

export const getPMainThreads = async (req, res) => {
  try {
    await ensurePMainTable();
    const channel = req.query.channel ? normalizeChannel(req.query.channel) : null;

    const where = channel ? 'WHERE channel = ?' : '';
    const params = channel ? [channel] : [];

    const [threads] = await db.execute(
      `SELECT
         thread_key,
         channel,
         MAX(created_at) AS latest_at,
         SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) AS inbound_count,
         SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound_count,
         SUBSTRING_INDEX(
           GROUP_CONCAT(body ORDER BY created_at DESC SEPARATOR '\\n---\\n'),
           '\\n---\\n',
           1
         ) AS preview
       FROM pmain_messages
       ${where}
       GROUP BY thread_key, channel
       ORDER BY latest_at DESC
       LIMIT 200`,
      params
    );

    res.json(threads);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch P-main threads', error: error.message });
  }
};

export const getPMainMessages = async (req, res) => {
  try {
    await ensurePMainTable();

    const threadKey = String(req.query.threadKey || '');
    if (!threadKey) {
      return res.status(400).json({ message: 'threadKey is required' });
    }

    const [messages] = await db.execute(
      'SELECT * FROM pmain_messages WHERE thread_key = ? ORDER BY created_at ASC LIMIT 1000',
      [threadKey]
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch P-main messages', error: error.message });
  }
};

export const sendPMainMessage = async (req, res) => {
  try {
    await ensurePMainTable();

    const channel = normalizeChannel(req.body.channel);
    const audience = String(req.body.audience || 'custom').toLowerCase();
    const directTargets = Array.isArray(req.body.targets) ? req.body.targets : [];
    const subject = String(req.body.subject || '').trim();
    const rawBody = String(req.body.body || '').trim();

    if (!rawBody) {
      return res.status(400).json({ message: 'Message body is required' });
    }

    const includeProjects = !!req.body.includeProjects;
    const includeClients = !!req.body.includeClients;
    const includeRepos = !!req.body.includeRepos;
    const userId = req.user?.id || req.body.user_id || null;

    const contextAppendix = await buildContextAppendix({ includeProjects, includeClients, includeRepos, userId });
    const finalBody = `${rawBody}${contextAppendix}`;

    const targetsFromAudience = await getAudienceTargets(audience);
    const targets = audience === 'custom' ? directTargets : targetsFromAudience;

    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ message: 'No targets found to send message to.' });
    }

    const sender = req.user?.email || req.user?.username || 'p3l-system';
    const results = [];

    for (const target of targets) {
      const targetEmail = typeof target === 'string' ? target : target.email;
      const targetPhone = typeof target === 'string' ? target : target.phone;
      const targetTelegram = typeof target === 'string' ? target : (target.telegram_chat_id || target.telegramChatId || target.chat_id);
      const recipientLabel = channel === 'email' ? targetEmail : channel === 'telegram' ? targetTelegram : targetPhone;

      if (!recipientLabel) {
        continue;
      }

      const threadKey = computeThreadKey(channel, recipientLabel, sender);

      let status = 'sent';
      let providerMessageId = null;
      let failure = null;

      try {
        if (channel === 'email') {
          const info = await sendMailInternal({
            to: recipientLabel,
            subject: subject || 'P3L Communication',
            text: finalBody,
          });
          providerMessageId = info?.messageId ? String(info.messageId) : null;
        } else if (channel === 'telegram') {
          providerMessageId = await sendTelegramMessage(recipientLabel, finalBody);
        } else if (channel === 'whatsapp') {
          providerMessageId = await sendWhatsAppMessage(recipientLabel, finalBody);
        }
      } catch (error) {
        status = 'failed';
        failure = error.message;
      }

      const saved = await persistMessage({
        channel,
        direction: 'outbound',
        thread_key: threadKey,
        recipient: recipientLabel,
        sender,
        subject: subject || null,
        body: finalBody,
        status,
        provider_message_id: providerMessageId,
        meta: {
          audience,
          includeProjects,
          includeClients,
          includeRepos,
          error: failure,
        },
      });

      results.push(saved);
    }

    const io = getIO();
    if (io) {
      io.emit('pmain_message', { type: 'outbound', count: results.length, channel });
    }

    res.json({
      success: true,
      channel,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      messages: results,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send P-main message', error: error.message });
  }
};

export const receivePMainInbound = async (req, res) => {
  try {
    await ensurePMainTable();

    const expectedSecret = process.env.PMAIN_WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = req.headers['x-pmain-secret'];
      if (!provided || provided !== expectedSecret) {
        return res.status(401).json({ message: 'Invalid webhook secret' });
      }
    }

    const channel = normalizeChannel(req.params.channel);
    const sender = String(req.body.from || req.body.sender || '').trim();
    const recipient = String(req.body.to || req.body.recipient || '').trim();
    const subject = String(req.body.subject || '').trim();
    const body = String(req.body.message || req.body.body || '').trim();

    if (!sender || !body) {
      return res.status(400).json({ message: 'Inbound message requires sender and message/body' });
    }

    const threadKey = computeThreadKey(channel, sender, recipient);
    const saved = await persistMessage({
      channel,
      direction: normalizeDirection(req.body.direction || 'inbound'),
      thread_key: threadKey,
      recipient: recipient || null,
      sender,
      subject: subject || null,
      body,
      status: 'received',
      provider_message_id: req.body.provider_message_id || null,
      meta: req.body.meta || null,
    });

    const io = getIO();
    if (io) {
      io.emit('pmain_message', { type: 'inbound', channel, threadKey });
    }

    res.status(201).json({ success: true, message: saved });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save inbound P-main message', error: error.message });
  }
};

export const telegramWebhook = async (req, res) => {
  try {
    await ensurePMainTable();

    const message = req.body?.message || req.body?.edited_message || null;
    if (!message) {
      return res.json({ ok: true, ignored: true });
    }

    const chatId = message.chat?.id ? String(message.chat.id) : '';
    const senderId = message.from?.id ? String(message.from.id) : '';
    const senderName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || message.from?.username || senderId || 'telegram-user';
    const body = String(message.text || message.caption || '').trim();

    if (!chatId || !body) {
      return res.json({ ok: true, ignored: true });
    }

    const threadKey = computeThreadKey('telegram', chatId, senderId);
    const saved = await persistMessage({
      channel: 'telegram',
      direction: 'inbound',
      thread_key: threadKey,
      recipient: process.env.TELEGRAM_BOT_USERNAME || 'p3l-bot',
      sender: senderName,
      subject: null,
      body,
      status: 'received',
      provider_message_id: message.message_id ? String(message.message_id) : null,
      meta: {
        chat_id: chatId,
        sender_id: senderId,
        username: message.from?.username || null,
        raw_update_id: req.body?.update_id || null,
      },
    });

    const io = getIO();
    if (io) {
      io.emit('pmain_message', { type: 'inbound', channel: 'telegram', threadKey });
    }

    res.json({ ok: true, message: saved });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const setupTelegramWebhook = async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const publicUrl = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.VITE_BACKEND_URL;

    if (!botToken) {
      return res.status(500).json({ message: 'TELEGRAM_BOT_TOKEN is missing.' });
    }

    if (!publicUrl) {
      return res.status(500).json({ message: 'PUBLIC_BACKEND_URL is missing.' });
    }

    const webhookUrl = `${String(publicUrl).replace(/\/$/, '')}/api/pmain/telegram/webhook`;
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message', 'edited_message'],
    });

    res.json({ success: true, webhookUrl, telegram: response.data });
  } catch (error) {
    res.status(500).json({ message: 'Failed to set Telegram webhook', error: error.message, details: error.response?.data });
  }
};

export const getTelegramWebhookInfo = async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ message: 'TELEGRAM_BOT_TOKEN is missing.' });
    }

    const response = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch Telegram webhook info', error: error.message, details: error.response?.data });
  }
};
