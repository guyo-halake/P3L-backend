import { Router } from 'express';
import { createClient, getClients, getClientById, updateClientById } from '../controllers/clientController.js';

const router = Router();

// POST /api/clients - create a new client
router.post('/', createClient);

// GET /api/clients - get all clients
router.get('/', getClients);

// GET /api/clients/:id - get one client
router.get('/:id', getClientById);

// PUT /api/clients/:id - update client
router.put('/:id', updateClientById);

export default router;
