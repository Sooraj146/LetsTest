const express = require('express');
const { listExams, getExam } = require('../controllers/examController');

const router = express.Router();

router.get('/',    listExams);
router.get('/:id', getExam);

module.exports = router;
