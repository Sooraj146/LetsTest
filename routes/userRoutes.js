const express = require('express');
const {
  registerUser,
  submitTest,
  getResult,
  getMyExams,
} = require('../controllers/userController');

const router = express.Router();

router.post('/register',              registerUser);
router.post('/submit',                submitTest);
router.get('/result/:examId/:rollNumber', getResult);
router.post('/my-exams',              getMyExams);

module.exports = router;
