// Assign a project to a client
export const assignProjectToClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { projectId } = req.body;
    if (!clientId || !projectId) {
      return res.status(400).json({ message: 'clientId and projectId are required' });
    }

    // Update the project to set its client_id
    const [result] = await db.execute(
      'UPDATE projects SET client_id = ? WHERE id = ?',
      [clientId, projectId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found or already assigned' });
    }

    // Optionally, update the client record to reflect the project (if you want to keep a reference)
    // await db.execute('UPDATE clients SET project = ? WHERE id = ?', [projectId, clientId]);

    res.json({ success: true, clientId, projectId });
  } catch (error) {
    console.error('Error assigning project to client:', error);
    res.status(500).json({ message: 'Failed to assign project to client', error: error.message });
  }
};
import db from '../config/db.js';

// Create a new client
export const createClient = async (req, res) => {
  try {
    const { name, initials, project, status, lastMessage, unread, phone, email } = req.body;
    const [result] = await db.execute(
      `INSERT INTO clients (name, initials, project, status, lastMessage, unread, phone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, initials, project, status, lastMessage, unread, phone, email]
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

// Get a single client by id
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Client id is required' });
    const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Client not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Failed to fetch client', error: error.message });
  }
};

// Update a client
export const updateClientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Client id is required' });
    const { name, initials, project, status, lastMessage, unread, phone, email } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (initials !== undefined) { fields.push('initials = ?'); params.push(initials); }
    if (project !== undefined) { fields.push('project = ?'); params.push(project); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (lastMessage !== undefined) { fields.push('lastMessage = ?'); params.push(lastMessage); }
    if (unread !== undefined) { fields.push('unread = ?'); params.push(unread); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
    params.push(id);
    const [result] = await db.execute(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Client not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Failed to update client', error: error.message });
  }
};
