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
