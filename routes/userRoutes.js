const express = require('express');
const {
  login,
  registerUser,
  submitTest,
  getResult,
  getAggregatedAnalysis,
} = require('../controllers/userController');

const router = express.Router();

// Merged endpoints (replaces student lookup + exams + my-exams)
router.post('/login',                login);

// Merged register (returns examDetails + questions in one response)
router.post('/register',             registerUser);

router.post('/submit',               submitTest);
router.get('/result/:examId/:rollNumber', getResult);
router.get('/analysis/:rollNumber',  getAggregatedAnalysis);

module.exports = router;
