import axios from 'axios';
import multer from 'multer';
import db from '../config/db.js';
import { getIO } from '../socket.js';

export const csvUpload = multer({ storage: multer.memoryStorage() });

function currentUserId(req) {
  return Number(req.user?.id || req.user?.user_id || 0);
}

function emitFinanceUpdate(userId, payload) {
  const io = getIO();
  if (!io) return;
  io.emit('finance_updated', {
    userId,
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

function parseCurrencyAmount(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function categorizeTransaction(text = '') {
  const normalized = String(text).toLowerCase();
  if (normalized.includes('salary') || normalized.includes('payroll')) return 'Payroll';
  if (normalized.includes('invoice') || normalized.includes('payment received')) return 'Client Payment';
  if (normalized.includes('hosting') || normalized.includes('domain') || normalized.includes('vercel') || normalized.includes('server')) return 'Infrastructure';
  if (normalized.includes('airtime') || normalized.includes('bundle') || normalized.includes('safaricom')) return 'Telecom';
  if (normalized.includes('rent') || normalized.includes('office')) return 'Office';
  if (normalized.includes('transport') || normalized.includes('fuel') || normalized.includes('uber')) return 'Transport';
  return 'General';
}

function parseTextTransactions(rawText = '') {
  return String(rawText)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const amountMatch = line.match(/(kes|ksh|kshs)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      const amount = amountMatch ? Number(amountMatch[2].replace(/,/g, '')) : 0;
      if (!amount) return null;

      const direction = /received|deposit|credited|cr\b/i.test(line) ? 'inflow' : 'outflow';
      const source = /mpesa|m-pesa|paybill|till/i.test(line) ? 'M-Pesa' : /bank|equity|kcb|coop|ncba|absa|stanbic/i.test(line) ? 'Bank' : 'Manual';
      const dateMatch = line.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/);

      return {
        id: `${Date.now()}-${idx}`,
        source,
        direction,
        amount,
        category: categorizeTransaction(line),
        counterparty: line.split(' ').slice(0, 5).join(' '),
        occurred_at: dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 10),
        notes: line,
      };
    })
    .filter(Boolean);
}

function parseCsvTransactions(csvText = '') {
  const lines = String(csvText).split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const getValue = (row, names) => {
    const idx = headers.findIndex((h) => names.includes(h));
    return idx >= 0 ? row[idx] : '';
  };

  return lines.slice(1).map((line, idx) => {
    const row = line.split(',').map((item) => item.trim());
    const amountValue = getValue(row, ['amount', 'value']);
    const debitValue = getValue(row, ['debit', 'withdrawal']);
    const creditValue = getValue(row, ['credit', 'deposit']);

    let amount = parseCurrencyAmount(amountValue);
    let direction = 'outflow';
    if (creditValue) {
      amount = parseCurrencyAmount(creditValue);
      direction = 'inflow';
    } else if (debitValue) {
      amount = parseCurrencyAmount(debitValue);
      direction = 'outflow';
    } else if (amount < 0) {
      amount = Math.abs(amount);
      direction = 'outflow';
    } else {
      direction = 'inflow';
    }

    const description = getValue(row, ['description', 'narration', 'details', 'reference']);

    return {
      id: `csv-${Date.now()}-${idx}`,
      source: /mpesa|m-pesa/i.test(description) ? 'M-Pesa' : 'Bank',
      direction,
      amount,
      category: categorizeTransaction(description),
      counterparty: getValue(row, ['counterparty', 'payee', 'beneficiary']) || description || 'Unknown',
      occurred_at: getValue(row, ['date', 'transaction_date', 'posted_at']) || new Date().toISOString().slice(0, 10),
      notes: description,
      reference_no: getValue(row, ['reference', 'reference_no', 'receipt']),
    };
  }).filter((item) => item.amount > 0);
}

async function insertTransactions(userId, items = [], accountId = null) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const insertedIds = [];
  for (const item of items) {
    const [result] = await db.execute(
      `INSERT INTO finance_transactions
        (user_id, account_id, source, direction, amount, currency, category, counterparty, reference_no, occurred_at, notes, raw_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        accountId || null,
        item.source || 'Manual',
        item.direction || 'outflow',
        Number(item.amount || 0),
        item.currency || 'KES',
        item.category || 'General',
        item.counterparty || null,
        item.reference_no || null,
        item.occurred_at || new Date(),
        item.notes || null,
        JSON.stringify(item.raw_payload || item || {}),
      ]
    );
    insertedIds.push(result.insertId);
  }

  return insertedIds;
}

export async function getFinanceAccounts(req, res) {
  try {
    const userId = currentUserId(req);
    const [rows] = await db.execute('SELECT * FROM finance_accounts WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('getFinanceAccounts error', error);
    res.status(500).json({ message: 'Failed to fetch accounts' });
  }
}

export async function createFinanceAccount(req, res) {
  try {
    const userId = currentUserId(req);
    const {
      name,
      provider,
      account_ref,
      currency,
      balance,
      is_active,
    } = req.body || {};

    const [result] = await db.execute(
      `INSERT INTO finance_accounts (user_id, name, provider, account_ref, currency, balance, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        provider || 'Wallet',
        account_ref || null,
        currency || 'KES',
        Number(balance || 0),
        is_active !== false,
      ]
    );

    const [rows] = await db.execute('SELECT * FROM finance_accounts WHERE id = ?', [result.insertId]);
    emitFinanceUpdate(userId, { entity: 'account', action: 'create', accountId: rows[0]?.id || null });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('createFinanceAccount error', error);
    res.status(500).json({ message: 'Failed to create account' });
  }
}

