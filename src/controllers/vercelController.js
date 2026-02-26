import axios from 'axios';

export const getVercelDeployments = async (req, res) => {
    try {
        const token = process.env.VERCEL_TOKEN;
        console.log(`[Vercel] Fetching deployments... Token present: ${!!token}`);
        if (!token) {
            return res.status(500).json({ message: 'VERCEL_TOKEN is missing in backend env' });
        }

        const response = await axios.get('https://api.vercel.com/v6/deployments', {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: {
                limit: 20
            }
        });

        console.log(`[Vercel] Found ${response.data.deployments?.length || 0} deployments`);
        res.json(response.data.deployments);
    } catch (error) {
        console.error(`[Vercel] Error fetching deployments:`, error.response?.data || error.message);
        const status = error.response?.status || 500;
        res.status(status).json({
            message: 'Failed to fetch Vercel deployments',
            error: error.message,
            vercelResponse: error.response?.data
        });
    }
};

export const getVercelProjects = async (req, res) => {
    try {
        const token = process.env.VERCEL_TOKEN;
        if (!token) {
            return res.status(500).json({ message: 'VERCEL_TOKEN is missing in backend env' });
        }

        const response = await axios.get('https://api.vercel.com/v9/projects', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        res.json(response.data.projects);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({ message: 'Failed to fetch Vercel projects', error: error.message });
    }
};
