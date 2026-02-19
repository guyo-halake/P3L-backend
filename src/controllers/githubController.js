// --- GitHub OAuth Setup ---

import axios from 'axios';
import db from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// Step 1: Redirect user to GitHub for login

export const githubLogin = (req, res) => {
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || process.env.PROD_REDIRECT_URI || 'http://localhost:5000/api/github/callback';

  if (!CLIENT_ID) {
    console.error("GITHUB_CLIENT_ID is missing in backend env!");
    return res.status(500).send("Server Error: Missing GitHub Client ID");
  }

  const scope = encodeURIComponent('repo read:user user:email');
  // prompt=consent ensures the user is asked to authorize every time, complying with "request access"
  // Pass returnTo URL and user_id in the state parameter to preserve it through the OAuth flow
  const returnTo = req.query.returnTo;
  const userId = req.query.user_id;

  const stateObj = {
    returnTo: returnTo || '',
    userId: userId || ''
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&prompt=consent&state=${state}`;
  console.log("Redirecting to GitHub Auth:", githubAuthUrl);
  res.redirect(githubAuthUrl);
};

// Step 2: GitHub redirects back with code, exchange for access token

// Step 2: GitHub redirects back with code, exchange for access token

export const githubCallback = async (req, res) => {
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || process.env.PROD_REDIRECT_URI || 'http://localhost:5000/api/github/callback';

  const code = req.query.code;
  try {
    // Exchange code for access token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }, {
      headers: { Accept: 'application/json', 'User-Agent': 'P3L-App' }
    });
    const accessToken = tokenRes.data.access_token;
    // Guard: Ensure token exchange succeeded
    if (!accessToken) {
      const tokenError = {
        error: tokenRes.data?.error || 'no_access_token',
        error_description: tokenRes.data?.error_description,
        error_uri: tokenRes.data?.error_uri,
      };
      return res.status(401).json({ error: 'OAuth token exchange failed', details: 'Missing access_token from GitHub', githubResponse: tokenError });
    }
    // Fetch GitHub user profile
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'P3L-App', Accept: 'application/vnd.github+json' }
    });
    let emailRes = null;
    try {
      emailRes = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'P3L-App', Accept: 'application/vnd.github+json' }
      });
    } catch (e) {
      // If the integration cannot access emails (e.g., GitHub App token), continue with fallback
      if (e.response?.status !== 403) throw e;
    }
    const githubUser = userRes.data;
    // Find primary email
    let primaryEmail = githubUser.email;
    if (!primaryEmail && Array.isArray(emailRes?.data)) {
      const primaryObj = emailRes.data.find(e => e.primary && e.verified);
      if (primaryObj) primaryEmail = primaryObj.email;
    }
    // Fallback: create a unique noreply email if email is private or inaccessible
    if (!primaryEmail) {
      const login = githubUser.login || 'githubuser';
      const id = githubUser.id || Math.floor(Math.random() * 1e9);
      primaryEmail = `${id}+${login}@users.noreply.github.com`;
    }
    // Check if user exists by email
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [primaryEmail]);
    if (existing.length === 0) {
      // Insert new user
      await db.execute(
        'INSERT INTO users (username, email, password, avatar, github_token, user_type) VALUES (?, ?, ?, ?, ?, ?)',
        [
          githubUser.login,
          primaryEmail,
          '', // No password for OAuth users
          githubUser.avatar_url || null,
          accessToken,
          'dev'
        ]
      );
    } else {
      // Update github_token for existing user
      await db.execute('UPDATE users SET github_token = ? WHERE email = ?', [accessToken, primaryEmail]);
    }
    req.session.githubToken = accessToken;

    // Check for returnTo in state
    // Check for state to get returnTo and userId
    const state = req.query.state;
    let returnTo = null;
    let userId = null;

    if (state) {
      try {
        const stateStr = Buffer.from(state, 'base64').toString('ascii');
        // Try parsing as JSON (new format)
        try {
          const data = JSON.parse(stateStr);
          returnTo = data.returnTo;
          userId = data.userId;
        } catch (e) {
          // Fallback for old format (just returnTo string)
          returnTo = stateStr;
        }
      } catch (e) {
        console.error("Failed to decode state:", e);
      }
    }

    if (userId) {
      console.log(`Linking GitHub token to existing User ID: ${userId}`);
      await db.execute('UPDATE users SET github_token = ? WHERE id = ?', [accessToken, userId]);
    } else {
      // Fallback: Identify user by GitHub email
      // Fetch GitHub user profile
      const userRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'P3L-App', Accept: 'application/vnd.github+json' }
      });

      // ... (existing email fetching logic reused)
      let emailRes = null;
      try {
        emailRes = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'P3L-App', Accept: 'application/vnd.github+json' }
        });
      } catch (e) {
        if (e.response?.status !== 403) throw e;
      }
      const githubUser = userRes.data;
      let primaryEmail = githubUser.email;
      if (!primaryEmail && Array.isArray(emailRes?.data)) {
        const primaryObj = emailRes.data.find(e => e.primary && e.verified);
        if (primaryObj) primaryEmail = primaryObj.email;
      }
      if (!primaryEmail) {
        const login = githubUser.login || 'githubuser';
        const id = githubUser.id || Math.floor(Math.random() * 1e9);
        primaryEmail = `${id}+${login}@users.noreply.github.com`;
      }

      const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [primaryEmail]);
      if (existing.length === 0) {
        await db.execute(
          'INSERT INTO users (username, email, password, avatar, github_token, user_type) VALUES (?, ?, ?, ?, ?, ?)',
          [githubUser.login, primaryEmail, '', githubUser.avatar_url || null, accessToken, 'dev']
        );
      } else {
        await db.execute('UPDATE users SET github_token = ? WHERE email = ?', [accessToken, primaryEmail]);
      }
    }

    req.session.githubToken = accessToken;

    // Redirect logic
    if (returnTo) {
      if (returnTo.startsWith('/') || returnTo.startsWith('http://localhost')) {
        console.log("Redirecting user back to:", returnTo);
        return res.redirect(process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}${returnTo}` : `http://localhost:8080${returnTo}`);
      }
    }

    // Default redirect if no returnTo
    res.redirect(process.env.FRONTEND_REDIRECT_URI || 'http://localhost:8080/github');
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || {};

    // Friendly error page or JSON? JSON for now but better message.
    if (status === 403 && data.message?.includes("rate limit")) {
      return res.status(403).send(`
            <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>GitHub Rate Limit Exceeded</h1>
                <p>We are making too many requests to GitHub. Please wait a few minutes and try again.</p>
                <p>Status: ${status}</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}">Return to Dashboard</a>
            </body>
            </html>
        `);
    }

    res.status(status).json({ error: 'OAuth failed', details: err.message, githubResponse: data });
  }
};
// Helper: get GitHub token for a user
async function getGithubTokenForUser(user_id) {
  if (!user_id) return null;
  const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [user_id]);
  if (rows.length && rows[0].github_token) return rows[0].github_token;
  return null;
}
// Get all GitHub repos for the authenticated user (owner + member)
export const getAllGitHubRepos = async (req, res) => {
  const { user_id } = req.query;

  let githubToken = req.session?.githubToken;

  // If no session token, try to find it by user_id
  if (!githubToken && user_id) {
    const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [user_id]);
    if (rows.length > 0) {
      githubToken = rows[0].github_token;
    }
  }

  if (!githubToken) {
    // Return empty array instead of 401 to avoid console errors
    return res.json([]);
  }

  try {
    // Fetch all repos (owner + member)
    const response = await axios.get('https://api.github.com/user/repos?type=all&sort=updated', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    // If token is invalid (revoked), return empty list and maybe flag user?
    if (status === 401) return res.json([]);
    res.status(status).json({ message: 'Failed to fetch all GitHub repos', error: error.message, githubResponse: error.response?.data });
  }
};