export async function updateFinanceAccount(req, res) {
  try {
    const userId = currentUserId(req);
    const { id } = req.params;
    const allowed = ['name', 'provider', 'account_ref', 'currency', 'balance', 'is_active'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields provided' });

    values.push(id, userId);
    await db.execute(`UPDATE finance_accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);

    const [rows] = await db.execute('SELECT * FROM finance_accounts WHERE id = ? AND user_id = ?', [id, userId]);
    emitFinanceUpdate(userId, { entity: 'account', action: 'update', accountId: Number(id) });
    res.json(rows[0] || null);
  } catch (error) {
    console.error('updateFinanceAccount error', error);
    res.status(500).json({ message: 'Failed to update account' });
  }
}

export async function getFinanceTransactions(req, res) {
  try {
    const userId = currentUserId(req);
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const [rows] = await db.execute(
      'SELECT * FROM finance_transactions WHERE user_id = ? ORDER BY COALESCE(occurred_at, created_at) DESC LIMIT ?',
      [userId, limit]
    );
    res.json(rows);
  } catch (error) {
    console.error('getFinanceTransactions error', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
}

export async function createFinanceTransaction(req, res) {
  try {
    const userId = currentUserId(req);
    const payload = req.body || {};
    const ids = await insertTransactions(userId, [payload], payload.account_id || null);
    const [rows] = await db.execute('SELECT * FROM finance_transactions WHERE id = ?', [ids[0]]);
    emitFinanceUpdate(userId, { entity: 'transaction', action: 'create', transactionId: rows[0]?.id || null });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('createFinanceTransaction error', error);
    res.status(500).json({ message: 'Failed to create transaction' });
  }
}

export async function scanFinanceTransactions(req, res) {
  try {
    const userId = currentUserId(req);
    const { raw_text, account_id } = req.body || {};
    const parsed = parseTextTransactions(raw_text || '');
    await insertTransactions(userId, parsed, account_id || null);
    emitFinanceUpdate(userId, {
      entity: 'transaction_scan',
      action: 'create',
      count: parsed.length,
      accountId: account_id || null,
    });
    res.json({ count: parsed.length, items: parsed });
  } catch (error) {
    console.error('scanFinanceTransactions error', error);
    res.status(500).json({ message: 'Failed to scan transactions' });
  }
}

export async function importFinanceTransactionsCsv(req, res) {
  try {
    const userId = currentUserId(req);
    const { account_id } = req.body || {};
    const csv = req.file?.buffer?.toString('utf8') || '';
    const parsed = parseCsvTransactions(csv);
    await insertTransactions(userId, parsed, account_id || null);
    emitFinanceUpdate(userId, {
      entity: 'transaction_import',
      action: 'create',
      count: parsed.length,
      accountId: account_id || null,
    });
    res.json({ count: parsed.length, items: parsed });
  } catch (error) {
    console.error('importFinanceTransactionsCsv error', error);
    res.status(500).json({ message: 'Failed to import CSV transactions' });
  }
}

export async function getFinanceReconciliation(req, res) {
  try {
    const userId = currentUserId(req);

    const [invoiceRows] = await db.execute(
      `SELECT id, client_id, amount, status, description, date, due_date
       FROM invoices
       ORDER BY date DESC`
    );

    const [txRows] = await db.execute(
      `SELECT id, amount, direction, notes, occurred_at, reference_no, reconciliation_status, reconciled_invoice_id
       FROM finance_transactions
       WHERE user_id = ?
       ORDER BY COALESCE(occurred_at, created_at) DESC`,
      [userId]
    );

    let matched = 0;
    const suggestions = [];

    for (const invoice of invoiceRows) {
      const invoiceAmount = Number(invoice.amount || 0);
      const candidate = txRows.find((tx) => {
        if (tx.direction !== 'inflow') return false;
        if (tx.reconciled_invoice_id) return false;
        const delta = Math.abs(Number(tx.amount || 0) - invoiceAmount);
        return delta <= 1;
      });

      if (candidate) {
        suggestions.push({ invoice_id: invoice.id, transaction_id: candidate.id, confidence: 0.92 });
        matched += 1;
      }
    }

    res.json({
      invoices_total: invoiceRows.length,
      transactions_total: txRows.length,
      matched,
      unmatched_invoices: Math.max(0, invoiceRows.length - matched),
      unmatched_transactions: Math.max(0, txRows.length - matched),
      suggestions: suggestions.slice(0, 100),
    });
  } catch (error) {
    console.error('getFinanceReconciliation error', error);
    res.status(500).json({ message: 'Failed to reconcile finance data' });
  }
}

export async function getPayrollRule(req, res) {
  try {
    const userId = currentUserId(req);
    const [rows] = await db.execute('SELECT * FROM finance_payroll_rules WHERE user_id = ? LIMIT 1', [userId]);
    res.json(rows[0] || null);
  } catch (error) {
    console.error('getPayrollRule error', error);
    res.status(500).json({ message: 'Failed to fetch payroll rule' });
  }
}

export async function upsertPayrollRule(req, res) {
  try {
    const userId = currentUserId(req);
    const { pay_day, auto_reminder, next_run_at, is_active } = req.body || {};
    await db.execute(
      `INSERT INTO finance_payroll_rules (user_id, pay_day, auto_reminder, next_run_at, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        pay_day = VALUES(pay_day),
        auto_reminder = VALUES(auto_reminder),
        next_run_at = VALUES(next_run_at),
        is_active = VALUES(is_active)`,
      [userId, Number(pay_day || 28), auto_reminder !== false, next_run_at || null, is_active !== false]
    );
    const [rows] = await db.execute('SELECT * FROM finance_payroll_rules WHERE user_id = ? LIMIT 1', [userId]);
    emitFinanceUpdate(userId, { entity: 'payroll_rule', action: 'upsert' });
    res.json(rows[0]);
  } catch (error) {
    console.error('upsertPayrollRule error', error);
    res.status(500).json({ message: 'Failed to save payroll rule' });
  }
}

export async function getRecurringRules(req, res) {
  try {
    const userId = currentUserId(req);
    const [rows] = await db.execute('SELECT * FROM finance_recurring_expense_rules WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('getRecurringRules error', error);
    res.status(500).json({ message: 'Failed to fetch recurring rules' });
  }
}

export async function createRecurringRule(req, res) {
  try {
    const userId = currentUserId(req);
    const {
      name,
      amount,
      currency,
      category,
      frequency,
      account_id,
      start_date,
      next_due_date,
      counterparty,
      is_active,
    } = req.body || {};

    const [result] = await db.execute(
      `INSERT INTO finance_recurring_expense_rules
        (user_id, name, amount, currency, category, frequency, account_id, start_date, next_due_date, counterparty, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        Number(amount || 0),
        currency || 'KES',
        category || 'General',
        frequency || 'monthly',
        account_id || null,
        start_date || null,
        next_due_date || null,
        counterparty || null,
        is_active !== false,
      ]
    );

    const [rows] = await db.execute('SELECT * FROM finance_recurring_expense_rules WHERE id = ?', [result.insertId]);
    emitFinanceUpdate(userId, { entity: 'recurring_rule', action: 'create', ruleId: rows[0]?.id || null });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('createRecurringRule error', error);
    res.status(500).json({ message: 'Failed to create recurring rule' });
  }
}

export async function updateRecurringRule(req, res) {
  try {
    const userId = currentUserId(req);
    const { id } = req.params;
    const allowed = ['name', 'amount', 'currency', 'category', 'frequency', 'account_id', 'start_date', 'next_due_date', 'counterparty', 'is_active'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields provided' });

    values.push(id, userId);
    await db.execute(`UPDATE finance_recurring_expense_rules SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);

    const [rows] = await db.execute('SELECT * FROM finance_recurring_expense_rules WHERE id = ? AND user_id = ?', [id, userId]);
    emitFinanceUpdate(userId, { entity: 'recurring_rule', action: 'update', ruleId: Number(id) });
    res.json(rows[0] || null);
  } catch (error) {
    console.error('updateRecurringRule error', error);
    res.status(500).json({ message: 'Failed to update recurring rule' });
  }
}

export async function deleteRecurringRule(req, res) {
  try {
    const userId = currentUserId(req);
    const { id } = req.params;
    await db.execute('DELETE FROM finance_recurring_expense_rules WHERE id = ? AND user_id = ?', [id, userId]);
    emitFinanceUpdate(userId, { entity: 'recurring_rule', action: 'delete', ruleId: Number(id) });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteRecurringRule error', error);
    res.status(500).json({ message: 'Failed to delete recurring rule' });
  }
}

export async function getMpesaToken(req, res) {
  try {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    if (!key || !secret) return res.status(400).json({ message: 'M-Pesa credentials not configured' });

    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const endpoint = process.env.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('getMpesaToken error', error?.response?.data || error);
    res.status(500).json({ message: 'Failed to fetch M-Pesa token' });
  }
}

export async function initiateMpesaStkPush(req, res) {
  try {
    const {
      phone,
      amount,
      accountReference,
      transactionDesc,
      callbackUrl,
    } = req.body || {};

    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!key || !secret || !shortcode || !passkey) {
      return res.status(400).json({ message: 'M-Pesa STK credentials not configured' });
    }

    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const oauthEndpoint = process.env.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const tokenResponse = await axios.get(oauthEndpoint, { headers: { Authorization: `Basic ${auth}` } });
    const token = tokenResponse.data?.access_token;

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const endpoint = process.env.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Number(amount || 1),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl || process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference || 'P3L',
      TransactionDesc: transactionDesc || 'P3L Payment',
    };

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('initiateMpesaStkPush error', error?.response?.data || error);
    res.status(500).json({ message: 'Failed to initiate STK push' });
  }
}

export async function handleMpesaWebhook(req, res) {
  try {
    const payload = req.body || {};
    await db.execute(
      'INSERT INTO finance_provider_webhooks (provider, event_type, payload, is_processed) VALUES (?, ?, ?, ?)',
      ['M-Pesa', 'stk_callback', JSON.stringify(payload), false]
    );

    const callback = payload.Body?.stkCallback || payload.stkCallback || {};
    const metadata = callback.CallbackMetadata?.Item || [];
    const amountItem = metadata.find((item) => item.Name === 'Amount');
    const receiptItem = metadata.find((item) => item.Name === 'MpesaReceiptNumber');
    const dateItem = metadata.find((item) => item.Name === 'TransactionDate');

    const amount = Number(amountItem?.Value || 0);
    if (amount > 0) {
      const occurredAt = dateItem?.Value ? String(dateItem.Value) : new Date().toISOString();
      const [users] = await db.execute('SELECT id FROM users ORDER BY id ASC LIMIT 1');
      const fallbackUserId = users?.[0]?.id || null;
      if (fallbackUserId) {
        await db.execute(
          `INSERT INTO finance_transactions
            (user_id, source, direction, amount, currency, category, counterparty, reference_no, occurred_at, notes, raw_payload)
           VALUES (?, 'M-Pesa', 'inflow', ?, 'KES', 'Client Payment', ?, ?, ?, ?, ?)`,
          [
            fallbackUserId,
            amount,
            'M-Pesa Callback',
            receiptItem?.Value || null,
            occurredAt,
            'M-Pesa webhook transaction',
            JSON.stringify(payload),
          ]
        );
        emitFinanceUpdate(fallbackUserId, {
          entity: 'mpesa_webhook',
          action: 'create',
          amount,
          referenceNo: receiptItem?.Value || null,
        });
      }
    }

    await db.execute('UPDATE finance_provider_webhooks SET is_processed = TRUE WHERE id = LAST_INSERT_ID()');

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('handleMpesaWebhook error', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted with errors' });
  }
}

export async function handleMpesaValidation(req, res) {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
