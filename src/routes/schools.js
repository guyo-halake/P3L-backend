import express from 'express';
import {
	getSchools,
	getSchoolById,
	addSchool,
	updateSchool,
	deleteSchool
} from '../controllers/schoolController.js';
import { syncOnlinePlatform } from '../controllers/platformSyncController.js';
import db from '../config/db.js';

const router = express.Router();
router.get('/', getSchools);
router.get('/:id', getSchoolById);
router.post('/', addSchool);
router.put('/:id', updateSchool);
router.delete('/:id', deleteSchool);
router.post('/:id/sync', syncOnlinePlatform);

// Grading system CRUD
router.get('/:id/grading', async (req, res) => {
	try {
		const [rows] = await db.query(
			'SELECT * FROM school_grading_systems WHERE school_id = ? ORDER BY min_score DESC',
			[req.params.id]
		);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: 'Failed to fetch grading system' });
	}
});

router.post('/:id/grading', async (req, res) => {
	try {
		const { grades } = req.body; // array of { grade, min_score, max_score, grade_point, description }
		// Replace all existing grades for this school
		await db.query('DELETE FROM school_grading_systems WHERE school_id = ?', [req.params.id]);
		for (const g of grades) {
			await db.query(
				'INSERT INTO school_grading_systems (school_id, grade, min_score, max_score, grade_point, description) VALUES (?, ?, ?, ?, ?, ?)',
				[req.params.id, g.grade, g.min_score, g.max_score, g.grade_point, g.description]
			);
		}
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: 'Failed to save grading system' });
	}
});

export default router;
