import db from '../config/db.js';

export const getSystemActivity = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM system_activities ORDER BY created_at DESC LIMIT 50'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching system activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
};
