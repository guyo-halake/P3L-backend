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
    if (error.response && error.response.status === 409) {
      // Empty Git repository
      return res.json({ commits: [], branches: [], latestCommit: null, commitsGraph: [] });
    }

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
      milestone_date,
      budget
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
      milestone_date,
      budget || null
    ].map(v => v === undefined ? null : v);

    const [result] = await db.execute(
      `INSERT INTO projects (user_id, client_id, name, description, status, github_repo, vercel_url, type, tech_stack, progress, next_milestone, milestone_date, budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        p.tech_stack, p.progress, p.next_milestone, p.milestone_date, p.budget, p.is_pinned,
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
      tech_stack, progress, next_milestone, milestone_date, budget
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
    if (budget !== undefined) { fields.push('budget = ?'); params.push(budget); }
    if (req.body.is_pinned !== undefined) { fields.push('is_pinned = ?'); params.push(req.body.is_pinned); }

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

    // Log Activity
    const assignerName = req.user ? req.user.username : 'System';
    logActivity('project', `Project #${id} assigned to User #${user_id} by ${assignerName}`, { projectId: id, assigneeId: user_id, assigner: assignerName });

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

export const getProjectTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      "SELECT pt.*, u.username as assignee_name, u.avatar as assignee_avatar FROM project_tasks pt LEFT JOIN users u ON pt.assigned_to = u.id WHERE pt.project_id = ? ORDER BY pt.created_at DESC",
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

import { sendMailInternal } from './emailController.js';
import { getIO } from '../socket.js';

export const createProjectTask = async (req, res) => {
  try {
    const { project_id, assigned_to, title, description, due_date, priority } = req.body;
    const [result] = await db.execute(
      "INSERT INTO project_tasks (project_id, assigned_to, title, description, due_date, status, priority) VALUES (?, ?, ?, ?, ?, 'Todo', ?)",
      [project_id, assigned_to || null, title, description || null, due_date || null, priority || 'Medium']
    );

    // Alert/Notification Logic
    if (assigned_to) {
      const [userRows] = await db.execute("SELECT email, username FROM users WHERE id = ?", [assigned_to]);
      if (userRows.length) {
        const userEmail = userRows[0].email;
        const assignedUsername = userRows[0].username;
        const assignerName = req.user ? req.user.username : 'System';

        // Find project name
        const [projectRows] = await db.execute("SELECT name FROM projects WHERE id = ?", [project_id]);
        const projectName = projectRows.length ? projectRows[0].name : "Unknown Project";

        const messageText = `You were assigned a new task: "${title}" by ${assignerName}`;

        // Create an alert logging the assignment
        await db.execute(
          "INSERT INTO system_alerts (user_id, message, link) VALUES (?, ?, ?)",
          [assigned_to, messageText, `/project/${project_id}`]
        );

        // Send Email
        const emailSubject = `New Task Assignment on ${projectName}: ${title}`;
        const emailText = `Hey, ${assignedUsername}. You have a task on project ${projectName}. Below are the task details, work on it before deadline:\n\n*${title}*\nDescription: ${description || 'N/A'}\nDeadline: ${due_date || 'N/A'}\nAssigned By: ${assignerName}\nProject: ${projectName}\n\nThank you, P3L developers`;
        try {
          await sendMailInternal({ to: userEmail, subject: emailSubject, text: emailText });
        } catch (e) {
          console.error('Failed to send assignment email:', e);
        }

        // Socket Notification
        const io = getIO();
        if (io) {
          io.emit('system_alert', { userId: parseInt(assigned_to), message: messageText, link: `/project/${project_id}` });
        }
      }
    }

    res.json({ id: result.insertId, ...req.body, status: 'Todo' });
  } catch (error) {
    console.error("Error creating project task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
};

export const updateProjectTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, assigned_to, due_date, priority } = req.body;

    const fields = [];
    const params = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to || null); }
    if (due_date !== undefined) { fields.push('due_date = ?'); params.push(due_date || null); }
    if (priority !== undefined) { fields.push('priority = ?'); params.push(priority || 'Medium'); }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields provided to update.' });

    params.push(id);
    await db.execute(`UPDATE project_tasks SET ${fields.join(', ')} WHERE id = ?`, params);

    // If assigned_to changed, notify the user
    if (assigned_to) {
      const [taskRows] = await db.execute("SELECT project_id, title, description, due_date FROM project_tasks WHERE id = ?", [id]);
      if (taskRows.length) {
        const t = taskRows[0];
        const [userRows] = await db.execute("SELECT email, username FROM users WHERE id = ?", [assigned_to]);
        if (userRows.length) {
          const userEmail = userRows[0].email;
          const assignedUsername = userRows[0].username;
          const assignerName = req.user ? req.user.username : 'System';

          const [projectRows] = await db.execute("SELECT name FROM projects WHERE id = ?", [t.project_id]);
          const projectName = projectRows.length ? projectRows[0].name : "Project";

          const messageText = `You have been assigned to task: "${t.title}" on project ${projectName} by ${assignerName}`;

          // Alert entry
          await db.execute("INSERT INTO system_alerts (user_id, message, link) VALUES (?, ?, ?)", [assigned_to, messageText, `/project/${t.project_id}`]);

          // Email dispatch
          const emailSubject = `Project Task Update: ${projectName} - ${t.title}`;
          const emailText = `Hey, ${assignedUsername}.\n\nYou have been assigned a task on project: ${projectName}.\n\nTask Detail: **${t.title}**\nDescription: ${t.description || 'No description'}\nDeadline: ${t.due_date || 'N/A'}\nAssigned By: ${assignerName}\n\nThank you,\nP3L developers`;

          try {
            await sendMailInternal({ to: userEmail, subject: emailSubject, text: emailText });
          } catch (e) { }

          // Real-time toast
          const io = getIO();
          if (io) io.emit('system_alert', { userId: parseInt(assigned_to), message: messageText, link: `/project/${t.project_id}` });
        }
      }
    }

    res.json({ success: true, message: 'Task updated' });
  } catch (error) {
    console.error("Error updating project task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
};

// --- Task Checklist (Mini-Tasks) Logic ---

export const getTaskChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM task_checklists WHERE task_id = ? ORDER BY created_at ASC", [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch checklist" });
  }
};

