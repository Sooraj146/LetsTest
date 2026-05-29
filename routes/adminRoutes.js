const express = require('express');
const adminAuth = require('../middleware/adminAuth');
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
  getStudents,
  addStudent,
  deleteStudent,
} = require('../controllers/adminController');
const {
  createExam,
  updateExam,
  deleteExam,
} = require('../controllers/examController');
const {
  login,
  createCollege,
  getColleges,
  createAdminAccount
} = require('../controllers/authController');

const router = express.Router();

// Public admin routes (login)
router.post('/login', login);

router.use(adminAuth);

// ── Management (Main Admin only) ───────────────────────────────────
router.get('/colleges',    getColleges);
router.post('/colleges',   createCollege);
router.get('/accounts',    require('../controllers/authController').getAdminAccounts);
router.post('/accounts',   createAdminAccount);

// ── Student management ─────────────────────────────────────────────
router.get('/students',     getStudents);
router.post('/students',    addStudent);
router.delete('/students/:id', deleteStudent);

// ── Exam management ────────────────────────────────────────────────
router.post('/exams',      createExam);
router.put('/exams/:id',   updateExam);
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
