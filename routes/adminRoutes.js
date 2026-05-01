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
  getSettings,
  updateSettings,
} = require('../controllers/adminController');

const router = express.Router();

// All routes protected by adminAuth middleware
router.use(adminAuth);

router.get('/leaderboard', getLeaderboard);
router.get('/analytics', getQuestionAnalytics);
router.get('/questions', getAdminQuestions);
router.post('/questions', addQuestion);
router.post('/questions/bulk', bulkAddQuestions);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.delete('/questions', clearAllQuestions);
router.delete('/users', clearAllUsers);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