export const addTaskChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const [result] = await db.execute("INSERT INTO task_checklists (task_id, content, status) VALUES (?, ?, 'not_started')", [id, content]);
    res.json({ id: result.insertId, task_id: id, content, status: 'not_started' });
  } catch (error) {
    res.status(500).json({ message: "Failed to add checklist item" });
  }
};

export const updateTaskChecklistItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { content, status } = req.body;

    const fields = [];
    const params = [];
    if (content !== undefined) { fields.push('content = ?'); params.push(content); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }

    if (fields.length === 0) return res.status(400).json({ message: "No data provided" });

    params.push(itemId);
    await db.execute(`UPDATE task_checklists SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to update checklist item" });
  }
};

export const deleteTaskChecklistItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    await db.execute("DELETE FROM task_checklists WHERE id = ?", [itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete checklist item" });
  }
};

export const sendTaskReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { customText, sendToUser } = req.body; // customText is optional

    const [taskRows] = await db.execute("SELECT * FROM project_tasks WHERE id = ?", [id]);
    if (!taskRows.length) return res.status(404).json({ message: "Task not found" });
    const t = taskRows[0];

    // Priority recipient
    const recipientId = sendToUser || t.assigned_to;
    if (!recipientId) return res.status(400).json({ message: "No assignee for this task" });

    const [userRows] = await db.execute("SELECT email, username FROM users WHERE id = ?", [recipientId]);
    if (!userRows.length) return res.status(404).json({ message: "User not found" });
    const user = userRows[0];

    const [projRows] = await db.execute("SELECT name FROM projects WHERE id = ?", [t.project_id]);
    const projectName = projRows.length ? projRows[0].name : "Project";

    // Time calculation
    let timeRemainingStr = "N/A";
    if (t.due_date) {
      const now = new Date();
      const due = new Date(t.due_date);
      const diffMs = due - now;
      if (diffMs > 0) {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        timeRemainingStr = `${diffHrs}hrs ${diffMins}mins`;
      } else {
        timeRemainingStr = "OVERDUE";
      }
    }

    const reminderHeader = `P3L Reminders: Your "${t.title}" on ${projectName} is due in ${timeRemainingStr}. please work on it.`;
    const finalMessage = customText ? `${reminderHeader}\n\nNote: ${customText}` : reminderHeader;

    // Dispatch
    await sendMailInternal({
      to: user.email,
      subject: `[REMINDER] ${t.title} - ${projectName}`,
      text: finalMessage
    });

    // Also send in-app alert
    await db.execute("INSERT INTO system_alerts (user_id, message, link) VALUES (?, ?, ?)", [recipientId, reminderHeader, `/tasks`]);
    const io = getIO();
    if (io) io.emit('system_alert', { userId: parseInt(recipientId), message: reminderHeader, link: `/tasks` });

    res.json({ success: true, message: "Reminder sent successfully" });
  } catch (error) {
    console.error("Reminder error:", error);
    res.status(500).json({ message: "Failed to send reminder" });
  }
};

export const getProjectActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM system_activities WHERE project_id = ? ORDER BY created_at DESC", [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activity" });
  }
};

export const getProjectMilestones = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM project_milestones WHERE project_id = ? ORDER BY due_date ASC", [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch milestones" });
  }
};

export const addProjectMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date } = req.body;
    const [result] = await db.execute("INSERT INTO project_milestones (project_id, title, description, due_date) VALUES (?, ?, ?, ?)", [id, title, description, due_date]);
    res.json({ id: result.insertId, project_id: id, title, description, due_date, status: 'pending' });
  } catch (error) {
    res.status(500).json({ message: "Failed to add milestone" });
  }
};

export const getProjectDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM project_documents WHERE project_id = ? ORDER BY uploaded_at DESC", [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};

export const getProjectInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM invoices WHERE project_id = ? ORDER BY date DESC", [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};
