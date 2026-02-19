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
    logActivity('project', `Vercel project "${name}" imported`, { projectId: result.insertId, vercelUrl: vercel_url });
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
import { logActivity } from '../utils/activityLogger.js';

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
      vercel_url,
      type,
      tech_stack,
      progress,
      next_milestone,
      milestone_date
    } = req.body;

    const params = [
      user_id,
      client_id,
      name,
      description,
      status,
      github_repo,
      vercel_url,
      type,
      tech_stack ? JSON.stringify(tech_stack) : null,
      progress || 0,
      next_milestone,
      milestone_date
    ].map(v => v === undefined ? null : v);

    const [result] = await db.execute(
      `INSERT INTO projects (user_id, client_id, name, description, status, github_repo, vercel_url, type, tech_stack, progress, next_milestone, milestone_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );

    // Send Admin Notification asynchronously
    notifyAdminNewProject({
      name,
      client_id,
      description,
      status: status || 'active',
      github_repo,
      vercel_url,
      type
    });

    // Log System Activity
    const creatorName = req.user ? req.user.username : 'Unknown User';
    logActivity('project', `New project "${name}" created by ${creatorName}`, { projectId: result.insertId, user_id, creator: creatorName });

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
    // Join clients to get client name as 'client', and users to get assignee details
    const [rows] = await db.execute(`
      SELECT 
        p.id, p.user_id, p.client_id, p.name, p.description, p.status, p.github_repo, p.vercel_url, p.created_at, p.type,
        p.tech_stack, p.progress, p.next_milestone, p.milestone_date,
        c.name AS client,
        u.username AS assigned_user_name,
        u.avatar AS assigned_user_avatar
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
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
    const deleterName = req.user ? req.user.username : 'Admin';
    logActivity('project', `Project #${id} deleted by ${deleterName}`, { projectId: id, deleter: deleterName });
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
    const {
      name, description, status, github_repo, vercel_url, client_id, user_id, type,
      tech_stack, progress, next_milestone, milestone_date
    } = req.body;

    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (github_repo !== undefined) { fields.push('github_repo = ?'); params.push(github_repo); }
    if (vercel_url !== undefined) { fields.push('vercel_url = ?'); params.push(vercel_url); }
    if (client_id !== undefined) { fields.push('client_id = ?'); params.push(client_id); }
    if (user_id !== undefined) { fields.push('user_id = ?'); params.push(user_id); }
    if (type !== undefined) { fields.push('type = ?'); params.push(type); }
    if (tech_stack !== undefined) { fields.push('tech_stack = ?'); params.push(JSON.stringify(tech_stack)); }
    if (progress !== undefined) { fields.push('progress = ?'); params.push(progress); }
    if (next_milestone !== undefined) { fields.push('next_milestone = ?'); params.push(next_milestone); }
    if (milestone_date !== undefined) { fields.push('milestone_date = ?'); params.push(milestone_date); }

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

// Assign a project to a user
export const assignProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    const [result] = await db.execute('UPDATE projects SET user_id = ? WHERE id = ?', [user_id, id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Project not found' });

    // Create Notification
    try {
      await db.execute(
        'INSERT INTO notifications (user_id, type, message, is_read, created_at) VALUES (?, ?, ?, FALSE, NOW())',
        [user_id, 'project_assigned', `You have been assigned to project #${id}`]
      );
    } catch (e) { console.error('Failed to create notification', e); }

    res.json({ success: true, message: 'Project assigned successfully' });

    res.json({ success: true, message: 'Project assigned successfully' });

    // Log Activity
    const assignerName = req.user ? req.user.username : 'System';
    logActivity('project', `Project #${id} assigned to User #${user_id} by ${assignerName}`, { projectId: id, assigneeId: user_id, assigner: assignerName });
  } catch (error) {
    console.error('Error assigning project:', error);
    res.status(500).json({ error: 'Failed to assign project' });
  }
};

// Share project via email
export const shareProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });

    const [project] = await db.execute('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project.length) return res.status(404).json({ error: 'Project not found' });

    // Check if user exists with this email to notify them internally
    const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      const userId = users[0].id;
      await db.execute(
        'INSERT INTO notifications (user_id, type, message, is_read, created_at) VALUES (?, ?, ?, FALSE, NOW())',
        [userId, 'project_shared', `Project "${project[0].name}" has been shared with you.`]
      );
    }

    // Mock email sending for now or use internal helper if imported
    console.log(`[Share] Project ${id} shared with ${email}`);

    res.json({ success: true, message: `Project shared with ${email}` });
  } catch (error) {
    console.error('Error sharing project:', error);
    res.status(500).json({ error: 'Failed to share project' });
  }
};
