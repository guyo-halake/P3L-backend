import { Router } from 'express';
import { createClient, getClients, getClientById, updateClientById, assignProjectToClient } from '../controllers/clientController.js';

const router = Router();
// BULK DELETE clients
router.post('/bulk-delete', async (req, res) => {
	const { ids } = req.body;
	if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No client ids provided' });
	try {
		const placeholders = ids.map(() => '?').join(',');
		const [result] = await req.app.get('db').execute(`DELETE FROM clients WHERE id IN (${placeholders})`, ids);
		res.json({ success: true, deleted: result.affectedRows });
	} catch (error) {
		res.status(500).json({ message: 'Bulk delete failed', error: error.message });
	}
});

// POST /api/clients - create a new client
router.post('/', createClient);

// GET /api/clients - get all clients
router.get('/', getClients);

// GET /api/clients/:id - get one client
router.get('/:id', getClientById);

// PUT /api/clients/:id - update client
router.put('/:id', updateClientById);

// POST /api/clients/:clientId/assign-project - assign a project to a client
router.post('/:clientId/assign-project', assignProjectToClient);

export default router;
