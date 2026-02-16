import { Router } from 'express';

const router = Router();

// GET /api/attendance - Get all attendance records (demo implementation)
router.get('/', async (req, res) => {
  // TODO: Replace with real DB logic
  res.json([
    {
      id: 1,
      student: 'John Doe',
      date: '2026-02-16',
      status: 'Present',
      unit: 'Mathematics',
      time: '08:00',
    },
    {
      id: 2,
      student: 'Jane Smith',
      date: '2026-02-16',
      status: 'Absent',
      unit: 'Physics',
      time: '10:00',
    },
  ]);
});

export default router;