// Simple in-memory cache for token validation: { userId: { user: Object, timestamp: Number } }
const userValidationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Validate current GitHub token by calling /user
export const getGithubMe = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: 'user_id is required' });

    // Check Cache
    const cached = userValidationCache.get(user_id);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json({ valid: true, user: cached.user });
    }

    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) {
      // Return 200 with valid:false so frontend doesn't log network error
      return res.json({ valid: false, message: 'No GitHub token found' });
    }
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App', Accept: 'application/vnd.github+json' }
    });

    // Update Cache
    userValidationCache.set(user_id, { user: userRes.data, timestamp: Date.now() });

    return res.json({ valid: true, user: userRes.data });
  } catch (error) {
    const status = error.response?.status || 500;
    if (status === 401) {
      // Token expired/revoked
      return res.json({ valid: false, message: 'Token expired' });
    }
    // If rate limited, maybe return cached if available (stale-while-revalidate logic)?
    // For now just error but check status
    if (status === 403 && error.response?.data?.message?.includes("rate limit")) {
      // If we have STALE cache, return it to keep app working?
      const cached = userValidationCache.get(req.query.user_id);
      if (cached) return res.json({ valid: true, user: cached.user, warning: 'Rate limited, serving stale data' });
    }

    return res.status(status).json({ message: 'GitHub token validation failed', error: error.message, githubResponse: error.response?.data });
  }
};
// List branches for a repo
export const getRepoBranches = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    if (!owner || !repo) return res.status(400).json({ message: 'owner and repo are required' });
    const githubToken = await getGithubTokenForUser(user_id);
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch branches', error: error.message, githubResponse: error.response?.data });
  }
};

