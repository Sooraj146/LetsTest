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
  bulkAddStudents,
  updateStudent,
  deleteAllStudents,
  getStudentAnalysis,
  getLogs,
  toggleStudentBan,
  deleteLog,
  clearLogs,
} = require('../controllers/adminController');
const {
  createExam,
  updateExam,
  deleteExam,
  getExams,
} = require('../controllers/examController');
const {
  login,
  createCollege,
  updateCollege,
  deleteCollege,
  getColleges,
  createAdminAccount,
  getAdminAccounts,
  updateAdminAccount,
  deleteAdminAccount
} = require('../controllers/authController');

const router = express.Router();

// Public admin routes (login)
router.post('/login', login);

router.use(adminAuth);

// ── Management (Main Admin only) ───────────────────────────────────
router.get('/colleges',      getColleges);
router.post('/colleges',     createCollege);
router.put('/colleges/:id',    updateCollege);
router.delete('/colleges/:id', deleteCollege);
router.get('/accounts',      getAdminAccounts);
router.post('/accounts',     createAdminAccount);
router.put('/accounts/:id',    updateAdminAccount);
router.delete('/accounts/:id', deleteAdminAccount);
router.get('/logs',           getLogs);
router.delete('/logs/:id',    deleteLog);
router.delete('/logs',        clearLogs);

// ── Student management ─────────────────────────────────────────────
router.get('/students',      getStudents);
router.post('/students',     addStudent);
router.put('/students/:id',    updateStudent);
router.post('/students/bulk', bulkAddStudents);
router.delete('/students/:id', deleteStudent);
router.delete('/students',     deleteAllStudents);
router.get('/students/:id/analysis', getStudentAnalysis);
router.post('/students/:id/ban',      toggleStudentBan);

// ── Exam management ────────────────────────────────────────────────
router.get('/exams',       getExams);
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
