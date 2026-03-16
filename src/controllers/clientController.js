import db from '../config/db.js';
import { sendOnboardingEmail } from '../services/emailService.js';
import { sendSMSInternal } from '../services/smsService.js';
import { logActivity } from '../utils/activityLogger.js';

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
    const assigner = req.user ? req.user.username : 'System';
    logActivity('client', `Project #${projectId} assigned to Client #${clientId} by ${assigner}`, { clientId, projectId, assigner });
  } catch (error) {
    console.error('Error assigning project to client:', error);
    res.status(500).json({ message: 'Failed to assign project to client', error: error.message });
  }
};

// Create a new client
export const createClient = async (req, res) => {
  try {
    const { name, initials, project, status, lastMessage, unread, phone, email, type, sendOnboarding } = req.body;
    // Derive initials if not provided (though frontend usually does)
    // We expect 'type' to be passed from frontend
    const [result] = await db.execute(
      `INSERT INTO clients (name, initials, project, status, lastMessage, unread, phone, email, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        initials || null,
        project || null,
        status || 'Onboarded',
        lastMessage || '',
        unread || 0,
        phone || null,
        email || null,
        type || 'p3l'
      ]
    );

    // Send Onboarding Email if requested
    if (sendOnboarding && email) {
      // Run asynchronously, don't block response
      sendOnboardingEmail(name, email).catch(err => console.error("Async email error:", err));
    }

    const creator = req.user ? req.user.username : 'Admin';
    logActivity('client', `New client "${name}" added by ${creator}`, { clientId: result.insertId, email, creator });

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
    if (req.body.type !== undefined) { fields.push('type = ?'); params.push(req.body.type); }
    if (req.body.is_pinned !== undefined) { fields.push('is_pinned = ?'); params.push(req.body.is_pinned); }
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

/**
 * Onboard a client: Sends official welcome via Email and SMS (WhatsApp fallback)
 */
export const onboardClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_name } = req.body;

    const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Client not found' });
    const client = rows[0];

    const projectDisplay = project_name ? `project "${project_name}"` : 'your project';
    const message = `Welcome To P3L Developers\n\nHey ${client.name}, Welcome to P3L. Your account has been created and ${projectDisplay} will be under development shortly. We're excited to have you on board.\n\nAdmin\nP3L Developers, Matta Tech.\nNairobi, Kenya.`;

    // 1. Send Email
    let emailStatus = { attempted: false, success: false, reason: 'Email missing on client profile' };
    if (client.email) {
      emailStatus.attempted = true;
      const emailResult = await sendOnboardingEmail(client.name, client.email, project_name);
      emailStatus = {
        attempted: true,
        success: !!emailResult?.success,
        reason: emailResult?.success ? 'Email sent' : (emailResult?.error || 'Email provider rejected message')
      };
    }

    // 2. Send SMS/WhatsApp — prefer explicit whatsapp_number if provided
    let smsStatus = { attempted: false, success: false, reason: 'Phone missing on client profile' };
    const smsTarget = req.body.whatsapp_number || client.phone;
    if (smsTarget) {
      smsStatus.attempted = true;
      try {
        await sendSMSInternal(smsTarget, message);
        smsStatus = { attempted: true, success: true, reason: 'SMS/WhatsApp sent' };
      } catch (smsError) {
        smsStatus = { attempted: true, success: false, reason: smsError?.message || 'SMS provider error' };
      }
    }

    if (!emailStatus.success && !smsStatus.success) {
      return res.status(502).json({
        success: false,
        message: 'Onboarding delivery failed on all channels',
        channels: { email: emailStatus, sms: smsStatus }
      });
    }

    const trigger = req.user ? req.user.username : 'Admin';
    logActivity('client', `Onboarding sent to ${client.name} for project "${project_name || 'N/A'}"`, { clientId: id, trigger });

    res.json({
      success: true,
      message: 'Onboarding processed',
      channels: { email: emailStatus, sms: smsStatus }
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ message: 'Failed to onboard client', error: error.message });
  }
};
