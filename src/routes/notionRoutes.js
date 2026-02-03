import express from 'express';
const router = express.Router();
import * as notionController from '../controllers/notionController.js';

// Save token
router.post('/connect', notionController.saveToken);
router.get('/status', notionController.checkConnection);


// Search/List (Dashboard view)
router.get('/search', notionController.search);

// Specific items
router.get('/database/:id', notionController.getDatabase);
router.get('/page/:id', notionController.getPage);
router.post('/page', notionController.createPage);

router.delete('/blocks/:id', notionController.deleteBlock);
router.patch('/blocks/:id', notionController.updateBlock);
router.post('/blocks/:id/children', notionController.appendBlock);

export default router;
