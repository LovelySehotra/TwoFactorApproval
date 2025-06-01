// routes/approvalRoutes.js
import express from 'express';
import {

  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  handleApprovalAction
} from '../controllers/approvalController.js';
import { createProjectMonthlyTarget } from '../controllers/approvalController.js';

const router = express.Router();

// Create document (project/task)
router.post('/', createProjectMonthlyTarget);

// Get all documents
router.get('/', getAllDocuments);

// Get single document by ID
router.get('/:id', getDocumentById);

// Update document manually
router.put('/:id', updateDocument);

// Delete document
router.delete('/:id', deleteDocument);

// Handle approval flow
router.post('/:id/approval', handleApprovalAction);

export default router;
