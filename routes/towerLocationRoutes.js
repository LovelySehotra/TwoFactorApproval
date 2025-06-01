import express from 'express';
import {
  createProjectMonthlyTarget,
  updateProjectMonthlyTarget,
  getProjectMonthlyTarget,
  approveProjectMonthlyTarget,
  updateTask,
  approveTask,
} from '../controllers/towerLocationController.js';

const router = express.Router();

// ProjectMonthlyTarget
router.post('/project-monthly-target', createProjectMonthlyTarget);
router.put('/project-monthly-target/:id', updateProjectMonthlyTarget);
router.get('/project-monthly-target/:id', getProjectMonthlyTarget);
router.post('/project-monthly-target/:id/approve', approveProjectMonthlyTarget);

// Task inside ProjectMonthlyTarget
router.put('/task/:taskId', updateTask);
router.post('/task/:taskId/approve', approveTask);

export default router;
