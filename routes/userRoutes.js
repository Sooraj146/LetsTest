const express = require('express');
const { registerUser, submitTest, getResult } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/submit', submitTest);
router.get('/result/:rollNumber', getResult);

module.exports = router;
