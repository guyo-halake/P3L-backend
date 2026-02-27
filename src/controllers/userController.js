
import db from '../config/db.js';

export const getUsers = async (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT id, username, email, user_type, wallet_balance, permissions FROM users';
        const params = [];

        if (type) {
            query += ' WHERE user_type = ?';
            params.push(type);
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

export const updateWalletBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;
        await db.execute('UPDATE users SET wallet_balance = ? WHERE id = ?', [balance, id]);
        res.json({ success: true, balance });
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).json({ message: 'Wallet update failed' });
    }
};

export const updatePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;
        await db.execute('UPDATE users SET permissions = ? WHERE id = ?', [JSON.stringify(permissions), id]);
        res.json({ success: true, permissions });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ message: 'Permissions update failed' });
    }
};
