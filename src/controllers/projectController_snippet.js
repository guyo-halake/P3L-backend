
import db from '../config/db.js';
import { sendMailInternal } from './emailController.js';

// ... existing code ...

// Assign a project to a user
export const assignProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

        await db.execute('UPDATE projects SET user_id = ? WHERE id = ?', [user_id, id]);

        // Optional: Notify user
        // const [user] = await db.execute('SELECT email FROM users WHERE id = ?', [user_id]);
        // if (user.length) sendMailInternal({ to: user[0].email, subject: 'Project Assigned', text: `You have been assigned to project #${id}` });

        res.json({ success: true, message: 'Project assigned successfully' });
    } catch (error) {
        console.error('Error assigning project:', error);
        res.status(500).json({ error: 'Failed to assign project' });
    }
};

// Share project via email
export const shareProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body; // Email to share with

        if (!email) return res.status(400).json({ error: 'Missing email' });

        const [project] = await db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        if (!project.length) return res.status(404).json({ error: 'Project not found' });

        const proj = project[0];

        const subject = `Project Shared: ${proj.name}`;
        const text = `
            You have been invited to view the project: ${proj.name}
            
            Description: ${proj.description || 'N/A'}
            Status: ${proj.status}
            
            View here: ${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/projects
        `;

        await sendMailInternal({ to: email, subject, text });

        res.json({ success: true, message: 'Project shared successfully' });
    } catch (error) {
        console.error('Error sharing project:', error);
        res.status(500).json({ error: 'Failed to share project' });
    }
};
