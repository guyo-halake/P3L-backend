// Fetch commit and branch data for a GitHub repo
export const getGitHubRepoActivity = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Missing owner or repo parameter' });
    }
    let githubToken = null;
    try {
      if (user_id) {
        const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [user_id]);
        if (rows.length && rows[0].github_token) githubToken = rows[0].github_token;
      }
    } catch { }
    // Fetch commits (last 30)
    const commitsRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      },
      params: { per_page: 30 }
    });
    // Fetch branches
    const branchesRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      }
    });

    // Find the latest commit and extract author name (fallback to commit.commit.author.name if author is null)
    const latestCommitRaw = Array.isArray(commitsRes.data) && commitsRes.data.length > 0 ? commitsRes.data[0] : null;
    let latestCommit = null;
    if (latestCommitRaw) {
      latestCommit = {
        sha: latestCommitRaw.sha,
        message: latestCommitRaw.commit?.message || '',
        author: {
          name: latestCommitRaw.author?.login || latestCommitRaw.commit?.author?.name || 'Unknown',
          avatar_url: latestCommitRaw.author?.avatar_url || null,
        },
        date: latestCommitRaw.commit?.author?.date || null,
        url: latestCommitRaw.html_url || null,
      };
    }

    // Build a simple activity graph (commits per day for the last 7 days)
    const now = new Date();
    const commitsGraph = Array(7).fill(0).map((_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - i));
      const dayStr = day.toISOString().slice(0, 10);
      const count = (commitsRes.data || []).filter(c => (c.commit?.author?.date || '').slice(0, 10) === dayStr).length;
      return { name: dayStr, value: count };
    });

    res.json({
      commits: commitsRes.data,
      branches: branchesRes.data,
      latestCommit,
      commitsGraph
    });
  } catch (error) {
    console.error('Error fetching GitHub repo activity:', error);
    if (error.response) {
      return res.status(500).json({
        error: 'Failed to fetch GitHub repo activity',
        details: error.message,
        githubResponse: error.response.data
      });
    }
    res.status(500).json({ error: 'Failed to fetch GitHub repo activity', details: error.message });
  }
};
import axios from 'axios';

// Fetch all Vercel projects using the backend token
export const getVercelProjects = async (req, res) => {
  try {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      console.error('VERCEL_TOKEN not set in backend .env');
      return res.status(500).json({ error: 'VERCEL_TOKEN not set in backend .env' });
    }
    const response = await axios.get('https://api.vercel.com/v6/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Vercel projects:', error);
    if (error.response) {
      console.error('Vercel API response:', error.response.data);
      return res.status(500).json({
        error: 'Failed to fetch Vercel projects',
        details: error.message,
        vercelResponse: error.response.data
      });
    }
    res.status(500).json({ error: 'Failed to fetch Vercel projects', details: error.message });
  }
};

// Fetch deployments for a Vercel project by name
export const getVercelDeployments = async (req, res) => {
  try {
    const token = process.env.VERCEL_TOKEN;
    const { project } = req.query; // project name (slug)
    if (!token) {
      return res.status(500).json({ error: 'VERCEL_TOKEN not set in backend .env' });
    }
    if (!project) {
      return res.status(400).json({ error: 'Missing project parameter' });
    }
    const response = await axios.get(`https://api.vercel.com/v6/deployments?project=${encodeURIComponent(project)}&limit=20`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Vercel deployments:', error);
    if (error.response) {
      return res.status(500).json({
        error: 'Failed to fetch Vercel deployments',
        details: error.message,
        vercelResponse: error.response.data,
      });
    }
    res.status(500).json({ error: 'Failed to fetch Vercel deployments', details: error.message });
  }
};
// Fetch events/logs for a specific Vercel deployment ID
export const getVercelDeploymentEvents = async (req, res) => {
  try {
    const token = process.env.VERCEL_TOKEN;
    const { deploymentId, limit = 200 } = req.query;
    if (!token) {
      return res.status(500).json({ error: 'VERCEL_TOKEN not set in backend .env' });
    }
    if (!deploymentId) {
      return res.status(400).json({ error: 'Missing deploymentId parameter' });
    }
    // Attempt v3 events endpoint
    const response = await axios.get(`https://api.vercel.com/v3/deployments/${encodeURIComponent(deploymentId)}/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      params: { limit }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Vercel deployment events:', error?.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: 'Failed to fetch Vercel deployment events', details: error.message, vercelResponse: error.response?.data });
  }
};
// Save a Vercel project to the backend
export const saveVercelProject = async (req, res) => {
  try {
    // Accept Vercel project fields and map to backend columns
    const {
      name,
      vercel_url,
      description = null,
      status = null,
      github_repo = null
    } = req.body;

    if (!name || !vercel_url) {
      return res.status(400).json({ message: 'Missing required fields: name, vercel_url' });
    }

    // Always set client_id and user_id to null for Vercel projects
    const user_id = null;
    const client_id = null;
    const params = [user_id, client_id, name, description, status, github_repo, vercel_url];
    const [result] = await db.execute(
      `INSERT INTO projects (user_id, client_id, name, description, status, github_repo, vercel_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params
    );

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error saving Vercel project:', error);
    if (error && error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    res.status(500).json({
      message: 'Failed to save Vercel project',
      error: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      errno: error.errno
    });
  }
};
import db from '../config/db.js';
import { notifyAdminNewProject } from './emailController.js';


// Create a new project (matching new schema)
export const createProject = async (req, res) => {
  try {

    // Ensure all fields are not undefined (convert to null if undefined)
    const {
      user_id,
      client_id,
      name,
      description,
      status,
      github_repo,
      vercel_url
    } = req.body;

    const params = [user_id, client_id, name, description, status, github_repo, vercel_url].map(v => v === undefined ? null : v);

    const [result] = await db.execute(
      `INSERT INTO projects (user_id, client_id, name, description, status, github_repo, vercel_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params
    );

    // Send Admin Notification asynchronously
    notifyAdminNewProject({
      name,
      client_id, // We'd ideally want the name, but ID is what we have handy
      description,
      status: status || 'active',
      github_repo,
      vercel_url
    });

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error && error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    res.status(500).json({
      message: 'Failed to create project',
      error: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      errno: error.errno
    });
  }
};


// Get all projects (matching new schema)
export const getProjects = async (req, res) => {
  try {
    // Join clients to get client name as 'client'
    const [rows] = await db.execute(`
      SELECT 
        p.id, p.user_id, p.client_id, p.name, p.description, p.status, p.github_repo, p.vercel_url, p.created_at,
        c.name AS client
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    if (error && error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    res.status(500).json({
      message: 'Failed to fetch projects',
      error: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      errno: error.errno
    });
  }
};

// Delete a project by id
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Project id is required' });
    }
    const [result] = await db.execute('DELETE FROM projects WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
};

// Update a project (e.g., rename, status, urls)
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Project id is required' });
    const { name, description, status, github_repo, vercel_url, client_id, user_id } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (github_repo !== undefined) { fields.push('github_repo = ?'); params.push(github_repo); }
    if (vercel_url !== undefined) { fields.push('vercel_url = ?'); params.push(vercel_url); }
    if (client_id !== undefined) { fields.push('client_id = ?'); params.push(client_id); }
    if (user_id !== undefined) { fields.push('user_id = ?'); params.push(user_id); }
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    params.push(id);
    const [result] = await db.execute(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Project not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
};
