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
export const createVercelDeployment = async (req, res) => {
    try {
        const { projectId, name } = req.body;
        const token = process.env.VERCEL_TOKEN;
        if (!token) {
            return res.status(500).json({ message: 'VERCEL_TOKEN is missing in backend env' });
        }

        const response = await axios.post('https://api.vercel.com/v13/deployments', {
            name: name || 'p3l-manual-deploy',
            project: projectId,
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json(response.data);
    } catch (error) {
        console.error(`[Vercel] Error creating deployment:`, error.response?.data || error.message);
        const status = error.response?.status || 500;
        res.status(status).json({
            message: 'Failed to trigger Vercel deployment',
            error: error.message,
            vercelResponse: error.response?.data
        });
    }
};

export const getVercelEnvVars = async (req, res) => {
    try {
        const { projectId } = req.params;
        const token = process.env.VERCEL_TOKEN;
        if (!token) return res.status(500).json({ message: 'VERCEL_TOKEN missing' });

        const response = await axios.get(`https://api.vercel.com/v9/projects/${projectId}/env`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.json(response.data.envs || []);
    } catch (error) {
        res.status(error.response?.status || 500).json({ message: 'Failed to fetch env vars', error: error.message });
    }
};

export const createVercelEnvVar = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { key, value, target, type } = req.body; // target is array like ['production', 'preview', 'development']
        const token = process.env.VERCEL_TOKEN;
        if (!token) return res.status(500).json({ message: 'VERCEL_TOKEN missing' });

        const response = await axios.post(`https://api.vercel.com/v10/projects/${projectId}/env`, {
            key, value, target: target || ['production', 'preview', 'development'], type: type || 'encrypted'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ message: 'Failed to create env var', error: error.message, vercelResponse: error.response?.data });
    }
};

export const deleteVercelEnvVar = async (req, res) => {
    try {
        const { projectId, envId } = req.params;
        const token = process.env.VERCEL_TOKEN;
        if (!token) return res.status(500).json({ message: 'VERCEL_TOKEN missing' });

        const response = await axios.delete(`https://api.vercel.com/v9/projects/${projectId}/env/${envId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ message: 'Failed to delete env var', error: error.message });
    }
};
