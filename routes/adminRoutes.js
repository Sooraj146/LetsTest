const express    = require('express');
const adminAuth  = require('../middleware/adminAuth');
const {
  getLeaderboard,
  getQuestionAnalytics,
  getAdminQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  clearAllUsers,
  clearAllQuestions,
  bulkAddQuestions,
} = require('../controllers/adminController');
const {
  createExam,
  updateExam,
  deleteExam,
} = require('../controllers/examController');

const router = express.Router();

// All admin routes require password header (handled by adminAuth middleware)
router.use(adminAuth);

// ── Exam management ────────────────────────────────────────────────
router.post('/exams',       createExam);
router.put('/exams/:id',    updateExam);
router.delete('/exams/:id', deleteExam);

// ── Leaderboard + analytics (require ?examId=xxx) ──────────────────
router.get('/leaderboard', getLeaderboard);
router.get('/analytics',   getQuestionAnalytics);

// ── Questions (require ?examId=xxx or examId in body) ──────────────
router.get('/questions',        getAdminQuestions);
router.post('/questions',       addQuestion);
router.post('/questions/bulk',  bulkAddQuestions);
router.put('/questions/:id',    updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.delete('/questions',     clearAllQuestions);

// ── Users ──────────────────────────────────────────────────────────
router.delete('/users', clearAllUsers);

module.exports = router;
