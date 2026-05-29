const express = require('express');
const {
  registerUser,
  submitTest,
  getResult,
  getMyExams,
  getStudentByRoll,
  getExams,
} = require('../controllers/userController');

const router = express.Router();

router.get('/student/:rollNumber',    getStudentByRoll);
router.get('/exams',                 getExams);
router.post('/register',              registerUser);
router.post('/submit',                submitTest);
router.get('/result/:examId/:rollNumber', getResult);
router.post('/my-exams',              getMyExams);

module.exports = router;
