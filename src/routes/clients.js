import { Router } from 'express';
import { createClient, getClients } from '../controllers/clientController.js';

const router = Router();

// POST /api/clients - create a new client
router.post('/', createClient);

// GET /api/clients - get all clients
router.get('/', getClients);

export default router;
