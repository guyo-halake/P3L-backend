import db from '../config/db.js';

export async function ensureJobsFinanceSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS career_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      full_name VARCHAR(255) DEFAULT NULL,
      current_role VARCHAR(255) DEFAULT NULL,
      target_role VARCHAR(255) DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      skills TEXT,
      portfolio TEXT,
      education TEXT,
      experience_summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS job_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      provider VARCHAR(100) DEFAULT NULL,
      external_job_id VARCHAR(191) DEFAULT NULL,
      title VARCHAR(255) NOT NULL,
      company VARCHAR(255) DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      job_url TEXT,
      status VARCHAR(50) DEFAULT 'Saved',
      applied_at DATETIME DEFAULT NULL,
      deadline DATETIME DEFAULT NULL,
      interview_at DATETIME DEFAULT NULL,
      feedback TEXT,
      notes TEXT,
      match_score INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_provider_external (user_id, provider, external_job_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS job_reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      application_id INT DEFAULT NULL,
      reminder_type VARCHAR(80) DEFAULT 'application',
      remind_at DATETIME NOT NULL,
      message TEXT NOT NULL,
      is_sent BOOLEAN DEFAULT FALSE,
      sent_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS finance_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      provider VARCHAR(80) NOT NULL,
      account_ref VARCHAR(255) DEFAULT NULL,
      currency VARCHAR(10) DEFAULT 'KES',
      balance DECIMAL(14,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS finance_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      account_id INT DEFAULT NULL,
      source VARCHAR(80) DEFAULT 'Manual',
      direction VARCHAR(20) NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'KES',
      category VARCHAR(120) DEFAULT 'General',
      counterparty VARCHAR(255) DEFAULT NULL,
      reference_no VARCHAR(255) DEFAULT NULL,
      occurred_at DATETIME DEFAULT NULL,
      notes TEXT,
      raw_payload JSON,
      reconciliation_status VARCHAR(50) DEFAULT 'unmatched',
      reconciled_invoice_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (reconciled_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS finance_payroll_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      pay_day INT DEFAULT 28,
      auto_reminder BOOLEAN DEFAULT TRUE,
      next_run_at DATETIME DEFAULT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS finance_recurring_expense_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'KES',
      category VARCHAR(120) DEFAULT 'General',
      frequency VARCHAR(20) DEFAULT 'monthly',
      account_id INT DEFAULT NULL,
      start_date DATE DEFAULT NULL,
      next_due_date DATE DEFAULT NULL,
      counterparty VARCHAR(255) DEFAULT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_generated_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS finance_provider_webhooks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider VARCHAR(80) NOT NULL,
      event_type VARCHAR(120) DEFAULT NULL,
      payload JSON,
      is_processed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS automation_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      event_key VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_automation_event_key (event_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of statements) {
    await db.execute(sql);
  }
}
