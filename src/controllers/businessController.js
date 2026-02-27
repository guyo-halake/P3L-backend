
import db from '../config/db.js';

// Revenue Summary
export const getRevenueSummary = async (req, res) => {
    try {
        const [invoices] = await db.query('SELECT amount, revenue_type, status FROM invoices');
        const [subs] = await db.query('SELECT amount_monthly, status FROM revenue_subscriptions WHERE status = "Active"');

        const mrr = subs.reduce((sum, s) => sum + Number(s.amount_monthly), 0);
        const arr = mrr * 12;

        const breakdown = {
            'AI Agents': 0,
            'Subscriptions': mrr,
            'Startup Projects': 0,
            'Freelance/Remote': 0,
            '9-5': 0
        };

        invoices.forEach(inv => {
            if (inv.status === 'Paid') {
                const type = inv.revenue_type || 'Freelance/Remote';
                if (breakdown[type] !== undefined) {
                    breakdown[type] += Number(inv.amount);
                } else {
                    breakdown['Freelance/Remote'] += Number(inv.amount);
                }
            }
        });

        res.json({ mrr, arr, breakdown });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Team Performance
export const getTeamPerformance = async (req, res) => {
    try {
        const query = `
            SELECT u.username, u.id, tp.hours_logged, tp.contributions, tp.skill_growth_json, tp.streak
            FROM users u
            LEFT JOIN team_performance tp ON u.id = tp.user_id
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Business Vault
export const getVaultDocs = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM business_vault ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const addVaultDoc = async (req, res) => {
    try {
        const { title, category, file_url, source } = req.body;
        const [result] = await db.query(
            'INSERT INTO business_vault (title, category, file_url, source) VALUES (?, ?, ?, ?)',
            [title, category, file_url, source]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
