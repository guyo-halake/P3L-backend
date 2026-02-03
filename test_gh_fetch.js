import db from './src/config/db.js';
import axios from 'axios';

async function testFetch() {
    const userId = 11; // Hardcoded for 'guyo-halake'
    console.log(`Testing GitHub fetch for User ID: ${userId}`);

    try {
        // 1. Get Token
        const [rows] = await db.execute('SELECT github_token FROM users WHERE id = ?', [userId]);
        if (!rows.length || !rows[0].github_token) {
            console.error('FATAL: No token found for user!');
            process.exit(1);
        }
        const token = rows[0].github_token;
        console.log(`Token found: ${token.substring(0, 10)}...`);

        // 2. Call GitHub API (exact same call as controller)
        console.log('Sending request to https://api.github.com/user/repos?type=all&sort=updated...');
        const res = await axios.get('https://api.github.com/user/repos?type=all&sort=updated', {
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'node-test-script'
            }
        });

        // 3. Report Results
        const repos = res.data;
        console.log(`SUCCESS: Fetched ${repos.length} repositories.`);

        if (repos.length > 0) {
            console.log('First 5 repos:');
            repos.slice(0, 5).forEach(r => console.log(`- ${r.full_name} (${r.private ? 'Private' : 'Public'})`));
        } else {
            console.log("WARNING: API returned 0 repositories. Check user permissions or visibility.");
        }

        process.exit(0);

    } catch (err) {
        console.error('API ERROR:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
        process.exit(1);
    }
}

testFetch();
