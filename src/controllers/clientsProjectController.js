
import db from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { sendMailInternal } from './emailController.js';

export const createClientsProject = async (req, res) => {
    try {
        const {
            project_name,
            client_name,
            description,
            github_repos,
            vercel_url,
            deadline,
            budget,
            dev_assigned_id,
            project_type
        } = req.body;

        if (!project_name || !client_name) {
            return res.status(400).json({ message: 'Project name and client name are required' });
        }

        const [result] = await db.execute(
            `INSERT INTO clients_projects 
            (project_name, client_name, project_type, description, github_repos, vercel_url, deadline, budget, dev_assigned_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                project_name,
                client_name,
                project_type || 'Web APP',
                description || null,
                github_repos ? JSON.stringify(github_repos) : null,
                vercel_url || null,
                deadline || null,
                budget || null,
                dev_assigned_id || null
            ]
        );

        const projectId = result.insertId;

        // If a developer is assigned, send them an email notification
        if (dev_assigned_id) {
            try {
                const [userRows] = await db.execute('SELECT username, email FROM users WHERE id = ?', [dev_assigned_id]);
                if (userRows.length > 0) {
                    const dev = userRows[0];
                    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
                    const subject = `New Project Assignment: ${project_name}`;
                    const text = `Hi, ${dev.username},\n\nYou have been assigned a project.\n\nProject Name: ${project_name}\nDescription: ${description || 'N/A'}\nClient Name: ${client_name}\nDeadline: ${deadline || 'N/A'}\n\nPlease login to your POA account and accept: ${loginUrl}`;

                    const html = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #333;">New Project Assignment</h2>
                            <p>Hi, <strong>${dev.username}</strong>,</p>
                            <p>You have been assigned a new project on P3L.</p>
                            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Project Name:</strong> ${project_name}</p>
                                <p style="margin: 5px 0;"><strong>Client Name:</strong> ${client_name}</p>
                                <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadline || 'N/A'}</p>
                                <p style="margin: 5px 0;"><strong>Description:</strong> ${description || 'N/A'}</p>
                            </div>
                            <p>Please login to your POA account to view the details and accept the assignment.</p>
                            <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #facc15; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Login to POA Account</a>
                        </div>
                    `;

                    await sendMailInternal({ to: dev.email, subject, text, html });
                }
            } catch (emailErr) {
                console.error('Failed to notify assigned dev via email:', emailErr);
            }
        }

        res.status(201).json({ id: projectId, ...req.body });
        logActivity('project', `New client project "${project_name}" created for ${client_name}`, { projectId });
    } catch (error) {
        console.error('Error creating client project:', error);
        res.status(500).json({ message: 'Failed to create client project', error: error.message });
    }
};

export const getClientsProjects = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT cp.*, u.username as dev_name, u.avatar as dev_avatar 
            FROM clients_projects cp
            LEFT JOIN users u ON cp.dev_assigned_id = u.id
            ORDER BY cp.created_at DESC
        `);
        // Parse JSON github_repos
        const parsedRows = rows.map(row => ({
            ...row,
            github_repos: row.github_repos ? (typeof row.github_repos === 'string' ? JSON.parse(row.github_repos) : row.github_repos) : []
        }));
        res.json(parsedRows);
    } catch (error) {
        console.error('Error fetching client projects:', error);
        res.status(500).json({ message: 'Failed to fetch client projects', error: error.message });
    }
};

export const deleteClientsProject = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM clients_projects WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting client project:', error);
        res.status(500).json({ message: 'Failed to delete client project' });
    }
};

export const updateClientsProject = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const fields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (['project_name', 'client_name', 'project_type', 'description', 'github_repos', 'vercel_url', 'deadline', 'budget', 'dev_assigned_id'].includes(key)) {
                fields.push(`${key} = ?`);
                params.push(key === 'github_repos' ? JSON.stringify(updates[key]) : updates[key]);
            }
        });

        if (fields.length === 0) return res.status(400).json({ message: 'No valid fields to update' });

        console.log(`[Update] Project ID ${id} fields:`, fields, 'params:', params);
        params.push(id);
        await db.execute(`UPDATE clients_projects SET ${fields.join(', ')} WHERE id = ?`, params);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Update failed' });
    }
};

export const shareClientsProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { shareWith, via } = req.body; // shareWith is email or user_id, via is 'email', 'in-app', or 'both'

        const [pRows] = await db.execute('SELECT * FROM clients_projects WHERE id = ?', [id]);
        if (pRows.length === 0) return res.status(404).json({ message: 'Project not found' });
        const project = pRows[0];

        // Find recipient
        const [uRows] = await db.execute('SELECT id, email, username FROM users WHERE email = ? OR id = ?', [shareWith, shareWith]);
        if (uRows.length === 0) return res.status(404).json({ message: 'User not found' });
        const targetUser = uRows[0];

        const details = `
            Project: ${project.project_name}
            Client: ${project.client_name}
            Type: ${project.project_type}
            Vercel: ${project.vercel_url || 'N/A'}
            Repos: ${project.github_repos}
        `;

        if (via === 'in-app' || via === 'both') {
            await db.execute(
                'INSERT INTO notifications (user_id, type, message, is_read, created_at) VALUES (?, ?, ?, FALSE, NOW())',
                [targetUser.id, 'project_shared', `A full project "${project.project_name}" has been shared with you.`]
            );
        }

        if (via === 'email' || via === 'both') {
            await sendMailInternal({
                to: targetUser.email,
                subject: `Shared Project: ${project.project_name}`,
                text: `Hi ${targetUser.username}, here are the details for the project shared with you:\n\n${details}`,
                html: `<div style="font-family: sans-serif;">
                    <h2>Project Shared: ${project.project_name}</h2>
                    <p><strong>Client:</strong> ${project.client_name}</p>
                    <p><strong>Type:</strong> ${project.project_type}</p>
                    <p><strong>Live URL:</strong> <a href="${project.vercel_url}">${project.vercel_url}</a></p>
                    <p>Refer to the dashboard for more details.</p>
                </div>`
            });
        }

        res.json({ success: true, message: 'Project shared successfully' });
    } catch (error) {
        console.error('Error sharing project:', error);
        res.status(500).json({ message: 'Sharing failed' });
    }
};
