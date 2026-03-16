import db from '../config/db.js';

export const listOrgs = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [rows] = await db.execute(
      `SELECT o.id, o.name, o.created_at
       FROM orgs o
       INNER JOIN org_members m ON m.org_id = o.id
       WHERE m.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('listOrgs error:', err);
    return res.status(500).json({ message: 'Failed to load orgs' });
  }
};

export const createOrg = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Org name is required' });

    const [result] = await db.execute('INSERT INTO orgs (name, created_by) VALUES (?, ?)', [name, userId]);
    const orgId = result.insertId;

    // creator becomes owner
    await db.execute('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)', [orgId, userId, 'owner']);

    return res.status(201).json({ id: orgId, name });
  } catch (err) {
    console.error('createOrg error:', err);
    return res.status(500).json({ message: 'Failed to create org' });
  }
};

export const listBusinessUnits = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { orgId } = req.params;
    if (!orgId) return res.status(400).json({ message: 'orgId is required' });

    // Ensure membership
    const [mem] = await db.execute('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?', [orgId, userId]);
    if (!mem.length) return res.status(403).json({ message: 'Not a member of this org' });

    const [rows] = await db.execute(
      'SELECT id, org_id, name, created_at FROM business_units WHERE org_id = ? ORDER BY created_at DESC',
      [orgId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('listBusinessUnits error:', err);
    return res.status(500).json({ message: 'Failed to load business units' });
  }
};

export const createBusinessUnit = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { orgId } = req.params;
    const { name } = req.body;
    if (!orgId) return res.status(400).json({ message: 'orgId is required' });
    if (!name) return res.status(400).json({ message: 'Business unit name is required' });

    const [mem] = await db.execute('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?', [orgId, userId]);
    if (!mem.length) return res.status(403).json({ message: 'Not a member of this org' });
    const role = mem[0].role;
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Insufficient permissions' });

    const [result] = await db.execute('INSERT INTO business_units (org_id, name, created_by) VALUES (?, ?, ?)', [orgId, name, userId]);
    return res.status(201).json({ id: result.insertId, org_id: Number(orgId), name });
  } catch (err) {
    console.error('createBusinessUnit error:', err);
    return res.status(500).json({ message: 'Failed to create business unit' });
  }
};

import axios from 'axios';

// Get all repos (personal + org) for the authenticated user
export const getAllGitHubRepos = async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }
  try {
    const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [user_id]);
    if (rows.length === 0 || !rows[0].github_token) {
      return res.status(404).json({ message: 'GitHub token not found for user' });
    }
    const githubToken = rows[0].github_token;
    // Fetch personal repos (owner)
    const personalRes = await axios.get('https://api.github.com/user/repos?type=owner&sort=updated&per_page=100', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    // Fetch org repos (member)
    const orgRes = await axios.get('https://api.github.com/user/repos?type=member&sort=updated&per_page=100', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    // Combine and deduplicate by repo id
    const allRepos = [...personalRes.data, ...orgRes.data].filter((repo, idx, arr) => arr.findIndex(r => r.id === repo.id) === idx);
    res.json(allRepos);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch GitHub repos', error: error.message });
  }
};
