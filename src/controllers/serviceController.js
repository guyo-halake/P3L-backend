
import db from '../config/db.js';
import axios from 'axios';

// Get services for a specific project
export const getServicesByProjectId = async (req, res) => {
    try {
        const { projectId } = req.params;
        const [rows] = await db.execute('SELECT * FROM services WHERE project_id = ? ORDER BY created_at DESC', [projectId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ message: 'Failed to fetch services' });
    }
};

// Create a new service
export const createService = async (req, res) => {
    try {
        const { project_id, name, type, repo_url, repo_name, deploy_url, webhook_url } = req.body;

        if (!project_id || !name || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const [result] = await db.execute(
            `INSERT INTO services (project_id, name, type, repo_url, repo_name, deploy_url, webhook_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [project_id, name, type, repo_url, repo_name, deploy_url, webhook_url]
        );

        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ message: 'Failed to create service' });
    }
};

// Update a service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, repo_url, repo_name, deploy_url, webhook_url } = req.body;

        const fields = [];
        const params = [];

        if (name !== undefined) { fields.push('name = ?'); params.push(name); }
        if (type !== undefined) { fields.push('type = ?'); params.push(type); }
        if (repo_url !== undefined) { fields.push('repo_url = ?'); params.push(repo_url); }
        if (repo_name !== undefined) { fields.push('repo_name = ?'); params.push(repo_name); }
        if (deploy_url !== undefined) { fields.push('deploy_url = ?'); params.push(deploy_url); }
        if (webhook_url !== undefined) { fields.push('webhook_url = ?'); params.push(webhook_url); }

        if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

        params.push(id);
        await db.execute(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, params);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ message: 'Failed to update service' });
    }
};

// Delete a service
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM services WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: 'Failed to delete service' });
    }
};

// Helper to get GitHub Token
const getGithubToken = async (req) => {
    const userId = req.user ? req.user.id : req.query.user_id;
    let githubToken = process.env.GITHUB_TOKEN; // System fallback

    if (userId) {
        try {
            const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [userId]);
            if (rows.length && rows[0].github_token) githubToken = rows[0].github_token;
        } catch (e) {
            console.warn('Failed to fetch user github token:', e);
        }
    }
    return githubToken;
};

// GitHub Proxy: Get Commits
export const getServiceCommits = async (req, res) => {
    try {
        const { repo_name, branch } = req.query; // repo_name e.g. "facebook/react"

        if (!repo_name) return res.status(400).json({ error: 'Missing repo_name parameter' });

        const githubToken = await getGithubToken(req);

        const response = await axios.get(`https://api.github.com/repos/${repo_name}/commits`, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                ...(githubToken ? { Authorization: `token ${githubToken}` } : {})
            },
            params: {
                per_page: 20,
                ...(branch ? { sha: branch } : {})
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching GitHub commits:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch commits' });
    }
};

// GitHub Proxy: Get Branches
export const getGithubBranches = async (req, res) => {
    try {
        const { repo_name } = req.query;
        if (!repo_name) return res.status(400).json({ error: 'Missing repo_name' });

        const githubToken = await getGithubToken(req);

        const response = await axios.get(`https://api.github.com/repos/${repo_name}/branches`, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                ...(githubToken ? { Authorization: `token ${githubToken}` } : {})
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching branches:', error.message);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
};

// GitHub Proxy: Get Pull Requests
export const getGithubPulls = async (req, res) => {
    try {
        const { repo_name, state = 'all' } = req.query; // Default to 'all' to show closed/merged too
        if (!repo_name) return res.status(400).json({ error: 'Missing repo_name' });

        const githubToken = await getGithubToken(req);

        const response = await axios.get(`https://api.github.com/repos/${repo_name}/pulls`, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                ...(githubToken ? { Authorization: `token ${githubToken}` } : {})
            },
            params: { state, sort: 'updated', direction: 'desc', per_page: 20 }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching PRs:', error.message);
        res.status(500).json({ error: 'Failed to fetch PRs' });
    }
};

// GitHub Proxy: Get Issues
export const getGithubIssues = async (req, res) => {
    try {
        const { repo_name } = req.query;
        if (!repo_name) return res.status(400).json({ error: 'Missing repo_name' });

        const githubToken = await getGithubToken(req);

        // GitHub API returns PRs as issues too, so we filter out PRs if possible or client handles it
        // Adding type=issue isn't a simple param, usually search API is needed for strict type
        // For simplicity, we get standard issues endpoint
        const response = await axios.get(`https://api.github.com/repos/${repo_name}/issues`, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                ...(githubToken ? { Authorization: `token ${githubToken}` } : {})
            },
            params: { sort: 'updated', direction: 'desc', per_page: 20 }
        });

        // Basic filtered list (exclude PRs if possible, or frontend filters)
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching Issues:', error.message);
        res.status(500).json({ error: 'Failed to fetch Issues' });
    }
};

// Trigger Deployment via Webhook
export const triggerDeploy = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT webhook_url FROM services WHERE id = ?', [id]);

        if (!rows.length || !rows[0].webhook_url) {
            return res.status(404).json({ message: 'Service not found or no webhook URL set' });
        }

        const webhookUrl = rows[0].webhook_url;

        // Trigger the webhook (usually a POST)
        await axios.post(webhookUrl);

        // Update last_deployed_at
        await db.execute('UPDATE services SET last_deployed_at = NOW() WHERE id = ?', [id]);

        res.json({ success: true, message: 'Deployment triggered successfully' });
    } catch (error) {
        console.error('Error triggering deploy:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to trigger deployment' });
    }
};

