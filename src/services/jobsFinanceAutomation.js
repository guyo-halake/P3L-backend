import db from '../config/db.js';
import { sendMailInternal } from '../controllers/emailController.js';
import { getIO } from '../socket.js';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextByFrequency(currentDate, frequency) {
  const d = new Date(currentDate);
  if (frequency === 'daily') return addDays(d, 1);
  if (frequency === 'weekly') return addDays(d, 7);
  if (frequency === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
    return d;
  }
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function createAlertOnce(userId, eventKey, message, link = null) {
  try {
    await db.execute(
      'INSERT INTO automation_notifications (user_id, event_key, message, link) VALUES (?, ?, ?, ?)',
      [userId, eventKey, message, link]
    );
  } catch (error) {
    if (String(error?.message || '').includes('Duplicate entry')) {
      return false;
    }
    throw error;
  }

  await db.execute('INSERT INTO system_alerts (user_id, message, link) VALUES (?, ?, ?)', [userId, message, link]);
  const io = getIO();
  if (io) io.emit('system_alert', { userId, message, link });
  return true;
}

async function runInvoiceReminders() {
  const [admins] = await db.execute("SELECT id, email, username FROM users WHERE user_type IN ('full_admin','dev')");
  if (!admins.length) return;

  const [invoices] = await db.execute(
    `SELECT i.id, i.amount, i.status, i.due_date, c.name AS client_name
     FROM invoices i
     LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.status NOT IN ('Paid', 'Cancelled') AND i.due_date IS NOT NULL`
  );

  const now = new Date();
  for (const inv of invoices) {
    const due = new Date(inv.due_date);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 3) continue;

    const stateLabel = daysLeft < 0 ? `overdue by ${Math.abs(daysLeft)} day(s)` : `due in ${daysLeft} day(s)`;
    const message = `Invoice #${inv.id} for ${inv.client_name || 'Unknown Client'} is ${stateLabel}. Amount: KES ${Number(inv.amount || 0).toLocaleString()}.`;

    for (const user of admins) {
      const eventKey = `invoice-${inv.id}-user-${user.id}-day-${now.toISOString().slice(0, 10)}`;
      const created = await createAlertOnce(user.id, eventKey, message, '/finances');
      if (created && user.email) {
        try {
          await sendMailInternal({ to: user.email, subject: `Invoice Reminder #${inv.id}`, text: message });
        } catch {
        }
      }
    }
  }
}

async function runPayrollAlerts() {
  const [rules] = await db.execute(
    `SELECT r.*, u.email, u.username
     FROM finance_payroll_rules r
     JOIN users u ON u.id = r.user_id
     WHERE r.is_active = TRUE`
  );

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 2);

  for (const rule of rules) {
    if (!rule.next_run_at) continue;
    const nextRun = new Date(rule.next_run_at);
    if (nextRun > horizon) continue;

    const message = `Payroll run is scheduled for ${nextRun.toLocaleDateString()}. Review balances and approvals.`;
    const eventKey = `payroll-${rule.id}-${now.toISOString().slice(0, 10)}`;
    const created = await createAlertOnce(rule.user_id, eventKey, message, '/finances');

    if (created && rule.auto_reminder && rule.email) {
      try {
        await sendMailInternal({ to: rule.email, subject: 'Payroll Reminder', text: message });
      } catch {
      }
    }
  }
}

async function runRecurringExpenses() {
  const [rules] = await db.execute(
    `SELECT * FROM finance_recurring_expense_rules
     WHERE is_active = TRUE AND next_due_date IS NOT NULL AND next_due_date <= CURDATE()`
  );

  for (const rule of rules) {
    await db.execute(
      `INSERT INTO finance_transactions
        (user_id, account_id, source, direction, amount, currency, category, counterparty, occurred_at, notes, raw_payload)
       VALUES (?, ?, 'Automation', 'outflow', ?, ?, ?, ?, NOW(), ?, JSON_OBJECT('rule_id', ?))`,
      [
        rule.user_id,
        rule.account_id || null,
        Number(rule.amount || 0),
        rule.currency || 'KES',
        rule.category || 'General',
        rule.counterparty || null,
        `Recurring expense: ${rule.name}`,
        rule.id,
      ]
    );

    const nextDue = nextByFrequency(rule.next_due_date, rule.frequency || 'monthly');
    await db.execute(
      'UPDATE finance_recurring_expense_rules SET last_generated_at = NOW(), next_due_date = ? WHERE id = ?',
      [nextDue.toISOString().slice(0, 10), rule.id]
    );

    const eventKey = `recurring-${rule.id}-${nextDue.toISOString().slice(0, 10)}`;
    await createAlertOnce(rule.user_id, eventKey, `Recurring expense generated: ${rule.name} (KES ${Number(rule.amount || 0).toLocaleString()})`, '/finances');
  }
}

async function runJobRemindersAndInterviewPrep() {
  const [dueReminders] = await db.execute(
    `SELECT r.*, u.email, u.username
     FROM job_reminders r
     JOIN users u ON u.id = r.user_id
     WHERE r.is_sent = FALSE AND r.remind_at <= NOW()`
  );

  for (const rem of dueReminders) {
    const eventKey = `job-rem-${rem.id}`;
    const created = await createAlertOnce(rem.user_id, eventKey, rem.message, '/jobs');
    if (created && rem.email) {
      try {
        await sendMailInternal({ to: rem.email, subject: 'Job Reminder', text: rem.message });
      } catch {
      }
    }
    await db.execute('UPDATE job_reminders SET is_sent = TRUE, sent_at = NOW() WHERE id = ?', [rem.id]);
  }

  const [interviews] = await db.execute(
    `SELECT ja.*, u.username
     FROM job_applications ja
     JOIN users u ON u.id = ja.user_id
     WHERE ja.interview_at IS NOT NULL
       AND ja.status IN ('Interview', 'Applied')
       AND ja.interview_at <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
       AND ja.interview_at >= NOW()`
  );

  const defaultProjectId = Number(process.env.DEFAULT_AUTOMATION_PROJECT_ID || 0);

  for (const interview of interviews) {
    const eventKey = `interview-prep-${interview.id}`;
    const created = await createAlertOnce(
      interview.user_id,
      eventKey,
      `Interview prep: ${interview.title} at ${interview.company}. Interview date ${new Date(interview.interview_at).toLocaleString()}.`,
      '/jobs'
    );

    if (created && defaultProjectId > 0) {
      await db.execute(
        `INSERT INTO project_tasks (project_id, assigned_to, title, description, due_date, status)
         VALUES (?, ?, ?, ?, DATE(?), 'Todo')`,
        [
          defaultProjectId,
          interview.user_id,
          `Interview prep: ${interview.title}`,
          `Prepare for interview with ${interview.company}. Application #${interview.id}.`,
          interview.interview_at,
        ]
      );
    }
  }
}

let automationTimer = null;
let isRunning = false;

export function startJobsFinanceAutomation() {
  if (automationTimer) return;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await runInvoiceReminders();
      await runPayrollAlerts();
      await runRecurringExpenses();
      await runJobRemindersAndInterviewPrep();
    } catch (error) {
      console.error('jobs/finance automation error', error);
    } finally {
      isRunning = false;
    }
  };

  run().catch(() => {});
  automationTimer = setInterval(run, 5 * 60 * 1000);
}
