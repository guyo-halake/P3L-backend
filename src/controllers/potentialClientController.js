import db from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// Get potential clients with their latest activity and assigned user
export const getPotentialClients = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT pc.*, u.username as assigned_to_name, u.avatar as assigned_to_avatar
      FROM potential_clients pc
      LEFT JOIN users u ON pc.assigned_to = u.id
      ORDER BY pc.created_at DESC
    `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching potential clients:', error);
        res.status(500).json({ error: 'Failed to fetch potential clients' });
    }
};

// Create a new potential client
export const createPotentialClient = async (req, res) => {
    try {
        const {
            full_name, email, phone_number, whatsapp_number,
            location, contact_method, project_idea
        } = req.body;

        if (!full_name) {
            return res.status(400).json({ error: 'Full name is required' });
        }

        const [result] = await db.execute(
            `INSERT INTO potential_clients 
      (full_name, email, phone_number, whatsapp_number, location, contact_method, project_idea, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Lead')`,
            [full_name, email, phone_number, whatsapp_number, location, contact_method, project_idea]
        );

        const pcId = result.insertId;

        // Log initial activity
        const activityText = 'Potential client created';
        await db.execute(
            'INSERT INTO potential_client_activities (potential_client_id, activity_text) VALUES (?, ?)',
            [pcId, activityText]
        );

        // Update last_activity field
        await db.execute(
            'UPDATE potential_clients SET last_activity = ? WHERE id = ?',
            [activityText, pcId]
        );

        const creator = req.user ? req.user.username : 'System';
        logActivity('potential_client', `New lead "${full_name}" added by ${creator}`, { potentialClientId: pcId, creator });

        res.status(201).json({ id: pcId, ...req.body, status: 'Lead', last_activity: activityText });
    } catch (error) {
        console.error('Error creating potential client:', error);
        res.status(500).json({ error: 'Failed to create potential client' });
    }
};

// Update a potential client
export const updatePotentialClient = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name, email, phone_number, whatsapp_number,
            location, contact_method, project_idea, status, assigned_to
        } = req.body;

        const fields = [];
        const params = [];

        if (full_name !== undefined) { fields.push('full_name = ?'); params.push(full_name); }
        if (email !== undefined) { fields.push('email = ?'); params.push(email); }
        if (phone_number !== undefined) { fields.push('phone_number = ?'); params.push(phone_number); }
        if (whatsapp_number !== undefined) { fields.push('whatsapp_number = ?'); params.push(whatsapp_number); }
        if (location !== undefined) { fields.push('location = ?'); params.push(location); }
        if (contact_method !== undefined) { fields.push('contact_method = ?'); params.push(contact_method); }
        if (project_idea !== undefined) { fields.push('project_idea = ?'); params.push(project_idea); }
        if (status !== undefined) { fields.push('status = ?'); params.push(status); }
        if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to); }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        await db.execute(`UPDATE potential_clients SET ${fields.join(', ')} WHERE id = ?`, params);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating potential client:', error);
        res.status(500).json({ error: 'Failed to update potential client' });
    }
};

// Log activity for a potential client
export const logPotentialClientActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { activity_text } = req.body;

        if (!activity_text) {
            return res.status(400).json({ error: 'Activity text is required' });
        }

        // Insert into history
        await db.execute(
            'INSERT INTO potential_client_activities (potential_client_id, activity_text) VALUES (?, ?)',
            [id, activity_text]
        );

        // Update the main record to show latest
        await db.execute(
            'UPDATE potential_clients SET last_activity = ? WHERE id = ?',
            [activity_text, id]
        );

        res.json({ success: true, activity_text });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ error: 'Failed to log activity' });
    }
};

// Get activity history for a potential client
export const getPotentialClientHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(
            'SELECT * FROM potential_client_activities WHERE potential_client_id = ? ORDER BY created_at DESC',
            [id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

// Delete a potential client
export const deletePotentialClient = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM potential_clients WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting potential client:', error);
        res.status(500).json({ error: 'Failed to delete potential client' });
    }
};