// LIST GITHUB REPOS
export const getGithubRepos = async (req, res) => {
    try {
        const githubToken = await getGithubToken(req);

        if (!githubToken) {
            console.error('[GitHub] No token found in env or user table');
            return res.status(401).json({ error: 'GitHub token not configured' });
        }

        // Fetch user repos (sorted by updated)
        console.log('[GitHub] Calling GitHub API...');
        const response = await axios.get('https://api.github.com/user/repos', {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                Authorization: `token ${githubToken}`
            },
            params: {
                sort: 'updated',
                per_page: 100,
                type: 'all'
            }
        });

        console.log(`[GitHub] Success. Found ${response.data.length} repos.`);

        const repos = response.data.map(repo => ({
            id: repo.id,
            name: repo.full_name, // owner/repo
            url: repo.html_url,
            private: repo.private,
            updated_at: repo.updated_at
        }));

        res.json(repos);
    } catch (error) {
        console.error('Error fetching GitHub repos:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch repositories', details: error.message });
    }
};

// LIST VERCEL PROJECTS
export const getVercelProjects = async (req, res) => {
    try {
        const token = process.env.VERCEL_TOKEN || process.env.VITE_VERCEL_TOKEN; // Check both
        if (!token) {
            return res.status(401).json({ error: 'Vercel token not configured' });
        }

        const response = await axios.get('https://api.vercel.com/v9/projects', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const projects = response.data.projects.map(p => ({
            id: p.id,
            name: p.name,
            framework: p.framework,
            link: p.targets?.production?.url ? `https://${p.targets.production.url}` : null,
            updated_at: p.updatedAt
        }));

        res.json(projects);
    } catch (error) {
        console.error('Error fetching Vercel projects:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch Vercel projects' });
    }
};

// LIST VERCEL DEPLOYMENTS
export const getServiceDeployments = async (req, res) => {
    try {
        // We need a way to link service -> vercel project ID. 
        // For now, we might rely on matching by name or if we stored it (we didn't store vercel ID explicitly, only URL).
        // BUT, we can search deployments by name or pass ID if we had it.
        // Let's assume the frontend passes the Vercel Project ID or we search by project name.
        // Better: Pass `vercelProjectId` in query if known, or try to find it.

        // Simpler approach for now: Get deployments for the LINKED REPO if possible, requests to Vercel need projectId/name.
        // Let's rely on query param `vercelId` or `name` passed from frontend relative to the Service.

        const { name } = req.query; // Project Name in Vercel
        const token = process.env.VERCEL_TOKEN || process.env.VITE_VERCEL_TOKEN;

        if (!token || !name) {
            return res.status(400).json({ error: 'Missing token or Vercel project name' });
        }

        // Get deployments for this project
        // https://api.vercel.com/v6/deployments?projectId=... or ?app=name
        const response = await axios.get(`https://api.vercel.com/v6/deployments`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                app: name,
                limit: 10
            }
        });

        res.json(response.data.deployments);
    } catch (error) {
        console.error('Error fetching Vercel deployments:', error.response?.data || error.message);
        // Don't fail hard, just return empty
        res.json([]);
    }
};