// List commits for a repo (optionally for a branch)
export const getRepoCommits = async (req, res) => {
  try {
    const { owner, repo, user_id, branch } = req.query;
    if (!owner || !repo) return res.status(400).json({ message: 'owner and repo are required' });
    const githubToken = await getGithubTokenForUser(user_id);
    const url = `https://api.github.com/repos/${owner}/${repo}/commits`;
    const response = await axios.get(url, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      },
      params: {
        per_page: 50,
        ...(branch ? { sha: branch } : {}),
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch commits', error: error.message, githubResponse: error.response?.data });
  }
};

// List pull requests for a repo
export const getRepoPulls = async (req, res) => {
  try {
    const { owner, repo, user_id, state } = req.query;
    if (!owner || !repo) return res.status(400).json({ message: 'owner and repo are required' });
    const githubToken = await getGithubTokenForUser(user_id);
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      },
      params: { state: state || 'open', per_page: 50 },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch pulls', error: error.message, githubResponse: error.response?.data });
  }
};

// List issues for a repo
export const getRepoIssues = async (req, res) => {
  try {
    const { owner, repo, user_id, state } = req.query;
    if (!owner || !repo) return res.status(400).json({ message: 'owner and repo are required' });
    const githubToken = await getGithubTokenForUser(user_id);
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github.v3+json',
      },
      params: { state: state || 'open', per_page: 50 },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch issues', error: error.message, githubResponse: error.response?.data });
  }
};

// import { logActivity } from '../utils/activityLogger.js';

// ... (existing imports)

// ...

// Create pull request
export const createPullRequest = async (req, res) => {
  try {
    const { owner, repo, user_id, title, head, base, body } = req.body;
    if (!owner || !repo || !title || !head || !base) {
      return res.status(400).json({ message: 'owner, repo, title, head, and base are required' });
    }

    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.post(`https://api.github.com/repos/${owner}/${repo}/pulls`,
      { title, head, base, body },
      { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'P3L-App' } }
    );

    await logActivity('github', `Created PR: ${title} in ${owner}/${repo}`, {
      repo: `${owner}/${repo}`,
      pr_number: response.data.number,
      url: response.data.html_url,
      user_id
    });

    res.status(201).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Failed to create pull request', error: error.message, githubResponse: error.response?.data });
  }
};

// Merge a pull request
export const mergePullRequest = async (req, res) => {
  try {
    const { owner, repo, user_id, number, merge_method, commit_title } = req.body;
    // ...
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });
    const response = await axios.put(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/merge`,
      { merge_method: merge_method || 'merge', commit_title: commit_title || undefined },
      { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
    );

    // Log Activity
    await logActivity('github', `Merged PR #${number} in ${owner}/${repo}`, {
      repo: `${owner}/${repo}`,
      pr_number: number,
      action: 'merge',
      user_id
    });

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Failed to merge pull request', error: error.message, githubResponse: error.response?.data });
  }
};

// Create a new branch
export const createBranch = async (req, res) => {
  try {
    const { owner, repo, user_id, new_branch, from_branch } = req.body;
    if (!owner || !repo || !new_branch || !from_branch) {
      return res.status(400).json({ message: 'owner, repo, new_branch, and from_branch are required' });
    }

    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    // 1. Get SHA of the from_branch
    const branchRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches/${from_branch}`, {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App' }
    });
    const baseSha = branchRes.data.commit.sha;

    // 2. Create new reference
    const createRes = await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/refs`,
      { ref: `refs/heads/${new_branch}`, sha: baseSha },
      { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'P3L-App' } }
    );

    await logActivity('github', `Created branch ${new_branch} in ${owner}/${repo}`, {
      repo: `${owner}/${repo}`,
      branch: new_branch,
      user_id
    });

    res.status(201).json(createRes.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Failed to create branch', error: error.message, githubResponse: error.response?.data });
  }
};

// Create an issue
export const createIssue = async (req, res) => {
  try {
    const { owner, repo, user_id, title, body, labels } = req.body;
    if (!owner || !repo || !title) {
      return res.status(400).json({ message: 'owner, repo, and title are required' });
    }

    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.post(`https://api.github.com/repos/${owner}/${repo}/issues`,
      { title, body, labels: labels || [] },
      { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'P3L-App' } }
    );

    await logActivity('github', `Created issue: ${title} in ${owner}/${repo}`, {
      repo: `${owner}/${repo}`,
      issue_number: response.data.number,
      url: response.data.html_url,
      user_id
    });

    res.status(201).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Failed to create issue', error: error.message, githubResponse: error.response?.data });
  }
};

