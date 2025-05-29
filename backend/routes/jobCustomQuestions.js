import express from 'express';
const router = express.Router({ mergeParams: true }); // mergeParams allows us to get :jobId from parent router if this router is nested
import { checkAuthMiddleware as authMiddleware } from '../middleware/auth.js';
import * as customQuestionsController from '../controllers/jobCustomQuestionsController.js';

// Mounted under /api/jobs/:jobId/questions
// POST /api/jobs/:jobId/questions - Create a new question for a specific job
router.post('/', authMiddleware, customQuestionsController.createQuestion);

// GET /api/jobs/:jobId/questions - Get all questions for a specific job
router.get('/', customQuestionsController.getQuestionsForJob); // No auth needed to view questions publicly with job

// PUT /api/jobs/:jobId/questions/:questionId - Update a specific question for a specific job
// The controller's updateQuestion expects questionId from params, and jobId can be used for additional validation if needed.
// The current ownership check in controller is solely based on questionId -> job_id -> user_id.
router.put('/:questionId', authMiddleware, customQuestionsController.updateQuestion);

// DELETE /api/jobs/:jobId/questions/:questionId - Delete a specific question for a specific job
router.delete('/:questionId', authMiddleware, customQuestionsController.deleteQuestion);

export default router;

