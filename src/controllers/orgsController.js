import db from '../config/db.js';
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