// Update an issue (labels/status)
export const updateIssue = async (req, res) => {
  try {
    const { owner, repo, user_id, number, labels, state } = req.body;
    if (!owner || !repo || !number) {
      return res.status(400).json({ message: 'owner, repo, and issue number are required' });
    }

    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const payload = {};
    if (labels) payload.labels = labels;
    if (state) payload.state = state;

    const response = await axios.patch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
      payload,
      { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'P3L-App' } }
    );

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Failed to update issue', error: error.message, githubResponse: error.response?.data });
  }
};

// Get personal GitHub repos for the authenticated user
export const getPersonalGitHubRepos = async (req, res) => {
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
    const response = await axios.get('https://api.github.com/user/repos?type=owner&sort=updated', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch GitHub repos', error: error.message });
  }
};

// Fetch README.md raw content for a repo
export const getRepoReadme = async (req, res) => {
  const { owner, repo, user_id } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ message: 'owner and repo are required' });
  }
  try {
    let githubToken = null;
    if (user_id) {
      const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [user_id]);
      if (rows.length && rows[0].github_token) githubToken = rows[0].github_token;
    }
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github.v3.raw',
      },
      responseType: 'text',
    });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Failed to fetch README', error: error.message, githubResponse: error.response?.data });
  }
};

// Latest workflow run status for a repo (CI badge)
export const getRepoLatestWorkflowRun = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    if (!owner || !repo) return res.status(400).json({ message: 'owner and repo are required' });
    const githubToken = await getGithubTokenForUser(user_id);
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`;
    const response = await axios.get(url, {
      headers: {
        ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
        Accept: 'application/vnd.github+json',
        'User-Agent': 'P3L-App'
      }
    });
    const run = Array.isArray(response.data?.workflow_runs) ? response.data.workflow_runs[0] : null;
    if (!run) return res.json({});
    return res.json({
      id: run.id,
      status: run.status, // queued, in_progress, completed
      conclusion: run.conclusion, // success, failure, neutral, cancelled, etc
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at,
      event: run.event,
      name: run.name
    });
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json({ message: 'Failed to fetch latest workflow run', error: error.message, githubResponse: error.response?.data });
  }
};

// Add a collaborator to a repository
export const addRepoCollaborator = async (req, res) => {
  try {
    const { owner, repo, username, permission, user_id } = req.body;
    if (!owner || !repo || !username) {
      return res.status(400).json({ message: 'owner, repo, and username are required' });
    }

    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) {
      return res.status(403).json({ message: 'GitHub token required. Please link your GitHub account.' });
    }

    // GitHub API: PUT /repos/{owner}/{repo}/collaborators/{username}
    const url = `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`;
    const response = await axios.put(url,
      { permission: permission || 'push' },
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'P3L-App'
        }
      }
    );

    // 201 Created (if dynamic) or 204 No Content (if already collaborator)
    res.json({ success: true, message: `Invitation sent to ${username}`, data: response.data });
  } catch (error) {
    const status = error.response?.status || 500;
    console.error('GitHub Collaborator Error:', error.response?.data || error.message);
    res.status(status).json({
      message: 'Failed to add collaborator',
      error: error.message,
      githubResponse: error.response?.data
    });
  }
};

// Fetch Languages
export const getRepoLanguages = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch languages' });
  }
};

// Fetch Releases
export const getRepoReleases = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch releases' });
  }
};

// Fetch Collaborators
export const getRepoCollaborators = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/collaborators`, {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch collaborators' });
  }
};

// Fetch Workflows
export const getRepoWorkflows = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`, {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App' }
    });
    res.json(response.data.workflows);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch workflows' });
  }
};

// Fetch Workflow Runs
export const getRepoWorkflowRuns = async (req, res) => {
  try {
    const { owner, repo, user_id } = req.query;
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`, {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App' }
    });
    res.json(response.data.workflow_runs);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch workflow runs' });
  }
};

// Fetch Repository Contents (Files/Folders)
export const getRepoContents = async (req, res) => {
  try {
    const { owner, repo, user_id, path = '' } = req.query;
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${githubToken}`, 'User-Agent': 'P3L-App' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch contents' });
  }
};

// Fetch Specific File Content
export const getRepoFileContent = async (req, res) => {
  try {
    const { owner, repo, user_id, path } = req.query;
    const githubToken = await getGithubTokenForUser(user_id);
    if (!githubToken) return res.status(403).json({ message: 'GitHub token required' });

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        'User-Agent': 'P3L-App',
        Accept: 'application/vnd.github.v3.raw'
      }
    });
    res.send(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch file content' });
  }
};

