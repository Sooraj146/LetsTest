const express = require('express');
const { getQuestions, getAnswerKey } = require('../controllers/questionController');

const router = express.Router();

// Both routes require ?examId=xxx query param
router.get('/',           getQuestions);
router.get('/answer-key', getAnswerKey);

module.exports = router;
