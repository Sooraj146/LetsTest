const express = require('express');
const { registerUser, submitTest, getResult, getSettings } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/submit', submitTest);
router.get('/result/:rollNumber', getResult);
router.get('/settings', getSettings);

module.exports = router;
