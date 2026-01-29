// --- GitHub OAuth Setup ---

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || process.env.PROD_REDIRECT_URI || 'http://localhost:5000/api/github/callback';
import axios from 'axios';

// Step 1: Redirect user to GitHub for login

export const githubLogin = (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo,user`;
  res.redirect(githubAuthUrl);
};

// Step 2: GitHub redirects back with code, exchange for access token

export const githubCallback = async (req, res) => {
  const code = req.query.code;
  try {
    // Exchange code for access token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }, {
      headers: { Accept: 'application/json' }
    });
    const accessToken = tokenRes.data.access_token;
    // Fetch GitHub user profile
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    });
    const emailRes = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `token ${accessToken}` }
    });
    const githubUser = userRes.data;
    // Find primary email
    let primaryEmail = githubUser.email;
    if (!primaryEmail && Array.isArray(emailRes.data)) {
      const primaryObj = emailRes.data.find(e => e.primary && e.verified);
      if (primaryObj) primaryEmail = primaryObj.email;
    }
    if (!primaryEmail) throw new Error('No verified email found for GitHub user');
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
    res.redirect(process.env.FRONTEND_REDIRECT_URI || 'http://localhost:8081/github');
  } catch (err) {
    res.status(500).json({ error: 'OAuth failed', details: err.message });
  }
};
// Get all GitHub repos for the authenticated user (owner + member)
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
    // Fetch all repos (owner + member)
    const response = await axios.get('https://api.github.com/user/repos?type=all&sort=updated', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all GitHub repos', error: error.message });
  }
};
import db from '../config/db.js';

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
