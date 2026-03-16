import express from 'express';
import { listOrgs, createOrg, listBusinessUnits, createBusinessUnit } from '../controllers/orgsController.js';
const router = express.Router();

// Orgs
router.get('/', listOrgs);
router.post('/', createOrg);

// Business units within an org
router.get('/:orgId/business-units', listBusinessUnits);
router.post('/:orgId/business-units', createBusinessUnit);

export default router;
