import db from '../config/db.js';
import bcrypt from 'bcryptjs';

export const getTesters = async (req, res) => {
    try {
        const [testers] = await db.execute(`
      SELECT t.*, p.name as project_name 
      FROM p3l_testers t 
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC
    `);
        res.json(testers);
    } catch (error) {
        console.error('Error fetching testers:', error);
        res.status(500).json({ error: 'Failed to fetch testers' });
    }
};

export const createTester = async (req, res) => {
    const { full_name, email, password, phone, project_id, status } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password || 'tester123', 10);
        const [result] = await db.execute(
            'INSERT INTO p3l_testers (full_name, email, password, phone, project_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, phone, project_id || null, status || 'Pending']
        );
        res.status(201).json({ id: result.insertId, message: 'Tester created successfully' });
    } catch (error) {
        console.error('Error creating tester:', error);
        res.status(500).json({ error: 'Failed to create tester' });
    }
};

export const updateTester = async (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone, project_id, status } = req.body;
    try {
        await db.execute(
            'UPDATE p3l_testers SET full_name = ?, email = ?, phone = ?, project_id = ?, status = ? WHERE id = ?',
            [full_name, email, phone, project_id, status, id]
        );
        res.json({ message: 'Tester updated successfully' });
    } catch (error) {
        console.error('Error updating tester:', error);
        res.status(500).json({ error: 'Failed to update tester' });
    }
};

export const deleteTester = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM p3l_testers WHERE id = ?', [id]);
        res.json({ message: 'Tester deleted successfully' });
    } catch (error) {
        console.error('Error deleting tester:', error);
        res.status(500).json({ error: 'Failed to delete tester' });
    }
};

export const logActivity = async (req, res) => {
    const { tester_id, project_id, action, details } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;
    try {
        await db.execute(
            'INSERT INTO p3l_tester_activities (tester_id, project_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
            [tester_id, project_id, action, details, ip_address]
        );
        res.status(201).json({ message: 'Activity logged' });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ error: 'Failed to log activity' });
    }
};

export const getTesterActivities = async (req, res) => {
    const { id } = req.params; // tester_id
    try {
        const [activities] = await db.execute(`
      SELECT a.*, p.name as project_name 
      FROM p3l_tester_activities a
      JOIN projects p ON a.project_id = p.id
      WHERE a.tester_id = ?
      ORDER BY a.created_at DESC
    `, [id]);
        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
};
