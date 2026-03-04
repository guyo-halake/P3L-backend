import db from '../config/db.js';
import crypto from 'crypto';

export const generateTicket = async (req, res) => {
    const { projectId, persona } = req.body;
    const userId = req.user?.id;

    if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
    }

    try {
        // Check if project exists and has a vercel_url
        const [projects] = await db.query('SELECT id, vercel_url FROM projects WHERE id = ?', [projectId]);
        if (projects.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const project = projects[0];
        if (!project.vercel_url) {
            return res.status(400).json({ message: 'Project does not have a Vercel URL configured' });
        }

        // Generate a secure random ticket
        const ticket = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        // Save ticket to DB
        await db.query(
            'INSERT INTO p3l_auth_tickets (ticket, project_id, user_id, persona, expires_at) VALUES (?, ?, ?, ?, ?)',
            [ticket, projectId, userId || null, persona || 'Test User', expiresAt]
        );

        res.json({ ticket, baseUrl: project.vercel_url });
    } catch (err) {
        console.error('Error generating SSO ticket:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const validateTicket = async (req, res) => {
    const { ticket } = req.body;

    if (!ticket) {
        return res.status(400).json({ message: 'Ticket is required' });
    }

    try {
        // Find valid ticket
        const [rows] = await db.query(
            'SELECT t.*, p.name as project_name, p.vercel_url FROM p3l_auth_tickets t JOIN projects p ON t.project_id = p.id WHERE t.ticket = ? AND t.used = FALSE AND t.expires_at > NOW()',
            [ticket]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid or expired ticket' });
        }

        const authTicket = rows[0];

        // Mark ticket as used
        await db.query('UPDATE p3l_auth_tickets SET used = TRUE WHERE id = ?', [authTicket.id]);

        // Return context for the target application to create a session
        res.json({
            valid: true,
            project: {
                id: authTicket.project_id,
                name: authTicket.project_name
            },
            persona: authTicket.persona,
            user_id: authTicket.user_id
        });
    } catch (err) {
        console.error('Error validating SSO ticket:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
