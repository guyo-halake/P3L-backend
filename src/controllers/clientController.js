import db from '../config/db.js';

// Create a new client
export const createClient = async (req, res) => {
  try {
    const { name, initials, project, status, lastMessage, unread, phone } = req.body;
    const [result] = await db.execute(
      `INSERT INTO clients (name, initials, project, status, lastMessage, unread, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, initials, project, status, lastMessage, unread, phone]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error && error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    console.error('Request body:', req.body);
    res.status(500).json({
      message: 'Failed to create client',
      error: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      errno: error.errno,
      requestBody: req.body
    });
  }
};

// Get all clients
export const getClients = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    if (error && error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    res.status(500).json({
      message: 'Failed to fetch clients',
      error: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      errno: error.errno
    });
  }
};
