const express = require('express');
const router = express.Router();
const { getRoomMessages } = require('../controllers/chatController');


router.get('/:roomId', getRoomMessages);

module.exports = router;