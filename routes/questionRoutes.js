const express = require('express');
const { getAnswerKey } = require('../controllers/questionController');

const router = express.Router();

// Answer key download — requires ?examId=xxx
router.get('/answer-key', getAnswerKey);

module.exports = router;
